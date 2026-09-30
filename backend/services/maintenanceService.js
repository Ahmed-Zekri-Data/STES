const crypto = require('crypto');
const Product = require('../models/Product');
const MaintenanceSubscriber = require('../models/MaintenanceSubscriber');
const { getSettings } = require('./settingsService');
const emailNotificationService = require('./emailNotificationService');
const { OFFER_FIELDS, offerFor, parseProductRef, productIdsOf } = require('../utils/productOffer');

// Pool care reminders: who gets which reminder and when. A reminder is due
// from its date for WINDOW_DAYS days, so people who sign up just after it,
// or a server that was down that morning, still get it; each person gets it
// once a year per channel.

const WINDOW_DAYS = 30;
const TIME_ZONE = 'Africa/Tunis';
const DAY = 24 * 60 * 60 * 1000;

const siteUrl = () => String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

// Today's date in Tunisia
const tunisToday = (now = new Date()) => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number);
  return { year, month, day };
};

// The active reminders due today, each with the year it counts for
const dueReminders = (calendar, now = new Date()) => {
  const { year, month, day } = tunisToday(now);
  const today = Date.UTC(year, month - 1, day);
  return calendar.filter(r => r.active !== false).flatMap(reminder => {
    // This year's date, or last year's for one late in December
    const occurrence = [year, year - 1].find(y => {
      const since = (today - Date.UTC(y, reminder.month - 1, reminder.day)) / DAY;
      return since >= 0 && since < WINDOW_DAYS;
    });
    return occurrence ? [{ ...reminder, year: occurrence }] : [];
  });
};

// The next reminder to come after today, with its date
const nextReminder = (calendar, now = new Date()) => {
  const { year, month, day } = tunisToday(now);
  const today = Date.UTC(year, month - 1, day);
  const upcoming = calendar.filter(r => r.active !== false)
    .map(r => {
      const thisYear = Date.UTC(year, r.month - 1, r.day);
      return { reminder: r, date: new Date(thisYear > today ? thisYear : Date.UTC(year + 1, r.month - 1, r.day)) };
    })
    .sort((a, b) => a.date - b.date);
  return upcoming[0] || null;
};

// The link in every reminder to change or stop them. Signed, so nothing
// needs storing: the subscriber id and an HMAC of it.
const signature = (id) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'stes')
  .update(`maintenance:${id}`).digest('hex').slice(0, 32);
const manageToken = (id) => `${id}.${signature(String(id))}`;
const manageUrl = (subscriber) => `${siteUrl()}/entretien/mes-rappels?token=${manageToken(subscriber._id)}`;

const findByToken = async (token) => {
  const [id, sig] = String(token || '').split('.');
  if (!/^[a-f\d]{24}$/i.test(id || '') || !/^[a-f\d]{32}$/.test(sig || '')) return null;
  const expected = Buffer.from(signature(id));
  if (!crypto.timingSafeEqual(expected, Buffer.from(sig))) return null;
  return MaintenanceSubscriber.findById(id);
};

