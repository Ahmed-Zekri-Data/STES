const express = require('express');
const router = express.Router();
const { getShowcase } = require('../services/showcaseService');

// GET /api/showcase - What the home page sells: the products chosen in
// Admin → Settings → Home page, packs, orders by governorate, best reviews
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await getShowcase());
  } catch (error) {
    console.error('Error loading the showcase:', error);
    res.status(500).json({ message: 'Error loading the home page' });
  }
});

module.exports = router;
