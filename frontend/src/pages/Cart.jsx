import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Minus, X, ShoppingBag, ArrowRight } from 'lucide-react';

const Cart = () => {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal, 
    clearCart 
  } = useCart();
  const { t } = useLanguage();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t('cartEmpty')}
            </h1>
            <p className="text-gray-600 mb-8">
              Votre panier est vide. Découvrez nos produits et ajoutez-les à votre panier.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <span>Continuer vos achats</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('cart')} ({cartItems.length} {cartItems.length === 1 ? 'article' : 'articles'})
          </h1>
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Vider le panier
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.image || '/api/placeholder/120/120'}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      Catégorie: {item.category}
                    </p>
                    <p className="text-xl font-bold text-primary-600">
                      {item.price} {t('currency')}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Item Total */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600">
                    Sous-total pour cet article:
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {(item.price * item.quantity).toFixed(2)} {t('currency')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Résumé de la commande
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">
                    {getCartTotal().toFixed(2)} {t('currency')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison:</span>
                  <span className="font-medium">
                    10.00 {t('currency')}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      {t('total')}:
                    </span>
                    <span className="text-xl font-bold text-primary-600">
                      {(getCartTotal() + 10).toFixed(2)} {t('currency')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center block"
                >
                  Procéder au paiement
                </Link>
                <Link
                  to="/shop"
                  className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block"
                >
                  Continuer vos achats
                </Link>
              </div>

              {/* Security Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Paiement sécurisé
                </h3>
                <p className="text-sm text-gray-600">
                  Vos informations de paiement sont protégées et sécurisées.
                </p>
              </div>

              {/* Shipping Info */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">
                  Livraison gratuite
                </h3>
                <p className="text-sm text-blue-700">
                  Livraison gratuite pour les commandes supérieures à 200 TND.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Vous pourriez aussi aimer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Sample recommended products */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <img
                  src={`/api/placeholder/300/200`}
                  alt="Produit recommandé"
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Produit recommandé {i}
                  </h3>
                  <p className="text-primary-600 font-bold">
                    {(Math.random() * 500 + 100).toFixed(0)} {t('currency')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
