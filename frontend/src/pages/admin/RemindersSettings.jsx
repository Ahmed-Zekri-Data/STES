import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, ExternalLink } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { loadAllProducts } from '../../utils/adminProducts';
import { Section, ProductList, Labelled, inputClass } from '../../components/admin/ProductPickers';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Admin → Settings → Reminders: the pool care calendar visitors sign up to
// on /entretien. The text is in French, as customers read it.
const RemindersSettings = () => {
  const { hasPermission } = useAdmin();
  const [calendar, setCalendar] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const canManageProducts = hasPermission('products');

  useEffect(() => {
    Promise.all([adminApi.get('/admin/settings'), loadAllProducts(canManageProducts)])
      .then(([settings, list]) => { setCalendar(settings.data.reminders.calendar); setProducts(list); })
      .catch(error => setLoadError(errorMessage(error)));
  }, [canManageProducts]);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the reminders: {loadError}</p>;
  if (!calendar) return <p className="text-gray-600">Loading…</p>;

  const setReminder = (key, changes) => setCalendar(list => list.map(r => (r.key === key ? { ...r, ...changes } : r)));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const body = calendar.map(({ key, month, day, title, message, products: ids, active }) => ({ key, month, day, title, message, products: (ids || []).map(String), active: active !== false }));
      const response = await adminApi.put('/admin/settings', { reminders: { calendar: body } });
      setCalendar(response.data.settings.reminders.calendar);
      setResult({ ok: true, message: 'Reminders saved' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm text-gray-600">
        Visitors sign up on <a href="/entretien" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">the pool care calendar <ExternalLink className="w-3.5 h-3.5" /></a>.
        Each reminder is emailed at 9:00 on its date (or the first morning after, for 30 days), and WhatsApp reminders wait for you in <a href="/admin/reminders" className="font-medium text-blue-600 hover:underline">Reminders</a>.
      </p>

      {calendar.map(reminder => (
        <Section key={reminder.key} title={reminder.title || 'Reminder'}>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" className="h-4 w-4 rounded" checked={reminder.active !== false} onChange={(event) => setReminder(reminder.key, { active: event.target.checked })} />
            Send this reminder
          </label>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Labelled htmlFor={`${reminder.key}-month`} title="Month">
              <select id={`${reminder.key}-month`} className={inputClass} value={reminder.month} onChange={(event) => setReminder(reminder.key, { month: Number(event.target.value) })}>
                {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </Labelled>
            <Labelled htmlFor={`${reminder.key}-day`} title="Day" hint="1 to 28">
              <input id={`${reminder.key}-day`} type="number" min="1" max="28" className={inputClass} value={reminder.day} onChange={(event) => setReminder(reminder.key, { day: Number(event.target.value) })} />
            </Labelled>
          </div>
          <Labelled htmlFor={`${reminder.key}-title`} title="Title (French)">
            <input id={`${reminder.key}-title`} className={inputClass} value={reminder.title} maxLength={80} onChange={(event) => setReminder(reminder.key, { title: event.target.value })} />
          </Labelled>
          <Labelled htmlFor={`${reminder.key}-message`} title="What to do (French)">
            <textarea id={`${reminder.key}-message`} rows={3} className={inputClass} value={reminder.message} maxLength={600} onChange={(event) => setReminder(reminder.key, { message: event.target.value })} />
          </Labelled>
          <Labelled htmlFor={`${reminder.key}-products`} title="Recommended products" hint="Up to 3, shown with the reminder with a link to buy them">
            <ProductList id={`${reminder.key}-products`} value={(reminder.products || []).map(String)} products={products} max={3} onChange={(ids) => setReminder(reminder.key, { products: ids })} />
          </Labelled>
        </Section>
      ))}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save the reminders'}
        </button>
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

export default RemindersSettings;
