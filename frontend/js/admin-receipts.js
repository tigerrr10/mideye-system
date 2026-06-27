/**
 * Mideye Admin – Booking & Cargo Receipt Modals
 * Print (clean single-page window) + automatic PDF download.
 */

const RECEIPT_WHATSAPP = '+252907816567';

// ─── Demo enrichment per booking/cargo id ─────────────────────────────────────
const BOOKING_RECEIPT_EXTRAS = {
  default: {
    payment_method: 'EVC Plus',
    payment_status: 'Paid',
  },
};

const CARGO_RECEIPT_EXTRAS = {
  default: {
    description: 'General cargo shipment',
    payment_method: 'Hormuud Pay',
    payment_status: 'Paid',
  },
};

const CITY_NAMES = {
  GLK: 'Galkacyo', MGQ: 'Mogadishu', HGA: 'Hargeisa', KSM: 'Kismayo', BDI: 'Baidoa',
};

const fmtReceiptDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
  });
};

const fmtReceiptShortDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

const fmtGenerated = () =>
  new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const calcBookingPrice = (b) => {
  const base = b.cabin_class === 'business' ? 195 : 85;
  const pax = (b.adults || 1) + (b.children || 0);
  return base * Math.max(pax, 1);
};

const calcCargoPrice = (c) => {
  const w = parseFloat(c.weight) || 0;
  if (w <= 10) return w * 2.5 + 5;
  if (w <= 50) return w * 2.0 + 5;
  return w * 1.5 + 5;
};

const paymentStatusFromBooking = (status) => {
  if (status === 'Confirmed' || status === 'Completed') return { label: 'Paid', confirmed: true };
  if (status === 'Cancelled') return { label: 'Refunded', confirmed: false };
  return { label: 'Pending', confirmed: false };
};

const paymentStatusFromCargo = (status) => {
  if (['Arrived', 'Ready for Pickup', 'Delivered'].includes(status)) return { label: 'Paid', confirmed: true };
  if (status === 'Cancelled') return { label: 'Refunded', confirmed: false };
  return { label: 'Pending', confirmed: false };
};

// ─── Simple barcode SVG ────────────────────────────────────────────────────────
const generateBarcodeSVG = (code) => {
  const bars = code.split('').map((ch, i) => {
    const w = (ch.charCodeAt(0) % 3) + 1;
    const h = 30 + (ch.charCodeAt(0) % 15);
    return `<rect x="${i * 4}" y="${40 - h}" width="${w}" height="${h}" fill="#111"/>`;
  }).join('');
  const width = code.length * 4 + 10;
  return `<svg viewBox="0 0 ${width} 44" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
};

const fmtUSDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
};

const parseTime12h = (str) => {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { h, min };
};

const fmtTime12h = ({ h, min }) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:${String(min).padStart(2, '0')} ${ap}`;
};

const fmtTime24 = (time12) => {
  const t = parseTime12h(time12);
  if (!t) return '—';
  return `${String(t.h).padStart(2, '0')}:${String(t.min).padStart(2, '0')}:00`;
};

const addMinutes = ({ h, min }, mins) => {
  const total = ((h * 60 + min + mins) % 1440 + 1440) % 1440;
  return { h: Math.floor(total / 60), min: total % 60 };
};

const parseDurationMins = (dur) => {
  const m = String(dur || '').match(/(\d+)\s*h\s*(\d+)?\s*m?/i);
  if (!m) return 90;
  return parseInt(m[1], 10) * 60 + parseInt(m[2] || 0, 10);
};

const calcArrivalTime = (departure, duration) => {
  const dep = parseTime12h(departure);
  if (!dep) return '—';
  return fmtTime12h(addMinutes(dep, parseDurationMins(duration)));
};

const calcCheckInTime = (departure) => {
  const dep = parseTime12h(departure);
  if (!dep) return '—';
  return fmtTime12h(addMinutes(dep, -180));
};

const splitAirlineName = (name) => {
  const words = (name || 'Mideye Travel').trim().split(/\s+/);
  if (words.length < 2) return { line1: words[0].toUpperCase(), line2: 'AIRLINES' };
  const line2 = words.pop().toUpperCase();
  return { line1: words.join(' ').toUpperCase(), line2 };
};

const cabinClassCode = (cls) => {
  if (cls === 'business') return 'J.CLASS';
  if (cls === 'first') return 'F.CLASS';
  return 'Y.CLASS';
};

const resolveBookingFlight = (b) => {
  const flights = window.allFlights || [];
  if (!flights.length) return null;
  const travelDate = b.travel_date ? String(b.travel_date).slice(0, 10) : null;
  let matches = flights.filter((f) => f.origin === b.origin && f.destination === b.destination);
  if (travelDate) {
    const byDate = matches.filter((f) => String(f.schedule_date).slice(0, 10) === travelDate);
    if (byDate.length) matches = byDate;
  }
  if (!matches.length) return flights[b.id % flights.length];
  return matches[b.id % matches.length];
};

