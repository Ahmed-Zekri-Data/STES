import React, { useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CheckoutProvider, useCheckout } from '../context/CheckoutContext';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import CustomerInfoStep from '../components/checkout/CustomerInfoStep';
import ShippingAddressStep from '../components/checkout/ShippingAddressStep';
import PaymentMethodStep from '../components/checkout/PaymentMethodStep';
import OrderReviewStep from '../components/checkout/OrderReviewStep';
import OrderConfirmationStep from '../components/checkout/OrderConfirmationStep';
import OrderSummary from '../components/checkout/OrderSummary';

const STEPS = {
  1: CustomerInfoStep,
  2: ShippingAddressStep,
  3: PaymentMethodStep,
  4: OrderReviewStep
};

// Steps slide in from the side the customer is heading to
const slide = {
  enter: (direction) => ({ opacity: 0, x: direction * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction * -40 })
};

const CheckoutSteps = () => {
  const { cartItems } = useCart();
  const { currentStep, orderConfirmation, isProcessing } = useCheckout();
  const previous = useRef(currentStep);
  const direction = currentStep >= previous.current ? 1 : -1;
  useEffect(() => { previous.current = currentStep; }, [currentStep]);

  if (orderConfirmation) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <OrderConfirmationStep />
      </div>
    );
  }

  // The cart is emptied once the order is created, before the confirmation
  // is shown, so only redirect when no order is being placed
  if (cartItems.length === 0 && !isProcessing) {
    return <Navigate to="/cart" replace />;
  }

  const Step = STEPS[currentStep] || CustomerInfoStep;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Étape 2 sur 2 · Commande</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.03em] text-gray-900 sm:text-5xl">Finaliser la commande</h1>
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Lock className="h-4 w-4 text-green-600" aria-hidden="true" />
          Commande sécurisée · <Link to="/cart" className="font-medium text-blue-600 hover:underline">Modifier le panier</Link>
        </p>
      </div>

      <div className="mt-8">
        <CheckoutProgress />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="panel overflow-hidden p-5 sm:p-8">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Step />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <OrderSummary />
        </div>
      </div>
    </div>
  );
};

const Checkout = () => (
  <CheckoutProvider>
    <CheckoutSteps />
  </CheckoutProvider>
);

export default Checkout;
