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

const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: 'Paiement à la livraison',
  bank_transfer: 'Virement bancaire',
  paymee: 'Paymee',
  flouci: 'Flouci',
  d17: 'D17',
  konnect: 'Konnect',
  card: 'Carte bancaire'
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
      const content = this.generateOrderConfirmationEmail(order);
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

  generateOrderConfirmationEmail(order) {
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

    const totals = [
      ['Sous-total', formatTND(pricing.subtotal)],
      ['Livraison', delivery],
      ...(pricing.paymentFee ? [['Frais de paiement', formatTND(pricing.paymentFee)]] : []),
      [`TVA (${Math.round((pricing.taxRate || 0) * 100)}%)`, formatTND(pricing.taxAmount)]
    ];

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
      </table>
      <p><strong>Paiement :</strong> ${escapeHtml(paymentLabel)}</p>
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
      '',
      `Paiement : ${paymentLabel}`,
      `Livraison à : ${addressLines.join(', ')}`,
      ...(estimatedDelivery ? [`Livraison estimée : ${estimatedDelivery}`] : []),
      '',
      `Suivre ma commande : ${trackingUrl}`
    ].join('\n');

    return { subject, html, text };
  }

  // Send order status update email
  async sendOrderStatusUpdate(order) {
    if (!order.emailNotifications?.enabled || !order.emailNotifications?.statusUpdates) {
      console.log(`Email notifications disabled for order ${order.orderNumber}`);
      return { success: false, reason: 'notifications_disabled' };
    }

    try {
      const emailContent = this.generateStatusUpdateEmail(order);
      
      const mailOptions = {
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: order.customer.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Update notification sent flag
      const statusEntry = order.statusHistory[order.statusHistory.length - 1];
      if (statusEntry) {
        statusEntry.notificationSent = true;
      }
      order.emailNotifications.lastNotificationSent = new Date();
      await order.save();

      console.log(`Status update email sent for order ${order.orderNumber} to ${order.customer.email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending status update email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send delivery notification email
  async sendDeliveryNotification(order) {
    if (!order.emailNotifications?.enabled || !order.emailNotifications?.deliveryUpdates) {
      return { success: false, reason: 'notifications_disabled' };
    }

    try {
      const emailContent = this.generateDeliveryEmail(order);
      
      const mailOptions = {
        from: `"STES Piscines" <${process.env.EMAIL_USER}>`,
        to: order.customer.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      order.emailNotifications.lastNotificationSent = new Date();
      await order.save();

      console.log(`Delivery notification sent for order ${order.orderNumber}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending delivery notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate status update email content
  generateStatusUpdateEmail(order) {
    const statusLabels = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      processing: 'En préparation',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };

    const statusColors = {
      pending: '#f59e0b',
      confirmed: '#10b981',
      processing: '#8b5cf6',
      shipped: '#3b82f6',
      delivered: '#059669',
      cancelled: '#ef4444'
    };

    const currentStatusLabel = statusLabels[order.status];
    const statusColor = statusColors[order.status];
    const latestUpdate = order.statusHistory[order.statusHistory.length - 1];

    const subject = `Mise à jour de votre commande ${order.orderNumber} - ${currentStatusLabel}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: ${statusColor}; }
          .order-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .timeline-item { border-left: 3px solid ${statusColor}; padding-left: 15px; margin-bottom: 15px; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          .btn { display: inline-block; padding: 12px 24px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏊‍♂️ STES Piscines</h1>
            <p>Mise à jour de votre commande</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${order.customer.name},</h2>
            
            <p>Votre commande <strong>${order.orderNumber}</strong> a été mise à jour :</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">${currentStatusLabel}</span>
            </div>
            
            <div class="order-details">
              <h3>Détails de la commande</h3>
              <p><strong>Numéro de commande :</strong> ${order.orderNumber}</p>
              <p><strong>Code de suivi :</strong> ${order.trackingCode}</p>
              <p><strong>Montant total :</strong> ${order.totalAmount} TND</p>
              ${order.trackingNumber ? `<p><strong>Numéro de suivi :</strong> ${order.trackingNumber}</p>` : ''}
              ${order.estimatedDelivery ? `<p><strong>Livraison estimée :</strong> ${new Date(order.estimatedDelivery).toLocaleDateString('fr-FR')}</p>` : ''}
            </div>
            
            ${latestUpdate ? `
            <div class="timeline-item">
              <h4>Dernière mise à jour</h4>
              <p><strong>${new Date(latestUpdate.timestamp).toLocaleDateString('fr-FR')} à ${new Date(latestUpdate.timestamp).toLocaleTimeString('fr-FR')}</strong></p>
              <p>${latestUpdate.note}</p>
              ${latestUpdate.location ? `<p>📍 ${latestUpdate.location}</p>` : ''}
            </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/track-order?order=${order.orderNumber}" class="btn">
                Suivre ma commande
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Merci de votre confiance !</p>
            <p>L'équipe STES Piscines</p>
            <p style="font-size: 12px; color: #6b7280;">
              Si vous ne souhaitez plus recevoir ces notifications, 
              <a href="${process.env.FRONTEND_URL}/account/notifications">cliquez ici</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      STES Piscines - Mise à jour de commande
      
      Bonjour ${order.customer.name},
      
      Votre commande ${order.orderNumber} a été mise à jour : ${currentStatusLabel}
      
      Détails :
      - Code de suivi : ${order.trackingCode}
      - Montant : ${order.totalAmount} TND
      ${order.estimatedDelivery ? `- Livraison estimée : ${new Date(order.estimatedDelivery).toLocaleDateString('fr-FR')}` : ''}
      
      ${latestUpdate ? `Dernière mise à jour : ${latestUpdate.note}` : ''}
      
      Suivez votre commande : ${process.env.FRONTEND_URL}/track-order?order=${order.orderNumber}
      
      Merci de votre confiance !
      L'équipe STES Piscines
    `;

    return { subject, html, text };
  }

  // Generate delivery email content
  generateDeliveryEmail(order) {
    const subject = `🎉 Votre commande ${order.orderNumber} a été livrée !`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .celebration { text-align: center; font-size: 48px; margin: 20px 0; }
          .order-summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏊‍♂️ STES Piscines</h1>
            <p>Livraison confirmée !</p>
          </div>
          
          <div class="content">
            <div class="celebration">🎉📦✨</div>
            
            <h2>Félicitations ${order.customer.name} !</h2>
            
            <p>Votre commande <strong>${order.orderNumber}</strong> a été livrée avec succès !</p>
            
            <div class="order-summary">
              <h3>Résumé de la livraison</h3>
              <p><strong>Livré le :</strong> ${new Date(order.actualDelivery).toLocaleDateString('fr-FR')} à ${new Date(order.actualDelivery).toLocaleTimeString('fr-FR')}</p>
              <p><strong>Adresse de livraison :</strong> ${order.customer.address.street}, ${order.customer.address.city}</p>
              <p><strong>Montant total :</strong> ${order.totalAmount} TND</p>
            </div>
            
            <p>Nous espérons que vous êtes satisfait(e) de votre achat. N'hésitez pas à nous faire part de vos commentaires !</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/account/orders" class="btn">Voir mes commandes</a>
              <a href="${process.env.FRONTEND_URL}/shop" class="btn">Continuer mes achats</a>
            </div>
          </div>
          
          <div class="footer">
            <p>Merci de votre confiance !</p>
            <p>L'équipe STES Piscines</p>
            <p style="font-size: 12px; color: #6b7280;">
              Une question ? Contactez-nous à support@piscinefacile.tn
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      🎉 STES Piscines - Livraison confirmée !
      
      Félicitations ${order.customer.name} !
      
      Votre commande ${order.orderNumber} a été livrée avec succès !
      
      Livré le : ${new Date(order.actualDelivery).toLocaleDateString('fr-FR')}
      Adresse : ${order.customer.address.street}, ${order.customer.address.city}
      Montant : ${order.totalAmount} TND
      
      Merci de votre confiance !
      L'équipe STES Piscines
    `;

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
