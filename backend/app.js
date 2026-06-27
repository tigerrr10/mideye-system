require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Absolute path to the frontend/ folder (one level up from backend/)
const FRONTEND = path.join(__dirname, '..', 'frontend');

const authRoutes    = require('./routes/authRoutes');
const userRoutes    = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const cargoRoutes   = require('./routes/cargoRoutes');
const flightRoutes  = require('./routes/flightRoutes');
const cityRoutes    = require('./routes/cityRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const supportRoutes = require('./routes/supportRoutes');
const { protect }   = require('./middleware/auth');
const { trackCargo } = require('./controllers/cargoController');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Add your Vercel frontend URL to the allowed list before deploying.
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null', // file:// protocol during local dev

  // ── Production: replace with your real Vercel URL ────────────────────────
  'https://YOUR-VERCEL-DOMAIN.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Render health checks, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve Static Frontend ────────────────────────────────────────────────────
// frontend/css       → /css/...
// frontend/js        → /js/...
// frontend/images    → /images/...
// frontend/templates → /templates/...
app.use(express.static(FRONTEND));

// Also expose every HTML template at root level so that relative links such as
// href="booking.html" resolve correctly when the user is on http://localhost:5000/
// (the root URL).  Without this, /booking.html would 404 and fall back to index.html.
app.use(express.static(path.join(FRONTEND, 'templates')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/user',     userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cargo',    cargoRoutes);
app.use('/api/flights',  flightRoutes);
app.use('/api/cities',   cityRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/support',  supportRoutes);

// Tracking shortcut — authenticated users only
app.get('/api/track/:tracking_id', protect, trackCargo);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'Mideye API is running',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  });
});

// ─── Frontend Page Routes ─────────────────────────────────────────────────────
// Root → homepage
app.get('/', (req, res) =>
  res.sendFile(path.join(FRONTEND, 'templates', 'index.html')));

// Clean URL aliases (optional but convenient)
const pages = {
  '/login':      'login.html',
  '/register':   'register.html',
  '/booking':    'booking.html',
  '/cargo':      'cargo.html',
  '/tracking':   'tracking.html',
  '/admin':      'admin.html',
  '/dashboard':  'user-dashboard.html',
  '/ticket':     'ticket.html',
};
Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) =>
    res.sendFile(path.join(FRONTEND, 'templates', file)));
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  // API requests → JSON 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found.`,
    });
  }
  // Everything else → serve the homepage (handles direct URL navigation)
  res.sendFile(path.join(FRONTEND, 'templates', 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

module.exports = app;
