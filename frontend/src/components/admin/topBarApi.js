import axios from 'axios';

// Sends the admin token explicitly: the shared axios defaults can hold a
// customer token when someone is also signed in to the shop.
export const adminGet = (url, params, config = {}) => axios.get(url, {
  ...config,
  params,
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
});

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
