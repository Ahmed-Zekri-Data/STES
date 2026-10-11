const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const FormSubmission = require('../models/FormSubmission');
const CheckoutDraft = require('../models/CheckoutDraft');
const EmailOptOut = require('../models/EmailOptOut');
const AutomationLog = require('../models/AutomationLog');
const emailService = require('./emailNotificationService');
const emails = require('./automationEmails');
const { getSettings } = require('./settingsService');
const { adminSecret } = require('../config/jwt');
const { exactly } = require('../utils/text');

// The shop's automatic emails, set in Admin → Settings → Marketing:
// - abandoned cart: one reminder after a checkout left before the end;
// - unanswered requests: the admins are told;
// - quote follow-up: the customer is asked if they have questions;
// - review request: some days after delivery;
// - replenishment: consumables, after the days set on each product.
// Each is sent once (marked before sending, unmarked if sending fails),
// never at night, and never to an address that asked to stop them.

const TIME_ZONE = 'Africa/Tunis';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const siteUrl = () => String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

// A link in an automatic email, tagged so the shop's audience measurement
// knows the visit came from it; the #anchor stays last
const tracked = (path, campaign) => {
  const [route, anchor] = path.split('#');
  const tags = `utm_source=email&utm_medium=automation&utm_campaign=${campaign}`;
  return `${siteUrl()}${route}${route.includes('?') ? '&' : '?'}${tags}${anchor ? `#${anchor}` : ''}`;
};

// "Stop these emails": a signed link, so nothing needs storing
const sign = (email) => crypto.createHmac('sha256', adminSecret()).update(`optout:${email}`).digest('hex').slice(0, 32);
const unsubscribeToken = (email) => {
  const address = String(email).toLowerCase();
  return `${Buffer.from(address).toString('base64url')}.${sign(address)}`;
};
const emailFromToken = (token) => {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !/^[a-f\d]{32}$/.test(signature || '')) return null;
  const email = Buffer.from(encoded, 'base64url').toString('utf8');
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) return null;
  return crypto.timingSafeEqual(Buffer.from(sign(email)), Buffer.from(signature)) ? email : null;
};
const unsubscribeUrl = (email) => `${siteUrl()}/emails/desinscription?token=${unsubscribeToken(email)}`;
const optedOut = async (email) => Boolean(await EmailOptOut.exists({ email: String(email).toLowerCase() }));

const tunisHour = (now) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now));
const tunisDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: TIME_ZONE });
const whatsappLink = (number) => {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
};

const logSent = (automation, email) => AutomationLog.create({ automation, email }).catch(error => console.error('Could not log an automatic email:', error.message));

// Cart lines as the emails show them, with today's names and prices;
// products deleted since are left out
const cartLines = async (items) => {
  const products = await Product.find({ _id: { $in: items.map(item => item.product) } }).select('name price priceOnRequest variants').lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  return items.flatMap(item => {
    const product = byId.get(String(item.product));
    if (!product) return [];
    const version = item.variant && (product.variants || []).find(v => v.sku === item.variant);
    if (version) return [{ name: `${product.name} – ${version.label}`, price: version.price ?? null, quantity: item.quantity }];
    return [{ name: product.name, price: product.priceOnRequest ? null : product.price, quantity: item.quantity }];
  });
};

// Orders are matched on the customer's address whatever its case
const sameEmail = (email) => exactly(email);

// An order placed with this address since then
const orderedSince = (email, since) => Order.exists({ 'customer.email': sameEmail(email), createdAt: { $gt: since } });

