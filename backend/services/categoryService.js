const Category = require('../models/Category');
const Product = require('../models/Product');
const { productCategories } = require('../config/productCategories');

// Categories are managed in the admin (Category collection). Products store
// their category's slug. config/productCategories.js now only provides the
// starting set, and the subcategories used by the shop's filters.

// The categories the shop started with, keyed by slug
const defaultCategories = () => Object.entries(productCategories).map(([slug, category], index) => ({
  slug,
  name: category.name,
  nameEn: category.nameEn,
  icon: category.icon,
  description: category.description,
  sortOrder: index,
  isActive: true
}));

const insertMissing = async (categories) => {
  const existing = new Set(await Category.distinct('slug', { slug: { $in: categories.map(c => c.slug) } }));
  const missing = categories.filter(c => !existing.has(c.slug));
  for (const category of missing) {
    try {
      await Category.create(category);
    } catch (error) {
      // Created meanwhile by another process: fine
      if (error.code !== 11000) throw error;
    }
  }
  return missing.map(c => c.slug);
};

// Creates the default categories that do not exist yet. Used by the seed.
const createDefaultCategories = () => insertMissing(defaultCategories());

// Makes sure every category a product uses exists, so shops that already
// have products keep their categories after upgrading. Only categories in
// use are created: one an admin deleted (possible only when it had no
// products) does not come back.
const ensureProductCategoriesExist = async () => {
  const used = (await Product.distinct('category')).filter(Boolean);
  const defaults = new Map(defaultCategories().map(c => [c.slug, c]));
  return insertMissing(used.map(slug => defaults.get(slug) || { slug, name: slug, nameEn: slug }));
};

const categoryExists = async (slug) => Boolean(await Category.exists({ slug: String(slug).toLowerCase() }));

// A category and the categories under it, for filtering products
const slugsWithin = async (slug) => {
  const category = await Category.findOne({ slug: String(slug).toLowerCase() }).select('_id slug').lean();
  if (!category) return [String(slug).toLowerCase()];
  const children = await Category.find({ parentCategory: category._id }).select('slug').lean();
  return [category.slug, ...children.map(c => c.slug)];
};

// French name of every category by slug, for labelling products
const categoryNames = async () => {
  const categories = await Category.find().select('slug name').lean();
  return new Map(categories.map(c => [c.slug, c.name]));
};

// What the shop shows: active top-level categories in admin order, keyed by
// slug, with the subcategories products can be filtered by
const shopCategories = async () => {
  const categories = await Category.find({ isActive: true, parentCategory: null })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return Object.fromEntries(categories.map(category => [category.slug, {
    name: category.name,
    nameEn: category.nameEn,
    nameAr: category.nameAr,
    icon: category.icon,
    description: category.description,
    subcategories: productCategories[category.slug]?.subcategories || {}
  }]));
};

module.exports = {
  createDefaultCategories,
  ensureProductCategoriesExist,
  categoryExists,
  slugsWithin,
  categoryNames,
  shopCategories
};
