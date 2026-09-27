import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Users, Award, Clock, MapPin, Heart, Star } from 'lucide-react';
import axios from 'axios';
import PageHero from '../components/layout/PageHero';
import PageLoader from '../components/PageLoader';
import { Reveal, SectionHeader, SpotlightCard } from '../components/fx/Motion';

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
      icon: <Users className="h-6 w-6" aria-hidden="true" />,
      number: '500+',
      label: 'Clients satisfaits'
    },
    {
      icon: <Award className="h-6 w-6" aria-hidden="true" />,
      number: '15+',
      label: 'Années d\'expérience'
    },
    {
      icon: <Clock className="h-6 w-6" aria-hidden="true" />,
      number: '24h',
      label: 'Support client'
    },
    {
      icon: <MapPin className="h-6 w-6" aria-hidden="true" />,
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
      icon: <Heart className="h-6 w-6" aria-hidden="true" />,
      title: 'Passion',
      description: 'Nous sommes passionnés par notre métier et nous nous efforçons d\'offrir les meilleures solutions.'
    },
    {
      icon: <Star className="h-6 w-6" aria-hidden="true" />,
      title: 'Qualité',
      description: 'Nous sélectionnons uniquement des produits de haute qualité pour garantir votre satisfaction.'
    },
    {
      icon: <Users className="h-6 w-6" aria-hidden="true" />,
      title: 'Service Client',
      description: 'Notre équipe est toujours disponible pour vous accompagner dans vos projets.'
    },
    {
      icon: <Award className="h-6 w-6" aria-hidden="true" />,
      title: 'Expertise',
      description: 'Notre expérience nous permet de vous conseiller et de réaliser vos projets avec succès.'
    }
  ];

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div>
      <PageHero
        eyebrow="À propos · STES.tn"
        title={getLocalizedContent('title') || t('aboutTitle')}
        subtitle={getLocalizedContent('metaDescription') || t('aboutDesc')}
      />

      {/* Text written in Admin → Pages */}
      {pageData && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="panel p-6 sm:p-10">
            <div className="prose-stes" dangerouslySetInnerHTML={{ __html: getLocalizedContent('content') }} />
          </Reveal>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="En chiffres" title="Nos Chiffres" text="Des résultats qui témoignent de notre engagement" />
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.08}>
              <SpotlightCard className="panel h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">{stat.icon}</span>
                <p className="mt-6 font-display text-5xl font-bold tracking-tight text-gray-900 tabular">{stat.number}</p>
                <p className="mt-1 text-gray-600">{stat.label}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Ce qui nous guide" title="Nos Valeurs" text="Les principes qui guident notre travail au quotidien" />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <Reveal key={value.title} delay={index * 0.08}>
              <SpotlightCard className="panel h-full p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">{value.icon}</span>
                <h3 className="mt-6 font-display text-xl font-semibold text-gray-900">{value.title}</h3>
                <p className="mt-2 text-gray-600">{value.description}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Les personnes" title="Notre Équipe" text="Des professionnels passionnés à votre service" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {team.map((member, index) => (
            <Reveal key={member.name} delay={index * 0.08}>
              <SpotlightCard className="panel h-full p-6 text-center">
                <span
                  className="mx-auto grid h-28 w-28 place-items-center rounded-full font-display text-3xl font-bold text-white shadow-glow"
                  style={{ background: 'radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.5), rgb(var(--aqua-500)) 40%, rgb(var(--violet-600)) 100%)' }}
                  aria-hidden="true"
                >
                  {member.name.split(' ').map(part => part[0]).slice(0, 2).join('')}
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="font-medium text-blue-600">{member.role}</p>
                <p className="mt-3 text-gray-600">{member.description}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="dark relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-16 sm:py-24" style={{ backgroundColor: 'rgb(var(--deep))' }}>
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 70% at 50% 0%, rgb(45 212 238 / 0.2), transparent 70%)' }} aria-hidden="true" />
            <p className="eyebrow relative">Notre cap</p>
            <h2 className="relative mt-3 font-display text-4xl font-bold text-white sm:text-5xl">Notre Mission</h2>
            <p className="relative mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/75 sm:text-xl">
              Rendre les équipements de piscine de qualité accessibles à tous les Tunisiens,
              en offrant des produits fiables, un service client exceptionnel et une expertise
              technique reconnue. Nous nous engageons à accompagner nos clients dans la
              réalisation de leurs projets de piscine, de la conception à la maintenance.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
