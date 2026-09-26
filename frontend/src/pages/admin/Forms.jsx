import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  X
} from 'lucide-react';
import AnimatedButton from '../../components/AnimatedButton';
import adminApi from '../../utils/adminApi';

const PAGE_SIZE = 20;

const formStatuses = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' }
];

const formTypes = [
  { value: '', label: 'All types' },
  { value: 'contact', label: 'Contact' },
  { value: 'quote', label: 'Quote request' },
  { value: 'newsletter', label: 'Newsletter' }
];

const typeLabel = (type) => formTypes.find(t => t.value === type)?.label || type;

// Quote requests and newsletter sign-ups have no subject
const formTitle = (form) => {
  if (form.subject) return form.subject;
  if (form.type === 'quote') return form.city ? `Quote request · ${form.city}` : 'Quote request';
  if (form.type === 'newsletter') return 'Newsletter sign-up';
  return 'Message';
};

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
    case 'archived': return <Archive className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case 'contact': return 'bg-purple-100 text-purple-800';
    case 'quote': return 'bg-blue-100 text-blue-800';
    case 'newsletter': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// Quotes every cell, so commas, quotes and line breaks in messages stay in place
const toCsv = (rows) => rows
  .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  .join('\r\n');

const StatusSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  >
    {formStatuses.filter(s => s.value).map(status => (
      <option key={status.value} value={status.value}>{status.label}</option>
    ))}
  </select>
);

