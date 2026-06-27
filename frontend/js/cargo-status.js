/**
 * Mideye – shared cargo status values, labels, and badge helpers.
 * Used by admin dashboard, user dashboard, and tracking page.
 */
'use strict';

const CARGO_STATUSES = [
  'Pending',
  'Confirmed',
  'Received',
  'Processing',
  'In Transit',
  'Arrived',
  'Ready for Pickup',
  'Delivered',
  'Cancelled',
];

const CARGO_WORKFLOW_STEPS = CARGO_STATUSES.filter((s) => s !== 'Cancelled');

const CARGO_STATUS_BADGE_CLASS = {
  Pending: 'cargo-pending',
  Confirmed: 'cargo-confirmed',
  Received: 'cargo-received',
  Processing: 'cargo-processing',
  'In Transit': 'cargo-in-transit',
  Arrived: 'cargo-arrived',
  'Ready for Pickup': 'cargo-ready',
  Delivered: 'cargo-delivered',
  Cancelled: 'cargo-cancelled',
};

const cargoStatusBadgeClass = (status) => CARGO_STATUS_BADGE_CLASS[status] || 'cargo-pending';

const cargoStatusLabel = (status) => {
  if (status === 'Cancelled') return '❌ Cancelled';
  if (status === 'Delivered') return '✅ Delivered';
  return status;
};

const renderCargoStatusBadge = (status) => {
  const cls = cargoStatusBadgeClass(status);
  const label = cargoStatusLabel(status);
  return `<span class="badge-status badge-${cls}">${label}</span>`;
};

const cargoWorkflowIndex = (status) => {
  const idx = CARGO_WORKFLOW_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
};

const CargoStatus = {
  CARGO_STATUSES,
  CARGO_WORKFLOW_STEPS,
  CARGO_STATUS_BADGE_CLASS,
  cargoStatusBadgeClass,
  cargoStatusLabel,
  renderCargoStatusBadge,
  cargoWorkflowIndex,
};

if (typeof window !== 'undefined') {
  window.CargoStatus = CargoStatus;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CargoStatus;
}
