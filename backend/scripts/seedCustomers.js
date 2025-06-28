const mongoose = require('mongoose');
const Customer = require('../models/Customer');
require('dotenv').config();

const sampleCustomers = [
  {
    email: 'ahmed.ben.ali@email.com',
    password: 'password123',
    firstName: 'Ahmed',
    lastName: 'Ben Ali',
    phone: '+21612345678',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'male',
    isEmailVerified: true,
    addresses: [
      {
        type: 'home',
        firstName: 'Ahmed',
        lastName: 'Ben Ali',
        address1: '123 Avenue Habib Bourguiba',
        city: 'Tunis',
        state: 'Tunis',
        postalCode: '1000',
        country: 'Tunisia',
        phone: '+21612345678',
        isDefault: true
      }
    ],
    preferences: {
      language: 'fr',
      currency: 'TND',
      newsletter: true,
      smsNotifications: true
    },
    loyaltyPoints: 150,
    totalSpent: 750.50,
    orderCount: 3
  },
  {
    email: 'fatma.trabelsi@email.com',
    password: 'password123',
    firstName: 'Fatma',
    lastName: 'Trabelsi',
    phone: '+21698765432',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'female',
    isEmailVerified: true,
    addresses: [
      {
        type: 'home',
        firstName: 'Fatma',
        lastName: 'Trabelsi',
        address1: '456 Rue de la République',
        city: 'Sfax',
        state: 'Sfax',
        postalCode: '3000',
        country: 'Tunisia',
        phone: '+21698765432',
        isDefault: true
      }
    ],
    preferences: {
      language: 'ar',
      currency: 'TND',
      newsletter: true,
      smsNotifications: false
    },
    loyaltyPoints: 75,
    totalSpent: 320.00,
    orderCount: 1
  },
  {
    email: 'mohamed.gharbi@email.com',
    password: 'password123',
    firstName: 'Mohamed',
    lastName: 'Gharbi',
    phone: '+21655443322',
    dateOfBirth: new Date('1978-11-08'),
    gender: 'male',
    isEmailVerified: false,
    addresses: [
      {
        type: 'home',
        firstName: 'Mohamed',
        lastName: 'Gharbi',
        address1: '789 Boulevard 14 Janvier',
        city: 'Sousse',
        state: 'Sousse',
        postalCode: '4000',
        country: 'Tunisia',
        phone: '+21655443322',
        isDefault: true
      },
      {
        type: 'work',
        firstName: 'Mohamed',
        lastName: 'Gharbi',
        company: 'Entreprise Gharbi',
        address1: 'Zone Industrielle Sousse',
        city: 'Sousse',
        state: 'Sousse',
        postalCode: '4001',
        country: 'Tunisia',
        phone: '+21655443322',
        isDefault: false
      }
    ],
    preferences: {
      language: 'fr',
      currency: 'TND',
      newsletter: false,
      smsNotifications: true
    },
    loyaltyPoints: 300,
    totalSpent: 1250.75,
    orderCount: 5
  },
  {
    email: 'leila.ben.salem@email.com',
    password: 'password123',
    firstName: 'Leila',
    lastName: 'Ben Salem',
    phone: '+21677889900',
    dateOfBirth: new Date('1992-05-18'),
    gender: 'female',
    isEmailVerified: true,
    addresses: [
      {
        type: 'home',
        firstName: 'Leila',
        lastName: 'Ben Salem',
        address1: '321 Avenue de la Liberté',
        city: 'Monastir',
        state: 'Monastir',
        postalCode: '5000',
        country: 'Tunisia',
        phone: '+21677889900',
        isDefault: true
      }
    ],
    preferences: {
      language: 'en',
      currency: 'TND',
      newsletter: true,
      smsNotifications: true
    },
    loyaltyPoints: 50,
    totalSpent: 180.25,
    orderCount: 1
  },
  {
    email: 'karim.ben.mohamed@email.com',
    password: 'password123',
    firstName: 'Karim',
    lastName: 'Ben Mohamed',
    phone: '+21633221100',
    dateOfBirth: new Date('1987-09-12'),
    gender: 'male',
    isEmailVerified: true,
    addresses: [
      {
        type: 'home',
        firstName: 'Karim',
        lastName: 'Ben Mohamed',
        address1: '654 Rue Ibn Khaldoun',
        city: 'Bizerte',
        state: 'Bizerte',
        postalCode: '7000',
        country: 'Tunisia',
        phone: '+21633221100',
        isDefault: true
      }
    ],
    preferences: {
      language: 'fr',
      currency: 'TND',
      newsletter: true,
      smsNotifications: false
    },
    loyaltyPoints: 200,
    totalSpent: 890.00,
    orderCount: 4
  }
];

async function seedCustomers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing customers (optional - remove this line if you want to keep existing data)
    await Customer.deleteMany({});
    console.log('Cleared existing customers');

    // Insert sample customers
    const customers = await Customer.insertMany(sampleCustomers);
    console.log(`✅ Successfully seeded ${customers.length} customers`);

    // Display created customers
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.fullName} (${customer.email})`);
      console.log(`   - Phone: ${customer.phone}`);
      console.log(`   - Verified: ${customer.isEmailVerified ? 'Yes' : 'No'}`);
      console.log(`   - Loyalty Points: ${customer.loyaltyPoints}`);
      console.log(`   - Total Spent: ${customer.totalSpent} TND`);
      console.log(`   - Orders: ${customer.orderCount}`);
      console.log(`   - Addresses: ${customer.addresses.length}`);
      console.log('');
    });

    console.log('🎉 Customer seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('Email: ahmed.ben.ali@email.com | Password: password123');
    console.log('Email: fatma.trabelsi@email.com | Password: password123');
    console.log('Email: mohamed.gharbi@email.com | Password: password123');
    console.log('Email: leila.ben.salem@email.com | Password: password123');
    console.log('Email: karim.ben.mohamed@email.com | Password: password123');

  } catch (error) {
    console.error('❌ Error seeding customers:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding function
seedCustomers();
