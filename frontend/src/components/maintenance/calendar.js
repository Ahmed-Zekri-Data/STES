// "Mon calendrier d'entretien": dates of the reminders and the pool's
// volume. The server decides when reminders are sent
// (backend/services/maintenanceService.js): keep WINDOW_DAYS in step.
import { figures, sanitize } from '../builder/plan';

export const WINDOW_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const dateLabel = ({ month, day }) => `${day === 1 ? '1er' : day} ${MONTH_NAMES[month - 1]}`;

const utcDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

// The reminder happening now (its date was less than WINDOW_DAYS days ago)
// and the next one to come
export const whereWeAre = (reminders, now = new Date()) => {
  const today = utcDay(now);
  const year = now.getFullYear();
  const current = reminders.find(r => [year, year - 1].some(y => {
    const since = (today - Date.UTC(y, r.month - 1, r.day)) / DAY;
    return since >= 0 && since < WINDOW_DAYS;
  }));
  const next = [...reminders]
    .map(r => {
      const thisYear = Date.UTC(year, r.month - 1, r.day);
      return { key: r.key, at: thisYear > today ? thisYear : Date.UTC(year + 1, r.month - 1, r.day) };
    })
    .sort((a, b) => a.at - b.at)[0];
  return { current: current?.key || null, next: next?.key || null };
};

// The volume from the link (?volume=55), else from the pool drawn in
// "Construire ma piscine", else nothing
export const initialVolume = () => {
  const fromLink = Number(new URLSearchParams(window.location.search).get('volume'));
  if (fromLink >= 1 && fromLink <= 2000) return fromLink;
  try {
    const saved = JSON.parse(localStorage.getItem('stes-pool-plan'));
    if (saved) return figures(sanitize(saved).pool).volume;
  } catch { /* private mode or nothing saved */ }
  return '';
};

export const volumeOf = (length, width, depth) => {
  const v = Number(length) * Number(width) * Number(depth);
  return v > 0 ? Math.round(v * 10) / 10 : '';
};
