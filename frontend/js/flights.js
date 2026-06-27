/**
 * Mideye – Dashboard Flight Booking (demo)
 * Sidebar search + summary chips + grid flights + passenger form
 */

const CITY_NAMES = {
  MGQ: 'Mogadishu',
  HGA: 'Hargeisa',
  GLK: 'Galkacyo',
  KSM: 'Kismayo',
  BDI: 'Baidoa',
};

const getCityName = (code) => window.CitiesLoader?.getName(code) || CITY_NAMES[code] || code;

const CLASS_LABELS = {
  economy: 'Economy',
  business: 'Business',
  first: 'First Class',
};

const AIRLINES = [
  'Daallo Airlines',
  'Daruuro Airline',
  'Saacid Airline',
  'Freedom Airline Express',
  'Jubbia Airways',
  'Fly Premier Airlines',
  'Salaam Air Express',
];

const DEPARTURE_TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM'];

/** Known domestic routes – fallback pricing for any city pair */
const ROUTE_META = {
  'MGQ-HGA': { duration: '2h 30m', basePrice: 90 },
  'MGQ-GLK': { duration: '1h 30m', basePrice: 85 },
  'MGQ-KSM': { duration: '1h 45m', basePrice: 95 },
  'MGQ-BDI': { duration: '2h 00m', basePrice: 88 },
  'HGA-GLK': { duration: '2h 15m', basePrice: 92 },
  'HGA-KSM': { duration: '3h 00m', basePrice: 110 },
  'HGA-BDI': { duration: '2h 45m', basePrice: 105 },
  'GLK-KSM': { duration: '2h 30m', basePrice: 98 },
  'GLK-BDI': { duration: '2h 00m', basePrice: 90 },
  'KSM-BDI': { duration: '1h 30m', basePrice: 82 },
};

const CITY_WEIGHT = { MGQ: 0, GLK: 1, BDI: 2, HGA: 3, KSM: 4 };

const getRouteMeta = (from, to) => {
  const direct = ROUTE_META[`${from}-${to}`] || ROUTE_META[`${to}-${from}`];
  if (direct) return direct;

  const diff = Math.abs((CITY_WEIGHT[from] ?? 2) - (CITY_WEIGHT[to] ?? 2)) || 1;
  const hours = Math.min(diff + 1, 4);
  const mins = diff % 2 === 0 ? '00' : '30';
  return {
    duration: `${hours}h ${mins}m`,
    basePrice: 70 + diff * 18,
  };
};

const buildFlightsForRoute = (from, to) => {
  if (!from || !to || from === to) return [];

  const meta = getRouteMeta(from, to);
  return AIRLINES.map((airline, i) => ({
    id: `${from}-${to}-FL-${i + 1}`,
    airline,
    from,
    to,
    departureTime: DEPARTURE_TIMES[i],
    duration: meta.duration,
    price: meta.basePrice + (i % 3) * 5,
  }));
};

const CLASS_MULTIPLIER = { economy: 1, business: 1.8, first: 2.5 };

const mapApiFlight = (f) => ({
  id: String(f.id),
  airline: f.airline,
  from: f.origin,
  to: f.destination,
  departureTime: f.departure_time,
  duration: f.duration,
  price: parseFloat(f.price_economy),
  priceBusiness: f.price_business != null ? parseFloat(f.price_business) : null,
  priceFirst: f.price_first != null ? parseFloat(f.price_first) : null,
  totalSeats: f.total_seats,
  availableSeats: f.available_seats,
  scheduleDate: f.schedule_date,
});

