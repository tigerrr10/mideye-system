/* ═══════════════════════════════════════════════════
   MIDEYE – INTEGRATED FLIGHT & CARGO SYSTEM
   script.js
═══════════════════════════════════════════════════ */

'use strict';

// ── AOS INIT ──
AOS.init({
  duration: 700,
  easing: 'ease-out-cubic',
  once: true,
  offset: 60,
});

// ── NAVBAR SCROLL ──
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    mainNav.classList.add('scrolled');
  } else {
    mainNav.classList.remove('scrolled');
  }
});

// ── SMOOTH SCROLL for all anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 70;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile nav
      const bsCollapse = document.getElementById('navMenu');
      if (bsCollapse.classList.contains('show')) {
        bootstrap.Collapse.getInstance(bsCollapse)?.hide();
      }
    }
  });
});

// ── FLIGHT BOOKING FORM ──
(function initFlightForm() {
  const form = document.getElementById('flightForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const inputs = form.querySelectorAll('[required]');
    let valid = true;

    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add('is-invalid');
        valid = false;
      } else {
        input.classList.remove('is-invalid');
      }
    });

    // Email check
    const emailInput = document.getElementById('flightEmail');
    if (emailInput && emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      emailInput.classList.add('is-invalid');
      valid = false;
    }

    if (!valid) return;

    // Show loading
    const btn = document.getElementById('flightSubmitBtn');
    btn.querySelector('.btn-text').classList.add('d-none');
    btn.querySelector('.btn-loading').classList.remove('d-none');
    btn.disabled = true;

    // Simulate async
    setTimeout(() => {
      form.classList.add('d-none');
      const ref = Math.floor(1000 + Math.random() * 9000);
      document.getElementById('flightRef').textContent = ref;
      document.getElementById('flightSuccess').classList.remove('d-none');
    }, 1800);
  });

  // Live validation clear
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
      if (input.value.trim()) input.classList.remove('is-invalid');
    });
  });
})();

// ── CARGO FORM ──
(function initCargoForm() {
  const form = document.getElementById('cargoForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const inputs = form.querySelectorAll('[required]');
    let valid = true;

    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add('is-invalid');
        valid = false;
      } else {
        input.classList.remove('is-invalid');
      }
    });

    if (!valid) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Submitting...';
    btn.disabled = true;

    setTimeout(() => {
      form.classList.add('d-none');
      const ref = Math.floor(1000 + Math.random() * 9000);
      document.getElementById('cargoRef').textContent = ref;
      document.getElementById('cargoSuccess').classList.remove('d-none');
    }, 1500);
  });

  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => {
      if (input.value.trim()) input.classList.remove('is-invalid');
    });
  });
})();

// ── CARGO TRACKING ──
const DEMO_TRACKINGS = {
  'MID-CRG-7841': { status: 'In Transit', step: 2 },
  'MID-CRG-1234': { status: 'Delivered', step: 4 },
  'MID-CRG-5678': { status: 'Picked Up', step: 0 },
  'MID-CRG-9999': { status: 'At Facility', step: 1 },
};

window.trackCargo = function () {
  const input = document.getElementById('trackingInput');
  const resultEl = document.getElementById('trackResult');
  const id = input.value.trim().toUpperCase();

  if (!id) {
    input.classList.add('is-invalid');
    setTimeout(() => input.classList.remove('is-invalid'), 2000);
    return;
  }

  const btn = document.getElementById('trackBtn');
  btn.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i>Tracking...';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = '<i class="bi bi-radar me-1"></i>Track';
    btn.disabled = false;

    const found = DEMO_TRACKINGS[id] || { status: 'In Transit', step: 2 };
    document.getElementById('trId').textContent = id;
    document.getElementById('trBadge').textContent = found.status;

    const steps = resultEl.querySelectorAll('.tl-step');
    steps.forEach((step, i) => {
      step.classList.remove('done', 'active');
      if (i < found.step) step.classList.add('done');
      else if (i === found.step) step.classList.add('active');
    });

    resultEl.classList.remove('d-none');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1200);
};

// Allow Enter key for tracking
const trackingInput = document.getElementById('trackingInput');
if (trackingInput) {
  trackingInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.trackCargo();
  });
}

