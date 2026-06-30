/* ═══════════════════════════════════════════════════════════════
   MIDEYE TRAVEL AGENCY — MAIN JAVASCRIPT
   Galkacyo, Somalia · All Pages
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. PAGE LOADER
───────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }, 1200);
  }

  // Init AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 680, easing: 'ease-out-cubic', once: true, offset: 50 });
  }

  // Animate counters on hero stats
  animateAllCounters();
});

/* ─────────────────────────────────────────────
   2. NAVBAR
───────────────────────────────────────────── */
const navbar = document.getElementById('mainNavbar');
if (navbar) {
  const isHomePage = ['index.html', ''].includes(window.location.pathname.split('/').pop());
  const updateNavbar = () => {
    navbar.classList.toggle('scrolled', !isHomePage || window.scrollY > 60);
  };
  window.addEventListener('scroll', updateNavbar);
  updateNavbar();
}

const clockEl = document.getElementById('clockDisplay');
if (clockEl) {
  const updateClock = () => {
    clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile nav
      const toggled = document.getElementById('mobileNavMenu');
      if (toggled && toggled.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(toggled).hide();
      }
    }
  });
});

// Active nav link + close mobile menu on page navigation
const navLinks = document.querySelectorAll('.nav-link-custom[data-page], .nav-link-custom[href$=".html"]');
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
navLinks.forEach(link => {
  const href = link.getAttribute('href') || '';
  const page = link.getAttribute('data-page') || href.split('/').pop();
  if (page === currentPage) link.classList.add('active');

  link.addEventListener('click', () => {
    const menu = document.getElementById('mobileNavMenu');
    if (menu?.classList.contains('show')) {
      bootstrap.Collapse.getOrCreateInstance(menu).hide();
    }
  });
});

// ── Role-based Dashboard nav item ─────────────────────────────────────────────
(function initDashboardNav() {
  try {
    const token = localStorage.getItem('mideye_token');
    const user  = JSON.parse(localStorage.getItem('mideye_user') || 'null');

    const dashItem  = document.getElementById('navDashboardItem');
    const dashLink  = document.getElementById('navDashboardLink');
    const authBtns  = document.getElementById('navAuthButtons');

    if (!dashItem || !dashLink) return;

    if (token && user) {
      // Show Dashboard link pointing to the right dashboard for this role
      const dashHref = user.role === 'admin' ? 'admin.html' : 'user-dashboard.html';
      dashItem.style.display = '';
      dashLink.href = dashHref;

      // Replace Login / Register with first name + Logout
      if (authBtns) {
        authBtns.innerHTML = `
          <span class="btn-outline-custom" style="font-size:0.85rem;padding:0.6rem 1.3rem;pointer-events:none;opacity:0.85;">
            <i class="fas fa-user-circle me-1"></i>${(user.full_name || 'User').split(' ')[0]}
          </span>
          <button onclick="mideyeLogout()" class="btn-gold-custom" style="font-size:0.85rem;padding:0.6rem 1.3rem;border:none;cursor:pointer;">
            <i class="fas fa-sign-out-alt me-1"></i>Logout
          </button>`;
      }
    }
  } catch (e) {}
})();

window.mideyeLogout = function () {
  localStorage.removeItem('mideye_token');
  localStorage.removeItem('mideye_user');
  window.location.reload();
};

/* ─────────────────────────────────────────────
   3. COUNTER ANIMATION
───────────────────────────────────────────── */
function animateCounter(el, target, duration = 1600, suffix = '') {
  let start = 0;
  const startTime = performance.now();
  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString() + suffix;
  };
  requestAnimationFrame(step);
}

function animateAllCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, 1600, suffix);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => obs.observe(c));
}

/* ─────────────────────────────────────────────
   4. BAR CHART ANIMATION
───────────────────────────────────────────── */
function initBarCharts() {
  const chartContainers = document.querySelectorAll('.chart-container');
  if (!chartContainers.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.chart-bar').forEach((bar, i) => {
          const h = bar.dataset.height;
          setTimeout(() => { bar.style.height = h; }, i * 80);
        });
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  chartContainers.forEach(c => obs.observe(c));
}
initBarCharts();

