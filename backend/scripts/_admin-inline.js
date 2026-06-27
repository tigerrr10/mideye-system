'use strict';

/* â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const API = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';

const esc = (str) => {
  if (str === null || str === undefined) return 'â€“';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

const formatBookingRef = (b) =>
  b.reference || `BK-${new Date(b.created_at || Date.now()).getFullYear()}-${String(b.id).padStart(5, '0')}`;

/* â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let allBookings = [];
let allCargo    = [];
let allUsers    = [];
let cargoUserFilterId = null;
window.cargoUserFilterId = null;
let modalCtx    = {};  // { type: 'booking'|'cargo', id, currentStatus }

/* â”€â”€â”€ Auth Guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const token = localStorage.getItem('mideye_token');
const user  = JSON.parse(localStorage.getItem('mideye_user') || 'null');

if (!token || !user || user.role !== 'admin') {
  window.location.replace('login.html');
}

/* â”€â”€â”€ Populate sidebar user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
document.getElementById('sidebarName').textContent = user?.full_name || 'Admin';
const avatarLetter = (user?.full_name || 'A')[0].toUpperCase();
document.getElementById('sidebarAvatar').textContent = avatarLetter;
document.getElementById('topbarAvatar').textContent = avatarLetter;
document.getElementById('profileDropdownAvatar').textContent = avatarLetter;
document.getElementById('profileDropdownName').textContent = user?.full_name || 'Admin';
document.getElementById('profileDropdownEmail').textContent = user?.email || 'admin@mideye.com';

/* â”€â”€â”€ Clock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const clockEl = document.getElementById('clockDisplay');
const updateClock = () => {
  clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
updateClock();
setInterval(updateClock, 1000);

/* â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const sections = { dashboard: 'Overview of all activity', users: 'All registered accounts', bookings: 'All flight booking requests', cargo: 'All cargo shipments' };

function navigate(sectionId, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item-link').forEach(a => a.classList.remove('active'));

  document.getElementById('sec-' + sectionId)?.classList.add('active');
  if (el) el.classList.add('active');

  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  document.getElementById('pageSubtitle').textContent = sections[sectionId] || '';
  const crumb = document.getElementById('breadcrumbCurrent');
  if (crumb) crumb.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);

  if (sectionId === 'cargo' && window.cargoUserFilterId != null) {
    cargoUserFilterId = window.cargoUserFilterId;
    applyCargoUserFilter();
  } else if (sectionId !== 'cargo') {
    clearCargoUserFilter(false);
    window.cargoUserFilterId = null;
  }

  if (document.getElementById('sidebar').classList.contains('open')) toggleSidebar();
}

function navigateToPendingBookings() {
  navigate('bookings', document.querySelector('[data-section=bookings]'));
  const search = document.getElementById('search-bookings');
  if (search) search.value = 'Pending';
  filterTable('bookings-body', 'Pending', [6]);
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
}

window.navigate = navigate;
window.navigateToPendingBookings = navigateToPendingBookings;
window.toggleSidebar = toggleSidebar;

/* â”€â”€â”€ Fetch Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function apiFetch(endpoint) {
  const authToken = localStorage.getItem('mideye_token');
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = 'login.html';
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/* â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function showToast(msg, icon = 'fa-check-circle') {
  const t = document.getElementById('toast');
  t.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* â”€â”€â”€ Badge helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function bookingBadge(status) {
  const map = { Pending: 'pending', Confirmed: 'confirmed', Completed: 'completed', Cancelled: 'cancelled', Delay: 'delay' };
  return `<span class="badge-status badge-${(map[status] || 'pending')}">${status}</span>`;
}
function cargoBadge(status) {
  const map = { Received: 'received', 'In Transit': 'in-transit', Arrived: 'arrived', Cancelled: 'cancelled' };
  return `<span class="badge-status badge-${(map[status] || 'received')}">${status}</span>`;
}
function roleBadge(role) {
  return `<span class="badge-status badge-${role}">${role}</span>`;
}
function fmtDate(d) {
  if (!d) return 'â€“';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LOAD STATS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function loadStats() {
  try {
    const payload = await apiFetch('/admin/stats');
    const s = payload?.data?.stats || {};
    ['users','bookings','cargo','pending'].forEach(k => {
      const el = document.getElementById('stat-' + k);
      if (el) {
        el.classList.remove('loading-pulse');
        const key = k === 'pending' ? 'pending_bookings' : `total_${k}`;
        el.textContent = Number(s[key] ?? 0).toLocaleString();
      }
    });
    const badgeUsers = document.getElementById('badge-users');
    const badgeBookings = document.getElementById('badge-bookings');
    const badgeCargo = document.getElementById('badge-cargo');
    if (badgeUsers) badgeUsers.textContent = s.total_users ?? 'â€“';
    if (badgeBookings) badgeBookings.textContent = s.total_bookings ?? 'â€“';
    if (badgeCargo) badgeCargo.textContent = s.total_cargo ?? 'â€“';
    try { updateNotificationBadge(); } catch (_) {}
  } catch (e) {
    console.error('Stats error:', e);
    ['users','bookings','cargo','pending'].forEach(k => {
      const el = document.getElementById('stat-' + k);
      if (el) { el.classList.remove('loading-pulse'); el.textContent = 'N/A'; }
    });
    showToast('Could not load dashboard stats. Try Refresh or log in again.', 'fa-exclamation-circle');
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LOAD USERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function loadUsers() {
  const tbody = document.getElementById('users-body');
  try {
    const payload = await apiFetch('/admin/users');
    const data = payload?.data || {};
    const count = payload?.count ?? (data.users?.length || 0);
    allUsers = data.users || [];
    window.allUsers = allUsers;
    const countEl = document.getElementById('users-count');
    if (countEl) countEl.textContent = `${count} total`;
    try {
      renderUsers(allUsers);
    } catch (renderErr) {
      console.error('Render users failed:', renderErr);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Could not display users.</div></td></tr>`;
      }
    }
  } catch (e) {
    console.error('Load users failed:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load users. Check server connection.</div></td></tr>`;
    }
  }
}

function renderUsers(users) {
  const renderFn = window.renderEnhancedUsers;
  if (typeof renderFn === 'function') {
    renderFn(users, allBookings, allCargo, esc, fmtDate, roleBadge);
    return;
  }
  const tbody = document.getElementById('users-body');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="table-empty"><i class="fas fa-users"></i>No users found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td class="td-muted">${i + 1}</td>
      <td class="td-bold">${esc(u.full_name)}<div class="td-muted">${esc(u.email)}</div></td>
      <td class="td-muted">${esc(u.phone || 'â€“')}</td>
      <td class="td-muted">Galkacyo</td>
      <td>${roleBadge(u.role)}</td>
      <td>â€“</td>
      <td>â€“</td>
      <td>${roleBadge(u.is_active === false ? 'Inactive' : 'Active')}</td>
      <td class="td-muted">${fmtDate(u.created_at)}</td>
      <td><button type="button" class="btn-action btn-action-gold" onclick="openUserProfileModal(${u.id})"><i class="fas fa-user-circle"></i> Profile</button></td>
    </tr>`).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LOAD BOOKINGS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function loadBookings() {
  const tbody = document.getElementById('bookings-body');
  try {
    const payload = await apiFetch('/admin/bookings');
    const data = payload?.data || {};
    const count = payload?.count ?? (data.bookings?.length || 0);
    allBookings = data.bookings || [];
    window.allBookings = allBookings;
    const countEl = document.getElementById('bookings-count');
    if (countEl) countEl.textContent = `${count} total`;
    renderBookings(allBookings);
    if (allUsers.length) renderUsers(allUsers);
    renderDashBookings(allBookings.slice(0, 5));
    updateMediVisuals();
    updateNotificationBadge();
  } catch (e) {
    console.error('Load bookings failed:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load bookings.</div></td></tr>`;
    }
    const dashBody = document.getElementById('dash-bookings-body');
    if (dashBody) {
      dashBody.innerHTML = `<tr><td colspan="3"><div class="table-empty" style="padding:1.5rem"><i class="fas fa-exclamation-circle"></i>Error</div></td></tr>`;
    }
  }
}

function renderBookings(bookings) {
  const tbody = document.getElementById('bookings-body');
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="fas fa-plane"></i>No bookings found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.map((b) => `
    <tr>
      <td class="td-mono td-bold">${esc(formatBookingRef(b))}</td>
      <td>
        <div class="td-bold">${esc(b.passenger_name)}</div>
        <div class="td-muted" style="font-size:var(--fs-base)">${esc(b.email)}</div>
      </td>
      <td>
        <div class="td-bold">${esc(b.origin)} â†’ ${esc(b.destination)}</div>
        <div class="td-muted" style="font-size:var(--fs-base);text-transform:capitalize;">${b.trip_type || 'oneway'}</div>
      </td>
      <td class="td-muted">${fmtDate(b.travel_date)}</td>
      <td class="td-muted" style="text-transform:capitalize;">${b.cabin_class || 'economy'}</td>
      <td class="td-muted">${(b.adults||1) + (b.children||0) + (b.infants||0)} pax</td>
      <td>${bookingBadge(b.status)}</td>
      <td>
        <div class="actions-group">
          <button class="btn-action btn-action-gold" onclick="openBookingReceipt(${b.id})" title="View Receipt">
            <i class="fas fa-eye"></i> Receipt
          </button>
          <button class="btn-action btn-action-brown" onclick="openStatusModal('booking', ${b.id}, '${b.status}')">
            <i class="fas fa-edit"></i> Status
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function renderDashBookings(bookings) {
  const tbody = document.getElementById('dash-bookings-body');
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="table-empty" style="padding:1.5rem"><i class="fas fa-plane"></i>No bookings yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td class="td-bold">${esc(b.passenger_name)}</td>
      <td class="td-muted">${esc(b.origin)} â†’ ${esc(b.destination)}</td>
      <td>${bookingBadge(b.status)}</td>
    </tr>`).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LOAD CARGO
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function loadCargo() {
  const tbody = document.getElementById('cargo-body');
  try {
    const payload = await apiFetch('/admin/cargo');
    const data = payload?.data || {};
    const count = payload?.count ?? (data.shipments?.length || 0);
    allCargo = data.shipments || [];
    window.allCargo = allCargo;
    const countEl = document.getElementById('cargo-count');
    if (countEl) countEl.textContent = `${count} total`;
    if (cargoUserFilterId != null || window.cargoUserFilterId != null) {
      cargoUserFilterId = window.cargoUserFilterId;
      applyCargoUserFilter();
    } else {
      renderCargo(allCargo);
    }
    if (allUsers.length) renderUsers(allUsers);
    renderDashCargo(allCargo.slice(0, 5));
    updateMediVisuals();
    updateNotificationBadge();
  } catch (e) {
    console.error('Load cargo failed:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load cargo.</div></td></tr>`;
    }
    const dashBody = document.getElementById('dash-cargo-body');
    if (dashBody) {
      dashBody.innerHTML = `<tr><td colspan="3"><div class="table-empty" style="padding:1.5rem"><i class="fas fa-exclamation-circle"></i>Error</div></td></tr>`;
    }
  }
}

function renderCargo(shipments) {
  const tbody = document.getElementById('cargo-body');
  if (!tbody) return;
  if (!shipments.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><i class="fas fa-box"></i>No cargo found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = shipments.map((c) => `
    <tr data-user-id="${c.user_id || ''}">
      <td class="td-mono">${esc(c.tracking_id)}</td>
      <td>
        <div class="td-bold">${esc(c.sender_name)}</div>
        <div class="td-muted" style="font-size:var(--fs-base)">${esc(c.sender_phone)}</div>
      </td>
      <td>
        <div class="td-bold">${esc(c.recipient_name)}</div>
        <div class="td-muted" style="font-size:var(--fs-base)">${esc(c.recipient_phone)}</div>
      </td>
      <td class="td-muted">${esc(c.origin || 'GLK')} â†’ ${esc(c.destination)}</td>
      <td class="td-muted" style="text-transform:capitalize;">${esc(c.cargo_type)}</td>
      <td class="td-muted">${c.weight} kg</td>
      <td class="td-muted" style="text-transform:capitalize;">${c.shipping_speed || 'standard'}</td>
      <td>${cargoBadge(c.status)}</td>
      <td>
        <div class="actions-group">
          <button class="btn-action btn-action-gold" onclick="openCargoReceipt(${c.id})" title="View Receipt">
            <i class="fas fa-file-alt"></i> Receipt
          </button>
          <button class="btn-action btn-action-brown" onclick="openStatusModal('cargo', ${c.id}, '${c.status}')">
            <i class="fas fa-edit"></i> Status
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function applyCargoUserFilter() {
  const sec = document.getElementById('sec-cargo');
  cargoUserFilterId = window.cargoUserFilterId;
  if (!sec || cargoUserFilterId == null) return;

  const user = allUsers.find((u) => u.id === cargoUserFilterId);
  const filtered = allCargo.filter((c) => c.user_id === cargoUserFilterId);

  let banner = document.getElementById('cargo-filter-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cargo-filter-banner';
    banner.className = 'cargo-filter-banner';
    const card = sec.querySelector('.data-card');
    card?.parentNode?.insertBefore(banner, card);
  }

  banner.innerHTML = `
    <span><i class="fas fa-filter me-1"></i> Showing cargo for <strong>${esc(user?.full_name || 'User')}</strong> (${filtered.length})</span>
    <button type="button" onclick="clearCargoUserFilter()"><i class="fas fa-times"></i> Show all cargo</button>`;

  renderCargo(filtered);
  document.getElementById('cargo-count').textContent = `${filtered.length} for user`;
  const search = document.getElementById('search-cargo');
  if (search) search.value = '';
}

function clearCargoUserFilter(rerender = true) {
  cargoUserFilterId = null;
  window.cargoUserFilterId = null;
  document.getElementById('cargo-filter-banner')?.remove();
  if (!rerender) return;
  renderCargo(allCargo);
  document.getElementById('cargo-count').textContent = `${allCargo.length} total`;
  const search = document.getElementById('search-cargo');
  if (search) search.value = '';
}

function renderDashCargo(shipments) {
  const tbody = document.getElementById('dash-cargo-body');
  if (!shipments.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="table-empty" style="padding:1.5rem"><i class="fas fa-box"></i>No cargo yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = shipments.map(c => `
    <tr>
      <td class="td-mono">${esc(c.tracking_id)}</td>
      <td class="td-muted">${esc(c.destination)}</td>
      <td>${cargoBadge(c.status)}</td>
    </tr>`).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATUS MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const bookingStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Delay'];
const cargoStatuses   = ['Received', 'In Transit', 'Arrived', 'Cancelled'];

function openStatusModal(type, id, currentStatus) {
  modalCtx = { type, id, currentStatus };
  const statuses = type === 'booking' ? bookingStatuses : cargoStatuses;
  document.getElementById('modalTitle').textContent = `Update ${type === 'booking' ? 'Booking' : 'Cargo'} Status`;
  const sel = document.getElementById('modalSelect');
  sel.innerHTML = statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('');
  document.getElementById('statusModal').classList.add('open');
}

function closeModal() {
  document.getElementById('statusModal').classList.remove('open');
  modalCtx = {};
}

async function saveStatus() {
  const { type, id } = modalCtx;
  const newStatus = document.getElementById('modalSelect').value;
  const endpoint  = type === 'booking' ? `/bookings/${id}` : `/cargo/${id}`;

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Status updated to "${newStatus}"`, 'fa-check-circle');
      closeModal();
      if (type === 'booking') await loadBookings();
      else                    await loadCargo();
      await loadStats();
    } else {
      showToast(data.message || 'Update failed', 'fa-times-circle');
    }
  } catch (e) {
    showToast('Server error. Please try again.', 'fa-times-circle');
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DELETE USER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('User deleted successfully', 'fa-check-circle');
      await loadUsers();
      await loadStats();
    } else {
      showToast(data.message || 'Delete failed', 'fa-times-circle');
    }
  } catch (e) {
    showToast('Server error.', 'fa-times-circle');
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEARCH / FILTER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function filterTable(tbodyId, query, colIndexes) {
  const tbody = document.getElementById(tbodyId);
  const q = query.toLowerCase().trim();
  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    const text = colIndexes.map(i => row.cells[i]?.textContent || '').join(' ').toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

/* â”€â”€â”€ Medi dashboard visuals (gauges + chart) â”€â”€â”€ */
function setGauge(ringId, textId, pct) {
  const ring = document.getElementById(ringId);
  const text = document.getElementById(textId);
  const safe = Math.max(0, Math.min(100, pct || 0));
  if (ring) ring.style.setProperty('--gauge-pct', safe);
  if (text) text.textContent = `${safe}%`;
}

