import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingBag, Wrench, Star, Users, Award, Clock, Waves, Droplets, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Parallax } from 'react-parallax';
import AnimatedProductCard from '../components/AnimatedProductCard';

const Home = () => {
  const { t, isRTL } = useLanguage();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const features = [
    {
      icon: <Star className="w-8 h-8" />,
      title: 'Qualité Premium',
      description: 'Produits de haute qualité pour votre piscine',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Service Client',
      description: 'Support client disponible 7j/7',
      color: 'from-blue-400 to-purple-500'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Garantie',
      description: 'Garantie sur tous nos produits',
      color: 'from-green-400 to-blue-500'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Livraison Rapide',
      description: 'Livraison dans toute la Tunisie',
      color: 'from-pink-400 to-red-500'
    }
  ];

  const popularProducts = [
    {
      id: 1,
      name: 'Moteur de Piscine 1.5HP',
      price: 850,
      image: '/api/placeholder/300/200',
      category: 'motors'
    },
    {
      id: 2,
      name: 'Filtre à Sable Premium',
      price: 450,
      image: '/api/placeholder/300/200',
      category: 'filters'
    },
    {
      id: 3,
      name: 'Chlore Granulé 5kg',
      price: 65,
      image: '/api/placeholder/300/200',
      category: 'chemicals'
    }
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section with Parallax */}
      <Parallax
        blur={0}
        bgImage="/api/placeholder/1920/1080"
        bgImageAlt="Swimming Pool"
        strength={300}
        className="min-h-screen"
      >
        <section className="relative min-h-screen flex items-center">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-20 left-10 text-blue-300 opacity-30"
              variants={floatingVariants}
              animate="animate"
            >
              <Waves className="w-16 h-16" />
            </motion.div>
            <motion.div
              className="absolute top-40 right-20 text-cyan-300 opacity-40"
              variants={floatingVariants}
              animate="animate"
              transition={{ delay: 1 }}
            >
              <Droplets className="w-12 h-12" />
            </motion.div>
            <motion.div
              className="absolute bottom-32 left-1/4 text-blue-200 opacity-25"
              variants={floatingVariants}
              animate="animate"
              transition={{ delay: 2 }}
            >
              <Sparkles className="w-20 h-20" />
            </motion.div>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/70 to-cyan-800/80"></div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              className="max-w-4xl"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.h1
                className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white"
                variants={itemVariants}
              >
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {t('heroTitle')}
                </span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed"
                variants={itemVariants}
              >
                {t('heroSubtitle')}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
                variants={itemVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/shop"
                    className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-white to-blue-50 text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                    {t('shopNow')}
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/services"
                    className="group inline-flex items-center justify-center px-8 py-4 border-2 border-white/80 text-white font-semibold rounded-xl backdrop-blur-sm bg-white/10 hover:bg-white hover:text-blue-600 transition-all duration-300 transform"
                  >
                    <Wrench className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    {t('bookInstallation')}
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </Parallax>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Pourquoi nous choisir ?
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Nous sommes votre partenaire de confiance pour tous vos besoins en équipements de piscine
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group relative"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
              >
                <div className="relative text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform group-hover:scale-105 overflow-hidden">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                  {/* Icon Container */}
                  <motion.div
                    className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${feature.color} text-white rounded-2xl mb-6 shadow-lg`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    {feature.icon}
                  </motion.div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 bg-cyan-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Produits Populaires
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Découvrez nos produits les plus demandés par nos clients tunisiens
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {popularProducts.map((product, index) => (
              <AnimatedProductCard
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                to="/shop"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform"
              >
                <span>Voir Tous les Produits</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-32 h-32 bg-cyan-300/10 rounded-full"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-300/5 rounded-full"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Prêt à transformer votre piscine ?
              </span>
            </motion.h2>

            <motion.p
              className="text-xl md:text-2xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Contactez-nous dès aujourd'hui pour un devis gratuit et personnalisé
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  to="/contact"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform"
                >
                  <span>Nous Contacter</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <a
                  href="https://wa.me/21612345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center px-8 py-4 border-2 border-white/80 text-white font-semibold rounded-xl backdrop-blur-sm bg-white/10 hover:bg-white hover:text-blue-600 transition-all duration-300 transform"
                >
                  <span>WhatsApp</span>
                  <motion.div
                    className="ml-2"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    📱
                  </motion.div>
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