/* ─────────────────────────────────────────────
   5. FORM VALIDATION (shared)
───────────────────────────────────────────── */
function validateForm(formEl) {
  let isValid = true;
  const fields = formEl.querySelectorAll('[required]');

  fields.forEach(field => {
    const val = field.value.trim();
    let fieldValid = true;

    if (!val) fieldValid = false;
    if (field.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) fieldValid = false;
    if (field.type === 'tel' && val && !/^[\+]?[\d\s\-]{7,15}$/.test(val)) fieldValid = false;

    if (!fieldValid) {
      field.classList.add('is-invalid');
      isValid = false;
    } else {
      field.classList.remove('is-invalid');
    }
  });

  return isValid;
}

// Live validation clear
document.querySelectorAll('.form-control-custom, .form-select-custom').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('is-invalid'));
  el.addEventListener('change', () => el.classList.remove('is-invalid'));
});

/* ─────────────────────────────────────────────
   6. PASSWORD TOGGLE
───────────────────────────────────────────── */
document.querySelectorAll('.pass-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const isPass = target.type === 'password';
    target.type = isPass ? 'text' : 'password';
    btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
  });
});

/* ─────────────────────────────────────────────
   7. TOAST NOTIFICATION
───────────────────────────────────────────── */
function showToast(message, sub = '', type = 'success') {
  let toast = document.getElementById('toastEl');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastEl';
    toast.className = 'toast-custom';
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-check-circle"></i></div>
      <div>
        <div class="toast-msg" id="toastMsg"></div>
        <div class="toast-sub" id="toastSub"></div>
      </div>
      <button onclick="document.getElementById('toastEl').classList.remove('show')" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#aaa;font-size:1rem;">✕</button>
    `;
    document.body.appendChild(toast);
  }
  document.getElementById('toastMsg').textContent = message;
  document.getElementById('toastSub').textContent = sub;
  toast.style.borderLeftColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
  toast.querySelector('.toast-icon i').style.color = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';

  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  });
}

/* ─────────────────────────────────────────────
   8. FLIGHT BOOKING FORM
───────────────────────────────────────────── */
const flightForm = document.getElementById('flightBookingForm');
if (flightForm) {
  // Set min date for date picker
  const dateInput = flightForm.querySelector('#travelDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  // Flight results dummy data
  const flightResults = [
    { id: 1, from: 'Galkacyo (GLK)', to: 'Mogadishu (MGQ)', dep: '06:30', arr: '07:30', dur: '1h 00m', price: '$85', seats: 'Economy', type: 'Direct', carrier: 'Jubba Airways' },
    { id: 2, from: 'Galkacyo (GLK)', to: 'Mogadishu (MGQ)', dep: '11:00', arr: '12:10', dur: '1h 10m', price: '$95', seats: 'Economy', type: 'Direct', carrier: 'Daallo Airlines' },
    { id: 3, from: 'Galkacyo (GLK)', to: 'Mogadishu (MGQ)', dep: '15:45', arr: '17:00', dur: '1h 15m', price: '$120', seats: 'Business', type: 'Direct', carrier: 'Jubba Airways' },
    { id: 4, from: 'Galkacyo (GLK)', to: 'Bosaso (BSY)',     dep: '08:00', arr: '09:15', dur: '1h 15m', price: '$70',  seats: 'Economy', type: 'Direct', carrier: 'African Express' },
    { id: 5, from: 'Galkacyo (GLK)', to: 'Hargeisa (HGA)',   dep: '09:30', arr: '10:55', dur: '1h 25m', price: '$105', seats: 'Economy', type: 'Direct', carrier: 'Daallo Airlines' },
  ];

  // Render flight results
  const flightResultsContainer = document.getElementById('flightResults');
  if (flightResultsContainer) {
    flightResultsContainer.innerHTML = flightResults.map(f => `
      <div class="flight-result-card" data-id="${f.id}" onclick="selectFlight(this, ${f.id})">
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <div class="frc-airline-logo"><i class="fas fa-plane"></i></div>
          <div>
            <div style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">${f.carrier}</div>
            <div style="display:flex;gap:0.4rem;margin-top:0.2rem;">
              <span class="frc-badge ${f.seats === 'Business' ? 'business' : 'economy'}">${f.seats}</span>
              <span class="frc-badge direct">${f.type}</span>
            </div>
          </div>
          <div class="ms-auto d-flex align-items-center gap-4 flex-wrap">
            <div>
              <div class="frc-time">${f.dep}</div>
              <div class="frc-airport">${f.from}</div>
            </div>
            <div class="frc-duration text-center" style="min-width:90px;">
              <div class="frc-dur-text">${f.dur}</div>
              <div class="frc-dur-line"></div>
              <div class="frc-dur-text">${f.type}</div>
            </div>
            <div>
              <div class="frc-time">${f.arr}</div>
              <div class="frc-airport">${f.to}</div>
            </div>
            <div class="text-end">
              <div class="frc-price-label">Per Person</div>
              <div class="frc-price">${f.price}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  let selectedFlightId = null;
  window.selectFlight = (card, id) => {
    document.querySelectorAll('.flight-result-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedFlightId = id;
    const bookForm = document.getElementById('bookingDetailsForm');
    if (bookForm) {
      bookForm.style.display = 'block';
      bookForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Search form
  const searchBtn = document.getElementById('searchFlightsBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
      searchBtn.disabled = true;
      setTimeout(() => {
        searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search Flights';
        searchBtn.disabled = false;
        document.getElementById('flightResultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('Flights found!', '5 flights available for your route.');
      }, 1500);
    });
  }

  // Booking form submit
  flightForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm(flightForm)) return;

    const submitBtn = flightForm.querySelector('[type="submit"]');
    const ref = 'MID-FLT-' + Math.floor(1000 + Math.random() * 9000);
    submitBtn.disabled = true;
    submitBtn.querySelector('span').innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Booking Request';
      flightForm.reset();
      document.querySelectorAll('.flight-result-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('bookingDetailsForm').style.display = 'none';
      showToast('Booking Submitted!', `Reference: ${ref}. We'll call you shortly.`);
    }, 2000);
  });
}

