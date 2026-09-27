import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Wrench, CheckCircle, Phone, Mail, MapPin, Clock } from 'lucide-react';
import axios from 'axios';
import { submitErrorMessage } from '../utils/forms';
import { useShopSettings, phoneLink } from '../context/shopSettings';
import PageHero from '../components/layout/PageHero';
import { Reveal, SpotlightCard } from '../components/fx/Motion';

const Services = () => {
  const { contact } = useShopSettings();
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
      await axios.post('/api/forms/quote', formData);
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
      alert(submitErrorMessage(error, 'Erreur lors de l\'envoi de la demande. Veuillez réessayer.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Services · Installation et entretien"
        title={t('installationService')}
        subtitle={t('installationDesc')}
      >
        <a href="#devis" className="btn-brand">Demander un devis</a>
      </PageHero>

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
              <Reveal key={index} delay={index * 0.08}>
              <SpotlightCard className="panel h-full p-7">
                <p className="font-mono text-xs text-gray-400">0{index + 1}</p>
                <div className="mt-3 flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mb-5">
                  {service.icon}
                </div>
                <h3 className="font-display text-2xl font-semibold text-gray-900 mb-3">
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
              </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Request Form */}
      <section id="devis" className="py-16 scroll-mt-28">
        <div className="panel max-w-4xl mx-auto px-6 py-10 sm:px-10">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
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
                  maxLength={1000}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                  placeholder="Décrivez votre projet et vos besoins..."
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand px-10 py-4"
                >
                  {loading ? 'Envoi en cours...' : t('submit')}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16">
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
              <a href={phoneLink(contact.phone)} className="text-gray-600 hover:text-primary-600">{contact.phone}</a>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <a href={`mailto:${contact.email}`} className="text-gray-600 hover:text-primary-600">{contact.email}</a>
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
