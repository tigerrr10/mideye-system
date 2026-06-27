const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { isValidSomaliPhone } = require('../utils/phone');

const normalizeRegisterBody = (req, _res, next) => {
  if (req.body.fullName && !req.body.full_name) {
    req.body.full_name = req.body.fullName;
  }
  next();
};

// POST /api/auth/register
router.post(
  '/register',
  normalizeRegisterBody,
  [
    body('full_name')
      .trim()
      .notEmpty().withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Please provide a valid email address.'),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .custom((value) => isValidSomaliPhone(value))
      .withMessage('Enter a valid Somali phone number (e.g. +252 61 1234567 or 0611234567).'),
    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Invalid email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
