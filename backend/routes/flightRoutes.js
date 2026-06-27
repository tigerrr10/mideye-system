const express = require('express');
const router = express.Router();
const { searchFlights } = require('../controllers/flightController');
const { protect } = require('../middleware/auth');

router.get('/', protect, searchFlights);

module.exports = router;
