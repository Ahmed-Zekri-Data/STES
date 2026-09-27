// Periods offered on Admin → Reports, as [from, to] days (yyyy-mm-dd, both
// included) in the browser's time, which is the shop's in Tunisia

// yyyy-mm-dd of a local date
const isoDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const daysAgo = (today, days) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);

export const PRESETS = {
  last7: { label: 'Last 7 days', range: (today) => [daysAgo(today, 6), today] },
  last30: { label: 'Last 30 days', range: (today) => [daysAgo(today, 29), today] },
  thisMonth: { label: 'This month', range: (today) => [new Date(today.getFullYear(), today.getMonth(), 1), today] },
  lastMonth: {
    label: 'Last month',
    range: (today) => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]
  },
  thisYear: { label: 'This year', range: (today) => [new Date(today.getFullYear(), 0, 1), today] },
  lastYear: { label: 'Last year', range: (today) => [new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31)] }
};

export const presetRange = (preset, today = new Date()) => PRESETS[preset].range(today).map(isoDate);
