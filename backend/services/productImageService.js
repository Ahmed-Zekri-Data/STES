const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { uploadRoot } = require('../config/uploads');

// Product photos saved on the server (Admin → Products: one photo in the
// product form, or many at once with "Import photos").

// The image type is read from the file's first bytes: the file name and the
// MIME type sent by the browser can be anything. SVG is not accepted, since
// it can contain scripts.
const detectImageType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
};

// Saves the photo under a random name; returns its URL, or null when the
// file is not a JPEG, PNG or WebP image
const saveProductImage = async (buffer) => {
  const extension = detectImageType(buffer);
  if (!extension) return null;
  const directory = path.join(uploadRoot(), 'products');
  await fs.mkdir(directory, { recursive: true });
  const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  await fs.writeFile(path.join(directory, filename), buffer);
  return `/api/uploads/products/${filename}`;
};

// Products without a photo use the shop's placeholder
const hasPhoto = (image) => Boolean(image) && !String(image).startsWith('/api/placeholder');

module.exports = { detectImageType, saveProductImage, hasPhoto };
