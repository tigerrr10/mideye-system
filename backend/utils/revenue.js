const calcBookingPrice = (b) => {
  const base = b.cabin_class === 'business' ? 195 : 85;
  const pax = (Number(b.adults) || 1) + (Number(b.children) || 0);
  return base * Math.max(pax, 1);
};

const calcCargoPrice = (c) => {
  const w = parseFloat(c.weight) || 0;
  if (w <= 10) return w * 2.5 + 5;
  if (w <= 50) return w * 2.0 + 5;
  return w * 1.5 + 5;
};

const isBookingPaid = (status) => status === 'Completed';
const isCargoPaid = (status) => ['Arrived', 'Ready for Pickup', 'Delivered'].includes(status);
const isBookingPendingPayment = (status) => status === 'Pending';
const isCargoPendingPayment = (status) =>
  !['Arrived', 'Ready for Pickup', 'Delivered', 'Cancelled'].includes(status);

module.exports = {
  calcBookingPrice,
  calcCargoPrice,
  isBookingPaid,
  isCargoPaid,
  isBookingPendingPayment,
  isCargoPendingPayment,
};
