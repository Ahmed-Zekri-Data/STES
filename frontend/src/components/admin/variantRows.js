// Form rows ⇄ what the API stores
export const variantsToForm = (variants = []) => variants.map(v => ({
  sku: v.sku || '',
  label: v.label || '',
  price: v.price === null || v.price === undefined ? '' : String(v.price),
  stockQuantity: String(v.stockQuantity ?? 0)
}));

export const variantsFromForm = (rows) => rows.map(v => ({
  sku: v.sku.trim(),
  label: v.label.trim(),
  price: v.price === '' ? null : Number(v.price),
  stockQuantity: Number.parseInt(v.stockQuantity, 10) || 0
}));
