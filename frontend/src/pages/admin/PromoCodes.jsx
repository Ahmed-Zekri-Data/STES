import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Power, Shuffle, X, Loader2, BadgePercent, Infinity as InfinityIcon } from 'lucide-react';
import adminApi from '../../utils/adminApi';

const STATUS = {
  active: { label: 'Active', tone: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Scheduled', tone: 'bg-blue-100 text-blue-800' },
  expired: { label: 'Expired', tone: 'bg-gray-100 text-gray-700' },
  used_up: { label: 'Used up', tone: 'bg-amber-100 text-amber-800' },
  disabled: { label: 'Disabled', tone: 'bg-gray-100 text-gray-500' }
};

const EMPTY = {
  code: '', description: '', type: 'percent', value: '', minOrder: '', maxDiscount: '',
  startsAt: '', expiresAt: '', usageLimit: '', isActive: true
};

const money = (n) => `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} TND`;
const valueLabel = (promo) => (promo.type === 'percent' ? `−${promo.value}%` : `−${money(promo.value)}`);

// Dates are picked as days: a code starts at the beginning of its first day
// and ends at the end of its last day (the shop's local time)
const toDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromDay = (day, endOfDay) => (day ? new Date(`${day}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString() : '');
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const randomCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `STES-${Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')}`;
};

// A labelled field; its hint is read out after the label (aria-describedby)
const Field = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const described = (id) => ({ id, 'aria-describedby': `${id}-hint` });

const input = 'w-full rounded-xl border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

const PromoForm = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial ? {
    ...EMPTY,
    ...initial,
    minOrder: initial.minOrder || '',
    maxDiscount: initial.maxDiscount ?? '',
    usageLimit: initial.usageLimit ?? '',
    startsAt: toDay(initial.startsAt),
    expiresAt: toDay(initial.expiresAt)
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm(f => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      ...form,
      code: form.code.trim().toUpperCase(),
      maxDiscount: form.type === 'percent' ? form.maxDiscount : '',
      startsAt: fromDay(form.startsAt, false),
      expiresAt: fromDay(form.expiresAt, true)
    };
    delete body._id;
    for (const key of ['usedCount', 'status', 'orders', 'discountTotal', 'createdAt', 'updatedAt', '__v']) delete body[key];
    try {
      const response = initial
        ? await adminApi.put(`/admin/promo-codes/${initial._id}`, body)
        : await adminApi.post('/admin/promo-codes', body);
      onSaved(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'The promo code could not be saved.');
      setSaving(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label={initial ? `Edit ${initial.code}` : 'New promo code'}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="panel max-h-[92dvh] w-full max-w-xl overflow-y-auto !rounded-[1.75rem] p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-gray-900">{initial ? `Edit ${initial.code}` : 'New promo code'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="promo-code-field" label="Code" hint={initial?.usedCount > 0 ? 'Already used: it can no longer be renamed.' : 'What customers type at checkout: letters, digits, - or _.'}>
              <div className="flex gap-2">
                <input {...described('promo-code-field')} required value={form.code} onChange={set('code')} disabled={initial?.usedCount > 0} className={`${input} font-mono uppercase`} placeholder="SUMMER10" maxLength={30} />
                {!initial && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, code: randomCode() }))} className="btn-ghost !px-3 !py-2 text-sm" title="Generate a code">
                    <Shuffle className="h-4 w-4" aria-hidden="true" /> Generate
                  </button>
                )}
              </div>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field id="promo-description" label="Description" hint="For you only, not shown to customers.">
              <input {...described('promo-description')} value={form.description} onChange={set('description')} className={input} placeholder="Summer sale 2026" maxLength={200} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Discount</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-full bg-gray-100 p-1" role="radiogroup" aria-label="Discount type">
                {[['percent', 'Percentage'], ['fixed', 'Fixed amount']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.type === value}
                    onClick={() => setForm(f => ({ ...f, type: value }))}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${form.type === value ? 'bg-surface text-gray-900 shadow-soft' : 'text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative w-36">
                <input aria-label={`Value (${form.type === 'percent' ? '%' : 'TND'})`} required type="number" min="0.001" max={form.type === 'percent' ? 100 : undefined} step="0.001" value={form.value} onChange={set('value')} className={`${input} pe-12`} />
                <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400">{form.type === 'percent' ? '%' : 'TND'}</span>
              </div>
            </div>
          </div>

          <Field id="promo-min" label="Minimum order (TND)" hint="Products total needed. Empty: no minimum.">
            <input {...described('promo-min')} type="number" min="0" step="0.001" value={form.minOrder} onChange={set('minOrder')} className={input} />
          </Field>
          {form.type === 'percent' ? (
            <Field id="promo-max" label="Maximum discount (TND)" hint="Empty: no maximum.">
              <input {...described('promo-max')} type="number" min="0" step="0.001" value={form.maxDiscount} onChange={set('maxDiscount')} className={input} />
            </Field>
          ) : <div className="hidden sm:block" />}

          <Field id="promo-start" label="Starts on" hint="Empty: right away.">
            <input {...described('promo-start')} type="date" value={form.startsAt} onChange={set('startsAt')} className={input} />
          </Field>
          <Field id="promo-end" label="Ends on (included)" hint="Empty: never.">
            <input {...described('promo-end')} type="date" value={form.expiresAt} onChange={set('expiresAt')} className={input} />
          </Field>

          <Field id="promo-limit" label="Usage limit" hint="How many orders may use it. Empty: unlimited.">
            <input {...described('promo-limit')} type="number" min="1" step="1" value={form.usageLimit} onChange={set('usageLimit')} className={input} />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-gray-200 px-3 py-2.5">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {initial ? 'Save changes' : 'Create code'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
};

const PromoCard = ({ promo, onEdit, onToggle, onDelete }) => {
  const status = STATUS[promo.status] || STATUS.active;
  const limited = promo.usageLimit != null;
  const usage = limited ? Math.min(1, promo.usedCount / promo.usageLimit) : 0;
  const details = [
    promo.minOrder > 0 && `From ${money(promo.minOrder)}`,
    promo.type === 'percent' && promo.maxDiscount != null && `Up to ${money(promo.maxDiscount)}`,
    promo.startsAt && `From ${shortDate(promo.startsAt)}`,
    promo.expiresAt && `Until ${shortDate(promo.expiresAt)}`
  ].filter(Boolean);

  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`panel relative overflow-hidden ${promo.status === 'disabled' || promo.status === 'expired' ? 'opacity-70' : ''}`}>
      {/* Ticket notches */}
      <span className="absolute -start-3 top-[4.6rem] h-6 w-6 rounded-full border border-gray-200 bg-page" aria-hidden="true" />
      <span className="absolute -end-3 top-[4.6rem] h-6 w-6 rounded-full border border-gray-200 bg-page" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-xl font-semibold tracking-wide text-gray-900">{promo.code}</p>
          <p className="truncate text-sm text-gray-500">{promo.description || '\u00a0'}</p>
        </div>
        <span className="font-display text-2xl font-bold text-gradient">{valueLabel(promo)}</span>
      </div>
      <div className="mx-5 border-t border-dashed border-gray-300" />

      <div className="space-y-3 p-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
          {details.map(d => <span key={d} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{d}</span>)}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Used {promo.usedCount}{limited ? ` of ${promo.usageLimit}` : (promo.usedCount === 1 ? ' time' : ' times')}</span>
            {!limited && <InfinityIcon className="h-4 w-4" aria-label="No limit" />}
          </div>
          {limited && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${usage * 100}%`, background: 'linear-gradient(90deg, rgb(var(--aqua-500)), rgb(var(--violet-500)))' }} />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {promo.orders} order{promo.orders === 1 ? '' : 's'} · {money(promo.discountTotal)} given
          </p>
        </div>

        <div className="flex justify-end gap-1 pt-1">
          <button type="button" onClick={onToggle} aria-label={promo.isActive ? `Disable ${promo.code}` : `Enable ${promo.code}`} title={promo.isActive ? 'Disable' : 'Enable'} className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900">
            <Power className="h-4 w-4" />
          </button>
          <button type="button" onClick={onEdit} aria-label={`Edit ${promo.code}`} title="Edit" className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} aria-label={`Delete ${promo.code}`} title="Delete" className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
};

const PromoCodes = () => {
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null: closed, {}: new, a code: edit

  const load = () => adminApi.get('/admin/promo-codes')
    .then(response => { setCodes(response.data.promoCodes); setError(''); })
    .catch(err => setError(err.response?.data?.message || 'Promo codes could not be loaded.'));

  useEffect(() => { load(); }, []);

  const toggle = async (promo) => {
    try {
      await adminApi.put(`/admin/promo-codes/${promo._id}`, { isActive: !promo.isActive });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'The promo code could not be changed.');
    }
  };

  const remove = async (promo) => {
    if (!window.confirm(`Delete ${promo.code}? Orders that used it keep their discount. To stop it while keeping its history, disable it instead.`)) return;
    try {
      await adminApi.delete(`/admin/promo-codes/${promo._id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'The promo code could not be deleted.');
    }
  };

  const active = codes?.filter(c => c.status === 'active').length || 0;
  const uses = codes?.reduce((sum, c) => sum + c.usedCount, 0) || 0;
  const given = codes?.reduce((sum, c) => sum + c.discountTotal, 0) || 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">Promo codes</h1>
          <p className="mt-1 text-gray-600">Discounts customers type at checkout. The discount comes off the products; delivery and VAT follow.</p>
        </div>
        <button type="button" onClick={() => setEditing({})} className="btn-brand">
          <Plus className="h-4 w-4" aria-hidden="true" /> New code
        </button>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[['Active codes', active], ['Uses', uses], ['Discount given', money(given)]].map(([label, value]) => (
          <div key={label} className="panel p-4 sm:p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-gray-900 tabular">{codes ? value : '—'}</p>
          </div>
        ))}
      </div>

      {codes === null && !error && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-64 rounded-[var(--radius)]" />)}
        </div>
      )}

      {codes?.length === 0 && (
        <div className="panel mt-6 grid place-items-center px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><BadgePercent className="h-7 w-7" aria-hidden="true" /></span>
          <p className="mt-4 font-display text-xl font-semibold text-gray-900">No promo codes yet</p>
          <p className="mt-1 text-gray-600">Create one, then share it with your customers.</p>
          <button type="button" onClick={() => setEditing({})} className="btn-brand mt-6"><Plus className="h-4 w-4" aria-hidden="true" /> New code</button>
        </div>
      )}

      {codes?.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {codes.map(promo => (
              <PromoCard key={promo._id} promo={promo} onEdit={() => setEditing(promo)} onToggle={() => toggle(promo)} onDelete={() => remove(promo)} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <PromoForm
            initial={editing._id ? editing : null}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromoCodes;
