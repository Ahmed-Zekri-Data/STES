const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const MaintenanceSubscriber = require('../models/MaintenanceSubscriber');
const {
  publicCalendar, subscribe, confirm, findByToken, whatsappNumber, whatsappQueue, markWhatsappSent, sendDueEmails
} = require('../services/maintenanceService');
const { REMINDER_KEYS } = require('../config/maintenanceCalendar');

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const volume = (field) => body(field).optional({ values: 'null' })
  .isFloat({ min: 1, max: 2000 }).withMessage('Indiquez le volume de votre piscine (entre 1 et 2000 m³)').toFloat();
const phoneFor = (field) => body(field).optional({ values: 'falsy' }).trim()
  .custom(value => Boolean(whatsappNumber(value))).withMessage('Indiquez un numéro WhatsApp valide, par exemple 98 765 432');

// /api/maintenance - "Mon calendrier d'entretien" (/entretien)
const publicRouter = express.Router();

// GET /api/maintenance/calendar - The year's reminders, with their products
publicRouter.get('/calendar', async (req, res) => {
  try {
    res.json({ reminders: await publicCalendar() });
  } catch (error) {
    console.error('Error loading the pool care calendar:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du calendrier' });
  }
});

// POST /api/maintenance/subscribe - Ask for the reminders
publicRouter.post('/subscribe', [
  body('firstName').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Indiquez votre prénom'),
  body('email').isEmail().withMessage('Indiquez une adresse email valide').normalizeEmail({ gmail_remove_dots: false }),
  body('whatsapp').optional().isBoolean().toBoolean(),
  phoneFor('phone'),
  body('phone').if(body('whatsapp').equals('true')).notEmpty().withMessage('Indiquez votre numéro WhatsApp'),
  volume('volume'),
  body('source').optional().isIn(['page', 'builder']),
  body('consent').custom(value => value === true || value === 'true').withMessage('Cochez la case pour accepter de recevoir les rappels')
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const { firstName, email, phone, whatsapp, volume: m3, source } = req.body;
    await subscribe({ firstName, email, phone, whatsapp, volume: m3, source, ipAddress: req.ip });
    // The same answer whether or not the address was already signed up
    res.status(201).json({ message: 'Plus qu’une étape : cliquez sur « Confirmer mes rappels » dans l’email que nous venons de vous envoyer.' });
  } catch (error) {
    console.error('Error signing up for pool care reminders:', error);
    res.status(500).json({ message: 'L’inscription n’a pas abouti. Réessayez plus tard.' });
  }
});

// The link in each reminder: see, change or stop them
const bySubscription = async (req, res) => {
  const subscriber = await findByToken(req.params.token);
  if (!subscriber) res.status(404).json({ message: 'Ce lien ne correspond à aucun rappel : vous êtes peut-être déjà désinscrit.' });
  return subscriber;
};

const view = (subscriber) => ({
  firstName: subscriber.firstName,
  email: subscriber.email,
  phone: subscriber.phone || '',
  volume: subscriber.volume ?? null,
  channels: { email: subscriber.channels.email, whatsapp: subscriber.channels.whatsapp },
  confirmed: Boolean(subscriber.confirmedAt)
});

publicRouter.get('/subscription/:token', async (req, res) => {
  try {
    const subscriber = await bySubscription(req, res);
    if (subscriber) res.json(view(subscriber));
  } catch (error) {
    console.error('Error loading a reminders subscription:', error);
    res.status(500).json({ message: 'Erreur lors du chargement de vos rappels' });
  }
});

publicRouter.put('/subscription/:token', [
  volume('volume'),
  body('channels.email').optional().isBoolean().toBoolean(),
  body('channels.whatsapp').optional().isBoolean().toBoolean(),
  phoneFor('phone')
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const subscriber = await bySubscription(req, res);
    if (!subscriber) return;
    const { volume: m3, channels = {}, phone } = req.body;
    if (m3 !== undefined) subscriber.volume = m3 ?? undefined;
    if (phone !== undefined) subscriber.phone = phone ? whatsappNumber(phone) : undefined;
    if (channels.email !== undefined) subscriber.channels.email = channels.email;
    if (channels.whatsapp !== undefined) subscriber.channels.whatsapp = channels.whatsapp;
    if (subscriber.channels.whatsapp && !subscriber.phone) {
      return res.status(400).json({ message: 'Indiquez votre numéro WhatsApp' });
    }
    if (!subscriber.channels.email && !subscriber.channels.whatsapp) {
      return res.status(400).json({ message: 'Choisissez au moins un moyen de vous prévenir, ou arrêtez les rappels' });
    }
    await subscriber.save();
    res.json({ message: 'Vos rappels sont à jour', subscription: view(subscriber) });
  } catch (error) {
    console.error('Error updating a reminders subscription:', error);
    res.status(500).json({ message: 'Erreur lors de l’enregistrement' });
  }
});