function updateMediVisuals() {
  const totalB = allBookings.length || 0;
  const totalC = allCargo.length || 0;

  const confirmedPct = totalB ? Math.round((allBookings.filter(b => b.status === 'Completed').length / totalB) * 100) : 0;
  const transitPct   = totalC ? Math.round((allCargo.filter(c => c.status === 'In Transit').length / totalC) * 100) : 0;
  const arrivedPct   = totalC ? Math.round((allCargo.filter(c => c.status === 'Arrived').length / totalC) * 100) : 0;

  setGauge('ring-confirmed', 'gauge-confirmed', confirmedPct);
  setGauge('ring-transit', 'gauge-transit', transitPct);
  setGauge('ring-arrived', 'gauge-arrived', arrivedPct);

  const chartEl = document.getElementById('activityChart');
  if (!chartEl) return;

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      bookings: 0,
      cargo: 0,
    });
  }

  const monthMap = Object.fromEntries(months.map(m => [m.key, m]));

  allBookings.forEach(b => {
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[key]) monthMap[key].bookings += 1;
  });
  allCargo.forEach(c => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[key]) monthMap[key].cargo += 1;
  });

  const maxVal = Math.max(1, ...months.map(m => Math.max(m.bookings, m.cargo)));

  chartEl.innerHTML = months.map(m => `
    <div class="medi-chart-bar-group">
      <div class="medi-chart-bars">
        <div class="medi-chart-bar medi-chart-bar--bookings" style="height:${Math.round((m.bookings / maxVal) * 140)}px" title="${m.bookings} bookings"></div>
        <div class="medi-chart-bar medi-chart-bar--cargo" style="height:${Math.round((m.cargo / maxVal) * 140)}px" title="${m.cargo} cargo"></div>
      </div>
      <div class="medi-chart-label">${m.label}</div>
    </div>`).join('');
}

