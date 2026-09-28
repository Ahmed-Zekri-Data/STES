import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

// Addresses the shop does not have (the server also answers them with 404)
const NotFound = () => (
  <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
    <p className="eyebrow">Erreur 404</p>
    <h1 className="mt-3 font-display text-4xl font-bold text-gray-900">Page introuvable</h1>
    <p className="mt-3 text-gray-600">Cette page n’existe pas ou a été déplacée.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link to="/" className="btn-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l’accueil
      </Link>
      <Link to="/shop" className="btn-ghost">
        <Search className="h-4 w-4" aria-hidden="true" /> Voir la boutique
      </Link>
    </div>
  </div>
);

export default NotFound;
