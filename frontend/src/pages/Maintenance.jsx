import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Wrench, Sunrise, FlaskConical, Sun, ThermometerSun, Leaf, Snowflake, Bell, Check, ShoppingBag, Calculator, Mail, MessageCircle } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { flyToCart } from '../utils/flyToCart';
import { MONTHS, dateLabel, whereWeAre, initialVolume, volumeOf } from '../components/maintenance/calendar';

const ICONS = { check: Wrench, opening: Sunrise, season: FlaskConical, summer: Sun, heat: ThermometerSun, autumn: Leaf, winter: Snowflake };
const tnd = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;
const field = 'mt-1 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

// The volume of water, typed in or worked out from the pool's size
const VolumeField = ({ volume, onChange }) => {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ length: '', width: '', depth: '1.4' });
  const set = (key) => (event) => {
    const next = { ...size, [key]: event.target.value };
    setSize(next);
    const v = volumeOf(next.length, next.width, next.depth);
    if (v) onChange(v);
  };
  return (
    <div>
      <label htmlFor="pool-volume" className="block text-sm font-medium text-gray-700">Volume de votre piscine</label>
      <div className="mt-1 flex items-center rounded-2xl border border-gray-200 bg-surface pe-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15">
        <input id="pool-volume" type="number" inputMode="decimal" min="1" max="2000" step="0.1" value={volume} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} className="w-full min-w-0 border-0 bg-transparent px-4 py-3 font-semibold tabular focus:ring-0" placeholder="Par exemple 45" />
        <span className="text-sm text-gray-500">m³</span>
      </div>
      <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Calculator className="h-4 w-4" aria-hidden="true" /> Calculer depuis les dimensions
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[['length', 'Longueur'], ['width', 'Largeur'], ['depth', 'Profondeur moy.']].map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-gray-600">{label} (m)
              <input type="number" inputMode="decimal" min="0" step="0.1" value={size[key]} onChange={set(key)} className="mt-1 w-full rounded-xl border border-gray-200 bg-surface px-3 py-2 text-sm tabular" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const SignUp = ({ volume, onVolume }) => {
  const { customer } = useCustomer();
  const [form, setForm] = useState(() => ({ firstName: customer?.firstName || '', email: customer?.email || '', phone: customer?.phone || '', whatsapp: false, consent: false }));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const source = new URLSearchParams(window.location.search).get('from') === 'construire' ? 'builder' : 'page';
      const response = await axios.post('/api/maintenance/subscribe', {
        ...form, phone: form.whatsapp ? form.phone : undefined, volume: volume || null, source
      });
      setDone(response.data?.message || 'C’est noté !');
    } catch (err) {
      setError(err.response?.data?.message || 'L’inscription n’a pas abouti. Réessayez dans un instant.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="text-center" role="status">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><Check className="h-7 w-7" aria-hidden="true" /></span>
        <h2 className="mt-3 text-xl font-bold text-gray-900">Vos rappels sont activés</h2>
        <p className="mt-2 text-gray-600">{done}</p>
        <p className="mt-2 text-sm text-gray-500">Chaque message contient un lien pour les modifier ou les arrêter.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Recevez les rappels</h2>
        <p className="mt-1 text-sm text-gray-600">Gratuit, 7 messages par an au plus, avec les produits adaptés.</p>
      </div>
      <VolumeField volume={volume} onChange={onVolume} />
      <label className="block text-sm font-medium text-gray-700">Prénom<input className={field} value={form.firstName} onChange={set('firstName')} required maxLength={50} autoComplete="given-name" /></label>
      <label className="block text-sm font-medium text-gray-700">Email<input className={field} type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-3 text-sm text-gray-700">
        <input type="checkbox" className="mt-0.5 h-5 w-5 rounded" checked={form.whatsapp} onChange={set('whatsapp')} />
        <span><span className="font-semibold text-gray-900">Aussi sur WhatsApp</span><br />Un membre de l’équipe STES vous écrit au bon moment.</span>
      </label>
      {form.whatsapp && (
        <label className="block text-sm font-medium text-gray-700">Numéro WhatsApp<input className={field} type="tel" value={form.phone} onChange={set('phone')} required placeholder="98 765 432" autoComplete="tel" /></label>
      )}
      <label className="flex items-start gap-3 text-sm text-gray-600">
        <input type="checkbox" className="mt-0.5 h-5 w-5 rounded" checked={form.consent} onChange={set('consent')} required />
        <span>J’accepte de recevoir les rappels d’entretien de STES Piscines. Je peux les arrêter à tout moment d’un clic.</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-brand w-full" disabled={sending}><Bell className="h-4 w-4" aria-hidden="true" /> {sending ? 'Inscription…' : 'Activer mes rappels'}</button>
    </form>
  );
};