// ── AUTH – Switch between Login / Register ──
window.switchAuth = function (mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  if (mode === 'login') {
    loginForm.classList.add('active-form');
    registerForm.classList.remove('active-form');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    registerForm.classList.add('active-form');
    loginForm.classList.remove('active-form');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }
};

// ── PASSWORD TOGGLE ──
window.togglePass = function (inputId) {
  const input = document.getElementById(inputId);
  const btn = input.nextElementSibling;
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('bi-eye', 'bi-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('bi-eye-slash', 'bi-eye');
  }
};

// ── ADMIN TABS ──
window.showAdminTab = function (tabName, linkEl) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active-tab'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const tab = document.getElementById('tab-' + tabName);
  if (tab) tab.classList.add('active-tab');

  if (linkEl) linkEl.classList.add('active');

  const titleMap = { dashboard: 'Dashboard', bookings: 'Bookings', cargo: 'Cargo', users: 'Users' };
  const titleEl = document.getElementById('adminTitle');
  if (titleEl) titleEl.textContent = titleMap[tabName] || tabName;

  // Close mobile sidebar
  const sidebar = document.getElementById('adminSidebar');
  if (window.innerWidth < 992) sidebar.classList.remove('mobile-open');
};

// ── SIDEBAR TOGGLE ──
window.toggleSidebar = function () {
  const sidebar = document.getElementById('adminSidebar');
  if (window.innerWidth >= 992) {
    sidebar.classList.toggle('collapsed');
  } else {
    sidebar.classList.toggle('mobile-open');
  }
};

// ── DUMMY DATA ──
const BOOKINGS = [
  { id: '#MID-2841', name: 'Ahmed Hassan', route: 'MOG → DXB', date: 'Jun 10, 2025', seat: 'Business', status: 'confirmed', amount: '$420' },
  { id: '#MID-2842', name: 'Fatima Osman', route: 'MOG → NBO', date: 'Jun 11, 2025', seat: 'Economy', status: 'pending', amount: '$195' },
  { id: '#MID-2843', name: 'Ali Mohamed', route: 'DXB → MOG', date: 'Jun 12, 2025', seat: 'Economy', status: 'confirmed', amount: '$380' },
  { id: '#MID-2844', name: 'Hodan Ibrahim', route: 'NBO → MOG', date: 'Jun 13, 2025', seat: 'Business', status: 'cancelled', amount: '$520' },
  { id: '#MID-2845', name: 'Omar Yusuf', route: 'MOG → JED', date: 'Jun 15, 2025', seat: 'Economy', status: 'confirmed', amount: '$290' },
  { id: '#MID-2846', name: 'Amina Warsame', route: 'MOG → IST', date: 'Jun 18, 2025', seat: 'Business', status: 'pending', amount: '$680' },
  { id: '#MID-2847', name: 'Bile Abdullahi', route: 'IST → MOG', date: 'Jun 20, 2025', seat: 'Economy', status: 'confirmed', amount: '$615' },
];

const CARGO_DATA = [
  { id: '#MID-CRG-7841', sender: 'Hassan Traders', route: 'MOG → DXB', type: 'General Merchandise', weight: '45 kg', status: 'transit' },
  { id: '#MID-CRG-1234', sender: 'Al-Noor Co.', route: 'DXB → MOG', type: 'Electronics', weight: '12 kg', status: 'delivered' },
  { id: '#MID-CRG-5678', sender: 'Qaran Exports', route: 'MOG → NBO', type: 'Perishables', weight: '80 kg', status: 'pending' },
  { id: '#MID-CRG-9012', sender: 'Gulf Cargo LLC', route: 'JED → MOG', type: 'Documents', weight: '2 kg', status: 'delivered' },
  { id: '#MID-CRG-3456', sender: 'Ibrahim Group', route: 'MOG → IST', type: 'Fragile Items', weight: '30 kg', status: 'transit' },
];

