import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Wrench, CheckCircle, Phone, Mail, MapPin, Clock } from 'lucide-react';
import axios from 'axios';

const Services = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const services = [
    {
      title: 'Installation de Piscines',
      description: 'Installation complète de piscines résidentielles avec tous les équipements nécessaires.',
      features: [
        'Étude du terrain',
        'Installation des équipements',
        'Mise en service',
        'Formation à l\'utilisation'
      ],
      icon: <Wrench className="w-8 h-8" />
    },
    {
      title: 'Maintenance et Réparation',
      description: 'Service de maintenance régulière et réparation de tous types d\'équipements de piscine.',
      features: [
        'Maintenance préventive',
        'Réparation d\'urgence',
        'Remplacement de pièces',
        'Diagnostic complet'
      ],
      icon: <CheckCircle className="w-8 h-8" />
    },
    {
      title: 'Conseil et Expertise',
      description: 'Conseils personnalisés pour choisir les meilleurs équipements selon vos besoins.',
      features: [
        'Analyse des besoins',
        'Recommandations personnalisées',
        'Devis détaillé',
        'Suivi projet'
      ],
      icon: <Phone className="w-8 h-8" />
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      // await axios.post('/api/forms/quote', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t('installationService')}
          </h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            {t('installationDesc')}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nos Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nous offrons une gamme complète de services pour tous vos besoins en équipements de piscine
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Request Form */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('requestQuote')}
            </h2>
            <p className="text-lg text-gray-600">
              Remplissez le formulaire ci-dessous et nous vous contacterons dans les 24h
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Demande envoyée avec succès !
              </h3>
              <p className="text-green-600">
                Nous vous contacterons dans les plus brefs délais pour discuter de votre projet.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('name')} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Votre nom complet"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('email')} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('phone')} *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('city')} *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Votre ville"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('message')} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Décrivez votre projet et vos besoins..."
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Envoi en cours...' : t('submit')}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Contactez-nous directement
            </h2>
            <p className="text-lg text-gray-600">
              Vous préférez nous appeler ? Nous sommes disponibles pour répondre à vos questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                <Phone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Téléphone</h3>
              <p className="text-gray-600">+216 12 345 678</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">info@piscinefacile.tn</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Horaires</h3>
              <p className="text-gray-600">Lun-Sam: 8h-18h</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
