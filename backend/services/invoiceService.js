const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const { getSettings } = require('./settingsService');
const { roundMillimes } = require('../utils/checkout');
const { dinarsInWords } = require('../utils/frenchNumbers');

/*
 * Invoices (factures). An order gets its invoice number when it is
 * delivered: numbers follow each other within a year (F2026-00001, ...)
 * and are never reused. Before that, the same document is a "bon de
 * commande" with no number.
 */

const PAYMENT_LABELS = {
  cash_on_delivery: 'Paiement à la livraison',
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
  paymee: 'Paymee',
  flouci: 'Flouci',
  d17: 'D17',
  konnect: 'Konnect'
};

// Gives the order its invoice number, once. The order is claimed first
// (issuedAt set only if unset), so two requests cannot both number it and
// no number is skipped.
const issueInvoice = async (order, now = new Date()) => {
  if (order.invoice?.number) return order.invoice;
  const claimed = await Order.updateOne(
    { _id: order._id, 'invoice.issuedAt': { $exists: false } },
    { $set: { 'invoice.issuedAt': now } }
  );
  if (claimed.modifiedCount !== 1) {
    return (await Order.findById(order._id).select('invoice').lean())?.invoice;
  }
  const year = now.getFullYear();
  const { seq } = await Counter.findOneAndUpdate(
    { _id: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const number = `F${year}-${String(seq).padStart(5, '0')}`;
  await Order.updateOne({ _id: order._id }, { $set: { 'invoice.number': number } });
  return { number, issuedAt: now };
};

// The order as invoice lines (amounts before VAT) and totals. Orders placed
// before prices included VAT (taxIncluded false) had VAT added on top.
const invoiceFigures = (order) => {
  const p = order.pricing || {};
  const rate = p.taxRate ?? 0.19;
  const included = p.taxIncluded !== false;
  const ht = (ttc) => (included ? roundMillimes(ttc / (1 + rate)) : roundMillimes(ttc));

  const lines = order.items.map(item => ({
    label: item.name,
    quantity: item.quantity,
    unit: ht(item.price),
    total: ht(item.price * item.quantity)
  }));
  if (p.discountAmount) lines.push({ label: `Remise (code ${p.discountCode})`, quantity: 1, unit: -ht(p.discountAmount), total: -ht(p.discountAmount) });
  if (p.shippingCost) lines.push({ label: 'Livraison', quantity: 1, unit: ht(p.shippingCost), total: ht(p.shippingCost) });
  if (p.paymentFee) lines.push({ label: 'Frais de paiement à la livraison', quantity: 1, unit: ht(p.paymentFee), total: ht(p.paymentFee) });

  const stampDuty = p.stampDuty || 0;
  const netToPay = p.totalAmount ?? order.totalAmount;
  const totalTtc = roundMillimes(netToPay - stampDuty);
  // Included: the VAT inside everything but the stamp; added: as charged
  const vat = included ? roundMillimes(totalTtc * rate / (1 + rate)) : roundMillimes(p.taxAmount || 0);
  return { lines, rate, totalHt: roundMillimes(totalTtc - vat), vat, totalTtc, stampDuty, netToPay };
};

const money = (n) => `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/\u202f|\u00a0/g, ' ')}`;
const day = (date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const INK = '#0b1b2b';
const MUTED = '#5b6b7b';
const BRAND = '#0a8091';
const LINE = '#dbe4ee';

// The drop logo, drawn in vectors
const drawLogo = (doc, x, y, size) => {
  const s = size / 40;
  doc.save().translate(x, y).scale(s)
    .path('M20 3c5 6.8 12 14 12 21.2A12 12 0 0 1 8 24.2C8 17 15 9.8 20 3z').fill(BRAND)
    .path('M14 26.5a6 6 0 0 0 6 6').lineWidth(2.2).lineCap('round').stroke('#ffffff')
    .restore();
};

// The invoice (or bon de commande) as a PDF Buffer
const renderInvoicePdf = (order, settings) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: order.invoice?.number ? `Facture ${order.invoice.number}` : `Bon de commande ${order.orderNumber}`, Author: 'STES.tn' } });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const legal = settings.invoice || {};
  const contact = settings.contact || {};
  const isInvoice = Boolean(order.invoice?.number);
  const figures = invoiceFigures(order);
  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  // Seller
  drawLogo(doc, left, 44, 34);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(legal.companyName || 'STES.tn', left + 42, 50);
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
  let y = 76;
  for (const line of [
    legal.address || contact.address,
    legal.taxId && `Matricule fiscal : ${legal.taxId}`,
    legal.tradeRegister && `Registre de commerce : ${legal.tradeRegister}`,
    [contact.phone, contact.email].filter(Boolean).join('  ·  ')
  ].filter(Boolean)) {
    doc.text(line, left, y, { width: 260 });
    y += 12;
  }

  // Document title and references
  doc.font('Helvetica-Bold').fontSize(20).fillColor(BRAND).text(isInvoice ? 'FACTURE' : 'BON DE COMMANDE', left, 48, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(INK);
  const refs = [
    isInvoice && ['N°', order.invoice.number],
    ['Date', day(isInvoice ? order.invoice.issuedAt : order.createdAt)],
    ['Commande', order.orderNumber],
    ['Paiement', PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod]
  ].filter(Boolean);
  let ry = 76;
  for (const [label, value] of refs) {
    doc.fillColor(MUTED).text(`${label} :`, right - 240, ry, { width: 90, align: 'right' });
    doc.fillColor(INK).font('Helvetica-Bold').text(value, right - 145, ry, { width: 145, align: 'right' }).font('Helvetica');
    ry += 13;
  }

  // Customer
  y = Math.max(y, ry) + 18;
  doc.roundedRect(left, y, width, 78, 8).fill('#f3f7fb');
  doc.fillColor(MUTED).fontSize(7.5).text('CLIENT', left + 14, y + 11, { characterSpacing: 1.2 });
  const address = order.customer.address || {};
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(order.customer.company || order.customer.name, left + 14, y + 24, { width: 260 });
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
  let cy = y + 39;
  for (const line of [
    order.customer.company && order.customer.name,
    order.customer.taxId && `Matricule fiscal : ${order.customer.taxId}`,
    [address.street, [address.postalCode, address.city].filter(Boolean).join(' '), address.governorate].filter(Boolean).join(', ')
  ].filter(Boolean)) {
    doc.text(line, left + 14, cy, { width: 300 });
    cy += 11;
  }
  doc.text(order.customer.phone || '', right - 214, y + 24, { width: 200, align: 'right' });
  doc.text(order.customer.email || '', right - 214, y + 36, { width: 200, align: 'right' });

  // Lines
  y += 98;
  const cols = [
    { title: 'Désignation', x: left, w: 250, align: 'left' },
    { title: 'Qté', x: left + 250, w: 40, align: 'right' },
    { title: 'P.U. HT', x: left + 295, w: 75, align: 'right' },
    { title: 'TVA', x: left + 375, w: 45, align: 'right' },
    { title: 'Total HT', x: left + 420, w: width - 420, align: 'right' }
  ];
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
  for (const col of cols) doc.text(col.title.toUpperCase(), col.x, y, { width: col.w, align: col.align, characterSpacing: 0.6 });
  y += 14;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).stroke(INK);
  y += 8;
  doc.font('Helvetica').fontSize(9.5).fillColor(INK);
  for (const line of figures.lines) {
    const height = Math.max(14, doc.heightOfString(line.label, { width: cols[0].w - 8 }));
    if (y + height > doc.page.height - 190) {
      doc.addPage();
      y = 60;
    }
    doc.text(line.label, cols[0].x, y, { width: cols[0].w - 8 });
    doc.text(String(line.quantity), cols[1].x, y, { width: cols[1].w, align: 'right' });
    doc.text(money(line.unit), cols[2].x, y, { width: cols[2].w, align: 'right' });
    doc.text(`${Math.round(figures.rate * 100)} %`, cols[3].x, y, { width: cols[3].w, align: 'right' });
    doc.text(money(line.total), cols[4].x, y, { width: cols[4].w, align: 'right' });
    y += height + 6;
    doc.moveTo(left, y - 3).lineTo(right, y - 3).lineWidth(0.5).stroke(LINE);
  }

  // Totals
  y += 10;
  const boxX = right - 230;
  const rows = [
    ['Total HT', figures.totalHt],
    [`TVA ${Math.round(figures.rate * 100)} %`, figures.vat],
    ['Total TTC', figures.totalTtc],
    ...(figures.stampDuty ? [['Timbre fiscal', figures.stampDuty]] : [])
  ];
  doc.fontSize(9.5);
  for (const [label, value] of rows) {
    doc.fillColor(MUTED).text(label, boxX, y, { width: 120 });
    doc.fillColor(INK).text(`${money(value)} TND`, boxX + 110, y, { width: 120, align: 'right' });
    y += 16;
  }
  doc.roundedRect(boxX - 10, y, right - boxX + 10, 30, 8).fill(BRAND);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
    .text('Net à payer', boxX, y + 10, { width: 120 })
    .text(`${money(figures.netToPay)} TND`, boxX + 100, y + 10, { width: 130, align: 'right' });
  y += 48;

  doc.font('Helvetica').fontSize(9).fillColor(INK)
    .text(`Arrêté${isInvoice ? 'e la présente facture' : ' le présent bon de commande'} à la somme de : `, left, y, { continued: true })
    .font('Helvetica-Bold').text(`${dinarsInWords(figures.netToPay)}.`);

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    isInvoice
      ? `Merci pour votre confiance. ${legal.companyName || 'STES.tn'} · ${[contact.phone, contact.email].filter(Boolean).join(' · ')}`
      : 'Document non fiscal : la facture est émise à la livraison de la commande.',
    left, doc.page.height - 70, { width, align: 'center' }
  );

  doc.end();
});

// PDF for an order and a file name for it
const invoiceDocument = async (order) => {
  const settings = await getSettings();
  const buffer = await renderInvoicePdf(order, settings);
  const filename = order.invoice?.number ? `facture-${order.invoice.number}.pdf` : `bon-de-commande-${order.orderNumber}.pdf`;
  return { buffer, filename };
};

// Sends the PDF as a download
const sendInvoice = async (res, order) => {
  const { buffer, filename } = await invoiceDocument(order);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'private, no-store'
  });
  res.send(buffer);
};

module.exports = { issueInvoice, invoiceFigures, renderInvoicePdf, invoiceDocument, sendInvoice };
