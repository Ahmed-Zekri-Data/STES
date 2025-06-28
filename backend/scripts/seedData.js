const mongoose = require('mongoose');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
require('dotenv').config();

const products = [
  {
    name: 'Moteur de Piscine 1.5HP',
    description: 'Moteur haute performance pour piscines résidentielles. Efficace et silencieux, parfait pour la circulation de l\'eau.',
    price: 850,
    category: 'motors',
    image: '/api/placeholder/300/200',
    specifications: {
      'Puissance': '1.5 HP',
      'Voltage': '220V',
      'Débit': '15 m³/h',
      'Garantie': '2 ans'
    },
    stockQuantity: 15,
    featured: true,
    tags: ['moteur', 'piscine', 'circulation']
  },
  {
    name: 'Moteur de Piscine 2HP',
    description: 'Moteur puissant pour grandes piscines et spas. Conçu pour un usage intensif avec une excellente durabilité.',
    price: 1200,
    category: 'motors',
    image: '/api/placeholder/300/200',
    specifications: {
      'Puissance': '2 HP',
      'Voltage': '220V',
      'Débit': '20 m³/h',
      'Garantie': '3 ans'
    },
    stockQuantity: 8,
    featured: true,
    tags: ['moteur', 'piscine', 'haute-puissance']
  },
  {
    name: 'Pompe à Chaleur 12kW',
    description: 'Système de chauffage efficace pour maintenir la température idéale de votre piscine toute l\'année.',
    price: 2500,
    category: 'motors',
    image: '/api/placeholder/300/200',
    specifications: {
      'Puissance': '12 kW',
      'COP': '5.2',
      'Volume piscine': 'Jusqu\'à 60m³',
      'Garantie': '5 ans'
    },
    stockQuantity: 5,
    featured: true,
    tags: ['chauffage', 'pompe-chaleur', 'économique']
  },
  {
    name: 'Filtre à Sable Premium',
    description: 'Système de filtration efficace pour une eau cristalline. Facile à entretenir avec un excellent rapport qualité-prix.',
    price: 450,
    category: 'filters',
    image: '/api/placeholder/300/200',
    specifications: {
      'Diamètre': '600mm',
      'Débit': '14 m³/h',
      'Pression max': '2.5 bar',
      'Garantie': '2 ans'
    },
    stockQuantity: 20,
    featured: true,
    tags: ['filtre', 'sable', 'filtration']
  },
  {
    name: 'Filtre Cartouche',
    description: 'Filtre cartouche facile à nettoyer et à remplacer. Idéal pour les petites piscines et spas.',
    price: 180,
    category: 'filters',
    image: '/api/placeholder/300/200',
    specifications: {
      'Type': 'Cartouche',
      'Débit': '8 m³/h',
      'Surface filtrante': '2.8 m²',
      'Garantie': '1 an'
    },
    stockQuantity: 25,
    featured: false,
    tags: ['filtre', 'cartouche', 'facile-entretien']
  },
  {
    name: 'Filtre DE (Terre de Diatomée)',
    description: 'Filtration ultra-fine avec terre de diatomée pour une qualité d\'eau exceptionnelle.',
    price: 680,
    category: 'filters',
    image: '/api/placeholder/300/200',
    specifications: {
      'Type': 'Diatomée',
      'Débit': '12 m³/h',
      'Finesse filtration': '2-5 microns',
      'Garantie': '3 ans'
    },
    stockQuantity: 12,
    featured: false,
    tags: ['filtre', 'diatomée', 'ultra-fin']
  },
  {
    name: 'Chlore Granulé 5kg',
    description: 'Désinfectant chloré granulé pour maintenir la qualité et la propreté de l\'eau de votre piscine.',
    price: 65,
    category: 'chemicals',
    image: '/api/placeholder/300/200',
    specifications: {
      'Poids': '5 kg',
      'Type': 'Chlore granulé',
      'Concentration': '65% chlore actif',
      'Usage': 'Traitement régulier'
    },
    stockQuantity: 50,
    featured: true,
    tags: ['chlore', 'désinfectant', 'granulé']
  },
  {
    name: 'pH Minus 1kg',
    description: 'Régulateur de pH pour diminuer et équilibrer le pH de l\'eau de votre piscine.',
    price: 25,
    category: 'chemicals',
    image: '/api/placeholder/300/200',
    specifications: {
      'Poids': '1 kg',
      'Type': 'pH Minus',
      'Composition': 'Bisulfate de sodium',
      'Usage': 'Correction pH'
    },
    stockQuantity: 40,
    featured: false,
    tags: ['ph', 'régulateur', 'équilibrage']
  },
  {
    name: 'pH Plus 1kg',
    description: 'Régulateur de pH pour augmenter et équilibrer le pH de l\'eau de votre piscine.',
    price: 25,
    category: 'chemicals',
    image: '/api/placeholder/300/200',
    specifications: {
      'Poids': '1 kg',
      'Type': 'pH Plus',
      'Composition': 'Carbonate de sodium',
      'Usage': 'Correction pH'
    },
    stockQuantity: 40,
    featured: false,
    tags: ['ph', 'régulateur', 'équilibrage']
  },
  {
    name: 'Algicide Concentré 1L',
    description: 'Traitement anti-algues concentré pour prévenir et éliminer les algues dans votre piscine.',
    price: 45,
    category: 'chemicals',
    image: '/api/placeholder/300/200',
    specifications: {
      'Volume': '1 litre',
      'Type': 'Algicide',
      'Concentration': 'Concentré',
      'Usage': 'Préventif et curatif'
    },
    stockQuantity: 30,
    featured: false,
    tags: ['algicide', 'anti-algues', 'concentré']
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stes-ecommerce');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await Admin.deleteMany({});
    console.log('Cleared existing data');

    // Insert products
    await Product.insertMany(products);
    console.log(`Inserted ${products.length} products`);

    // Create default admin user
    const defaultAdmin = new Admin({
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@piscinefacile.tn',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      permissions: ['products', 'orders', 'forms', 'users', 'settings']
    });

    await defaultAdmin.save();
    console.log('Created default admin user');
    console.log(`Username: ${defaultAdmin.username}`);
    console.log(`Email: ${defaultAdmin.email}`);
    console.log(`Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456'}`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
