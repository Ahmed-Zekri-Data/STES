import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Map as MapIcon, Camera, Plus, Trash2, Share2, Check, RotateCcw, ShoppingBag, Send, Minus, Info } from 'lucide-react';
import GardenPlan from '../components/builder/GardenPlan';
import GardenPhoto from '../components/builder/GardenPhoto';
import { KIND_ICONS } from '../components/builder/kindIcons';
import { SHAPES, LIMITS, KINDS, DEFAULT_PLAN, sanitize, figures, encodePlan, decodePlan, placeFor, clamp, snap } from '../components/builder/plan';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useShopSettings, whatsappLink } from '../context/shopSettings';
import { flyToCart } from '../utils/flyToCart';

const STORAGE = 'stes-pool-plan';
const tnd = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;
const num = (value) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// The plan from the link (?plan=…), else the last one in this browser, else a default
const initialPlan = () => {
  const fromLink = new URLSearchParams(window.location.search).get('plan');
  if (fromLink) {
    const decoded = decodePlan(fromLink);
    if (decoded) return decoded;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (saved) return sanitize(saved);
  } catch { /* private mode or nothing saved */ }
  return DEFAULT_PLAN;
};

const Stepper = ({ id, label, value, min, max, step, onChange, unit = 'm' }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="mt-1 flex items-center rounded-2xl border border-gray-200 bg-surface">
      <button type="button" className="grid h-11 w-11 place-items-center text-gray-600 hover:text-gray-900 disabled:opacity-30" onClick={() => onChange(value - step)} disabled={value <= min} aria-label={`${label} : moins`}><Minus className="h-4 w-4" /></button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => event.target.value !== '' && onChange(Number(event.target.value))}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-center font-semibold tabular focus:ring-0"
      />
      <span className="pe-1 text-sm text-gray-500">{unit}</span>
      <button type="button" className="grid h-11 w-11 place-items-center text-gray-600 hover:text-gray-900 disabled:opacity-30" onClick={() => onChange(value + step)} disabled={value >= max} aria-label={`${label} : plus`}><Plus className="h-4 w-4" /></button>
    </div>
  </div>
);

const QuoteForm = ({ plan, onSent }) => {
  const { customer } = useCustomer();
  const [form, setForm] = useState(() => ({
    name: [customer?.firstName, customer?.lastName].filter(Boolean).join(' '),
    email: customer?.email || '', phone: customer?.phone || '', city: '', message: ''
  }));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (event) => setForm(current => ({ ...current, [field]: event.target.value }));

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const quantities = {};
      for (const item of plan.items) quantities[item.product] = (quantities[item.product] || 0) + 1;
      await axios.post('/api/forms/quote', {
        ...form,
        message: form.message.trim() || undefined,
        plan: {
          ...plan.pool,
          items: Object.entries(quantities).map(([product, quantity]) => ({ product, quantity })),
          link: `/construire?plan=${encodePlan(plan)}`
        }
      });
      onSent();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'L’envoi n’a pas abouti. Réessayez ou écrivez-nous sur WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  const field = 'mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';
  return (
    <form onSubmit={send} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium text-gray-700">Nom<input className={field} value={form.name} onChange={set('name')} required maxLength={100} autoComplete="name" /></label>
      <label className="text-sm font-medium text-gray-700">Téléphone<input className={field} type="tel" value={form.phone} onChange={set('phone')} required minLength={8} maxLength={20} autoComplete="tel" /></label>
      <label className="text-sm font-medium text-gray-700">Email<input className={field} type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
      <label className="text-sm font-medium text-gray-700">Ville<input className={field} value={form.city} onChange={set('city')} required maxLength={50} autoComplete="address-level2" /></label>
      <label className="text-sm font-medium text-gray-700 sm:col-span-2">Précisions (facultatif)<textarea className={field} rows={3} value={form.message} onChange={set('message')} maxLength={1000} placeholder="Accès au terrain, délai souhaité, type de sol…" /></label>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button type="submit" className="btn-brand sm:col-span-2" disabled={sending}><Send className="h-4 w-4" aria-hidden="true" /> {sending ? 'Envoi…' : 'Envoyer mon projet'}</button>
      <p className="text-xs text-gray-500 sm:col-span-2">Votre plan est joint à la demande. Un technicien vous rappelle sous 24 h, sans engagement.</p>
    </form>
  );
};

