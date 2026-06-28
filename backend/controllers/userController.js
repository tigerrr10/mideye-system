const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Booking, Cargo } = require('../models');
const formatBookingReference = require('../utils/formatBookingReference');

// GET /api/user/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'full_name', 'email', 'phone', 'role', 'created_at'],
    });
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    await User.update(
      { full_name, phone: phone || null },
      { where: { id: req.user.id } }
    );

    const updated = await User.findByPk(req.user.id, {
      attributes: ['id', 'full_name', 'email', 'phone', 'role'],
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updated },
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/user/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Both current and new password are required.',
      });
    }
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(new_password, salt);
    await User.update(
      { password: hashed, visible_password: new_password },
      { where: { id: req.user.id } }
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/user/bookings
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings },
    });
  } catch (error) {
    console.error('getUserBookings error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/user/cargo
const getUserCargo = async (req, res) => {
  try {
    const shipments = await Cargo.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: shipments.length,
      data: { shipments },
    });
  } catch (error) {
    console.error('getUserCargo error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/user/stats
const getUserStats = async (req, res) => {
  try {
    const { Op } = require('sequelize');

    const [
      totalBookings,
      totalCargo,
      pendingBookings,
      confirmedBookings,
      inTransitCargo,
      arrivedCargo,
    ] = await Promise.all([
      Booking.count({ where: { user_id: req.user.id } }),
      Cargo.count({ where: { user_id: req.user.id } }),
      Booking.count({
        where: {
          user_id: req.user.id,
          status: 'Pending',
        },
      }),
      Booking.count({ where: { user_id: req.user.id, status: 'Completed' } }),
      Cargo.count({ where: { user_id: req.user.id, status: 'In Transit' } }),
      Cargo.count({
        where: {
          user_id: req.user.id,
          status: { [Op.in]: ['Arrived', 'Ready for Pickup', 'Delivered'] },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          total_bookings: totalBookings,
          total_cargo: totalCargo,
          pending_bookings: pendingBookings,
          confirmed_bookings: confirmedBookings,
          cargo_in_transit: inTransitCargo,
          cargo_arrived: arrivedCargo,
        },
      },
    });
  } catch (error) {
    console.error('getUserStats error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/user/bookings/:id/ticket
const getBookingTicket = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'Completed') {
      return res.status(403).json({
        success: false,
        message: 'Your e-ticket is available only after admin marks the booking as Completed.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        booking,
        ticket_ref: formatBookingReference(booking.id, booking.created_at),
      },
    });
  } catch (error) {
    console.error('getBookingTicket error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/user/bookings/:id/ticket/download
const recordTicketDownload = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'Completed') {
      return res.status(403).json({
        success: false,
        message: 'Ticket download can only be recorded for Completed bookings.',
      });
    }

    await booking.update({ ticket_downloaded_at: new Date() });

    return res.status(200).json({
      success: true,
      message: 'Ticket download recorded.',
      data: { booking },
    });
  } catch (error) {
    console.error('recordTicketDownload error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getUserBookings,
  getUserCargo,
  getUserStats,
  getBookingTicket,
  recordTicketDownload,
};