// The button on the page the first email opens: a click, not the link
// itself, since mail scanners open links on their own
publicRouter.post('/subscription/:token/confirm', async (req, res) => {
  try {
    const subscriber = await bySubscription(req, res);
    if (!subscriber) return;
    await confirm(subscriber);
    res.json({ message: 'Vos rappels sont activés. Un email vous indique la date du prochain.', subscription: view(subscriber) });
  } catch (error) {
    console.error('Error confirming a reminders subscription:', error);
    res.status(500).json({ message: 'La confirmation n’a pas abouti. Réessayez plus tard.' });
  }
});

// Stopping the reminders deletes everything we kept
publicRouter.delete('/subscription/:token', async (req, res) => {
  try {
    const subscriber = await bySubscription(req, res);
    if (!subscriber) return;
    await subscriber.deleteOne();
    res.json({ message: 'Vous ne recevrez plus nos rappels. Vos informations ont été effacées.' });
  } catch (error) {
    console.error('Error unsubscribing from reminders:', error);
    res.status(500).json({ message: 'Erreur lors de la désinscription' });
  }
});

// /api/admin/maintenance - Admin → Reminders
const adminRouter = express.Router();
adminRouter.use(auth, checkPermission('forms'));

// The subscribers, and the WhatsApp reminders waiting to be sent
adminRouter.get('/', async (req, res) => {
  try {
    const [subscribers, total, queue] = await Promise.all([
      MaintenanceSubscriber.find().sort({ createdAt: -1 }).limit(500)
        .select('firstName email phone channels volume source sent confirmedAt createdAt').lean(),
      MaintenanceSubscriber.countDocuments(),
      whatsappQueue()
    ]);
    res.json({
      total,
      subscribers,
      whatsapp: queue,
      emailConfigured: require('../services/emailNotificationService').isConfigured()
    });
  } catch (error) {
    console.error('Error loading reminder subscribers:', error);
    res.status(500).json({ message: 'Error loading reminders' });
  }
});

// Marks a WhatsApp reminder as sent by the admin
adminRouter.post('/:id/sent', [
  param('id').isMongoId().withMessage('Unknown subscriber'),
  body('key').isIn(REMINDER_KEYS).withMessage('Unknown reminder'),
  body('year').isInt({ min: 2000, max: 3000 }).withMessage('Unknown reminder').toInt()
], async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const found = await markWhatsappSent(req.params.id, req.body);
    if (!found) return res.status(404).json({ message: 'This subscriber no longer exists' });
    res.json({ message: 'Marked as sent' });
  } catch (error) {
    console.error('Error marking a WhatsApp reminder as sent:', error);
    res.status(500).json({ message: 'Error saving' });
  }
});

// Sends today's email reminders now instead of at 9:00
adminRouter.post('/send-now', async (req, res) => {
  try {
    const result = await sendDueEmails();
    if (result.reason === 'email_not_configured') {
      return res.status(409).json({ message: 'Emails are not set up yet (EMAIL_USER / EMAIL_PASS in .env)' });
    }
    res.json({ message: `${result.sent} email${result.sent === 1 ? '' : 's'} sent${result.failed ? `, ${result.failed} failed` : ''}`, ...result });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ message: 'Error sending reminders' });
  }
});

adminRouter.delete('/:id', param('id').isMongoId().withMessage('Unknown subscriber'), async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const removed = await MaintenanceSubscriber.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'This subscriber no longer exists' });
    res.json({ message: 'Subscriber removed' });
  } catch (error) {
    console.error('Error removing a reminder subscriber:', error);
    res.status(500).json({ message: 'Error removing' });
  }
});

module.exports = { publicRouter, adminRouter };
