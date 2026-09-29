import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Check, Mail, Send, Trash2, Loader2, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Admin → Reminders: who asked for pool care reminders on /entretien, and
// the WhatsApp reminders due today for an admin to send from their phone
const Reminders = () => {
  const { hasPermission } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [opened, setOpened] = useState(() => new Set());

  const load = useCallback(() => adminApi.get('/admin/maintenance')
    .then(response => setData(response.data))
    .catch(err => setError(errorMessage(err))), []);
  useEffect(() => { load(); }, [load]);

  const markSent = async (group, person) => {
    try {
      await adminApi.post(`/admin/maintenance/${person._id}/sent`, { key: group.key, year: group.year });
      await load();
    } catch (err) {
      setNotice({ ok: false, text: errorMessage(err) });
    }
  };

  const sendNow = async () => {
    setSending(true);
    setNotice(null);
    try {
      const response = await adminApi.post('/admin/maintenance/send-now');
      setNotice({ ok: true, text: response.data.message });
      await load();
    } catch (err) {
      setNotice({ ok: false, text: errorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  const remove = async (subscriber) => {
    if (!window.confirm(`Remove ${subscriber.firstName} (${subscriber.email})? They will get no more reminders.`)) return;
    try {
      await adminApi.delete(`/admin/maintenance/${subscriber._id}`);
      await load();
    } catch (err) {
      setNotice({ ok: false, text: errorMessage(err) });
    }
  };

  if (error) return <p role="alert" className="text-red-600">Could not load the reminders: {error}</p>;
  if (!data) return <p className="text-gray-600">Loading…</p>;

  const waiting = data.whatsapp.reduce((sum, group) => sum + group.people.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">Reminders</h1>
          <p className="mt-1 text-gray-600">Pool care reminders customers asked for on the <a href="/entretien" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">care calendar</a>. Emails go out by themselves every morning at 9:00.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('settings') && (
            <Link to="/admin/settings?tab=reminders" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <SettingsIcon className="h-4 w-4" aria-hidden="true" /> Edit the calendar
            </Link>
          )}
          <button type="button" onClick={sendNow} disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send today’s emails now
          </button>
        </div>
      </div>

      {!data.emailConfigured && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Emails are not set up yet (EMAIL_USER and EMAIL_PASS in .env): reminder emails wait until they are. WhatsApp reminders below still work.
        </p>
      )}
      {notice && <p role={notice.ok ? 'status' : 'alert'} className={`text-sm ${notice.ok ? 'text-green-700' : 'text-red-600'}`}>{notice.text}</p>}

      <section className="rounded-xl border border-gray-200 bg-surface p-6 shadow-sm" aria-labelledby="whatsapp-title">
        <h2 id="whatsapp-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MessageCircle className="h-5 w-5 text-green-600" aria-hidden="true" /> WhatsApp to send today {waiting > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-800">{waiting}</span>}
        </h2>
        <p className="mt-1 text-sm text-gray-600">“Open WhatsApp” opens the message ready to send from the shop’s WhatsApp. Once sent, mark it so it leaves the list.</p>
        {data.whatsapp.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Nothing to send today.</p>
        ) : data.whatsapp.map(group => (
          <div key={`${group.key}-${group.year}`} className="mt-5">
            <h3 className="text-sm font-semibold text-gray-800">{group.title}</h3>
            <ul className="mt-2 divide-y divide-gray-100">
              {group.people.map(person => (
                <li key={person._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-sm text-gray-800">
                    <span className="font-medium">{person.firstName}</span> · {person.phone}{person.volume ? ` · ${person.volume} m³` : ''}
                  </span>
                  <span className="flex gap-2">
                    <a href={person.link} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(s => new Set(s).add(person._id))} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Open WhatsApp
                    </a>
                    <button type="button" onClick={() => markSent(group, person)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${opened.has(person._id) ? 'border-green-600 text-green-700' : 'border-gray-300 text-gray-700'} hover:bg-gray-50`}>
                      <Check className="h-4 w-4" aria-hidden="true" /> Mark as sent
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-surface shadow-sm" aria-labelledby="subscribers-title">
        <div className="p-6 pb-3">
          <h2 id="subscribers-title" className="text-lg font-semibold text-gray-900">Subscribers ({data.total})</h2>
        </div>
        {data.subscribers.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-500">Nobody yet. Share the care calendar, and it is offered after drawing a pool in the pool builder.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">By</th><th className="px-6 py-3">Pool</th><th className="px-6 py-3">Reminders sent</th><th className="px-6 py-3">Since</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.subscribers.map(s => (
                  <tr key={s._id}>
                    <td className="px-6 py-3"><span className="font-medium text-gray-900">{s.firstName}</span><br /><span className="text-gray-500">{s.email}</span></td>
                    <td className="px-6 py-3 text-gray-700">
                      <span className="flex items-center gap-2">
                        {s.channels?.email && <Mail className="h-4 w-4" aria-label="Email" />}
                        {s.channels?.whatsapp && <><MessageCircle className="h-4 w-4 text-green-600" aria-label="WhatsApp" /> {s.phone}</>}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{s.volume ? `${s.volume} m³` : '—'}{s.source === 'builder' && <span className="ms-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">pool builder</span>}</td>
                    <td className="px-6 py-3 text-gray-700">{s.sent?.length || 0}</td>
                    <td className="px-6 py-3 text-gray-500">{shortDate(s.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      <button type="button" onClick={() => remove(s)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Remove ${s.firstName}`}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Reminders;
