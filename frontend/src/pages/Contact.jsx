import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { submitErrorMessage } from '../utils/forms';
import { useShopSettings, whatsappLink, phoneLink } from '../context/shopSettings';
import PageHero from '../components/layout/PageHero';
import PageLoader from '../components/PageLoader';
import { Reveal, SpotlightCard } from '../components/fx/Motion';
import { track } from '../utils/analytics';

const Contact = () => {
  const { t, language } = useLanguage();
  const [pageData, setPageData] = useState(null);
  const { contact } = useShopSettings();
  const whatsapp = whatsappLink(contact.whatsapp);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      const response = await axios.get('/api/pages/contact');
      setPageData(response.data);
    } catch (error) {
      console.error('Error fetching contact page:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const getLocalizedContent = (field) => {
    if (!pageData) return '';

    switch (language) {
      case 'en':
        return pageData[`${field}En`] || pageData[field] || '';
      case 'ar':
        return pageData[`${field}Ar`] || pageData[field] || '';
      default:
        return pageData[field] || '';
    }
  };

  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Téléphone',
      details: [contact.phone],
      action: phoneLink(contact.phone)
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email',
      details: [contact.email],
      action: `mailto:${contact.email}`
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Adresse',
      details: [contact.address],
      action: null
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Horaires',
      details: ['Lun-Ven: 8h00 - 18h00', 'Sam: 8h00 - 13h00'],
      action: null
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
      await axios.post('/api/forms/contact', formData);
      setSubmitted(true);
      track('generate_lead', { form: 'contact' });
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert(submitErrorMessage(error, 'Erreur lors de l\'envoi du message. Veuillez réessayer.'));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <PageLoader />;
  }

  return (
    <div>
      <PageHero
        eyebrow="Contact · Réponse sous 24h"
        title={getLocalizedContent('title') || t('contact')}
        subtitle={getLocalizedContent('metaDescription') || 'Nous sommes là pour répondre à toutes vos questions et vous accompagner dans vos projets'}
      />

      {/* Dynamic Content */}
      {pageData && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="panel p-6 sm:p-10">
            <div className="prose-stes" dangerouslySetInnerHTML={{ __html: getLocalizedContent('content') }} />
          </Reveal>
        </section>
      )}

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {contactInfo.map((info, index) => (
              <Reveal key={index} delay={index * 0.06}>
              <SpotlightCard className="panel h-full p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mb-5">
                  {info.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  {info.title}
                </h3>
                <div className="space-y-1">
                  {info.details.map((detail, detailIndex) => (
                    <p key={detailIndex} className="text-gray-600">
                      {info.action && detailIndex === 0 ? (
                        <a 
                          href={info.action}
                          className="hover:text-primary-600 transition-colors"
                        >
                          {detail}
                        </a>
                      ) : (
                        detail
                      )}
                    </p>
                  ))}
                </div>
              </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="panel p-6 sm:p-8">
              <p className="eyebrow">Formulaire</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 mb-6">
                Envoyez-nous un message
              </h2>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Message envoyé avec succès !
                  </h3>
                  <p className="text-green-600">
                    Nous vous répondrons dans les plus brefs délais.
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        {t('phone')}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                        placeholder="+216 XX XXX XXX"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Sujet
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                        placeholder="Sujet de votre message"
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
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                      placeholder="Votre message..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand w-full py-4"
                  >
                    <Send className="w-5 h-5" />
                    <span>{loading ? 'Envoi en cours...' : 'Envoyer le message'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Map and Additional Info */}
            <div className="space-y-8">
              {/* Map Placeholder */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group panel relative block h-64 overflow-hidden"
              >
                <div className="absolute inset-0 grid-lines opacity-80" aria-hidden="true" />
                <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
                  <path d="M-10 180 C 80 140, 120 200, 200 150 S 330 90, 410 120" fill="none" stroke="rgb(var(--aqua-400) / 0.5)" strokeWidth="10" strokeLinecap="round" />
                  <path d="M120 -10 C 150 80, 170 140, 160 250" fill="none" stroke="rgb(var(--ink-300))" strokeWidth="6" />
                  <path d="M-10 70 L 410 95" fill="none" stroke="rgb(var(--ink-300))" strokeWidth="4" />
                </svg>
                <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-full" aria-hidden="true">
                  <span className="absolute left-1/2 top-full h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/30 motion-safe:animate-ping" />
                  <MapPin className="relative h-12 w-12 fill-blue-600 text-white drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-1" />
                </div>
                <div className="glass absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">{contact.address}</span>
                    <span className="text-xs text-gray-500">Ouvrir dans Google Maps</span>
                  </span>
                  <MapPin className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                </div>
              </a>

              {/* WhatsApp Contact */}
              {whatsapp && <div className="panel p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Contact WhatsApp
                  </h3>
                </div>
                <p className="text-green-700 mb-4">
                  Pour une réponse rapide, contactez-nous directement sur WhatsApp
                </p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Ouvrir WhatsApp</span>
                </a>
              </div>}

              {/* FAQ Quick Links */}
              <div className="panel p-6">
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">
                  Questions Fréquentes
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Livraison</h4>
                    <p className="text-sm text-gray-600">Nous livrons dans toute la Tunisie sous 2-5 jours ouvrables</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Garantie</h4>
                    <p className="text-sm text-gray-600">Tous nos produits sont garantis de 1 à 5 ans selon le type</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Installation</h4>
                    <p className="text-sm text-gray-600">Service d'installation professionnel disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
