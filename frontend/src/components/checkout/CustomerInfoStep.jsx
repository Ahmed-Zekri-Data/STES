import React from 'react';
import { motion } from 'framer-motion';
import { useCheckout } from '../../context/CheckoutContext';
import { User, Mail, Phone, Building, ArrowRight } from 'lucide-react';

const CustomerInfoStep = () => {
  const { checkoutData, updateCheckoutData, nextStep, validateStep } = useCheckout();
  const { customer } = checkoutData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateCheckoutData('customer', { [name]: value });
  };

  const handleNext = () => {
    if (validateStep(1)) {
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations Client</h2>
        <p className="text-gray-600">Veuillez renseigner vos coordonnées pour la commande</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Prénom *
          </label>
          <motion.input
            type="text"
            id="firstName"
            name="firstName"
            value={customer.firstName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            placeholder="Votre prénom"
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>

        {/* Last Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Nom *
          </label>
          <motion.input
            type="text"
            id="lastName"
            name="lastName"
            value={customer.lastName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            placeholder="Votre nom"
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email *
          </label>
          <motion.input
            type="email"
            id="email"
            name="email"
            value={customer.email}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            placeholder="votre@email.com"
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>

        {/* Phone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Téléphone *
          </label>
          <motion.input
            type="tel"
            id="phone"
            name="phone"
            value={customer.phone}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            placeholder="+216 XX XXX XXX"
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>
      </div>

      {/* Company (Optional) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
          <Building className="w-4 h-4 inline mr-2" />
          Entreprise (optionnel)
        </label>
        <motion.input
          type="text"
          id="company"
          name="company"
          value={customer.company}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          placeholder="Nom de votre entreprise"
          variants={inputVariants}
          whileFocus="focus"
        />
        <p className="text-sm text-gray-500 mt-1">
          Pour les commandes professionnelles et la facturation B2B
        </p>
      </motion.div>

      {/* Customer Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-blue-50 rounded-lg p-4"
      >
        <h3 className="text-sm font-medium text-gray-900 mb-3">Type de client</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="customerType"
              value="individual"
              defaultChecked
              className="mr-3 text-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900">Particulier</div>
              <div className="text-sm text-gray-600">Achat personnel</div>
            </div>
          </label>
          <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="customerType"
              value="business"
              className="mr-3 text-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900">Professionnel</div>
              <div className="text-sm text-gray-600">Achat entreprise</div>
            </div>
          </label>
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        className="flex justify-end pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <motion.button
          onClick={handleNext}
          disabled={!validateStep(1)}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            validateStep(1)
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={validateStep(1) ? { scale: 1.05 } : {}}
          whileTap={validateStep(1) ? { scale: 0.95 } : {}}
        >
          Continuer
          <ArrowRight className="w-5 h-5 ml-2" />
        </motion.button>
      </motion.div>

      {/* Required Fields Notice */}
      <motion.div
        className="text-sm text-gray-500 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        * Champs obligatoires
      </motion.div>
    </div>
  );
};

export default CustomerInfoStep;