/* ─────────────────────────────────────────────
   9. CARGO FORM
───────────────────────────────────────────── */
const cargoForm = document.getElementById('cargoRequestForm');
if (cargoForm) {
  // Cargo type selector
  document.querySelectorAll('.cargo-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cargo-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cargoTypeInput = document.getElementById('selectedCargoType');
      if (cargoTypeInput) cargoTypeInput.value = btn.dataset.type;
    });
  });

  cargoForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm(cargoForm)) return;

    const submitBtn = cargoForm.querySelector('[type="submit"]');
    const ref = 'MID-CRG-' + Math.floor(1000 + Math.random() * 9000);
    submitBtn.disabled = true;
    submitBtn.querySelector('span').innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerHTML = '<i class="fas fa-box me-2"></i>Submit Cargo Request';
      cargoForm.reset();
      document.querySelectorAll('.cargo-type-btn').forEach(b => b.classList.remove('active'));
      showToast('Cargo Request Submitted!', `Tracking ID: ${ref}`);

      // Store for tracking demo
      sessionStorage.setItem('lastCargoRef', ref);
    }, 1800);
  });
}

/* ─────────────────────────────────────────────
   10. CARGO TRACKING
───────────────────────────────────────────── */
const trackingForm = document.getElementById('trackingSearchForm');
const trackResult  = document.getElementById('trackResultCard');

