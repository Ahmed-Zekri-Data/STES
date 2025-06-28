import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { 
  User, 
  MapPin, 
  CreditCard, 
  ArrowLeft, 
  ShoppingBag,
  CheckCircle,
  Loader,
  AlertCircle,
  FileText
} from 'lucide-react';

const OrderReviewStep = () => {
  const { cartItems } = useCart();
  const { 
    checkoutData, 
    prevStep, 
    calculateTotals, 
    processPayment, 
    isProcessing,
    updateCheckoutData
  } = useCheckout();
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  
  const totals = calculateTotals(cartItems);

  const handlePlaceOrder = async () => {
    if (!agreedToTerms) {
      alert('Veuillez accepter les conditions générales de vente');
      return;
    }

    // Update order notes
    updateCheckoutData('order', { notes: orderNotes });

    try {
      await processPayment(cartItems);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Erreur lors du traitement de la commande. Veuillez réessayer.');
    }
  };

  const getPaymentMethodName = (method) => {
    switch (method) {
      case 'card':
        return 'Carte bancaire';
      case 'bank_transfer':
        return 'Virement bancaire';
      case 'cash_on_delivery':
        return 'Paiement à la livraison';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation de Commande</h2>
        <p className="text-gray-600">Vérifiez vos informations avant de finaliser votre commande</p>
      </div>

      {/* Customer Information */}
      <motion.div
        className="bg-gray-50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-blue-600" />
          Informations Client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Nom:</span>
            <p className="font-medium text-gray-900">
              {checkoutData.customer.firstName} {checkoutData.customer.lastName}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <p className="font-medium text-gray-900">{checkoutData.customer.email}</p>
          </div>
          <div>
            <span className="text-gray-600">Téléphone:</span>
            <p className="font-medium text-gray-900">{checkoutData.customer.phone}</p>
          </div>
          {checkoutData.customer.company && (
            <div>
              <span className="text-gray-600">Entreprise:</span>
              <p className="font-medium text-gray-900">{checkoutData.customer.company}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Shipping Address */}
      <motion.div
        className="bg-gray-50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-green-600" />
          Adresse de Livraison
        </h3>
        <div className="text-sm">
          <p className="font-medium text-gray-900">{checkoutData.shipping.address}</p>
          <p className="text-gray-600">
            {checkoutData.shipping.city}, {checkoutData.shipping.governorate}
          </p>
          {checkoutData.shipping.postalCode && (
            <p className="text-gray-600">{checkoutData.shipping.postalCode}</p>
          )}
          <p className="text-gray-600">{checkoutData.shipping.country}</p>
        </div>
      </motion.div>

      {/* Payment Method */}
      <motion.div
        className="bg-gray-50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
          Mode de Paiement
        </h3>
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {getPaymentMethodName(checkoutData.payment.method)}
          </p>
          {checkoutData.payment.method === 'card' && checkoutData.payment.cardDetails.holderName && (
            <p className="text-gray-600 mt-1">
              Carte au nom de {checkoutData.payment.cardDetails.holderName}
            </p>
          )}
        </div>
      </motion.div>

      {/* Order Items */}
      <motion.div
        className="bg-gray-50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShoppingBag className="w-5 h-5 mr-2 text-orange-600" />
          Articles Commandés
        </h3>
        <div className="space-y-3">
          {cartItems.map((item, index) => (
            <motion.div
              key={item._id}
              className="flex items-center space-x-4 bg-white rounded-lg p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <img
                src={item.image || '/api/placeholder/60/60'}
                alt={item.name}
                className="w-15 h-15 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                <p className="text-sm text-gray-600">Prix unitaire: {item.price.toFixed(3)} TND</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {(item.price * item.quantity).toFixed(3)} TND
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Total */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total:</span>
              <span className="font-medium">{totals.subtotal} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Livraison:</span>
              <span className="font-medium">
                {parseFloat(totals.deliveryFee) === 0 ? 'Gratuite' : `${totals.deliveryFee} TND`}
              </span>
            </div>
            {parseFloat(totals.paymentFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frais de paiement:</span>
                <span className="font-medium">{totals.paymentFee} TND</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">TVA (19%):</span>
              <span className="font-medium">{totals.taxAmount} TND</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span className="text-blue-600">{totals.total} TND</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Order Notes */}
      <motion.div
        className="bg-gray-50 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-gray-600" />
          Notes de Commande (Optionnel)
        </h3>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows="3"
          placeholder="Instructions spéciales pour la livraison, préférences d'horaire, etc."
        />
      </motion.div>

      {/* Terms and Conditions */}
      <motion.div
        className="bg-blue-50 rounded-xl p-6 border border-blue-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 text-blue-600 rounded"
          />
          <div className="text-sm">
            <p className="text-gray-900">
              J'accepte les{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                conditions générales de vente
              </a>{' '}
              et la{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                politique de confidentialité
              </a>
            </p>
            <p className="text-gray-600 mt-1">
              En passant cette commande, vous confirmez avoir lu et accepté nos conditions.
            </p>
          </div>
        </label>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex justify-between pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <motion.button
          onClick={prevStep}
          disabled={isProcessing}
          className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </motion.button>

        <motion.button
          onClick={handlePlaceOrder}
          disabled={!agreedToTerms || isProcessing}
          className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all duration-300 ${
            agreedToTerms && !isProcessing
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={agreedToTerms && !isProcessing ? { scale: 1.05 } : {}}
          whileTap={agreedToTerms && !isProcessing ? { scale: 0.95 } : {}}
        >
          {isProcessing ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirmer la commande
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Security Notice */}
      <motion.div
        className="text-center text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>Commande sécurisée par cryptage SSL</span>
        </div>
        <p>Vos informations de paiement sont protégées et ne sont jamais stockées sur nos serveurs.</p>
      </motion.div>
    </div>
  );
};

export default OrderReviewStep;