const calcBookingPricing = (b, flight) => {
  const total = calcBookingPrice(b);
  const pax = Math.max((b.adults || 1) + (b.children || 0), 1);
  if (flight) {
    const unit = b.cabin_class === 'business'
      ? (parseFloat(flight.price_business) || parseFloat(flight.price_economy) * 1.8)
      : parseFloat(flight.price_economy);
    const base = Math.round(unit * pax * 100) / 100;
    const tax = Math.round(base * 0.07 * 100) / 100;
    const surcharge = Math.round((total - base - tax) * 100) / 100;
    return {
      base,
      tax,
      surcharge: surcharge > 0 ? surcharge : Math.round(total * 0.0625 * 100) / 100,
      total,
    };
  }
  const base = Math.round(total * 0.875 * 100) / 100;
  const tax = Math.round(total * 0.0625 * 100) / 100;
  const surcharge = Math.round((total - base - tax) * 100) / 100;
  return { base, tax, surcharge, total };
};

const buildFlightSegmentRow = (b, flight, label) => {
  const originName = CITY_NAMES[b.origin] || b.origin;
  const destName = CITY_NAMES[b.destination] || b.destination;
  const departure = flight?.departure_time || '09:00 AM';
  const arrival = flight?.arrival_time || calcArrivalTime(departure, flight?.duration);
  const flightNo = flight?.flight_code || `${b.origin}${b.destination}`;
  const travelDate = fmtUSDate(b.travel_date);

  return `
    <div class="et-segment-label"><strong>${label}</strong></div>
    <table class="et-flight-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>From</th>
          <th>To</th>
          <th>Stop(s)</th>
          <th>All Times Local</th>
          <th>Flight-Number</th>
          <th>Cabin (Book Class)</th>
          <th>Check-In Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${travelDate}</td>
          <td>${originName}<br><span class="et-time">Departure ${fmtTime24(departure)}</span></td>
          <td>${destName}<br><span class="et-time">Arrive ${fmtTime24(arrival)}</span></td>
          <td class="et-center">0</td>
          <td class="et-center">Local</td>
          <td>${flightNo}</td>
          <td>${cabinClassCode(b.cabin_class)}</td>
          <td>${calcCheckInTime(departure)}</td>
        </tr>
      </tbody>
    </table>`;
};

// ─── QR codes ─────────────────────────────────────────────────────────────────
const drawQRPattern = (canvas, text) => {
  const ctx = canvas.getContext('2d');
  const size = 72;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);

  const seed = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cell = 6;
  const cells = size / cell;

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const hash = (r * 17 + c * 31 + seed) % 7;
      if (hash < 3 || (r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3)) {
        ctx.fillStyle = '#111';
        ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
      }
    }
  }
};

const drawRealisticQR = (canvas, text) => {
  const ctx = canvas.getContext('2d');
  const size = 148;
  const margin = 10;
  const mod = 5;
  const count = Math.floor((size - margin * 2) / mod);
  canvas.width = size;
  canvas.height = size;

  const grid = Array.from({ length: count }, () => Array(count).fill(false));
  const seed = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  const setMod = (r, c, val) => {
    if (r >= 0 && r < count && c >= 0 && c < count) grid[r][c] = val;
  };

  const paintFinder = (sr, sc) => {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const outer = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setMod(sr + dr, sc + dc, outer || inner);
      }
    }
    setMod(sr + 3, sc + 3, true);
  };

  paintFinder(0, 0);
  paintFinder(0, count - 7);
  paintFinder(count - 7, 0);

  for (let i = 8; i < count - 8; i++) {
    setMod(6, i, i % 2 === 0);
    setMod(i, 6, i % 2 === 0);
  }

  const reserved = (r, c) => {
    const inTL = r < 8 && c < 8;
    const inTR = r < 8 && c >= count - 8;
    const inBL = r >= count - 8 && c < 8;
    const timing = r === 6 || c === 6;
    return inTL || inTR || inBL || timing;
  };

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (reserved(r, c)) continue;
      const hash = (r * 37 + c * 19 + seed * 13 + text.length * 7) % 11;
      setMod(r, c, hash < 5 || (hash + r) % 3 === 0);
    }
  }

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (grid[r][c]) {
        ctx.fillRect(margin + c * mod, margin + r * mod, mod - 0.5, mod - 0.5);
      }
    }
  }
};

