const express = require('express');
const router = express.Router();
const { searchFlights } = require('../controllers/flightController');

router.get('/', searchFlights);

module.exports = router;