const demoTrackData = {
  'MID-CRG-7841': { status: 'In Transit', step: 1, sender: 'Ahmed Hassan', dest: 'Mogadishu', type: 'General Goods', weight: '15 kg', date: 'Jun 10, 2025', eta: 'Jun 13, 2025' },
  'MID-CRG-1234': { status: 'Delivered',  step: 2, sender: 'Halima Osman', dest: 'Bosaso',    type: 'Electronics', weight: '3 kg',  date: 'Jun 8, 2025',  eta: 'Delivered Jun 11' },
  'MID-CRG-5678': { status: 'Received',   step: 0, sender: 'Omar Yusuf',   dest: 'Hargeisa',  type: 'Documents',   weight: '0.5 kg', date: 'Jun 12, 2025', eta: 'Jun 15, 2025' },
};

if (trackingForm) {
  trackingForm.addEventListener('submit', e => {
    e.preventDefault();
    const idInput = document.getElementById('trackingId');
    const id = idInput?.value.trim().toUpperCase();

    if (!id) {
      idInput?.classList.add('is-invalid');
      return;
    }

    const btn = trackingForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Tracking...';

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search-location me-2"></i>Track Shipment';

      const data = demoTrackData[id] || { status: 'In Transit', step: 1, sender: 'Demo Sender', dest: 'Mogadishu', type: 'General', weight: '10 kg', date: 'Jun 12, 2025', eta: 'Jun 15, 2025' };
      showTrackResult(id, data);
    }, 1800);
  });
}

function showTrackResult(id, data) {
  if (!trackResult) return;
  trackResult.classList.add('show');

  // Fill info
  const setEl = (sel, val) => { const el = trackResult.querySelector(sel); if (el) el.textContent = val; };
  setEl('#trId', id);
  setEl('#trStatus', data.status);
  setEl('#trSender', data.sender);
  setEl('#trDest', data.dest);
  setEl('#trType', data.type);
  setEl('#trWeight', data.weight);
  setEl('#trDate', data.date);
  setEl('#trEta', data.eta);

  // Status badge
  const badge = trackResult.querySelector('#trStatusBadge');
  if (badge) {
    badge.textContent = data.status;
    badge.className = 'status-badge ' + ({'Received':'sb-received','In Transit':'sb-transit','Delivered':'sb-delivered'}[data.status] || 'sb-transit');
  }

  // Progress steps
  const steps = trackResult.querySelectorAll('.pt-step');
  const bar = trackResult.querySelector('.progress-bar-fill');
  const widths = ['16%', '50%', '83%'];
  steps.forEach((s, i) => {
    s.classList.remove('done', 'active');
    if (i < data.step) s.classList.add('done');
    else if (i === data.step) s.classList.add('active');
  });
  if (bar) {
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = widths[data.step] || '50%'; }, 300);
  }

  trackResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─────────────────────────────────────────────
   11. HOME CARGO TRACKING QUICK
───────────────────────────────────────────── */
const homeTrackBtn = document.getElementById('homeTrackBtn');
if (homeTrackBtn) {
  homeTrackBtn.addEventListener('click', () => {
    const val = document.getElementById('homeTrackInput')?.value.trim();
    if (!val) {
      document.getElementById('homeTrackInput')?.classList.add('is-invalid');
      return;
    }
    // Navigate to tracking page
    window.location.href = `tracking.html?id=${encodeURIComponent(val.toUpperCase())}`;
  });
}

// Pre-fill tracking from URL param
if (window.location.pathname.includes('tracking')) {
  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) {
    const idInput = document.getElementById('trackingId');
    if (idInput) {
      idInput.value = urlId;
      setTimeout(() => {
        document.getElementById('trackingSearchForm')?.dispatchEvent(new Event('submit'));
      }, 800);
    }
  }
}

/* ─────────────────────────────────────────────
   12. LOGIN / REGISTER FORMS
   Real login is handled by api.js initLoginForm() on login.html
───────────────────────────────────────────── */

