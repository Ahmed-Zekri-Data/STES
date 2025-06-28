import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Eye,
  Download,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import AnimatedButton from '../../components/AnimatedButton';

const Forms = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const formStatuses = [
    { value: '', label: 'All Forms' },
    { value: 'new', label: 'New' },
    { value: 'read', label: 'Read' },
    { value: 'replied', label: 'Replied' }
  ];

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      // Mock data for demonstration
      setTimeout(() => {
        setForms([
          {
            _id: '1',
            type: 'contact',
            name: 'Ahmed Ben Ali',
            email: 'ahmed@email.com',
            phone: '+216 98 123 456',
            subject: 'Demande de devis pour piscine',
            message: 'Bonjour, je souhaiterais avoir un devis pour l\'installation d\'une piscine de 8x4m dans mon jardin. Merci.',
            status: 'new',
            createdAt: '2024-01-15T10:30:00Z',
            readAt: null
          },
          {
            _id: '2',
            type: 'quote',
            name: 'Fatima Trabelsi',
            email: 'fatima@email.com',
            phone: '+216 97 234 567',
            subject: 'Rénovation piscine existante',
            message: 'Ma piscine a besoin d\'une rénovation complète. Pouvez-vous me proposer vos services ?',
            status: 'read',
            createdAt: '2024-01-14T15:45:00Z',
            readAt: '2024-01-15T09:20:00Z'
          },
          {
            _id: '3',
            type: 'maintenance',
            name: 'Mohamed Gharbi',
            email: 'mohamed@email.com',
            phone: '+216 96 345 678',
            subject: 'Contrat de maintenance',
            message: 'Je cherche un contrat de maintenance annuel pour ma piscine. Quels sont vos tarifs ?',
            status: 'replied',
            createdAt: '2024-01-13T11:15:00Z',
            readAt: '2024-01-13T14:30:00Z'
          },
          {
            _id: '4',
            type: 'support',
            name: 'Leila Mansouri',
            email: 'leila@email.com',
            phone: '+216 95 456 789',
            subject: 'Problème avec pompe',
            message: 'Ma pompe de piscine fait un bruit étrange depuis quelques jours. Pouvez-vous m\'aider ?',
            status: 'new',
            createdAt: '2024-01-12T16:20:00Z',
            readAt: null
          },
          {
            _id: '5',
            type: 'contact',
            name: 'Karim Bouazizi',
            email: 'karim@email.com',
            phone: '+216 94 567 890',
            subject: 'Information sur produits',
            message: 'Je voudrais des informations sur vos robots nettoyeurs automatiques.',
            status: 'read',
            createdAt: '2024-01-11T13:10:00Z',
            readAt: '2024-01-12T08:30:00Z'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching forms:', error);
      setLoading(false);
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = 
      form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'read': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'replied': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4" />;
      case 'read': return <Clock className="w-4 h-4" />;
      case 'replied': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'contact': return 'bg-purple-100 text-purple-800';
      case 'quote': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-green-100 text-green-800';
      case 'support': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateFormStatus = async (formId, newStatus) => {
    try {
      setForms(prev => prev.map(form => 
        form._id === formId 
          ? { 
              ...form, 
              status: newStatus, 
              readAt: newStatus === 'read' && !form.readAt ? new Date().toISOString() : form.readAt 
            }
          : form
      ));
    } catch (error) {
      console.error('Error updating form status:', error);
    }
  };

  const deleteForm = async (formId) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      setForms(prev => prev.filter(form => form._id !== formId));
    }
  };

  const viewFormDetails = (form) => {
    setSelectedForm(form);
    setShowFormModal(true);
    
    // Mark as read if it's new
    if (form.status === 'new') {
      updateFormStatus(form._id, 'read');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportForms = () => {
    const csvContent = [
      ['Date', 'Name', 'Email', 'Phone', 'Type', 'Subject', 'Status'],
      ...filteredForms.map(form => [
        formatDate(form.createdAt),
        form.name,
        form.email,
        form.phone,
        form.type,
        form.subject,
        form.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forms-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gray-300 rounded w-48"></div>
                </div>
                <div className="h-6 bg-gray-300 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            Forms Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage contact forms and inquiries
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {filteredForms.length} forms found
          </span>
          <AnimatedButton
            variant="outline"
            onClick={exportForms}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </AnimatedButton>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search forms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Forms List */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <AnimatePresence>
          {filteredForms.map((form, index) => (
            <motion.div
              key={form._id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {form.subject}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(form.type)}`}>
                        {form.type}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(form.status)}`}>
                        {getStatusIcon(form.status)}
                        <span className="ml-1 capitalize">{form.status}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span>{form.name}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>{form.email}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{form.phone}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(form.createdAt)}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mt-3 line-clamp-2">
                      {form.message}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={form.status}
                      onChange={(e) => updateFormStatus(form._id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                    
                    <AnimatedButton
                      variant="outline"
                      size="small"
                      onClick={() => viewFormDetails(form)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </AnimatedButton>
                    
                    <motion.button
                      onClick={() => deleteForm(form._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredForms.length === 0 && !loading && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No forms found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </motion.div>
      )}

      {/* Form Details Modal */}
      <AnimatePresence>
        {showFormModal && selectedForm && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Form Details
                  </h2>
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Form Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedForm.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedForm.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedForm.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedForm.type)}`}>
                        {selectedForm.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Subject
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-xl p-4">
                    {selectedForm.subject}
                  </p>
                </div>

                {/* Message */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Message
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedForm.message}
                    </p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Submitted</p>
                      <p className="font-medium">{formatDate(selectedForm.createdAt)}</p>
                    </div>
                    {selectedForm.readAt && (
                      <div>
                        <p className="text-gray-600">Read</p>
                        <p className="font-medium">{formatDate(selectedForm.readAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <select
                      value={selectedForm.status}
                      onChange={(e) => {
                        updateFormStatus(selectedForm._id, e.target.value);
                        setSelectedForm(prev => ({ ...prev, status: e.target.value }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                  </div>
                  <div className="flex space-x-3">
                    <AnimatedButton
                      variant="outline"
                      onClick={() => window.open(`mailto:${selectedForm.email}?subject=Re: ${selectedForm.subject}`)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Reply
                    </AnimatedButton>
                    <AnimatedButton onClick={() => setShowFormModal(false)}>
                      Close
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Forms;