// A WhatsApp number in international form: 8 Tunisian digits get +216
const whatsappNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length === 8) return `+216${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
};

// The products of each reminder, with their current price; deleted ones are left out
const productCards = async (calendar) => {
  const ids = productIdsOf(calendar.flatMap(r => (r.products || []).map(String)));
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } }).select(`name price image inStock stockQuantity ${OFFER_FIELDS}`).lean()
    : [];
  const byId = new Map(products.map(p => [String(p._id), p]));
  // A product, or the version chosen
  const cardOf = (value) => {
    const ref = parseProductRef(value);
    const p = ref && byId.get(ref.id);
    if (!p) return null;
    return { _id: String(p._id), name: p.name, price: p.price, image: p.image, ...offerFor(p, ref.sku), ref: String(value) };
  };
  return (reminder) => (reminder.products || []).map(cardOf).filter(Boolean);
};

// The year's reminders shown on /entretien
const publicCalendar = async () => {
  const { reminders } = await getSettings();
  const active = reminders.calendar.filter(r => r.active !== false);
  const cards = await productCards(active);
  return active.map(({ key, month, day, title, message, ...reminder }) => ({ key, month, day, title, message, products: cards(reminder) }));
};

// A new subscriber gets a welcome email with their link. Someone already
// signed up is told again by email, and nothing is changed: only the link
// in their emails can change their reminders.
const subscribe = async ({ firstName, email, phone, whatsapp, volume, source, ipAddress }) => {
  const existing = await MaintenanceSubscriber.findOne({ email: String(email).toLowerCase() });
  const subscriber = existing || await MaintenanceSubscriber.create({
    firstName,
    email,
    phone: whatsapp ? whatsappNumber(phone) : undefined,
    channels: { email: true, whatsapp: Boolean(whatsapp) },
    volume,
    source,
    ipAddress
  });
  getSettings()
    .then(({ reminders }) => emailNotificationService.sendMaintenanceWelcome(subscriber, {
      next: nextReminder(reminders.calendar),
      manageUrl: manageUrl(subscriber),
      already: Boolean(existing)
    }))
    .catch(error => console.error('Could not send the reminders welcome email:', error.message));
  return { subscriber, created: !existing };
};

// Emails the reminders due today to everyone who hasn't had them. Each
// subscriber is marked first, so two runs can't send twice; a failed email
// is unmarked to be tried again next time.
const sendDueEmails = async (now = new Date()) => {
  if (!emailNotificationService.isConfigured()) return { sent: 0, failed: 0, reason: 'email_not_configured' };
  const { reminders } = await getSettings();
  const due = dueReminders(reminders.calendar, now);
  const cards = await productCards(due);
  let sent = 0;
  let failed = 0;
  for (const reminder of due) {
    const mark = { key: reminder.key, year: reminder.year, channel: 'email' };
    const pending = MaintenanceSubscriber.find({ 'channels.email': true, sent: { $not: { $elemMatch: mark } } }).cursor();
    for await (const subscriber of pending) {
      const claimed = await MaintenanceSubscriber.updateOne(
        { _id: subscriber._id, sent: { $not: { $elemMatch: mark } } },
        { $push: { sent: { ...mark, at: new Date() } } }
      );
      if (!claimed.modifiedCount) continue;
      const result = await emailNotificationService.sendMaintenanceReminder(subscriber, reminder, {
        products: cards(reminder),
        manageUrl: manageUrl(subscriber)
      });
      if (result.success) {
        sent++;
      } else {
        failed++;
        await MaintenanceSubscriber.updateOne({ _id: subscriber._id }, { $pull: { sent: mark } });
      }
    }
  }
  if (sent || failed) console.log(`🏊 Pool care reminders: ${sent} emailed, ${failed} failed`);
  return { sent, failed };
};

const tnd = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;

// The WhatsApp message for a reminder, ready for an admin to send
const whatsappText = (subscriber, reminder, products) => [
  `Bonjour ${subscriber.firstName}, ici STES Piscines.`,
  '',
  `*${reminder.title}*`,
  reminder.message,
  ...(products.length ? ['', 'Nos conseils :', ...products.map(p => `• ${p.name} (${tnd(p.price)}) : ${siteUrl()}/product/${p._id}`)] : []),
  '',
  `Gérer ou arrêter vos rappels : ${manageUrl(subscriber)}`
].join('\n');

// For Admin → Reminders: the WhatsApp reminders due today that no admin has
// sent yet, with a link that opens WhatsApp on the message
const whatsappQueue = async (now = new Date()) => {
  const { reminders } = await getSettings();
  const due = dueReminders(reminders.calendar, now);
  const cards = await productCards(due);
  const queue = [];
  for (const reminder of due) {
    const mark = { key: reminder.key, year: reminder.year, channel: 'whatsapp' };
    const subscribers = await MaintenanceSubscriber.find({
      'channels.whatsapp': true,
      phone: { $nin: [null, ''] },
      sent: { $not: { $elemMatch: mark } }
    }).sort({ createdAt: 1 }).limit(500).lean();
    const people = subscribers.map(subscriber => {
      const text = whatsappText(subscriber, reminder, cards(reminder));
      return {
        _id: String(subscriber._id),
        firstName: subscriber.firstName,
        phone: subscriber.phone,
        volume: subscriber.volume,
        link: `https://wa.me/${subscriber.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      };
    });
    if (people.length) queue.push({ key: reminder.key, year: reminder.year, title: reminder.title, people });
  }
  return queue;
};

// Records that an admin sent a WhatsApp reminder
const markWhatsappSent = async (id, { key, year }) => {
  const mark = { key, year, channel: 'whatsapp' };
  const result = await MaintenanceSubscriber.updateOne(
    { _id: id, sent: { $not: { $elemMatch: mark } } },
    { $push: { sent: { ...mark, at: new Date() } } }
  );
  return result.matchedCount > 0 || Boolean(await MaintenanceSubscriber.exists({ _id: id }));
};

// Every morning at 9:00, Tunis time
const startReminderSchedule = () => {
  const cron = require('node-cron');
  return cron.schedule('0 9 * * *', () => {
    sendDueEmails().catch(error => console.error('Pool care reminders failed:', error.message));
  }, { timezone: TIME_ZONE });
};

module.exports = {
  WINDOW_DAYS,
  tunisToday,
  dueReminders,
  nextReminder,
  manageToken,
  manageUrl,
  findByToken,
  whatsappNumber,
  publicCalendar,
  subscribe,
  sendDueEmails,
  whatsappText,
  whatsappQueue,
  markWhatsappSent,
  startReminderSchedule
};
