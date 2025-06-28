const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
require('dotenv').config();

const sampleOrders = [
  {
    customerEmail: 'ahmed.ben.ali@email.com',
    status: 'delivered',
    items: [
      { productName: 'Chlore granulé 5kg', quantity: 2, price: 45.00 },
      { productName: 'pH+ liquide 1L', quantity: 1, price: 25.00 }
    ],
    paymentMethod: 'cash_on_delivery',
    isUrgent: false,
    deliveryInstructions: 'Laisser devant la porte si absent',
    daysAgo: 15
  },
  {
    customerEmail: 'fatma.trabelsi@email.com',
    status: 'shipped',
    items: [
      { productName: 'Pompe de piscine 1.5HP', quantity: 1, price: 320.00 }
    ],
    paymentMethod: 'bank_transfer',
    isUrgent: true,
    deliveryInstructions: 'Appeler avant livraison',
    daysAgo: 2
  },
  {
    customerEmail: 'mohamed.gharbi@email.com',
    status: 'processing',
    items: [
      { productName: 'Filtre à sable', quantity: 1, price: 180.00 },
      { productName: 'Tuyau flexible 10m', quantity: 2, price: 35.00 }
    ],
    paymentMethod: 'cash_on_delivery',
    isUrgent: false,
    deliveryInstructions: '',
    daysAgo: 1
  },
  {
    customerEmail: 'leila.ben.salem@email.com',
    status: 'confirmed',
    items: [
      { productName: 'Kit de nettoyage complet', quantity: 1, price: 85.00 }
    ],
    paymentMethod: 'paymee',
    isUrgent: false,
    deliveryInstructions: 'Livraison en matinée préférée',
    daysAgo: 0
  },
  {
    customerEmail: 'karim.ben.mohamed@email.com',
    status: 'pending',
    items: [
      { productName: 'Bâche de piscine 4x8m', quantity: 1, price: 150.00 },
      { productName: 'Chlore choc 1kg', quantity: 3, price: 18.00 }
    ],
    paymentMethod: 'cash_on_delivery',
    isUrgent: false,
    deliveryInstructions: '',
    daysAgo: 0
  }
];

async function seedOrdersWithTracking() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get customers and products
    const customers = await Customer.find();
    const products = await Product.find();

    if (customers.length === 0) {
      console.log('❌ No customers found. Please run customer seeding first.');
      return;
    }

    if (products.length === 0) {
      console.log('❌ No products found. Please run product seeding first.');
      return;
    }

    // Clear existing orders (optional)
    await Order.deleteMany({});
    console.log('Cleared existing orders');

    const createdOrders = [];

    for (const orderData of sampleOrders) {
      // Find customer
      const customer = customers.find(c => c.email === orderData.customerEmail);
      if (!customer) {
        console.log(`⚠️  Customer not found: ${orderData.customerEmail}`);
        continue;
      }

      // Create order items
      const orderItems = orderData.items.map(item => {
        // Try to find matching product or use generic data
        const product = products.find(p => 
          p.name.toLowerCase().includes(item.productName.toLowerCase().split(' ')[0])
        );

        return {
          product: product ? product._id : new mongoose.Types.ObjectId(),
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          image: product ? product.images[0] : '/placeholder-product.jpg'
        };
      });

      // Calculate total
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order date
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - orderData.daysAgo);

      // Create order
      const order = new Order({
        customerId: customer._id,
        customer: {
          name: customer.fullName,
          email: customer.email,
          phone: customer.phone || '+21612345678',
          address: {
            street: customer.addresses[0]?.address1 || '123 Rue Example',
            city: customer.addresses[0]?.city || 'Tunis',
            postalCode: customer.addresses[0]?.postalCode || '1000',
            country: customer.addresses[0]?.country || 'Tunisia'
          }
        },
        items: orderItems,
        totalAmount,
        status: orderData.status,
        paymentMethod: orderData.paymentMethod,
        isUrgent: orderData.isUrgent,
        deliveryInstructions: orderData.deliveryInstructions,
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Save order (this will trigger pre-save middleware)
      await order.save();

      // Add realistic status history based on current status
      await addRealisticStatusHistory(order, orderData.daysAgo);

      createdOrders.push(order);
      console.log(`✅ Created order ${order.orderNumber} for ${customer.fullName}`);
    }

    console.log(`\n🎉 Successfully created ${createdOrders.length} orders with tracking data!`);
    
    // Display tracking information
    console.log('\n📋 Order Tracking Information:');
    for (const order of createdOrders) {
      console.log(`\n📦 ${order.orderNumber} (${order.trackingCode})`);
      console.log(`   Customer: ${order.customer.name}`);
      console.log(`   Status: ${order.status} - ${order.getStatusLabel(order.status)}`);
      console.log(`   Total: ${order.totalAmount} TND`);
      console.log(`   Estimated Delivery: ${order.estimatedDelivery?.toLocaleDateString('fr-FR')}`);
      if (order.actualDelivery) {
        console.log(`   Actual Delivery: ${order.actualDelivery.toLocaleDateString('fr-FR')}`);
      }
      console.log(`   Tracking Events: ${order.statusHistory.length}`);
    }

    console.log('\n🔍 Test Tracking:');
    console.log('You can track orders using:');
    createdOrders.forEach(order => {
      console.log(`- Order Number: ${order.orderNumber}`);
      console.log(`- Tracking Code: ${order.trackingCode}`);
    });

  } catch (error) {
    console.error('❌ Error seeding orders:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

async function addRealisticStatusHistory(order, daysAgo) {
  const statusProgression = {
    'pending': ['pending'],
    'confirmed': ['pending', 'confirmed'],
    'processing': ['pending', 'confirmed', 'processing'],
    'shipped': ['pending', 'confirmed', 'processing', 'shipped'],
    'delivered': ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
  };

  const statuses = statusProgression[order.status] || ['pending'];
  const baseDate = new Date(order.createdAt);

  // Clear existing status history
  order.statusHistory = [];

  statuses.forEach((status, index) => {
    const eventDate = new Date(baseDate);
    eventDate.setHours(eventDate.getHours() + (index * 8)); // 8 hours between each status

    const event = {
      status,
      timestamp: eventDate,
      note: order.getStatusNote(status),
      location: order.getStatusLocation(status),
      updatedBy: index === 0 ? 'system' : 'admin'
    };

    // Add some realistic variations
    if (status === 'shipped') {
      event.note = 'Colis pris en charge par le transporteur';
      event.location = 'Centre de tri - Tunis';
    } else if (status === 'delivered') {
      event.note = 'Colis livré et signé par le destinataire';
      event.location = order.customer.address.city;
      order.actualDelivery = eventDate;
    }

    order.statusHistory.push(event);
  });

  await order.save();
}

// Run the seeding function
seedOrdersWithTracking();