const Maintenance = () => {
  const { addToCart } = useCart();
  const [reminders, setReminders] = useState(null);
  const [volume, setVolume] = useState(initialVolume);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    axios.get('/api/maintenance/calendar')
      .then(response => setReminders(response.data?.reminders || []))
      .catch(() => setReminders([]));
  }, []);

  const { current, next } = useMemo(() => whereWeAre(reminders || []), [reminders]);
  const thisMonth = new Date().getMonth() + 1;
  const byMonth = useMemo(() => new Set((reminders || []).map(r => r.month)), [reminders]);

  const add = (product, event) => {
    addToCart(product, 1);
    flyToCart(event.currentTarget);
    setAdded(product._id);
    setTimeout(() => setAdded(a => (a === product._id ? null : a)), 1500);
  };

  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Entretien · Calendrier gratuit"
        title="Votre piscine, toute l’année."
        subtitle="Que faire, et quand : remise en route, analyses, canicule, hivernage. Nous vous prévenons au bon moment, avec les bons produits."
      >
        <div className="flex flex-wrap gap-3">
          <a href="#rappels" className="btn-brand"><Bell className="h-4 w-4" aria-hidden="true" /> Recevoir les rappels</a>
          <a href="#calendrier" className="btn-ghost">Voir le calendrier</a>
        </div>
      </PageHero>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8">
        <section id="calendrier" aria-labelledby="calendar-title" className="min-w-0 scroll-mt-24">
          <h2 id="calendar-title" className="text-2xl font-bold text-gray-900 sm:text-3xl">Le calendrier de votre piscine</h2>
          <p className="mt-2 text-gray-600">Pensé pour le climat tunisien. {volume ? <>Pour vos <strong className="tabular">{String(volume).replace('.', ',')} m³</strong>, suivez la dose indiquée sur chaque produit.</> : 'Indiquez le volume de votre bassin pour recevoir des conseils adaptés.'}</p>

          {/* The year at a glance */}
          <ol className="mt-6 grid grid-cols-6 gap-1.5 sm:grid-cols-12" aria-label="L’année">
            {MONTHS.map((label, index) => {
              const month = index + 1;
              return (
                <li key={label} className={`rounded-xl px-1 py-2 text-center text-xs font-semibold ${month === thisMonth ? 'bg-blue-600 text-white' : byMonth.has(month) ? 'bg-blue-50 text-blue-800' : 'bg-surface text-gray-400'}`} aria-current={month === thisMonth ? 'date' : undefined}>
                  {label}
                  <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${byMonth.has(month) ? (month === thisMonth ? 'bg-white' : 'bg-blue-600') : 'bg-transparent'}`} aria-hidden="true" />
                </li>
              );
            })}
          </ol>

          {!reminders && <p className="mt-8 text-gray-500">Chargement du calendrier…</p>}
          <ol className="relative mt-8 space-y-5 border-s-2 border-blue-100 ps-6">
            {(reminders || []).map(reminder => {
              const Icon = ICONS[reminder.key] || Bell;
              const tag = reminder.key === current ? 'En ce moment' : reminder.key === next ? 'Prochain rappel' : null;
              return (
                <li key={reminder.key} className="relative">
                  <span className={`absolute -start-[37px] top-5 grid h-7 w-7 place-items-center rounded-full ring-4 ring-[rgb(var(--page))] ${tag ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`} aria-hidden="true"><Icon className="h-3.5 w-3.5" /></span>
                  <article className={`panel p-5 ${reminder.key === current ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-blue-700">{dateLabel(reminder)}</p>
                      {tag && <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">{tag}</span>}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">{reminder.title}</h3>
                    <p className="mt-2 leading-relaxed text-gray-600">{reminder.message}</p>
                    {reminder.products.length > 0 && (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {reminder.products.map(product => (
                          <li key={product._id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-surface p-2.5">
                            {product.image && <img src={product.image} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" loading="lazy" />}
                            <span className="min-w-0 flex-1">
                              <Link to={`/product/${product._id}`} className="block truncate text-sm font-semibold text-gray-900 hover:underline">{product.name}</Link>
                              <span className="text-xs text-gray-500 tabular">{product.priceOnRequest ? 'Prix sur demande' : tnd(product.price)}{!product.inStock && <span className="text-red-600"> · rupture</span>}</span>
                            </span>
                            {product.choose ? (
                              <Link to={`/product/${product._id}`} className="shrink-0 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700" aria-label={`Choisir ${product.name}`}>Choisir</Link>
                            ) : product.inStock && (
                              <button type="button" onClick={(event) => add(product, event)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700" aria-label={`Ajouter ${product.name} au panier`}>
                                {added === product._id ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </section>

        <aside id="rappels" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start" aria-label="Recevoir les rappels">
          <div className="panel p-6">
            <SignUp volume={volume} onVolume={setVolume} />
          </div>
          <ul className="mt-4 space-y-2 px-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" aria-hidden="true" /> Par email, le matin du jour prévu</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-blue-600" aria-hidden="true" /> Sur WhatsApp si vous le souhaitez</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" aria-hidden="true" /> Désinscription en un clic, données effacées</li>
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default Maintenance;
