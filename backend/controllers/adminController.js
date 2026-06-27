const { User, Booking, Cargo, Flight } = require('../models');
const {
  calcBookingPrice,
  calcCargoPrice,
  isBookingPaid,
  isCargoPaid,
  isBookingPendingPayment,
  isCargoPendingPayment,
} = require('../utils/revenue');

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
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
    console.error('Admin get bookings error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/cargo
const getAllCargo = async (req, res) => {
  try {
    const shipments = await Cargo.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email'],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count: shipments.length,
      data: { shipments },
    });
  } catch (error) {
    console.error('Admin get cargo error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalBookings,
      totalCargo,
      totalFlights,
      pendingBookings,
      inTransitCargo,
      bookings,
      cargo,
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Booking.count(),
      Cargo.count(),
      Flight.count(),
      Booking.count({ where: { status: 'Pending' } }),
      Cargo.count({ where: { status: 'In Transit' } }),
      Booking.findAll({ attributes: ['status', 'cabin_class', 'adults', 'children'] }),
      Cargo.findAll({ attributes: ['status', 'weight'] }),
    ]);

    let totalPayments = 0;
    let pendingPayments = 0;
    let totalRevenue = 0;

    bookings.forEach((b) => {
      if (isBookingPaid(b.status)) {
        totalPayments += 1;
        totalRevenue += calcBookingPrice(b);
      } else if (isBookingPendingPayment(b.status)) {
        pendingPayments += 1;
      }
    });

    cargo.forEach((c) => {
      if (isCargoPaid(c.status)) {
        totalPayments += 1;
        totalRevenue += calcCargoPrice(c);
      } else if (isCargoPendingPayment(c.status)) {
        pendingPayments += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          total_users: totalUsers,
          total_bookings: totalBookings,
          total_cargo: totalCargo,
          total_flights: totalFlights,
          pending_bookings: pendingBookings,
          cargo_in_transit: inTransitCargo,
          total_payments: totalPayments,
          pending_payments: pendingPayments,
          total_revenue: Math.round(totalRevenue * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    }
    await user.destroy();
    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { full_name, email, phone } = req.body;

    if (full_name !== undefined && !String(full_name).trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (email !== undefined && !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
    }

    await user.update({
      full_name: full_name !== undefined ? String(full_name).trim() : user.full_name,
      email: email !== undefined ? String(email).trim() : user.email,
      phone: phone !== undefined ? (phone ? String(phone).trim() : null) : user.phone,
    });

    const { password, ...safeUser } = user.toJSON();
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully.',
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "user", "staff", or "admin".' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.id === req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role.' });
    }

    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(403).json({ success: false, message: 'Cannot demote the last administrator.' });
      }
    }

    await user.update({ role });

    const { password, ...safeUser } = user.toJSON();
    return res.status(200).json({
      success: true,
      message: `Role updated to "${role}".`,
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active must be true or false.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate admin accounts.' });
    }

    if (user.id === req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    await user.update({ is_active });

    const { password, ...safeUser } = user.toJSON();
    return res.status(200).json({
      success: true,
      message: is_active ? 'Account activated successfully.' : 'Account deactivated successfully.',
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getAllUsers,
  getAllBookings,
  getAllCargo,
  getDashboardStats,
  deleteUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
};
