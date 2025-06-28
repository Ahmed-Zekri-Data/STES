import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, CreditCard, Truck, Package, ArrowRight, Home, Receipt } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');

  const paymentReference = searchParams.get('payment_ref') || searchParams.get('reference');
  const status = searchParams.get('status');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentReference && !orderId) {
        setPaymentStatus('error');
        setError('Référence de paiement manquante');
        return;
      }

      try {
        // Check payment status
        if (paymentReference) {
          const response = await fetch(`/api/payments/${paymentReference}/status`);
          if (response.ok) {
            const data = await response.json();
            setPaymentData(data);
            setOrderData(data.order);
            
            // Determine final status
            if (data.status === 'completed') {
              setPaymentStatus('success');
            } else if (data.status === 'failed' || data.status === 'cancelled') {
              setPaymentStatus('failed');
            } else {
              setPaymentStatus('pending');
            }
          } else {
            throw new Error('Payment not found');
          }
        } else {
          // Handle status from URL parameters
          if (status === 'success' || status === 'completed') {
            setPaymentStatus('success');
          } else if (status === 'failed' || status === 'cancelled' || status === 'cancel') {
            setPaymentStatus('failed');
          } else {
            setPaymentStatus('pending');
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setPaymentStatus('error');
        setError(error.message || 'Erreur lors de la vérification du paiement');
      }
    };

    verifyPayment();
  }, [paymentReference, status, orderId]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case 'loading':
        return <LoadingSpinner size="lg" />;
      default:
        return <XCircle className="w-16 h-16 text-red-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Paiement réussi !';
      case 'failed':
        return 'Paiement échoué';
      case 'pending':
        return 'Paiement en cours';
      case 'loading':
        return 'Vérification du paiement...';
      default:
        return 'Erreur de paiement';
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Votre paiement a été traité avec succès. Votre commande est confirmée.';
      case 'failed':
        return 'Le paiement n\'a pas pu être traité. Veuillez réessayer ou choisir un autre mode de paiement.';
      case 'pending':
        return 'Votre paiement est en cours de traitement. Vous recevrez une confirmation par email.';
      case 'loading':
        return 'Nous vérifions le statut de votre paiement...';
      default:
        return error || 'Une erreur s\'est produite lors du traitement de votre paiement.';
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'success':
        return 'green';
      case 'failed':
      case 'error':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Vérification du paiement en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className={`px-8 py-12 text-center bg-gradient-to-r ${
            paymentStatus === 'success' ? 'from-green-500 to-emerald-500' :
            paymentStatus === 'failed' || paymentStatus === 'error' ? 'from-red-500 to-pink-500' :
            paymentStatus === 'pending' ? 'from-yellow-500 to-orange-500' :
            'from-gray-500 to-gray-600'
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="bg-white rounded-full p-4">
                {getStatusIcon()}
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-4"
            >
              {getStatusTitle()}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90"
            >
              {getStatusMessage()}
            </motion.p>
          </div>

          {/* Payment Details */}
          {paymentData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="px-8 py-6 border-b border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails du paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Référence de paiement</p>
                  <p className="font-medium text-gray-900">{paymentData.paymentReference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant</p>
                  <p className="font-medium text-gray-900">{paymentData.amount} {paymentData.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mode de paiement</p>
                  <p className="font-medium text-gray-900 capitalize">{paymentData.paymentMethod.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(paymentData.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Order Details */}
          {orderData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="px-8 py-6 border-b border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la commande</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Numéro de commande</p>
                  <p className="font-medium text-gray-900">{orderData.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut de la commande</p>
                  <p className="font-medium text-gray-900 capitalize">{orderData.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de la commande</p>
                  <p className="font-medium text-gray-900">{orderData.totalAmount} TND</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="px-8 py-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
            
            {paymentStatus === 'success' && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Confirmation par email</p>
                    <p className="text-sm text-gray-600">Vous recevrez un email de confirmation avec les détails de votre commande.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Préparation de la commande</p>
                    <p className="text-sm text-gray-600">Votre commande sera préparée dans les 24-48 heures.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Livraison</p>
                    <p className="text-sm text-gray-600">Vous pourrez suivre votre commande en temps réel.</p>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Votre paiement est en cours de traitement. Cela peut prendre quelques minutes. 
                  Vous recevrez une notification dès que le paiement sera confirmé.
                </p>
              </div>
            )}

            {(paymentStatus === 'failed' || paymentStatus === 'error') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-3">
                  Le paiement n'a pas pu être traité. Vous pouvez :
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• Réessayer avec le même mode de paiement</li>
                  <li>• Choisir un autre mode de paiement</li>
                  <li>• Contacter notre service client pour assistance</li>
                </ul>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="px-8 py-6 bg-gray-50 flex flex-col sm:flex-row gap-4"
          >
            {paymentStatus === 'success' && (
              <>
                {orderData && (
                  <Link
                    to={`/track-order?order=${orderData.orderNumber}`}
                    className="flex-1"
                  >
                    <AnimatedButton className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center">
                      <Package className="w-5 h-5 mr-2" />
                      Suivre ma commande
                    </AnimatedButton>
                  </Link>
                )}
                <Link to="/" className="flex-1">
                  <AnimatedButton className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
                    <Home className="w-5 h-5 mr-2" />
                    Retour à l'accueil
                  </AnimatedButton>
                </Link>
              </>
            )}

            {paymentStatus === 'pending' && (
              <>
                <AnimatedButton
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
                >
                  Actualiser le statut
                </AnimatedButton>
                <Link to="/" className="flex-1">
                  <AnimatedButton className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200">
                    Retour à l'accueil
                  </AnimatedButton>
                </Link>
              </>
            )}

            {(paymentStatus === 'failed' || paymentStatus === 'error') && (
              <>
                <AnimatedButton
                  onClick={() => navigate('/cart')}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                >
                  Réessayer le paiement
                </AnimatedButton>
                <Link to="/contact" className="flex-1">
                  <AnimatedButton className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200">
                    Contacter le support
                  </AnimatedButton>
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentResult;
