// Audience measurement (Google Analytics 4) and the Meta pixel (Facebook and
// Instagram ads), set up in Admin → Settings → Marketing. Nothing is loaded
// and nothing is sent before the visitor accepts cookies (CookieConsent);
// a refusal is kept, and the choice can be changed from the footer.

const CONSENT_KEY = 'stes-cookies';

const readConsent = () => {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
};

let config = { gaMeasurementId: '', metaPixelId: '' };
let consent = readConsent();
const loaded = { ga: false, meta: false };
const listeners = new Set();

const addScript = (src) => {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const loadGoogle = () => {
  if (loaded.ga || !config.gaMeasurementId) return;
  loaded.ga = true;
  window.dataLayer = window.dataLayer || [];
  // Google's gtag() pushes its arguments object as it is
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Page views are sent on each page change of the shop (trackPage)
  window.gtag('config', config.gaMeasurementId, { send_page_view: false });
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`);
};

const loadMeta = () => {
  if (loaded.meta || !config.metaPixelId) return;
  loaded.meta = true;
  // Meta's snippet: calls wait in a queue until fbevents.js takes over
  const fbq = function fbq() {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    else fbq.queue.push(arguments);
  };
  Object.assign(fbq, { push: fbq, loaded: true, version: '2.0', queue: [] });
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  addScript('https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', config.metaPixelId);
};

const load = () => {
  if (consent !== 'granted') return;
  loadGoogle();
  loadMeta();
};

// From the shop settings (Admin → Settings → Marketing)
export const configureAnalytics = ({ gaMeasurementId = '', metaPixelId = '' } = {}) => {
  config = { gaMeasurementId, metaPixelId };
  load();
};

// Something to measure: the cookie banner is only shown then
export const measuring = () => Boolean(config.gaMeasurementId || config.metaPixelId);

export const getConsent = () => consent;

export const setConsent = (value) => {
  consent = value;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private browsing: the choice holds for this visit
  }
  load();
  listeners.forEach(listener => listener(value));
};

export const onConsentChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const google = () => (consent === 'granted' && config.gaMeasurementId && window.gtag) || null;
const meta = () => (consent === 'granted' && config.metaPixelId && window.fbq) || null;

// A page of the shop was shown
export const trackPage = (path) => {
  google()?.('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
  meta()?.('track', 'PageView');
};

// Shop events, named as Google Analytics names them, with Meta's equivalent
const META_EVENTS = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' };

// items: [{ id, name, price, quantity, variant }]; prices on request count 0
export const track = (name, data = {}) => {
  const ga = google();
  const fb = meta();
  if (!ga && !fb) return;

  if (META_EVENTS[name]) {
    const list = data.items || [];
    const value = Math.round(list.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0) * 1000) / 1000;
    const order = name === 'purchase' ? data.orderNumber : undefined;
    ga?.('event', name, {
      currency: 'TND',
      value: data.value ?? value,
      ...(order && { transaction_id: order }),
      items: list.map(item => ({
        item_id: String(item.id),
        item_name: item.name,
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
        ...(item.variant && { item_variant: item.variant })
      }))
    });
    fb?.('track', META_EVENTS[name], {
      currency: 'TND',
      value: data.value ?? value,
      content_type: 'product',
      content_ids: list.map(item => String(item.id)),
      contents: list.map(item => ({ id: String(item.id), quantity: item.quantity || 1 })),
      ...(order && { num_items: list.reduce((sum, item) => sum + (item.quantity || 1), 0) })
    }, ...(order ? [{ eventID: order }] : []));
    return;
  }
  if (name === 'generate_lead') {
    ga?.('event', 'generate_lead', { form: data.form });
    fb?.('track', 'Lead', { content_name: data.form });
  } else if (name === 'search') {
    ga?.('event', 'search', { search_term: data.term });
    fb?.('track', 'Search', { search_string: data.term });
  } else if (name === 'sign_up') {
    ga?.('event', 'sign_up', { method: 'email' });
    fb?.('track', 'CompleteRegistration');
  }
};

// For tests: back to a fresh page
export const resetAnalytics = () => {
  config = { gaMeasurementId: '', metaPixelId: '' };
  consent = readConsent();
  loaded.ga = false;
  loaded.meta = false;
  listeners.clear();
};
