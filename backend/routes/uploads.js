const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { auth, checkPermission } = require('../middleware/auth');
const { uploadRoot } = require('../config/uploads');

const MAX_BYTES = 5 * 1024 * 1024;

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 }
});

const receiveImage = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Image trop volumineuse (5 Mo maximum).'
        : "Envoi invalide : joignez une seule image dans le champ « image ».";
      return res.status(400).json({ message });
    }
    next(error);
  });
};

// POST /api/admin/uploads/product-image - Upload a product photo (Admin only)
// Returns the URL to store in the product's `image` field.
router.post('/product-image', auth, checkPermission('products'), receiveImage, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image reçue.' });
    }

    const extension = detectImageType(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ message: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.' });
    }

    const directory = path.join(uploadRoot(), 'products');
    await fs.mkdir(directory, { recursive: true });
    const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
    await fs.writeFile(path.join(directory, filename), req.file.buffer);

    res.status(201).json({ url: `/api/uploads/products/${filename}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
