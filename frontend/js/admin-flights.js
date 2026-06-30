/**
 * Mideye Admin – Flight Management
 * Add / edit / delete flights, routes, schedules, prices, seats, status
 */

const AIRPORT_OPTIONS_FALLBACK = [
  { code: 'MGQ', label: 'Mogadishu (MGQ)' },
  { code: 'HGA', label: 'Hargeisa (HGA)' },
  { code: 'GLK', label: 'Galkacyo (GLK)' },
  { code: 'KSM', label: 'Kismayo (KSM)' },
  { code: 'BDI', label: 'Baidoa (BDI)' },
];

let airportOptionsCache = null;

const loadAirportOptions = async () => {
  if (airportOptionsCache) return airportOptionsCache;
  try {
    const API = window.API || 'http://localhost:5000/api';
    const res = await fetch(`${API}/cities`);
    const data = await res.json();
    const cities = (data.data?.cities || []).filter((c) => c.is_active !== false);
    airportOptionsCache = cities.length
      ? cities.map((c) => ({ code: c.code, label: `${c.name} (${c.code})` }))
      : AIRPORT_OPTIONS_FALLBACK;
  } catch {
    airportOptionsCache = AIRPORT_OPTIONS_FALLBACK;
  }
  return airportOptionsCache;
};

window.invalidateFlightAirportOptions = () => {
  airportOptionsCache = null;
};

const buildAirportOptions = (selected = '') => (airportOptionsCache || AIRPORT_OPTIONS_FALLBACK).map((a) =>
  `<option value="${a.code}" ${a.code === selected ? 'selected' : ''}>${a.label}</option>`
).join('');

const FLIGHT_STATUSES = ['Scheduled', 'Active', 'Full', 'Cancelled', 'Completed'];

const flightBadge = (status) => {
  const map = {
    Scheduled: 'pending',
    Active: 'confirmed',
    Full: 'cancelled',
    Cancelled: 'cancelled',
    Completed: 'completed',
  };
  return `<span class="badge-status badge-${map[status] || 'pending'}">${status}</span>`;
};

const formatMoney = (amount) => {
  if (amount == null || Number.isNaN(amount)) return '–';
  return `$${Number(amount).toFixed(2)}`;
};

const getFlightFormValues = () => ({
  flight_code: document.getElementById('flightCode')?.value.trim() || '',
  airline: document.getElementById('flightAirline')?.value.trim() || '',
  origin: document.getElementById('flightOrigin')?.value || '',
  destination: document.getElementById('flightDestination')?.value || '',
  departure_time: document.getElementById('flightDeparture')?.value.trim() || '',
  arrival_time: document.getElementById('flightArrival')?.value.trim() || '',
  duration: document.getElementById('flightDuration')?.value.trim() || '',
  schedule_date: document.getElementById('flightScheduleDate')?.value || '',
  price_economy: document.getElementById('flightPriceEconomy')?.value || '',
  price_business: document.getElementById('flightPriceBusiness')?.value || '',
  price_first: document.getElementById('flightPriceFirst')?.value || '',
  total_seats: document.getElementById('flightTotalSeats')?.value || '',
  available_seats: document.getElementById('flightAvailableSeats')?.value || '',
  status: document.getElementById('flightStatus')?.value || 'Scheduled',
});

const setFlightFormValues = (flight = {}) => {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('flightIdDisplay', flight.flight_id || '');
  set('flightCode', flight.flight_code || '');
  set('flightAirline', flight.airline || '');
  set('flightOrigin', flight.origin || '');
  set('flightDestination', flight.destination || '');
  set('flightDeparture', flight.departure_time || '');
  set('flightArrival', flight.arrival_time || '');
  set('flightDuration', flight.duration || '');
  set('flightScheduleDate', flight.schedule_date || '');
  set('flightPriceEconomy', flight.price_economy ?? '');
  set('flightPriceBusiness', flight.price_business ?? '');
  set('flightPriceFirst', flight.price_first ?? '');
  set('flightTotalSeats', flight.total_seats ?? 120);
  set('flightAvailableSeats', flight.available_seats ?? 120);
  set('flightStatus', flight.status || 'Scheduled');
};

window.openFlightModal = async function (flightId = null) {
  await loadAirportOptions();
  initFlightFormOptions();
  const modal = document.getElementById('flightModal');
  const title = document.getElementById('flightModalTitle');
  const flight = flightId
    ? (window.allFlights || []).find((f) => f.id === flightId)
    : null;

  modal.dataset.flightId = flightId || '';
  title.textContent = flight ? 'Edit Flight' : 'Add New Flight';

  if (flight) {
    setFlightFormValues(flight);
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFlightFormValues({
      total_seats: 120,
      available_seats: 120,
      schedule_date: tomorrow.toISOString().split('T')[0],
      status: 'Scheduled',
    });
  }

  modal.classList.add('open');
};

