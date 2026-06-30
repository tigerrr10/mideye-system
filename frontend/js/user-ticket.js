/**
 * Mideye – User E-Ticket (Completed bookings only)
 * Same Reservation e-ticket layout as admin booking receipt.
 */

const TICKET_WHATSAPP = '+252907816567';

const TICKET_EXTRAS = {
  default: { payment_method: 'EVC Plus' },
};

const CITY_NAMES = {
  GLK: 'Galkacyo', MGQ: 'Mogadishu', HGA: 'Hargeisa', KSM: 'Kismayo', BDI: 'Baidoa',
};

const fmtUSDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
};

const bookingRef = (b) =>
  `BK-${new Date(b.created_at || Date.now()).getFullYear()}-${String(b.id).padStart(5, '0')}`;

const calcBookingPrice = (b) => {
  const base = b.cabin_class === 'business' ? 195 : 85;
  const pax = (b.adults || 1) + (b.children || 0);
  return base * Math.max(pax, 1);
};

const paymentStatusFromBooking = (status) => {
  if (status === 'Completed') return { label: 'Paid', confirmed: true };
  if (status === 'Cancelled') return { label: 'Refunded', confirmed: false };
  return { label: 'Pending', confirmed: false };
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

const resolveBookingFlight = (b, flights) => {
  const list = flights || window.allFlights || [];
  if (!list.length) return null;
  if (b.flight_id) {
    const byFlightId = list.find((f) => f.flight_id === b.flight_id);
    if (byFlightId) return byFlightId;
  }
  const travelDate = b.travel_date ? String(b.travel_date).slice(0, 10) : null;
  let matches = list.filter((f) => f.origin === b.origin && f.destination === b.destination);
  if (travelDate) {
    const byDate = matches.filter((f) => String(f.schedule_date).slice(0, 10) === travelDate);
    if (byDate.length) matches = byDate;
  }
  if (!matches.length) return list[b.id % list.length];
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

const buildTicketHTML = (b, ticketRefVal, flights) => {
  const extra = TICKET_EXTRAS[b.id] || TICKET_EXTRAS.default;
  const pay = paymentStatusFromBooking(b.status);
  const ref = ticketRefVal || bookingRef(b);
  const flight = resolveBookingFlight(b, flights);
  const persistentFlightId = b.flight_id || flight?.flight_id || '—';
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
    <div class="receipt-doc eticket-doc" id="ticketPrintArea">
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

      <div class="et-qr"><canvas id="ticketQrCanvas"></canvas></div>
      <div class="et-slogan">Your satisfaction is our priority</div>
      <div class="et-title">Reservation e-ticket</div>

      <div class="et-meta">
        <span>Booking Reference : <strong>${ref}</strong></span>
        <span>Flight ID : <strong>${persistentFlightId}</strong></span>
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
        <div>Contacts: ${TICKET_WHATSAPP} | WhatsApp Support</div>
      </div>
    </div>`;
};

let activeTicketRef = '';

const getApiBase = () =>
  window.API || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api');

const fetchTicketData = async (bookingId) => {
  const token = localStorage.getItem('mideye_token');
  const res = await fetch(`${getApiBase()}/user/bookings/${bookingId}/ticket`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

const fetchFlightsForBooking = async (booking) => {
  try {
    const token = localStorage.getItem('mideye_token');
    const qs = new URLSearchParams({
      from: booking.origin,
      to: booking.destination,
      date: booking.travel_date || '',
    });
    const res = await fetch(`${getApiBase()}/flights?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.flights || [];
  } catch {
    return [];
  }
};

let activeBookingId = null;

const notifyTicketDownload = async (bookingId) => {
  const id = bookingId || activeBookingId;
  if (!id) return;
  try {
    const token = localStorage.getItem('mideye_token');
    await fetch(`${getApiBase()}/user/bookings/${id}/ticket/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* non-blocking */
  }
};

const renderTicketOnPage = (booking, ref, flights) => {
  const content = document.getElementById('ticketContent');
  const loading = document.getElementById('ticketLoading');
  const error = document.getElementById('ticketError');

  activeTicketRef = ref;
  if (loading) loading.hidden = true;
  if (error) error.hidden = true;
  if (content) {
    content.hidden = false;
    content.innerHTML = buildTicketHTML(booking, ref, flights);
    const canvas = document.getElementById('ticketQrCanvas');
    if (canvas) drawRealisticQR(canvas, ref);
  }

  document.getElementById('btnPrint')?.removeAttribute('hidden');
  document.getElementById('btnPdf')?.removeAttribute('hidden');
  document.title = `E-Ticket ${ref} | Mideye Travel`;
};

const showTicketError = (message) => {
  document.getElementById('ticketLoading')?.setAttribute('hidden', '');
  document.getElementById('ticketContent')?.setAttribute('hidden', '');
  document.getElementById('ticketIntro')?.setAttribute('hidden', '');
  const error = document.getElementById('ticketError');
  const msg = document.getElementById('ticketErrorMsg');
  if (msg) msg.textContent = message;
  if (error) error.hidden = false;
};

window.initTicketPage = async function () {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking');
  if (!bookingId) {
    showTicketError('No booking selected. Open a ticket from your dashboard.');
    return;
  }

  try {
    const data = await fetchTicketData(bookingId);
    if (!data.success) {
      showTicketError(data.message || 'Ticket not available yet.');
      return;
    }
    const booking = data.data.booking;
    const ref = data.data.ticket_ref || bookingRef(booking);
    const flights = await fetchFlightsForBooking(booking);
    activeBookingId = Number(bookingId);
    renderTicketOnPage(booking, ref, flights);
  } catch {
    showTicketError('Could not load ticket. Please try again from your dashboard.');
  }
};

window.openUserTicket = function (bookingId) {
  const local = (window.allBookings || []).find((b) => b.id === bookingId);
  if (local && local.status !== 'Completed') {
    window.showToast?.(
      'E-ticket is available only after admin marks your booking as Completed.',
      'fa-lock'
    );
    return;
  }
  window.location.href = `ticket.html?booking=${bookingId}`;
};

const getTicketPrintStyles = () => `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  .eticket-doc {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #111;
    border: none;
    padding: 12px 16px;
    max-width: 190mm;
    margin: 0 auto;
  }
  .et-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
  .et-logo__tail svg { width: 36px; height: 42px; }
  .et-logo__text { display: flex; flex-direction: column; line-height: 1.05; }
  .et-logo__primary { font-size: 22px; font-weight: 900; color: #1a4f8a; }
  .et-logo__secondary { font-size: 22px; font-weight: 900; color: #c41e3a; }
  .et-qr { display: flex; justify-content: center; margin: 6px 0; }
  .et-qr canvas { width: 130px !important; height: 130px !important; display: block; }
  .et-slogan { text-align: center; color: #3d8fd1; font-size: 11px; font-style: italic; margin-bottom: 2px; }
  .et-title { text-align: center; color: #3d8fd1; font-size: 20px; margin-bottom: 8px; }
  .et-meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
  .et-info-bar { display: flex; border: 1px solid #111; margin-bottom: 10px; }
  .et-info-col { flex: 1; border-right: 1px solid #111; min-width: 0; }
  .et-info-col:last-child { border-right: none; }
  .et-info-head { background: #111; color: #fff; font-size: 8px; font-weight: 700; padding: 4px 6px; text-transform: uppercase; }
  .et-info-body { padding: 5px 6px; font-size: 9px; line-height: 1.45; min-height: 42px; }
  .et-info-body--mono { font-family: 'Courier New', monospace; font-weight: 700; word-break: break-all; }
  .et-segment-label { font-size: 10px; margin: 8px 0 4px; }
  .et-flight-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
  .et-flight-table th, .et-flight-table td { border: 1px solid #111; padding: 4px 5px; vertical-align: top; }
  .et-flight-table th { background: #111; color: #fff; font-size: 7px; font-weight: 700; text-transform: uppercase; text-align: center; }
  .et-time { font-size: 8px; display: block; margin-top: 2px; }
  .et-center { text-align: center; vertical-align: middle; }
  .et-terms { font-size: 7px; line-height: 1.45; text-transform: uppercase; margin: 8px 0; }
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

window.printTicket = function () {
  notifyTicketDownload();

  if (document.body.classList.contains('ticket-page')) {
    window.print();
    return;
  }

  const el = document.getElementById('ticketPrintArea');
  if (!el) return;

  const ref = activeTicketRef || 'Mideye-Ticket';
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head><title>${ref}</title><style>${getTicketPrintStyles()}</style></head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.onafterprint = () => win.close(); }, 400);
};

window.downloadTicketPdf = async function () {
  const el = document.getElementById('ticketPrintArea');
  if (!el || typeof html2canvas === 'undefined' || !window.jspdf?.jsPDF) return;

  const pdfBtn = document.getElementById('btnPdf');
  const originalHtml = pdfBtn?.innerHTML;
  if (pdfBtn) {
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  }

  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const maxW = pageW - margin * 2;
    let imgW = maxW;
    let imgH = (canvas.height * imgW) / canvas.width;
    const maxH = pdf.internal.pageSize.getHeight() - margin * 2;
    if (imgH > maxH) { imgH = maxH; imgW = (canvas.width * imgH) / canvas.height; }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - imgW) / 2, margin, imgW, imgH);
    pdf.save(`${(activeTicketRef || 'mideye-ticket').replace(/[^\w.-]+/g, '_')}.pdf`);
    notifyTicketDownload();
  } catch {
    alert('Could not save PDF. Try Print instead.');
  } finally {
    if (pdfBtn) {
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = originalHtml;
    }
  }
};
