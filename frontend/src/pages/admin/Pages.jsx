import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Edit,
  Save,
  X,
  Globe,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimatedButton from '../../components/AnimatedButton';

const Pages = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    titleAr: '',
    content: '',
    contentEn: '',
    contentAr: '',
    metaDescription: '',
    metaDescriptionEn: '',
    metaDescriptionAr: '',
    isActive: true
  });
  const [activeLanguage, setActiveLanguage] = useState('fr');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pages/admin/all');
      setPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setFormData({
      title: page.title || '',
      titleEn: page.titleEn || '',
      titleAr: page.titleAr || '',
      content: page.content || '',
      contentEn: page.contentEn || '',
      contentAr: page.contentAr || '',
      metaDescription: page.metaDescription || '',
      metaDescriptionEn: page.metaDescriptionEn || '',
      metaDescriptionAr: page.metaDescriptionAr || '',
      isActive: page.isActive
    });
  };

  const handleSave = async () => {
    if (!editingPage) return;

    try {
      setSaving(true);
      const response = await api.put(`/pages/${editingPage.slug}`, formData);
      
      setPages(prev => prev.map(page => 
        page.slug === editingPage.slug ? response.data : page
      ));
      
      setEditingPage(null);
      resetForm();
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Error saving page: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPage(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      titleEn: '',
      titleAr: '',
      content: '',
      contentEn: '',
      contentAr: '',
      metaDescription: '',
      metaDescriptionEn: '',
      metaDescriptionAr: '',
      isActive: true
    });
    setActiveLanguage('fr');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getPageIcon = (slug) => {
    switch (slug) {
      case 'about':
        return '👥';
      case 'contact':
        return '📞';
      default:
        return '📄';
    }
  };

  const getPageTitle = (slug) => {
    switch (slug) {
      case 'about':
        return 'À propos';
      case 'contact':
        return 'Contact';
      default:
        return slug;
    }
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇹🇳' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Pages</h1>
              <p className="text-gray-600">Modifiez le contenu des pages À propos et Contact</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pages.map((page) => (
          <motion.div
            key={page.slug}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getPageIcon(page.slug)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getPageTitle(page.slug)}
                    </h3>
                    <p className="text-sm text-gray-500">/{page.slug}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {page.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Inactif
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Titre</p>
                  <p className="text-sm text-gray-600 truncate">{page.title}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Dernière modification</p>
                  <p className="text-sm text-gray-600">
                    {new Date(page.updatedAt).toLocaleDateString('fr-FR')} par{' '}
                    {page.lastModifiedBy?.username || 'Système'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <AnimatedButton
                  onClick={() => handleEdit(page)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  icon={Edit}
                >
                  Modifier
                </AnimatedButton>
                
                <AnimatedButton
                  onClick={() => window.open(`/${page.slug}`, '_blank')}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700"
                  icon={Eye}
                >
                  Voir
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getPageIcon(editingPage.slug)}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Modifier - {getPageTitle(editingPage.slug)}
                    </h2>
                    <p className="text-sm text-gray-500">/{editingPage.slug}</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Language Tabs */}
              <div className="flex space-x-1 mt-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeLanguage === lang.code
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre {activeLanguage === 'fr' ? '' : `(${languages.find(l => l.code === activeLanguage)?.name})`}
                  </label>
                  <input
                    type="text"
                    value={
                      activeLanguage === 'fr' ? formData.title :
                      activeLanguage === 'en' ? formData.titleEn :
                      formData.titleAr
                    }
                    onChange={(e) => handleInputChange(
                      activeLanguage === 'fr' ? 'title' :
                      activeLanguage === 'en' ? 'titleEn' :
                      'titleAr',
                      e.target.value
                    )}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Titre de la page"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenu {activeLanguage === 'fr' ? '' : `(${languages.find(l => l.code === activeLanguage)?.name})`}
                  </label>
                  <textarea
                    value={
                      activeLanguage === 'fr' ? formData.content :
                      activeLanguage === 'en' ? formData.contentEn :
                      formData.contentAr
                    }
                    onChange={(e) => handleInputChange(
                      activeLanguage === 'fr' ? 'content' :
                      activeLanguage === 'en' ? 'contentEn' :
                      'contentAr',
                      e.target.value
                    )}
                    rows={15}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Contenu HTML de la page"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vous pouvez utiliser du HTML pour formater le contenu
                  </p>
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description SEO {activeLanguage === 'fr' ? '' : `(${languages.find(l => l.code === activeLanguage)?.name})`}
                  </label>
                  <textarea
                    value={
                      activeLanguage === 'fr' ? formData.metaDescription :
                      activeLanguage === 'en' ? formData.metaDescriptionEn :
                      formData.metaDescriptionAr
                    }
                    onChange={(e) => handleInputChange(
                      activeLanguage === 'fr' ? 'metaDescription' :
                      activeLanguage === 'en' ? 'metaDescriptionEn' :
                      'metaDescriptionAr',
                      e.target.value
                    )}
                    rows={2}
                    maxLength={160}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Description pour les moteurs de recherche (max 160 caractères)"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Page active
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <AnimatedButton
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
                icon={X}
              >
                Annuler
              </AnimatedButton>
              
              <AnimatedButton
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                icon={Save}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </AnimatedButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Pages;