const PoolBuilder = () => {
  const { addToCart } = useCart();
  const { contact } = useShopSettings();
  const [plan, setPlan] = useState(initialPlan);
  const [view, setView] = useState('plan');
  const [selected, setSelected] = useState(null);
  const [offer, setOffer] = useState({ equipment: [], pricePerM2: null });
  const [loaded, setLoaded] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get('/api/builder')
      .then(response => setOffer(response.data?.equipment ? response.data : { equipment: [], pricePerM2: null }))
      .catch(() => setOffer({ equipment: [], pricePerM2: null }))
      .finally(() => setLoaded(true));
  }, []);

  // Kept in this browser, so the visitor finds their pool again
  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(plan)); } catch { /* private mode */ }
  }, [plan]);

  const byId = useMemo(() => Object.fromEntries(offer.equipment.map(e => [e.product._id, e])), [offer]);
  const names = useMemo(() => Object.fromEntries(offer.equipment.map(e => [e.product._id, e.product.name])), [offer]);
  // Once the offer is known, drop equipment the shop no longer offers
  useEffect(() => {
    if (loaded) setPlan(current => ({ ...current, items: current.items.filter(item => byId[item.product]) }));
  }, [loaded, byId]);

  const { pool, garden } = plan;
  const { surface, volume, flow } = figures(pool);

  const setPool = (changes) => setPlan(current => sanitize({ ...current, pool: { ...current.pool, ...changes } }));
  const setGarden = (changes) => setPlan(current => sanitize({ ...current, garden: { ...current.garden, ...changes } }));

  const addItem = (product, at) => {
    const entry = byId[product];
    if (!entry) return;
    const id = `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    setSelected(id);
    setPlan(current => {
      const count = current.items.filter(i => KINDS[i.kind]?.place === KINDS[entry.kind]?.place).length;
      const spot = at || placeFor(entry.kind, current, count);
      return { ...current, items: [...current.items, { id, product, kind: entry.kind, x: clamp(snap(spot.x, 0.05), 0, current.garden.width), y: clamp(snap(spot.y, 0.05), 0, current.garden.height) }] };
    });
  };
  const removeSelected = () => { setPlan(current => ({ ...current, items: current.items.filter(i => i.id !== selected) })); setSelected(null); };

  const lines = useMemo(() => {
    const counts = {};
    for (const item of plan.items) counts[item.product] = (counts[item.product] || 0) + 1;
    return Object.entries(counts).filter(([id]) => byId[id]).map(([id, quantity]) => ({ ...byId[id], quantity }));
  }, [plan.items, byId]);
  const equipmentTotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const estimate = offer.pricePerM2 && { min: Math.round(surface * offer.pricePerM2.min), max: Math.round(surface * offer.pricePerM2.max) };

  const shareLink = () => `${window.location.origin}/construire?plan=${encodePlan(plan)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareLink()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copiez ce lien :', shareLink()); }
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Voici ma piscine sur STES.tn : ${shareLink()}`)}`;
  const shopWhatsapp = whatsappLink(contact.whatsapp);
  const addEquipment = (event) => {
    for (const line of lines.filter(l => l.product.inStock)) addToCart(line.product, line.quantity);
    flyToCart(event.currentTarget);
  };

  return (
    <div className="pb-24">
      <header className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <p className="eyebrow">Construire ma piscine</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.02] text-gray-900 sm:text-6xl">Dessinez <span className="text-gradient">votre piscine.</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-gray-600">Posez le bassin sur votre terrain, glissez les équipements autour, voyez-la dans votre jardin, puis recevez un devis gratuit avec votre plan.</p>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section aria-label="Votre projet" className="min-w-0">
          <div role="tablist" aria-label="Vue" className="mb-4 inline-flex rounded-2xl border border-gray-200 bg-surface p-1">
            {[['plan', 'Plan du terrain', MapIcon], ['photo', 'Sur mon jardin', Camera]].map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${view === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {view === 'plan' ? (
            <div className="panel p-3 text-gray-700 sm:p-5">
              <GardenPlan plan={plan} onChange={(update) => setPlan(current => update(current))} names={names} selected={selected} onSelect={setSelected} onDropProduct={addItem} />
              <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" /> Glissez la piscine pour la déplacer, ses coins blancs pour la redimensionner. Chaque carreau fait 1 m.</p>
                {selected && selected !== 'pool' && (
                  <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={removeSelected}><Trash2 className="h-4 w-4" aria-hidden="true" /> Retirer {names[plan.items.find(i => i.id === selected)?.product] || 'l’équipement'}</button>
                )}
              </div>
            </div>
          ) : (
            <GardenPhoto pool={pool} />
          )}
        </section>

        <aside className="space-y-4" aria-label="Réglages et estimation">
          <div className="panel p-5">
            <h2 className="text-lg font-bold text-gray-900">Le bassin</h2>
            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Forme">
              {SHAPES.map(shape => (
                <button key={shape.id} type="button" aria-pressed={pool.shape === shape.id} onClick={() => setPool({ shape: shape.id })} className={`rounded-2xl border px-2 py-2.5 text-sm font-semibold ${pool.shape === shape.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-400'}`}>
                  {shape.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stepper id="pool-length" label="Longueur" value={pool.length} min={LIMITS.length[0]} max={Math.min(LIMITS.length[1], garden.width)} step={0.5} onChange={(v) => setPool({ length: v })} />
              <Stepper id="pool-width" label="Largeur" value={pool.width} min={LIMITS.width[0]} max={Math.min(LIMITS.width[1], garden.height)} step={0.5} onChange={(v) => setPool({ width: v })} />
              <Stepper id="pool-depth" label="Profondeur" value={pool.depth} min={LIMITS.depth[0]} max={LIMITS.depth[1]} step={0.1} onChange={(v) => setPool({ depth: Number(v.toFixed(1)) })} />
              <Stepper id="garden-width" label="Terrain (largeur)" value={garden.width} min={LIMITS.garden[0]} max={LIMITS.garden[1]} step={1} onChange={(v) => setGarden({ width: v })} />
            </div>
            <div className="mt-3">
              <Stepper id="garden-height" label="Terrain (profondeur)" value={garden.height} min={LIMITS.garden[0]} max={LIMITS.garden[1]} step={1} onChange={(v) => setGarden({ height: v })} />
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-lg font-bold text-gray-900">Les équipements</h2>
            {loaded && !offer.equipment.length && <p className="mt-2 text-sm text-gray-600">Nos techniciens vous proposeront l’équipement adapté à votre bassin dans le devis.</p>}
            <ul className="mt-3 space-y-2">
              {offer.equipment.map(({ kind, product }) => {
                const Icon = KIND_ICONS[kind] || KIND_ICONS.other;
                return (
                  <li
                    key={product._id}
                    draggable
                    onDragStart={(event) => { event.dataTransfer.setData('text/plain', product._id); event.dataTransfer.effectAllowed = 'copy'; }}
                    className="flex cursor-grab items-center gap-3 rounded-2xl border border-gray-200 bg-surface p-2.5"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <Link to={`/product/${product._id}`} className="block truncate text-sm font-semibold text-gray-900 hover:underline">{product.name}</Link>
                      <span className="text-xs text-gray-500">{KINDS[kind]?.label} · {tnd(product.price)}</span>
                    </span>
                    <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={() => addItem(product._id)} aria-label={`Placer ${product.name} sur le plan`}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {offer.equipment.length > 0 && <p className="mt-2 text-xs text-gray-500">Glissez un équipement sur le plan, ou touchez + pour le placer.</p>}
          </div>

          <div className="panel p-5">
            <h2 className="text-lg font-bold text-gray-900">Votre piscine</h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[['Surface', `${num(surface)} m²`], ['Volume', `${num(volume)} m³`], ['Filtration', `${num(flow)} m³/h`]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-blue-50 px-2 py-3"><dt className="text-xs text-gray-600">{k}</dt><dd className="mt-1 font-bold text-gray-900 tabular">{v}</dd></div>
              ))}
            </dl>
            {lines.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {lines.map(line => (
                  <li key={line.product._id} className="flex justify-between gap-3">
                    <span className="text-gray-700">{line.quantity > 1 && `${line.quantity} × `}{line.product.name}{!line.product.inStock && <span className="text-red-600"> (rupture)</span>}</span>
                    <span className="font-semibold tabular text-gray-900">{tnd(line.product.price * line.quantity)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900"><span>Équipement</span><span className="tabular">{tnd(equipmentTotal)}</span></li>
              </ul>
            )}
            {estimate && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <p className="text-sm text-gray-700">Estimation de construction</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular">{tnd(estimate.min)} – {tnd(estimate.max)}</p>
                <p className="mt-1 text-xs text-gray-600">Pour {num(surface)} m² de bassin, hors équipement. Le prix exact dépend du terrain : il est fixé par le devis.</p>
              </div>
            )}
            <div className="mt-4 grid gap-2">
              {lines.some(l => l.product.inStock) && <button type="button" className="btn-ghost" onClick={addEquipment}><ShoppingBag className="h-4 w-4" aria-hidden="true" /> Ajouter l’équipement au panier</button>}
              <button type="button" className="btn-brand" onClick={() => { setQuoting(true); setSent(false); }}><Send className="h-4 w-4" aria-hidden="true" /> Recevoir mon devis gratuit</button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost !px-3 text-sm" onClick={copy}>{copied ? <><Check className="h-4 w-4" aria-hidden="true" /> Lien copié</> : <><Share2 className="h-4 w-4" aria-hidden="true" /> Copier le lien</>}</button>
                <a className="btn-ghost !px-3 text-sm" href={whatsapp} target="_blank" rel="noopener noreferrer">Partager sur WhatsApp</a>
              </div>
              <button type="button" className="mt-1 inline-flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800" onClick={() => { setPlan(DEFAULT_PLAN); setSelected(null); }}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Recommencer</button>
            </div>
          </div>

          {quoting && (
            <div className="panel p-5" aria-live="polite">
              {sent ? (
                <div className="text-center">
                  <Check className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
                  <h2 className="mt-2 text-lg font-bold text-gray-900">Projet envoyé !</h2>
                  <p className="mt-1 text-sm text-gray-600">Un technicien STES vous rappelle sous 24 h avec votre devis.</p>
                  {shopWhatsapp && <a className="btn-ghost mt-4" href={shopWhatsapp} target="_blank" rel="noopener noreferrer">Écrire sur WhatsApp</a>}
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900">Votre devis gratuit</h2>
                  <QuoteForm plan={plan} onSent={() => setSent(true)} />
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PoolBuilder;
