import adminApi from '../../utils/adminApi';

export const adminGet = (url, params, config = {}) => adminApi.get(url, { ...config, params });

export const formatTND = (amount) => `${Number(amount || 0).toFixed(3)} TND`;

export const timeAgo = (date) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};