const USERS = [
  { id: '#USR-001', name: 'Ahmed Hassan',  email: 'ahmed@email.com',  phone: '+252 61 111 2222', role: 'Customer',   joined: 'Jan 5, 2025' },
  { id: '#USR-002', name: 'Fatima Osman',  email: 'fatima@email.com', phone: '+252 62 333 4444', role: 'Customer',   joined: 'Jan 12, 2025' },
  { id: '#USR-003', name: 'Staff User',    email: 'staff@mideye.so',  phone: '+252 61 500 0000', role: 'Staff',      joined: 'Feb 1, 2025' },
  { id: '#USR-004', name: 'Ali Mohamed',   email: 'ali@email.com',    phone: '+252 63 555 6666', role: 'Customer',   joined: 'Feb 20, 2025' },
  { id: '#USR-005', name: 'Hodan Ibrahim', email: 'hodan@email.com',  phone: '+252 61 777 8888', role: 'Agent',      joined: 'Mar 3, 2025' },
  { id: '#USR-006', name: 'Omar Yusuf',    email: 'omar@email.com',   phone: '+252 62 999 0000', role: 'Customer',   joined: 'Apr 14, 2025' },
];

function badgeClass(status) {
  const map = { confirmed: 'badge-confirmed', pending: 'badge-pending', cancelled: 'badge-cancelled', transit: 'badge-transit', delivered: 'badge-delivered' };
  return map[status] || 'badge-pending';
}
function badgeLabel(status) {
  const map = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', transit: 'In Transit', delivered: 'Delivered' };
  return map[status] || status;
}

function renderBookingsTable(data, tbodyId, showSeat = true) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = data.map(b => `
    <tr>
      <td><strong>${b.id}</strong></td>
      <td>${b.name}</td>
      <td><span style="font-size:0.82rem">${b.route}</span></td>
      <td>${b.date}</td>
      ${showSeat ? `<td>${b.seat}</td>` : ''}
      <td><span class="${badgeClass(b.status)}">${badgeLabel(b.status)}</span></td>
      <td><strong>${b.amount}</strong></td>
      <td>
        <div class="tbl-actions">
          <button class="btn-tbl btn-view" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn-tbl btn-edit" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-tbl btn-del" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCargoTable() {
  const tbody = document.getElementById('cargoTableBody');
  if (!tbody) return;
  tbody.innerHTML = CARGO_DATA.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td>${c.sender}</td>
      <td><span style="font-size:0.82rem">${c.route}</span></td>
      <td>${c.type}</td>
      <td>${c.weight}</td>
      <td><span class="${badgeClass(c.status)}">${badgeLabel(c.status)}</span></td>
      <td>
        <div class="tbl-actions">
          <button class="btn-tbl btn-view" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn-tbl btn-edit" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-tbl btn-del" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = USERS.map(u => `
    <tr>
      <td><strong>${u.id}</strong></td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>
        <span class="${u.role === 'Staff' || u.role === 'Agent' ? 'badge-transit' : 'badge-confirmed'}">
          ${u.role}
        </span>
      </td>
      <td>${u.joined}</td>
      <td>
        <div class="tbl-actions">
          <button class="btn-tbl btn-view" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn-tbl btn-edit" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-tbl btn-del" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Init all tables
renderBookingsTable(BOOKINGS.slice(0, 5), 'recentBookingsBody', false);
renderBookingsTable(BOOKINGS, 'bookingsTableBody', true);
renderCargoTable();
renderUsersTable();

// ── Bar chart animation on scroll ──
const chartObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.cb-bar').forEach(bar => {
        const h = bar.style.height;
        bar.style.height = '0';
        setTimeout(() => { bar.style.height = h; }, 100);
      });
      chartObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const chartBars = document.querySelector('.chart-bars');
if (chartBars) chartObserver.observe(chartBars);

// ── Date input: set min to today ──
const dateInput = document.getElementById('flightDate');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
}

// ── Animate counters in stats ──
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const adminObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const scValues = entry.target.querySelectorAll('.sc-value');
      scValues.forEach(el => {
        const raw = el.textContent.replace(/[^0-9]/g, '');
        const num = parseInt(raw, 10);
        if (!isNaN(num)) animateCounter(el, num);
      });
      adminObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

const adminSection = document.getElementById('admin');
if (adminSection) adminObserver.observe(adminSection);

console.log('%c✈ Mideye System Loaded', 'color:#441306;font-weight:bold;font-size:14px;');
