import React, { useEffect, useState } from 'react';
import {
  UserPlus, Pencil, KeyRound, Unlock, UserX, UserCheck, ShieldCheck, Lock, X, RefreshCw, Copy
} from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';

const MIN_PASSWORD_LENGTH = 8;

const PERMISSION_LABELS = {
  products: 'Products, categories & brands',
  orders: 'Orders & tracking',
  forms: 'Contact & quote requests',
  users: 'Customers',
  settings: 'Shop settings'
};

const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin' };

const EMPTY_FORM = {
  username: '', email: '', password: '', firstName: '', lastName: '',
  role: 'admin', permissions: ['orders', 'forms']
};

// A random password that is easy to read out (no 0/O or 1/l)
const generatePassword = () => {
  const letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(values, value => letters[value % letters.length]).join('');
};

const formatDate = (date) => (date
  ? new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Never');

const Field = ({ label, id, hint, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props} />
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const PasswordInput = ({ id, label, value, onChange }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the password is visible to copy by hand
    }
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          spellCheck={false}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button type="button" onClick={() => onChange(generatePassword())} title="Generate a password" aria-label="Generate a password" className="px-3 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button type="button" onClick={copy} disabled={!value} title="Copy" aria-label="Copy the password" className="px-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {copied ? 'Copied.' : `At least ${MIN_PASSWORD_LENGTH} characters. Give it to them privately; they can change it in Settings.`}
      </p>
    </div>
  );
};

