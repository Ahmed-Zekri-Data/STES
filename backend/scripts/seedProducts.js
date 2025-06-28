const mongoose = require('mongoose');
const Product = require('../models/Product');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/stes-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const sampleProducts = [
  {
    name: 'Moteur de Piscine 1.5HP',
    description: 'Moteur haute performance pour piscines résidentielles. Efficace et durable, parfait pour la circulation de l\'eau.',
    price: 850,
    category: 'pumps-motors',
    subcategory: 'circulation-pumps',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    brand: 'AquaPro',
    inStock: true,
    stockQuantity: 15,
    featured: true,
    tags: ['moteur', 'pompe', 'circulation', 'piscine'],
    specifications: {
      'Puissance': '1.5HP',
      'Voltage': '220V',
      'Débit': '15 m³/h',
      'Garantie': '2 ans'
    },
    ratingStats: {
      averageRating: 4.5,
      totalReviews: 23,
      ratingDistribution: { 5: 15, 4: 6, 3: 2, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Filtre à Sable Premium',
    description: 'Système de filtration efficace pour eau cristalline. Facile à installer et à entretenir.',
    price: 450,
    category: 'filters',
    subcategory: 'sand-filters',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400',
    brand: 'FilterMax',
    inStock: true,
    stockQuantity: 8,
    featured: false,
    tags: ['filtre', 'sable', 'filtration', 'eau'],
    specifications: {
      'Capacité': '25kg de sable',
      'Débit': '10 m³/h',
      'Diamètre': '500mm',
      'Garantie': '3 ans'
    },
    ratingStats: {
      averageRating: 4.2,
      totalReviews: 15,
      ratingDistribution: { 5: 8, 4: 5, 3: 2, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Chlore Granulé 5kg',
    description: 'Désinfectant pour maintenir la qualité de l\'eau. Dissolution rapide et efficacité longue durée.',
    price: 65,
    category: 'chemicals',
    subcategory: 'chlorine',
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400',
    brand: 'ChemPool',
    inStock: true,
    stockQuantity: 25,
    featured: false,
    tags: ['chlore', 'désinfectant', 'traitement', 'eau'],
    specifications: {
      'Poids': '5kg',
      'Type': 'Granulé',
      'Concentration': '90% chlore actif',
      'Conditionnement': 'Seau étanche'
    },
    ratingStats: {
      averageRating: 4.0,
      totalReviews: 8,
      ratingDistribution: { 5: 3, 4: 4, 3: 1, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Moteur de Piscine 2HP',
    description: 'Moteur professionnel pour grandes piscines. Performance exceptionnelle et consommation optimisée.',
    price: 1200,
    category: 'pumps-motors',
    subcategory: 'circulation-pumps',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    brand: 'ProPool',
    inStock: true,
    stockQuantity: 5,
    featured: true,
    tags: ['moteur', 'pompe', 'professionnel', 'grande piscine'],
    specifications: {
      'Puissance': '2HP',
      'Voltage': '220V',
      'Débit': '25 m³/h',
      'Garantie': '3 ans'
    },
    ratingStats: {
      averageRating: 4.8,
      totalReviews: 12,
      ratingDistribution: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Kit de Nettoyage Complet',
    description: 'Ensemble d\'outils pour l\'entretien de votre piscine. Comprend épuisette, brosse et manche télescopique.',
    price: 180,
    category: 'cleaning',
    subcategory: 'manual-tools',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400',
    brand: 'CleanPool',
    inStock: true,
    stockQuantity: 12,
    featured: false,
    tags: ['nettoyage', 'kit', 'entretien', 'outils'],
    specifications: {
      'Contenu': 'Épuisette, brosse, manche',
      'Longueur manche': '3m télescopique',
      'Matériau': 'Aluminium et plastique',
      'Garantie': '1 an'
    },
    ratingStats: {
      averageRating: 4.3,
      totalReviews: 19,
      ratingDistribution: { 5: 9, 4: 8, 3: 2, 2: 0, 1: 0 }
    }
  },
  {
    name: 'pH Plus 2kg',
    description: 'Régulateur de pH pour équilibrer l\'eau de votre piscine. Formule concentrée pour un dosage précis.',
    price: 35,
    category: 'chemicals',
    subcategory: 'ph-adjusters',
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400',
    brand: 'ChemPool',
    inStock: true,
    stockQuantity: 30,
    featured: false,
    tags: ['ph', 'régulateur', 'équilibrage', 'eau'],
    specifications: {
      'Poids': '2kg',
      'Type': 'Poudre',
      'Action': 'Augmente le pH',
      'Dosage': '100g pour 10m³'
    },
    ratingStats: {
      averageRating: 4.1,
      totalReviews: 6,
      ratingDistribution: { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Robot Nettoyeur Automatique',
    description: 'Robot nettoyeur autonome pour piscines. Nettoie fond, parois et ligne d\'eau automatiquement.',
    price: 2500,
    category: 'cleaning',
    subcategory: 'robotic-cleaners',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400',
    brand: 'RoboClean',
    inStock: true,
    stockQuantity: 3,
    featured: true,
    tags: ['robot', 'nettoyeur', 'automatique', 'autonome'],
    specifications: {
      'Type': 'Robot électrique',
      'Cycle': '2h automatique',
      'Filtration': 'Cartouche lavable',
      'Garantie': '2 ans'
    },
    ratingStats: {
      averageRating: 4.7,
      totalReviews: 8,
      ratingDistribution: { 5: 6, 4: 2, 3: 0, 2: 0, 1: 0 }
    }
  },
  {
    name: 'Chauffage Électrique 9kW',
    description: 'Chauffage électrique pour piscines jusqu\'à 40m³. Montée en température rapide et contrôle précis.',
    price: 1800,
    category: 'heating',
    subcategory: 'electric-heaters',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    brand: 'HeatMax',
    inStock: true,
    stockQuantity: 4,
    featured: false,
    tags: ['chauffage', 'électrique', 'température', 'confort'],
    specifications: {
      'Puissance': '9kW',
      'Volume': 'Jusqu\'à 40m³',
      'Voltage': '380V triphasé',
      'Garantie': '2 ans'
    },
    ratingStats: {
      averageRating: 4.4,
      totalReviews: 11,
      ratingDistribution: { 5: 6, 4: 4, 3: 1, 2: 0, 1: 0 }
    }
  }
];

async function seedProducts() {
  try {
    console.log('🌱 Seeding products...');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');
    
    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully added ${products.length} products`);
    
    // Display added products
    products.forEach(product => {
      console.log(`   - ${product.name} (${product.category}) - ${product.price} TND`);
    });
    
    console.log('\n🎉 Product seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
