import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from './CartContext';

const CheckoutContext = createContext();

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

// Order lines as the API expects them: only product IDs and quantities matter,
// the server prices everything from the catalog.
const toOrderItems = (cartItems) => cartItems.map(item => ({
  productId: item._id,
  quantity: item.quantity
}));

const apiErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.msg ||
  fallback;

const formatMoney = (amount) => Number(amount).toFixed(3);

export const CheckoutProvider = ({ children }) => {
  const { cartItems, clearCart, syncWithServer } = useCart();
  const [checkoutData, setCheckoutData] = useState({
    // Customer Information
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '' // Optional for B2B customers
    },
    
    // Shipping Address
    shipping: {
      address: '',
      city: '',
      governorate: '', // Tunisian administrative division
      postalCode: '',
      country: 'Tunisia'
    },
    
    // Billing Address
    billing: {
      sameAsShipping: true,
      address: '',
      city: '',
      governorate: '',
      postalCode: '',
      country: 'Tunisia'
    },
    
    // Payment Information
    payment: {
      method: '', // 'card', 'bank_transfer', 'cash_on_delivery'
      cardDetails: {
        number: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        holderName: ''
      },
      bankTransfer: {
        bankName: '',
        accountNumber: '',
        rib: '' // Relevé d'Identité Bancaire (Tunisian bank identifier)
      }
    },
    
    // Order Details
    order: {
      notes: '',
      deliveryDate: '',
      installationRequired: false,
      urgentDelivery: false
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // The server's price for the current cart, delivery place and payment method
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');

  // Tunisian Governorates for address selection
  const tunisianGovernorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Kairouan',
    'Kasserine', 'Sidi Bouzid', 'Sousse', 'Monastir', 'Mahdia',
    'Sfax', 'Gafsa', 'Tozeur', 'Kebili', 'Gabès', 'Medenine', 'Tataouine'
  ];

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 'cash_on_delivery',
      name: 'Paiement à la Livraison',
      description: 'Payez en espèces lors de la réception',
      icon: '💵',
      fee: 5,
      enabled: true,
      processingTime: 'À la livraison'
    },
    {
      id: 'bank_transfer',
      name: 'Virement Bancaire',
      description: 'Transfert depuis votre banque',
      icon: '🏦',
      fee: 0,
      enabled: true,
      processingTime: '1-2 jours ouvrables'
    }
  ]);

  // Fetch available payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payments/methods');
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data.methods);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        // Keep default methods if API fails
      }
    };

    fetchPaymentMethods();
  }, []);

  // Update checkout data
  const updateCheckoutData = (section, data) => {
    setCheckoutData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }));
  };

  // Validate current step
  const validateStep = (step) => {
    switch (step) {
      case 1: { // Customer Information
        const { firstName, lastName, email, phone } = checkoutData.customer;
        return firstName && lastName && email && phone;
      }

      case 2: { // Shipping Address
        const { address, city, governorate } = checkoutData.shipping;
        return address && city && governorate;
      }
      
      case 3: // Payment Method
        return checkoutData.payment.method !== '';
      
      case 4: // Review & Confirm
        return true;
      
      default:
        return false;
    }
  };

  // Move to next step
  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Move to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Ask the server what this order will cost whenever anything that affects
  // the price changes. Nothing is reserved by quoting.
  const cartKey = JSON.stringify(toOrderItems(cartItems));
  const { governorate, city } = checkoutData.shipping;
  const { method: paymentMethod } = checkoutData.payment;
  const { urgentDelivery } = checkoutData.order;

  useEffect(() => {
    const items = JSON.parse(cartKey);
    if (items.length === 0 || orderConfirmation) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await axios.post('/api/orders/quote', {
          items,
          shipping: { governorate, city },
          isUrgent: urgentDelivery,
          paymentMethod: paymentMethod || 'cash_on_delivery'
        });
        if (!cancelled) {
          setQuote(response.data.pricing);
          setQuoteError('');
          syncWithServer(response.data.items);
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(apiErrorMessage(error, 'Impossible de calculer le total de la commande.'));
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // syncWithServer only changes items when the server's prices differ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, governorate, city, urgentDelivery, paymentMethod, orderConfirmation]);

  // Order totals for display, from the server's quote. Until the first quote
  // arrives, only the subtotal is known.
  const calculateTotals = (items = cartItems) => {
    if (!quote) {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { subtotal: formatMoney(subtotal), deliveryFee: '—', paymentFee: '—', taxAmount: '—', total: '—' };
    }

    return {
      subtotal: formatMoney(quote.subtotal),
      deliveryFee: formatMoney(quote.shippingCost),
      paymentFee: formatMoney(quote.paymentFee),
      taxAmount: formatMoney(quote.taxAmount),
      total: formatMoney(quote.totalAmount)
    };
  };

  // Create the order, start its payment, and show the confirmation (or send
  // the customer to the payment gateway). Throws an Error whose message can
  // be shown to the customer.
  const processPayment = async (items = cartItems, { notes } = {}) => {
    setIsProcessing(true);

    try {
      const { customer, shipping, billing, payment, order } = checkoutData;

      // axios carries the customer's login token, so their order is linked
      // to their account
      let createdOrder;
      try {
        const orderResponse = await axios.post('/api/orders', {
          items: toOrderItems(items),
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            company: customer.company
          },
          shipping,
          billing: billing.sameAsShipping ? { ...shipping, sameAsShipping: true } : billing,
          payment: { method: payment.method },
          notes: notes ?? order.notes,
          isUrgent: order.urgentDelivery
        });
        createdOrder = orderResponse.data.order;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'La commande n\'a pas pu être créée. Veuillez réessayer.'), { cause: error });
      }

      // The order exists and its stock is reserved: the cart is done
      clearCart();

      let paymentResult;
      try {
        const paymentResponse = await axios.post('/api/payments/initiate', {
          orderId: createdOrder.id,
          paymentMethod: payment.method,
          customerInfo: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone
          }
        });
        paymentResult = paymentResponse.data;
      } catch (error) {
        throw new Error(
          `Votre commande ${createdOrder.orderNumber} est enregistrée, mais le paiement n'a pas pu être lancé : ` +
          `${apiErrorMessage(error, 'erreur inconnue')}. Contactez-nous pour finaliser le paiement.`,
          { cause: error }
        );
      }

      if (paymentResult.redirectUrl) {
        // Online payment: the gateway sends the customer back to /payment/*
        window.location.href = paymentResult.redirectUrl;
        return null;
      }

      const pricing = createdOrder.pricing;
      const confirmation = {
        orderId: createdOrder.orderNumber,
        trackingCode: createdOrder.trackingCode,
        orderDate: createdOrder.createdAt,
        customer,
        shipping,
        billing: billing.sameAsShipping ? shipping : billing,
        payment: {
          method: payment.method,
          status: paymentResult.status,
          reference: paymentResult.paymentReference,
          instructions: paymentResult.instructions,
          bankDetails: paymentResult.bankDetails
        },
        items: createdOrder.items,
        totals: {
          subtotal: formatMoney(pricing.subtotal),
          deliveryFee: formatMoney(pricing.shippingCost),
          paymentFee: formatMoney(pricing.paymentFee),
          taxAmount: formatMoney(pricing.taxAmount),
          total: formatMoney(pricing.totalAmount)
        },
        estimatedDelivery: createdOrder.estimatedDelivery,
        status: createdOrder.status
      };

      setOrderConfirmation(confirmation);
      setCurrentStep(5); // Confirmation step
      return confirmation;
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset checkout
  const resetCheckout = () => {
    setCheckoutData({
      customer: { firstName: '', lastName: '', email: '', phone: '', company: '' },
      shipping: { address: '', city: '', governorate: '', postalCode: '', country: 'Tunisia' },
      billing: { sameAsShipping: true, address: '', city: '', governorate: '', postalCode: '', country: 'Tunisia' },
      payment: { method: '', cardDetails: {}, bankTransfer: {} },
      order: { notes: '', deliveryDate: '', installationRequired: false, urgentDelivery: false }
    });
    setCurrentStep(1);
    setOrderConfirmation(null);
    setQuote(null);
    setQuoteError('');
  };

  const value = {
    checkoutData,
    currentStep,
    isProcessing,
    orderConfirmation,
    tunisianGovernorates,
    paymentMethods,
    updateCheckoutData,
    validateStep,
    nextStep,
    prevStep,
    calculateTotals,
    quote,
    quoteError,
    processPayment,
    resetCheckout
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};