/* â”€â”€â”€ Topbar dropdowns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const topbarDropdowns = [
  { btn: 'btnNotifications', panel: 'dropdownNotifications' },
  { btn: 'btnMessages', panel: 'dropdownMessages' },
  { btn: 'btnSettings', panel: 'dropdownSettings' },
  { btn: 'btnProfile', panel: 'dropdownProfile' },
];

function closeTopbarDropdowns() {
  topbarDropdowns.forEach(({ btn, panel }) => {
    document.getElementById(btn)?.setAttribute('aria-expanded', 'false');
    const el = document.getElementById(panel);
    if (el) el.hidden = true;
  });
}

function toggleTopbarDropdown(btnId, panelId) {
  const btn = document.getElementById(btnId);
  const panel = document.getElementById(panelId);
  if (!btn || !panel) return;
  const willOpen = panel.hidden;
  closeTopbarDropdowns();
  if (willOpen) {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    if (panelId === 'dropdownNotifications') renderNotifications();
    if (panelId === 'dropdownMessages') renderMessages();
  }
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  if (!list) return;

  const pendingBookings = allBookings.filter(b => b.status === 'Pending');
  const receivedCargo = allCargo.filter(c => c.status === 'Received');
  const items = [
    ...pendingBookings.slice(0, 4).map(b => ({
      icon: 'fa-plane-departure',
      title: `Pending booking: ${b.passenger_name}`,
      sub: `${b.origin} â†’ ${b.destination}`,
      action: () => navigate('bookings', document.querySelector('[data-section=bookings]')),
    })),
    ...receivedCargo.slice(0, 3).map(c => ({
      icon: 'fa-box',
      title: `New cargo: ${c.tracking_id}`,
      sub: `To ${c.destination}`,
      action: () => navigate('cargo', document.querySelector('[data-section=cargo]')),
    })),
  ];

  const count = pendingBookings.length + receivedCargo.length;
  if (badge) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.hidden = count === 0;
  }

  if (!items.length) {
    list.innerHTML = '<p class="topbar-dropdown__empty">No new notifications</p>';
    return;
  }

  list.innerHTML = items.map((item, i) => `
    <button type="button" class="topbar-dropdown__item" data-notif-idx="${i}">
      <span class="topbar-dropdown__item-icon"><i class="fas ${item.icon}"></i></span>
      <span>
        <span class="topbar-dropdown__item-title">${esc(item.title)}</span>
        <span class="topbar-dropdown__item-sub">${esc(item.sub)}</span>
      </span>
    </button>`).join('');

  list.querySelectorAll('[data-notif-idx]').forEach(el => {
    el.addEventListener('click', () => {
      items[parseInt(el.dataset.notifIdx, 10)]?.action?.();
      closeTopbarDropdowns();
    });
  });
}

function renderMessages() {
  const list = document.getElementById('messagesList');
  if (!list) return;

  const events = [
    ...allBookings.map(b => ({
      sort: new Date(b.created_at).getTime(),
      icon: 'fa-plane',
      title: `Booking â€” ${b.passenger_name}`,
      sub: `${b.status} Â· ${fmtDate(b.created_at)}`,
    })),
    ...allCargo.map(c => ({
      sort: new Date(c.created_at).getTime(),
      icon: 'fa-box',
      title: `Cargo â€” ${c.tracking_id}`,
      sub: `${c.status} Â· ${fmtDate(c.created_at)}`,
    })),
  ].sort((a, b) => b.sort - a.sort).slice(0, 6);

  if (!events.length) {
    list.innerHTML = '<p class="topbar-dropdown__empty">No recent activity</p>';
    return;
  }

  list.innerHTML = events.map(e => `
    <div class="topbar-dropdown__item topbar-dropdown__item--static">
      <span class="topbar-dropdown__item-icon"><i class="fas ${e.icon}"></i></span>
      <span>
        <span class="topbar-dropdown__item-title">${esc(e.title)}</span>
        <span class="topbar-dropdown__item-sub">${esc(e.sub)}</span>
      </span>
    </div>`).join('');
}

function updateNotificationBadge() {
  renderNotifications();
  const badge = document.getElementById('notifBadge');
  if (!badge || badge.hidden) return;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

function initTopbarControls() {
  /* Search is bound in admin-nav.js */
}

