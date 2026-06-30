const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, staffOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const bookingValidation = [
  body('first_name').trim().notEmpty().withMessage('First name is required.'),
  body('last_name').trim().notEmpty().withMessage('Last name is required.'),
  body('email').trim().isEmail().withMessage('Valid email is required.'),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('origin').trim().notEmpty().withMessage('Departure city is required.'),
  body('destination').trim().notEmpty().withMessage('Arrival city is required.'),
  body('travel_date').isDate().withMessage('Valid travel date is required.'),
  body('flight_id').optional().isString().isLength({ min: 3, max: 20 })
    .withMessage('Flight ID must be a valid string.'),
  body('flight_record_id').optional().isInt({ min: 1 })
    .withMessage('Flight record ID must be a positive integer.'),
];

// POST /api/bookings  — authenticated users only
router.post('/', protect, bookingValidation, validate, createBooking);

// GET /api/bookings  — protected
router.get('/', protect, getBookings);

// GET /api/bookings/:id  — protected
router.get('/:id', protect, getBookingById);

// PUT /api/bookings/:id  — admin only
router.put('/:id', protect, staffOrAdmin, updateBookingStatus);

module.exports = router;
