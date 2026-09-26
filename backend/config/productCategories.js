// Product Categories Configuration for Swimming Pool E-commerce

const productCategories = {
  pools: {
    name: 'Piscines',
    nameEn: 'Pools',
    icon: '🏊‍♂️',
    description: 'Piscines complètes et structures',
    subcategories: {
      'above-ground': 'Piscines hors-sol',
      'in-ground': 'Piscines enterrées',
      'semi-inground': 'Piscines semi-enterrées',
      'inflatable': 'Piscines gonflables',
      'wooden': 'Piscines en bois',
      'steel': 'Piscines en acier',
      'concrete': 'Piscines en béton'
    }
  },
  'pumps-motors': {
    name: 'Pompes et Moteurs',
    nameEn: 'Pumps & Motors',
    icon: '⚙️',
    description: 'Systèmes de circulation et filtration',
    subcategories: {
      'circulation-pumps': 'Pompes de circulation',
      'filtration-pumps': 'Pompes de filtration',
      'heat-pumps': 'Pompes à chaleur',
      'variable-speed': 'Pompes à vitesse variable',
      'single-speed': 'Pompes à vitesse unique',
      'booster-pumps': 'Pompes de surpression',
      'solar-pumps': 'Pompes solaires'
    }
  },
  filters: {
    name: 'Filtration',
    nameEn: 'Filters',
    icon: '🔄',
    description: 'Systèmes de filtration et purification',
    subcategories: {
      'sand-filters': 'Filtres à sable',
      'cartridge-filters': 'Filtres à cartouche',
      'de-filters': 'Filtres à diatomée',
      'media-filters': 'Filtres à média',
      'uv-systems': 'Systèmes UV',
      'ozone-systems': 'Systèmes à ozone',
      'saltwater-systems': 'Systèmes au sel'
    }
  },
  chemicals: {
    name: 'Produits Chimiques',
    nameEn: 'Chemicals',
    icon: '🧪',
    description: 'Traitement et équilibrage de l\'eau',
    subcategories: {
      'chlorine': 'Chlore',
      'bromine': 'Brome',
      'ph-adjusters': 'Régulateurs de pH',
      'algaecides': 'Anti-algues',
      'shock-treatments': 'Traitements choc',
      'clarifiers': 'Clarifiants',
      'test-kits': 'Kits de test',
      'water-balancers': 'Équilibrants'
    }
  },
  cleaning: {
    name: 'Nettoyage',
    nameEn: 'Cleaning',
    icon: '🧽',
    description: 'Équipements de nettoyage et maintenance',
    subcategories: {
      'robotic-cleaners': 'Robots nettoyeurs',
      'suction-cleaners': 'Aspirateurs à aspiration',
      'pressure-cleaners': 'Nettoyeurs à pression',
      'manual-tools': 'Outils manuels',
      'brushes': 'Brosses',
      'nets': 'Épuisettes',
      'vacuum-heads': 'Têtes d\'aspiration',
      'poles': 'Manches télescopiques'
    }
  },
  heating: {
    name: 'Chauffage',
    nameEn: 'Heating',
    icon: '🔥',
    description: 'Systèmes de chauffage et régulation thermique',
    subcategories: {
      'heat-pumps': 'Pompes à chaleur',
      'gas-heaters': 'Chauffages au gaz',
      'electric-heaters': 'Chauffages électriques',
      'solar-heaters': 'Chauffages solaires',
      'pool-covers': 'Bâches chauffantes',
      'heat-exchangers': 'Échangeurs de chaleur',
      'thermostats': 'Thermostats'
    }
  },
  lighting: {
    name: 'Éclairage',
    nameEn: 'Lighting',
    icon: '💡',
    description: 'Éclairage et ambiance piscine',
    subcategories: {
      'led-lights': 'Éclairage LED',
      'halogen-lights': 'Éclairage halogène',
      'fiber-optic': 'Fibre optique',
      'underwater-lights': 'Éclairage sous-marin',
      'floating-lights': 'Éclairage flottant',
      'landscape-lights': 'Éclairage paysager',
      'color-changing': 'Éclairage multicolore'
    }
  },
  accessories: {
    name: 'Accessoires',
    nameEn: 'Accessories',
    icon: '🏖️',
    description: 'Accessoires et équipements de confort',
    subcategories: {
      'ladders': 'Échelles',
      'handrails': 'Mains courantes',
      'diving-boards': 'Plongeoirs',
      'slides': 'Toboggans',
      'pool-covers': 'Bâches de piscine',
      'safety-equipment': 'Équipements de sécurité',
      'pool-furniture': 'Mobilier de piscine',
      'umbrellas': 'Parasols'
    }
  },
  maintenance: {
    name: 'Maintenance',
    nameEn: 'Maintenance',
    icon: '🔧',
    description: 'Pièces détachées et maintenance',
    subcategories: {
      'spare-parts': 'Pièces détachées',
      'gaskets-seals': 'Joints et étanchéité',
      'valves': 'Vannes',
      'fittings': 'Raccords',
      'skimmers': 'Skimmers',
      'drains': 'Bondes de fond',
      'return-jets': 'Buses de refoulement',
      'timers': 'Programmateurs'
    }
  }
};

// Helper functions
const getCategoryList = () => {
  return Object.keys(productCategories);
};

const getCategoryInfo = (categoryKey) => {
  return productCategories[categoryKey] || null;
};

const getSubcategories = (categoryKey) => {
  const category = productCategories[categoryKey];
  return category ? category.subcategories : {};
};

const getAllSubcategories = () => {
  const allSubcategories = {};
  Object.keys(productCategories).forEach(categoryKey => {
    const subcategories = productCategories[categoryKey].subcategories;
    Object.assign(allSubcategories, subcategories);
  });
  return allSubcategories;
};

const getCategoryBySubcategory = (subcategoryKey) => {
  for (const [categoryKey, category] of Object.entries(productCategories)) {
    if (category.subcategories[subcategoryKey]) {
      return categoryKey;
    }
  }
  return null;
};

// Search filters configuration
const searchFilters = {
  priceRanges: [
    { label: 'Moins de 50 TND', min: 0, max: 50 },
    { label: '50 - 100 TND', min: 50, max: 100 },
    { label: '100 - 250 TND', min: 100, max: 250 },
    { label: '250 - 500 TND', min: 250, max: 500 },
    { label: '500 - 1000 TND', min: 500, max: 1000 },
    { label: 'Plus de 1000 TND', min: 1000, max: null }
  ],
  ratings: [
    { label: '4 étoiles et plus', min: 4 },
    { label: '3 étoiles et plus', min: 3 },
    { label: '2 étoiles et plus', min: 2 },
    { label: '1 étoile et plus', min: 1 }
  ],
  sortOptions: [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'price_asc', label: 'Prix croissant' },
    { value: 'price_desc', label: 'Prix décroissant' },
    { value: 'rating', label: 'Mieux notés' },
    { value: 'newest', label: 'Plus récents' },
    { value: 'popular', label: 'Plus populaires' },
    { value: 'name_asc', label: 'Nom A-Z' },
    { value: 'name_desc', label: 'Nom Z-A' }
  ]
};

module.exports = {
  productCategories,
  getCategoryList,
  getCategoryInfo,
  getSubcategories,
  getAllSubcategories,
  getCategoryBySubcategory,
  searchFilters
};
