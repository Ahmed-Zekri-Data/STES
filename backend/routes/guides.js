const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { auth, checkPermission } = require('../middleware/auth');
const Guide = require('../models/Guide');
const Product = require('../models/Product');
const { THEMES } = require('../models/Guide');
const { cleanPageHtml } = require('../utils/html');
const { slugify, isImageLocation } = require('../utils/text');
const { isProductRef, productIdsOf } = require('../utils/productOffer');
const { readingMinutes } = require('../utils/reading');
const { categoryNames } = require('../services/categoryService');

const invalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  return true;
};

const listItem = (guide) => ({
  slug: guide.slug,
  title: guide.title,
  summary: guide.summary,
  theme: guide.theme,
  image: guide.image || null,
  readingMinutes: readingMinutes(guide.body),
  publishedAt: guide.publishedAt,
  updatedAt: guide.updatedAt
});

// /api/guides - the published guides
const publicRouter = express.Router();

publicRouter.get('/', query('theme').optional().isIn(THEMES).withMessage('Thème inconnu'), async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const guides = await Guide.find({ published: true, ...(req.query.theme && { theme: req.query.theme }) })
      .sort({ publishedAt: -1 }).lean();
    res.json({ guides: guides.map(listItem) });
  } catch (error) {
    console.error('Error loading guides:', error);
    res.status(500).json({ message: 'Erreur lors du chargement des conseils' });
  }
});

// One guide, with its recommended products as they are today, and up to
// three other guides of the same theme
publicRouter.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const guide = /^[a-z0-9-]{1,80}$/.test(slug) && await Guide.findOne({ slug, published: true }).lean();
    if (!guide) return res.status(404).json({ message: 'Ce conseil n’existe pas ou n’est plus en ligne.' });
    const ids = [...new Set(productIdsOf(guide.products || []))];
    const [products, related, names] = await Promise.all([
      ids.length ? Product.find({ _id: { $in: ids } }).select('-reviews').lean() : [],
      Guide.find({ published: true, theme: guide.theme, _id: { $ne: guide._id } }).sort({ publishedAt: -1 }).limit(3).lean(),
      categoryNames()
    ]);
    // As on the shop's lists: the category's name, not its address
    const byId = new Map(products.map(p => [String(p._id), { ...p, categoryName: names.get(p.category) || p.category }]));
    res.json({
      guide: { ...listItem(guide), body: guide.body },
      products: ids.map(id => byId.get(id)).filter(Boolean),
      related: related.map(listItem)
    });
  } catch (error) {
    console.error('Error loading a guide:', error);
    res.status(500).json({ message: 'Erreur lors du chargement du conseil' });
  }
});

// /api/admin/guides - Admin → Guides
const adminRouter = express.Router();
adminRouter.use(auth, checkPermission('settings'));

adminRouter.get('/', async (req, res) => {
  try {
    const guides = await Guide.find().sort({ updatedAt: -1 }).lean();
    res.json({ guides: guides.map(guide => ({ ...guide, readingMinutes: readingMinutes(guide.body) })) });
  } catch (error) {
    console.error('Error loading guides:', error);
    res.status(500).json({ message: 'Error loading guides' });
  }
});

const rules = [
  body('title').isString().trim().isLength({ min: 5, max: 110 }).withMessage('The title is 5 to 110 characters'),
  // Empty: made from the title
  body('slug').optional({ values: 'falsy' }).isString().trim().toLowerCase()
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/).withMessage('The address is lowercase letters, digits and dashes, for example eau-verte-piscine')
    .isLength({ max: 80 }).withMessage('The address is up to 80 characters'),
  body('summary').isString().trim().isLength({ min: 30, max: 160 }).withMessage('The summary is 30 to 160 characters (Google shows about 155)'),
  body('theme').isIn(THEMES).withMessage('Choose a theme'),
  body('image').optional({ values: 'falsy' }).custom(isImageLocation).withMessage('The image must be an https address or an uploaded image'),
  body('body').isString().withMessage('Write the text of the guide').customSanitizer(value => cleanPageHtml(value))
    .custom(value => value.replace(/<[^>]+>/g, ' ').trim().length >= 200).withMessage('The text is too short (at least 200 characters)'),
  body('products').optional().isArray({ max: 6 }).withMessage('Up to 6 products')
    .custom(list => list.every(isProductRef)).withMessage('Choose products from the list'),
  body('published').optional().isBoolean().toBoolean()
];

const fieldsOf = (req) => {
  const { title, summary, theme, image, body: html, products = [], published = false } = req.body;
  return { title, slug: req.body.slug || slugify(title), summary, theme, image: image || undefined, body: html, products, published };
};

const saveError = (res, error) => {
  if (error.code === 11000) return res.status(409).json({ message: 'Another guide already uses this address' });
  console.error('Error saving a guide:', error);
  return res.status(500).json({ message: 'Error saving the guide' });
};

adminRouter.post('/', rules, async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const fields = fieldsOf(req);
    if (!fields.slug) return res.status(400).json({ message: 'Give the guide an address (letters and digits)' });
    const guide = await Guide.create({ ...fields, ...(fields.published && { publishedAt: new Date() }) });
    res.status(201).json({ guide });
  } catch (error) {
    saveError(res, error);
  }
});

adminRouter.put('/:id', param('id').isMongoId().withMessage('Unknown guide'), rules, async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const guide = await Guide.findById(req.params.id);
    if (!guide) return res.status(404).json({ message: 'This guide no longer exists' });
    const fields = fieldsOf(req);
    if (!fields.slug) return res.status(400).json({ message: 'Give the guide an address (letters and digits)' });
    // The first publication dates the guide; later edits keep that date
    if (fields.published && !guide.publishedAt) guide.publishedAt = new Date();
    guide.set(fields);
    if (!fields.image) guide.image = undefined;
    await guide.save();
    res.json({ guide });
  } catch (error) {
    saveError(res, error);
  }
});

adminRouter.delete('/:id', param('id').isMongoId().withMessage('Unknown guide'), async (req, res) => {
  try {
    if (invalid(req, res)) return;
    const removed = await Guide.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'This guide no longer exists' });
    res.json({ message: 'Guide deleted' });
  } catch (error) {
    console.error('Error deleting a guide:', error);
    res.status(500).json({ message: 'Error deleting the guide' });
  }
});

module.exports = { publicRouter, adminRouter };