const fetchFlightsFromAPI = async (params) => {
  try {
    const token = localStorage.getItem('mideye_token');
    if (!token) return null;
    const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      date: params.depart || '',
    });
    const res = await fetch(`${base}/flights?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success) return [];
    return (json.data?.flights || []).map(mapApiFlight);
  } catch {
    return [];
  }
};

let els = {};
let selectedFlight = null;
let searchParams = {};
let currentFlights = [];

const formatPrice = (amount) => `$${amount.toFixed(2)}`;

const getTotalPrice = (flight, counts, flightClass) => {
  if (!flight) return 0;
  const adults = typeof counts === 'number' ? counts : (counts?.adults || 1);
  const children = typeof counts === 'number' ? 0 : (counts?.children || 0);
  const infants = typeof counts === 'number' ? 0 : (counts?.infants || 0);

  const unit = (() => {
    if (flightClass === 'business' && flight.priceBusiness != null) return flight.priceBusiness;
    if (flightClass === 'first' && flight.priceFirst != null) return flight.priceFirst;
    if (flightClass === 'business') return flight.price * CLASS_MULTIPLIER.business;
    if (flightClass === 'first') return flight.price * CLASS_MULTIPLIER.first;
    return flight.price;
  })();

  return adults * unit + children * unit * 0.5 + infants * unit * 0.1;
};

const getPassengerCounts = () => ({
  adults: parseInt(els.adults?.value, 10) || 1,
  children: parseInt(els.children?.value, 10) || 0,
  infants: parseInt(els.infants?.value, 10) || 0,
});

const getTotalPassengers = (counts) => (counts.adults || 0) + (counts.children || 0) + (counts.infants || 0);

const getTripType = () => document.getElementById('searchTripType')?.value || 'oneway';

const getSearchParams = () => {
  const tripType = getTripType();
  const counts = getPassengerCounts();
  return {
    from:       els.from?.value || '',
    to:         els.to?.value || '',
    depart:     els.depart?.value || '',
    tripType,
    returnDate: tripType === 'roundtrip' ? (els.returnDate?.value || '').trim() : '',
    adults:     counts.adults,
    children:   counts.children,
    infants:    counts.infants,
    passengers: getTotalPassengers(counts),
    class:      els.class?.value || 'economy',
  };
};

const syncTripTypeUI = () => {
  const tripType = getTripType();
  const isRound = tripType === 'roundtrip';
  const hint = document.getElementById('returnDateHint');
  const returnField = document.getElementById('returnDateField');

  if (els.returnDate) {
    if (isRound) {
      els.returnDate.disabled = false;
      els.returnDate.removeAttribute('aria-hidden');
      els.returnDate.removeAttribute('tabindex');
      returnField?.classList.add('is-active');
      if (els.depart?.value) els.returnDate.min = els.depart.value;
      if (hint) {
        hint.textContent = 'Add a return date for your round-trip journey.';
        hint.hidden = false;
      }
    } else {
      els.returnDate.value = '';
      els.returnDate.disabled = true;
      els.returnDate.setAttribute('aria-hidden', 'true');
      els.returnDate.setAttribute('tabindex', '-1');
      els.returnDate.classList.remove('is-invalid');
      returnField?.classList.remove('is-active');
      if (hint) {
        hint.textContent = 'Select Round Trip to add a return date.';
        hint.hidden = false;
      }
    }
  }
};

const syncReturnDateConstraints = () => {
  syncTripTypeUI();
};

const formatSeatsLabel = (flight) => {
  const total = flight.totalSeats ?? '—';
  const available = flight.availableSeats ?? '—';
  if (total === '—' && available === '—') return '';
  return `${total}/${available} seats available`;
};

const buildFlightCard = (flight, index) => {
  const unitPrice = getTotalPrice(flight, 1, searchParams.class);
  const seatsLabel = formatSeatsLabel(flight);
  const seatsClass = Number(flight.availableSeats) === 0
    ? ' flight-card__seats--full'
    : Number(flight.availableSeats) <= 10
      ? ' flight-card__seats--low'
      : '';
  return `
    <article class="flight-card" data-flight-id="${flight.id}" style="animation-delay:${index * 0.05}s">
      <div class="flight-card__top">
        <span class="flight-card__airline">${flight.airline}</span>
        <i class="fas fa-plane flight-card__plane"></i>
      </div>
      <div class="flight-card__detail">
        <i class="fas fa-clock"></i>
        <span>${flight.departureTime}</span>
      </div>
      <div class="flight-card__detail">
        <i class="fas fa-hourglass-half"></i>
        <span>Duration: ${flight.duration}</span>
      </div>
      ${seatsLabel ? `
      <div class="flight-card__detail flight-card__seats${seatsClass}">
        <i class="fas fa-chair"></i>
        <span>${seatsLabel}</span>
      </div>` : ''}
      <div class="flight-card__price">${formatPrice(unitPrice)}</div>
      <button type="button" class="btn-select-flight" data-select-flight="${flight.id}">Select Flight</button>
    </article>`;
};

const updateSummary = (params, estimatedFlight = null) => {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const routeLabel = params.from && params.to
    ? `${getCityName(params.from)} → ${getCityName(params.to)}`
    : 'Select route';
  set('summaryRoute', routeLabel);
  const parts = [];
  if (params.adults) parts.push(`${params.adults} Adult${params.adults > 1 ? 's' : ''}`);
  if (params.children) parts.push(`${params.children} Child${params.children > 1 ? 'ren' : ''}`);
  if (params.infants) parts.push(`${params.infants} Infant${params.infants > 1 ? 's' : ''}`);
  set('summaryPassengers', parts.join(', ') || '1 Adult');
  set('summaryClass', CLASS_LABELS[params.class] || params.class);
  set('summaryEstimated', `${params.passengers} pax`);
};

const showLoader = () => {
  els.loader?.classList.add('is-visible');
  els.empty?.classList.remove('is-visible');
};

const hideLoader = () => els.loader?.classList.remove('is-visible');

const renderFlights = (params, withDelay = true) => {
  showLoader();
  if (els.list) els.list.innerHTML = '';
  searchParams = params;
  updateSummary(params);

  const doRender = async () => {
    hideLoader();
    const matched = await fetchFlightsFromAPI(params);
    currentFlights = matched;

    if (els.count) {
      els.count.textContent = matched.length ? `${matched.length} flights` : '';
    }

    if (!matched.length) {
      els.empty?.classList.add('is-visible');
      selectedFlight = null;
      updateTotalPrice();
      return;
    }

    els.empty?.classList.remove('is-visible');
    els.list.innerHTML = matched.map(buildFlightCard).join('');
    bindSelectButtons();

    if (!selectedFlight || !matched.find((f) => f.id === selectedFlight.id)) {
      selectFlight(matched[0]);
    } else {
      updateTotalPrice();
    }
  };

  if (withDelay) setTimeout(doRender, 400);
  else doRender();
};

const syncHiddenForm = (flight, params) => {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('formOrigin', flight.from);
  set('formDestination', flight.to);
  set('formTravelDate', params.depart);
  set('formReturnDate', params.returnDate || '');
  set('formAdults', String(params.adults));
  const childrenSelect = document.getElementById('formChildren');
  const infantsSelect = document.getElementById('formInfants');
  if (childrenSelect) childrenSelect.value = String(params.children);
  if (infantsSelect) infantsSelect.value = String(params.infants);

  const cabin = params.class === 'first' ? 'business' : params.class;
  const classRadio = document.querySelector(`input[name="cabinClass"][value="${cabin}"]`);
  if (classRadio) classRadio.checked = true;

  const isRound = params.tripType === 'roundtrip';
  document.getElementById('tripOneWay') && (document.getElementById('tripOneWay').checked = !isRound);
  document.getElementById('tripRoundtrip') && (document.getElementById('tripRoundtrip').checked = isRound);
};

const updateTotalPrice = () => {
  const el = document.getElementById('totalPriceValue');
  if (!el) return;
  const flight = selectedFlight || currentFlights[0];
  const total = getTotalPrice(flight, searchParams, searchParams.class);
  el.textContent = formatPrice(total);
  updateSummary(searchParams, flight);
};

const selectFlight = (flight) => {
  selectedFlight = flight;
  searchParams = getSearchParams();
  syncHiddenForm(flight, searchParams);
  updateTotalPrice();

  els.list?.querySelectorAll('.flight-card').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.flightId === flight.id);
  });
};

const bindSelectButtons = () => {
  els.list?.querySelectorAll('[data-select-flight]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const flight = currentFlights.find((f) => f.id === btn.dataset.selectFlight);
      if (flight) selectFlight(flight);
    });
  });
};

const showToast = (message, isError = false) => {
  let toast = document.getElementById('bookingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bookingToast';
    toast.className = 'booking-toast';
    document.body.appendChild(toast);
  }
  toast.className = `booking-toast${isError ? ' booking-toast--error' : ''}`;
  toast.innerHTML = message;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => toast.classList.remove('is-visible'), 4500);
};

const validateSearchForm = () => {
  let ok = true;
  [els.from, els.to, els.depart].forEach((el) => el?.classList.remove('is-invalid'));
  if (!els.from?.value) { els.from?.classList.add('is-invalid'); ok = false; }
  if (!els.to?.value) { els.to?.classList.add('is-invalid'); ok = false; }
  if (!els.depart?.value) { els.depart?.classList.add('is-invalid'); ok = false; }
  if (els.from?.value === els.to?.value) { els.to?.classList.add('is-invalid'); ok = false; }
  return ok;
};

const buildPassengerBlock = (label, typeKey, index, includeContact = false) => {
  const prefix = `${typeKey}_${index}`;
  const contactFields = includeContact ? `
      <div class="passenger-form-field">
        <label for="${prefix}_phone">Phone Number <span class="field-required" aria-hidden="true">*</span></label>
        <input type="tel" id="${prefix}_phone" data-passenger-field="phone" placeholder="+252 61 1234567" autocomplete="tel" required/>
        <div class="field-error" id="${prefix}_phoneError">Please enter a valid phone number.</div>
      </div>
      <div class="passenger-form-field">
        <label for="${prefix}_email">Email Address <span class="field-required" aria-hidden="true">*</span></label>
        <input type="email" id="${prefix}_email" data-passenger-field="email" placeholder="your@email.com" autocomplete="email" required/>
        <div class="field-error" id="${prefix}_emailError">Please enter a valid email address.</div>
      </div>` : '';

  return `
    <div class="passenger-block" data-passenger-type="${typeKey}" data-passenger-index="${index}">
      <div class="passenger-block__label">${label} ${index + 1}</div>
      <div class="passenger-form-grid">
        <div class="passenger-form-field">
          <label for="${prefix}_name">Full Name <span class="field-required" aria-hidden="true">*</span></label>
          <input type="text" id="${prefix}_name" data-passenger-field="name" placeholder="e.g. Ahmed Hassan Ali" required/>
          <div class="field-error" id="${prefix}_nameError">Please enter full name.</div>
        </div>
        ${contactFields}
        <div class="passenger-form-field">
          <label for="${prefix}_gender">Gender <span class="field-required" aria-hidden="true">*</span></label>
          <select id="${prefix}_gender" data-passenger-field="gender" required>
            <option value="">— Select gender —</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <div class="field-error" id="${prefix}_genderError">Please select a gender.</div>
        </div>
        <div class="passenger-form-field">
          <label for="${prefix}_dob">Date of Birth <span class="field-required" aria-hidden="true">*</span></label>
          <input type="date" id="${prefix}_dob" data-passenger-field="dob" required/>
          <div class="field-error" id="${prefix}_dobError">Date of birth cannot be in the future.</div>
        </div>
      </div>
    </div>`;
};

const snapshotPassengerFields = () => {
  const saved = {};
  document.querySelectorAll('.passenger-block [data-passenger-field]').forEach((el) => {
    if (el.id) saved[el.id] = el.value;
  });
  return saved;
};

const restorePassengerFields = (saved) => {
  Object.entries(saved).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.value = value;
  });
};

const renderPassengerSections = () => {
  const saved = snapshotPassengerFields();
  const params = getSearchParams();
  const config = [
    { key: 'adults', container: 'adultsForms', section: 'adultsSection', label: 'Adult' },
    { key: 'children', container: 'childrenForms', section: 'childrenSection', label: 'Child' },
    { key: 'infants', container: 'infantsForms', section: 'infantsSection', label: 'Infant' },
  ];

  config.forEach(({ key, container, section, label }) => {
    const count = key === 'adults' ? Math.max(1, params[key] || 1) : (params[key] || 0);
    const sectionEl = document.getElementById(section);
    const containerEl = document.getElementById(container);
    if (!sectionEl || !containerEl) return;

    sectionEl.style.display = count > 0 ? '' : 'none';
    if (count === 0) {
      containerEl.innerHTML = '<p class="passenger-category__empty">No passengers in this category.</p>';
      return;
    }

  const typeMap = { adults: 'adult', children: 'child', infants: 'infant' };
    containerEl.innerHTML = Array.from({ length: count }, (_, i) =>
      buildPassengerBlock(label, typeMap[key], i, key === 'adults' && i === 0)
    ).join('');
  });

  restorePassengerFields(saved);
};

const collectPassengerData = () => {
  const blocks = document.querySelectorAll('.passenger-block');
  const passengers = [];
  blocks.forEach((block) => {
    const type = block.dataset.passengerType;
    const index = Number(block.dataset.passengerIndex);
    const prefix = `${type}_${index}`;
    passengers.push({
      type,
      fullName: document.getElementById(`${prefix}_name`)?.value.trim() || '',
      phone: document.getElementById(`${prefix}_phone`)?.value.trim() || '',
      email: document.getElementById(`${prefix}_email`)?.value.trim() || '',
      gender: document.getElementById(`${prefix}_gender`)?.value || '',
      dob: document.getElementById(`${prefix}_dob`)?.value || '',
    });
  });
  return passengers;
};

const validatePassengerForm = () => {
  let ok = true;
  const today = new Date().toISOString().split('T')[0];
  const blocks = document.querySelectorAll('.passenger-block');

  blocks.forEach((block) => {
    const type = block.dataset.passengerType;
    const index = Number(block.dataset.passengerIndex);
    const prefix = `${type}_${index}`;
    const isLead = type === 'adult' && index === 0;

    const checks = [
      { id: `${prefix}_name`, test: (v) => v.trim().length >= 2 },
      { id: `${prefix}_gender`, test: (v) => v === 'male' || v === 'female' },
      { id: `${prefix}_dob`, test: (v) => !!v && v <= today },
    ];
    if (isLead) {
      checks.push({ id: `${prefix}_phone`, test: (v) => v.trim().length >= 6 });
      checks.push({ id: `${prefix}_email`, test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) });
    }

    checks.forEach(({ id, test }) => {
      const input = document.getElementById(id);
      const err = document.getElementById(`${id}Error`);
      input?.classList.remove('is-invalid');
      err?.classList.remove('is-visible');
      const value = input?.tagName === 'SELECT' ? input.value : input?.value;
      if (!input || !test(value ?? '')) {
        input?.classList.add('is-invalid');
        err?.classList.add('is-visible');
        ok = false;
      }
    });
  });

  if (!selectedFlight) {
    showToast('<strong>Select a flight</strong> before proceeding to payment.', true);
    ok = false;
  }
  return ok;
};

const resetFlow = () => {
  selectedFlight = null;
  els.list?.querySelectorAll('.flight-card').forEach((c) => c.classList.remove('is-selected'));
  updateTotalPrice();
};

const runFlightSearch = (withDelay = true) => {
  searchParams = getSearchParams();
  if (!searchParams.from || !searchParams.to || searchParams.from === searchParams.to) {
    if (els.list) els.list.innerHTML = '';
    if (els.count) els.count.textContent = '';
    els.empty?.classList.add('is-visible');
    selectedFlight = null;
    updateSummary(searchParams);
    updateTotalPrice();
    return;
  }
  if (!searchParams.depart) return;
  renderFlights(searchParams, withDelay);
};

const syncAdultsFromDependents = () => {
  if (!els.adults) return;

  const infants = parseInt(els.infants?.value, 10) || 0;
  const children = parseInt(els.children?.value, 10) || 0;
  const needed = Math.max(infants, children);

  // Marka infants ama children la kordhiyo, adults waa inuu la mid noqdaa tirada ugu badan
  if (needed > 0) {
    els.adults.value = String(Math.min(10, needed));
  }

  searchParams = getSearchParams();
  renderPassengerSections();
  updateSummary(searchParams);
  updateTotalPrice();
};

const bindSearchForm = () => {
  els.searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateSearchForm()) return;
    runFlightSearch();
  });

  [els.from, els.to].forEach((el) => {
    el?.addEventListener('change', () => {
      if (els.from?.value && els.to?.value && els.from.value === els.to.value) {
        const alt = [...els.to?.options || []].map((o) => o.value).find((code) => code && code !== els.from?.value);
        if (alt && els.to) els.to.value = alt;
      }
      if (!validateSearchForm()) return;
      runFlightSearch();
    });
  });

  [els.adults, els.class].forEach((el) => {
    el?.addEventListener('change', () => {
      searchParams = getSearchParams();
      renderPassengerSections();
      updateSummary(searchParams);
      updateTotalPrice();
    });
  });

  [els.children, els.infants].forEach((el) => {
    el?.addEventListener('input', syncAdultsFromDependents);
    el?.addEventListener('change', syncAdultsFromDependents);
  });

  els.depart?.addEventListener('change', () => {
    if (!validateSearchForm()) return;
    runFlightSearch(false);
  });
};

const populatePassengerFromUser = async () => {
  renderPassengerSections();

  let profile = null;
  try {
    profile = JSON.parse(localStorage.getItem('mideye_user') || 'null');
  } catch {
    profile = null;
  }

  const token = localStorage.getItem('mideye_token');
  const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
  if (token) {
    try {
      const res = await fetch(`${apiBase}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) profile = data.data.user;
      }
    } catch {
      /* use localStorage profile */
    }
  }

  const nameEl = document.getElementById('adult_0_name');
  const phoneEl = document.getElementById('adult_0_phone');
  const emailEl = document.getElementById('adult_0_email');
  if (profile?.full_name && nameEl && !nameEl.value.trim()) nameEl.value = profile.full_name;
  if (profile?.phone && phoneEl && !phoneEl.value.trim()) phoneEl.value = profile.phone;
  if (profile?.email && emailEl && !emailEl.value.trim()) emailEl.value = profile.email;
};

