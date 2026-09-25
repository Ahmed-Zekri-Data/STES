const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

class PaymentService {
  constructor() {
    this.gateways = {
      paymee: {
        baseUrl: process.env.PAYMEE_BASE_URL || 'https://api.paymee.tn',
        apiKey: process.env.PAYMEE_API_KEY,
        secretKey: process.env.PAYMEE_SECRET_KEY,
        enabled: process.env.PAYMEE_ENABLED === 'true'
      },
      flouci: {
        baseUrl: process.env.FLOUCI_BASE_URL || 'https://developers.flouci.com/api',
        appToken: process.env.FLOUCI_APP_TOKEN,
        appSecret: process.env.FLOUCI_APP_SECRET,
        enabled: process.env.FLOUCI_ENABLED === 'true'
      },
      d17: {
        baseUrl: process.env.D17_BASE_URL || 'https://api.d17.tn',
        merchantId: process.env.D17_MERCHANT_ID,
        secretKey: process.env.D17_SECRET_KEY,
        enabled: process.env.D17_ENABLED === 'true'
      },
      konnect: {
        baseUrl: process.env.KONNECT_BASE_URL || 'https://api.konnect.network',
        apiKey: process.env.KONNECT_API_KEY,
        receiverId: process.env.KONNECT_RECEIVER_ID,
        enabled: process.env.KONNECT_ENABLED === 'true'
      }
    };
  }