const AdminUsers = () => {
  const { admin: me, checkAuthStatus } = useAdmin();
  const [admins, setAdmins] = useState([]);
  const [permissions, setPermissions] = useState(Object.keys(PERMISSION_LABELS));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  // { mode: 'add' | 'edit' | 'password', admin? }
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = me?.role === 'super_admin';

  const load = async () => {
    try {
      setLoadError('');
      const response = await adminApi.get('/admin/users');
      setAdmins(response.data.admins);
      setPermissions(response.data.permissions);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) load();
    else setLoading(false);
  }, [isSuperAdmin]);

  const openDialog = (mode, admin = null) => {
    setFormError('');
    setNotice('');
    if (mode === 'add') setForm({ ...EMPTY_FORM, password: generatePassword() });
    if (mode === 'edit') setForm({ ...EMPTY_FORM, ...admin, password: '' });
    if (mode === 'password') setForm({ ...EMPTY_FORM, password: generatePassword() });
    setDialog({ mode, admin });
  };
  const closeDialog = () => setDialog(null);
  const setField = (field) => (value) => setForm(current => ({ ...current, [field]: value }));
  const togglePermission = (permission) => setForm(current => ({
    ...current,
    permissions: current.permissions.includes(permission)
      ? current.permissions.filter(p => p !== permission)
      : [...current.permissions, permission]
  }));

  const replaceAdmin = (updated) => setAdmins(current => current.map(a => (a.id === updated.id ? updated : a)));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (dialog.mode === 'add') {
        const { username, email, password, firstName, lastName, role, permissions: chosen } = form;
        const response = await adminApi.post('/admin/users', { username, email, password, firstName, lastName, role, permissions: chosen });
        setAdmins(current => [...current, response.data.admin]);
        setNotice(`${response.data.admin.fullName} can now log in as "${username}".`);
      } else if (dialog.mode === 'edit') {
        const { email, firstName, lastName, role, permissions: chosen } = form;
        const response = await adminApi.put(`/admin/users/${dialog.admin.id}`, { email, firstName, lastName, role, permissions: chosen });
        replaceAdmin(response.data.admin);
        setNotice(`${response.data.admin.fullName} updated.`);
        // Your own name or email: refresh the top bar
        if (dialog.admin.id === me?.id) checkAuthStatus();
      } else {
        const response = await adminApi.put(`/admin/users/${dialog.admin.id}/password`, { password: form.password });
        replaceAdmin(response.data.admin);
        setNotice(`New password set for ${response.data.admin.fullName}. They were signed out everywhere.`);
      }
      closeDialog();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (admin, isActive) => {
    if (!isActive && !window.confirm(`Deactivate ${admin.fullName}? They will be signed out and can no longer log in.`)) return;
    try {
      const response = await adminApi.put(`/admin/users/${admin.id}`, { isActive });
      replaceAdmin(response.data.admin);
      setNotice(`${admin.fullName} ${isActive ? 'can log in again' : 'is deactivated'}.`);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const unlock = async (admin) => {
    try {
      const response = await adminApi.put(`/admin/users/${admin.id}/unlock`);
      replaceAdmin(response.data.admin);
      setNotice(`${admin.fullName} can try to log in again.`);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <ShieldCheck className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900">Super admins only</h2>
        <p className="text-gray-600 mt-1">Ask a super admin to add or change admin accounts. Your own account is in Settings.</p>
      </div>
    );
  }

  const editingSelf = dialog?.admin && dialog.admin.id === me?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-gray-600">
          Who can open the admin, and what each person can manage. Super admins can do everything, including this page.
        </p>
        <button
          type="button"
          onClick={() => openDialog('add')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Add admin
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading && <p className="text-gray-500">Loading…</p>}
      {loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {loadError} <button type="button" onClick={load} className="underline ml-2">Try again</button>
        </div>
      )}

      <div className="grid gap-4">
        {admins.map(admin => {
          const self = admin.id === me?.id;
          return (
            <div key={admin.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 ${admin.isActive ? '' : 'opacity-70'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{admin.fullName}</h3>
                    {self && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">You</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ROLE_LABELS[admin.role]}
                    </span>
                    {!admin.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Inactive</span>}
                    {admin.isLocked && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        <Lock className="w-3 h-3" /> Locked after failed logins
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-all">{admin.username} · {admin.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Last login: {formatDate(admin.lastLogin)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {admin.role === 'super_admin'
                      ? <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700">Everything</span>
                      : admin.permissions.length
                        ? admin.permissions.map(p => <span key={p} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{PERMISSION_LABELS[p] || p}</span>)
                        : <span className="text-xs text-gray-500">No access to any section</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button type="button" onClick={() => openDialog('edit', admin)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  {!self && (
                    <button type="button" onClick={() => openDialog('password', admin)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      <KeyRound className="w-4 h-4" /> Set password
                    </button>
                  )}
                  {admin.isLocked && (
                    <button type="button" onClick={() => unlock(admin)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50">
                      <Unlock className="w-4 h-4" /> Unlock
                    </button>
                  )}
                  {!self && (admin.isActive ? (
                    <button type="button" onClick={() => setActive(admin, false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <UserX className="w-4 h-4" /> Deactivate
                    </button>
                  ) : (
                    <button type="button" onClick={() => setActive(admin, true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                      <UserCheck className="w-4 h-4" /> Reactivate
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dialog && (
        <Modal
          title={dialog.mode === 'add' ? 'Add admin' : dialog.mode === 'edit' ? `Edit ${dialog.admin.fullName}` : `New password for ${dialog.admin.fullName}`}
          onClose={closeDialog}
        >
          <form onSubmit={submit} className="space-y-4">
            {formError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>}

            {dialog.mode === 'password' ? (
              <>
                <p className="text-sm text-gray-600">
                  For when {dialog.admin.firstName} forgot their password. They will be signed out everywhere and unlocked.
                </p>
                <PasswordInput id="admin-new-password" label="New password" value={form.password} onChange={setField('password')} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="admin-first-name" label="First name" value={form.firstName} onChange={(e) => setField('firstName')(e.target.value)} required />
                  <Field id="admin-last-name" label="Last name" value={form.lastName} onChange={(e) => setField('lastName')(e.target.value)} required />
                </div>
                {dialog.mode === 'add' && (
                  <Field id="admin-username" label="Username" value={form.username} onChange={(e) => setField('username')(e.target.value)} hint="Used to log in, with the password. Letters, digits, dots, dashes." required />
                )}
                <Field id="admin-email" label="Email" type="email" value={form.email} onChange={(e) => setField('email')(e.target.value)} hint="Also works to log in. Gets the new-request emails if they manage requests." required />
                {dialog.mode === 'add' && (
                  <PasswordInput id="admin-password" label="Password" value={form.password} onChange={setField('password')} />
                )}

                <div>
                  <label htmlFor="admin-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    id="admin-role"
                    value={form.role}
                    onChange={(e) => setField('role')(e.target.value)}
                    disabled={editingSelf}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  >
                    <option value="admin">Admin: only the sections ticked below</option>
                    <option value="super_admin">Super admin: everything, including admin accounts</option>
                  </select>
                  {editingSelf && <p className="mt-1 text-xs text-gray-500">You can't change your own role.</p>}
                </div>

                {form.role === 'admin' && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">Can manage</legend>
                    <div className="space-y-2">
                      {permissions.map(permission => (
                        <label key={permission} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="rounded border-gray-300"
                          />
                          {PERMISSION_LABELS[permission] || permission}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeDialog} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : dialog.mode === 'add' ? 'Add admin' : dialog.mode === 'edit' ? 'Save' : 'Set password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminUsers;