const bindPassengerFieldValidation = () => {
  document.getElementById('passengerSections')?.addEventListener('input', (e) => {
    const target = e.target;
    if (!target.id) return;
    target.classList.remove('is-invalid');
    document.getElementById(`${target.id}Error`)?.classList.remove('is-visible');
  });
  document.getElementById('passengerSections')?.addEventListener('change', (e) => {
    const target = e.target;
    if (!target.id) return;
    target.classList.remove('is-invalid');
    document.getElementById(`${target.id}Error`)?.classList.remove('is-visible');
  });
};

const bindPassengerForm = () => {
  document.getElementById('flightBookingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!localStorage.getItem('mideye_token') || !localStorage.getItem('mideye_user')) {
      window.AuthGuard?.redirectToLogin?.() || (window.location.replace('login.html'));
      return;
    }
    if (!validatePassengerForm()) return;
    if (typeof window.openConfirmPayModal !== 'function') {
      showToast('<strong>Payment module unavailable.</strong> Please refresh the page.', true);
      return;
    }

    const params = getSearchParams();
    const flight = selectedFlight || currentFlights[0];
    const passengers = collectPassengerData();
    const lead = passengers.find((p) => p.type === 'adult') || passengers[0];
    const fullName = lead?.fullName || '';
    const email = lead?.email || '';
    const phone = lead?.phone || '';
    const gender = lead?.gender || '';
    const genderLabel = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : '';
    const dob = lead?.dob || '';
    const total = getTotalPrice(flight, params, params.class);
    const fromLabel = getCityName(params.from);
    const toLabel = getCityName(params.to);
    const reference = window.generateBookingRef?.('ME-FL') || `ME-FL-${Date.now()}`;
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || first_name;

    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
    const token = localStorage.getItem('mideye_token');
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    window.openConfirmPayModal({
      serviceType: 'Travel',
      reference,
      customerName: fullName,
      phone,
      email,
      destination: `${fromLabel} → ${toLabel}`,
      date: window.formatDisplayDate?.(params.depart) || params.depart,
      amount: total,
      amountFormatted: formatPrice(total),
      summary: [
        { label: 'Airline', value: flight.airline },
        { label: 'Route', value: `${fromLabel} (${params.from}) → ${toLabel} (${params.to})` },
        { label: 'Departure', value: `${window.formatDisplayDate?.(params.depart) || params.depart} at ${flight.departureTime}` },
        { label: 'Class', value: CLASS_LABELS[params.class] || params.class },
        { label: 'Passengers', value: `${params.adults} Adult(s), ${params.children} Child(ren), ${params.infants} Infant(s)` },
        { label: 'Gender', value: genderLabel },
        { label: 'Date of Birth', value: window.formatDisplayDate?.(dob) || dob },
        { label: 'Email', value: email || '—' },
        { label: 'Phone', value: phone },
      ],
      submitFn: async () => {
        const cabin = params.class === 'first' ? 'business' : params.class;
        const res = await fetch(`${apiBase}/bookings`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            trip_type: params.tripType === 'roundtrip' ? 'roundtrip' : 'oneway',
            first_name,
            last_name,
            email,
            phone,
            origin: params.from,
            destination: params.to,
            travel_date: params.depart,
            return_date: params.returnDate || null,
            adults: params.adults,
            children: params.children,
            infants: params.infants,
            cabin_class: cabin,
            special_requests: '',
          }),
        });
        if (res.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        const data = await res.json();
        if (!data.success) {
          const msg = data.errors ? data.errors.map((er) => er.message).join(', ') : data.message;
          throw new Error(msg || 'Booking could not be saved.');
        }
        const id = data.data.booking.id;
        return { reference: `BK-${String(id).padStart(5, '0')}`, booking: data.data.booking };
      },
      onSuccess: () => {
        window.clearDashboardCache?.();
        document.getElementById('flightBookingForm')?.reset();
        renderPassengerSections();
        resetFlow();
        showToast(`<strong>Booking request saved!</strong><br>${fullName}, complete payment via WhatsApp to confirm.`);
      },
    });
  });
};