initTopbarControls();

async function syncDatabase() {
  try {
    const authToken = localStorage.getItem('mideye_token');
    const res = await fetch(`${API}/admin/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

async function refreshAll() {
  const btn = document.getElementById('refreshBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncingâ€¦';
    btn.disabled = true;
  }
  await syncDatabase();
  if (typeof window.bootAdminDashboard === 'function') {
    await window.bootAdminDashboard();
  } else {
    await Promise.allSettled([loadStats(), loadUsers(), loadBookings(), loadCargo()]);
  }
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
    btn.disabled = false;
  }
  showToast('Data synced & dashboard refreshed', 'fa-check-circle');
}

/* â”€â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function logout() {
  localStorage.removeItem('mideye_token');
  localStorage.removeItem('mideye_user');
  window.location.href = 'login.html';
}

/* â”€â”€â”€ Keyboard shortcut: close modal on Esc â”€â”€â”€â”€ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('receiptModal')?.classList.contains('open')) {
      closeReceiptModal();
    } else if (document.getElementById('userProfileModal')?.classList.contains('open')) {
      closeUserProfileModal();
    } else {
      closeModal();
    }
  }
});
/* â”€â”€â”€ Expose globals (required for onclick in strict mode) â”€â”€â”€ */
window.allUsers    = allUsers;
window.allBookings = allBookings;
window.allCargo    = allCargo;
window.esc         = esc;
window.fmtDate     = fmtDate;
window.roleBadge   = roleBadge;
window.showToast   = showToast;
window.navigate    = navigate;
window.navigateToPendingBookings = navigateToPendingBookings;
window.toggleSidebar = toggleSidebar;
window.refreshAll  = refreshAll;
window.toggleFullscreen = toggleFullscreen;
window.closeTopbarDropdowns = closeTopbarDropdowns;
window.toggleTopbarDropdown = toggleTopbarDropdown;
window.filterTable = filterTable;
window.closeModal  = closeModal;
window.openStatusModal = openStatusModal;
window.saveStatus  = saveStatus;
window.deleteUser  = deleteUser;
window.logout      = logout;
window.loadUsers   = loadUsers;
window.loadStats   = loadStats;
window.loadBookings = loadBookings;
window.loadCargo   = loadCargo;
window.renderUsers = renderUsers;
window.renderBookings = renderBookings;
window.renderCargo = renderCargo;
window.API         = API;
window.applyCargoUserFilter = applyCargoUserFilter;
window.clearCargoUserFilter = clearCargoUserFilter;
window.updateMediVisuals = updateMediVisuals;

document.getElementById('statusModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('statusModal')) closeModal();
});
