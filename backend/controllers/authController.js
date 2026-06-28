const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isValidSomaliPhone, normalizeSomaliPhone } = require('../utils/phone');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const full_name = (req.body.fullName || req.body.full_name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phoneRaw = req.body.phone;
    const password = req.body.password;

    if (!phoneRaw || !String(phoneRaw).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    if (!isValidSomaliPhone(phoneRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid Somali phone number (e.g. +252 61 1234567 or 0611234567).',
      });
    }

    const phone = normalizeSomaliPhone(phoneRaw);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      full_name,
      email,
      phone,
      password: hashedPassword,
      visible_password: password,
      role: 'user',
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    if (!user.visible_password || user.visible_password !== password) {
      await user.update({ visible_password: password });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

module.exports = { register, login, getMe };