const applyUrlSearchParams = () => {
  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');
  const to = params.get('to');
  const depart = params.get('depart');
  const returnDate = params.get('return');
  const passengers = params.get('passengers');
  const trip = params.get('trip');

  if (from && els.from?.querySelector(`option[value="${from}"]`)) els.from.value = from;
  if (to && els.to?.querySelector(`option[value="${to}"]`)) els.to.value = to;
  if (depart) els.depart.value = depart;
  const adults = params.get('adults') || params.get('passengers');
  const children = params.get('children');
  const infants = params.get('infants');

  if (adults && els.adults) {
    els.adults.value = String(Math.min(10, Math.max(1, parseInt(adults, 10) || 1)));
  }
  if (children && els.children) {
    els.children.value = String(Math.min(10, Math.max(0, parseInt(children, 10) || 0)));
  }
  if (infants && els.infants) {
    els.infants.value = String(Math.min(10, Math.max(0, parseInt(infants, 10) || 0)));
  }

  if (trip === 'roundtrip') {
    const tripEl = document.getElementById('searchTripType');
    if (tripEl) tripEl.value = 'roundtrip';
    syncTripTypeUI();
    if (returnDate && els.returnDate) els.returnDate.value = returnDate;
  }

  if (els.depart?.value && els.returnDate) {
    els.returnDate.min = els.depart.value;
  }
};

