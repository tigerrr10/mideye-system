/**
 * Mideye – Combined Cargo Tracking UI
 * Uses shared CargoStatus values from cargo-status.js
 */

const CS = () => window.CargoStatus || {};

const formatMoney = (n) => `$${Number(n).toFixed(2)}`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const getWorkflowSteps = () => CS().CARGO_WORKFLOW_STEPS || [
  'Pending', 'Processing',
  'In Transit', 'Arrived', 'Ready for Pickup', 'Delivered',
];

const getWorkflowIndex = (status) => CS().cargoWorkflowIndex?.(status) ?? 0;

const getTrackBadgeClass = (status) => CS().cargoStatusBadgeClass?.(status) || 'cargo-pending';

const getStatusLabel = (status) => CS().cargoStatusLabel?.(status) || status;

const PIPELINE_ICONS = {
  Pending: 'fa-clock',
  Processing: 'fa-cogs',
  'In Transit': 'fa-plane',
  Arrived: 'fa-map-marker-alt',
  'Ready for Pickup': 'fa-hand-holding-box',
  Delivered: 'fa-check-circle',
};

const buildOpsFromTimeline = (timeline, createdAt) => {
  if (!Array.isArray(timeline) || !timeline.length) return [];

  return timeline.map((item) => ({
    step: item.status,
    state: item.completed && !item.active ? 'done' : item.active ? 'active' : 'pending',
    date: item.active && item.updated_at
      ? formatDateTime(item.updated_at)
      : item.completed
        ? formatDateTime(createdAt)
        : 'Pending',
    note: item.active
      ? `Current status: ${item.status}`
      : item.completed
        ? `${item.status} completed.`
        : `Awaiting: ${item.status}`,
  }));
};

