const { Booking, User } = require('../models');
const { Op } = require('sequelize');

// POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const {
      trip_type,
      first_name,
      last_name,
      email,
      phone,
      origin,
      destination,
      travel_date,
      return_date,
      adults,
      children,
      infants,
      cabin_class,
      seat_preference,
      special_requests,
    } = req.body;

    const passenger_name = `${first_name} ${last_name}`.trim();

    const booking = await Booking.create({
      user_id: req.user ? req.user.id : null,
      trip_type: trip_type || 'oneway',
      passenger_name,
      phone,
      email,
      origin,
      destination,
      travel_date,
      return_date: return_date || null,
      adults: adults || 1,
      children: children || 0,
      infants: infants || 0,
      cabin_class: cabin_class || 'economy',
      seat_preference: seat_preference || null,
      special_requests: special_requests || null,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully. We will contact you shortly.',
      data: { booking },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// GET /api/bookings  (admin sees all, user sees their own)
const getBookings = async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };

    const bookings = await Booking.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'phone'],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'phone'],
          required: false,
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, data: { booking } });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/bookings/:id  (admin updates status)
const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const { status } = req.body;
    const validStatuses = ['Pending', 'Reject', 'Completed', 'Cancelled', 'Delay'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    await booking.update({ status });

    return res.status(200).json({
      success: true,
      message: `Booking status updated to "${status}".`,
      data: { booking },
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { createBooking, getBookings, getBookingById, updateBookingStatus };
