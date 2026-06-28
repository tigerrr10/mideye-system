/** Canonical cargo shipment workflow statuses (shared across API + DB). */
const CARGO_STATUSES = [
  'Pending',
  'Processing',
  'In Transit',
  'Arrived',
  'Ready for Pickup',
  'Delivered',
  'Cancelled',
];

const CARGO_STATUS_DEFAULT = 'Pending';

const CARGO_WORKFLOW_STEPS = CARGO_STATUSES.filter((s) => s !== 'Cancelled');

const isValidCargoStatus = (status) => CARGO_STATUSES.includes(status);

module.exports = {
  CARGO_STATUSES,
  CARGO_STATUS_DEFAULT,
  CARGO_WORKFLOW_STEPS,
  isValidCargoStatus,
};
