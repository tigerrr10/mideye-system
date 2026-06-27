const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createCargo,
  getCargo,
  getCargoById,
  updateCargoStatus,
  trackCargo,
} = require('../controllers/cargoController');
const { protect, staffOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const cargoValidation = [
  body('sender_name').trim().notEmpty().withMessage('Sender name is required.'),
  body('sender_phone').trim().notEmpty().withMessage('Sender phone is required.'),
  body('recipient_name').trim().notEmpty().withMessage('Recipient name is required.'),
  body('recipient_phone').trim().notEmpty().withMessage('Recipient phone is required.'),
  body('destination').trim().notEmpty().withMessage('Destination is required.'),
  body('cargo_type').trim().notEmpty().withMessage('Cargo type is required.'),
  body('weight')
    .isFloat({ min: 0.1 })
    .withMessage('Weight must be a positive number.'),
];

// Tracking route  — authenticated users only
router.get('/track/:tracking_id', protect, trackCargo);

// POST /api/cargo  — authenticated users only
router.post('/', protect, cargoValidation, validate, createCargo);

// GET /api/cargo  — protected
router.get('/', protect, getCargo);

// GET /api/cargo/:id  — protected
router.get('/:id', protect, getCargoById);

// PUT /api/cargo/:id  — admin only
router.put('/:id', protect, staffOrAdmin, updateCargoStatus);

module.exports = router;