// ─── Build receipt HTML ────────────────────────────────────────────────────────
const buildBookingReceiptHTML = (b) => {
  const extra = BOOKING_RECEIPT_EXTRAS[b.id] || BOOKING_RECEIPT_EXTRAS.default;
  const pay = paymentStatusFromBooking(b.status);
  const ref = `BK-${new Date(b.created_at || Date.now()).getFullYear()}-${String(b.id).padStart(5, '0')}`;
  const flight = resolveBookingFlight(b);
  const airline = flight?.airline || 'Mideye Travel';
  const brand = splitAirlineName(airline);
  const pricing = calcBookingPricing(b, flight);
  const ticketNo = flight
    ? `${flight.flight_code}-${b.origin}-${String(b.id).padStart(6, '0')}`
    : `${ref.replace(/-/g, '')}`;
  const paxLabel = `${(b.adults || 1)} Adult(s)${b.children ? `, ${b.children} Child(ren)` : ''}${b.infants ? `, ${b.infants} Infant(s)` : ''}`;
  const segments = buildFlightSegmentRow(b, flight, 'Departing');
  const returnSegment = b.trip_type === 'roundtrip' && b.return_date
    ? buildFlightSegmentRow(
      { ...b, origin: b.destination, destination: b.origin, travel_date: b.return_date },
      flight ? { ...flight, origin: b.destination, destination: b.origin } : null,
      'Returning'
    )
    : '';

  return `
    <div class="receipt-doc eticket-doc" id="receiptPrintArea">
      <div class="et-logo">
        <div class="et-logo__tail" aria-hidden="true">
          <svg viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 48 L24 4 L40 48 Z" fill="#1a4f8a"/>
            <path d="M14 44 L24 18 L34 44 Z" fill="#c41e3a"/>
            <path d="M20 40 L24 28 L28 40 Z" fill="#fff"/>
          </svg>
        </div>
        <div class="et-logo__text">
          <span class="et-logo__primary">${brand.line1}</span>
          <span class="et-logo__secondary">${brand.line2}</span>
        </div>
      </div>

      <div class="et-qr"><canvas id="receiptQrCanvas"></canvas></div>
      <div class="et-slogan">Your satisfaction is our priority</div>
      <div class="et-title">Reservation e-ticket</div>

      <div class="et-meta">
        <span>Booking Reference : <strong>${ref}</strong></span>
        <span>Date of Issue : <strong>${fmtUSDate(b.created_at)}</strong></span>
      </div>

      <div class="et-info-bar">
        <div class="et-info-col">
          <div class="et-info-head">CONTACT INFORMATION</div>
          <div class="et-info-body">
            <div>Name : ${b.passenger_name || '—'}</div>
            <div>Call : ${b.phone || '—'}</div>
            ${b.email ? `<div>Email : ${b.email}</div>` : ''}
          </div>
        </div>
        <div class="et-info-col">
          <div class="et-info-head">PASSENGER INFORMATION</div>
          <div class="et-info-body">
            <div>MR ${(b.passenger_name || '—').toUpperCase()}</div>
            <div>${paxLabel}</div>
            ${b.seat_preference ? `<div>Seat : ${b.seat_preference}</div>` : ''}
          </div>
        </div>
        <div class="et-info-col">
          <div class="et-info-head">FLIGHT TICKET NUMBERS</div>
          <div class="et-info-body et-info-body--mono">${ticketNo}</div>
        </div>
      </div>

      ${segments}
      ${returnSegment}

      <div class="et-terms">
        <p>THE FARE IS NOT REFUNDABLE. DATE CHANGE PENALTY APPLIES. NAME CHANGE IS NOT ALLOWED. PASSENGER SHOULD REPORT TO CHECK-IN COUNTER 3 HOURS BEFORE DEPARTURE TIME. BOARDING GATE WILL BE CLOSED 30 MINUTES BEFORE DEPARTURE TIME. BAGGAGE ALLOWANCE ADULT 20KGS, CHILD 10KGS, INFANT 0KG. EXCESS BAGGAGE CHARGES APPLY.</p>
        <p>FADLAN KA DIGTOONOW INAAD KA HOR TAGTID GUDIHIISA DIYAARADDA 3 SAAC KA HOR INTA AANAY DUULIN DIYAARADDU. HANA IIBSAN DIYAARADDA DAHAB, DHEEMAN, LACAG IYO ELEKTROONIK KA DHIG MAYA BAAKADKAAGA.</p>
        ${b.special_requests ? `<p>Special Requests : ${b.special_requests}</p>` : ''}
        <p>Status : ${b.status} · Trip : ${(b.trip_type || 'oneway').replace('oneway', 'One Way').replace('roundtrip', 'Round Trip')} · Payment : ${pay.label}</p>
      </div>

      <div class="et-pay-bar">
        <div class="et-pay-head">PRICING</div>
        <div class="et-pay-head">PAYMENT</div>
      </div>
      <div class="et-pay-grid">
        <div class="et-pay-col">
          <div>Price ${pricing.base.toFixed(0)}</div>
          <div>Tax ${pricing.tax.toFixed(0)}</div>
          <div>Surcharge ${pricing.surcharge.toFixed(0)}</div>
          <div class="et-pay-total">Total Price USD ${pricing.total.toFixed(0)}</div>
        </div>
        <div class="et-pay-col">
          <div>Form of Payment : ${extra.payment_method}</div>
          <div class="et-pay-total">Payment Amount USD ${pricing.total.toFixed(0)}</div>
          <div>Payment Status : ${pay.label}</div>
        </div>
      </div>

      <div class="et-agent">
        <div><span>Agent Name</span> Galkacyo Station</div>
        <div><span>Agent ID</span> mideye-travel</div>
        <div><span>Agent Office</span> Galkacyo</div>
      </div>

      <div class="et-contacts">
        <div>Email: info@mideye.com</div>
        <div>Contacts: ${RECEIPT_WHATSAPP} | WhatsApp Support</div>
      </div>
    </div>`;
};

