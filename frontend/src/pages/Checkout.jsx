import React from 'react';
import { Navigate } from 'react-router-dom';
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

const CheckoutSteps = () => {
  const { cartItems } = useCart();
  const { currentStep, orderConfirmation, isProcessing } = useCheckout();

  if (orderConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CheckoutProgress />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 lg:p-8">
            <Step />
          </div>
          <div>
            <OrderSummary />
          </div>
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
