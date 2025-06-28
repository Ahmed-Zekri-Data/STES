const axios = require('axios');
require('dotenv').config();

class SMSService {
  constructor() {
    this.providers = {
      // Tunisian SMS providers
      tunisietel: {
        enabled: process.env.TUNISIETEL_SMS_ENABLED === 'true',
        apiUrl: process.env.TUNISIETEL_SMS_URL || 'https://api.tunisietel.tn/sms',
        username: process.env.TUNISIETEL_SMS_USERNAME,
        password: process.env.TUNISIETEL_SMS_PASSWORD,
        senderId: process.env.TUNISIETEL_SMS_SENDER_ID || 'STES'
      },
      orange: {
        enabled: process.env.ORANGE_SMS_ENABLED === 'true',
        apiUrl: process.env.ORANGE_SMS_URL || 'https://api.orange.tn/sms',
        apiKey: process.env.ORANGE_SMS_API_KEY,
        senderId: process.env.ORANGE_SMS_SENDER_ID || 'STES'
      },
      // Fallback to Twilio for international
      twilio: {
        enabled: process.env.TWILIO_ENABLED === 'true',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER
      }
    };

    this.defaultProvider = this.getAvailableProvider();
  }

  getAvailableProvider() {
    // Prefer Tunisian providers first
    if (this.providers.tunisietel.enabled && this.providers.tunisietel.username) {
      return 'tunisietel';
    }
    if (this.providers.orange.enabled && this.providers.orange.apiKey) {
      return 'orange';
    }
    if (this.providers.twilio.enabled && this.providers.twilio.accountSid) {
      return 'twilio';
    }
    return null;
  }

  // Format phone number for Tunisia
  formatTunisianPhone(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('216')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      return '+216' + cleaned.substring(1);
    } else if (cleaned.length === 8) {
      return '+216' + cleaned;
    }
    
    return '+216' + cleaned;
  }

  // Send SMS via Tunisie Telecom
  async sendViaTunisietel(phone, message) {
    try {
      const config = this.providers.tunisietel;
      const formattedPhone = this.formatTunisianPhone(phone);

      const payload = {
        username: config.username,
        password: config.password,
        to: formattedPhone,
        text: message,
        from: config.senderId
      };

      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        provider: 'tunisietel',
        messageId: response.data.messageId || response.data.id,
        response: response.data
      };
    } catch (error) {
      console.error('Tunisietel SMS error:', error.response?.data || error.message);
      return {
        success: false,
        provider: 'tunisietel',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Send SMS via Orange Tunisia
  async sendViaOrange(phone, message) {
    try {
      const config = this.providers.orange;
      const formattedPhone = this.formatTunisianPhone(phone);

      const payload = {
        outboundSMSMessageRequest: {
          address: [formattedPhone],
          senderAddress: config.senderId,
          outboundSMSTextMessage: {
            message: message
          }
        }
      };

      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        provider: 'orange',
        messageId: response.data.outboundSMSMessageRequest?.resourceReference?.resourceURL,
        response: response.data
      };
    } catch (error) {
      console.error('Orange SMS error:', error.response?.data || error.message);
      return {
        success: false,
        provider: 'orange',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Send SMS via Twilio (fallback)
  async sendViaTwilio(phone, message) {
    try {
      const config = this.providers.twilio;
      const formattedPhone = this.formatTunisianPhone(phone);

      const payload = {
        to: formattedPhone,
        from: config.fromNumber,
        body: message
      };

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
        new URLSearchParams(payload),
        {
          auth: {
            username: config.accountSid,
            password: config.authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        provider: 'twilio',
        messageId: response.data.sid,
        response: response.data
      };
    } catch (error) {
      console.error('Twilio SMS error:', error.response?.data || error.message);
      return {
        success: false,
        provider: 'twilio',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Main send method with fallback
  async sendSMS(phone, message, options = {}) {
    if (!phone || !message) {
      return {
        success: false,
        error: 'Phone number and message are required'
      };
    }

    const provider = options.provider || this.defaultProvider;
    
    if (!provider) {
      return {
        success: false,
        error: 'No SMS provider configured'
      };
    }

    // Validate phone number format
    const formattedPhone = this.formatTunisianPhone(phone);
    if (!formattedPhone.match(/^\+216[0-9]{8}$/)) {
      return {
        success: false,
        error: 'Invalid Tunisian phone number format'
      };
    }

    // Truncate message if too long
    const maxLength = 160;
    const truncatedMessage = message.length > maxLength 
      ? message.substring(0, maxLength - 3) + '...'
      : message;

    let result;
    
    try {
      switch (provider) {
        case 'tunisietel':
          // result = await this.sendViaTunisietel(formattedPhone, truncatedMessage);
          result = { success: false, error: 'Tunisietel SMS not configured yet' };
          break;
        case 'orange':
          // result = await this.sendViaOrange(formattedPhone, truncatedMessage);
          result = { success: false, error: 'Orange SMS not configured yet' };
          break;
        case 'twilio':
          // result = await this.sendViaTwilio(formattedPhone, truncatedMessage);
          result = { success: false, error: 'Twilio SMS not configured yet' };
          break;
        default:
          return {
            success: false,
            error: 'Unknown SMS provider'
          };
      }

      // If primary provider fails, try fallback
      if (!result.success && provider !== 'twilio' && this.providers.twilio.enabled) {
        console.log(`Primary SMS provider ${provider} failed, trying Twilio fallback`);
        // result = await this.sendViaTwilio(formattedPhone, truncatedMessage);
        // result.fallback = true;
        console.log('Twilio fallback simulated (package not installed)');
      }

      return result;
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate order update SMS message
  generateOrderUpdateMessage(order, status) {
    const statusMessages = {
      confirmed: `✅ Votre commande ${order.orderNumber} a été confirmée. Suivi: ${process.env.FRONTEND_URL}/track-order?order=${order.orderNumber}`,
      processing: `📦 Votre commande ${order.orderNumber} est en préparation. STES Piscines`,
      shipped: `🚚 Votre commande ${order.orderNumber} a été expédiée. Code: ${order.trackingCode}`,
      delivered: `🎉 Votre commande ${order.orderNumber} a été livrée! Merci de votre confiance. STES Piscines`
    };

    return statusMessages[status] || `Mise à jour commande ${order.orderNumber}: ${status}`;
  }

  // Test SMS configuration
  async testConfiguration() {
    console.log('SMS test simulated (SMS packages not installed yet)');
    return {
      success: false,
      provider: this.defaultProvider,
      message: 'SMS packages not installed yet. Run: npm install twilio'
    };
  }
}

module.exports = new SMSService();
