import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, BellOff, Save } from 'lucide-react';

const field = 'mt-1 w-full rounded-2xl border border-gray-200 bg-surface px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

// /entretien/mes-rappels?token=… : the link in every reminder, to change
// the pool's volume and how to be told, or to stop the reminders
const MaintenanceSubscription = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const url = `/api/maintenance/subscription/${encodeURIComponent(token)}`;
  const [state, setState] = useState('loading'); // loading, ready, missing, stopped
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!token) { setState('missing'); return; }
    axios.get(url)
      .then(response => { setForm({ ...response.data, volume: response.data.volume ?? '' }); setState('ready'); })
      .catch(() => setState('missing'));
  }, [token, url]);

  const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }));
  const setChannel = (key) => (event) => setForm(current => ({ ...current, channels: { ...current.channels, [key]: event.target.checked } }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(url, { volume: form.volume === '' ? null : Number(form.volume), phone: form.phone, channels: form.channels });
      setMessage({ ok: true, text: response.data.message });
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.message || 'L’enregistrement n’a pas abouti.' });
    } finally {
      setSaving(false);
    }
  };

  const stop = async () => {
    try {
      await axios.delete(url);
      setState('stopped');
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.message || 'La désinscription n’a pas abouti.' });
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:pt-20">
      <p className="eyebrow">Entretien</p>
      <h1 className="mt-3 text-4xl font-bold text-gray-900">Mes rappels</h1>

      {state === 'loading' && <p className="mt-6 text-gray-500">Chargement…</p>}

      {state === 'missing' && (
        <div className="panel mt-6 p-6">
          <p className="text-gray-700">Ce lien ne correspond à aucun rappel : vous êtes peut-être déjà désinscrit.</p>
          <Link to="/entretien" className="btn-brand mt-4">Voir le calendrier d’entretien</Link>
        </div>
      )}

      {state === 'stopped' && (
        <div className="panel mt-6 p-6 text-center" role="status">
          <BellOff className="mx-auto h-10 w-10 text-gray-500" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-gray-900">C’est fait</h2>
          <p className="mt-2 text-gray-600">Vous ne recevrez plus nos rappels et vos informations ont été effacées.</p>
          <Link to="/entretien" className="btn-ghost mt-4">Le calendrier reste consultable ici</Link>
        </div>
      )}

      {state === 'ready' && form && (
        <>
          <form onSubmit={save} className="panel mt-6 space-y-4 p-6">
            <p className="text-gray-700">Bonjour {form.firstName}, voici vos rappels d’entretien pour <strong>{form.email}</strong>.</p>
            <label className="block text-sm font-medium text-gray-700">Volume de la piscine (m³)
              <input className={field} type="number" inputMode="decimal" min="1" max="2000" step="0.1" value={form.volume} onChange={set('volume')} />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-700">Me prévenir</legend>
              <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" className="h-5 w-5 rounded" checked={form.channels.email} onChange={setChannel('email')} /> Par email</label>
              <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" className="h-5 w-5 rounded" checked={form.channels.whatsapp} onChange={setChannel('whatsapp')} /> Sur WhatsApp</label>
            </fieldset>
            {form.channels.whatsapp && (
              <label className="block text-sm font-medium text-gray-700">Numéro WhatsApp
                <input className={field} type="tel" value={form.phone} onChange={set('phone')} required placeholder="98 765 432" autoComplete="tel" />
              </label>
            )}
            {message && <p role={message.ok ? 'status' : 'alert'} className={`flex items-center gap-1.5 text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.ok && <Check className="h-4 w-4" aria-hidden="true" />}{message.text}</p>}
            <button type="submit" className="btn-brand w-full" disabled={saving}><Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </form>

          <div className="mt-6 rounded-3xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900">Arrêter les rappels</h2>
            <p className="mt-1 text-sm text-gray-600">Nous effaçons votre prénom, votre email et votre numéro.</p>
            {confirmStop ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost !border-red-300 text-red-700" onClick={stop}><BellOff className="h-4 w-4" aria-hidden="true" /> Oui, arrêter</button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmStop(false)}>Annuler</button>
              </div>
            ) : (
              <button type="button" className="btn-ghost mt-4" onClick={() => setConfirmStop(true)}><BellOff className="h-4 w-4" aria-hidden="true" /> Arrêter mes rappels</button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MaintenanceSubscription;