window.closeFlightModal = function () {
  document.getElementById('flightModal')?.classList.remove('open');
  document.getElementById('flightModal')?.removeAttribute('data-flight-id');
};

window.saveFlight = async function () {
  const modal = document.getElementById('flightModal');
  const flightId = modal?.dataset.flightId;
  const payload = getFlightFormValues();
  const token = localStorage.getItem('mideye_token');
  const API = window.API || 'http://localhost:5000/api';

  if (!payload.airline || !payload.origin || !payload.destination || !payload.departure_time
    || !payload.duration || !payload.schedule_date || !payload.price_economy) {
    window.showToast?.('Please fill all required fields.', 'fa-times-circle');
    return;
  }

  if (payload.origin === payload.destination) {
    window.showToast?.('Origin and destination must be different.', 'fa-times-circle');
    return;
  }

  try {
    const res = await fetch(`${API}/admin/flights${flightId ? `/${flightId}` : ''}`, {
      method: flightId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      window.showToast?.(data.message || 'Flight saved.', 'fa-check-circle');
      closeFlightModal();
      await window.loadFlights?.();
      await window.loadStats?.();
    } else {
      window.showToast?.(data.message || 'Save failed.', 'fa-times-circle');
    }
  } catch {
    window.showToast?.('Server error. Please try again.', 'fa-times-circle');
  }
};

window.deleteFlight = async function (id) {
  const flight = (window.allFlights || []).find((f) => f.id === id);
  const code = flight?.flight_code || 'this flight';
  if (!confirm(`Delete flight "${code}"? This cannot be undone.`)) return;

  const token = localStorage.getItem('mideye_token');
  const API = window.API || 'http://localhost:5000/api';

  try {
    const res = await fetch(`${API}/admin/flights/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      window.showToast?.('Flight deleted successfully.', 'fa-check-circle');
      await window.loadFlights?.();
      await window.loadStats?.();
    } else {
      window.showToast?.(data.message || 'Delete failed.', 'fa-times-circle');
    }
  } catch {
    window.showToast?.('Server error.', 'fa-times-circle');
  }
};

window.renderFlights = function (flights) {
  const tbody = document.getElementById('flights-body');
  const esc = window.esc || ((s) => s);
  const fmtDate = window.fmtDate || ((d) => d);

  if (!tbody) return;

  if (!flights.length) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="table-empty"><i class="fas fa-plane"></i>No flights found. Click "Add Flight" to create one.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = flights.map((f, i) => `
    <tr>
      <td class="td-mono">${esc(f.flight_id)}</td>
      <td class="td-mono">${esc(f.flight_code)}</td>
      <td class="td-bold">${esc(f.airline)}</td>
      <td class="td-muted">${esc(f.origin)} → ${esc(f.destination)}</td>
      <td class="td-muted">${fmtDate(f.schedule_date)}</td>
      <td class="td-muted">${esc(f.departure_time)}</td>
      <td class="td-muted">${esc(f.duration)}</td>
      <td class="td-muted">${formatMoney(f.price_economy)}</td>
      <td class="td-muted">${formatMoney(f.price_business)}</td>
      <td class="td-muted">${f.available_seats}/${f.total_seats}</td>
      <td>${flightBadge(f.status)}</td>
      <td>
        <div class="actions-group">
          <button class="btn-action btn-action-brown" onclick="openFlightModal(${f.id})" title="Edit">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-action btn-action-gold" onclick="deleteFlight(${f.id})" title="Delete">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </td>
    </tr>`).join('');
};

window.loadFlights = async function () {
  const tbody = document.getElementById('flights-body');
  const token = localStorage.getItem('mideye_token');
  const API = window.API || 'http://localhost:5000/api';

  try {
    const res = await fetch(`${API}/admin/flights`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data, count } = await res.json();
    window.allFlights = data.flights || [];
    document.getElementById('flights-count').textContent = `${count} total`;
    document.getElementById('badge-flights').textContent = count ?? '–';
    renderFlights(window.allFlights);
    window.renderReportsSection?.();
  } catch {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="12"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load flights.</div></td></tr>`;
    }
  }
};

window.initFlightFormOptions = async function () {
  await loadAirportOptions();
  const origin = document.getElementById('flightOrigin');
  const dest = document.getElementById('flightDestination');
  const status = document.getElementById('flightStatus');

  if (origin) origin.innerHTML = buildAirportOptions(origin.value);
  if (dest) dest.innerHTML = buildAirportOptions(dest.value);
  if (status && !status.options.length) {
    status.innerHTML = FLIGHT_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initFlightFormOptions();
  document.getElementById('flightModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'flightModal') closeFlightModal();
  });
});

if (document.readyState !== 'loading') initFlightFormOptions();
