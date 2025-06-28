import React from 'react';
import { motion } from 'framer-motion';
import { useCheckout } from '../../context/CheckoutContext';
import { MapPin, ArrowRight, ArrowLeft, Home, Building2 } from 'lucide-react';

const ShippingAddressStep = () => {
  const { 
    checkoutData, 
    updateCheckoutData, 
    nextStep, 
    prevStep, 
    validateStep,
    tunisianGovernorates 
  } = useCheckout();
  const { shipping, billing } = checkoutData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateCheckoutData('shipping', { [name]: value });
  };

  const handleBillingChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'sameAsShipping') {
      updateCheckoutData('billing', { sameAsShipping: checked });
    } else {
      updateCheckoutData('billing', { [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleNext = () => {
    if (validateStep(2)) {
      nextStep();
    }
  };

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Adresse de Livraison</h2>
        <p className="text-gray-600">Où souhaitez-vous recevoir votre commande ?</p>
      </div>

      {/* Shipping Address */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Home className="w-5 h-5 mr-2" />
          Adresse de livraison
        </h3>

        <div className="space-y-4">
          {/* Street Address */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse complète *
            </label>
            <motion.input
              type="text"
              id="address"
              name="address"
              value={shipping.address}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="Rue, avenue, numéro, étage, appartement..."
              variants={inputVariants}
              whileFocus="focus"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                Ville *
              </label>
              <motion.input
                type="text"
                id="city"
                name="city"
                value={shipping.city}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Tunis, Sousse, Sfax..."
                variants={inputVariants}
                whileFocus="focus"
              />
            </motion.div>

            {/* Governorate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label htmlFor="governorate" className="block text-sm font-medium text-gray-700 mb-2">
                Gouvernorat *
              </label>
              <motion.select
                id="governorate"
                name="governorate"
                value={shipping.governorate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                variants={inputVariants}
                whileFocus="focus"
              >
                <option value="">Sélectionnez un gouvernorat</option>
                {tunisianGovernorates.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </motion.select>
            </motion.div>
          </div>

          {/* Postal Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:w-1/2"
          >
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
              Code postal (optionnel)
            </label>
            <motion.input
              type="text"
              id="postalCode"
              name="postalCode"
              value={shipping.postalCode}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="1000"
              variants={inputVariants}
              whileFocus="focus"
            />
          </motion.div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Adresse de facturation
        </h3>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-4"
        >
          <label className="flex items-center">
            <input
              type="checkbox"
              name="sameAsShipping"
              checked={billing.sameAsShipping}
              onChange={handleBillingChange}
              className="mr-3 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Identique à l'adresse de livraison
            </span>
          </label>
        </motion.div>

        {!billing.sameAsShipping && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Billing Address Fields */}
            <div>
              <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse de facturation *
              </label>
              <input
                type="text"
                id="billingAddress"
                name="address"
                value={billing.address}
                onChange={handleBillingChange}
                required={!billing.sameAsShipping}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Adresse de facturation..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700 mb-2">
                  Ville *
                </label>
                <input
                  type="text"
                  id="billingCity"
                  name="city"
                  value={billing.city}
                  onChange={handleBillingChange}
                  required={!billing.sameAsShipping}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ville..."
                />
              </div>

              <div>
                <label htmlFor="billingGovernorate" className="block text-sm font-medium text-gray-700 mb-2">
                  Gouvernorat *
                </label>
                <select
                  id="billingGovernorate"
                  name="governorate"
                  value={billing.governorate}
                  onChange={handleBillingChange}
                  required={!billing.sameAsShipping}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Sélectionnez un gouvernorat</option>
                  {tunisianGovernorates.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons */}
      <motion.div
        className="flex justify-between pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
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
          disabled={!validateStep(2)}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            validateStep(2)
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={validateStep(2) ? { scale: 1.05 } : {}}
          whileTap={validateStep(2) ? { scale: 0.95 } : {}}
        >
          Continuer
          <ArrowRight className="w-5 h-5 ml-2" />
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ShippingAddressStep;