const Forms = () => {
  const [searchParams] = useSearchParams();
  const [forms, setForms] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Links from the admin top bar set ?search= and ?status=
  const [linkedFilters, setLinkedFilters] = useState(searchParams.toString());
  if (linkedFilters !== searchParams.toString()) {
    setLinkedFilters(searchParams.toString());
    setSearchTerm(searchParams.get('search') || '');
    setAppliedSearch(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') || '');
    setTypeFilter('');
    setPage(1);
  }

  // Search on the server once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() !== appliedSearch) {
        setAppliedSearch(searchTerm.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, appliedSearch]);

  const filterParams = useCallback(() => ({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    search: appliedSearch || undefined
  }), [statusFilter, typeFilter, appliedSearch]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.get('/forms', {
        params: { ...filterParams(), page, limit: PAGE_SIZE }
      });
      setForms(response.data.submissions);
      setTotal(response.data.pagination.totalSubmissions);
      setTotalPages(Math.max(1, response.data.pagination.totalPages));
      setLoadError('');
    } catch (error) {
      console.error('Error fetching forms:', error);
      setLoadError(error.response?.status === 403
        ? 'You do not have permission to view form submissions.'
        : 'Form submissions could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const replaceForm = (updated) => {
    setForms(prev => prev.map(form => (form._id === updated._id ? updated : form)));
    setSelectedForm(prev => (prev?._id === updated._id ? updated : prev));
  };

  const updateFormStatus = async (formId, newStatus) => {
    try {
      const response = await adminApi.put(`/forms/${formId}/status`, { status: newStatus });
      replaceForm(response.data);
    } catch (error) {
      console.error('Error updating form status:', error);
      alert('The status could not be changed. Please try again.');
    }
  };

  const deleteForm = async (formId) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    try {
      await adminApi.delete(`/forms/${formId}`);
      setForms(prev => prev.filter(form => form._id !== formId));
      setTotal(prev => prev - 1);
      if (selectedForm?._id === formId) {
        setShowFormModal(false);
        setSelectedForm(null);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('The submission could not be deleted. Please try again.');
    }
  };

  const viewFormDetails = async (form) => {
    setSelectedForm(form);
    setShowFormModal(true);

    // Opening a new submission marks it read on the server
    if (form.status === 'new') {
      try {
        const response = await adminApi.get(`/forms/${form._id}`);
        replaceForm(response.data);
      } catch (error) {
        console.error('Error opening form:', error);
      }
    }
  };

  // Exports every submission matching the filters, not just this page
  const exportForms = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let exportPage = 1; ; exportPage++) {
        const response = await adminApi.get('/forms', {
          params: { ...filterParams(), page: exportPage, limit: 100 }
        });
        all.push(...response.data.submissions);
        if (exportPage >= response.data.pagination.totalPages) break;
      }

      const csv = toCsv([
        ['Date', 'Type', 'Status', 'Name', 'Email', 'Phone', 'City', 'Subject', 'Message'],
        ...all.map(form => [
          formatDate(form.createdAt),
          typeLabel(form.type),
          form.status,
          form.name,
          form.email,
          form.phone,
          form.city,
          form.subject,
          form.message
        ])
      ]);

      // The byte order mark makes Excel read accents correctly
      const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form-submissions.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting forms:', error);
      alert('The export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const firstLoad = loading && forms.length === 0 && !loadError;

  if (firstLoad) {
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
            Contact messages, quote requests and newsletter sign-ups from the website
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {total} {total === 1 ? 'submission' : 'submissions'}
          </span>
          <AnimatedButton
            variant="outline"
            onClick={exportForms}
            disabled={exporting || total === 0}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting…' : 'Export'}</span>
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
                placeholder="Search name, email, phone, subject, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-44">
            <select
              aria-label="Type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-44">
            <select
              aria-label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {loadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={fetchForms} className="font-medium underline">Try again</button>
        </div>
      )}

      {/* Forms List */}
      <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <AnimatePresence>
          {forms.map((form, index) => (
            <motion.div
              key={form._id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.05 }}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formTitle(form)}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(form.type)}`}>
                        {typeLabel(form.type)}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(form.status)}`}>
                        {getStatusIcon(form.status)}
                        <span className="ml-1 capitalize">{form.status}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600 min-w-0">
                        <User className="w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">{form.name}</span>
                      </div>
                      <div className="flex items-center text-gray-600 min-w-0">
                        <Mail className="w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">{form.email}</span>
                      </div>
                      {form.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="w-4 h-4 mr-2 shrink-0" />
                          <span>{form.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 shrink-0" />
                        <span>{formatDate(form.createdAt)}</span>
                      </div>
                    </div>

                    {form.message && (
                      <p className="text-gray-600 mt-3 line-clamp-2">
                        {form.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <StatusSelect value={form.status} onChange={(status) => updateFormStatus(form._id, status)} />

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
                      aria-label="Delete submission"
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
      </div>

      {forms.length === 0 && !loading && !loadError && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-600">
            {appliedSearch || statusFilter || typeFilter
              ? 'Try adjusting your search or filters'
              : 'Messages sent from the contact and services pages will appear here'}
          </p>
        </motion.div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
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
              role="dialog"
              aria-label="Submission details"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formTitle(selectedForm)}
                  </h2>
                  <button
                    onClick={() => setShowFormModal(false)}
                    aria-label="Close"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact information */}
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
                      <a href={`mailto:${selectedForm.email}`} className="font-medium text-blue-600 hover:underline break-all">
                        {selectedForm.email}
                      </a>
                    </div>
                    {selectedForm.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <a href={`tel:${selectedForm.phone}`} className="font-medium text-blue-600 hover:underline">
                          {selectedForm.phone}
                        </a>
                      </div>
                    )}
                    {selectedForm.city && (
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                          {selectedForm.city}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedForm.type)}`}>
                        {typeLabel(selectedForm.type)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedForm.message && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Message
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-gray-700 whitespace-pre-wrap break-words">
                        {selectedForm.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Submitted</p>
                      <p className="font-medium">{formatDate(selectedForm.createdAt)}</p>
                    </div>
                    {selectedForm.repliedAt && (
                      <div>
                        <p className="text-gray-600">Marked replied</p>
                        <p className="font-medium">{formatDate(selectedForm.repliedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-between items-center pt-6 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <StatusSelect
                      value={selectedForm.status}
                      onChange={(status) => updateFormStatus(selectedForm._id, status)}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <AnimatedButton
                      variant="outline"
                      onClick={() => window.open(`mailto:${selectedForm.email}?subject=${encodeURIComponent(`Re: ${formTitle(selectedForm)}`)}`)}
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
