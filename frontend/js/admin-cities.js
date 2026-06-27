/**
 * Mideye Admin – Cities Management
 * Add / edit / delete cities
 */

const cityStatusBadge = (active) => {
  const cls = active ? 'confirmed' : 'cancelled';
  const label = active ? 'Active' : 'Inactive';
  return `<span class="badge-status badge-${cls}">${label}</span>`;
};

const getCityFormValues = () => ({
  code: document.getElementById('cityCode')?.value.trim().toUpperCase() || '',
  name: document.getElementById('cityName')?.value.trim() || '',
  is_active: document.getElementById('cityActive')?.value !== '0',
});

const setCityFormValues = (city = {}) => {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('cityCode', city.code || '');
  set('cityName', city.name || '');
  const activeEl = document.getElementById('cityActive');
  if (activeEl) activeEl.value = city.is_active === false ? '0' : '1';
};

window.openCityModal = function (cityId = null) {
  const modal = document.getElementById('cityModal');
  const title = document.getElementById('cityModalTitle');
  const city = cityId
    ? (window.allCities || []).find((c) => c.id === cityId)
    : null;

  modal.dataset.cityId = cityId || '';
  title.textContent = city ? 'Edit City' : 'Add New City';
  setCityFormValues(city || { is_active: true });
  modal.classList.add('open');
};

window.closeCityModal = function () {
  document.getElementById('cityModal')?.classList.remove('open');
  document.getElementById('cityModal')?.removeAttribute('data-city-id');
};

window.saveCity = async function () {
  const modal = document.getElementById('cityModal');
  const cityId = modal?.dataset.cityId;
  const payload = getCityFormValues();
  const token = localStorage.getItem('mideye_token');
  const API = window.API || 'http://localhost:5000/api';

  if (!payload.code || !payload.name) {
    window.showToast?.('City code and name are required.', 'fa-times-circle');
    return;
  }

  const url = cityId ? `${API}/admin/cities/${cityId}` : `${API}/admin/cities`;
  const method = cityId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not save city.');
    }
    window.showToast?.(cityId ? 'City updated.' : 'City added.', 'fa-check-circle');
    window.CitiesLoader?.invalidateCache?.();
    if (typeof window.invalidateFlightAirportOptions === 'function') {
      window.invalidateFlightAirportOptions();
    }
    closeCityModal();
    await window.loadCities?.();
  } catch (err) {
    window.showToast?.(err.message, 'fa-times-circle');
  }
};

window.deleteCity = async function (cityId, cityName) {
  if (!confirm(`Delete city "${cityName}"? This cannot be undone.`)) return;

  const token = localStorage.getItem('mideye_token');
  const API = window.API || 'http://localhost:5000/api';

  try {
    const res = await fetch(`${API}/admin/cities/${cityId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not delete city.');
    }
    window.showToast?.(`City "${cityName}" deleted.`, 'fa-trash-alt');
    window.CitiesLoader?.invalidateCache?.();
    await window.loadCities?.();
  } catch (err) {
    window.showToast?.(err.message, 'fa-times-circle');
  }
};

window.renderCitiesTable = function (cities) {
  const tbody = document.getElementById('cities-body');
  const countEl = document.getElementById('cities-count');
  const badgeEl = document.getElementById('badge-cities');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${cities.length} total`;
  if (badgeEl) badgeEl.textContent = cities.length;

  if (!cities.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><i class="fas fa-city"></i>No cities found.</div></td></tr>`;
    return;
  }

  const esc = window.esc || ((s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  tbody.innerHTML = cities.map((c, i) => `
    <tr>
      <td class="td-muted">${i + 1}</td>
      <td class="td-bold">${esc(c.code)}</td>
      <td>${esc(c.name)}</td>
      <td>${cityStatusBadge(c.is_active !== false)}</td>
      <td>
        <div class="actions-group">
          <button class="btn-action btn-action-gold btn-action--icon" onclick="openCityModal(${c.id})" title="Edit">
            <i class="fas fa-edit"></i><span>Edit</span>
          </button>
          <button class="btn-action btn-action-red btn-action--icon" onclick="deleteCity(${c.id}, '${esc(c.name).replace(/'/g, "\\'")}')" title="Delete">
            <i class="fas fa-trash-alt"></i><span>Delete</span>
          </button>
        </div>
      </td>
    </tr>`).join('');
};

window.loadCities = async function () {
  const tbody = document.getElementById('cities-body');
  if (!tbody) return;
  try {
    const { data, count } = await window.apiFetch('/admin/cities');
    window.allCities = data.cities || [];
    if (window.allCities !== undefined) {
      try { Object.assign(window, { allCities: window.allCities }); } catch {}
    }
    window.renderCitiesTable(window.allCities);
    document.getElementById('badge-cities') && (document.getElementById('badge-cities').textContent = count ?? window.allCities.length);
  } catch (e) {
    console.error('Cities load error:', e);
    tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load cities.</div></td></tr>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cityModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cityModal') closeCityModal();
  });
});
