import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Users, Award, Clock, MapPin, Heart, Star } from 'lucide-react';
import axios from 'axios';

const About = () => {
  const { t, language } = useLanguage();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      const response = await axios.get('/api/pages/about');
      setPageData(response.data);
    } catch (error) {
      console.error('Error fetching about page:', error);
    } finally {
      setLoading(false);
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

  const stats = [
    {
      icon: <Users className="w-8 h-8" />,
      number: '500+',
      label: 'Clients satisfaits'
    },
    {
      icon: <Award className="w-8 h-8" />,
      number: '15+',
      label: 'Années d\'expérience'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      number: '24h',
      label: 'Support client'
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      number: '100%',
      label: 'Couverture Tunisie'
    }
  ];

  const team = [
    {
      name: 'Ahmed Ben Ali',
      role: 'Fondateur & Directeur',
      image: '/api/placeholder/300/300',
      description: 'Expert en équipements de piscine avec plus de 15 ans d\'expérience dans le domaine.'
    },
    {
      name: 'Fatma Trabelsi',
      role: 'Responsable Technique',
      image: '/api/placeholder/300/300',
      description: 'Spécialisée dans l\'installation et la maintenance des systèmes de filtration.'
    },
    {
      name: 'Mohamed Gharbi',
      role: 'Chef d\'équipe Installation',
      image: '/api/placeholder/300/300',
      description: 'Responsable des installations sur site avec une expertise reconnue.'
    }
  ];

  const values = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Passion',
      description: 'Nous sommes passionnés par notre métier et nous nous efforçons d\'offrir les meilleures solutions.'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Qualité',
      description: 'Nous sélectionnons uniquement des produits de haute qualité pour garantir votre satisfaction.'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Service Client',
      description: 'Notre équipe est toujours disponible pour vous accompagner dans vos projets.'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Expertise',
      description: 'Notre expérience nous permet de vous conseiller et de réaliser vos projets avec succès.'
    }
  ];

  if (loading) {
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
            {getLocalizedContent('title') || t('aboutTitle')}
          </h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            {getLocalizedContent('metaDescription') || t('aboutDesc')}
          </p>
        </div>
      </section>

      {/* Dynamic Content */}
      {pageData && (
        <section className="py-16">
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

      {/* Statistics */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nos Chiffres
            </h2>
            <p className="text-lg text-gray-600">
              Des résultats qui témoignent de notre engagement
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mx-auto mb-4">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nos Valeurs
            </h2>
            <p className="text-lg text-gray-600">
              Les principes qui guident notre travail au quotidien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Notre Équipe
            </h2>
            <p className="text-lg text-gray-600">
              Des professionnels passionnés à votre service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-48 h-48 rounded-full mx-auto object-cover shadow-lg"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <p className="text-primary-600 font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Notre Mission
          </h2>
          <p className="text-xl text-primary-100 max-w-4xl mx-auto leading-relaxed">
            Rendre les équipements de piscine de qualité accessibles à tous les Tunisiens, 
            en offrant des produits fiables, un service client exceptionnel et une expertise 
            technique reconnue. Nous nous engageons à accompagner nos clients dans la 
            réalisation de leurs projets de piscine, de la conception à la maintenance.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;
