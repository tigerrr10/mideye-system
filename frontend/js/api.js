/**
 * Mideye Travel Agency – Frontend API Integration
 * Connects HTML forms to the Node.js backend at http://localhost:5000
 */

// API_BASE_URL is set by config.js (loaded before this file in every HTML page)
const API_BASE = typeof API_BASE_URL !== 'undefined'
  ? API_BASE_URL
  : 'http://localhost:5000/api'; // fallback for direct open without config.js

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('mideye_token');
const getUser  = () => JSON.parse(localStorage.getItem('mideye_user') || 'null');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handleUnauthorized = (res) => {
  if (res.status === 401) {
    AuthGuard?.redirectToLogin?.() || (window.location.replace('login.html'));
    return true;
  }
  return false;
};

const redirectAfterAuth = (user) => {
  const fallback = ['admin', 'staff'].includes(user?.role) ? 'admin.html' : 'index.html';
  return AuthGuard?.consumeRedirectAfterLogin?.(fallback) || fallback;
};

const ensureLoggedIn = () => {
  if (getToken() && getUser()) return true;
  AuthGuard?.redirectToLogin?.() || (window.location.replace('login.html'));
  return false;
};

const clearDashboardCache = () => {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('mideye_dash_'))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
};
window.clearDashboardCache = clearDashboardCache;

const showAlert = (message, type = 'success', containerId = 'alertBox') => {
  let box = document.getElementById(containerId);
  if (!box) {
    box = document.createElement('div');
    box.id = containerId;
    document.querySelector('main .container')?.prepend(box);
  }
  box.innerHTML = `
    <div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mt-3" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const setButtonLoading = (btn, loading) => {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Please wait…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
};

// ─── Unified navbar auth component (matches index.html / main.js exactly) ─────

const updateNavbar = () => {
  try {
    const token     = localStorage.getItem('mideye_token');
    const user      = getUser();
    const dashItem  = document.getElementById('navDashboardItem');
    const dashLink  = document.getElementById('navDashboardLink');
    const authBtns  = document.getElementById('navAuthButtons');

    if (!token || !user) return;

    // Show Dashboard link with correct target for this role
    if (dashItem && dashLink) {
      dashItem.style.display = '';
      dashLink.href = ['admin', 'staff'].includes(user.role) ? 'admin.html' : 'user-dashboard.html';
    }

    // Replace Login / Register with username pill + Logout — identical to index.html
    if (authBtns) {
      authBtns.innerHTML = `
        <span class="btn-outline-custom" style="font-size:0.85rem;padding:0.6rem 1.3rem;pointer-events:none;opacity:0.85;">
          <i class="fas fa-user-circle me-1"></i>${(user.full_name || 'User').split(' ')[0]}
        </span>
        <button onclick="mideyeLogout()" class="btn-gold-custom" style="font-size:0.85rem;padding:0.6rem 1.3rem;border:none;cursor:pointer;">
          <i class="fas fa-sign-out-alt me-1"></i>Logout
        </button>`;
    }
  } catch (e) {}
};

window.mideyeLogout = function () {
  localStorage.removeItem('mideye_token');
  localStorage.removeItem('mideye_user');
  window.location.replace('login.html');
};

// ─── LOGIN FORM  (login.html) ─────────────────────────────────────────────────

const showLoginToast = (message, type = 'success') => {
  if (!document.getElementById('loginForm')) return;

  const plainText = String(message).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
  const toastType = ['success', 'error', 'warning'].includes(type) ? type : 'success';

  let toast = document.getElementById('loginToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'loginToast';
    toast.className = 'login-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="login-toast-icon" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
      <p class="login-toast-msg"></p>
      <button type="button" class="login-toast-close" aria-label="Dismiss notification">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>`;
    document.body.appendChild(toast);
    toast.querySelector('.login-toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }

  toast.classList.remove('login-toast--success', 'login-toast--error', 'login-toast--warning');
  toast.classList.add(`login-toast--${toastType}`);

  const iconMap = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
  };
  toast.querySelector('.login-toast-icon i').className = iconMap[toastType];
  toast.querySelector('.login-toast-msg').textContent = plainText;

  toast.classList.remove('show');
  void toast.offsetWidth;
  requestAnimationFrame(() => toast.classList.add('show'));

  clearTimeout(toast._hideTimer);
  const duration = toastType === 'success' ? 4000 : 5000;
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), duration);
};

