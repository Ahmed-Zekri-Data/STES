import React, { useEffect, useState } from 'react';
import { Save, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';

const MIN_PASSWORD_LENGTH = 6;

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500';

const Field = ({ label, id, hint, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} className={inputClass} {...props} />
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

// Success or error line under a form
const Result = ({ result }) => {
  if (!result) return null;
  return result.ok
    ? <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
    : <p role="alert" className="text-sm text-red-600">{result.message}</p>;
};

// The server's reason: its message or the first field that failed
const reason = (error, fallback) =>
  error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || fallback;

const SERVER_MESSAGES = {
  'Current password is incorrect': 'Le mot de passe actuel est incorrect.',
  'Please enter a valid Tunisian phone number (8 digits)': 'Entrez un numéro tunisien valide (8 chiffres), par exemple 98 765 432.',
  'The date of birth must be in the past': 'La date de naissance doit être dans le passé.'
};
const inFrench = (message) => SERVER_MESSAGES[message] || message;

// Account → Paramètres: personal details and password
const AccountSettings = () => {
  const { customer, updateProfile, changePassword } = useCustomer();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', dateOfBirth: '' });
  const [profileResult, setProfileResult] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setProfile({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
      dateOfBirth: customer.dateOfBirth ? String(customer.dateOfBirth).slice(0, 10) : ''
    });
  }, [customer]);

  const setField = (field) => (e) => {
    setProfile(current => ({ ...current, [field]: e.target.value }));
    setProfileResult(null);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileResult(null);
    try {
      await updateProfile(profile);
      setProfileResult({ ok: true, message: 'Vos informations sont enregistrées.' });
    } catch (error) {
      setProfileResult({ ok: false, message: inFrench(reason(error, "Vos informations n'ont pas pu être enregistrées.")) });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      setPasswordResult({ ok: false, message: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordResult({ ok: false, message: 'Les deux nouveaux mots de passe ne sont pas identiques.' });
      return;
    }
    setSavingPassword(true);
    setPasswordResult(null);
    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordResult({ ok: true, message: 'Mot de passe changé. Vous restez connecté ici ; vos autres appareils ont été déconnectés.' });
    } catch (error) {
      setPasswordResult({ ok: false, message: inFrench(reason(error, "Le mot de passe n'a pas pu être changé.")) });
    } finally {
      setSavingPassword(false);
    }
  };

  const setPassword = (field) => (e) => {
    setPasswords(current => ({ ...current, [field]: e.target.value }));
    setPasswordResult(null);
  };
  const passwordType = showPasswords ? 'text' : 'password';

  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
        <p className="text-sm text-gray-600 mt-1 mb-5">Utilisées pour vos commandes et la livraison.</p>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="account-first-name" label="Prénom" value={profile.firstName} onChange={setField('firstName')} autoComplete="given-name" required />
            <Field id="account-last-name" label="Nom" value={profile.lastName} onChange={setField('lastName')} autoComplete="family-name" required />
          </div>
          <Field id="account-email" label="Email" type="email" value={customer?.email || ''} disabled hint="Pour changer d'adresse email, contactez-nous." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="account-phone" label="Téléphone" type="tel" value={profile.phone} onChange={setField('phone')} autoComplete="tel" placeholder="98 765 432" hint="8 chiffres, avec ou sans +216." />
            <Field id="account-birth-date" label="Date de naissance" type="date" value={profile.dateOfBirth} onChange={setField('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} hint="Facultative." />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <Result result={profileResult} />
          </div>
        </form>
      </section>

      <section className="bg-surface rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Mot de passe</h3>
        <p className="text-sm text-gray-600 mt-1 mb-5">Le changer déconnecte vos autres appareils.</p>
        <form onSubmit={savePassword} className="space-y-4 max-w-md">
          <input type="email" name="email" autoComplete="username" value={customer?.email || ''} readOnly hidden />
          <Field id="current-password" label="Mot de passe actuel" type={passwordType} autoComplete="current-password" value={passwords.current} onChange={setPassword('current')} required />
          <Field id="new-password" label="Nouveau mot de passe" type={passwordType} autoComplete="new-password" value={passwords.next} onChange={setPassword('next')} hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`} required />
          <Field id="confirm-password" label="Confirmer le nouveau mot de passe" type={passwordType} autoComplete="new-password" value={passwords.confirm} onChange={setPassword('confirm')} required />
          <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
          </button>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {savingPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
            <Result result={passwordResult} />
          </div>
        </form>
      </section>
    </div>
  );
};

export default AccountSettings;
