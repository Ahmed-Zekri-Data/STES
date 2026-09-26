const Brand = require('../models/Brand');
const Product = require('../models/Product');
const { exactly } = require('../utils/text');

// Brands are managed in the admin (Brand collection). Products store their
// brand's name, compared without regard to upper and lower case.

// The brand with this name, as spelled in the admin (null if none)
const findBrand = (name) => Brand.findOne({ name: exactly(name) }).lean();

// Makes sure every brand a product uses exists, so shops that already have
// products with brands see them in the admin and the shop filter after
// upgrading. Names differing only in case count as one brand.
const ensureProductBrandsExist = async () => {
  const used = (await Product.distinct('brand')).map(name => (name || '').trim()).filter(Boolean);
  const created = [];
  for (const name of used) {
    if (await findBrand(name)) continue;
    try {
      await Brand.create({ name });
      created.push(name);
    } catch (error) {
      // Created meanwhile, or another spelling of it just created: fine
      if (error.code !== 11000) throw error;
    }
  }
  return created;
};

// The brands the shop offers as filters: active ones that at least one
// product uses, in admin order
const shopBrands = async () => {
  const used = new Set((await Product.distinct('brand')).map(name => String(name || '').trim().toLowerCase()));
  const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).select('name').lean();
  return brands.map(brand => brand.name).filter(name => used.has(name.toLowerCase()));
};

// Product counts by brand, for the admin list
const productCountsByBrand = async (names) => {
  const counts = await Product.aggregate([
    { $match: { brand: { $in: names.map(exactly) } } },
    { $group: { _id: { $toLower: '$brand' }, count: { $sum: 1 } } }
  ]);
  return new Map(counts.map(c => [c._id, c.count]));
};

module.exports = { findBrand, ensureProductBrandsExist, shopBrands, productCountsByBrand };