// 1. A checkout left before the end: one reminder, with a link that fills
// the cart again
const abandonedCarts = async (now, settings) => {
  if (!settings.abandonedCartEnabled) return 0;
  const drafts = await CheckoutDraft.find({
    kind: 'checkout',
    reminders: true,
    remindedAt: null,
    convertedAt: null,
    // Old enough, but not so old the reminder would surprise
    updatedAt: { $lte: new Date(now - settings.abandonedCartHours * HOUR), $gte: new Date(now - 7 * DAY) }
  }).limit(200).lean();
  let sent = 0;
  for (const draft of drafts) {
    if (await orderedSince(draft.email, draft.createdAt)) {
      await CheckoutDraft.updateOne({ _id: draft._id }, { convertedAt: now });
      continue;
    }
    const claimed = await CheckoutDraft.updateOne({ _id: draft._id, remindedAt: null }, { remindedAt: now });
    if (!claimed.modifiedCount || await optedOut(draft.email)) continue;
    const items = await cartLines(draft.items);
    if (!items.length) continue;
    const content = emails.abandonedCart({
      firstName: draft.firstName,
      items,
      restoreUrl: tracked(`/cart?reprendre=${draft.token}`, 'abandoned_cart'),
      unsubscribeUrl: unsubscribeUrl(draft.email)
    });
    const result = await emailService.sendAutomatedEmail(draft.email, content, { unsubscribeUrl: unsubscribeUrl(draft.email) });
    if (result.success) {
      sent++;
      logSent('abandoned_cart', draft.email);
    } else {
      await CheckoutDraft.updateOne({ _id: draft._id }, { $unset: { remindedAt: 1 } });
    }
  }
  return sent;
};

const requestKind = (submission) => {
  if (submission.type === 'contact') return 'message';
  if (submission.plan?.shape) return 'devis du configurateur';
  return /^Demande de prix/.test(submission.message || '') ? 'demande de prix' : 'demande de devis';
};

// 2. Requests nobody answered: one email to the admins listing them
const quoteAlerts = async (now, settings) => {
  if (!settings.quoteAlertEnabled) return 0;
  const waiting = await FormSubmission.find({
    type: { $in: ['quote', 'contact'] },
    status: { $in: ['new', 'read'] },
    'followUp.adminAlertAt': null,
    createdAt: { $lte: new Date(now - settings.quoteAlertHours * HOUR), $gte: new Date(now - 30 * DAY) }
  }).sort({ createdAt: 1 }).limit(50).lean();
  if (!waiting.length) return 0;
  const to = await emailService.adminRecipients();
  if (!to.length) return 0;
  const content = emails.quoteAlert({
    requests: waiting.map(r => ({ name: r.name, city: r.city, phone: r.phone, kind: requestKind(r), receivedAt: tunisDate(r.createdAt) })),
    adminUrl: `${siteUrl()}/admin/forms`
  });
  const result = await emailService.sendAutomatedEmail(to.join(', '), content);
  if (!result.success) return 0;
  await FormSubmission.updateMany({ _id: { $in: waiting.map(r => r._id) } }, { 'followUp.adminAlertAt': now });
  logSent('quote_alert', null);
  return 1;
};

// 3. Some days after the shop answered a quote, without an order since
const quoteFollowUps = async (now, settings, contact) => {
  if (!settings.quoteFollowUpEnabled) return 0;
  const answered = await FormSubmission.find({
    type: 'quote',
    status: 'replied',
    'followUp.customerAt': null,
    repliedAt: { $lte: new Date(now - settings.quoteFollowUpDays * DAY), $gte: new Date(now - 30 * DAY) }
  }).limit(200).lean();
  let sent = 0;
  for (const submission of answered) {
    const claimed = await FormSubmission.updateOne({ _id: submission._id, 'followUp.customerAt': null }, { 'followUp.customerAt': now });
    if (!claimed.modifiedCount) continue;
    if (await optedOut(submission.email) || await orderedSince(submission.email, submission.createdAt)) continue;
    const content = emails.quoteFollowUp({
      name: submission.name,
      whatsappUrl: whatsappLink(contact.whatsapp),
      siteUrl: tracked('/shop', 'quote_follow_up'),
      unsubscribeUrl: unsubscribeUrl(submission.email)
    });
    const result = await emailService.sendAutomatedEmail(submission.email, content, { unsubscribeUrl: unsubscribeUrl(submission.email) });
    if (result.success) {
      sent++;
      logSent('quote_follow_up', submission.email);
    } else {
      await FormSubmission.updateOne({ _id: submission._id }, { $unset: { 'followUp.customerAt': 1 } });
    }
  }
  return sent;
};

// Orders whose customer wants emails
const WANTS_EMAILS = { 'emailNotifications.enabled': { $ne: false } };

