/**
 * Single booking reference format used across API, admin, and receipts.
 * Example: BK-2026-00070
 */
const formatBookingReference = (id, createdAt = new Date()) => {
  const year = new Date(createdAt).getFullYear();
  return `BK-${year}-${String(id).padStart(5, '0')}`;
};

module.exports = formatBookingReference;