const normalizeApiCargo = ({ cargo, timeline }) => {
  const created = cargo.created_at ? new Date(cargo.created_at) : new Date();
  const weight = parseFloat(cargo.weight) || 0;
  const price = weight * 2.5 + 5;
  const status = cargo.status;
  const isCancelled = status === 'Cancelled';
  const isDelivered = status === 'Delivered';

  return {
    tracking_id: cargo.tracking_id,
    status,
    status_label: getStatusLabel(status),
    cancellation_reason: cargo.cancellation_reason || '',
    status_updated_at: formatDateTime(cargo.updated_at),
    delivered_at: formatDateTime(cargo.delivered_at),
    is_cancelled: isCancelled,
    is_delivered: isDelivered,
    contents: cargo.cargo_type || 'General Cargo',
    origin: cargo.origin || 'Galkacyo (GLK)',
    destination: cargo.destination || '—',
    departure: created.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    expected: new Date(created.getTime() + 86400000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    sender_name: cargo.sender_name || '—',
    sender_phone: cargo.sender_phone || '—',
    recipient_name: cargo.recipient_name || '—',
    recipient_phone: cargo.recipient_phone || '—',
    route: `${cargo.origin || 'GLK'} → ${cargo.destination || '—'}`,
    weight,
    description: cargo.description || `${cargo.cargo_type || 'Cargo'} — ${cargo.pieces || 1} piece(s)`,
    sent_on: created.toLocaleDateString('en-US', { dateStyle: 'long' }),
    last_update: formatDateTime(cargo.updated_at),
    payment: 'Paid',
    shipment_price: price,
    sgs_fee: 10,
    timeline,
    ops_timeline: isCancelled ? [] : buildOpsFromTimeline(timeline, cargo.created_at),
  };
};

const renderMideyeTracking = (shipment) => {
  const container = document.getElementById('trackingResult');
  const notFound = document.getElementById('trackingNotFound');
  if (!container) return;

  notFound?.classList.remove('is-visible');
  container.classList.add('is-visible');

  const workflowSteps = getWorkflowSteps();
  const isCancelled = shipment.is_cancelled || shipment.status === 'Cancelled';
  const isDelivered = shipment.is_delivered || shipment.status === 'Delivered';
  const pipeIdx = isCancelled ? -1 : getWorkflowIndex(shipment.status);
  const fillPct = pipeIdx <= 0 ? 0 : (pipeIdx / (workflowSteps.length - 1)) * 84;

  const pipelineHtml = workflowSteps.map((label, i) => {
    const cls = i < pipeIdx ? 'done' : i === pipeIdx ? 'active' : '';
    const icon = PIPELINE_ICONS[label] || 'fa-circle';
    return `
      <div class="track-pipeline__step ${cls}">
        <div class="track-pipeline__dot"><i class="fas ${icon}"></i></div>
        <span class="track-pipeline__label">${label}</span>
      </div>`;
  }).join('');

  const opsHtml = (shipment.ops_timeline || []).map((item) => `
      <div class="track-ops-item ${item.state}">
        <div class="track-ops-marker">
          <i class="fas ${
            item.state === 'done' ? 'fa-check' :
            item.state === 'active' ? 'fa-plane' : 'fa-circle'
          }"></i>
        </div>
        <div class="track-ops-content">
          <h4>${item.step}</h4>
          <div class="track-ops-date">${item.date}</div>
          <p class="track-ops-note">${item.note}</p>
        </div>
      </div>`).join('');

  const cancelledHtml = isCancelled ? `
    <section class="track-cancelled-card" aria-label="Cancellation details">
      <div class="track-cancelled-card__row">
        <span class="track-cancelled-card__label">Status:</span>
        <span class="track-cancelled-card__value track-cancelled-card__value--status">${escapeHtml(shipment.status_label)}</span>
      </div>
      <div class="track-cancelled-card__row">
        <span class="track-cancelled-card__label">Reason:</span>
        <span class="track-cancelled-card__value">${escapeHtml(shipment.cancellation_reason || '—')}</span>
      </div>
      <div class="track-cancelled-card__row">
        <span class="track-cancelled-card__label">Updated:</span>
        <span class="track-cancelled-card__value">${escapeHtml(shipment.status_updated_at)}</span>
      </div>
    </section>` : '';

  const deliveredHtml = isDelivered ? `
    <section class="track-delivered-card" aria-label="Delivery details">
      <div class="track-delivered-card__row">
        <span class="track-delivered-card__label">Status:</span>
        <span class="track-delivered-card__value track-delivered-card__value--status">${escapeHtml(shipment.status_label)}</span>
      </div>
      <div class="track-delivered-card__row">
        <span class="track-delivered-card__label">Delivered:</span>
        <span class="track-delivered-card__value">${escapeHtml(shipment.delivered_at)}</span>
      </div>
    </section>` : '';

  const badgeClass = getTrackBadgeClass(shipment.status);

  container.innerHTML = `
    <section class="track-shipment-card" aria-label="Shipment overview">
      <div class="track-shipment-card__top">
        <div class="track-shipment-card__icon"><i class="fas fa-box"></i></div>
        <div class="track-shipment-card__title">
          <h2>Shipment ${shipment.tracking_id}</h2>
          <p class="track-shipment-card__subtitle">${shipment.contents}</p>
        </div>
        <span class="track-status-badge track-status-badge--${badgeClass}">
          <i class="fas fa-circle" style="font-size:0.45rem;"></i> ${escapeHtml(shipment.status_label)}
        </span>
      </div>
      <div class="track-route-grid">
        <div class="track-route-point">
          <div class="track-route-point__label">Origin</div>
          <div class="track-route-point__city">${shipment.origin}</div>
          <div class="track-route-point__meta">Departure: ${shipment.departure}</div>
        </div>
        <div class="track-route-arrow"><i class="fas fa-plane"></i></div>
        <div class="track-route-point track-route-point--dest">
          <div class="track-route-point__label">Destination</div>
          <div class="track-route-point__city">${shipment.destination}</div>
          <div class="track-route-point__meta">${
            isCancelled ? `Updated: ${escapeHtml(shipment.status_updated_at)}` :
            isDelivered ? `Delivered: ${escapeHtml(shipment.delivered_at)}` :
            `Expected: ${shipment.expected}`
          }</div>
        </div>
      </div>
    </section>

    ${cancelledHtml}
    ${deliveredHtml}

    ${isCancelled ? '' : `
    <section class="track-pipeline" aria-label="Shipment workflow">
      <div class="track-pipeline__title"><i class="fas fa-route me-2"></i>Shipment Status</div>
      <div class="track-pipeline__steps">
        <div class="track-pipeline__fill" style="width:${fillPct}%;"></div>
        ${pipelineHtml}
      </div>
    </section>`}

    <section class="track-details-card" aria-label="Cargo details">
      <div class="track-details-card__header">
        <h3><i class="fas fa-file-alt me-2"></i>Cargo Details</h3>
        <span class="track-details-card__id">${shipment.tracking_id}</span>
      </div>
      <div class="track-details-grid">
        <div class="track-detail-item">
          <div class="track-detail-item__label">Sender</div>
          <div class="track-detail-item__value">${shipment.sender_name}<br><span style="font-weight:500;color:var(--text-muted);">${shipment.sender_phone}</span></div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Receiver</div>
          <div class="track-detail-item__value">${shipment.recipient_name}<br><span style="font-weight:500;color:var(--text-muted);">${shipment.recipient_phone}</span></div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Route</div>
          <div class="track-detail-item__value">${shipment.route}</div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Weight</div>
          <div class="track-detail-item__value">${shipment.weight} kg</div>
        </div>
        <div class="track-detail-item track-detail-item--full">
          <div class="track-detail-item__label">Contents Description</div>
          <div class="track-detail-item__value">${shipment.description}</div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Sent On</div>
          <div class="track-detail-item__value">${shipment.sent_on}</div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Last Update</div>
          <div class="track-detail-item__value">${shipment.last_update}</div>
        </div>
        <div class="track-detail-item track-detail-item--payment">
          <div class="track-detail-item__label">Payment</div>
          <div class="track-detail-item__value ${shipment.payment === 'Paid' ? 'paid' : 'pending'}">${shipment.payment}</div>
        </div>
        <div class="track-detail-item">
          <div class="track-detail-item__label">Shipment Price + SGS</div>
          <div class="track-detail-item__value track-detail-item__value--price">
            ${formatMoney(shipment.shipment_price)} <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);">+ SGS ${formatMoney(shipment.sgs_fee)}</span>
          </div>
        </div>
      </div>
    </section>

    ${isCancelled ? '' : `
    <section class="track-ops-card" aria-label="Shipment status timeline">
      <h3><i class="fas fa-list-check me-2"></i>Shipment Status Timeline</h3>
      <div class="track-ops-timeline">${opsHtml}</div>
    </section>`}

    <footer class="track-chat-footer">
      <div class="track-chat-footer__text">
        <strong>Need help with this shipment?</strong>
        Our team is available 24/7 on WhatsApp and phone.
      </div>
      <a href="https://wa.me/252907816567" target="_blank" rel="noopener" class="track-chat-btn">
        <i class="fab fa-whatsapp"></i> Chat with MidEye
      </a>
    </footer>`;

  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const showNotFound = (trackingId) => {
  const container = document.getElementById('trackingResult');
  const notFound = document.getElementById('trackingNotFound');
  container?.classList.remove('is-visible');
  if (notFound) {
    const idEl = notFound.querySelector('.track-not-found__id');
    if (idEl) idEl.textContent = trackingId;
    notFound.classList.add('is-visible');
    notFound.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const searchShipment = async (trackingId) => {
  const id = trackingId.trim().toUpperCase();
  const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
  const token = localStorage.getItem('mideye_token');

  if (!token) {
    window.AuthGuard?.redirectToLogin?.() || (window.location.replace('login.html'));
    return;
  }

  try {
    const res = await fetch(`${apiBase}/track/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (res.status === 401) {
      localStorage.removeItem('mideye_token');
      localStorage.removeItem('mideye_user');
      window.location.replace('login.html');
      return;
    }

    const data = await res.json();
    if (res.ok && data.success) {
      renderMideyeTracking(normalizeApiCargo(data.data));
    } else {
      showNotFound(id);
    }
  } catch {
    showNotFound(id);
  }
};

const initMideyeTracking = () => {
  const form = document.getElementById('trackingForm');
  const input = document.getElementById('trackingNumber');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const id = input?.value.trim();
    if (!id) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Tracking…';
    }

    await searchShipment(id);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search me-2"></i>Track';
    }
  });

  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) {
    if (input) input.value = urlId;
    searchShipment(urlId);
  }
};

window.renderMideyeTracking = renderMideyeTracking;
window.initMideyeTracking = initMideyeTracking;

document.addEventListener('DOMContentLoaded', initMideyeTracking);