const registerForm = document.getElementById('registerForm');
// Real registration is handled by api.js + register.js on register.html
if (registerForm && !document.getElementById('regFullName')) {
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm(registerForm)) return;

    const pass = registerForm.querySelector('#regPassword')?.value;
    const confirm = registerForm.querySelector('#regConfirm')?.value;
    if (pass !== confirm) {
      registerForm.querySelector('#regConfirm')?.classList.add('is-invalid');
      return;
    }

    const btn = registerForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.querySelector('span').innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating account...';

    setTimeout(() => {
      btn.disabled = false;
      btn.querySelector('span').innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
      showToast('Account Created!', 'Please login to continue.');
      setTimeout(() => window.location.href = 'login.html', 2000);
    }, 2000);
  });
}

/* ─────────────────────────────────────────────
   13. ADMIN DASHBOARD
───────────────────────────────────────────── */
// Sidebar toggle
const sidebarToggle = document.getElementById('sidebarToggle');
const adminSidebar  = document.getElementById('adminSidebar');
const adminMain     = document.getElementById('adminMain');

if (sidebarToggle && adminSidebar) {
  sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth >= 992) {
      adminSidebar.classList.toggle('collapsed');
      adminMain?.classList.toggle('full');
    } else {
      adminSidebar.classList.toggle('mobile-open');
    }
  });

  // Close on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth < 992 && !adminSidebar.contains(e.target) && e.target !== sidebarToggle) {
      adminSidebar.classList.remove('mobile-open');
    }
  });
}

// Admin tab switching
window.showAdminTab = (tabId, linkEl) => {
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  document.getElementById('topbarTitle').textContent =
    { dashboard: 'Dashboard', bookings: 'Bookings', cargo: 'Cargo Requests', users: 'User Management' }[tabId] || 'Dashboard';

  if (window.innerWidth < 992) adminSidebar?.classList.remove('mobile-open');
};

/* ─────────────────────────────────────────────
   14. DUMMY DATA FOR TABLES
───────────────────────────────────────────── */
const bookingsData = [
  { id: '#MID-7841', name: 'Ahmed Hassan',    phone: '+252 61 123 4567', route: 'GLK → MGQ', date: 'Jun 15, 2025', seat: 'Economy',  status: 'confirmed', amount: '$85' },
  { id: '#MID-7842', name: 'Hodan Abdullahi', phone: '+252 61 234 5678', route: 'GLK → MGQ', date: 'Jun 15, 2025', seat: 'Business', status: 'pending',   amount: '$120' },
  { id: '#MID-7843', name: 'Omar Yusuf',      phone: '+252 61 345 6789', route: 'GLK → BSY', date: 'Jun 16, 2025', seat: 'Economy',  status: 'confirmed', amount: '$70' },
  { id: '#MID-7844', name: 'Amina Warsame',   phone: '+252 61 456 7890', route: 'GLK → HGA', date: 'Jun 17, 2025', seat: 'Economy',  status: 'cancelled', amount: '$105' },
  { id: '#MID-7845', name: 'Ali Mohamed',     phone: '+252 61 567 8901', route: 'GLK → MGQ', date: 'Jun 18, 2025', seat: 'Economy',  status: 'confirmed', amount: '$85' },
  { id: '#MID-7846', name: 'Faadumo Idle',    phone: '+252 61 678 9012', route: 'GLK → MGQ', date: 'Jun 20, 2025', seat: 'Business', status: 'pending',   amount: '$120' },
  { id: '#MID-7847', name: 'Hassan Osman',    phone: '+252 61 789 0123', route: 'GLK → BSY', date: 'Jun 22, 2025', seat: 'Economy',  status: 'confirmed', amount: '$70' },
];

