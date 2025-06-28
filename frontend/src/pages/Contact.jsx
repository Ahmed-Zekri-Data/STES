import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle } from 'lucide-react';
import axios from 'axios';

const Contact = () => {
  const { t, language } = useLanguage();
  const [pageData, setPageData] = useState(null);
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
      details: ['+216 12 345 678', '+216 98 765 432'],
      action: 'tel:+21612345678'
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email',
      details: ['info@stes.tn', 'support@stes.tn'],
      action: 'mailto:info@stes.tn'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Adresse',
      details: ['123 Avenue Habib Bourguiba', 'Tunis 1000, Tunisie'],
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
      // TODO: Replace with actual API call
      // await axios.post('/api/forms/contact', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {getLocalizedContent('title') || t('contact')}
          </h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            {getLocalizedContent('metaDescription') || 'Nous sommes là pour répondre à toutes vos questions et vous accompagner dans vos projets'}
          </p>
        </div>
      </section>

      {/* Dynamic Content */}
      {pageData && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <div
                className="text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: getLocalizedContent('content')
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                  {info.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
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
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Votre message..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
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
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2" />
                    <p>Carte interactive</p>
                    <p className="text-sm">123 Avenue Habib Bourguiba, Tunis</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Contact */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
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
                  href="https://wa.me/21612345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Ouvrir WhatsApp</span>
                </a>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
