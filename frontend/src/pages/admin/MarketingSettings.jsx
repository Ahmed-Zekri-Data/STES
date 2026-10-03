import React, { useEffect, useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { Section, Labelled, inputClass } from '../../components/admin/ProductPickers';

const EMPTY = { gaMeasurementId: '', metaPixelId: '', facebookUrl: '', instagramUrl: '', tiktokUrl: '', googleReviewUrl: '' };

// Admin → Settings → Marketing: audience measurement, the shop's social
// pages, and the link where customers leave a Google review
const MarketingSettings = () => {
  const [marketing, setMarketing] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get('/admin/settings')
      .then(response => setMarketing({ ...EMPTY, ...response.data.marketing }))
      .catch(error => setLoadError(errorMessage(error)));
  }, []);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the marketing settings: {loadError}</p>;
  if (!marketing) return <p className="text-gray-600">Loading…</p>;

  const field = (key) => ({
    id: `marketing-${key}`,
    className: inputClass,
    value: marketing[key],
    onChange: (event) => setMarketing(current => ({ ...current, [key]: event.target.value }))
  });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const response = await adminApi.put('/admin/settings', { marketing });
      setMarketing({ ...EMPTY, ...response.data.settings.marketing });
      setResult({ ok: true, message: 'Marketing settings saved' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Section
        title="Audience measurement"
        description="Visitors are asked first: nothing is measured for those who refuse cookies. Leave a field empty to turn that service off."
      >
        <Labelled
          htmlFor="marketing-gaMeasurementId"
          title="Google Analytics measurement ID"
          hint="In Google Analytics: Admin → Data streams → your website → Measurement ID (starts with G-)."
        >
          <input {...field('gaMeasurementId')} placeholder="G-AB12CD34EF" autoComplete="off" />
        </Labelled>
        <Labelled
          htmlFor="marketing-metaPixelId"
          title="Meta pixel ID (Facebook and Instagram ads)"
          hint="In Meta Events Manager: Data sources → your pixel → the ID under its name (digits only)."
        >
          <input {...field('metaPixelId')} placeholder="123456789012345" inputMode="numeric" autoComplete="off" />
        </Labelled>
        <p className="text-sm text-gray-600">
          Measured: pages seen, products viewed, add to cart, checkout started, orders (with their amount),
          quote and price requests, contact messages, reminder and newsletter sign-ups, searches and new accounts.
        </p>
      </Section>

      <Section title="Social pages" description="Shown as icons at the bottom of every shop page.">
        <Labelled htmlFor="marketing-facebookUrl" title="Facebook page">
          <input {...field('facebookUrl')} type="url" placeholder="https://www.facebook.com/stes.piscines" />
        </Labelled>
        <Labelled htmlFor="marketing-instagramUrl" title="Instagram account">
          <input {...field('instagramUrl')} type="url" placeholder="https://www.instagram.com/stes.piscines" />
        </Labelled>
        <Labelled htmlFor="marketing-tiktokUrl" title="TikTok account">
          <input {...field('tiktokUrl')} type="url" placeholder="https://www.tiktok.com/@stes.piscines" />
        </Labelled>
      </Section>

      <Section title="Google reviews" description="Where customers are sent to leave a review on Google Maps.">
        <Labelled
          htmlFor="marketing-googleReviewUrl"
          title="Review link"
          hint="In Google Business Profile: Ask for reviews → copy the link (https://g.page/r/…)."
        >
          <input {...field('googleReviewUrl')} type="url" placeholder="https://g.page/r/…/review" />
        </Labelled>
      </Section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save marketing settings'}
        </button>
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

export default MarketingSettings;