const buildCargoReceiptHTML = (c) => {
  const extra = CARGO_RECEIPT_EXTRAS[c.id] || CARGO_RECEIPT_EXTRAS.default;
  const pay = paymentStatusFromCargo(c.status);
  const originName = CITY_NAMES[c.origin] || c.origin || 'Galkacyo';
  const destName = CITY_NAMES[c.destination] || c.destination;
  const total = calcCargoPrice(c);
  const desc = c.description || extra.description;
  const ref = c.tracking_id;
  const pieces = c.pieces || 1;
  const freightCharges = pay.label === 'Paid' ? 'PREPAID' : pay.label === 'Refunded' ? 'REFUNDED' : 'COLLECT';
  const speed = (c.shipping_speed || 'standard').toUpperCase();

  const goodsLines = [
    (c.cargo_type || 'GENERAL CARGO').toUpperCase(),
    desc,
    `SHIPPING: ${speed}`,
    c.fragile ? 'FRAGILE — HANDLE WITH CARE' : null,
    c.insurance ? 'INSURED SHIPMENT' : null,
    c.signature_required ? 'SIGNATURE REQUIRED ON DELIVERY' : null,
    c.special_requests ? `SPECIAL: ${c.special_requests}` : null,
    `PAYMENT: ${extra.payment_method} — ${pay.label}`,
    `FREIGHT ${freightCharges}`,
    `STATUS: ${c.status}`,
  ].filter(Boolean);

  const measurement = (() => {
    const l = parseFloat(c.length_cm);
    const w = parseFloat(c.width_cm);
    if (l && w) return `${((l * w * 30) / 1000000).toFixed(3)} CBM`;
    return 'N/A';
  })();

  return `
    <div class="receipt-doc cargo-receipt-doc" id="receiptPrintArea">
      <div class="cr-watermark" aria-hidden="true">
        <i class="fas fa-plane"></i>
      </div>

      <div class="cr-title-box">CARGO RECEIPT</div>

      <div class="cr-row cr-row--3">
        <div class="cr-cell">
          <div class="cr-label">BENEFICIARY</div>
          <div class="cr-text">${c.recipient_name || '—'}</div>
          <div class="cr-text">${c.recipient_phone || '—'}</div>
        </div>
        <div class="cr-cell cr-cell--scan">
          <div class="cr-label">RECEIPT SECURITY SCAN</div>
          <div class="cr-scan-hint">Kindly scan QR Code to verify its authenticity</div>
          <div class="cr-qr-block">
            <span class="cr-qr-label">SCAN ME</span>
            <div class="cr-qr"><canvas id="receiptQrCanvas"></canvas></div>
          </div>
        </div>
        <div class="cr-cell">
          <div class="cr-label">RECEIPT NO :</div>
          <div class="cr-text cr-text--bold">${ref}</div>
        </div>
      </div>

      <div class="cr-row cr-row--2">
        <div class="cr-col">
          <div class="cr-cell cr-cell--stacked">
            <div class="cr-label">CONSIGNED TO</div>
            <div class="cr-text">MIDEYE TRAVEL AGENCY</div>
            <div class="cr-text">${originName.toUpperCase()} CARGO CENTRE</div>
          </div>
          <div class="cr-cell cr-cell--stacked">
            <div class="cr-label">NOTIFY ADDRESS</div>
            <div class="cr-text">SAME AS BENEFICIARY</div>
          </div>
        </div>
        <div class="cr-col cr-col--brand">
          ${pay.confirmed ? `
          <div class="cr-paid-stamp">
            <div class="cr-paid-stamp__ring">
              <span class="cr-paid-stamp__top">MIDEYE TRAVEL</span>
              <span class="cr-paid-stamp__center">PAID</span>
              <span class="cr-paid-stamp__bottom">CARGO DEPARTMENT</span>
            </div>
          </div>` : `
          <div class="cr-status-stamp">${c.status}</div>`}
          <div class="cr-brand">
            <div class="cr-brand__logo"><i class="fas fa-plane"></i> Mid<span>eye</span></div>
            <div class="cr-brand__addr">MIDEYE TRAVEL AGENCY</div>
            <div class="cr-brand__addr">Galkacyo, Somalia</div>
            <div class="cr-brand__addr">WhatsApp: ${RECEIPT_WHATSAPP}</div>
          </div>
        </div>
      </div>

      <div class="cr-ship-grid">
        <div class="cr-ship-cell">
          <div class="cr-label">VOYAGE NO</div>
          <div class="cr-text">${ref}</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">PLACE OF RECEIPT*</div>
          <div class="cr-text">${originName.toUpperCase()}</div>
        </div>
        <div class="cr-ship-cell cr-ship-cell--wide">
          <div class="cr-label">AGENT AT DESTINATION</div>
          <div class="cr-text">MIDEYE TRAVEL AGENCY, ${destName.toUpperCase()}, SOMALIA</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">SHIPPING VESSEL</div>
          <div class="cr-text">CARGO FLIGHT</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">AIRPORT OF LOADING</div>
          <div class="cr-text">${originName.toUpperCase()}</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">AIRPORT OF DISCHARGE</div>
          <div class="cr-text">${destName.toUpperCase()}</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">PLACE OF DELIVERY*</div>
          <div class="cr-text">${destName.toUpperCase()}</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">FREIGHT CHARGES</div>
          <div class="cr-text">${freightCharges}</div>
        </div>
        <div class="cr-ship-cell">
          <div class="cr-label">NO OF ORIGINAL FCR</div>
          <div class="cr-text">${pieces}</div>
        </div>
      </div>

      <table class="cr-goods-table">
        <thead>
          <tr>
            <th>MARKS AND NOS.</th>
            <th>DESCRIPTION OF GOODS</th>
            <th>GROSS WEIGHT (KG)</th>
            <th>MEASUREMENT (CBM)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="cr-text">${ref} — ${pieces} PIECE(S)</div>
              <div class="cr-text cr-text--muted">Seal : ${ref}</div>
            </td>
            <td>
              ${goodsLines.map((line) => `<div class="cr-text">${line}</div>`).join('')}
            </td>
            <td class="cr-text cr-text--center">${parseFloat(c.weight).toFixed(2)}KG</td>
            <td class="cr-text cr-text--center">${measurement}</td>
          </tr>
        </tbody>
      </table>

      <div class="cr-row cr-row--sender">
        <div class="cr-cell cr-cell--sender">
          <div class="cr-label">SENDER</div>
          <div class="cr-text">${c.sender_name || '—'}</div>
          <div class="cr-text">${c.sender_phone || '—'}</div>
          <div class="cr-text">${c.sender_address || originName.toUpperCase()}</div>
          ${c.sender_email ? `<div class="cr-text">${c.sender_email}</div>` : ''}
        </div>
        <div class="cr-cell cr-cell--illus">
          <div class="cr-illus">
            <i class="fas fa-plane cr-illus__plane"></i>
            <i class="fas fa-globe-africa cr-illus__globe"></i>
            <i class="fas fa-truck cr-illus__truck"></i>
            <i class="fas fa-shipping-fast cr-illus__van"></i>
          </div>
          <div class="cr-illus-caption">Shipper Load stow and Count</div>
        </div>
      </div>

      <div class="cr-declared">ABOVE PARTICULARS AS DECLARED BY SHIPPER</div>

      <div class="cr-footer-grid">
        <table class="cr-charges-table">
          <thead>
            <tr>
              <th>CHARGES</th>
              <th>PREPAID</th>
              <th>COLLECT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CARGO FREIGHT (${extra.payment_method})</td>
              <td>${freightCharges === 'PREPAID' ? `$${total.toFixed(2)}` : ''}</td>
              <td>${freightCharges === 'COLLECT' ? `$${total.toFixed(2)}` : ''}</td>
            </tr>
            <tr class="cr-charges-total">
              <td>GRAND TOTAL</td>
              <td>${freightCharges === 'PREPAID' ? `$${total.toFixed(2)}` : ''}</td>
              <td>${freightCharges === 'COLLECT' ? `$${total.toFixed(2)}` : ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="cr-legal">
          <p>RECEIVED by the Carrier from the Shipper in apparent good order and condition unless otherwise stated herein, the Goods as specified above for carriage subject to all the terms and conditions of the contract on the reverse side hereof or as otherwise agreed.</p>
          <div class="cr-issue">
            <div><strong>PLACE AND DATE OF ISSUE:</strong></div>
            <div>${originName.toUpperCase()} : ${fmtReceiptShortDate(c.created_at)}</div>
            <div class="cr-issue-agent"><strong>AS AGENTS FOR THE CARRIER:</strong></div>
            <div>MIDEYE TRAVEL AGENCY LTD</div>
          </div>
        </div>
      </div>

      <div class="cr-footnote">*APPLICABLE ONLY WHEN USED AS A COMBINED TRANSPORT FORM</div>
      <div class="cr-barcode-row">${generateBarcodeSVG(ref)}</div>
    </div>`;
};

