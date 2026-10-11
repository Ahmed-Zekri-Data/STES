// The automatic emails' content (see automationService): subject, HTML and
// text, in French as customers read them. Every customer email ends with
// a link to stop these emails; order and invoice emails are separate.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const tnd = (amount) => `${Number(amount || 0).toFixed(3)} TND`;
const priceOf = (line) => (line.price === null || line.price === undefined ? 'Prix sur demande' : tnd(line.price * (line.quantity || 1)));

const button = (href, label) => `<p style="text-align:center;margin:24px 0">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:#0e7490;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">${escapeHtml(label)}</a>
      </p>`;

const lines = (items) => `<table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${items.map(item => `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:6px 0">${escapeHtml(item.name)}${item.quantity > 1 ? ` × ${escapeHtml(item.quantity)}` : ''}</td>
          <td style="padding:6px 0;text-align:right;white-space:nowrap">${escapeHtml(priceOf(item))}</td>
        </tr>`).join('')}
      </table>`;

// The shop's frame, with the "stop these emails" link for customers
const layout = ({ title, body, unsubscribeUrl }) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#0e7490;color:#ffffff;padding:24px;border-radius:10px 10px 0 0;text-align:center">
      <h1 style="margin:0;font-size:22px">STES Piscines</h1>
      <p style="margin:4px 0 0">${escapeHtml(title)}</p>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb">
      ${body}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;font-size:13px;color:#6b7280;border-radius:0 0 10px 10px">
      Une question ? Répondez simplement à cet email.
      ${unsubscribeUrl ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">Ne plus recevoir ce type d’email</a>` : ''}
    </div>
  </div>
</body>
</html>`;

const footerText = (unsubscribeUrl) => [
  '',
  'Une question ? Répondez simplement à cet email.',
  ...(unsubscribeUrl ? [`Ne plus recevoir ce type d’email : ${unsubscribeUrl}`] : [])
];

const hello = (name) => (name ? `Bonjour ${name},` : 'Bonjour,');

// A checkout left before the end
const abandonedCart = ({ firstName, items, restoreUrl, unsubscribeUrl }) => {
  const intro = 'Vous avez commencé une commande sur STES.tn sans aller jusqu’au bout. Votre panier vous attend : un clic suffit pour le retrouver.';
  return {
    subject: 'Votre panier vous attend chez STES Piscines',
    html: layout({
      title: 'Votre panier vous attend',
      unsubscribeUrl,
      body: `<p>${escapeHtml(hello(firstName))}</p>
      <p>${escapeHtml(intro)}</p>
      ${lines(items)}
      ${button(restoreUrl, 'Reprendre ma commande')}
      <p style="font-size:14px;color:#6b7280">Paiement à la livraison possible. Une hésitation sur un produit ? Répondez à cet email, un technicien vous conseille.</p>`
    }),
    text: [
      hello(firstName),
      '',
      intro,
      '',
      ...items.map(item => `- ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''} : ${priceOf(item)}`),
      '',
      `Reprendre ma commande : ${restoreUrl}`,
      ...footerText(unsubscribeUrl)
    ].join('\n')
  };
};

// For the admins: requests still waiting for an answer
const quoteAlert = ({ requests, adminUrl }) => {
  const count = requests.length;
  const subject = count === 1 ? '1 demande attend votre réponse' : `${count} demandes attendent votre réponse`;
  const describe = (r) => `${r.name} (${r.city || 'ville non indiquée'}) · ${r.kind} · reçue le ${r.receivedAt}`;
  return {
    subject,
    html: layout({
      title: subject,
      body: `<p>Ces demandes n’ont pas encore de réponse. Un client qui attend achète souvent ailleurs : un appel ou un message WhatsApp aujourd’hui fait la différence.</p>
      <ul style="padding-left:18px;line-height:1.7">${requests.map(r => `<li>${escapeHtml(describe(r))}${r.phone ? ` · <strong>${escapeHtml(r.phone)}</strong>` : ''}</li>`).join('')}</ul>
      ${button(adminUrl, 'Ouvrir les demandes')}
      <p style="font-size:14px;color:#6b7280">Marquez chaque demande « Répondu » dans l’administration une fois le client contacté.</p>`
    }),
    text: [
      'Ces demandes n’ont pas encore de réponse :',
      '',
      ...requests.map(r => `- ${describe(r)}${r.phone ? ` · ${r.phone}` : ''}`),
      '',
      `Ouvrir les demandes : ${adminUrl}`
    ].join('\n')
  };
};

// A few days after the shop answered a quote, without an order
const quoteFollowUp = ({ name, whatsappUrl, siteUrl, unsubscribeUrl }) => {
  const intro = 'Nous vous avons répondu au sujet de votre demande il y a quelques jours. Avez-vous des questions, ou souhaitez-vous ajuster quelque chose ?';
  return {
    subject: 'Votre projet piscine : avez-vous des questions ?',
    html: layout({
      title: 'Votre projet piscine',
      unsubscribeUrl,
      body: `<p>${escapeHtml(hello(name))}</p>
      <p>${escapeHtml(intro)}</p>
      <p>Un technicien STES peut vous rappeler, passer voir votre piscine ou adapter la proposition à votre budget.</p>
      ${whatsappUrl ? button(whatsappUrl, 'Nous écrire sur WhatsApp') : button(siteUrl, 'Voir la boutique')}
      <p style="font-size:14px;color:#6b7280">Vous pouvez aussi répondre directement à cet email.</p>`
    }),
    text: [
      hello(name),
      '',
      intro,
      'Un technicien STES peut vous rappeler, passer voir votre piscine ou adapter la proposition à votre budget.',
      '',
      ...(whatsappUrl ? [`Nous écrire sur WhatsApp : ${whatsappUrl}`] : [`La boutique : ${siteUrl}`]),
      ...footerText(unsubscribeUrl)
    ].join('\n')
  };
};

// A few days after delivery: a review on the site, and on Google
const reviewRequest = ({ name, orderNumber, items, googleReviewUrl, unsubscribeUrl }) => {
  const intro = `Votre commande ${orderNumber} est arrivée il y a quelques jours. Êtes-vous satisfait ? Votre avis aide les autres propriétaires de piscine à bien choisir, et il ne prend qu’une minute.`;
  return {
    subject: 'Votre avis compte pour nous',
    html: layout({
      title: 'Votre avis compte',
      unsubscribeUrl,
      body: `<p>${escapeHtml(hello(name))}</p>
      <p>${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${items.map(item => `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0">${escapeHtml(item.name)}</td>
          <td style="padding:8px 0;text-align:right"><a href="${escapeHtml(item.reviewUrl)}" style="color:#0e7490;font-weight:bold">Donner mon avis</a></td>
        </tr>`).join('')}
      </table>
      ${googleReviewUrl ? `<p>Vous avez apprécié notre service ? Un avis sur Google nous aide énormément à nous faire connaître :</p>${button(googleReviewUrl, 'Laisser un avis sur Google')}` : ''}
      <p style="font-size:14px;color:#6b7280">Un souci avec votre commande ? Répondez à cet email, nous nous en occupons.</p>`
    }),
    text: [
      hello(name),
      '',
      intro,
      '',
      ...items.map(item => `- ${item.name} : ${item.reviewUrl}`),
      ...(googleReviewUrl ? ['', `Laisser un avis sur Google : ${googleReviewUrl}`] : []),
      ...footerText(unsubscribeUrl)
    ].join('\n')
  };
};

// The consumables bought a while ago are probably running out
const replenishment = ({ name, items, reorderUrl, unsubscribeUrl }) => {
  const intro = items.length === 1
    ? `Votre ${items[0].name} arrive sans doute bientôt à sa fin. Pour garder une eau claire, pensez à le commander avant d’être à court.`
    : 'Les produits d’entretien de votre dernière commande arrivent sans doute bientôt à leur fin. Pour garder une eau claire, pensez à les commander avant d’être à court.';
  return {
    subject: items.length === 1 ? `Bientôt à court de ${items[0].name} ?` : 'Bientôt à court de produits d’entretien ?',
    html: layout({
      title: 'Pensez à votre réassort',
      unsubscribeUrl,
      body: `<p>${escapeHtml(hello(name))}</p>
      <p>${escapeHtml(intro)}</p>
      ${lines(items)}
      ${button(reorderUrl, 'Commander à nouveau')}
      <p style="font-size:14px;color:#6b7280">Les prix sont ceux d’aujourd’hui. Livraison dans les 24 gouvernorats.</p>`
    }),
    text: [
      hello(name),
      '',
      intro,
      '',
      ...items.map(item => `- ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''} : ${priceOf(item)}`),
      '',
      `Commander à nouveau : ${reorderUrl}`,
      ...footerText(unsubscribeUrl)
    ].join('\n')
  };
};

module.exports = { abandonedCart, quoteAlert, quoteFollowUp, reviewRequest, replenishment };
