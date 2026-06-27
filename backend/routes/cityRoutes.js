const express = require('express');
const router = express.Router();
const { getAllCities } = require('../controllers/cityController');

router.get('/', getAllCities);

module.exports = router;
