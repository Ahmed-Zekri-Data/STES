const nodemailer = require('nodemailer');
require('../config/env');

// Escapes text typed by customers before it goes into an HTML email
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatTND = (amount) => `${Number(amount || 0).toFixed(3)} TND`;

// The account and amount for a bank transfer, with the order number to quote
const bankLines = (bank, order) => [
  ['Bénéficiaire', bank.beneficiary],
  ...(bank.bankName ? [['Banque', bank.bankName]] : []),
  ['RIB', bank.rib],
  ['IBAN', bank.iban],
  ['Montant', formatTND(order.pricing?.totalAmount ?? order.totalAmount)],
  ['Motif', order.orderNumber]
];

const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: 'Paiement à la livraison',
  bank_transfer: 'Virement bancaire',
  paymee: 'Paymee',
  flouci: 'Flouci',
  d17: 'D17',
  konnect: 'Konnect',
  card: 'Carte bancaire'
};

// What each status email says. Statuses not listed here are not emailed.
const STATUS_EMAILS = {
  confirmed: {
    subject: 'est confirmée',
    title: 'Commande confirmée',
    color: '#0284c7',
    message: 'Bonne nouvelle : votre commande est confirmée. Nous la préparons et vous écrirons dès son expédition.'
  },
  shipped: {
    subject: 'est en route',
    title: 'Commande expédiée',
    color: '#2563eb',
    message: 'Votre commande a été expédiée et est en route vers vous.'
  },
  delivered: {
    subject: 'a été livrée',
    title: 'Commande livrée',
    color: '#059669',
    message: 'Votre commande a été livrée. Merci pour votre confiance ! Nous espérons que vos produits vous donnent entière satisfaction.'
  },
  cancelled: {
    subject: 'a été annulée',
    title: 'Commande annulée',
    color: '#6b7280',
    message: "Votre commande a été annulée. Si vous n'avez pas demandé cette annulation ou si vous avez une question, répondez simplement à cet email."
  }
};

