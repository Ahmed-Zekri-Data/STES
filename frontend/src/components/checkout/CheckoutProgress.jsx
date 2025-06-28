import React from 'react';
import { motion } from 'framer-motion';
import { useCheckout } from '../../context/CheckoutContext';
import { User, MapPin, CreditCard, CheckCircle } from 'lucide-react';

const CheckoutProgress = () => {
  const { currentStep } = useCheckout();

  const steps = [
    {
      id: 1,
      name: 'Informations',
      description: 'Vos coordonnées',
      icon: User
    },
    {
      id: 2,
      name: 'Livraison',
      description: 'Adresse de livraison',
      icon: MapPin
    },
    {
      id: 3,
      name: 'Paiement',
      description: 'Mode de paiement',
      icon: CreditCard
    },
    {
      id: 4,
      name: 'Confirmation',
      description: 'Vérification finale',
      icon: CheckCircle
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    boxShadow: isActive ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 0 0 0px rgba(59, 130, 246, 0.1)'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <CheckCircle className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </motion.div>

                {/* Active Step Pulse */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Step Info */}
              <div className="ml-4 flex-1">
                <motion.h3
                  className={`text-sm font-medium transition-colors duration-300 ${
                    isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}
                  animate={{ 
                    color: isActive ? '#1f2937' : isCompleted ? '#059669' : '#6b7280'
                  }}
                >
                  {step.name}
                </motion.h3>
                <motion.p
                  className={`text-xs transition-colors duration-300 ${
                    isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {step.description}
                </motion.p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className="relative">
                    <div className="h-0.5 bg-gray-200 w-full" />
                    <motion.div
                      className="h-0.5 bg-gradient-to-r from-blue-500 to-green-500 absolute top-0 left-0"
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: currentStep > step.id ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progression</span>
          <span>{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutProgress;
