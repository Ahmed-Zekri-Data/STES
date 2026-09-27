import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useShopSettings, deliveryEstimate } from '../context/shopSettings';
import { Plus, Minus, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { pickProducts } from '../utils/productPicks';
import { showPlaceholderOnError } from '../utils/images';

// In-stock products from the same categories as the cart, not already in it
const CartSuggestions = ({ cartItems, onAdd, currency }) => {
  const [products, setProducts] = useState([]);
  const cartKey = cartItems.map(item => item._id).sort().join(',');

  useEffect(() => {
    let cancelled = false;
    pickProducts({
      categories: cartItems.map(item => item.category),
      exclude: cartItems.map(item => item._id),
      limit: 4
    })
      .then(picked => { if (!cancelled) setProducts(picked); })
      .catch(error => console.error('Error loading suggestions:', error));
    return () => { cancelled = true; };
    // Again when the products in the cart change, not their quantities
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  if (!products.length) return null;
  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">
        Vous pourriez aussi aimer
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product._id} className="bg-surface rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <Link to={`/product/${product._id}`}>
              <img
                src={product.image}
                onError={showPlaceholderOnError}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            </Link>
            <div className="p-4 flex flex-col flex-1">
              <Link to={`/product/${product._id}`} className="font-semibold text-gray-900 mb-1 hover:text-primary-600">
                {product.name}
              </Link>
              {product.categoryName && <p className="text-sm text-gray-500 mb-2">{product.categoryName}</p>}
              <p className="text-primary-600 font-bold mb-3">
                {Number(product.price).toLocaleString('fr-FR')} {currency}
              </p>
              <button
                type="button"
                onClick={() => onAdd(product)}
                className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" /> Ajouter au panier
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Cart = () => {
  const { delivery } = useShopSettings();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal, 
    clearCart,
    addToCart
  } = useCart();
  const { t } = useLanguage();
  const subtotal = getCartTotal();
  const shipping = deliveryEstimate(subtotal, delivery);

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
              <div key={item._id} className="bg-surface rounded-lg shadow-md p-6">
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
                    {(item.price * item.quantity).toFixed(3)} {t('currency')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Résumé de la commande
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">
                    {subtotal.toFixed(3)} {t('currency')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison:</span>
                  <span className="font-medium">
                    {shipping.free
                      ? <span className="text-green-600">Gratuite</span>
                      : `dès ${shipping.from.toFixed(3)} ${t('currency')}`}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      {t('total')}:
                    </span>
                    <span className="text-xl font-bold text-primary-600">
                      {shipping.free ? '' : 'dès '}{(subtotal + shipping.from).toFixed(3)} {t('currency')}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Prix TTC.
                    {!shipping.free && ' La livraison dépend du gouvernorat : le prix exact s\'affiche à l\'étape Livraison.'}
                    {delivery.cashOnDeliveryFee > 0 && ` Paiement à la livraison : +${delivery.cashOnDeliveryFee} ${t('currency')}.`}
                  </p>
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
                  Livraison gratuite pour les commandes supérieures à {delivery.freeDeliveryOver} TND.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Products */}
        <CartSuggestions cartItems={cartItems} onAdd={addToCart} currency={t('currency')} />
      </div>
    </div>
  );
};

export default Cart;
