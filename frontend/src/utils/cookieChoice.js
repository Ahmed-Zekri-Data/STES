// The footer's "Cookies" link opens the cookie choice again (CookieConsent)
export const OPEN_COOKIE_CHOICE = 'stes:cookie-choice';

export const openCookieChoice = () => window.dispatchEvent(new Event(OPEN_COOKIE_CHOICE));
