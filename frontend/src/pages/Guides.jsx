import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import { GUIDE_THEMES, themeOf } from '../utils/guideThemes';

// A guide on the list: its picture (or its theme's icon), theme, title,
// summary and reading time
export const GuideCard = ({ guide }) => {
  const { label, icon: Icon } = themeOf(guide.theme);
  return (
    <Link to={`/conseils/${guide.slug}`} className="panel group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-large">
      <div className="grid aspect-[16/9] place-items-center overflow-hidden bg-blue-50 text-blue-600">
        {guide.image
          ? <img src={guide.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <Icon className="h-12 w-12" aria-hidden="true" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{label}</p>
        <h2 className="mt-2 text-xl font-bold leading-snug text-gray-900">{guide.title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{guide.summary}</p>
        <p className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" /> {guide.readingMinutes} min de lecture</span>
          <span className="inline-flex items-center gap-1 font-medium text-blue-700">Lire <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </p>
      </div>
    </Link>
  );
};

// /conseils: the published guides, by theme
const Guides = () => {
  const [params, setParams] = useSearchParams();
  const theme = GUIDE_THEMES[params.get('theme')] ? params.get('theme') : '';
  const [guides, setGuides] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios.get('/api/guides', { params: theme ? { theme } : {} })
      .then(response => { if (!cancelled) setGuides(response.data.guides || []); })
      .catch(() => { if (!cancelled) setGuides([]); });
    return () => { cancelled = true; };
  }, [theme]);

  const chip = (key, label) => (
    <button
      key={key || 'all'}
      type="button"
      aria-pressed={theme === key}
      onClick={() => setParams(key ? { theme: key } : {}, { replace: true })}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${theme === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Conseils · Par nos techniciens"
        title="Conseils piscine"
        subtitle="Eau verte, hivernage, choix de la pompe, remise en route : ce qu’il faut faire, dans l’ordre, pour une piscine claire toute l’année."
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Thèmes">
          {chip('', 'Tous')}
          {Object.entries(GUIDE_THEMES).map(([key, { label }]) => chip(key, label))}
        </div>

        {guides === null && <p className="mt-10 text-gray-500">Chargement…</p>}
        {guides && guides.length === 0 && (
          <p className="mt-10 text-gray-600">
            Aucun conseil dans ce thème pour l’instant. {theme && <button type="button" className="font-medium text-blue-700 underline" onClick={() => setParams({}, { replace: true })}>Voir tous les conseils</button>}
          </p>
        )}
        {guides && guides.length > 0 && (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map(guide => <li key={guide.slug}><GuideCard guide={guide} /></li>)}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Guides;
