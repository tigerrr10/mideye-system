/**
 * Mideye – WhatsApp confirmation helper
 * Opens wa.me with pre-filled booking or cargo details.
 */

const WHATSAPP_NUMBER = typeof MIDEYE_WHATSAPP_NUMBER !== 'undefined'
  ? MIDEYE_WHATSAPP_NUMBER
  : '252907816567';
const USD_TO_SOS = 570;

const CITY_NAMES = {
  MGQ: 'Mogadishu',
  HGA: 'Hargeisa',
  GLK: 'Galkacyo',
  KSM: 'Kismayo',
  BDI: 'Baidoa',
};

const CLASS_LABELS = {
  economy: 'Economy',
  business: 'Business',
  first: 'First Class',
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

let pendingFlightRef = null;
let pendingCargoRef = null;

/** Replace empty values with fallback text. */
const val = (v, fallback = 'Not provided') => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s || fallback;
};

/** Generate unique reference e.g. ME-FL-A3X9K2847 */
const generateReference = (prefix) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${rand}${Date.now().toString().slice(-4)}`;
};

const parseUsd = (str) => {
  if (typeof str === 'number') return str;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const formatUsd = (amount) => `$${amount.toFixed(2)}`;

const formatSos = (usdAmount) => {
  const sos = Math.round(usdAmount * USD_TO_SOS);
  return `${sos.toLocaleString('en-US')} SOS`;
};

const formatDualPrice = (usdAmount) => `${formatUsd(usdAmount)} / ${formatSos(usdAmount)}`;

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not provided';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const buildFlightMessage = (d) => {
  const lines = [
    '*MidEye Flight Booking Confirmation*',
    '',
    `*Booking Reference:* ${val(d.reference)}`,
    `*Passenger:* ${val(d.passengerName)}`,
    `*Route:* ${val(d.route)}`,
    `*Departure:* ${val(d.departureDate)}${d.departureTime ? ` at ${d.departureTime}` : ''}`,
    `*Class:* ${val(d.flightClass)}`,
    `*Passengers:* ${val(d.passengers)}`,
    `*Total Price:* ${val(d.totalPrice)}`,
    `*Email:* ${val(d.email)}`,
    `*Phone:* ${val(d.phone)}`,
    '',
    'Please confirm this booking. Thank you!',
  ];
  return lines.join('\n');
};

const buildCargoMessage = (d) => {
  const lines = [
    '*MidEye Cargo Shipment Request*',
    '',
    `*Tracking Number:* ${val(d.trackingNumber)}`,
    `*Sender:* ${val(d.senderName)} | ${val(d.senderPhone)}`,
    `*Recipient:* ${val(d.recipientName)} | ${val(d.recipientPhone)}`,
    `*Destination:* ${val(d.destination)}`,
    `*Cargo Type:* ${val(d.cargoType)}`,
    `*Pieces:* ${val(d.pieces)}`,
    `*Weight:* ${d.weight && d.weight !== 'Not provided' ? `${d.weight} kg` : 'Not provided'}`,
    `*Total Price:* ${val(d.totalPrice)}`,
    `*Submission Date:* ${val(d.submissionDate)}`,
    '',
    'Please confirm this shipment. Thank you!',
  ];
  return lines.join('\n');
};

/**
 * Open WhatsApp with pre-filled message.
 * @param {'flight'|'cargo'} type
 * @param {object} formData
 * @returns {boolean}
 */
const sendToWhatsApp = (type, formData) => {
  if (!formData) {
    alert('Please complete all required fields first.');
    return false;
  }

  let message = '';
  if (type === 'flight') {
    message = buildFlightMessage(formData);
  } else if (type === 'cargo') {
    message = buildCargoMessage(formData);
  } else {
    alert('Please complete all required fields first.');
    return false;
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
};

/** Collect flight booking data from the booking page DOM. */
const collectFlightFormData = () => {
  const fromCode = document.getElementById('searchFrom')?.value;
  const toCode = document.getElementById('searchTo')?.value;
  const from = CITY_NAMES[fromCode] || fromCode;
  const to = CITY_NAMES[toCode] || toCode;
  const depart = document.getElementById('searchDepart')?.value;
  const flightClass = document.getElementById('searchClass')?.value || 'economy';
  const passengers = document.getElementById('searchPassengers')?.value || '1';
  const passengerName = document.getElementById('passengerFullName')?.value.trim();
  const email = document.getElementById('passengerEmail')?.value.trim();
  const phone = document.getElementById('passengerPhone')?.value.trim();
  const totalUsd = parseUsd(document.getElementById('totalPriceValue')?.textContent);

  const flightMeta = typeof window.getSelectedFlightMeta === 'function'
    ? window.getSelectedFlightMeta()
    : null;

  if (!passengerName || !email || !phone || !fromCode || !toCode || !depart) return null;
  if (!flightMeta?.airline) return null;

  if (!pendingFlightRef) pendingFlightRef = generateReference('ME-FL');

  return {
    reference: pendingFlightRef,
    passengerName,
    route: `${from} → ${to}`,
    departureDate: formatDate(depart),
    departureTime: flightMeta.departureTime || 'Not provided',
    flightClass: CLASS_LABELS[flightClass] || flightClass,
    passengers,
    totalPrice: formatDualPrice(totalUsd),
    email,
    phone,
    airline: flightMeta.airline,
  };
};

/** Validate cargo form required fields (mirrors api.js field order). */
const validateCargoForm = (form) => {
  if (!form) return false;

  const textInputs = form.querySelectorAll('input[type="text"]');
  const telInputs = form.querySelectorAll('input[type="tel"]');
  const selects = form.querySelectorAll('select');
  const numInputs = form.querySelectorAll('input[type="number"]');
  const textareas = form.querySelectorAll('textarea');

  const senderName = textInputs[0]?.value.trim();
  const senderPhone = telInputs[0]?.value.trim();
  const recipientName = textInputs[2]?.value.trim();
  const recipientPhone = telInputs[1]?.value.trim();
  const destination = selects[0]?.value;
  const cargoType = selects[1]?.value;
  const pieces = numInputs[0]?.value;
  const weight = numInputs[1]?.value;
  const description = textareas[0]?.value.trim();

  return !!(
    senderName && senderPhone &&
    recipientName && recipientPhone &&
    destination && cargoType &&
    pieces && weight && description
  );
};

/** Collect cargo form data from DOM. */
const collectCargoFormData = (trackingOverride) => {
  const form = document.getElementById('cargoRequestForm');
  if (!form || !validateCargoForm(form)) return null;

  const textInputs = form.querySelectorAll('input[type="text"]');
  const telInputs = form.querySelectorAll('input[type="tel"]');
  const selects = form.querySelectorAll('select');
  const numInputs = form.querySelectorAll('input[type="number"]');

  const destCode = selects[0]?.value;
  const cargoTypeKey = selects[1]?.value;
  const weight = numInputs[1]?.value;

  let totalUsd = parseUsd(document.getElementById('priceResultValue')?.textContent);
  if (!totalUsd && weight) {
    const routeBtn = document.querySelector('.route-type-btn.active');
    const route = routeBtn?.dataset.route || 'domestic';
    if (typeof window.calculateCargoPrice === 'function') {
      const { total } = window.calculateCargoPrice(parseFloat(weight), route);
      totalUsd = total;
    }
  }

  if (!pendingCargoRef) pendingCargoRef = generateReference('ME-CG');

  return {
    trackingNumber: trackingOverride || pendingCargoRef,
    senderName: textInputs[0]?.value.trim(),
    senderPhone: telInputs[0]?.value.trim(),
    recipientName: textInputs[2]?.value.trim(),
    recipientPhone: telInputs[1]?.value.trim(),
    destination: CITY_NAMES[destCode] || destCode,
    cargoType: CARGO_TYPE_LABELS[cargoTypeKey] || cargoTypeKey,
    pieces: numInputs[0]?.value,
    weight,
    totalPrice: totalUsd ? formatDualPrice(totalUsd) : 'Not provided',
    submissionDate: todayLabel(),
  };
};

const handleFlightWhatsApp = () => {
  if (typeof window.validateBookingPassengerForm === 'function' && !window.validateBookingPassengerForm()) {
    alert('Please complete all required fields first.');
    return false;
  }
  const data = collectFlightFormData();
  if (!data) {
    alert('Please complete all required fields first.');
    return false;
  }
  return sendToWhatsApp('flight', data);
};

const handleCargoWhatsApp = (trackingId) => {
  const form = document.getElementById('cargoRequestForm');
  if (!validateCargoForm(form)) {
    alert('Please complete all required fields first.');
    return false;
  }
  const data = collectCargoFormData(trackingId);
  if (!data) {
    alert('Please complete all required fields first.');
    return false;
  }
  return sendToWhatsApp('cargo', data);
};

/** Called from form submit — opens WA in same user click (avoids popup block). */
const openFlightWhatsAppFromSubmit = () => window.handleFlightWhatsApp?.() ?? false;

const openCargoWhatsAppFromSubmit = () => window.handleCargoWhatsApp?.() ?? false;

const resetWhatsAppRefs = () => {
  pendingFlightRef = null;
  pendingCargoRef = null;
};

const initWhatsAppButtons = () => {
  document.getElementById('whatsappFlightBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleFlightWhatsApp();
  });

  document.getElementById('whatsappCargoBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleCargoWhatsApp();
  });

  document.getElementById('flightBookingForm')?.addEventListener('reset', resetWhatsAppRefs);
  document.getElementById('cargoRequestForm')?.addEventListener('reset', resetWhatsAppRefs);
};

window.validateCargoForm = validateCargoForm;
window.sendToWhatsApp = sendToWhatsApp;
window.collectFlightFormData = collectFlightFormData;
window.collectCargoFormData = collectCargoFormData;
window.handleFlightWhatsApp = handleFlightWhatsApp;
window.handleCargoWhatsApp = handleCargoWhatsApp;
window.openFlightWhatsAppFromSubmit = openFlightWhatsAppFromSubmit;
window.openCargoWhatsAppFromSubmit = openCargoWhatsAppFromSubmit;
window.resetWhatsAppRefs = resetWhatsAppRefs;
window.setCargoTrackingForWhatsApp = (id) => { pendingCargoRef = id; };

document.addEventListener('DOMContentLoaded', initWhatsAppButtons);
