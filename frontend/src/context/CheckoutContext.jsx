import React, { createContext, useContext, useState, useEffect } from 'react';

const CheckoutContext = createContext();

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

export const CheckoutProvider = ({ children }) => {
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
      case 1: // Customer Information
        const { firstName, lastName, email, phone } = checkoutData.customer;
        return firstName && lastName && email && phone;
      
      case 2: // Shipping Address
        const { address, city, governorate } = checkoutData.shipping;
        return address && city && governorate;
      
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

  // Calculate order totals
  const calculateTotals = (cartItems) => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 200 ? 0 : 15; // Free delivery over 200 TND
    const paymentFee = checkoutData.payment.method === 'cash_on_delivery' ? 5 : 0;
    const taxRate = 0.19; // 19% VAT in Tunisia
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

  // Process payment
  const processPayment = async (cartItems) => {
    setIsProcessing(true);

    try {
      // First create the order
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.images?.[0] || item.image
        })),
        customer: {
          firstName: checkoutData.customer.firstName,
          lastName: checkoutData.customer.lastName,
          email: checkoutData.customer.email,
          phone: checkoutData.customer.phone,
          company: checkoutData.customer.company
        },
        shipping: checkoutData.shipping,
        billing: checkoutData.billing.sameAsShipping ? checkoutData.shipping : checkoutData.billing,
        payment: {
          method: checkoutData.payment.method
        },
        notes: checkoutData.order.notes,
        isUrgent: checkoutData.order.urgentDelivery
      };

      // Create order via API
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.order._id || orderResult.order.id;

      // Initiate payment
      const paymentData = {
        orderId,
        paymentMethod: checkoutData.payment.method,
        customerInfo: {
          firstName: checkoutData.customer.firstName,
          lastName: checkoutData.customer.lastName,
          email: checkoutData.customer.email,
          phone: checkoutData.customer.phone
        }
      };

      const paymentResponse = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to initiate payment');
      }

      const paymentResult = await paymentResponse.json();

      // Handle different payment methods
      if (paymentResult.redirectUrl) {
        // Redirect to payment gateway
        window.location.href = paymentResult.redirectUrl;
        return;
      }

      // For cash on delivery or bank transfer, show confirmation
      const totals = calculateTotals(cartItems);
      const confirmation = {
        orderId: orderResult.order.orderNumber,
        orderDate: new Date().toISOString(),
        customer: checkoutData.customer,
        shipping: checkoutData.shipping,
        billing: checkoutData.billing.sameAsShipping ? checkoutData.shipping : checkoutData.billing,
        payment: {
          method: checkoutData.payment.method,
          status: paymentResult.status,
          reference: paymentResult.paymentReference,
          instructions: paymentResult.instructions,
          bankDetails: paymentResult.bankDetails
        },
        items: cartItems,
        totals,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed'
      };

      setOrderConfirmation(confirmation);
      setCurrentStep(5); // Confirmation step

      return confirmation;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
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
    processPayment,
    resetCheckout
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};