class EmailNotificationService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Configure email transporter
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // True when SMTP credentials are set (not left empty or as the
  // .env.example placeholders), so we don't try to send with no account
  isConfigured() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    return Boolean(user && pass && user !== 'your-email@gmail.com' && pass !== 'your-app-password');
  }

  // Send the "order received" email to the customer after checkout
  async sendOrderConfirmation(order) {
    if (order.emailNotifications?.enabled === false) {
      return { success: false, reason: 'notifications_disabled' };
    }
    if (!this.isConfigured()) {
      console.log(`Email not configured (EMAIL_USER / EMAIL_PASS): no confirmation sent for order ${order.orderNumber}`);
      return { success: false, reason: 'email_not_configured' };
    }

    try {
      // Bank transfer orders get the account to pay into
      const { getSettings, bankTransferDetails } = require('./settingsService');
      const bank = order.paymentMethod === 'bank_transfer' ? bankTransferDetails((await getSettings()).bank) : null;
      const content = this.generateOrderConfirmationEmail(order, { bank });
      const result = await this.transporter.sendMail({
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: order.customer.email,
        subject: content.subject,
        html: content.html,
        text: content.text
      });

      console.log(`Order confirmation email sent for order ${order.orderNumber} to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Error sending order confirmation email for ${order.orderNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Who hears about new contact and quote requests: the addresses in
  // ADMIN_NOTIFICATION_EMAIL (comma-separated) when set, otherwise every
  // active admin allowed to manage forms
  async adminRecipients() {
    const configured = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
      .split(',')
      .map(address => address.trim())
      .filter(Boolean);
    if (configured.length) {
      return configured;
    }
    const Admin = require('../models/Admin');
    const admins = await Admin.find({
      isActive: true,
      $or: [{ role: 'super_admin' }, { permissions: 'forms' }]
    }).select('email').lean();
    return [...new Set(admins.map(admin => admin.email).filter(Boolean))];
  }

  // Tell the admins about a new contact or quote request. Replying to the
  // email answers the customer. Never throws: callers don't wait for it.
  async sendNewRequestToAdmins(submission) {
    if (!this.isConfigured()) {
      console.log(`Email not configured (EMAIL_USER / EMAIL_PASS): admins not emailed about ${submission.type} request ${submission._id}`);
      return { success: false, reason: 'email_not_configured' };
    }

    try {
      const to = await this.adminRecipients();
      if (!to.length) {
        console.log(`No admin email address: nobody emailed about ${submission.type} request ${submission._id}`);
        return { success: false, reason: 'no_recipients' };
      }

      const content = this.generateNewRequestEmail(submission);
      const result = await this.transporter.sendMail({
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: to.join(', '),
        replyTo: { name: submission.name, address: submission.email },
        subject: content.subject,
        html: content.html,
        text: content.text
      });

      console.log(`Admins emailed about ${submission.type} request ${submission._id}`);
      return { success: true, messageId: result.messageId, to };
    } catch (error) {
      console.error(`Error emailing admins about request ${submission._id}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  generateNewRequestEmail(submission) {
    const isQuote = submission.type === 'quote';
    const oneLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const subject = isQuote
      ? `Nouvelle demande de devis : ${oneLine(submission.name)}${submission.city ? ` (${oneLine(submission.city)})` : ''}`
      : `Nouveau message : ${oneLine(submission.subject) || oneLine(submission.name)}`;
    const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/forms?search=${encodeURIComponent(submission.email)}`;
    const receivedAt = new Date(submission.createdAt || Date.now()).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Tunis' });

    const details = [
      ['Nom', submission.name],
      ['Email', submission.email],
      ['Téléphone', submission.phone],
      ['Ville', submission.city],
      ['Sujet', submission.subject]
    ].filter(([, value]) => value);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <div style="background: #2563eb; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">${isQuote ? 'Nouvelle demande de devis' : 'Nouveau message de contact'}</h1>
          <p style="margin: 6px 0 0; opacity: 0.9;">Reçu le ${escapeHtml(receivedAt)}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            ${details.map(([label, value]) => `
              <tr>
                <td style="padding: 6px 12px 6px 0; color: #6b7280; width: 110px; vertical-align: top;">${label}</td>
                <td style="padding: 6px 0;">${escapeHtml(value)}</td>
              </tr>`).join('')}
          </table>
          <div style="background: #f9fafb; border-radius: 6px; padding: 14px; white-space: pre-wrap;">${escapeHtml(submission.message)}</div>
          <p style="margin: 20px 0 8px;">
            <a href="${escapeHtml(adminUrl)}" style="background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Ouvrir dans l'administration</a>
          </p>
          <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0;">Répondez à cet email pour écrire directement à ${escapeHtml(submission.name)}.</p>
        </div>
      </div>`;

    const text = [
      isQuote ? 'Nouvelle demande de devis' : 'Nouveau message de contact',
      `Reçu le ${receivedAt}`,
      '',
      ...details.map(([label, value]) => `${label} : ${value}`),
      '',
      submission.message,
      '',
      `Ouvrir dans l'administration : ${adminUrl}`,
      `Répondez à cet email pour écrire directement à ${submission.name}.`
    ].join('\n');

    return { subject, html, text };
  }

  // Welcome email with the link to confirm the address. Never throws:
  // callers don't wait for it. The link is never logged.
  async sendEmailVerification(customer, token) {
    if (!this.isConfigured()) {
      console.log(`Email not configured (EMAIL_USER / EMAIL_PASS): no confirmation email sent to ${customer.email}`);
      return { success: false, reason: 'email_not_configured' };
    }

    try {
      const content = this.generateEmailVerificationEmail(customer, token);
      const result = await this.transporter.sendMail({
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: customer.email,
        subject: content.subject,
        html: content.html,
        text: content.text
      });

      console.log(`Confirmation email sent to ${customer.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Error sending confirmation email to ${customer.email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  generateEmailVerificationEmail(customer, token) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Bienvenue chez STES Piscines : confirmez votre adresse email';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <div style="background: #2563eb; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Bienvenue chez STES Piscines</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 12px;">Bonjour ${escapeHtml(customer.firstName)},</p>
          <p style="margin: 0 0 12px;">Merci d'avoir créé votre compte. Confirmez votre adresse email pour être sûr de recevoir nos confirmations de commande et le suivi de vos livraisons.</p>
          <p style="margin: 20px 0;">
            <a href="${escapeHtml(verifyUrl)}" style="background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Confirmer mon adresse email</a>
          </p>
          <p style="margin: 0 0 12px;">Ce lien est valable 7 jours.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0;">Si vous n'avez pas créé de compte chez STES Piscines, ignorez cet email.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0; word-break: break-all;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${escapeHtml(verifyUrl)}</p>
        </div>
      </div>`;

    const text = [
      `Bonjour ${customer.firstName},`,
      '',
      "Merci d'avoir créé votre compte STES Piscines.",
      'Confirmez votre adresse email en ouvrant ce lien :',
      verifyUrl,
      '',
      'Ce lien est valable 7 jours.',
      "Si vous n'avez pas créé de compte chez STES Piscines, ignorez cet email."
    ].join('\n');

    return { subject, html, text };
  }

  // Send the "choose a new password" link. Never throws: callers don't
  // wait for it. The link is never logged.
  async sendPasswordReset(customer, resetToken) {
    if (!this.isConfigured()) {
      console.log(`Email not configured (EMAIL_USER / EMAIL_PASS): no password reset email sent to ${customer.email}`);
      return { success: false, reason: 'email_not_configured' };
    }

    try {
      const content = this.generatePasswordResetEmail(customer, resetToken);
      const result = await this.transporter.sendMail({
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: customer.email,
        subject: content.subject,
        html: content.html,
        text: content.text
      });

      console.log(`Password reset email sent to ${customer.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Error sending password reset email to ${customer.email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  generatePasswordResetEmail(customer, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const subject = 'Réinitialisation de votre mot de passe STES';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <div style="background: #2563eb; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Réinitialisation du mot de passe</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 12px;">Bonjour ${escapeHtml(customer.firstName)},</p>
          <p style="margin: 0 0 12px;">Vous avez demandé à changer le mot de passe de votre compte STES Piscines. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
          <p style="margin: 20px 0;">
            <a href="${escapeHtml(resetUrl)}" style="background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; display: inline-block;">Choisir un nouveau mot de passe</a>
          </p>
          <p style="margin: 0 0 12px;">Ce lien est valable 1 heure et ne peut servir qu'une fois.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0;">Si vous n'avez pas fait cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0; word-break: break-all;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${escapeHtml(resetUrl)}</p>
        </div>
      </div>`;

    const text = [
      `Bonjour ${customer.firstName},`,
      '',
      'Vous avez demandé à changer le mot de passe de votre compte STES Piscines.',
      'Ouvrez ce lien pour en choisir un nouveau :',
      resetUrl,
      '',
      "Ce lien est valable 1 heure et ne peut servir qu'une fois.",
      "Si vous n'avez pas fait cette demande, ignorez cet email : votre mot de passe reste inchangé."
    ].join('\n');

    return { subject, html, text };
  }

  generateOrderConfirmationEmail(order, { bank } = {}) {
    const pricing = order.pricing || {};
    const address = order.customer.address || {};
    const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-order?code=${encodeURIComponent(order.trackingCode)}`;
    const paymentLabel = PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod;
    const addressLines = [
      address.street,
      [address.city, address.governorate].filter(Boolean).join(', '),
      address.country
    ].filter(Boolean);
    const estimatedDelivery = order.estimatedDelivery
      ? new Date(order.estimatedDelivery).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    const delivery = Number(pricing.shippingCost) === 0 ? 'Gratuite' : formatTND(pricing.shippingCost);

    // VAT is part of the prices (shown under the total), except on orders
    // placed before that, where it was added on top.
    const tax = [`TVA (${Math.round((pricing.taxRate || 0) * 100)}%)`, formatTND(pricing.taxAmount)];
    const totals = [
      ['Sous-total', formatTND(pricing.subtotal)],
      ['Livraison', delivery],
      ...(pricing.paymentFee ? [['Frais de paiement', formatTND(pricing.paymentFee)]] : []),
      ...(pricing.taxIncluded ? [] : [tax])
    ];
    const includedTax = pricing.taxIncluded ? `dont ${tax[0]} : ${tax[1]}` : '';

    const subject = `Confirmation de votre commande ${order.orderNumber}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#0284c7;color:#ffffff;padding:24px;border-radius:10px 10px 0 0;text-align:center">
      <h1 style="margin:0;font-size:22px">STES Piscines</h1>
      <p style="margin:4px 0 0">Merci pour votre commande !</p>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb">
      <p>Bonjour ${escapeHtml(order.customer.name)},</p>
      <p>Nous avons bien reçu votre commande. Voici son récapitulatif.</p>
      <p style="background:#f0f9ff;padding:12px;border-radius:8px">
        Numéro de commande : <strong>${escapeHtml(order.orderNumber)}</strong><br>
        Code de suivi : <strong>${escapeHtml(order.trackingCode)}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="text-align:left;border-bottom:1px solid #e5e7eb"><th style="padding:6px 0">Article</th><th style="padding:6px 0">Qté</th><th style="padding:6px 0;text-align:right">Total</th></tr>
        ${order.items.map(item => `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:6px 0">${escapeHtml(item.name)}</td>
          <td style="padding:6px 0">${escapeHtml(item.quantity)}</td>
          <td style="padding:6px 0;text-align:right">${formatTND(item.price * item.quantity)}</td>
        </tr>`).join('')}
      </table>
      <table style="width:100%;border-collapse:collapse">
        ${totals.map(([label, value]) => `<tr><td style="padding:2px 0">${label}</td><td style="padding:2px 0;text-align:right">${value}</td></tr>`).join('')}
        <tr style="font-weight:bold;border-top:1px solid #e5e7eb"><td style="padding:8px 0">Total</td><td style="padding:8px 0;text-align:right">${formatTND(pricing.totalAmount ?? order.totalAmount)}</td></tr>
        ${includedTax ? `<tr><td colspan="2" style="padding:0;text-align:right;font-size:13px;color:#6b7280">${includedTax}</td></tr>` : ''}
      </table>
      <p><strong>Paiement :</strong> ${escapeHtml(paymentLabel)}</p>
      ${bank ? `<p style="background:#fefce8;padding:12px;border-radius:8px">
        <strong>Virement à effectuer</strong><br>
        ${bankLines(bank, order).map(([label, value]) => `${label} : <strong>${escapeHtml(value)}</strong>`).join('<br>')}<br>
        Votre commande est préparée dès réception du virement.
      </p>` : ''}
      <p><strong>Livraison à :</strong><br>${addressLines.map(escapeHtml).join('<br>')}</p>
      ${estimatedDelivery ? `<p><strong>Livraison estimée :</strong> ${escapeHtml(estimatedDelivery)}</p>` : ''}
      <p style="text-align:center;margin:24px 0">
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 24px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:6px">Suivre ma commande</a>
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:13px;color:#6b7280;border-radius:0 0 10px 10px">
      Une question ? Répondez à cet email en indiquant votre numéro de commande.
    </div>
  </div>
</body>
</html>`;

    const text = [
      `Bonjour ${order.customer.name},`,
      '',
      'Nous avons bien reçu votre commande.',
      `Numéro de commande : ${order.orderNumber}`,
      `Code de suivi : ${order.trackingCode}`,
      '',
      ...order.items.map(item => `- ${item.name} x${item.quantity} : ${formatTND(item.price * item.quantity)}`),
      '',
      ...totals.map(([label, value]) => `${label} : ${value}`),
      `Total : ${formatTND(pricing.totalAmount ?? order.totalAmount)}`,
      ...(includedTax ? [includedTax] : []),
      '',
      `Paiement : ${paymentLabel}`,
      ...(bank ? ['', 'Virement à effectuer :', ...bankLines(bank, order).map(([label, value]) => `${label} : ${value}`), 'Votre commande est préparée dès réception du virement.'] : []),
      `Livraison à : ${addressLines.join(', ')}`,
      ...(estimatedDelivery ? [`Livraison estimée : ${estimatedDelivery}`] : []),
      '',
      `Suivre ma commande : ${trackingUrl}`
    ].join('\n');

    return { subject, html, text };
  }

  // Tell the customer their order changed status (see STATUS_EMAILS). The
  // admin's note, when given, is included. Never throws: callers don't wait.
  async sendOrderStatusUpdate(order, { note } = {}) {
    const flags = order.emailNotifications || {};
    const wanted = order.status === 'delivered' ? flags.deliveryUpdates : flags.statusUpdates;
    if (flags.enabled === false || wanted === false) {
      return { success: false, reason: 'notifications_disabled' };
    }
    if (!STATUS_EMAILS[order.status]) {
      return { success: false, reason: 'no_email_for_status' };
    }
    if (!this.isConfigured()) {
      console.log(`Email not configured (EMAIL_USER / EMAIL_PASS): no status email sent for order ${order.orderNumber}`);
      return { success: false, reason: 'email_not_configured' };
    }

    try {
      const content = this.generateStatusUpdateEmail(order, { note });
      const result = await this.transporter.sendMail({
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: order.customer.email,
        subject: content.subject,
        html: content.html,
        text: content.text
      });

      // Not order.save(): the admin may be changing the order at the same time
      const Order = require('../models/Order');
      await Order.updateOne({ _id: order._id }, { $set: { 'emailNotifications.lastNotificationSent': new Date() } });

      console.log(`Status email (${order.status}) sent for order ${order.orderNumber} to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Error sending status email for order ${order.orderNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  generateStatusUpdateEmail(order, { note } = {}) {
    const content = STATUS_EMAILS[order.status];
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trackingUrl = `${siteUrl}/track-order?code=${encodeURIComponent(order.trackingCode)}`;
    const delivered = order.status === 'delivered';
    const productUrl = (item) => `${siteUrl}/product/${item.product?._id || item.product}#avis`;
    const estimatedDelivery = ['confirmed', 'shipped'].includes(order.status) && order.estimatedDelivery
      ? new Date(order.estimatedDelivery).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : null;

    const details = [
      ['Numéro de commande', order.orderNumber],
      ['Code de suivi', order.trackingCode],
      ...(order.status === 'shipped' && order.trackingNumber ? [['Numéro de suivi du transporteur', order.trackingNumber]] : []),
      ...(estimatedDelivery ? [['Livraison estimée', estimatedDelivery]] : []),
      ['Montant', formatTND(order.totalAmount)]
    ];

    const subject = `Votre commande ${order.orderNumber} ${content.subject}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:${content.color};color:#ffffff;padding:24px;border-radius:10px 10px 0 0;text-align:center">
      <h1 style="margin:0;font-size:22px">STES Piscines</h1>
      <p style="margin:4px 0 0">${content.title}</p>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb">
      <p>Bonjour ${escapeHtml(order.customer.name)},</p>
      <p>${content.message}</p>
      ${note ? `<p style="background:#fefce8;padding:12px;border-radius:8px"><strong>Message de notre équipe :</strong><br>${escapeHtml(note)}</p>` : ''}
      <p style="background:#f0f9ff;padding:12px;border-radius:8px">
        ${details.map(([label, value]) => `${label} : <strong>${escapeHtml(value)}</strong>`).join('<br>')}
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${order.items.map(item => `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:6px 0">${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}</td>
          <td style="padding:6px 0;text-align:right">${delivered
            ? `<a href="${escapeHtml(productUrl(item))}" style="color:#0284c7">Donner mon avis</a>`
            : formatTND(item.price * item.quantity)}</td>
        </tr>`).join('')}
      </table>
      ${delivered ? '<p>Votre avis aide les autres clients à bien choisir : il suffit de quelques mots.</p>' : ''}
      ${order.status === 'cancelled' ? '' : `<p style="text-align:center;margin:24px 0">
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 24px;background:${content.color};color:#ffffff;text-decoration:none;border-radius:6px">Suivre ma commande</a>
      </p>`}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:13px;color:#6b7280;border-radius:0 0 10px 10px">
      Une question ? Répondez à cet email en indiquant votre numéro de commande.
    </div>
  </div>
</body>
</html>`;

    const text = [
      `Bonjour ${order.customer.name},`,
      '',
      content.message,
      ...(note ? ['', `Message de notre équipe : ${note}`] : []),
      '',
      ...details.map(([label, value]) => `${label} : ${value}`),
      '',
      ...order.items.map(item => (delivered
        ? `- ${item.name} x${item.quantity} : donner mon avis ${productUrl(item)}`
        : `- ${item.name} x${item.quantity} : ${formatTND(item.price * item.quantity)}`)),
      ...(order.status === 'cancelled' ? [] : ['', `Suivre ma commande : ${trackingUrl}`]),
      '',
      'Une question ? Répondez à cet email en indiquant votre numéro de commande.'
    ].join('\n');

    return { subject, html, text };
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log('✅ Email configuration is valid');
      return { success: true };
    } catch (error) {
      console.error('❌ Email configuration error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailNotificationService();
