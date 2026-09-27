import React, { useCallback, useEffect, useState } from 'react';
import { Star, ThumbsUp, Award, Pencil, Trash2, User } from 'lucide-react';
import axios from 'axios';
import { useCustomer } from '../../context/CustomerContext';
import AuthModal from '../auth/AuthModal';

const SORTS = {
  recent: 'Plus récents',
  helpful: 'Plus utiles',
  rating_desc: 'Mieux notés',
  rating_asc: 'Moins bien notés'
};

const RATING_WORDS = { 1: 'Très décevant', 2: 'Décevant', 3: 'Correct', 4: 'Bien', 5: 'Excellent' };

const EMPTY_FORM = { rating: 0, title: '', comment: '' };

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

// Why saving failed, in the shop's language
const saveError = (error) => {
  if (error.response?.status === 409) return 'Vous avez déjà donné votre avis sur ce produit.';
  if (error.response?.status === 401) return 'Votre session a expiré : reconnectez-vous pour publier votre avis.';
  if (error.response?.status === 400) return 'Vérifiez la note, le titre et le commentaire.';
  return "Votre avis n'a pas pu être enregistré. Veuillez réessayer.";
};

export const Stars = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex" role="img" aria-label={`Note ${rating} sur 5`}>
    {[1, 2, 3, 4, 5].map(value => (
      <Star key={value} aria-hidden="true" className={`${size} ${value <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))}
  </div>
);

const RatingSummary = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
    <div className="text-center">
      <p className="text-4xl font-bold text-gray-900 mb-2">{stats.averageRating.toFixed(1)}</p>
      <div className="flex justify-center"><Stars rating={stats.averageRating} size="w-6 h-6" /></div>
      <p className="text-sm text-gray-600 mt-2">Basé sur {stats.totalReviews} avis</p>
    </div>
    <ul className="space-y-2" aria-label="Répartition des notes">
      {[5, 4, 3, 2, 1].map(rating => {
        const count = stats.ratingDistribution?.[rating] || 0;
        const share = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
        return (
          <li key={rating} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-right">{rating}</span>
            <Star className="w-4 h-4 text-yellow-400 fill-current" aria-hidden="true" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${share}%` }} />
            </div>
            <span className="w-8 text-gray-600">{count}</span>
          </li>
        );
      })}
    </ul>
  </div>
);

