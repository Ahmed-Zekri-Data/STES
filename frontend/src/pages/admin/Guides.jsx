import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2, ExternalLink, ArrowLeft, Eye, Pencil, CheckCircle, Upload } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { loadAllProducts } from '../../utils/adminProducts';
import { Section, ProductList, Labelled, inputClass } from '../../components/admin/ProductPickers';
import { GUIDE_THEMES } from '../../utils/guideThemes';

const EMPTY = { title: '', slug: '', theme: 'entretien', summary: '', image: '', body: '', products: [], published: false };

const shortDate = (date) => (date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// One guide: its texts (in French, as customers read them), picture,
// recommended products, and whether it is on the site
const GuideEditor = ({ initial, products, onSaved, onDeleted, onBack }) => {
  const [guide, setGuide] = useState({ ...EMPTY, ...initial, image: initial?.image || '', products: (initial?.products || []).map(String) });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [result, setResult] = useState(null);
  const set = (key) => (event) => setGuide(current => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await adminApi.post('/admin/uploads/product-image', body, { timeout: 60000 });
      setGuide(current => ({ ...current, image: response.data.url }));
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const { title, slug, theme, summary, image, body, products: refs, published } = guide;
      const payload = { title, slug, theme, summary, image, body, products: refs, published };
      const response = guide._id
        ? await adminApi.put(`/admin/guides/${guide._id}`, payload)
        : await adminApi.post('/admin/guides', payload);
      const saved = response.data.guide;
      setGuide(current => ({ ...current, ...saved, image: saved.image || '', products: saved.products || [] }));
      setResult({ ok: true, message: saved.published ? 'Guide saved and on the site' : 'Draft saved (not on the site)' });
      onSaved(saved);
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await adminApi.delete(`/admin/guides/${guide._id}`);
      onDeleted(guide._id);
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All guides
      </button>

      <Section title={guide._id ? 'Edit guide' : 'New guide'} description="Texts are in French, as customers read them. Check doses and settings against the products you sell before publishing.">
        <Labelled htmlFor="guide-title" title="Title" hint="What people would type in Google, e.g. “Eau verte dans la piscine : la rattraper en 48 heures”">
          <input id="guide-title" className={inputClass} value={guide.title} onChange={set('title')} maxLength={110} required />
        </Labelled>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Labelled htmlFor="guide-slug" title="Address" hint="Empty: made from the title. Changing it breaks links already shared.">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">/conseils/</span>
              <input id="guide-slug" className={inputClass} value={guide.slug} onChange={set('slug')} maxLength={80} placeholder="eau-verte-piscine" />
            </div>
          </Labelled>
          <Labelled htmlFor="guide-theme" title="Theme">
            <select id="guide-theme" className={inputClass} value={guide.theme} onChange={set('theme')}>
              {Object.entries(GUIDE_THEMES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Labelled>
        </div>
        <Labelled htmlFor="guide-summary" title="Summary" hint={`${guide.summary.length} / 160 characters: under the title, on the list, and in Google’s results`}>
          <textarea id="guide-summary" rows={2} className={inputClass} value={guide.summary} onChange={set('summary')} maxLength={160} required />
        </Labelled>
        <Labelled htmlFor="guide-image" title="Picture (optional)" hint="A photo of a real STES pool or job works best. Without one, the theme’s icon is shown.">
          <div className="flex flex-wrap items-center gap-2">
            <input id="guide-image" className={`${inputClass} flex-1`} value={guide.image} onChange={set('image')} placeholder="https://… or upload" />
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} />
            </label>
          </div>
        </Labelled>
      </Section>

      <Section title="Text" description={'HTML: <h2> for sections, <p> for paragraphs, <ul>/<ol> with <li> for lists, <strong> for bold, <a href="/construire"> for links. Scripts and styles are removed when saving.'}>
        <div className="flex gap-2" role="group" aria-label="Text view">
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${!preview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}><Pencil className="h-4 w-4" /> Write</button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${preview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}><Eye className="h-4 w-4" /> Preview</button>
        </div>
        {preview
          // Shown to the admin only; the server cleans the text when it is saved
          ? <div className="prose-stes rounded-xl border border-gray-200 p-5" dangerouslySetInnerHTML={{ __html: guide.body }} />
          : <textarea id="guide-body" aria-label="Text of the guide" rows={22} className={`${inputClass} font-mono text-sm`} value={guide.body} onChange={set('body')} required />}
      </Section>

      <Section title="Recommended products" description="Shown under the guide with their price and an add-to-cart button. Up to 6.">
        <ProductList id="guide-products" value={guide.products} products={products} max={6} onChange={(refs) => setGuide(current => ({ ...current, products: refs }))} />
      </Section>

      <Section title="On the site">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" className="h-4 w-4 rounded" checked={guide.published} onChange={set('published')} />
          Published: visible on /conseils, in the sitemap and in search engines
        </label>
        {guide._id && guide.published && guide.slug && (
          <a href={`/conseils/${guide.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
            View on the site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save the guide'}
        </button>
        {guide._id && (confirmDelete ? (
          <span className="flex items-center gap-2 text-sm">
            Delete this guide?
            <button type="button" onClick={remove} className="rounded-lg border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50">Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">No</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-700"><Trash2 className="h-4 w-4" /> Delete</button>
        ))}
        {result && (result.ok
          ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
          : <p role="alert" className="text-sm text-red-600">{result.message}</p>)}
      </div>
    </form>
  );
};

// Admin → Guides: the "Conseils" articles of the shop
const Guides = () => {
  const { hasPermission } = useAdmin();
  const [guides, setGuides] = useState(null);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null); // a guide, EMPTY for a new one, or null for the list
  const [loadError, setLoadError] = useState('');
  const canManageProducts = hasPermission('products');

  useEffect(() => {
    Promise.all([adminApi.get('/admin/guides'), loadAllProducts(canManageProducts)])
      .then(([response, list]) => { setGuides(response.data.guides); setProducts(list); })
      .catch(error => setLoadError(errorMessage(error)));
  }, [canManageProducts]);

  if (loadError) return <p role="alert" className="text-red-600">Could not load the guides: {loadError}</p>;
  if (!guides) return <p className="text-gray-600">Loading…</p>;

  if (editing) {
    return (
      <GuideEditor
        key={editing._id || 'new'}
        initial={editing}
        products={products}
        onBack={() => setEditing(null)}
        onSaved={(saved) => setGuides(list => [saved, ...list.filter(g => g._id !== saved._id)])}
        onDeleted={(id) => { setGuides(list => list.filter(g => g._id !== id)); setEditing(null); }}
      />
    );
  }

  const drafts = guides.filter(g => !g.published).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guides</h1>
          <p className="text-sm text-gray-600">The “Conseils” articles: they bring visitors from Google and lead them to the products.</p>
        </div>
        <button type="button" onClick={() => setEditing(EMPTY)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New guide
        </button>
      </div>

      {drafts > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {drafts === 1 ? '1 draft waits' : `${drafts} drafts wait`} for a technician to read: check doses and settings, choose the recommended products, then tick “Published”.
        </p>
      )}

      {guides.length === 0 ? (
        <p className="text-gray-600">No guide yet. On the server, <code>npm run init:guides</code> adds the first five as drafts.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="px-6 py-3">Guide</th><th className="px-6 py-3">Theme</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Updated</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guides.map(guide => (
                <tr key={guide._id}>
                  <td className="px-6 py-3"><span className="font-medium text-gray-900">{guide.title}</span><br /><span className="text-gray-500">/conseils/{guide.slug}</span></td>
                  <td className="px-6 py-3 text-gray-700">{GUIDE_THEMES[guide.theme]?.label || guide.theme}</td>
                  <td className="px-6 py-3">
                    {guide.published
                      ? <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">published</span>
                      : <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">draft</span>}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{shortDate(guide.updatedAt)}</td>
                  <td className="px-6 py-3 text-right">
                    <button type="button" onClick={() => setEditing(guide)} aria-label={`Edit ${guide.title}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"><Pencil className="h-4 w-4" /> Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Guides;
