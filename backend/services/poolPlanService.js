const mongoose = require('mongoose');
const Product = require('../models/Product');
const { getSettings } = require('./settingsService');
const { categoryNames } = require('./categoryService');
const { roundMillimes } = require('../utils/checkout');

// "Construire ma piscine": the pool a visitor draws, its size and water,
// the equipment placed around it (Admin → Settings → Pool builder) and the
// construction estimate. The shop page shows the same figures
// (frontend/src/components/builder/plan.js): keep the two in step.

const SHAPES = ['rectangle', 'rounded', 'oval'];
const KINDS = ['pump', 'filter', 'heat', 'light', 'robot', 'ladder', 'shower', 'cover', 'other'];
const LIMITS = { length: [2, 20], width: [2, 12], depth: [0.8, 3] };

// Water surface (m²): corners of a rounded pool are quarter circles of a
// quarter of its width
const surfaceOf = (shape, length, width) => {
  if (shape === 'oval') return (Math.PI / 4) * length * width;
  if (shape === 'rounded') {
    const r = Math.min(length, width) * 0.25;
    return length * width - (4 - Math.PI) * r * r;
  }
  return length * width;
};

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

// The whole water goes through the filter in 4 hours
const TURNOVER_HOURS = 4;

// The builder's products, with current price and stock (deleted ones skipped)
const getBuilder = async () => {
  const { builder } = await getSettings();
  const ids = builder.equipment.map(item => item.product).filter(Boolean);
  const [products, names] = await Promise.all([
    Product.find({ _id: { $in: ids } }).select('name price image category inStock stockQuantity').lean(),
    categoryNames()
  ]);
  const byId = new Map(products.map(p => [String(p._id), p]));
  const equipment = builder.equipment
    .map(({ product, kind }) => {
      const p = byId.get(String(product));
      if (!p) return null;
      return {
        kind,
        product: {
          _id: String(p._id), name: p.name, price: p.price, image: p.image, category: p.category,
          categoryName: names.get(p.category) || p.category,
          inStock: p.inStock !== false && (p.stockQuantity ?? 0) > 0
        }
      };
    })
    .filter(Boolean);
  const { pricePerM2Min: min, pricePerM2Max: max } = builder;
  return { equipment, pricePerM2: min > 0 && max >= min ? { min, max } : null };
};

// A plan sent with a quote request, checked and priced from the database:
// the visitor chooses sizes and equipment, never names or prices
const pricePlan = async (plan) => {
  const shape = SHAPES.includes(plan.shape) ? plan.shape : 'rectangle';
  const clamp = (value, [lo, hi]) => Math.min(hi, Math.max(lo, Number(value) || lo));
  const length = round(clamp(plan.length, LIMITS.length));
  const width = round(clamp(plan.width, LIMITS.width));
  const depth = round(clamp(plan.depth, LIMITS.depth));
  const surface = round(surfaceOf(shape, length, width));
  const volume = round(surface * depth);

  const { builder } = await getSettings();
  const offered = new Set(builder.equipment.map(item => String(item.product)));
  const quantities = new Map();
  for (const item of Array.isArray(plan.items) ? plan.items.slice(0, 40) : []) {
    const id = String(item?.product || '');
    if (!mongoose.isValidObjectId(id) || !offered.has(id)) continue;
    quantities.set(id, Math.min(20, (quantities.get(id) || 0) + Math.max(1, Math.floor(Number(item.quantity) || 1))));
  }
  const products = await Product.find({ _id: { $in: [...quantities.keys()] } }).select('name price').lean();
  const equipment = products.map(p => ({
    product: p._id,
    name: p.name,
    price: p.price,
    quantity: quantities.get(String(p._id))
  }));
  const equipmentTotal = roundMillimes(equipment.reduce((sum, line) => sum + line.price * line.quantity, 0));

  const { pricePerM2Min: min, pricePerM2Max: max } = builder;
  const estimate = min > 0 && max >= min ? { min: Math.round(surface * min), max: Math.round(surface * max) } : undefined;

  return {
    shape, length, width, depth, surface, volume,
    flow: round(volume / TURNOVER_HOURS),
    equipment,
    equipmentTotal,
    ...(estimate && { estimate })
  };
};

const SHAPE_NAMES = { rectangle: 'rectangulaire', rounded: 'aux angles arrondis', oval: 'ovale' };

// "Piscine rectangulaire 8 × 4 m, 1,4 m de profondeur (32 m², 44,8 m³)"
const describePlan = (plan) => {
  const n = (value) => String(value).replace('.', ',');
  return `Piscine ${SHAPE_NAMES[plan.shape] || plan.shape} ${n(plan.length)} × ${n(plan.width)} m, ${n(plan.depth)} m de profondeur (${n(plan.surface)} m², ${n(plan.volume)} m³)`;
};

module.exports = { SHAPES, KINDS, LIMITS, surfaceOf, getBuilder, pricePlan, describePlan };