// 4. Some days after delivery: a review on the site and on Google
const reviewRequests = async (now, settings, marketing) => {
  if (!settings.reviewRequestEnabled) return 0;
  const delivered = await Order.find({
    ...WANTS_EMAILS,
    status: 'delivered',
    'automation.reviewRequestAt': null,
    actualDelivery: { $lte: new Date(now - settings.reviewRequestDays * DAY), $gte: new Date(now - 60 * DAY) }
  }).limit(200).lean();
  let sent = 0;
  for (const order of delivered) {
    const claimed = await Order.updateOne({ _id: order._id, 'automation.reviewRequestAt': null }, { 'automation.reviewRequestAt': now });
    if (!claimed.modifiedCount || await optedOut(order.customer.email)) continue;
    const seen = new Set();
    const items = order.items.filter(item => item.product && !seen.has(String(item.product)) && seen.add(String(item.product)))
      .map(item => ({ name: item.name, reviewUrl: tracked(`/product/${item.product}#avis`, 'review_request') }));
    const content = emails.reviewRequest({
      name: order.customer.firstName || order.customer.name,
      orderNumber: order.orderNumber,
      items,
      googleReviewUrl: marketing.googleReviewUrl,
      unsubscribeUrl: unsubscribeUrl(order.customer.email)
    });
    const result = await emailService.sendAutomatedEmail(order.customer.email, content, { unsubscribeUrl: unsubscribeUrl(order.customer.email) });
    if (result.success) {
      sent++;
      logSent('review_request', order.customer.email);
    } else {
      await Order.updateOne({ _id: order._id }, { $unset: { 'automation.reviewRequestAt': 1 } });
    }
  }
  return sent;
};

// 5. Consumables bought a while ago: "order again", with a link that puts
// the same products in the cart. Late by more than 30 days: not sent.
const replenishments = async (now, settings) => {
  if (!settings.replenishmentEnabled) return 0;
  const consumables = await Product.find({ replenishAfterDays: { $gte: 7 } }).select('replenishAfterDays').lean();
  if (!consumables.length) return 0;
  const daysOf = new Map(consumables.map(p => [String(p._id), p.replenishAfterDays]));
  const longest = Math.max(...daysOf.values());
  const orders = await Order.find({
    ...WANTS_EMAILS,
    status: 'delivered',
    'items.product': { $in: consumables.map(p => p._id) },
    actualDelivery: { $lte: new Date(now - 7 * DAY), $gte: new Date(now - (longest + 30) * DAY) }
  }).limit(500).lean();
  let sent = 0;
  for (const order of orders) {
    const done = new Set((order.automation?.replenished || []).map(String));
    const delivered = new Date(order.actualDelivery).getTime();
    let due = order.items.filter(item => {
      const days = daysOf.get(String(item.product));
      if (!days || done.has(String(item.product))) return false;
      const dueAt = delivered + days * DAY;
      return dueAt <= now && now - dueAt <= 30 * DAY;
    });
    if (!due.length) continue;
    const ids = [...new Set(due.map(item => String(item.product)))];
    const claimed = await Order.updateOne(
      { _id: order._id, 'automation.replenished': { $nin: ids } },
      { $addToSet: { 'automation.replenished': { $each: ids } } }
    );
    if (!claimed.modifiedCount || await optedOut(order.customer.email)) continue;
    // Products ordered again since are not reminded
    const again = await Order.find({ _id: { $ne: order._id }, 'customer.email': sameEmail(order.customer.email), createdAt: { $gt: order.actualDelivery }, 'items.product': { $in: ids } }).select('items.product').lean();
    const reordered = new Set(again.flatMap(o => o.items.map(item => String(item.product))));
    due = due.filter(item => !reordered.has(String(item.product)));
    if (!due.length) continue;

    const draftItems = due.map(item => ({ product: item.product, ...(item.variant?.sku && { variant: item.variant.sku }), quantity: item.quantity }));
    const draft = await CheckoutDraft.create({
      draftId: `reorder-${order._id}-${now.getTime()}`,
      token: crypto.randomBytes(24).toString('hex'),
      kind: 'reorder',
      email: order.customer.email,
      firstName: order.customer.firstName,
      items: draftItems,
      reminders: false
    });
    const items = await cartLines(draftItems);
    const content = emails.replenishment({
      name: order.customer.firstName || order.customer.name,
      items,
      reorderUrl: tracked(`/cart?reprendre=${draft.token}`, 'replenishment'),
      unsubscribeUrl: unsubscribeUrl(order.customer.email)
    });
    const result = await emailService.sendAutomatedEmail(order.customer.email, content, { unsubscribeUrl: unsubscribeUrl(order.customer.email) });
    if (result.success) {
      sent++;
      logSent('replenishment', order.customer.email);
    } else {
      await Order.updateOne({ _id: order._id }, { $pull: { 'automation.replenished': { $in: ids } } });
      await CheckoutDraft.deleteOne({ _id: draft._id });
    }
  }
  return sent;
};

