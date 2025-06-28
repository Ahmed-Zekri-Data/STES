import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

const Footer = () => {
  const { t, isRTL } = useLanguage();

  const quickLinks = [
    { name: t('home'), href: '/' },
    { name: t('shop'), href: '/shop' },
    { name: 'Suivi Commande', href: '/track-order' },
    { name: t('services'), href: '/services' },
    { name: t('about'), href: '/about' },
    { name: t('contact'), href: '/contact' },
  ];

  const categories = [
    { name: t('motors'), href: '/shop?category=motors' },
    { name: t('filters'), href: '/shop?category=filters' },
    { name: t('chemicals'), href: '/shop?category=chemicals' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="ml-2 text-xl font-bold">STES.tn</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {t('aboutDesc')}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://wa.me/21612345678"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Liens rapides</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('products')}</h3>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <Link
                    to={category.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('contactInfo')}</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-400" />
                <span className="text-gray-300 text-sm">+216 12 345 678</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-400" />
                <span className="text-gray-300 text-sm">info@stes.tn</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-primary-400" />
                <span className="text-gray-300 text-sm">
                  Tunis, Tunisie
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-green-400" />
                <a
                  href="https://wa.me/21612345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('whatsapp')}: +216 12 345 678
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 STES.tn. Tous droits réservés.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                to="/privacy"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Politique de confidentialité
              </Link>
              <Link
                to="/terms"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Conditions d'utilisation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