// ─── Modal controls ────────────────────────────────────────────────────────────
let activeReceiptRef = '';

const openReceiptModal = (html, ref, title, type = 'booking') => {
  const modal = document.getElementById('receiptModal');
  const body  = document.getElementById('receiptModalBody');
  const titleEl = document.getElementById('receiptModalTitle');
  const wrap = modal?.querySelector('.receipt-modal-wrap');
  if (!modal || !body) return;

  activeReceiptRef = ref;
  if (titleEl) titleEl.textContent = title;
  body.innerHTML = html;
  wrap?.classList.toggle('receipt-modal-wrap--cargo', type === 'cargo');
  wrap?.classList.toggle('receipt-modal-wrap--flight', type === 'flight');

  const canvas = document.getElementById('receiptQrCanvas');
  if (canvas) {
    if (type === 'flight') drawRealisticQR(canvas, ref);
    else drawQRPattern(canvas, ref);
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.openBookingReceipt = function (bookingId) {
  const booking = (window.allBookings || []).find((b) => b.id === bookingId);
  if (!booking) {
    window.showToast?.('Booking not found', 'fa-times-circle');
    return;
  }
  const ref = `BK-${new Date(booking.created_at || Date.now()).getFullYear()}-${String(booking.id).padStart(5, '0')}`;
  openReceiptModal(buildBookingReceiptHTML(booking), ref, 'Reservation E-Ticket', 'flight');
};

window.openCargoReceipt = function (cargoId) {
  const cargo = (window.allCargo || []).find((c) => c.id === cargoId);
  if (!cargo) {
    window.showToast?.('Cargo shipment not found', 'fa-times-circle');
    return;
  }
  openReceiptModal(buildCargoReceiptHTML(cargo), cargo.tracking_id, 'Cargo Receipt', 'cargo');
};

window.closeReceiptModal = function () {
  document.getElementById('receiptModal')?.classList.remove('open');
  document.querySelector('#receiptModal .receipt-modal-wrap')?.classList.remove('receipt-modal-wrap--cargo');
  document.querySelector('#receiptModal .receipt-modal-wrap')?.classList.remove('receipt-modal-wrap--flight');
  document.body.style.overflow = '';
  activeReceiptRef = '';
};

const getReceiptPrintStyles = () => `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'DM Sans', Arial, sans-serif;
    background: #fff;
    color: #441306;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-doc {
    max-width: 180mm;
    margin: 0 auto;
    background: #fff;
    border: 2px solid #441306;
    border-radius: 8px;
    padding: 14px 16px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }
  .receipt-doc::before {
    content: '';
    display: block;
    height: 4px;
    margin: -14px -16px 12px;
    background: linear-gradient(90deg, #441306, #c9a227, #441306);
    border-radius: 6px 6px 0 0;
  }
  .receipt-doc__header {
    text-align: center;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 2px dashed rgba(68, 19, 6, 0.15);
  }
  .receipt-doc__logo {
    width: 44px; height: 44px; margin: 0 auto 8px;
    background: linear-gradient(135deg, #441306, #6b1e0d);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    color: #fee685; font-size: 18px;
  }
  .receipt-doc__brand { font-family: Georgia, serif; font-size: 22px; font-weight: 800; color: #441306; }
  .receipt-doc__brand span { color: #6b1e0d; }
  .receipt-doc__tagline { font-size: 10px; color: rgba(68,19,6,0.5); margin-top: 2px; letter-spacing: 0.06em; text-transform: uppercase; }
  .receipt-doc__type-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .receipt-doc__type { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
  .receipt-doc__confirmed { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: rgba(25,135,84,0.12); color: #0d6640; }
  .receipt-doc__confirmed.pending { background: rgba(255,193,7,0.15); color: #a07200; }
  .receipt-ref { text-align: center; margin-bottom: 10px; }
  .receipt-ref__label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(68,19,6,0.45); }
  .receipt-ref__value { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; margin-top: 2px; }
  .receipt-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin-bottom: 10px; font-size: 12px; }
  .receipt-field--full { grid-column: 1 / -1; }
  .receipt-field__label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(68,19,6,0.45); margin-bottom: 1px; }
  .receipt-field__value { font-weight: 600; line-height: 1.35; word-break: break-word; }
  .receipt-total { display: flex; justify-content: space-between; align-items: center; background: rgba(254,230,133,0.35); border: 1px solid rgba(68,19,6,0.12); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .receipt-total__label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
  .receipt-total__value { font-size: 20px; font-weight: 800; color: #441306; }
  .receipt-code-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .receipt-barcode svg { max-width: 100%; height: 36px; }
  .receipt-qr canvas, .receipt-qr img { width: 56px !important; height: 56px !important; }
  .receipt-doc__footer { text-align: center; font-size: 10px; color: rgba(68,19,6,0.55); border-top: 1px dashed rgba(68,19,6,0.12); padding-top: 8px; line-height: 1.5; }
  .receipt-doc__footer a { color: #441306; text-decoration: none; }
  .receipt-generated { font-size: 9px; color: rgba(68,19,6,0.4); margin-top: 4px; }

  /* ── Cargo Receipt (formal grid layout) ── */
  .cargo-receipt-doc {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #111;
    border: 1px solid #111 !important;
    border-radius: 0 !important;
    padding: 10px !important;
    position: relative;
    max-width: 190mm;
  }
  .cargo-receipt-doc::before { display: none; }
  .cr-watermark {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 120px; color: rgba(68,19,6,0.04);
    pointer-events: none; z-index: 0;
  }
  .cargo-receipt-doc > *:not(.cr-watermark) { position: relative; z-index: 1; }
  .cr-title-box {
    text-align: center; font-weight: 700; font-size: 17px;
    letter-spacing: 0.12em; padding: 6px;
    border: 1px solid #111; margin-bottom: -1px;
  }
  .cr-row { display: flex; border: 1px solid #111; margin-top: -1px; }
  .cr-row--3 .cr-cell { flex: 1; }
  .cr-row--2 .cr-col { flex: 1; }
  .cr-row--2 .cr-col--brand {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 6px; gap: 4px;
    border-left: 1px solid #111;
  }
  .cr-col { display: flex; flex-direction: column; }
  .cr-cell {
    padding: 6px 8px; border-right: 1px solid #111;
    min-height: 56px;
  }
  .cr-cell:last-child { border-right: none; }
  .cr-cell--stacked { border-bottom: 1px solid #111; flex: 1; }
  .cr-cell--stacked:last-child { border-bottom: none; }
  .cr-cell--scan { text-align: center; }
  .cr-cell--sender { flex: 1; min-height: 84px; }
  .cr-cell--illus {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    border-left: 1px solid #111; padding: 6px;
  }
  .cr-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; margin-bottom: 3px;
  }
  .cr-text { font-size: 12px; line-height: 1.45; }
  .cr-text--bold { font-weight: 700; font-size: 13px; }
  .cr-text--muted { color: #555; font-size: 10px; }
  .cr-text--center { text-align: center; }
  .cr-scan-hint { font-size: 10px; margin-bottom: 4px; }
  .cr-qr-block { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
  .cr-qr-label { font-size: 10px; font-weight: 700; border: 1px solid #111; padding: 2px 6px; }
  .cr-qr canvas { width: 64px !important; height: 64px !important; display: block; }
  .cr-paid-stamp { margin-bottom: 2px; }
  .cr-paid-stamp__ring {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid #1a3a6b; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    transform: rotate(-12deg);
  }
  .cr-paid-stamp__top, .cr-paid-stamp__bottom {
    font-size: 8px; font-weight: 700; color: #1a3a6b; line-height: 1.1;
  }
  .cr-paid-stamp__center {
    font-size: 20px; font-weight: 900; color: #c00; line-height: 1;
    margin: 2px 0;
  }
  .cr-status-stamp {
    font-size: 11px; font-weight: 700; padding: 5px 10px;
    border: 2px solid #a07200; color: #a07200; text-transform: uppercase;
  }
  .cr-brand { text-align: center; }
  .cr-brand__logo {
    font-size: 18px; font-weight: 800; color: #441306; margin-bottom: 3px;
  }
  .cr-brand__logo span { color: #6b1e0d; }
  .cr-brand__addr { font-size: 10px; line-height: 1.35; }
  .cr-ship-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid #111; margin-top: -1px;
  }
  .cr-ship-cell {
    padding: 5px 7px; border-right: 1px solid #111;
    border-bottom: 1px solid #111; min-height: 40px;
  }
  .cr-ship-cell--wide { grid-column: span 2; }
  .cr-ship-cell:nth-child(4n) { border-right: none; }
  .cr-goods-table {
    width: 100%; border-collapse: collapse;
    border: 1px solid #111; margin-top: -1px;
  }
  .cr-goods-table th, .cr-goods-table td {
    border: 1px solid #111; padding: 6px 8px;
    vertical-align: top; font-size: 11px; font-weight: 400;
  }
  .cr-goods-table th {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    text-align: center; background: #f9f9f9;
  }
  .cr-goods-table th:nth-child(1) { width: 22%; }
  .cr-goods-table th:nth-child(2) { width: 46%; }
  .cr-goods-table th:nth-child(3), .cr-goods-table th:nth-child(4) { width: 16%; }
  .cr-row--sender { margin-top: -1px; }
  .cr-illus {
    display: flex; align-items: flex-end; justify-content: center;
    gap: 8px; font-size: 22px; color: #333; padding: 4px 0;
  }
  .cr-illus__plane { font-size: 28px; color: #1a3a6b; }
  .cr-illus__globe { font-size: 20px; color: #2a6b3a; }
  .cr-illus-caption { font-size: 10px; font-style: italic; margin-top: 3px; }
  .cr-declared {
    text-align: center; font-size: 10px; font-weight: 700;
    padding: 5px; border: 1px solid #111; margin-top: -1px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .cr-footer-grid {
    display: flex; border: 1px solid #111; margin-top: -1px;
  }
  .cr-charges-table {
    width: 42%; border-collapse: collapse; flex-shrink: 0;
    border-right: 1px solid #111;
  }
  .cr-charges-table th, .cr-charges-table td {
    border: 1px solid #111; padding: 5px 7px; font-size: 11px;
  }
  .cr-charges-table th {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    text-align: center; background: #f9f9f9;
  }
  .cr-charges-total td { font-weight: 700; }
  .cr-legal {
    flex: 1; padding: 6px 8px; font-size: 9px; line-height: 1.45;
  }
  .cr-legal p { margin: 0 0 5px; }
  .cr-issue { font-size: 10px; margin-top: 5px; }
  .cr-issue-agent { margin-top: 5px; }
  .cr-footnote {
    font-size: 9px; padding: 4px 6px;
    border: 1px solid #111; margin-top: -1px;
  }
  .cr-barcode-row {
    text-align: center; padding: 4px 0 0;
  }
  .cr-barcode-row svg { height: 32px; max-width: 200px; }

  /* ── Flight E-Ticket ── */
  .eticket-doc {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #111;
    border: none !important;
    border-radius: 0 !important;
    padding: 12px 16px !important;
    max-width: 190mm;
  }
  .eticket-doc::before { display: none; }
  .et-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
  .et-logo__tail svg { width: 36px; height: 42px; }
  .et-logo__text { display: flex; flex-direction: column; line-height: 1.05; }
  .et-logo__primary { font-size: 22px; font-weight: 900; color: #1a4f8a; letter-spacing: 0.02em; }
  .et-logo__secondary { font-size: 22px; font-weight: 900; color: #c41e3a; letter-spacing: 0.02em; }
  .et-qr { display: flex; justify-content: center; margin: 6px 0; }
  .et-qr canvas { width: 130px !important; height: 130px !important; display: block; }
  .et-slogan { text-align: center; color: #3d8fd1; font-size: 11px; font-style: italic; margin-bottom: 2px; }
  .et-title { text-align: center; color: #3d8fd1; font-size: 20px; font-weight: 400; margin-bottom: 8px; }
  .et-meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; padding: 0 2px; }
  .et-info-bar { display: flex; border: 1px solid #111; margin-bottom: 10px; }
  .et-info-col { flex: 1; border-right: 1px solid #111; }
  .et-info-col:last-child { border-right: none; }
  .et-info-head { background: #111; color: #fff; font-size: 8px; font-weight: 700; padding: 4px 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .et-info-body { padding: 5px 6px; font-size: 9px; line-height: 1.45; min-height: 42px; }
  .et-info-body--mono { font-family: 'Courier New', monospace; font-weight: 700; font-size: 9px; word-break: break-all; }
  .et-segment-label { font-size: 10px; margin: 8px 0 4px; }
  .et-flight-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
  .et-flight-table th, .et-flight-table td { border: 1px solid #111; padding: 4px 5px; vertical-align: top; }
  .et-flight-table th { background: #111; color: #fff; font-size: 7px; font-weight: 700; text-transform: uppercase; text-align: center; }
  .et-time { font-size: 8px; display: block; margin-top: 2px; }
  .et-center { text-align: center; vertical-align: middle; }
  .et-terms { font-size: 7px; line-height: 1.45; text-transform: uppercase; margin: 8px 0; color: #222; }
  .et-terms p { margin: 0 0 4px; }
  .et-pay-bar { display: flex; border: 1px solid #111; }
  .et-pay-head { flex: 1; background: #111; color: #fff; font-size: 8px; font-weight: 700; padding: 4px 6px; text-transform: uppercase; text-align: center; border-right: 1px solid #111; }
  .et-pay-head:last-child { border-right: none; }
  .et-pay-grid { display: flex; border: 1px solid #111; border-top: none; margin-bottom: 10px; }
  .et-pay-col { flex: 1; padding: 5px 8px; font-size: 9px; line-height: 1.5; border-right: 1px solid #111; }
  .et-pay-col:last-child { border-right: none; }
  .et-pay-total { font-weight: 800; margin-top: 2px; }
  .et-agent { display: flex; gap: 24px; font-size: 9px; margin-bottom: 8px; flex-wrap: wrap; }
  .et-agent span { font-weight: 700; margin-right: 4px; }
  .et-contacts { text-align: center; font-size: 9px; border-top: 1px solid #ccc; padding-top: 6px; line-height: 1.5; }
`;

const openReceiptPrintWindow = () => {
  const el = document.getElementById('receiptPrintArea');
  if (!el) return false;

  const ref = activeReceiptRef || 'Mideye Receipt';
  const printWin = window.open('', '_blank', 'width=820,height=900');
  if (!printWin) return false;

  printWin.document.open();
  printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${ref.replace(/</g, '')}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet" />
  <style>${getReceiptPrintStyles()}</style>
</head>
<body>${el.outerHTML}</body>
</html>`);
  printWin.document.close();

  setTimeout(() => {
    printWin.focus();
    printWin.print();
    printWin.onafterprint = () => printWin.close();
  }, 400);

  return true;
};

const buildReceiptPdfFilename = () => {
  const safe = (activeReceiptRef || 'mideye-receipt')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_');
  return `${safe}.pdf`;
};

window.printReceipt = function () {
  if (!openReceiptPrintWindow()) {
    window.showToast?.('Allow pop-ups to print the receipt', 'fa-print');
  }
};

window.downloadReceiptPdf = async function () {
  const el = document.getElementById('receiptPrintArea');
  if (!el) return;

  if (typeof html2canvas === 'undefined' || !window.jspdf?.jsPDF) {
    window.showToast?.('PDF library loading… use Print if this persists', 'fa-file-pdf');
    openReceiptPrintWindow();
    return;
  }

  const pdfBtn = document.querySelector('.receipt-tool-btn--pdf');
  const originalHtml = pdfBtn?.innerHTML;
  if (pdfBtn) {
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  }

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    let imgW = maxW;
    let imgH = (canvas.height * imgW) / canvas.width;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = (canvas.width * imgH) / canvas.height;
    }

    const x = (pageW - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, margin, imgW, imgH);
    pdf.save(buildReceiptPdfFilename());
    window.showToast?.('PDF downloaded', 'fa-file-pdf');
  } catch (err) {
    console.error('PDF export failed:', err);
    window.showToast?.('Could not save PDF. Try Print instead.', 'fa-times-circle');
  } finally {
    if (pdfBtn) {
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = originalHtml;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('receiptModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeReceiptModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      closeReceiptModal();
    }
  });
});