const initLoginForm = () => {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const email    = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;

    setButtonLoading(btn, true);

    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('mideye_token', data.data.token);
        localStorage.setItem('mideye_user',  JSON.stringify(data.data.user));
        showLoginToast('Login successful! Redirecting…', 'success');
        setTimeout(() => {
          window.location.href = redirectAfterAuth(data.data.user);
        }, 1000);
      } else {
        showLoginToast(data.message || 'Login failed. Please try again.', 'error');
      }
    } catch (err) {
      showLoginToast('Cannot connect to server. Make sure the backend is running.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
};

// ─── REGISTER FORM  (register.html) ──────────────────────────────────────────

const showRegisterToast = (message, type = 'success') => {
  if (!document.getElementById('registerForm')) return;

  const plainText = String(message).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
  const isSuccess = type === 'success';

  let toast = document.getElementById('registerToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'registerToast';
    toast.className = 'register-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="register-toast-icon" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
      <p class="register-toast-msg"></p>
      <button type="button" class="register-toast-close" aria-label="Dismiss notification">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>`;
    document.body.appendChild(toast);
    toast.querySelector('.register-toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }

  toast.classList.toggle('register-toast--success', isSuccess);
  toast.classList.toggle('register-toast--error', !isSuccess);
  toast.querySelector('.register-toast-icon i').className = isSuccess
    ? 'fas fa-check-circle'
    : 'fas fa-exclamation-circle';
  toast.querySelector('.register-toast-msg').textContent = plainText;

  toast.classList.remove('show');
  void toast.offsetWidth;
  requestAnimationFrame(() => toast.classList.add('show'));

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), isSuccess ? 4000 : 5000);
};

const initRegisterForm = () => {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (typeof window.validateRegisterForm === 'function' && !window.validateRegisterForm()) {
      return;
    }

    const btn      = form.querySelector('[type="submit"]');
    const fullName = (document.getElementById('regFullName') || form.querySelector('input[type="text"]')).value.trim();
    const email    = (document.getElementById('regEmail') || form.querySelector('input[type="email"]')).value.trim();
    const phone    = typeof window.getRegisterPhone === 'function'
      ? window.getRegisterPhone()
      : (document.getElementById('regPhone')?.value.trim() || '');
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm').value;

    if (password !== confirm) {
      showRegisterToast('Passwords do not match.', 'error');
      return;
    }

    setButtonLoading(btn, true);

    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.removeItem('mideye_redirect_after_login');
        showRegisterToast('Account created successfully! Redirecting to login…', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      } else {
        const msg = data.errors ? data.errors.map(e => e.message).join(' ') : data.message;
        showRegisterToast(msg, 'error');
      }
    } catch (err) {
      showRegisterToast('Cannot connect to server. Make sure the backend is running.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
};

// ─── BOOKING FORM  (booking.html) ─────────────────────────────────────────────

const splitFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') || parts[0] };
};

const initBookingForm = () => {
  const form = document.getElementById('flightBookingForm');
  // Dashboard layout with passenger sections is handled entirely by flights.js
  if (!form || document.getElementById('passengerSections')) return;
  // Legacy single-passenger form (passengerFullName field)
  if (!document.getElementById('passengerFullName')) return;

  form.addEventListener('submit', async (e) => {
    if (!ensureLoggedIn()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (typeof window.validateBookingPassengerForm === 'function' && !window.validateBookingPassengerForm()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const btn = form.querySelector('[type="submit"]');
    const origin      = document.getElementById('formOrigin')?.value;
    const destination = document.getElementById('formDestination')?.value;
    const travel_date = document.getElementById('formTravelDate')?.value;
    const return_date = document.getElementById('formReturnDate')?.value || null;
    const adults      = document.getElementById('formAdults')?.value || 1;
    const cabin_class = form.querySelector('input[name="cabinClass"]:checked')?.value || 'economy';
    const trip_type   = form.querySelector('input[name="tripType"]:checked')?.value || 'oneway';
    const fullName    = document.getElementById('passengerFullName')?.value.trim() || '';
    const { first_name, last_name } = splitFullName(fullName);
    const email       = document.getElementById('passengerEmail')?.value.trim();
    const phone       = document.getElementById('passengerPhone')?.value.trim();

    if (!origin || !destination || !travel_date || !fullName || !email || !phone) return;

    setButtonLoading(btn, true);

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          trip_type, first_name, last_name, email, phone,
          origin, destination, travel_date, return_date,
          adults, children: 0, infants: 0, cabin_class, special_requests: '',
        }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json();

      if (data.success) {
        const isLoggedIn = !!getToken();
        clearDashboardCache();
        showAlert(
          `<strong>Booking Request Received!</strong><br>Thank you, ${first_name}! Total saved to your dashboard.`,
          'success'
        );
        form.reset();
        window.resetBookingFlow?.();
        if (isLoggedIn) setTimeout(() => { window.location.href = 'user-dashboard.html'; }, 2500);
      } else {
        const msg = data.errors ? data.errors.map(er => er.message).join('<br>') : data.message;
        showAlert(msg, 'error');
      }
    } catch {
      /* Demo handled by flights.js toast when backend unavailable */
    } finally {
      setButtonLoading(btn, false);
    }
  }, true);
};

// ─── CARGO FORM  (cargo.html) ──────────────────────────────────────────────────

const collectCargoPayload = (form) => {
  const textInputs = form.querySelectorAll('input[type="text"]');
  const telInputs  = form.querySelectorAll('input[type="tel"]');
  const emailInput = form.querySelector('input[type="email"]');
  const selects    = form.querySelectorAll('select');
  const numInputs  = form.querySelectorAll('input[type="number"]');
  const textareas  = form.querySelectorAll('textarea');

  return {
    sender_name:       textInputs[0]?.value.trim(),
    sender_phone:      telInputs[0]?.value.trim(),
    sender_email:      emailInput?.value.trim() || '',
    sender_address:    textInputs[1]?.value.trim() || '',
    recipient_name:    textInputs[2]?.value.trim() || '',
    recipient_phone:   telInputs[1]?.value.trim() || '',
    destination:       selects[0]?.value,
    cargo_type:        selects[1]?.value,
    pieces:            numInputs[0]?.value || 1,
    weight:            numInputs[1]?.value,
    length_cm:         numInputs[2]?.value || null,
    width_cm:          numInputs[3]?.value || null,
    description:       textareas[0]?.value.trim() || '',
    shipping_speed:    form.querySelector('input[name="shippingSpeed"]:checked')?.value || 'standard',
    insurance:         document.getElementById('insuranceCheck')?.checked || false,
    fragile:           document.getElementById('fragile')?.checked || false,
    signature_required: document.getElementById('signature')?.checked || false,
    special_requests:  textareas[1]?.value.trim() || '',
  };
};

const CARGO_CITY_NAMES = {
  MGQ: 'Mogadishu', HGA: 'Hargeisa', GLK: 'Galkacyo', KSM: 'Kismayo', BDI: 'Baidoa',
};

const CARGO_TYPE_LABELS = {
  electronics: 'Electronics',
  textiles: 'Textiles & Clothing',
  machinery: 'Machinery & Parts',
  food: 'Food & Beverages',
  furniture: 'Furniture',
  documents: 'Documents',
  other: 'Other',
};

const getCargoAmount = (form) => {
  const priceEl = document.getElementById('priceResultValue');
  if (priceEl?.textContent) {
    const n = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const weight = parseFloat(form.querySelectorAll('input[type="number"]')[1]?.value);
  const routeBtn = document.querySelector('.route-type-btn.active');
  const route = routeBtn?.dataset.route || 'domestic';
  if (weight && typeof window.calculateCargoPrice === 'function') {
    return window.calculateCargoPrice(weight, route).total;
  }
  return 0;
};

const validateCargoPayload = (payload) => {
  return !!(
    payload.sender_name && payload.sender_phone &&
    payload.recipient_name && payload.recipient_phone &&
    payload.destination && payload.cargo_type &&
    payload.pieces && payload.weight && payload.description
  );
};

const initCargoForm = () => {
  const form = document.getElementById('cargoRequestForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!ensureLoggedIn()) return;

    const payload = collectCargoPayload(form);
    if (!validateCargoPayload(payload)) {
      showAlert('Please complete all required cargo fields before proceeding.', 'error');
      return;
    }

    if (typeof window.openConfirmPayModal !== 'function') {
      showAlert('Payment module unavailable. Please refresh the page.', 'error');
      return;
    }

    const destLabel = window.CitiesLoader?.getName(payload.destination) || CARGO_CITY_NAMES[payload.destination] || payload.destination;
    const cargoLabel = CARGO_TYPE_LABELS[payload.cargo_type] || payload.cargo_type;
    const amount = getCargoAmount(form);
    const amountFormatted = amount > 0 ? `$${amount.toFixed(2)}` : 'To be confirmed';
    const reference = window.generateBookingRef?.('ME-CG') || `ME-CG-${Date.now()}`;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    window.openConfirmPayModal({
      serviceType: 'Cargo',
      reference,
      customerName: payload.sender_name,
      phone: payload.sender_phone,
      email: payload.sender_email,
      destination: destLabel,
      date: today,
      amount,
      amountFormatted,
      summary: [
        { label: 'Sender', value: `${payload.sender_name} (${payload.sender_phone})` },
        { label: 'Recipient', value: `${payload.recipient_name} (${payload.recipient_phone})` },
        { label: 'Destination', value: destLabel },
        { label: 'Cargo Type', value: cargoLabel },
        { label: 'Pieces', value: String(payload.pieces) },
        { label: 'Weight', value: `${payload.weight} kg` },
        { label: 'Shipping Speed', value: payload.shipping_speed },
        { label: 'Description', value: payload.description },
      ],
      submitFn: async () => {
        const res = await fetch(`${API_BASE}/cargo`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (handleUnauthorized(res)) {
          throw new Error('Session expired. Please log in again.');
        }
        const data = await res.json();
        if (!data.success) {
          const msg = data.errors ? data.errors.map((er) => er.message).join(', ') : data.message;
          throw new Error(msg || 'Cargo request could not be saved.');
        }
        return { reference: data.data.tracking_id, cargo: data.data.cargo };
      },
      onSuccess: ({ reference: trackingId }) => {
        clearDashboardCache();
        form.reset();
        const dashLink = getToken()
          ? ` <a href="user-dashboard.html" style="color:var(--brown);font-weight:700;">View in My Dashboard →</a>`
          : '';
        showAlert(
          `<strong>Cargo Request Submitted!</strong><br>
           Your tracking ID is: <strong style="font-size:1.2rem;color:var(--brown);">${trackingId}</strong><br>
           <small class="text-muted">Complete payment via WhatsApp to confirm your shipment.</small>${dashLink}`,
          'success'
        );
      },
    });
  });
};

// ─── TRACKING FORM  (tracking.html) ──────────────────────────────────────────

const initTrackingForm = () => {
  const form = document.getElementById('trackingForm');
  if (!form) return;

  // tracking.js handles the full combined UI on tracking.html
  if (typeof window.initMideyeTracking === 'function') return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn        = form.querySelector('[type="submit"]');
    const trackingId = document.getElementById('trackingNumber').value.trim().toUpperCase();

    if (!trackingId) {
      showAlert('Please enter a tracking number.', 'error');
      return;
    }

    setButtonLoading(btn, true);

    try {
      const res  = await fetch(`${API_BASE}/track/${trackingId}`, { headers: authHeaders() });
      if (handleUnauthorized(res)) return;
      const data = await res.json();

      if (data.success) {
        renderTrackingResult(data.data);
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      showAlert('Cannot connect to server. Make sure the backend is running.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
};

const renderTrackingResult = ({ cargo, timeline }) => {
  const badge = window.CargoStatus?.renderCargoStatusBadge(cargo.status)
    || `<span class="badge bg-secondary" style="padding:0.5rem 1rem;">${cargo.status}</span>`;

  const timelineHtml = timeline.map(item => `
    <div class="timeline-item ${item.completed ? 'completed' : ''} ${item.active ? 'active' : ''}">
      <div class="timeline-marker">
        <i class="fas ${item.completed ? 'fa-check' : item.active ? 'fa-plane' : 'fa-circle'}"></i>
      </div>
      <div class="timeline-content">
        <h6 class="fw-600 mb-1" style="color:var(--brown);">${item.status}</h6>
        <p class="small mb-0 text-muted">${item.active ? 'Current status' : item.completed ? 'Completed' : 'Pending'}</p>
      </div>
    </div>`).join('');

  const resultHtml = `
    <div class="card border-0 shadow-sm p-4 mt-4" style="background:var(--cream);border-radius:var(--r-lg);">
      <div class="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 class="fw-700 mb-1" style="color:var(--brown);">Tracking: ${cargo.tracking_id}</h5>
          <p class="text-muted small mb-0">${cargo.cargo_type} • ${cargo.weight} kg • ${cargo.pieces} piece(s)</p>
        </div>
        <div>${badge}</div>
      </div>
      <div class="row g-4 mb-4">
        <div class="col-md-6">
          <p class="small text-muted mb-1">From</p>
          <p class="fw-600" style="color:var(--brown);">${cargo.origin}</p>
          <p class="small text-muted mb-1 mt-2">Sender</p>
          <p class="fw-600" style="color:var(--brown);">${cargo.sender_name}</p>
        </div>
        <div class="col-md-6">
          <p class="small text-muted mb-1">To</p>
          <p class="fw-600" style="color:var(--brown);">${cargo.destination}</p>
          <p class="small text-muted mb-1 mt-2">Recipient</p>
          <p class="fw-600" style="color:var(--brown);">${cargo.recipient_name} • ${cargo.recipient_phone}</p>
        </div>
      </div>
      <hr style="border-color:var(--border);">
      <h6 class="fw-700 mb-3" style="color:var(--brown);">Shipment Progress</h6>
      <div class="timeline">${timelineHtml}</div>
    </div>`;

  let resultContainer = document.getElementById('trackingResult');
  if (!resultContainer) {
    resultContainer = document.createElement('div');
    resultContainer.id = 'trackingResult';
    form?.parentElement?.insertAdjacentElement('afterend', resultContainer) ||
      document.querySelector('main .container')?.appendChild(resultContainer);
  }
  resultContainer.innerHTML = resultHtml;
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ─── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  initLoginForm();
  initRegisterForm();
  initBookingForm();
  initCargoForm();
  initTrackingForm();
});
