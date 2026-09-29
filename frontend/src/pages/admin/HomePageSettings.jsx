import React, { useEffect, useMemo, useState } from 'react';
import { Save, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';

// Admin → Settings → Home page: which products the home page sells where.
// Anything left empty stays hidden on the home page.

const HOTSPOTS = [
  ['pump', 'Pump', 'In the equipment cabinet in the garden'],
  ['filter', 'Filter', 'In the equipment cabinet in the garden'],
  ['robot', 'Pool robot', 'Cleaning the pool floor (seen underwater)'],
  ['lights', 'Pool light', 'The LED lights in the pool walls (seen underwater)'],
  ['ring', 'Float', 'The ring floating on the water']
];
const PROBLEMS = [
  ['green', 'Green water'],
  ['cloudy', 'Cloudy water'],
  ['dirty', 'Dirty pool floor'],
  ['cold', 'Water too cold']
];
const EMPTY = {
  hotspots: { pump: null, filter: null, robot: null, lights: null, ring: null },
  problems: { green: [], cloudy: [], dirty: [], cold: [] },
  sizes: [], lights: null, options: [], packs: [], showMap: true, partnerBadge: ''
};

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl bg-surface focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

const Section = ({ title, description, children }) => (
  <section className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

// Every product, 100 at a time (the admin list when allowed, else the shop's)
const loadAllProducts = async (canManageProducts) => {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const response = canManageProducts
      ? await adminApi.get('/admin/products', { params: { page, limit: 100, sort: 'name' } })
      : await adminApi.get('/products', { params: { page, limit: 100, sortBy: 'name', sortOrder: 'asc' } });
    const list = response.data.products || [];
    all.push(...list);
    const pages = response.data.pagination?.totalPages || response.data.pagination?.pages || 1;
    if (page >= pages || !list.length) break;
  }
  return all.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

const label = (product) => `${product.name} · ${product.price} TND${product.stockQuantity === 0 ? ' (out of stock)' : ''}`;

const ProductSelect = ({ id, value, onChange, products, placeholder = 'None' }) => (
  <select id={id} className={inputClass} value={value || ''} onChange={(event) => onChange(event.target.value || null)}>
    <option value="">{placeholder}</option>
    {products.map(product => <option key={product._id} value={product._id}>{label(product)}</option>)}
    {value && !products.some(p => p._id === value) && <option value={value}>A deleted product</option>}
  </select>
);

// A short list of products: the chosen ones with a remove button, and a
// menu to add another
const ProductList = ({ id, value, onChange, products, max }) => {
  const byId = useMemo(() => new Map(products.map(p => [p._id, p])), [products]);
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map(productId => (
            <li key={productId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
              <span>{byId.get(productId) ? label(byId.get(productId)) : 'A deleted product'}</span>
              <button type="button" onClick={() => onChange(value.filter(v => v !== productId))} className="text-gray-500 hover:text-red-600" aria-label={`Remove ${byId.get(productId)?.name || 'this product'}`}>
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <select id={id} className={inputClass} value="" onChange={(event) => event.target.value && onChange([...value, event.target.value])}>
          <option value="">Add a product…</option>
          {products.filter(p => !value.includes(p._id)).map(product => <option key={product._id} value={product._id}>{label(product)}</option>)}
        </select>
      )}
    </div>
  );
};

const Labelled = ({ htmlFor, title, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{title}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

// Ids as strings (the API returns them as strings already; new picks too)
const normalise = (showcase) => ({ ...EMPTY, ...showcase, hotspots: { ...EMPTY.hotspots, ...showcase?.hotspots }, problems: { ...EMPTY.problems, ...showcase?.problems } });

const HomePageSettings = () => {
  const { hasPermission } = useAdmin();
  const [showcase, setShowcase] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const canManageProducts = hasPermission('products');

  useEffect(() => {
    Promise.all([adminApi.get('/admin/settings'), loadAllProducts(canManageProducts)])
      .then(([settings, list]) => { setShowcase(normalise(settings.data.showcase)); setProducts(list); })
      .catch(error => setLoadError(errorMessage(error)));
  }, [canManageProducts]);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the home page settings: {loadError}</p>;
  if (!showcase) return <p className="text-gray-600">Loading…</p>;

  const set = (changes) => setShowcase(current => ({ ...current, ...changes }));
  const setSize = (index, changes) => set({ sizes: showcase.sizes.map((s, i) => (i === index ? { ...s, ...changes } : s)) });
  const setPack = (index, changes) => set({ packs: showcase.packs.map((p, i) => (i === index ? { ...p, ...changes } : p)) });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await adminApi.put('/admin/settings', { showcase });
      setShowcase(normalise(response.data.settings.showcase));
      setResult({ ok: true, message: 'Home page saved' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Section title="Equipment in the 3D garden and pool" description="Visitors click a + on these objects to see the product and add it to their cart. Leave empty to show no + on that object.">
        <div className="grid gap-4 sm:grid-cols-2">
          {HOTSPOTS.map(([key, title, hint]) => (
            <Labelled key={key} htmlFor={`hotspot-${key}`} title={title} hint={hint}>
              <ProductSelect id={`hotspot-${key}`} value={showcase.hotspots[key]} products={products} onChange={(value) => set({ hotspots: { ...showcase.hotspots, [key]: value } })} />
            </Labelled>
          ))}
        </div>
      </Section>

      <Section title="Water diagnostic" description={'"My water has a problem": for each problem, the products that solve it (up to 6). Problems with no products are not offered.'}>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map(([key, title]) => (
            <Labelled key={key} htmlFor={`problem-${key}`} title={title}>
              <ProductList id={`problem-${key}`} value={showcase.problems[key]} products={products} max={6} onChange={(value) => set({ problems: { ...showcase.problems, [key]: value } })} />
            </Labelled>
          ))}
        </div>
      </Section>

      <Section title="Pool configurator" description="Visitors choose a pool size and get its pump and filter, the lights and options, with the kit's price. The section is hidden until one size has a pump or a filter.">
        {showcase.sizes.map((size, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[140px_1fr_1fr_auto] items-end p-3 rounded-xl bg-gray-50">
            <Labelled htmlFor={`size-${index}`} title="Pool size">
              <input id={`size-${index}`} className={inputClass} value={size.label} maxLength={20} placeholder="8 × 4 m" onChange={(event) => setSize(index, { label: event.target.value })} required />
            </Labelled>
            <Labelled htmlFor={`size-${index}-pump`} title="Pump">
              <ProductSelect id={`size-${index}-pump`} value={size.pump} products={products} onChange={(value) => setSize(index, { pump: value })} />
            </Labelled>
            <Labelled htmlFor={`size-${index}-filter`} title="Filter">
              <ProductSelect id={`size-${index}-filter`} value={size.filter} products={products} onChange={(value) => setSize(index, { filter: value })} />
            </Labelled>
            <button type="button" onClick={() => set({ sizes: showcase.sizes.filter((_, i) => i !== index) })} className="p-2.5 text-gray-500 hover:text-red-600" aria-label={`Remove the ${size.label || 'new'} size`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {showcase.sizes.length < 4 && (
          <button type="button" onClick={() => set({ sizes: [...showcase.sizes, { label: '', pump: null, filter: null }] })} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
            <Plus className="w-4 h-4" /> Add a pool size
          </button>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled htmlFor="config-lights" title="LED light" hint="Two are added to the kit when the visitor chooses a light colour">
            <ProductSelect id="config-lights" value={showcase.lights} products={products} onChange={(value) => set({ lights: value })} />
          </Labelled>
          <Labelled htmlFor="config-options" title="Options (up to 4)" hint="For example a robot, a heat pump, a cover">
            <ProductList id="config-options" value={showcase.options} products={products} max={4} onChange={(value) => set({ options: value })} />
          </Labelled>
        </div>
      </Section>

      <Section title="Seasonal packs" description="A pack is a product of its own (create it in Products with the pack price). Here, choose it and the products it contains: the home page lists them and shows the saving against buying them one by one.">
        {showcase.packs.map((pack, index) => (
          <div key={index} className="space-y-3 p-3 rounded-xl bg-gray-50">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] items-end">
              <Labelled htmlFor={`pack-${index}`} title="Pack (the product sold)">
                <ProductSelect id={`pack-${index}`} value={pack.product} products={products} placeholder="Choose the pack…" onChange={(value) => setPack(index, { product: value })} />
              </Labelled>
              <Labelled htmlFor={`pack-${index}-season`} title="Season label">
                <input id={`pack-${index}-season`} className={inputClass} value={pack.season || ''} maxLength={30} placeholder="Avril – mai" onChange={(event) => setPack(index, { season: event.target.value })} />
              </Labelled>
              <button type="button" onClick={() => set({ packs: showcase.packs.filter((_, i) => i !== index) })} className="p-2.5 text-gray-500 hover:text-red-600" aria-label="Remove this pack">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Labelled htmlFor={`pack-${index}-includes`} title="What it contains (up to 8)">
              <ProductList id={`pack-${index}-includes`} value={pack.includes || []} products={products} max={8} onChange={(value) => setPack(index, { includes: value })} />
            </Labelled>
          </div>
        ))}
        {showcase.packs.length < 3 && (
          <button type="button" onClick={() => set({ packs: [...showcase.packs, { product: null, season: '', includes: [] }] })} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
            <Plus className="w-4 h-4" /> Add a pack
          </button>
        )}
      </Section>

      <Section title="Trust" description="The best recent reviews (4 or 5 stars) are shown automatically.">
        <label className="flex items-center gap-3 text-sm text-gray-800">
          <input type="checkbox" checked={showcase.showMap} onChange={(event) => set({ showMap: event.target.checked })} className="w-4 h-4" />
          Show the map of Tunisia with the number of orders in each governorate
        </label>
        <Labelled htmlFor="partner-badge" title="Partner badge" hint={'For example "Partenaire agréé AstralPool". Use your official wording; leave empty to hide it.'}>
          <input id="partner-badge" className={inputClass} value={showcase.partnerBadge} maxLength={60} onChange={(event) => set({ partnerBadge: event.target.value })} />
        </Labelled>
      </Section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save the home page'}
        </button>
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

export default HomePageSettings;
