import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Clock, ArrowLeft, MessageCircle, Bell } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import { GuideCard } from './Guides';
import { themeOf, longDate } from '../utils/guideThemes';
import { useShopSettings, whatsappLink } from '../context/shopSettings';
import { usePageMeta } from '../utils/pageMeta';

// /conseils/<slug>: one guide, the products it recommends, a way to ask a
// technician, and more guides of the same theme
const Guide = () => {
  const { slug } = useParams();
  const { contact } = useShopSettings();
  const [data, setData] = useState(null); // { guide, products, related } or 'missing'

  useEffect(() => {
    let cancelled = false;
    setData(null);
    axios.get(`/api/guides/${encodeURIComponent(slug)}`)
      .then(response => { if (!cancelled) setData(response.data); })
      .catch(() => { if (!cancelled) setData('missing'); });
    return () => { cancelled = true; };
  }, [slug]);

  const guide = data && data !== 'missing' ? data.guide : null;
  usePageMeta(guide
    ? { title: guide.title, description: guide.summary, path: `/conseils/${guide.slug}`, type: 'article', ...(guide.image && { image: guide.image }) }
    : data === 'missing' ? { title: 'Conseil introuvable', noindex: true } : null);

  if (data === null) return <p className="mx-auto max-w-3xl px-4 py-24 text-gray-500">Chargement…</p>;
  if (data === 'missing') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="text-3xl font-bold text-gray-900">Conseil introuvable</h1>
        <p className="mt-3 text-gray-600">Ce conseil n’existe pas ou n’est plus en ligne.</p>
        <Link to="/conseils" className="btn-brand mt-6">Voir tous les conseils</Link>
      </div>
    );
  }

  const { label, icon: Icon } = themeOf(guide.theme);
  const whatsapp = whatsappLink(contact.whatsapp);

  return (
    <article className="pb-24">
      <header className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <nav aria-label="Fil d’Ariane" className="text-sm">
          <Link to="/conseils" className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Conseils
          </Link>
        </nav>
        <p className="eyebrow mt-6 inline-flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" /> {label}</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-gray-900 sm:text-5xl">{guide.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">{guide.summary}</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" /> {guide.readingMinutes} min de lecture</span>
          <span>Mis à jour le {longDate(guide.updatedAt)}</span>
        </p>
      </header>

      {guide.image && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <img src={guide.image} alt="" className="aspect-[16/9] w-full rounded-3xl object-cover" />
        </div>
      )}

      {/* The text is cleaned by the server when the guide is saved */}
      <div className="prose-stes mx-auto mt-10 px-4 sm:px-6" dangerouslySetInnerHTML={{ __html: guide.body }} />

      <aside className="mx-auto mt-12 max-w-3xl px-4 sm:px-6" aria-label="Besoin d’aide">
        <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Une question sur votre piscine ?</h2>
            <p className="mt-1 text-sm text-gray-600">Un technicien STES vous répond, et peut se déplacer chez vous.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-brand">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
              </a>
            )}
            <Link to="/entretien#rappels" className="btn-ghost"><Bell className="h-4 w-4" aria-hidden="true" /> Rappels d’entretien</Link>
          </div>
        </div>
      </aside>

      {data.products.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="guide-products">
          <h2 id="guide-products" className="font-display text-2xl font-bold text-gray-900">Les produits pour cela</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
          </div>
        </section>
      )}

      {data.related.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="guide-related">
          <h2 id="guide-related" className="font-display text-2xl font-bold text-gray-900">À lire aussi</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.related.map(item => <li key={item.slug}><GuideCard guide={item} /></li>)}
          </ul>
        </section>
      )}
    </article>
  );
};

export default Guide;
