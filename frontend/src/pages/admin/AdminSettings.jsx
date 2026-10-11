import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Store, Save, CheckCircle, Waves, Ruler, Bell, Megaphone } from 'lucide-react';
import adminApi, { errorMessage } from '../../utils/adminApi';
import { useAdmin } from '../../context/AdminContext';
import HomePageSettings from './HomePageSettings';
import PoolBuilderSettings from './PoolBuilderSettings';
import RemindersSettings from './RemindersSettings';
import MarketingSettings from './MarketingSettings';

const MIN_PASSWORD_LENGTH = 8;
const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin' };

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:bg-gray-100';

const Field = ({ label, id, hint, suffix, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      <input id={id} className={`${inputClass} ${suffix ? 'pr-14' : ''}`} {...props} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{suffix}</span>}
    </div>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const Section = ({ title, description, children }) => (
  <section className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

// Success or error line under a form
const Result = ({ result }) => {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {result.message}</p>
  ) : (
    <p role="alert" className="text-sm text-red-600">{result.message}</p>
  );
};

const SaveButton = ({ saving, children = 'Save' }) => (
  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
    <Save className="w-4 h-4" /> {saving ? 'Saving…' : children}
  </button>
);

const MyAccount = () => {
  const { admin, updateProfile, changePassword } = useAdmin();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [profileResult, setProfileResult] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordResult, setPasswordResult] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (admin) setProfile({ firstName: admin.firstName || '', lastName: admin.lastName || '', email: admin.email || '' });
  }, [admin]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileResult(null);
    try {
      await updateProfile(profile);
      setProfileResult({ ok: true, message: 'Saved.' });
    } catch (error) {
      setProfileResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      setPasswordResult({ ok: false, message: `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordResult({ ok: false, message: 'The two new passwords are not the same.' });
      return;
    }
    setSavingPassword(true);
    setPasswordResult(null);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordResult({ ok: true, message: 'Password changed. You stay logged in here; other devices were signed out.' });
    } catch (error) {
      setPasswordResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  };

  const setPassword = (field) => (e) => {
    setPasswords(current => ({ ...current, [field]: e.target.value }));
    setPasswordResult(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Profile" description={`You log in as "${admin?.username}" or with your email. Role: ${ROLE_LABELS[admin?.role] || admin?.role}.`}>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="profile-first-name" label="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
            <Field id="profile-last-name" label="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
          </div>
          <Field id="profile-email" label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
          <div className="flex flex-wrap items-center gap-4">
            <SaveButton saving={savingProfile} />
            <Result result={profileResult} />
          </div>
        </form>
      </Section>

      <Section title="Password" description="Changing it signs you out on your other devices.">
        <form onSubmit={savePassword} className="space-y-4">
          <input type="text" name="username" autoComplete="username" value={admin?.username || ''} readOnly hidden />
          <Field id="current-password" label="Current password" type="password" autoComplete="current-password" value={passwords.current} onChange={setPassword('current')} required />
          <Field id="new-password" label="New password" type="password" autoComplete="new-password" value={passwords.next} onChange={setPassword('next')} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} required />
          <Field id="confirm-password" label="New password again" type="password" autoComplete="new-password" value={passwords.confirm} onChange={setPassword('confirm')} required />
          <div className="flex flex-wrap items-center gap-4">
            <SaveButton saving={savingPassword}>Change password</SaveButton>
            <Result result={passwordResult} />
          </div>
        </form>
      </Section>
    </div>
  );
};

const ShopSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoadError('');
      setSettings((await adminApi.get('/admin/settings')).data);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  };

  useEffect(() => { load(); }, []);

  const set = (section, field) => (e) => {
    setSettings(current => (section
      ? { ...current, [section]: { ...current[section], [field]: e.target.value } }
      : { ...current, [field]: e.target.value }));
    setResult(null);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const { contact, bank, delivery, invoice, lowStockThreshold } = settings;
      const response = await adminApi.put('/admin/settings', { contact, bank, delivery, invoice, lowStockThreshold });
      setSettings(response.data.settings);
      setResult({ ok: true, message: 'Saved. The shop shows the new values on the next page load.' });
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {loadError} <button type="button" onClick={load} className="underline ml-2">Try again</button>
      </div>
    );
  }
  if (!settings) return <p className="text-gray-500">Loading…</p>;

  const { contact, bank, delivery } = settings;
  const invoice = settings.invoice || {};
  return (
    <form onSubmit={save} className="space-y-6">
      <Section title="Contact details" description="Shown in the shop's footer, on the Contact and Services pages, and on the WhatsApp buttons.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="shop-phone" label="Phone" type="tel" value={contact.phone} onChange={set('contact', 'phone')} placeholder="+216 71 234 567" required />
          <Field id="shop-whatsapp" label="WhatsApp" type="tel" value={contact.whatsapp} onChange={set('contact', 'whatsapp')} placeholder="+216 98 765 432" hint="Leave empty to hide the WhatsApp buttons." />
          <Field id="shop-email" label="Email" type="email" value={contact.email} onChange={set('contact', 'email')} required />
          <Field id="shop-address" label="Address" value={contact.address} onChange={set('contact', 'address')} required />
        </div>
      </Section>

      <Section title="Bank transfer" description="The account customers pay into when they choose bank transfer, shown at checkout and in the order email. Bank transfer is only offered once the account holder and RIB are filled in; empty the RIB to stop offering it.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field id="bank-beneficiary" label="Account holder" value={bank.beneficiary} onChange={set('bank', 'beneficiary')} placeholder="STES SARL" />
          <Field id="bank-name" label="Bank" value={bank.bankName} onChange={set('bank', 'bankName')} placeholder="BIAT, Attijari, BNA…" />
          <Field id="bank-rib" label="RIB" value={bank.rib} onChange={set('bank', 'rib')} inputMode="numeric" placeholder="20 digits" hint="As on your bank statement. The IBAN (TN59…) is worked out from it." />
        </div>
      </Section>

      <Section title="Delivery" description="Used to price every order. The base cost is multiplied by a factor for the customer's governorate (1 in Grand Tunis, up to 1.7 in Tataouine) and doubled for urgent delivery.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field id="free-delivery-over" label="Free delivery above" type="number" min="0" step="0.001" suffix="TND" value={delivery.freeDeliveryOver} onChange={set('delivery', 'freeDeliveryOver')} required />
          <Field id="base-delivery-cost" label="Base delivery cost" type="number" min="0" step="0.001" suffix="TND" value={delivery.baseCost} onChange={set('delivery', 'baseCost')} required />
          <Field id="cash-on-delivery-fee" label="Cash on delivery fee" type="number" min="0" step="0.001" suffix="TND" value={delivery.cashOnDeliveryFee} onChange={set('delivery', 'cashOnDeliveryFee')} required />
        </div>
      </Section>

      <Section title="Invoices" description="Printed on invoices and order summaries (PDF). An order gets its invoice number when you mark it delivered. The stamp duty (timbre fiscal) is added to every order's total; 0 turns it off.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="invoice-company" label="Company name" value={invoice.companyName ?? ''} onChange={set('invoice', 'companyName')} placeholder="STES SARL" hint="As registered. Empty: STES.tn" />
          <Field id="invoice-tax-id" label="Matricule fiscal" value={invoice.taxId ?? ''} onChange={set('invoice', 'taxId')} placeholder="1234567A/A/M/000" hint="As on your tax card (carte d'identification fiscale)." />
          <Field id="invoice-trade-register" label="Trade register (RNE)" value={invoice.tradeRegister ?? ''} onChange={set('invoice', 'tradeRegister')} placeholder="B0123452026" />
          <Field id="invoice-address" label="Legal address" value={invoice.address ?? ''} onChange={set('invoice', 'address')} hint="Empty: the contact address above." />
          <Field id="invoice-stamp-duty" label="Stamp duty (timbre fiscal)" type="number" min="0" step="0.001" suffix="TND" value={invoice.stampDuty ?? 1} onChange={set('invoice', 'stampDuty')} />
        </div>
      </Section>

      <Section title="Stock" description="Products at or below this quantity are flagged as low stock in Products and in the notifications bell.">
        <div className="max-w-xs">
          <Field id="low-stock-threshold" label="Low stock at" type="number" min="0" step="1" suffix="units" value={settings.lowStockThreshold} onChange={set(null, 'lowStockThreshold')} required />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-4">
        <SaveButton saving={saving}>Save shop settings</SaveButton>
        <Result result={result} />
      </div>
    </form>
  );
};

const AdminSettings = () => {
  const { hasPermission } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEditShop = hasPermission('settings');
  const requested = searchParams.get('tab');
  const tab = canEditShop && ['shop', 'home', 'builder', 'reminders', 'marketing'].includes(requested) ? requested : 'account';

  const tabs = [
    { id: 'account', label: 'My account', icon: User },
    ...(canEditShop ? [{ id: 'shop', label: 'Shop', icon: Store }, { id: 'home', label: 'Home page', icon: Waves }, { id: 'builder', label: 'Pool builder', icon: Ruler }, { id: 'reminders', label: 'Reminders', icon: Bell }, { id: 'marketing', label: 'Marketing', icon: Megaphone }] : [])
  ];

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div role="tablist" className="inline-flex flex-wrap p-1 bg-gray-100 rounded-lg">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setSearchParams(id === 'account' ? {} : { tab: id }, { replace: true })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${tab === id ? 'bg-surface shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'shop' && <ShopSettings />}
      {tab === 'home' && <HomePageSettings />}
      {tab === 'builder' && <PoolBuilderSettings />}
      {tab === 'reminders' && <RemindersSettings />}
      {tab === 'marketing' && <MarketingSettings />}
      {tab === 'account' && <MyAccount />}
    </div>
  );
};

export default AdminSettings;
