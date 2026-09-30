const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { slugify, exactly } = require('../utils/text');

// Admin → Products → Import: rows of a spreadsheet (one per maker's code)
// become products. Rows with the same category and product name are the
// versions of one product. A code already in the shop updates that product
// (prices, stock, version names, new versions) and leaves its name, text,
// category and photo as edited in the admin, unless `texts` is asked for.
//
// Price empty: price on request. Stock empty: a new product is sold on
// order ("sur commande"); an existing one keeps its stock. Rows with an
// error are left out and listed; the rest is imported.

const MAX_ROWS = 10000;

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const cut = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// A number typed in a cell: 1290, "1 290", "1290,500" (French decimals),
// "1,290.50". Empty is null; anything else NaN.
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const text = String(value).replace(/[\s\u00a0\u202f]/g, '').replace(/(TND|DT)$/i, '');
  if (!text) return null;
  if (/^\d+(,\d+)?$/.test(text)) return Number(text.replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return Number(text.replace(/,/g, ''));
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
};

const unaccented = (text) => clean(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Checks each row and keeps what the import needs
const readRows = (rawRows) => {
  const rows = [];
  const errors = [];
  const seen = new Set();
  let skipped = 0;
  for (const [index, raw] of rawRows.entries()) {
    const row = Number(raw?.row) || index + 2;
    const code = clean(raw?.code);
    if (!code) {
      if (Object.values(raw || {}).some(v => clean(v) && v !== raw.row)) errors.push({ row, message: 'No product code' });
      continue;
    }
    if (code.length > 40) { errors.push({ row, message: `Code ${code.slice(0, 20)}… is too long (up to 40 characters)` }); continue; }
    if (seen.has(code)) { errors.push({ row, message: `Code ${code} is already on another row` }); continue; }
    seen.add(code);
    if (/^(non|no|n)$/i.test(clean(raw.sell))) { skipped++; continue; }

    const name = clean(raw.product) || clean(raw.subfamily);
    if (!name) { errors.push({ row, message: `No product name for code ${code}` }); continue; }
    const price = parseNumber(raw.price);
    if (Number.isNaN(price) || price < 0) { errors.push({ row, message: `The price of ${code} must be a number in TND, or empty for a price on request` }); continue; }
    const stock = parseNumber(raw.stock);
    if (Number.isNaN(stock) || stock < 0 || (stock !== null && !Number.isInteger(stock))) { errors.push({ row, message: `The stock of ${code} must be a whole number, or empty` }); continue; }

    rows.push({
      row,
      code,
      name,
      category: clean(raw.category) || clean(raw.family) || 'Autres',
      subfamily: clean(raw.subfamily),
      label: clean(raw.model) || name,
      price,
      stock,
      description: clean(raw.description)
    });
  }
  return { rows, errors, skipped };
};

// Rows of the same category and product name are one product's versions
const groupRows = (rows) => {
  const groups = new Map();
  for (const row of rows) {
    const key = `${unaccented(row.category)}|${unaccented(row.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()];
};

// The category of each name in the file: an existing one (by French or
// English name, or slug), or a new one
const resolveCategories = async (names, dryRun) => {
  const categories = await Category.find().select('slug name nameEn').lean();
  const known = new Map();
  for (const c of categories) {
    for (const key of [c.slug, c.name, c.nameEn].filter(Boolean)) known.set(unaccented(key), c.slug);
  }
  const bySlug = new Map();
  const created = [];
  // New categories come after the shop's own
  let sortOrder = Math.max(0, ...(await Category.find().select('sortOrder').lean()).map(c => c.sortOrder || 0));
  for (const name of new Set(names)) {
    let slug = known.get(unaccented(name)) || known.get(slugify(name));
    if (!slug) {
      slug = slugify(name) || 'autres';
      if (!dryRun) {
        try {
          await Category.create({ name, nameEn: name, slug, sortOrder: ++sortOrder });
        } catch (error) {
          if (error.code !== 11000) throw error;
        }
      }
      created.push(name);
      known.set(unaccented(name), slug);
    }
    bySlug.set(name, slug);
  }
  return { slugOf: (name) => bySlug.get(name), created };
};

const ensureBrand = async (name, dryRun) => {
  if (!name) return '';
  const existing = await Brand.findOne({ name: exactly(name) }).lean();
  if (existing) return existing.name;
  if (!dryRun) {
    try {
      await Brand.create({ name });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  return name;
};

const variantOf = (row) => ({ sku: row.code, label: cut(row.label, 120), price: row.price, stockQuantity: row.stock ?? 0 });

// Applies a group's rows to a product already in the shop. Returns how many
// versions were added and prices changed.
const updateProduct = (product, group) => {
  let added = 0;
  let priceChanges = 0;
  const simple = !product.variants?.length;
  if (simple && group.length === 1 && group[0].code === product.sku) {
    const [row] = group;
    const onRequest = row.price === null;
    if (onRequest !== Boolean(product.priceOnRequest) || (!onRequest && row.price !== product.price)) priceChanges++;
    product.priceOnRequest = onRequest;
    product.price = row.price ?? 0;
    if (row.stock !== null) {
      product.stockQuantity = row.stock;
      product.inStock = row.stock > 0;
    }
    return { added, priceChanges };
  }
  if (simple) {
    // A single product that now has versions: it becomes the first one
    product.variants = [{ sku: product.sku || group[0].code, label: product.name, price: product.priceOnRequest ? null : product.price, stockQuantity: product.stockQuantity || 0 }];
    product.sku = undefined;
  }
  for (const row of group) {
    const version = product.variants.find(v => v.sku === row.code);
    if (!version) {
      product.variants.push(variantOf(row));
      added++;
      continue;
    }
    if ((version.price ?? null) !== row.price) priceChanges++;
    version.label = cut(row.label, 120);
    version.price = row.price;
    if (row.stock !== null) version.stockQuantity = row.stock;
  }
  return { added, priceChanges };
};

// With "update names and texts": the product's name, description and
// sub-family take the file's (e.g. after translating or correcting them)
const updateTexts = (product, group) => {
  const [first] = group;
  const description = group.find(r => r.description)?.description;
  const state = () => [product.name, product.description, product.subcategory, (product.tags || []).join('|')].join('\n');
  const before = state();
  product.name = cut(first.name, 100);
  if (description) product.description = cut(description, 1000);
  if (first.subfamily) {
    product.subcategory = cut(first.subfamily, 100);
    product.tags = [cut(first.subfamily, 60)];
  }
  return before !== state();
};

const newProduct = (group, { category, brand }) => {
  const [first] = group;
  const description = group.find(r => r.description)?.description || first.name;
  const fields = {
    name: cut(first.name, 100),
    description: cut(description, 1000),
    category,
    brand,
    subcategory: first.subfamily ? cut(first.subfamily, 100) : undefined,
    tags: first.subfamily ? [cut(first.subfamily, 60)] : [],
    // Stock left empty: sold on order
    backorder: group.some(r => r.stock === null)
  };
  if (group.length === 1 && unaccented(first.label) === unaccented(first.name)) {
    return new Product({
      ...fields,
      sku: first.code,
      price: first.price ?? 0,
      priceOnRequest: first.price === null,
      stockQuantity: first.stock ?? 0,
      inStock: (first.stock ?? 0) > 0
    });
  }
  return new Product({ ...fields, price: 0, variants: group.map(variantOf) });
};

// dryRun: works everything out and reports it, without saving
const importProducts = async (rawRows, { dryRun = true, brand = '', texts = false } = {}) => {
  if (!Array.isArray(rawRows) || rawRows.length === 0) throw Object.assign(new Error('The file has no rows'), { status: 400 });
  if (rawRows.length > MAX_ROWS) throw Object.assign(new Error(`Up to ${MAX_ROWS} rows at a time`), { status: 400 });

  const { rows, errors, skipped } = readRows(rawRows);
  const groups = groupRows(rows);

  const codes = rows.map(r => r.code);
  const existing = codes.length
    ? await Product.find({ $or: [{ 'variants.sku': { $in: codes } }, { sku: { $in: codes } }] })
    : [];
  const productOfCode = new Map();
  for (const product of existing) {
    if (product.sku) productOfCode.set(product.sku, product);
    for (const v of product.variants || []) productOfCode.set(v.sku, product);
  }

  const { slugOf, created: newCategories } = await resolveCategories(groups.map(g => g[0].category), dryRun);
  const brandName = await ensureBrand(clean(brand), dryRun);

  const toCreate = [];
  const toUpdate = new Set();
  let versionsAdded = 0;
  let priceChanges = 0;
  let textChanges = 0;
  for (const group of groups) {
    const product = group.map(r => productOfCode.get(r.code)).find(Boolean);
    if (product) {
      const result = updateProduct(product, group);
      versionsAdded += result.added;
      priceChanges += result.priceChanges;
      if (texts && updateTexts(product, group)) textChanges++;
      toUpdate.add(product);
    } else {
      toCreate.push(newProduct(group, { category: slugOf(group[0].category), brand: brandName }));
    }
  }

  // Check every product as it would be saved; one that fails is left out
  // (and listed), the others are imported
  const valid = async (product) => {
    try {
      await product.validate();
      return true;
    } catch (error) {
      errors.push({ row: null, message: `${product.name}: ${Object.values(error.errors || {})[0]?.message || error.message}` });
      return false;
    }
  };
  const creating = [];
  for (const product of toCreate) if (await valid(product)) creating.push(product);
  const updating = [];
  for (const product of toUpdate) if (await valid(product)) updating.push(product);

  if (!dryRun) {
    if (creating.length) await Product.insertMany(creating);
    for (const product of updating) await product.save();
  }

  return {
    dryRun,
    saved: !dryRun,
    rows: rawRows.length,
    skipped,
    created: creating.length,
    updated: updating.length,
    versions: rows.length,
    versionsAdded,
    priceChanges,
    textChanges,
    onRequest: rows.filter(r => r.price === null).length,
    newCategories,
    errors: errors.slice(0, 200),
    errorCount: errors.length,
    sample: creating.slice(0, 5).map(p => ({ name: p.name, versions: p.variants.length, price: p.priceOnRequest ? null : p.price }))
  };
};

module.exports = { importProducts, parseNumber, MAX_ROWS };
