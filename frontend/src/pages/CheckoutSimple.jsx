import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { CreditCard, Truck, Shield, CheckCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

const CheckoutSimple = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: ''
    },
    shipping: {
      address: '',
      city: '',
      governorate: '',
      postalCode: ''
    },
    payment: {
      method: 'cash_on_delivery'
    }
  });
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Tunisian Governorates
  const tunisianGovernorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Kairouan',
    'Kasserine', 'Sidi Bouzid', 'Sousse', 'Monastir', 'Mahdia',
    'Sfax', 'Gafsa', 'Tozeur', 'Kebili', 'Gabès', 'Medenine', 'Tataouine'
  ];

  const paymentMethods = [
    {
      id: 'cash_on_delivery',
      name: 'Paiement à la livraison',
      description: 'Payez en espèces lors de la réception',
      icon: <Truck className="w-6 h-6" />,
      fee: 5
    },
    {
      id: 'bank_transfer',
      name: 'Virement bancaire',
      description: 'Virement vers notre compte bancaire',
      icon: <CreditCard className="w-6 h-6" />,
      fee: 0
    },
    {
      id: 'card',
      name: 'Carte bancaire',
      description: 'Paiement sécurisé par carte',
      icon: <Shield className="w-6 h-6" />,
      fee: 0
    }
  ];

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.customer.firstName && formData.customer.lastName && 
               formData.customer.email && formData.customer.phone;
      case 2:
        return formData.shipping.address && formData.shipping.city && 
               formData.shipping.governorate;
      case 3:
        return formData.payment.method;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateTotals = () => {
    const subtotal = getCartTotal();
    const deliveryFee = subtotal > 200 ? 0 : 15;
    const paymentFee = formData.payment.method === 'cash_on_delivery' ? 5 : 0;
    const taxRate = 0.19;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + deliveryFee + paymentFee + taxAmount;

    return {
      subtotal: subtotal.toFixed(3),
      deliveryFee: deliveryFee.toFixed(3),
      paymentFee: paymentFee.toFixed(3),
      taxAmount: taxAmount.toFixed(3),
      total: total.toFixed(3)
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOrderNumber(`ORD-${Date.now()}`);
      setOrderPlaced(true);
      clearCart();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Erreur lors de la commande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to cart if empty
  if (cartItems.length === 0 && !orderPlaced) {
    navigate('/cart');
    return null;
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="bg-white rounded-lg shadow-md p-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Commande confirmée !
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Votre commande a été passée avec succès.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Numéro de commande:</p>
              <p className="text-xl font-bold text-blue-600">{orderNumber}</p>
            </div>
            <p className="text-gray-600 mb-8">
              Nous vous contacterons sous peu pour confirmer les détails de livraison.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/shop')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continuer vos achats
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => currentStep === 1 ? navigate('/cart') : prevStep()}
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                whileHover={{ x: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </motion.button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {currentStep === 1 && 'Informations Client'}
                    {currentStep === 2 && 'Adresse de Livraison'}
                    {currentStep === 3 && 'Mode de Paiement'}
                    {currentStep === 4 && 'Confirmation'}
                  </h1>
                  <p className="text-gray-600">
                    {cartItems.length} article{cartItems.length > 1 ? 's' : ''} dans votre panier
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Paiement Sécurisé</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 lg:p-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Step 1: Customer Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Informations Client</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        value={formData.customer.firstName}
                        onChange={(e) => handleInputChange('customer', 'firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Votre prénom"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom *
                      </label>
                      <input
                        type="text"
                        value={formData.customer.lastName}
                        onChange={(e) => handleInputChange('customer', 'lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={nextStep}
                      disabled={!validateStep(1)}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        validateStep(1)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continuer
                    </button>
                  </div>
                </div>
              )}

              {/* Other steps would go here */}
              {currentStep > 1 && (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Étape {currentStep} en cours de développement
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Cette fonctionnalité sera bientôt disponible.
                  </p>
                  <div className="flex justify-between">
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      onClick={() => {
                        if (currentStep < 4) {
                          nextStep();
                        } else {
                          handleSubmit();
                        }
                      }}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Traitement...' : currentStep === 4 ? 'Confirmer' : 'Continuer'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 sticky top-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Résumé</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center space-x-3">
                    <img
                      src={item.image || '/api/placeholder/60/60'}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qté: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {(item.price * item.quantity).toFixed(3)} TND
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="font-medium">{totals.subtotal} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison:</span>
                  <span className="font-medium">
                    {parseFloat(totals.deliveryFee) === 0 ? (
                      <span className="text-green-600">Gratuite</span>
                    ) : (
                      `${totals.deliveryFee} TND`
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-blue-600">{totals.total} TND</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center text-sm text-green-700">
                  <Shield className="w-4 h-4 mr-2" />
                  <span>Commande sécurisée</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSimple;