const cargoData = [
  { id: '#MID-CRG-7841', sender: 'Ahmed Traders',    phone: '+252 61 100 1111', dest: 'Mogadishu', type: 'General Goods', weight: '15 kg',  status: 'transit',   date: 'Jun 10, 2025' },
  { id: '#MID-CRG-1234', sender: 'Halima Osman',     phone: '+252 61 200 2222', dest: 'Bosaso',    type: 'Electronics',  weight: '3 kg',   status: 'delivered', date: 'Jun 8, 2025' },
  { id: '#MID-CRG-5678', sender: 'Omar Yusuf',       phone: '+252 61 300 3333', dest: 'Hargeisa',  type: 'Documents',    weight: '0.5 kg', status: 'received',  date: 'Jun 12, 2025' },
  { id: '#MID-CRG-9012', sender: 'Galkacyo Exports', phone: '+252 61 400 4444', dest: 'Mogadishu', type: 'Perishables',  weight: '28 kg',  status: 'transit',   date: 'Jun 11, 2025' },
  { id: '#MID-CRG-3456', sender: 'Ali & Sons',       phone: '+252 61 500 5555', dest: 'Bosaso',    type: 'Machinery',    weight: '120 kg', status: 'delivered', date: 'Jun 7, 2025' },
];

const usersData = [
  { id: '#USR-001', name: 'Ahmed Hassan',    email: 'ahmed@email.com',  phone: '+252 61 123 4567', role: 'Customer', joined: 'Jan 5, 2025',  bookings: 3 },
  { id: '#USR-002', name: 'Hodan Abdullahi', email: 'hodan@email.com',  phone: '+252 61 234 5678', role: 'Customer', joined: 'Jan 12, 2025', bookings: 1 },
  { id: '#USR-003', name: 'Staff Member',    email: 'staff@mideye.so',  phone: '+252 61 000 1111', role: 'Staff',    joined: 'Feb 1, 2025',  bookings: 0 },
  { id: '#USR-004', name: 'Omar Yusuf',      email: 'omar@email.com',   phone: '+252 61 345 6789', role: 'Customer', joined: 'Feb 20, 2025', bookings: 5 },
  { id: '#USR-005', name: 'Amina Warsame',   email: 'amina@email.com',  phone: '+252 61 456 7890', role: 'Agent',    joined: 'Mar 3, 2025',  bookings: 2 },
];

