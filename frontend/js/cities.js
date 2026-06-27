/**
 * Mideye – Active cities loader (booking, cargo, flights)
 * Fetches only active cities from GET /api/cities
 */

const FALLBACK_CITIES = [
  { code: 'MGQ', name: 'Mogadishu', is_active: true },
  { code: 'HGA', name: 'Hargeisa', is_active: true },
  { code: 'GLK', name: 'Galkacyo', is_active: true },
  { code: 'KSM', name: 'Kismayo', is_active: true },
  { code: 'BDI', name: 'Baidoa', is_active: true },
];

const CitiesLoader = (() => {
  let cache = null;
  const nameMap = {};

  const getApiBase = () => {
    if (window.location.protocol !== 'file:') {
      return `${window.location.origin}/api`;
    }
    if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
      return API_BASE_URL;
    }
    return 'http://localhost:5000/api';
  };

  const syncNameMap = (cities) => {
    Object.keys(nameMap).forEach((k) => delete nameMap[k]);
    cities.forEach((c) => { nameMap[c.code] = c.name; });
    window.MIDEYE_CITY_NAMES = { ...nameMap };
  };

  const fetchWithTimeout = (url, ms = 4000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const fetchActive = async (force = false) => {
    if (cache && !force) return cache;

    try {
      const res = await fetchWithTimeout(`${getApiBase()}/cities`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'API error');
      const cities = (data.data?.cities || []).filter((c) => c.is_active !== false);
      cache = cities.length ? cities : [...FALLBACK_CITIES];
    } catch (err) {
      console.warn('CitiesLoader: using fallback cities', err.message);
      cache = [...FALLBACK_CITIES];
    }

    syncNameMap(cache);
    return cache;
  };

  const invalidateCache = () => {
    cache = null;
  };

  const getName = (code) => nameMap[code] || code;

  const buildOptions = (cities, { selected = '', labelFormat = 'full' } = {}) => cities.map((c) => {
    const label = labelFormat === 'code' ? c.code
      : labelFormat === 'name' ? c.name
        : `${c.name} (${c.code})`;
    return `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const populateSelect = (selectEl, cities, options = {}) => {
    if (!selectEl) return;
    const {
      includeEmpty = false,
      emptyLabel = '— Select —',
      selected = '',
      labelFormat = 'full',
      preserveValue = true,
    } = options;

    const current = preserveValue ? (selected || selectEl.value) : selected;
    const validCurrent = current && cities.some((c) => c.code === current) ? current : '';

    selectEl.innerHTML =
      (includeEmpty ? `<option value="">${emptyLabel}</option>` : '')
      + buildOptions(cities, { selected: validCurrent, labelFormat });

    if (validCurrent) {
      selectEl.value = validCurrent;
    } else if (cities.length && !includeEmpty) {
      selectEl.value = cities[0].code;
    }
  };

  const populateByIds = (entries, cities) => {
    const list = Array.isArray(entries) ? entries : [entries];
    list.forEach((entry) => {
      const el = typeof entry === 'string'
        ? document.getElementById(entry)
        : (typeof entry.el === 'string' ? document.getElementById(entry.el) : entry.el || entry);
      const opts = typeof entry === 'string' ? {} : { ...entry };
      delete opts.el;
      populateSelect(el, cities, opts);
    });
    return cities;
  };

  const getBookingSelectConfig = () => ([
    { el: 'searchFrom', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
    { el: 'searchTo', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
    { el: 'formOrigin', labelFormat: 'code' },
    { el: 'formDestination', labelFormat: 'code' },
  ]);

  const initPageSelects = async () => {
    const bookingCfg = getBookingSelectConfig();
    const hasBooking = document.getElementById('searchFrom') || document.getElementById('searchTo');

    // 1) Show cities immediately (never stay on "Loading cities...")
    const instant = [...FALLBACK_CITIES];
    syncNameMap(instant);
    if (hasBooking) populateByIds(bookingCfg, instant);
    if (document.getElementById('cargoDestination')) {
      populateByIds([{ el: 'cargoDestination', includeEmpty: true, emptyLabel: '— Select destination —' }], instant);
    }
    if (document.getElementById('homeSearchFrom') || document.getElementById('homeSearchTo')) {
      populateByIds([
        { el: 'homeSearchFrom', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
        { el: 'homeSearchTo', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
      ], instant);
    }

    // 2) Upgrade from API when ready
    try {
      const cities = await fetchActive(true);
      if (hasBooking) populateByIds(bookingCfg, cities);
      if (document.getElementById('cargoDestination')) {
        populateByIds([{ el: 'cargoDestination', includeEmpty: true, emptyLabel: '— Select destination —' }], cities);
      }
      if (document.getElementById('homeSearchFrom') || document.getElementById('homeSearchTo')) {
        populateByIds([
          { el: 'homeSearchFrom', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
          { el: 'homeSearchTo', labelFormat: 'full', includeEmpty: true, emptyLabel: 'Select one' },
        ], cities);
      }
    } catch (err) {
      console.warn('CitiesLoader init:', err.message);
    }

    document.dispatchEvent(new CustomEvent('mideye:cities-loaded'));
    return cache || instant;
  };

  return {
    fetchActive,
    invalidateCache,
    getName,
    getNameMap: () => ({ ...nameMap }),
    populateSelect,
    populateByIds,
    initPageSelects,
    FALLBACK_CITIES,
  };
})();

window.CitiesLoader = CitiesLoader;

const bootCitiesLoader = () => {
  CitiesLoader.initPageSelects().catch((err) => {
    console.error('CitiesLoader boot failed:', err);
    document.dispatchEvent(new CustomEvent('mideye:cities-loaded'));
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCitiesLoader);
} else {
  bootCitiesLoader();
}
