import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCheckout } from '../../context/CheckoutContext';
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Phone, 
  Truck, 
  Calendar,
  ShoppingBag,
  Home,
  Share2,
  Printer
} from 'lucide-react';

const OrderConfirmationStep = () => {
  const navigate = useNavigate();
  const { orderConfirmation, resetCheckout } = useCheckout();

  if (!orderConfirmation) {
    return null;
  }

  const handleContinueShopping = () => {
    resetCheckout();
    navigate('/shop');
  };

  const handleGoHome = () => {
    resetCheckout();
    navigate('/');
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ma commande STES',
        text: `Commande ${orderConfirmation.orderId} confirmée!`,
        url: window.location.href
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    <div className="max-w-4xl mx-auto">
      {/* Success Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>
        
        <motion.h1
          className="text-4xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Commande Confirmée! 🎉
        </motion.h1>
        
        <motion.p
          className="text-xl text-gray-600 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Merci pour votre commande chez STES
        </motion.p>
        
        <motion.div
          className="bg-blue-50 rounded-lg p-4 inline-block"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-sm text-blue-700 mb-1">Numéro de commande:</p>
          <p className="text-2xl font-bold text-blue-900">{orderConfirmation.orderId}</p>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="flex justify-center space-x-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        <button
          onClick={handlePrintOrder}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </button>
        
        <button
          onClick={handleShareOrder}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </button>
        
        <button className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Télécharger PDF
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Details */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
              Détails de la Commande
            </h2>
            
            <div className="space-y-4">
              {orderConfirmation.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={item.image || '/api/placeholder/50/50'}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">Qté: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {(item.price * item.quantity).toFixed(3)} TND
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">{orderConfirmation.totals.subtotal} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison:</span>
                  <span className="font-medium">
                    {parseFloat(orderConfirmation.totals.deliveryFee) === 0 ? 'Gratuite' : `${orderConfirmation.totals.deliveryFee} TND`}
                  </span>
                </div>
                {parseFloat(orderConfirmation.totals.paymentFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais de paiement:</span>
                    <span className="font-medium">{orderConfirmation.totals.paymentFee} TND</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (19%):</span>
                  <span className="font-medium">{orderConfirmation.totals.taxAmount} TND</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total:</span>
                  <span className="text-blue-600">{orderConfirmation.totals.total} TND</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informations de Paiement</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Mode de paiement:</span>
                <p className="font-medium text-gray-900">
                  {getPaymentMethodName(orderConfirmation.payment.method)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Statut:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                  Confirmé
                </span>
              </div>
              {orderConfirmation.payment.method === 'bank_transfer' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    Instructions de virement:
                  </p>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p><strong>RIB:</strong> 04 018 0000123456789 12</p>
                    <p><strong>Référence:</strong> {orderConfirmation.orderId}</p>
                    <p className="text-xs mt-2">
                      Votre commande sera traitée après réception du paiement.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Delivery & Contact Info */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
        >
          {/* Delivery Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-green-600" />
              Informations de Livraison
            </h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-gray-600">Adresse de livraison:</span>
                <div className="mt-1">
                  <p className="font-medium text-gray-900">{orderConfirmation.shipping.address}</p>
                  <p className="text-gray-600">
                    {orderConfirmation.shipping.city}, {orderConfirmation.shipping.governorate}
                  </p>
                  <p className="text-gray-600">{orderConfirmation.shipping.country}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-gray-600">Livraison estimée:</span>
                  <p className="font-medium text-gray-900">
                    {formatDate(orderConfirmation.estimatedDelivery)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium mb-2">
                Suivi de commande:
              </p>
              <p className="text-sm text-blue-600">
                Vous recevrez un email avec le numéro de suivi dès l'expédition de votre commande.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Besoin d'Aide ?</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Service Client</p>
                  <p className="text-blue-600">+216 71 123 456</p>
                  <p className="text-xs text-gray-500">Lun-Ven: 8h-18h, Sam: 8h-13h</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-green-600">support@stes.tn</p>
                  <p className="text-xs text-gray-500">Réponse sous 24h</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Référence de commande:</strong> {orderConfirmation.orderId}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Gardez cette référence pour toute communication concernant votre commande.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Prochaines Étapes</h2>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Confirmation par email</p>
                  <p className="text-sm text-gray-600">Vous recevrez un email de confirmation dans quelques minutes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Préparation de commande</p>
                  <p className="text-sm text-gray-600">Votre commande sera préparée dans nos entrepôts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Expédition et livraison</p>
                  <p className="text-sm text-gray-600">Livraison à votre adresse selon les délais annoncés</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.6 }}
      >
        <motion.button
          onClick={handleContinueShopping}
          className="flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Continuer mes achats
        </motion.button>
        
        <motion.button
          onClick={handleGoHome}
          className="flex items-center justify-center px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Home className="w-5 h-5 mr-2" />
          Retour à l'accueil
        </motion.button>
      </motion.div>
    </div>
  );
};

export default OrderConfirmationStep;