function renderBookingsTable(data) {
  const tbody = document.getElementById('bookingsTbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(b => `
    <tr>
      <td><strong>${b.id}</strong></td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td>${b.route}</td>
      <td>${b.date}</td>
      <td>${b.seat}</td>
      <td><span class="status-badge sb-${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></td>
      <td><strong>${b.amount}</strong></td>
      <td>
        <div class="tbl-action-btns">
          <button class="btn-tbl btn-tbl-view" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn-tbl btn-tbl-edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-tbl btn-tbl-del" title="Delete" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCargoTable(data) {
  const tbody = document.getElementById('cargoTbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td>${c.sender}</td>
      <td>${c.phone}</td>
      <td>${c.dest}</td>
      <td>${c.type}</td>
      <td>${c.weight}</td>
      <td><span class="status-badge sb-${c.status}">${{'transit':'In Transit','delivered':'Delivered','received':'Received'}[c.status] || c.status}</span></td>
      <td>${c.date}</td>
      <td>
        <div class="tbl-action-btns">
          <button class="btn-tbl btn-tbl-view" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn-tbl btn-tbl-edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-tbl btn-tbl-del" title="Delete" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderUsersTable(data) {
  const tbody = document.getElementById('usersTbody');
  if (!tbody) return;
  tbody.innerHTML = data.map(u => `
    <tr>
      <td><strong>${u.id}</strong></td>
      <td>
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--brown),var(--brown-mid));display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:0.78rem;font-weight:800;flex-shrink:0;">${u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          ${u.name}
        </div>
      </td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td><span class="status-badge ${u.role==='Staff'||u.role==='Agent'?'sb-transit':'sb-confirmed'}">${u.role}</span></td>
      <td>${u.joined}</td>
      <td style="text-align:center;">${u.bookings}</td>
      <td>
        <div class="tbl-action-btns">
          <button class="btn-tbl btn-tbl-view" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn-tbl btn-tbl-edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-tbl btn-tbl-del" title="Delete" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Delete row with animation
window.deleteRow = (btn) => {
  const row = btn.closest('tr');
  if (!row) return;
  if (!confirm('Delete this record?')) return;
  row.style.transition = 'opacity 0.35s, transform 0.35s';
  row.style.opacity = '0';
  row.style.transform = 'translateX(20px)';
  setTimeout(() => row.remove(), 380);
  showToast('Record deleted', 'Item removed successfully.', 'error');
};

// Init tables
renderBookingsTable(bookingsData);
renderCargoTable(cargoData);
renderUsersTable(usersData);

// Table search
const tableSearch = document.getElementById('tableSearch');
if (tableSearch) {
  tableSearch.addEventListener('input', () => {
    const query = tableSearch.value.toLowerCase();
    const activePane = document.querySelector('.admin-tab-pane.active');
    if (!activePane) return;
    activePane.querySelectorAll('tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

/* ─────────────────────────────────────────────
   15. HERO SEARCH STRIP
───────────────────────────────────────────── */
const HOME_CITY_OPTIONS = [
  { value: 'GLK', label: 'Galkacyo (GLK)' },
  { value: 'MGQ', label: 'Mogadishu (MGQ)' },
  { value: 'HGA', label: 'Hargeisa (HGA)' },
  { value: 'KSM', label: 'Kismayo (KSM)' },
  { value: 'BDI', label: 'Baidoa (BDI)' },
];

function initHomeSearchStrip() {
  const form = document.getElementById('homeSearchForm');
  if (!form) return;

  const tabs = form.querySelectorAll('.sst-tab');
  const fieldsWrap = document.getElementById('homeSearchFields');
  const fromEl = document.getElementById('homeSearchFrom');
  const toEl = document.getElementById('homeSearchTo');
  const departEl = document.getElementById('homeSearchDepart');
  const returnEl = document.getElementById('homeSearchReturn');
  const returnField = document.getElementById('homeReturnField');
  const passengersField = document.getElementById('homePassengersField');
  const passengersEl = document.getElementById('homeSearchPassengers');
  const departLabel = document.getElementById('homeDepartLabel');
  const btnText = document.getElementById('homeSearchBtnText');
  const btnIcon = document.getElementById('homeSearchBtnIcon');
  const errorEl = document.getElementById('homeSearchError');

  let tripType = 'oneway';
  const today = new Date().toISOString().split('T')[0];
  if (departEl) {
    departEl.min = today;
    if (!departEl.value) departEl.value = today;
  }
  if (returnEl) returnEl.min = today;

  const clearErrors = () => {
    errorEl?.classList.add('is-hidden');
    if (errorEl) errorEl.textContent = '';
    [fromEl, toEl, departEl, returnEl].forEach((el) => el?.classList.remove('is-invalid'));
  };

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove('is-hidden');
  };

  const syncReturnMin = () => {
    if (!returnEl || !departEl?.value) return;
    returnEl.min = departEl.value;
    if (returnEl.value && returnEl.value < departEl.value) {
      returnEl.value = departEl.value;
    }
  };

  const setTripType = (nextType) => {
    tripType = nextType;
    const isCargo = tripType === 'cargo';
    const isRound = tripType === 'roundtrip';

    tabs.forEach((tab) => {
      const active = tab.dataset.trip === tripType;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    fieldsWrap?.classList.toggle('search-field-group--roundtrip', isRound);
    fieldsWrap?.classList.toggle('search-field-group--cargo', isCargo);
    returnField?.classList.toggle('is-hidden', !isRound);
    passengersField?.classList.toggle('is-hidden', isCargo);

    if (departLabel) departLabel.textContent = isCargo ? 'Pickup Date' : 'Departure';
    if (btnText) btnText.textContent = isCargo ? 'Ship Cargo' : 'Search Flights';
    if (btnIcon) btnIcon.className = isCargo ? 'fas fa-box' : 'fas fa-search';

    if (!isRound && returnEl) {
      returnEl.value = '';
      returnEl.classList.remove('is-invalid');
    }

    clearErrors();
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setTripType(tab.dataset.trip || 'oneway'));
  });

  departEl?.addEventListener('change', syncReturnMin);

  [fromEl, toEl, departEl, returnEl, passengersEl].forEach((el) => {
    el?.addEventListener('change', clearErrors);
    el?.addEventListener('input', clearErrors);
  });

  fromEl?.addEventListener('change', () => {
    if (fromEl.value && toEl?.value && fromEl.value === toEl.value) {
      const alt = HOME_CITY_OPTIONS.find((c) => c.value !== fromEl.value);
      if (alt) toEl.value = alt.value;
    }
  });

  toEl?.addEventListener('change', () => {
    if (fromEl?.value && toEl.value && fromEl.value === toEl.value) {
      const alt = HOME_CITY_OPTIONS.find((c) => c.value !== toEl.value);
      if (alt) fromEl.value = alt.value;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const from = fromEl?.value || '';
    const to = toEl?.value || '';
    const depart = departEl?.value || '';
    const returnDate = returnEl?.value || '';
    const passengers = passengersEl?.value || '1';
    let valid = true;

    if (!from) { fromEl?.classList.add('is-invalid'); valid = false; }
    if (!to) { toEl?.classList.add('is-invalid'); valid = false; }
    if (!depart) { departEl?.classList.add('is-invalid'); valid = false; }

    if (from && to && from === to) {
      fromEl?.classList.add('is-invalid');
      toEl?.classList.add('is-invalid');
      showError('Origin and destination must be different cities.');
      return;
    }

    if (tripType === 'roundtrip' && returnDate && depart && returnDate < depart) {
      returnEl?.classList.add('is-invalid');
      showError('Return date cannot be before departure.');
      return;
    }

    if (!valid) {
      showError('Please fill in all required fields.');
      return;
    }

    if (tripType === 'cargo') {
      const params = new URLSearchParams({ from, to, date: depart });
      window.location.href = `cargo.html?${params.toString()}`;
      return;
    }

    const params = new URLSearchParams({
      from,
      to,
      depart,
      passengers,
      trip: tripType,
    });
    if (tripType === 'roundtrip' && returnDate) params.set('return', returnDate);
    window.location.href = `booking.html?${params.toString()}`;
  });

  setTripType('oneway');
}

initHomeSearchStrip();

function initPopularDestinationCards() {
  const cards = document.querySelectorAll('.popular-destination-card[data-from][data-to]');
  if (!cards.length) return;
  const apiBase = typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : `${window.location.origin}/api`;

  cards.forEach((card) => {
    card.addEventListener('click', async () => {
      const from = card.dataset.from;
      const to = card.dataset.to;
      if (!from || !to) return;

      try {
        const qs = new URLSearchParams({ from, to });
        const res = await fetch(`${apiBase}/flights?${qs.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const first = json?.data?.flights?.[0];
          if (first?.flight_id) {
            window.location.href = `booking.html?flight_id=${encodeURIComponent(first.flight_id)}`;
            return;
          }
        }
      } catch {}

      const today = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({
        from,
        to,
        depart: today,
        passengers: '1',
        trip: 'oneway',
      });
      window.location.href = `booking.html?${params.toString()}`;
    });
  });
}

initPopularDestinationCards();

/* ─────────────────────────────────────────────
   16. MISC INTERACTIONS
───────────────────────────────────────────── */
// Cargo type buttons on cargo page
document.querySelectorAll('.cargo-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cargo-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Date inputs: set min = today
document.querySelectorAll('input[type="date"]').forEach(inp => {
  if (!inp.min) inp.min = new Date().toISOString().split('T')[0];
});

console.log('%c✈ Mideye System Ready – Galkacyo, Somalia', 'color:#441306;font-weight:800;font-size:13px;');