const setDefaults = () => {
  const today = new Date().toISOString().split('T')[0];
  if (els.depart) {
    els.depart.value = today;
    els.depart.min = today;
  }
  if (els.returnDate) els.returnDate.min = today;
  if (els.adults) els.adults.value = '1';
  if (els.children) els.children.value = '0';
  if (els.infants) els.infants.value = '0';
  if (els.class) els.class.value = 'economy';
};

const initFlightsSearch = () => {
  els = {
    searchForm: document.getElementById('flightSearchForm'),
    from: document.getElementById('searchFrom'),
    to: document.getElementById('searchTo'),
    depart: document.getElementById('searchDepart'),
    returnDate: document.getElementById('searchReturn'),
    adults: document.getElementById('searchAdults'),
    children: document.getElementById('searchChildren'),
    infants: document.getElementById('searchInfants'),
    class: document.getElementById('searchClass'),
    list: document.getElementById('flightsList'),
    loader: document.getElementById('flightsLoader'),
    empty: document.getElementById('flightsEmpty'),
    count: document.getElementById('flightsCount'),
  };

  if (!els.searchForm) return;

  setDefaults();
  bindSearchForm();
  bindPassengerForm();
  bindPassengerFieldValidation();
  populatePassengerFromUser();

  els.depart?.addEventListener('change', () => {
    if (els.returnDate && !els.returnDate.disabled && els.depart?.value) {
      els.returnDate.min = els.depart.value;
    }
  });

  document.getElementById('searchTripType')?.addEventListener('change', () => {
    syncTripTypeUI();
    searchParams = getSearchParams();
    updateSummary(searchParams);
  });

  els.returnDate?.addEventListener('change', () => {
    searchParams = getSearchParams();
    updateSummary(searchParams);
  });

  syncTripTypeUI();
  searchParams = getSearchParams();
  renderPassengerSections();

  const startSearch = () => {
    applyUrlSearchParams();
    searchParams = getSearchParams();
    renderPassengerSections();
    runFlightSearch(false);
    updateSummary(searchParams);
  };

  let started = false;
  const safeStartSearch = () => {
    if (started) return;
    started = true;
    startSearch();
  };

  document.addEventListener('mideye:cities-loaded', safeStartSearch, { once: true });
  if (window.CitiesLoader) {
    CitiesLoader.initPageSelects().then(safeStartSearch).catch(safeStartSearch);
  } else {
    safeStartSearch();
  }

  // Last-resort fallback: never keep user stuck on "Loading cities..."
  setTimeout(safeStartSearch, 1200);

  window.validateBookingPassengerForm = validatePassengerForm;
  window.resetBookingFlow = resetFlow;

  window.getSelectedFlightMeta = () => {
    const flight = selectedFlight || currentFlights[0];
    if (!flight) return null;
    return {
      airline: flight.airline,
      departureTime: flight.departureTime,
      id: flight.id,
    };
  };
};

document.addEventListener('DOMContentLoaded', initFlightsSearch);