const ReviewForm = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm(current => ({ ...current, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) {
      setError('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(saveError(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h4 className="text-lg font-semibold">{initial ? 'Modifier votre avis' : 'Votre avis'}</h4>
      {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</p>}

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">Note</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(value => (
            <label key={value} className="cursor-pointer" title={RATING_WORDS[value]}>
              <input
                type="radio"
                name="review-rating"
                value={value}
                checked={Number(form.rating) === value}
                onChange={() => setForm(current => ({ ...current, rating: value }))}
                className="sr-only peer"
                aria-label={`${value} étoile${value > 1 ? 's' : ''} : ${RATING_WORDS[value]}`}
              />
              <Star
                aria-hidden="true"
                className={`w-8 h-8 rounded peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 ${value <= form.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
              />
            </label>
          ))}
          {form.rating > 0 && <span className="ml-2 text-sm text-gray-600">{RATING_WORDS[form.rating]}</span>}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
        <input id="review-title" value={form.title} onChange={set('title')} maxLength={100} required className={inputClass} placeholder="Résumez votre expérience" />
      </div>
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
        <textarea id="review-comment" value={form.comment} onChange={set('comment')} maxLength={1000} rows={4} required className={inputClass} placeholder="Qu'avez-vous pensé du produit ? Installation, qualité, durée..." />
        <p className="mt-1 text-xs text-gray-500 text-right">{form.comment.length} / 1000</p>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Envoi…' : initial ? 'Enregistrer' : "Publier l'avis"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
      </div>
    </form>
  );
};

const ReviewItem = ({ review, signedIn, onVote, onSignIn }) => {
  const [voting, setVoting] = useState(false);

  const vote = async () => {
    if (!signedIn) {
      onSignIn();
      return;
    }
    setVoting(true);
    try {
      await onVote(review);
    } finally {
      setVoting(false);
    }
  };

  return (
    <li className="p-6 flex items-start gap-4">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-gray-600" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{review.author}</span>
          {review.verified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
              <Award className="w-3 h-3 mr-1" aria-hidden="true" /> Achat vérifié
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-gray-600">
          <Stars rating={review.rating} />
          <span>{formatDate(review.createdAt)}</span>
          {review.editedAt && <span>· modifié</span>}
        </div>
        <h5 className="font-medium text-gray-900 mb-1 break-words">{review.title}</h5>
        <p className="text-gray-700 mb-3 whitespace-pre-line break-words">{review.comment}</p>
        {review.mine ? (
          <p className="text-sm text-gray-500">
            {review.helpfulCount > 0 ? `${review.helpfulCount} personne${review.helpfulCount > 1 ? 's ont' : ' a'} trouvé votre avis utile` : 'Votre avis'}
          </p>
        ) : (
          <button
            type="button"
            onClick={vote}
            disabled={voting}
            aria-pressed={review.votedHelpful}
            className={`inline-flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg border ${review.votedHelpful ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:text-blue-600'}`}
          >
            <ThumbsUp className="w-4 h-4" aria-hidden="true" />
            Utile ({review.helpfulCount})
          </button>
        )}
      </div>
    </li>
  );
};

// Product page → "Avis" tab: the rating summary, the customer's own review
// (to write, change or delete) and everyone's reviews.
const ProductReviews = ({ productId, onStatsChange }) => {
  const { customer, isAuthenticated } = useCustomer();
  const customerKey = customer?._id || customer?.id || null;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const response = await axios.get(`/api/products/${productId}/reviews`, { params: { page, limit: 10, sort } });
      setData(response.data);
    } catch {
      setLoadError(true);
    }
  }, [productId, page, sort]);

  useEffect(() => {
    load();
    // customerKey: signing in or out changes the customer's own review and votes
  }, [load, customerKey]);

  const updated = (message, ratingStats) => {
    setEditing(false);
    setNotice(message);
    if (ratingStats) onStatsChange?.(ratingStats);
    load();
  };

  const save = async (form) => {
    const mine = data?.myReview;
    const response = mine
      ? await axios.put(`/api/products/${productId}/reviews/mine`, form)
      : await axios.post(`/api/products/${productId}/reviews`, form);
    updated(mine ? 'Votre avis a été modifié.' : 'Merci ! Votre avis est publié.', response.data.ratingStats);
  };

  const remove = async () => {
    if (!window.confirm('Supprimer votre avis sur ce produit ?')) return;
    try {
      const response = await axios.delete(`/api/products/${productId}/reviews/mine`);
      updated('Votre avis a été supprimé.', response.data.ratingStats);
    } catch {
      setNotice("Votre avis n'a pas pu être supprimé. Veuillez réessayer.");
    }
  };

  const vote = async (review) => {
    try {
      const response = await axios.post(`/api/products/${productId}/reviews/${review._id}/helpful`, { helpful: !review.votedHelpful });
      setData(current => ({
        ...current,
        reviews: current.reviews.map(item => (item._id === review._id ? { ...item, ...response.data } : item))
      }));
    } catch {
      setNotice("Votre vote n'a pas pu être enregistré.");
    }
  };

  if (loadError && !data) {
    return (
      <p role="alert" className="text-red-700">
        Les avis n’ont pas pu être chargés. <button type="button" onClick={load} className="underline ml-1">Réessayer</button>
      </p>
    );
  }
  if (!data) return <p className="text-gray-500">Chargement des avis…</p>;

  const { reviews, pagination, ratingStats, myReview } = data;
  const hasReviews = ratingStats?.totalReviews > 0;

  return (
    <div className="space-y-6">
      {hasReviews ? <RatingSummary stats={ratingStats} /> : (
        <p className="text-gray-600">Aucun avis pour l’instant. Soyez le premier à donner votre avis sur ce produit.</p>
      )}

      {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}

      <div className="rounded-lg border border-gray-200 p-5">
        {editing ? (
          <ReviewForm
            initial={myReview ? { rating: myReview.rating, title: myReview.title, comment: myReview.comment } : null}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : !isAuthenticated ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-gray-700">Vous avez utilisé ce produit ? Connectez-vous pour donner votre avis.</p>
            <button type="button" onClick={() => setAuthOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Se connecter</button>
          </div>
        ) : myReview ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Votre avis :</span>
              <Stars rating={myReview.rating} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setNotice(''); setEditing(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Pencil className="w-4 h-4" aria-hidden="true" /> Modifier
              </button>
              <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Supprimer
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => { setNotice(''); setEditing(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Pencil className="w-4 h-4" aria-hidden="true" /> Écrire un avis
          </button>
        )}
      </div>

      {hasReviews && (
        <div className="rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <h4 className="font-semibold">{pagination.totalReviews} avis</h4>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Trier
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <ul className="divide-y divide-gray-200">
            {reviews.map(review => (
              <ReviewItem key={review._id} review={review} signedIn={isAuthenticated} onVote={vote} onSignIn={() => setAuthOpen(true)} />
            ))}
          </ul>
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex justify-center items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={!pagination.hasPrev} className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50">Précédent</button>
              <span className="px-3 py-2 text-sm text-gray-600">Page {pagination.currentPage} sur {pagination.totalPages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={!pagination.hasNext} className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50">Suivant</button>
            </div>
          )}
        </div>
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
    </div>
  );
};

export default ProductReviews;
