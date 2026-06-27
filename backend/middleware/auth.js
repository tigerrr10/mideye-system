const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ── authenticateToken ─────────────────────────────────────────────────────────
// Verifies JWT from Authorization header and attaches req.user.
// Alias: protect (backwards compat)
const authenticateToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'NO_TOKEN',
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Token is valid but user no longer exists.',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token.',
    });
  }
};

// ── isStaffOrAdmin ────────────────────────────────────────────────────────────
const isStaffOrAdmin = (req, res, next) => {
  if (req.user && ['admin', 'staff'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'STAFF_OR_ADMIN_ONLY',
    message: 'Access denied. Staff or administrator privileges required.',
  });
};

// ── isAdmin ───────────────────────────────────────────────────────────────────
// Allows only users with role === 'admin'.
// Must be used AFTER authenticateToken.
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'ADMIN_ONLY',
    message: 'Access denied. Administrator privileges required.',
  });
};

// ── isUser ────────────────────────────────────────────────────────────────────
// Allows only users with role === 'user'.
// Must be used AFTER authenticateToken.
const isUser = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'USER_ONLY',
    message: 'Access denied. This route is for regular users only.',
  });
};

// ── optionalAuth ──────────────────────────────────────────────────────────────
// Attaches req.user when a valid token is sent; continues as guest otherwise.
// Use on public routes (bookings/cargo POST) so logged-in users get user_id set.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (user) req.user = user;
  } catch {
    // Invalid/expired token — treat as guest, do not block the request
  }
  next();
};

// Backwards-compatible aliases
const protect   = authenticateToken;
const adminOnly = isAdmin;

module.exports = { authenticateToken, protect, isAdmin, isStaffOrAdmin, isUser, adminOnly, staffOrAdmin: isStaffOrAdmin, optionalAuth };
