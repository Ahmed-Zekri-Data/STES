const express = require('express');
const router = express.Router();

const MAX_SIZE = 2000;

// Serves a neutral placeholder image of any size, used for products without
// a photo: GET /api/placeholder/300/200
router.get('/:width/:height', (req, res) => {
  const width = Number(req.params.width);
  const height = Number(req.params.height);

  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > MAX_SIZE || height > MAX_SIZE) {
    return res.status(400).json({ message: `Width and height must be whole numbers from 1 to ${MAX_SIZE}` });
  }

  // A water drop centred in the image, sized to the shorter side
  const size = Math.min(width, height) * 0.3;
  const x = width / 2;
  const y = height / 2 - size * 0.1;
  const drop = `M ${x} ${y - size / 2}
    C ${x + size * 0.45} ${y + size * 0.05}, ${x + size * 0.4} ${y + size / 2}, ${x} ${y + size / 2}
    C ${x - size * 0.4} ${y + size / 2}, ${x - size * 0.45} ${y + size * 0.05}, ${x} ${y - size / 2} Z`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0f9ff"/>
      <stop offset="1" stop-color="#e0f2fe"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <path d="${drop.replace(/\s+/g, ' ')}" fill="#7dd3fc"/>
</svg>`;

  res.set({
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=604800',
    // Helmet defaults to same-origin; images may be shown from another origin
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
  res.send(svg);
});

module.exports = router;
