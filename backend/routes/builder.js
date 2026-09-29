const express = require('express');
const router = express.Router();
const { getBuilder } = require('../services/poolPlanService');

// GET /api/builder - What "Construire ma piscine" offers: the equipment
// chosen in Admin → Settings → Pool builder, and the price per m² range
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await getBuilder());
  } catch (error) {
    console.error('Error loading the pool builder:', error);
    res.status(500).json({ message: 'Error loading the pool builder' });
  }
});

module.exports = router;
