// Placeholder for products without a photo (served by the backend)
export const PLACEHOLDER_IMAGE = '/api/placeholder/600/400';

// onError handler for product photos: if an image URL is broken, show the
// placeholder instead of a broken-image icon.
export const showPlaceholderOnError = (event) => {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = PLACEHOLDER_IMAGE;
};
