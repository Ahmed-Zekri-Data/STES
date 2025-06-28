import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    shop: 'المتجر',
    services: 'الخدمات',
    about: 'من نحن',
    contact: 'اتصل بنا',
    cart: 'السلة',
    admin: 'الإدارة',
    
    // Homepage
    heroTitle: 'أفضل معدات المسابح في تونس',
    heroSubtitle: 'نوفر جميع معدات المسابح عالية الجودة مع خدمات التركيب المهنية',
    shopNow: 'تسوق الآن',
    bookInstallation: 'احجز التركيب',
    
    // Products
    products: 'المنتجات',
    motors: 'المحركات',
    filters: 'المرشحات',
    chemicals: 'المواد الكيميائية',
    addToCart: 'أضف للسلة',
    price: 'السعر',
    description: 'الوصف',
    specifications: 'المواصفات',
    
    // Cart
    cartEmpty: 'السلة فارغة',
    quantity: 'الكمية',
    total: 'المجموع',
    checkout: 'الدفع',
    
    // Forms
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    city: 'المدينة',
    message: 'الرسالة',
    address: 'العنوان',
    submit: 'إرسال',
    
    // Services
    installationService: 'خدمة التركيب',
    installationDesc: 'تركيب مهني للمسابح والمعدات في جميع أنحاء تونس',
    requestQuote: 'طلب عرض سعر',
    
    // Footer
    currency: 'د.ت',
    
    // About
    aboutTitle: 'من نحن',
    aboutDesc: 'شركة عائلية متخصصة في توريد وتركيب معدات المسابح في تونس',
    
    // Contact
    contactInfo: 'معلومات الاتصال',
    whatsapp: 'واتساب',
  },
  fr: {
    // Navigation
    home: 'Accueil',
    shop: 'Boutique',
    services: 'Services',
    about: 'À propos',
    contact: 'Contact',
    cart: 'Panier',
    admin: 'Admin',
    
    // Homepage
    heroTitle: 'Les meilleurs équipements de piscine en Tunisie',
    heroSubtitle: 'Nous fournissons tous les équipements de piscine de haute qualité avec des services d\'installation professionnels',
    shopNow: 'Acheter maintenant',
    bookInstallation: 'Réserver l\'installation',
    
    // Products
    products: 'Produits',
    motors: 'Moteurs',
    filters: 'Filtres',
    chemicals: 'Produits chimiques',
    addToCart: 'Ajouter au panier',
    price: 'Prix',
    description: 'Description',
    specifications: 'Spécifications',
    
    // Cart
    cartEmpty: 'Panier vide',
    quantity: 'Quantité',
    total: 'Total',
    checkout: 'Commander',
    
    // Forms
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    city: 'Ville',
    message: 'Message',
    address: 'Adresse',
    submit: 'Envoyer',
    
    // Services
    installationService: 'Service d\'installation',
    installationDesc: 'Installation professionnelle de piscines et équipements partout en Tunisie',
    requestQuote: 'Demander un devis',
    
    // Footer
    currency: 'TND',
    
    // About
    aboutTitle: 'À propos de nous',
    aboutDesc: 'Entreprise familiale spécialisée dans la fourniture et l\'installation d\'équipements de piscine en Tunisie',
    
    // Contact
    contactInfo: 'Informations de contact',
    whatsapp: 'WhatsApp',
  },
  en: {
    // Navigation
    home: 'Home',
    shop: 'Shop',
    services: 'Services',
    about: 'About',
    contact: 'Contact',
    cart: 'Cart',
    admin: 'Admin',
    
    // Homepage
    heroTitle: 'Best Pool Equipment in Tunisia',
    heroSubtitle: 'We provide all high-quality pool equipment with professional installation services',
    shopNow: 'Shop Now',
    bookInstallation: 'Book Installation',
    
    // Products
    products: 'Products',
    motors: 'Motors',
    filters: 'Filters',
    chemicals: 'Chemicals',
    addToCart: 'Add to Cart',
    price: 'Price',
    description: 'Description',
    specifications: 'Specifications',
    
    // Cart
    cartEmpty: 'Cart is empty',
    quantity: 'Quantity',
    total: 'Total',
    checkout: 'Checkout',
    
    // Forms
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    city: 'City',
    message: 'Message',
    address: 'Address',
    submit: 'Submit',
    
    // Services
    installationService: 'Installation Service',
    installationDesc: 'Professional pool and equipment installation across Tunisia',
    requestQuote: 'Request Quote',
    
    // Footer
    currency: 'TND',
    
    // About
    aboutTitle: 'About Us',
    aboutDesc: 'Family-run business specializing in pool supplies and installations in Tunisia',
    
    // Contact
    contactInfo: 'Contact Information',
    whatsapp: 'WhatsApp',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr'); // Default to French
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'fr';
    setLanguage(savedLanguage);
    setIsRTL(savedLanguage === 'ar');
    
    // Update document direction
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLanguage;
  }, []);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    setIsRTL(newLanguage === 'ar');
    localStorage.setItem('language', newLanguage);
    
    // Update document direction
    document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage;
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    isRTL,
    changeLanguage,
    t,
    translations: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      <div className={isRTL ? 'arabic' : 'french'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};
