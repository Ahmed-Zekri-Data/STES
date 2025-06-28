import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  User,
  Calendar,
  Award,
  Filter,
  ChevronDown,
  Edit3
} from 'lucide-react';
import axios from 'axios';
import { useCustomer } from '../../context/CustomerContext';
import LoadingSpinner from '../LoadingSpinner';

const ProductReviews = ({ productId }) => {
  const { customer } = useCustomer();
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReviews: 0
  });

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId, sortBy, sortOrder, pagination.currentPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/products/${productId}/reviews`, {
        params: {
          page: pagination.currentPage,
          limit: 10,
          sortBy,
          sortOrder
        }
      });

      setReviews(response.data.reviews);
      setRatingStats(response.data.ratingStats);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!customer) {
      alert('Vous devez être connecté pour laisser un avis');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/products/${productId}/reviews`, reviewForm);
      
      // Reset form and refresh reviews
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, size = 'w-4 h-4') => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${size} ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!ratingStats) return null;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingStats.ratingDistribution[rating] || 0;
          const percentage = ratingStats.totalReviews > 0 
            ? (count / ratingStats.totalReviews) * 100 
            : 0;

          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="w-8">{rating}</span>
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      {ratingStats && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-xl font-semibold mb-4">Avis clients</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {ratingStats.averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(ratingStats.averageRating), 'w-6 h-6')}
              <div className="text-sm text-gray-600 mt-2">
                Basé sur {ratingStats.totalReviews} avis
              </div>
            </div>

            {/* Rating Distribution */}
            <div>
              <h4 className="font-medium mb-3">Répartition des notes</h4>
              {renderRatingDistribution()}
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      <div className="bg-white rounded-lg border p-6">
        {!showReviewForm ? (
          <button
            onClick={() => setShowReviewForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Écrire un avis</span>
          </button>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <h4 className="text-lg font-semibold">Votre avis</h4>
            
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, rating }))}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        rating <= reviewForm.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      } hover:text-yellow-400 transition-colors`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de l'avis
              </label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Résumez votre expérience..."
                required
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre avis détaillé
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Partagez votre expérience avec ce produit..."
                required
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {submitting ? 'Envoi...' : 'Publier l\'avis'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg border">
        {/* Sort Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {pagination.totalReviews} avis
            </h4>
            <div className="flex items-center space-x-2">
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('_');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt_desc">Plus récents</option>
                <option value="createdAt_asc">Plus anciens</option>
                <option value="rating_desc">Mieux notés</option>
                <option value="rating_asc">Moins bien notés</option>
                <option value="helpful_desc">Plus utiles</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="divide-y divide-gray-200">
          {reviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6"
            >
              <div className="flex items-start space-x-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {review.customer.avatar ? (
                    <img
                      src={review.customer.avatar}
                      alt={`${review.customer.firstName} ${review.customer.lastName}`}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {review.customer.firstName} {review.customer.lastName}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1" />
                        Achat vérifié
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-600">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  <h5 className="font-medium text-gray-900 mb-2">
                    {review.title}
                  </h5>

                  <p className="text-gray-700 mb-3">
                    {review.comment}
                  </p>

                  {/* Helpful buttons */}
                  <div className="flex items-center space-x-4 text-sm">
                    <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Utile ({review.helpful?.filter(h => h.isHelpful).length || 0})</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                      <span>Pas utile</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Précédent
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {pagination.currentPage} sur {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={!pagination.hasNext}
                className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
