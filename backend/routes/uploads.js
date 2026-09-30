const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, checkPermission } = require('../middleware/auth');
const { saveProductImage } = require('../services/productImageService');

const MAX_BYTES = 5 * 1024 * 1024;

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

    const url = await saveProductImage(req.file.buffer);
    if (!url) {
      return res.status(400).json({ message: 'Format non pris en charge : JPEG, PNG ou WebP uniquement.' });
    }

    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
