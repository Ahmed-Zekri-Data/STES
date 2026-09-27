import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Trash2, Award, ThumbsUp, ExternalLink } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';

const PAGE_SIZE = 20;

const Stars = ({ rating }) => (
  <div className="flex" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(value => (
      <Star key={value} aria-hidden="true" className={`w-4 h-4 ${value <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))}
  </div>
);

const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const customerName = (customer) =>
  customer?.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Deleted customer';

// Admin → Reviews: what customers wrote about the products, newest first.
// Reviews that break the rules (spam, insults, personal details) can be
// removed; the product's rating is recalculated.
const Reviews = () => {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Search once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await adminApi.get('/admin/reviews', {
        params: { page, limit: PAGE_SIZE, rating: rating || undefined, search: query || undefined }
      });
      setData(response.data);
    } catch (err) {
      setError(`Reviews could not be loaded: ${errorMessage(err)}`);
    }
  }, [page, rating, query]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (review) => {
    if (!window.confirm(`Delete ${customerName(review.customer)}'s review "${review.title}"? This cannot be undone.`)) return;
    try {
      await adminApi.delete(`/admin/reviews/${review.product._id}/${review._id}`);
      setNotice(`Review deleted. The rating of ${review.product.name} has been updated.`);
      load();
    } catch (err) {
      setNotice(`The review could not be deleted: ${errorMessage(err)}`);
    }
  };

  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a product, title or comment"
            aria-label="Search reviews"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
          />
        </div>
        <select
          value={rating}
          onChange={(e) => { setRating(e.target.value); setPage(1); }}
          aria-label="Filter by rating"
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {notice && <p role="status" className="text-sm text-blue-700">{notice}</p>}
      {error && (
        <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error} <button type="button" onClick={load} className="underline ml-2">Retry</button>
        </p>
      )}
      {!data && !error && <p className="text-gray-500">Loading…</p>}

      {data && data.reviews.length === 0 && (
        <div className="bg-surface rounded-xl shadow-sm p-8 text-center text-gray-600">
          {query || rating ? 'No review matches these filters.' : 'No customer has reviewed a product yet.'}
        </div>
      )}

      {data?.reviews.length > 0 && (
        <>
          <p className="text-sm text-gray-600">{pagination.totalReviews} review{pagination.totalReviews > 1 ? 's' : ''}</p>
          <ul className="space-y-4">
            {data.reviews.map(review => (
              <li key={review._id} className="bg-surface rounded-xl shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <Link to={`/product/${review.product._id}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">
                      {review.product.name} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                    <p className="text-sm text-gray-600 break-words">
                      {customerName(review.customer)}
                      {review.customer?.email && <> · <a href={`mailto:${review.customer.email}`} className="hover:underline">{review.customer.email}</a></>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(review)}
                    className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-600">
                  <Stars rating={review.rating} />
                  <span>{formatDate(review.createdAt)}</span>
                  {review.editedAt && <span>· edited {formatDate(review.editedAt)}</span>}
                  {review.verified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                      <Award className="w-3 h-3 mr-1" aria-hidden="true" /> Verified purchase
                    </span>
                  )}
                  {review.helpfulCount > 0 && (
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /> {review.helpfulCount}</span>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 mt-2 break-words">{review.title}</h3>
                <p className="text-gray-700 whitespace-pre-line break-words">{review.comment}</p>
              </li>
            ))}
          </ul>
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={!pagination.hasPrev} className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50">Previous</button>
              <span className="text-sm text-gray-600">Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={!pagination.hasNext} className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reviews;
