const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getProfile,
  updateProfile,
  changePassword,
  getUserBookings,
  getUserCargo,
  getUserStats,
  getBookingTicket,
  recordTicketDownload,
} = require('../controllers/userController');

const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All user routes require a valid token.
// Both 'user' and 'admin' roles can access these (admins may view their own data).
router.use(authenticateToken);

// GET  /api/user/profile
router.get('/profile', getProfile);

// PUT  /api/user/profile
router.put(
  '/profile',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  ],
  validate,
  updateProfile
);

// PUT  /api/user/change-password
router.put('/change-password', changePassword);

// GET  /api/user/stats
router.get('/stats', getUserStats);

// GET  /api/user/bookings
router.get('/bookings', getUserBookings);

// GET  /api/user/bookings/:id/ticket  (Completed only)
router.get('/bookings/:id/ticket', getBookingTicket);

// POST /api/user/bookings/:id/ticket/download
router.post('/bookings/:id/ticket/download', recordTicketDownload);

// GET  /api/user/cargo
router.get('/cargo', getUserCargo);

module.exports = router;