  // Initialize payment
  async initiatePayment(order, paymentMethod, customerInfo, metadata = {}) {
    try {
      // Create payment record
      const payment = new Payment({
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerEmail: order.customer.email,
        paymentMethod,
        paymentGateway: this.getGatewayForMethod(paymentMethod),
        paymentReference: Payment.generatePaymentReference(),
        amount: order.totalAmount,
        netAmount: order.totalAmount,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata
      });

      await payment.save();

      // Process based on payment method
      switch (paymentMethod) {
        case 'cash_on_delivery':
          return this.processCashOnDelivery(payment);
        case 'bank_transfer':
          return this.processBankTransfer(payment);
        case 'paymee':
          return this.processPaymeePayment(payment, customerInfo);
        case 'flouci':
          return this.processFlouciPayment(payment, customerInfo);
        case 'd17':
          return this.processD17Payment(payment, customerInfo);
        case 'konnect':
          return this.processKonnectPayment(payment, customerInfo);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  }

  // Get gateway for payment method
  getGatewayForMethod(paymentMethod) {
    const gatewayMap = {
      'cash_on_delivery': 'internal',
      'bank_transfer': 'internal',
      'paymee': 'paymee',
      'flouci': 'flouci',
      'd17': 'd17',
      'konnect': 'konnect'
    };
    return gatewayMap[paymentMethod] || 'internal';
  }

  // Process Cash on Delivery
  async processCashOnDelivery(payment) {
    await payment.updateStatus('pending');
    
    return {
      success: true,
      paymentId: payment._id,
      paymentReference: payment.paymentReference,
      status: 'pending',
      message: 'Commande confirmée. Paiement à la livraison.',
      instructions: 'Préparez le montant exact lors de la livraison: ' + payment.amount + ' TND'
    };
  }

  // Process Bank Transfer
  async processBankTransfer(payment) {
    await payment.updateStatus('pending');
    
    const bankDetails = {
      bankName: 'Banque Internationale Arabe de Tunisie (BIAT)',
      accountNumber: '08104000123456789012',
      rib: '08 104 0001234567890 12',
      iban: 'TN59 08 104 0001234567890 12',
      beneficiary: 'STES SARL',
      reference: payment.paymentReference
    };
    
    return {
      success: true,
      paymentId: payment._id,
      paymentReference: payment.paymentReference,
      status: 'pending',
      message: 'Effectuez le virement bancaire avec les détails fournis.',
      bankDetails,
      instructions: `Utilisez la référence ${payment.paymentReference} lors du virement.`
    };
  }

  // Process Paymee Payment
  async processPaymeePayment(payment, customerInfo) {
    if (!this.gateways.paymee.enabled) {
      throw new Error('Paymee gateway is not enabled');
    }

    try {
      const paymentData = {
        amount: this.toGatewayAmount('paymee', payment.amount),
        note: `Commande ${payment.orderNumber}`,
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        webhook_url: `${process.env.BACKEND_URL}/api/payments/webhook/paymee`,
        order_id: payment.paymentReference
      };

      const response = await axios.post(
        `${this.gateways.paymee.baseUrl}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': `Token ${this.gateways.paymee.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      payment.gatewayTransactionId = response.data.payment_id;
      await payment.updateStatus('processing', response.data);

      return {
        success: true,
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        status: 'processing',
        redirectUrl: response.data.payment_url,
        gatewayTransactionId: response.data.payment_id,
        message: 'Redirection vers Paymee pour le paiement.'
      };
    } catch (error) {
      await payment.updateStatus('failed', { error: error.message });
      throw new Error(`Paymee payment failed: ${error.message}`);
    }
  }

  // Process Flouci Payment
  async processFlouciPayment(payment, customerInfo) {
    if (!this.gateways.flouci.enabled) {
      throw new Error('Flouci gateway is not enabled');
    }

    try {
      const paymentData = {
        app_token: this.gateways.flouci.appToken,
        app_secret: this.gateways.flouci.appSecret,
        amount: this.toGatewayAmount('flouci', payment.amount),
        accept_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        decline_url: `${process.env.FRONTEND_URL}/payment/failed`,
        webhook_url: `${process.env.BACKEND_URL}/api/payments/webhook/flouci`,
        session_timeout_secs: 1200,
        developer_tracking_id: payment.paymentReference
      };

      const response = await axios.post(
        `${this.gateways.flouci.baseUrl}/generate_payment`,
        paymentData
      );

      if (response.data.result.success) {
        payment.gatewayTransactionId = response.data.result.payment_id;
        await payment.updateStatus('processing', response.data);

        return {
          success: true,
          paymentId: payment._id,
          paymentReference: payment.paymentReference,
          status: 'processing',
          redirectUrl: response.data.result.link,
          gatewayTransactionId: response.data.result.payment_id,
          message: 'Redirection vers Flouci pour le paiement.'
        };
      } else {
        throw new Error(response.data.result.message || 'Flouci payment initiation failed');
      }
    } catch (error) {
      await payment.updateStatus('failed', { error: error.message });
      throw new Error(`Flouci payment failed: ${error.message}`);
    }
  }

  // Process D17 Payment
  async processD17Payment(payment, customerInfo) {
    if (!this.gateways.d17.enabled) {
      throw new Error('D17 gateway is not enabled');
    }

    try {
      const timestamp = Date.now();
      const signature = this.generateD17Signature(payment.amount, payment.paymentReference, timestamp);

      const paymentData = {
        merchant_id: this.gateways.d17.merchantId,
        amount: payment.amount,
        currency: 'TND',
        order_id: payment.paymentReference,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        webhook_url: `${process.env.BACKEND_URL}/api/payments/webhook/d17`,
        timestamp,
        signature
      };

      const response = await axios.post(
        `${this.gateways.d17.baseUrl}/payments/create`,
        paymentData
      );

      payment.gatewayTransactionId = response.data.transaction_id;
      await payment.updateStatus('processing', response.data);

      return {
        success: true,
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        status: 'processing',
        redirectUrl: response.data.payment_url,
        gatewayTransactionId: response.data.transaction_id,
        message: 'Redirection vers D17 pour le paiement.'
      };
    } catch (error) {
      await payment.updateStatus('failed', { error: error.message });
      throw new Error(`D17 payment failed: ${error.message}`);
    }
  }

  // Process Konnect Payment
  async processKonnectPayment(payment, customerInfo) {
    if (!this.gateways.konnect.enabled) {
      throw new Error('Konnect gateway is not enabled');
    }

    try {
      const paymentData = {
        receiverId: this.gateways.konnect.receiverId,
        description: `Commande ${payment.orderNumber}`,
        amount: payment.amount * 1000, // Konnect expects amount in millimes
        token: this.gateways.konnect.apiKey,
        type: 'immediate',
        lifespan: 10, // 10 minutes
        checkoutForm: true,
        addPaymentFeesToAmount: true,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phoneNumber: customerInfo.phone,
        email: customerInfo.email,
        orderId: payment.paymentReference,
        webhook: `${process.env.BACKEND_URL}/api/payments/webhook/konnect`,
        silentWebhook: true,
        successUrl: `${process.env.FRONTEND_URL}/payment/success`,
        failUrl: `${process.env.FRONTEND_URL}/payment/failed`,
        theme: 'light'
      };

      const response = await axios.post(
        `${this.gateways.konnect.baseUrl}/payments/init-payment`,
        paymentData
      );

      payment.gatewayTransactionId = response.data.paymentRef;
      await payment.updateStatus('processing', response.data);

      return {
        success: true,
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        status: 'processing',
        redirectUrl: response.data.payUrl,
        gatewayTransactionId: response.data.paymentRef,
        message: 'Redirection vers Konnect pour le paiement.'
      };
    } catch (error) {
      await payment.updateStatus('failed', { error: error.message });
      throw new Error(`Konnect payment failed: ${error.message}`);
    }
  }

  // Generate D17 signature
  generateD17Signature(amount, orderId, timestamp) {
    const data = `${this.gateways.d17.merchantId}${amount}${orderId}${timestamp}`;
    return crypto
      .createHmac('sha256', this.gateways.d17.secretKey)
      .update(data)
      .digest('hex');
  }

  // Amount in the unit each gateway's API uses; the same conversion is used
  // when creating the payment and when checking what the gateway collected.
  toGatewayAmount(gateway, amount) {
    switch (gateway) {
      case 'paymee':
        return Math.round(amount * 1000); // millimes
      default:
        return amount;
    }
  }

  // Verify payment status by asking the gateway directly. This is the only
  // path that marks a payment as completed: webhook bodies and browser
  // redirects are unauthenticated and only trigger this check.
  async verifyPayment(paymentReference) {
    const payment = await Payment.findByReference(String(paymentReference));
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'completed' || !payment.gatewayTransactionId) {
      return payment;
    }

    let result;
    switch (payment.paymentGateway) {
      case 'paymee':
        result = await this.fetchPaymeeStatus(payment);
        break;
      case 'flouci':
        result = await this.fetchFlouciStatus(payment);
        break;
      default:
        // Internal methods are settled by an admin; D17 and Konnect have no
        // verification yet, so they are never marked paid automatically.
        return payment;
    }

    return this.applyGatewayResult(payment, result);
  }

  async fetchPaymeeStatus(payment) {
    const response = await axios.get(
      `${this.gateways.paymee.baseUrl}/payments/${encodeURIComponent(payment.gatewayTransactionId)}/check`,
      { headers: { 'Authorization': `Token ${this.gateways.paymee.apiKey}` } }
    );
    const data = response.data?.data || {};

    return {
      paid: data.payment_status === true,
      amount: Number(data.amount),
      raw: response.data
    };
  }

  async fetchFlouciStatus(payment) {
    const response = await axios.get(
      `${this.gateways.flouci.baseUrl}/verify_payment/${encodeURIComponent(payment.gatewayTransactionId)}`,
      {
        headers: {
          'apppublic': this.gateways.flouci.appToken,
          'appsecret': this.gateways.flouci.appSecret
        }
      }
    );
    const result = response.data?.result || {};

    return {
      paid: response.data?.success === true && result.status === 'SUCCESS',
      amount: Number(result.amount),
      raw: response.data
    };
  }

  async applyGatewayResult(payment, result) {
    if (!result.paid) {
      return payment;
    }

    const expectedAmount = this.toGatewayAmount(payment.paymentGateway, payment.amount);
    if (!(Math.abs(result.amount - expectedAmount) < 0.001)) {
      console.error(
        `Payment ${payment.paymentReference}: gateway reports ${result.amount}, expected ${expectedAmount}. Not marking as paid.`
      );
      payment.gatewayMessage = `Amount mismatch: gateway reported ${result.amount}, expected ${expectedAmount}`;
      await payment.save();
      return payment;
    }

    await payment.updateStatus('completed', result.raw);

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      await order.save();
    }

    return payment;
  }

  // Get available payment methods
  getAvailablePaymentMethods() {
    const methods = [
      {
        id: 'cash_on_delivery',
        name: 'Paiement à la livraison',
        description: 'Payez en espèces lors de la réception',
        icon: '💵',
        fee: 5,
        enabled: true,
        processingTime: 'À la livraison'
      },
      {
        id: 'bank_transfer',
        name: 'Virement bancaire',
        description: 'Transfert depuis votre banque',
        icon: '🏦',
        fee: 0,
        enabled: true,
        processingTime: '1-2 jours ouvrables'
      }
    ];

    // Add enabled gateways
    if (this.gateways.paymee.enabled) {
      methods.push({
        id: 'paymee',
        name: 'Paymee',
        description: 'Paiement sécurisé par carte bancaire',
        icon: '💳',
        fee: 0,
        enabled: true,
        processingTime: 'Immédiat'
      });
    }

    if (this.gateways.flouci.enabled) {
      methods.push({
        id: 'flouci',
        name: 'Flouci',
        description: 'Paiement mobile et carte bancaire',
        icon: '📱',
        fee: 0,
        enabled: true,
        processingTime: 'Immédiat'
      });
    }

    if (this.gateways.d17.enabled) {
      methods.push({
        id: 'd17',
        name: 'D17',
        description: 'Paiement par carte bancaire',
        icon: '💳',
        fee: 0,
        enabled: true,
        processingTime: 'Immédiat'
      });
    }

    if (this.gateways.konnect.enabled) {
      methods.push({
        id: 'konnect',
        name: 'Konnect',
        description: 'Paiement mobile et bancaire',
        icon: '📲',
        fee: 0,
        enabled: true,
        processingTime: 'Immédiat'
      });
    }

    return methods;
  }
}

module.exports = new PaymentService();
