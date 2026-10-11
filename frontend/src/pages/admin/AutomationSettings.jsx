import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, AlertTriangle } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { Section, inputClass } from '../../components/admin/ProductPickers';

// Each automatic email: its switch, its delay (if any), and its count
const EMAILS = [
  {
    key: 'abandonedCart', stat: 'abandoned_cart', title: 'Abandoned cart',
    text: 'One email to customers who gave their email at checkout but did not order, with a link that fills their cart again.',
    delay: { key: 'abandonedCartHours', label: 'Hours after the checkout was left', min: 1, max: 72 }
  },
  {
    key: 'quoteAlert', stat: 'quote_alert', title: 'Unanswered requests (to the admins)',
    text: 'Quote, price and contact requests nobody marked “replied” are listed in one email to the admins.',
    delay: { key: 'quoteAlertHours', label: 'Hours without an answer', min: 1, max: 168 }
  },
  {
    key: 'quoteFollowUp', stat: 'quote_follow_up', title: 'Quote follow-up',
    text: 'Customers whose quote request you marked “replied” are asked if they have questions, unless they ordered since.',
    delay: { key: 'quoteFollowUpDays', label: 'Days after your answer', min: 1, max: 30 }
  },
  {
    key: 'reviewRequest', stat: 'review_request', title: 'Review request',
    text: 'Customers are asked to review their products on the site, and the shop on Google when the review link is set above.',
    delay: { key: 'reviewRequestDays', label: 'Days after delivery', min: 1, max: 60 }
  },
  {
    key: 'replenishment', stat: 'replenishment', title: 'Reorder reminder',
    text: 'Customers are reminded to order consumables again, with a link that puts them in the cart. Set the days on each product (Products → edit → “Reorder reminder”).'
  }
];

// Admin → Settings → Marketing: the automatic emails (sent by the server,
// never at night, never to customers who unsubscribed)
const AutomationSettings = () => {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.get('/admin/settings'), adminApi.get('/admin/automations')])
      .then(([saved, sent]) => { setSettings(saved.data.automations); setStats(sent.data); })
      .catch(error => setLoadError(errorMessage(error)));
  }, []);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the automatic emails: {loadError}</p>;
  if (!settings) return <p className="text-gray-600">Loading…</p>;

  const set = (key, value) => setSettings(current => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await adminApi.put('/admin/settings', { automations: settings });
      setSettings(response.data.settings.automations);
      setResult({ ok: true, message: 'Automatic emails saved' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Section
        title="Automatic emails"
        description="Sent by the shop on its own, in French: never at night, once each, and never to customers who clicked “stop these emails”."
      >
        {stats?.sent && !stats.emailConfigured && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Emails are not set up yet (EMAIL_USER / EMAIL_PASS on the server): nothing is sent until they are.
          </p>
        )}
        <ul className="divide-y divide-gray-200">
          {EMAILS.map(email => (
            <li key={email.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <label className="flex items-center gap-2 font-medium text-gray-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={settings[`${email.key}Enabled`] !== false}
                    onChange={(event) => set(`${email.key}Enabled`, event.target.checked)}
                  />
                  {email.title}
                </label>
                <p className="mt-1 text-sm text-gray-600">{email.text}</p>
                {stats?.sent && <p className="mt-1 text-xs text-gray-500">Sent these 30 days: <span className="font-medium tabular-nums">{stats.sent[email.stat]}</span></p>}
              </div>
              {email.delay && (
                <label className="shrink-0 text-sm text-gray-700 sm:w-48">
                  {email.delay.label}
                  <input
                    type="number"
                    className={`${inputClass} mt-1`}
                    min={email.delay.min}
                    max={email.delay.max}
                    value={settings[email.delay.key]}
                    onChange={(event) => set(email.delay.key, event.target.value === '' ? '' : Number(event.target.value))}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
        {stats?.sent && <p className="text-xs text-gray-500">{stats.optOuts} address{stats.optOuts === 1 ? '' : 'es'} asked to stop these emails.</p>}
      </Section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save automatic emails'}
        </button>
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

export default AutomationSettings;
