const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  getAllBookings,
  getAllCargo,
  getDashboardStats,
  deleteUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
} = require('../controllers/adminController');
const {
  getAllFlights,
  createFlight,
  updateFlight,
  deleteFlight,
} = require('../controllers/flightController');
const {
  getAllCities,
  createCity,
  updateCity,
  deleteCity,
} = require('../controllers/cityController');
const {
  getAllSupportTickets,
  updateSupportTicketStatus,
} = require('../controllers/supportController');
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');

router.use(protect);

router.get('/stats', staffOrAdmin, getDashboardStats);
router.get('/bookings', staffOrAdmin, getAllBookings);
router.get('/cargo', staffOrAdmin, getAllCargo);
router.get('/flights', staffOrAdmin, getAllFlights);
router.post('/flights', staffOrAdmin, createFlight);
router.put('/flights/:id', staffOrAdmin, updateFlight);
router.delete('/flights/:id', staffOrAdmin, deleteFlight);
router.get('/cities', staffOrAdmin, getAllCities);
router.post('/cities', staffOrAdmin, createCity);
router.put('/cities/:id', staffOrAdmin, updateCity);
router.delete('/cities/:id', staffOrAdmin, deleteCity);
router.get('/support', staffOrAdmin, getAllSupportTickets);
router.patch('/support/:id/status', staffOrAdmin, updateSupportTicketStatus);

router.get('/users', adminOnly, getAllUsers);
router.get('/users/:id', adminOnly, getUserById);
router.put('/users/:id', adminOnly, updateUser);
router.patch('/users/:id/role', adminOnly, updateUserRole);
router.patch('/users/:id/status', adminOnly, updateUserStatus);
router.delete('/users/:id', adminOnly, deleteUser);

module.exports = router;
