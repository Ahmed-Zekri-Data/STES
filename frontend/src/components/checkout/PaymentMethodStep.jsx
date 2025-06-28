import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckout } from '../../context/CheckoutContext';
import {
  CreditCard,
  Building,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  AlertCircle,
  Smartphone,
  Globe
} from 'lucide-react';

const PaymentMethodStep = () => {
  const { 
    checkoutData, 
    updateCheckoutData, 
    nextStep, 
    prevStep, 
    validateStep,
    paymentMethods 
  } = useCheckout();
  const { payment } = checkoutData;

  const handlePaymentMethodChange = (methodId) => {
    updateCheckoutData('payment', { method: methodId });
  };

  const handleCardDetailsChange = (e) => {
    const { name, value } = e.target;
    updateCheckoutData('payment', {
      cardDetails: {
        ...payment.cardDetails,
        [name]: value
      }
    });
  };

  const handleBankTransferChange = (e) => {
    const { name, value } = e.target;
    updateCheckoutData('payment', {
      bankTransfer: {
        ...payment.bankTransfer,
        [name]: value
      }
    });
  };

  const handleNext = () => {
    if (validateStep(3)) {
      nextStep();
    }
  };

  const getPaymentIcon = (methodId) => {
    switch (methodId) {
      case 'card':
        return <CreditCard className="w-6 h-6" />;
      case 'bank_transfer':
        return <Building className="w-6 h-6" />;
      case 'cash_on_delivery':
        return <Banknote className="w-6 h-6" />;
      case 'paymee':
        return <CreditCard className="w-6 h-6" />;
      case 'flouci':
        return <Smartphone className="w-6 h-6" />;
      case 'd17':
        return <CreditCard className="w-6 h-6" />;
      case 'konnect':
        return <Globe className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mode de Paiement</h2>
        <p className="text-gray-600">Choisissez votre méthode de paiement préférée</p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        {paymentMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <label
              className={`block p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                payment.method === method.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={payment.method === method.id}
                    onChange={() => handlePaymentMethodChange(method.id)}
                    className="sr-only"
                  />
                  
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    payment.method === method.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getPaymentIcon(method.id)}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{method.name}</h3>
                    <p className="text-gray-600">{method.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {method.processingTime}
                      </div>
                      {method.fee > 0 && (
                        <div className="flex items-center text-orange-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          +{method.fee} TND
                        </div>
                      )}
                      {!method.enabled && (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Indisponible
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  payment.method === method.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {payment.method === method.id && (
                    <motion.div
                      className="w-3 h-3 bg-white rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </div>
              </div>
            </label>
          </motion.div>
        ))}
      </div>

      {/* Payment Details */}
      <AnimatePresence mode="wait">
        {payment.method === 'card' && (
          <motion.div
            key="card-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Détails de la Carte
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du porteur *
                </label>
                <input
                  type="text"
                  name="holderName"
                  value={payment.cardDetails.holderName}
                  onChange={handleCardDetailsChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom tel qu'il apparaît sur la carte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de carte *
                </label>
                <input
                  type="text"
                  name="number"
                  value={payment.cardDetails.number}
                  onChange={handleCardDetailsChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mois *
                  </label>
                  <select
                    name="expiryMonth"
                    value={payment.cardDetails.expiryMonth}
                    onChange={handleCardDetailsChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Année *
                  </label>
                  <select
                    name="expiryYear"
                    value={payment.cardDetails.expiryYear}
                    onChange={handleCardDetailsChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">AAAA</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() + i}>
                        {new Date().getFullYear() + i}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV *
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={payment.cardDetails.cvv}
                    onChange={handleCardDetailsChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123"
                    maxLength="4"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-700">
                <Shield className="w-4 h-4 mr-2" />
                Vos informations de paiement sont sécurisées et cryptées
              </div>
            </div>
          </motion.div>
        )}

        {payment.method === 'bank_transfer' && (
          <motion.div
            key="bank-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-green-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations de Virement
            </h3>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Coordonnées bancaires STES:</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Banque:</strong> Banque de Tunisie</p>
                <p><strong>RIB:</strong> 04 018 0000123456789 12</p>
                <p><strong>IBAN:</strong> TN59 04 018 0000123456789 12</p>
                <p><strong>Bénéficiaire:</strong> STES - Société Tunisienne d'Équipements de Piscines</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Instructions importantes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mentionnez votre numéro de commande dans le motif du virement</li>
                    <li>La commande sera traitée après réception du paiement (1-2 jours ouvrables)</li>
                    <li>Conservez votre reçu de virement comme preuve de paiement</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {payment.method === 'cash_on_delivery' && (
          <motion.div
            key="cod-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-orange-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Paiement à la Livraison
            </h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Comment ça marche:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    Votre commande est préparée et expédiée
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    Le livreur vous contacte pour la livraison
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    Vous payez en espèces lors de la réception
                  </li>
                </ul>
              </div>

              <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center text-sm text-orange-800">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Frais de service: 5 TND (inclus dans le total)
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {['paymee', 'flouci', 'd17', 'konnect'].includes(payment.method) && (
          <motion.div
            key="gateway-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Paiement Sécurisé
            </h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Processus de paiement:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    Vous serez redirigé vers la plateforme de paiement sécurisée
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    Saisissez vos informations de paiement
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    Confirmation immédiate et retour sur notre site
                  </li>
                </ul>
              </div>

              <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-sm text-green-800">
                  <Shield className="w-4 h-4 mr-2" />
                  Paiement 100% sécurisé avec cryptage SSL
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <motion.div
        className="flex justify-between pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.button
          onClick={prevStep}
          className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </motion.button>

        <motion.button
          onClick={handleNext}
          disabled={!validateStep(3)}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            validateStep(3)
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={validateStep(3) ? { scale: 1.05 } : {}}
          whileTap={validateStep(3) ? { scale: 0.95 } : {}}
        >
          Réviser la commande
          <ArrowRight className="w-5 h-5 ml-2" />
        </motion.button>
      </motion.div>
    </div>
  );
};

export default PaymentMethodStep;
