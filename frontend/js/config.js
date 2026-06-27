/**
 * Mideye – API Configuration
 *
 * LOCAL DEV  : same origin as the page (e.g. http://localhost:5000/api)
 * PRODUCTION : runs against your Render backend URL
 */

const IS_LOCAL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.protocol === 'file:';

// ── Set this to your Render backend URL before deploying ─────────────────────
const PRODUCTION_API = 'https://YOUR-RENDER-BACKEND.onrender.com';

// ── Used by api.js and any inline fetch() calls ───────────────────────────────
const API_BASE_URL = (() => {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:5000/api';
  }
  if (IS_LOCAL) {
    return `${window.location.origin}/api`;
  }
  return `${PRODUCTION_API}/api`;
})();

// ── Official WhatsApp for payments & support ─────────────────────────────────
const MIDEYE_WHATSAPP_NUMBER = '252907816567';
