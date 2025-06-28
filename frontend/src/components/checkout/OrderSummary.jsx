import React from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { ShoppingBag, Truck, CreditCard, Tag, Shield } from 'lucide-react';

const OrderSummary = () => {
  const { cartItems } = useCart();
  const { calculateTotals, checkoutData } = useCheckout();
  
  const totals = calculateTotals(cartItems);

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg p-6 sticky top-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="ml-3">
          <h2 className="text-xl font-bold text-gray-900">Résumé</h2>
          <p className="text-sm text-gray-600">{cartItems.length} article{cartItems.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-4 mb-6">
        {cartItems.map((item, index) => (
          <motion.div
            key={item._id}
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="w-12 h-12 bg-white rounded-lg overflow-hidden">
              <img
                src={item.image || '/api/placeholder/48/48'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-600">
                Qté: {item.quantity}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {(item.price * item.quantity).toFixed(3)} TND
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Promo Code Section */}
      <motion.div
        className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center mb-3">
          <Tag className="w-4 h-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-900">Code promo</span>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Entrez votre code"
            className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Appliquer
          </button>
        </div>
      </motion.div>

      {/* Order Totals */}
      <motion.div
        className="space-y-3 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Sous-total:</span>
          <span className="font-medium text-gray-900">{totals.subtotal} TND</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <div className="flex items-center">
            <Truck className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-gray-600">Livraison:</span>
          </div>
          <span className="font-medium text-gray-900">
            {parseFloat(totals.deliveryFee) === 0 ? (
              <span className="text-green-600">Gratuite</span>
            ) : (
              `${totals.deliveryFee} TND`
            )}
          </span>
        </div>

        {parseFloat(totals.paymentFee) > 0 && (
          <div className="flex justify-between text-sm">
            <div className="flex items-center">
              <CreditCard className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-gray-600">Frais de paiement:</span>
            </div>
            <span className="font-medium text-gray-900">{totals.paymentFee} TND</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">TVA (19%):</span>
          <span className="font-medium text-gray-900">{totals.taxAmount} TND</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between">
            <span className="text-lg font-semibold text-gray-900">Total:</span>
            <span className="text-xl font-bold text-blue-600">{totals.total} TND</span>
          </div>
        </div>
      </motion.div>

      {/* Delivery Info */}
      {parseFloat(totals.deliveryFee) === 0 && (
        <motion.div
          className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex items-center text-sm text-green-700">
            <Truck className="w-4 h-4 mr-2" />
            <span className="font-medium">Livraison gratuite!</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Commande supérieure à 200 TND
          </p>
        </motion.div>
      )}

      {/* Payment Method Display */}
      {checkoutData.payment.method && (
        <motion.div
          className="mb-6 p-3 bg-gray-50 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center text-sm text-gray-700">
            <CreditCard className="w-4 h-4 mr-2" />
            <span className="font-medium">Mode de paiement:</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {checkoutData.payment.method === 'card' && 'Carte bancaire'}
            {checkoutData.payment.method === 'bank_transfer' && 'Virement bancaire'}
            {checkoutData.payment.method === 'cash_on_delivery' && 'Paiement à la livraison'}
          </p>
        </motion.div>
      )}

      {/* Security Notice */}
      <motion.div
        className="p-4 bg-green-50 rounded-lg border border-green-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div className="flex items-center text-sm text-green-700">
          <Shield className="w-4 h-4 mr-2" />
          <span className="font-medium">Commande sécurisée</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          Vos données sont protégées par cryptage SSL
        </p>
      </motion.div>

      {/* Estimated Delivery */}
      <motion.div
        className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex items-center text-sm text-blue-700 mb-2">
          <Truck className="w-4 h-4 mr-2" />
          <span className="font-medium">Livraison estimée</span>
        </div>
        <p className="text-sm text-blue-600">
          {checkoutData.payment.method === 'bank_transfer' 
            ? '4-5 jours ouvrables (après réception du paiement)'
            : '2-3 jours ouvrables'
          }
        </p>
        {checkoutData.shipping.governorate && (
          <p className="text-xs text-blue-500 mt-1">
            Vers {checkoutData.shipping.governorate}
          </p>
        )}
      </motion.div>

      {/* Customer Support */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <p className="text-xs text-gray-500 mb-2">
          Besoin d'aide ?
        </p>
        <div className="space-y-1">
          <p className="text-xs text-blue-600 font-medium">
            📞 +216 71 123 456
          </p>
          <p className="text-xs text-blue-600 font-medium">
            📧 support@stes.tn
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OrderSummary;