// One automation failing does not stop the others
const safely = async (name, run) => {
  try {
    return await run();
  } catch (error) {
    console.error(`Automatic emails (${name}) failed:`, error.message);
    return 0;
  }
};

// Every 15 minutes: abandoned carts and unanswered requests, by day only
const runFrequent = async (now = new Date()) => {
  if (!emailService.isConfigured()) return { skipped: 'email_not_configured' };
  const hour = tunisHour(now);
  if (hour < 8 || hour >= 21) return { skipped: 'night' };
  const { automations } = await getSettings();
  return {
    abandonedCarts: await safely('abandoned carts', () => abandonedCarts(now, automations)),
    quoteAlerts: await safely('unanswered requests', () => quoteAlerts(now, automations))
  };
};

// Every morning at 10:00: quote follow-ups, review requests, replenishment,
// and forgetting old checkouts
const runDaily = async (now = new Date()) => {
  const { deletedCount } = await CheckoutDraft.deleteMany({ updatedAt: { $lt: new Date(now - 30 * DAY) } });
  if (!emailService.isConfigured()) return { skipped: 'email_not_configured', forgotten: deletedCount };
  const { automations, contact, marketing } = await getSettings();
  return {
    forgotten: deletedCount,
    quoteFollowUps: await safely('quote follow-ups', () => quoteFollowUps(now, automations, contact)),
    reviewRequests: await safely('review requests', () => reviewRequests(now, automations, marketing)),
    replenishments: await safely('replenishment', () => replenishments(now, automations))
  };
};

const startAutomationSchedule = () => {
  const cron = require('node-cron');
  const report = (result) => {
    const sent = Object.entries(result).filter(([key, count]) => key !== 'forgotten' && Number(count) > 0);
    if (sent.length) console.log(`📬 Automatic emails: ${sent.map(([key, count]) => `${key} ${count}`).join(', ')}`);
  };
  return [
    cron.schedule('*/15 * * * *', () => { runFrequent().then(report).catch(error => console.error('Automatic emails failed:', error.message)); }, { timezone: TIME_ZONE }),
    cron.schedule('0 10 * * *', () => { runDaily().then(report).catch(error => console.error('Automatic emails failed:', error.message)); }, { timezone: TIME_ZONE })
  ];
};

// For Admin → Settings → Marketing: emails sent these 30 days, by automation
const automationStats = async (now = new Date()) => {
  const counts = await AutomationLog.aggregate([
    { $match: { at: { $gte: new Date(now - 30 * DAY) } } },
    { $group: { _id: '$automation', count: { $sum: 1 } } }
  ]);
  const byName = Object.fromEntries(counts.map(c => [c._id, c.count]));
  return ['abandoned_cart', 'quote_alert', 'quote_follow_up', 'review_request', 'replenishment']
    .reduce((stats, name) => ({ ...stats, [name]: byName[name] || 0 }), {});
};

module.exports = {
  tracked,
  unsubscribeToken,
  emailFromToken,
  unsubscribeUrl,
  abandonedCarts,
  quoteAlerts,
  quoteFollowUps,
  reviewRequests,
  replenishments,
  runFrequent,
  runDaily,
  startAutomationSchedule,
  automationStats
};
