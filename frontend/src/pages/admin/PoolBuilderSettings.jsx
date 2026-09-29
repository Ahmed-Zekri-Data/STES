import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, Plus, Trash2, ExternalLink } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { loadAllProducts } from '../../utils/adminProducts';
import { Section, ProductSelect, Labelled, inputClass } from '../../components/admin/ProductPickers';

// Admin → Settings → Pool builder: what visitors can place around the pool
// they draw on /construire, and the construction price per m²
const KIND_OPTIONS = [
  ['pump', 'Pump'], ['filter', 'Filter'], ['heat', 'Heat pump'], ['light', 'Pool light'], ['robot', 'Pool robot'],
  ['ladder', 'Ladder'], ['shower', 'Shower'], ['cover', 'Cover'], ['other', 'Other']
];
const EMPTY = { equipment: [], pricePerM2Min: 0, pricePerM2Max: 0 };

const PoolBuilderSettings = () => {
  const { hasPermission } = useAdmin();
  const [builder, setBuilder] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const canManageProducts = hasPermission('products');

  useEffect(() => {
    Promise.all([adminApi.get('/admin/settings'), loadAllProducts(canManageProducts)])
      .then(([settings, list]) => { setBuilder({ ...EMPTY, ...settings.data.builder }); setProducts(list); })
      .catch(error => setLoadError(errorMessage(error)));
  }, [canManageProducts]);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the pool builder settings: {loadError}</p>;
  if (!builder) return <p className="text-gray-600">Loading…</p>;

  const setItem = (index, changes) => setBuilder(b => ({ ...b, equipment: b.equipment.map((e, i) => (i === index ? { ...e, ...changes } : e)) }));
  const price = (field) => (event) => setBuilder(b => ({ ...b, [field]: event.target.value === '' ? 0 : Number(event.target.value) }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await adminApi.put('/admin/settings', { builder: { ...builder, equipment: builder.equipment.filter(e => e.product) } });
      setBuilder({ ...EMPTY, ...response.data.settings.builder });
      setResult({ ok: true, message: 'Pool builder saved' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm text-gray-600">
        Visitors draw their pool on <a href="/construire" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">the pool builder <ExternalLink className="w-3.5 h-3.5" /></a>, place equipment around it and send it with a quote request (it appears in Forms, with the plan).
      </p>

      <Section title="Equipment visitors can place" description="Up to 12 products. The drawing shows how the product appears on the plan (a pump in the equipment room, a light on the pool wall…).">
        {builder.equipment.map((item, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] items-end p-3 rounded-xl bg-gray-50">
            <Labelled htmlFor={`builder-${index}`} title="Product">
              <ProductSelect id={`builder-${index}`} value={item.product} products={products} placeholder="Choose a product…" onChange={(value) => setItem(index, { product: value })} />
            </Labelled>
            <Labelled htmlFor={`builder-${index}-kind`} title="Drawn as">
              <select id={`builder-${index}-kind`} className={inputClass} value={item.kind} onChange={(event) => setItem(index, { kind: event.target.value })}>
                {KIND_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </Labelled>
            <button type="button" onClick={() => setBuilder(b => ({ ...b, equipment: b.equipment.filter((_, i) => i !== index) }))} className="p-2.5 text-gray-500 hover:text-red-600" aria-label="Remove this product">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {builder.equipment.length < 12 && (
          <button type="button" onClick={() => setBuilder(b => ({ ...b, equipment: [...b.equipment, { product: null, kind: 'pump' }] }))} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
            <Plus className="w-4 h-4" /> Add a product
          </button>
        )}
      </Section>

      <Section title="Construction estimate" description="The price range per m² of water for building a pool (without equipment). The builder multiplies it by the pool's surface. Leave 0 to show no estimate; visitors can still ask for a quote.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled htmlFor="price-min" title="From (TND per m²)">
            <input id="price-min" type="number" min="0" step="10" className={inputClass} value={builder.pricePerM2Min || ''} onChange={price('pricePerM2Min')} placeholder="0" />
          </Labelled>
          <Labelled htmlFor="price-max" title="To (TND per m²)">
            <input id="price-max" type="number" min="0" step="10" className={inputClass} value={builder.pricePerM2Max || ''} onChange={price('pricePerM2Max')} placeholder="0" />
          </Labelled>
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save the pool builder'}
        </button>
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

export default PoolBuilderSettings;
