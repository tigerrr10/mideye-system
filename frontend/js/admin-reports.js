/**
 * Mideye Admin – Reports & Analytics
 * Flight, cargo, revenue, and customer reports
 */
(() => {
  'use strict';

  let reportTab = 'flights';

  const fmtMoney = (n) =>
    window.AdminFinance?.fmtMoney(n) ||
    `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getInvoices = () => window.AdminFinance?.buildInvoices?.() || [];

  const countBy = (items, keyFn) => {
    const map = {};
    items.forEach((item) => {
      const k = keyFn(item) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const sumByMonth = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        count: 0,
        revenue: 0,
      });
    }
    const map = Object.fromEntries(months.map((m) => [m.key, m]));
    return { months, map };
  };

  const renderReportTable = (tbodyId, rows, emptyIcon, emptyMsg) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const esc = window.esc || ((s) => s);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="table-empty"><i class="fas ${emptyIcon}"></i>${emptyMsg}</div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td class="td-bold">${esc(r.col1)}</td>
        <td class="td-muted">${esc(r.col2)}</td>
        <td>${r.col3 ?? '—'}</td>
        <td class="td-bold">${r.col4 ?? '—'}</td>
      </tr>`).join('');
  };

  const renderBarChart = (containerId, data, valueKey, className = '') => {
    const el = document.getElementById(containerId);
    if (!el || !data.length) {
      if (el) el.innerHTML = '<p class="td-muted" style="padding:1rem">No data yet.</p>';
      return;
    }
    const max = Math.max(...data.map((d) => d[valueKey]), 1);

    el.innerHTML = data.map((d) => {
      const h = Math.round((d[valueKey] / max) * 120);
      return `
        <div class="report-bar-col">
          <div class="report-bar-value">${d[valueKey]}</div>
          <div class="report-bar ${className}" style="height:${Math.max(h, 4)}px" title="${d.label}: ${d[valueKey]}"></div>
          <div class="report-bar-label">${d.label}</div>
        </div>`;
    }).join('');
  };

  const renderFlightsReport = () => {
    const flights = Array.isArray(window.allFlights) ? window.allFlights : [];
    const bookings = Array.isArray(window.allBookings) ? window.allBookings : [];

    const active = flights.filter((f) => f.status === 'Active').length;
    const routes = countBy(flights, (f) => `${f.origin} → ${f.destination}`);
    const statusRows = countBy(flights, (f) => f.status).map(([s, n]) => ({
      col1: s,
      col2: 'Flights',
      col3: `<span class="badge-status badge-pending">${n}</span>`,
      col4: `${Math.round((n / Math.max(flights.length, 1)) * 100)}%`,
    }));

    const routeBookings = countBy(bookings, (b) => `${b.origin} → ${b.destination}`).map(([r, n]) => ({
      col1: r,
      col2: 'Bookings',
      col3: '—',
      col4: String(n),
    }));

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('rep-flight-total', flights.length);
    set('rep-flight-active', active);
    set('rep-flight-routes', routes.length);
    set('rep-flight-bookings', bookings.length);

    renderReportTable('report-flights-status-body', statusRows, 'fa-plane', 'No flight data.');
    renderReportTable('report-flights-routes-body', routeBookings.slice(0, 10), 'fa-route', 'No booking routes yet.');

    const chartData = routes.slice(0, 6).map(([label, count]) => ({ label: label.split(' → ')[0], count }));
    renderBarChart('report-flights-chart', chartData, 'count');
  };

  const renderCargoReport = () => {
    const cargo = Array.isArray(window.allCargo) ? window.allCargo : [];
    const totalWeight = cargo.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);

    const destRows = countBy(cargo, (c) => c.destination).map(([d, n]) => ({
      col1: d,
      col2: 'Shipments',
      col3: '—',
      col4: String(n),
    }));

    const statusRows = countBy(cargo, (c) => c.status).map(([s, n]) => ({
      col1: s,
      col2: 'Cargo',
      col3: window.CargoStatus?.renderCargoStatusBadge(s) || s,
      col4: String(n),
    }));

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('rep-cargo-total', cargo.length);
    set('rep-cargo-transit', cargo.filter((c) => c.status === 'In Transit').length);
    set('rep-cargo-delivered', cargo.filter((c) => ['Arrived', 'Delivered', 'Ready for Pickup'].includes(c.status)).length);
    set('rep-cargo-weight', `${totalWeight.toFixed(1)} kg`);

    renderReportTable('report-cargo-dest-body', destRows.slice(0, 10), 'fa-map-marker-alt', 'No cargo data.');
    renderReportTable('report-cargo-status-body', statusRows, 'fa-box', 'No cargo data.');

    const chartData = destRows.slice(0, 6).map((r) => ({ label: r.col1, count: Number(r.col4) }));
    renderBarChart('report-cargo-chart', chartData, 'count', 'report-bar--cargo');
  };

  const renderRevenueReport = () => {
    const invoices = getInvoices();
    const paid = invoices.filter((i) => i.status === 'paid');
    const bookingRev = paid.filter((i) => i.type === 'booking').reduce((s, i) => s + i.amount, 0);
    const cargoRev = paid.filter((i) => i.type === 'cargo').reduce((s, i) => s + i.amount, 0);
    const total = bookingRev + cargoRev;

    const { months, map } = sumByMonth();
    paid.forEach((inv) => {
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map[key]) {
        map[key].count += 1;
        map[key].revenue += inv.amount;
      }
    });

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('rep-rev-total', fmtMoney(total));
    set('rep-rev-bookings', fmtMoney(bookingRev));
    set('rep-rev-cargo', fmtMoney(cargoRev));
    set('rep-rev-paid', paid.length);

    const monthRows = months.map((m) => ({
      col1: m.label,
      col2: `${m.count} payments`,
      col3: '—',
      col4: fmtMoney(m.revenue),
    }));
    renderReportTable('report-revenue-month-body', monthRows, 'fa-chart-line', 'No revenue data.');

    const chartData = months.map((m) => ({ label: m.label, count: Math.round(m.revenue) }));
    renderBarChart('report-revenue-chart', chartData, 'count');
  };

  const renderCustomersReport = () => {
    const users = (Array.isArray(window.allUsers) ? window.allUsers : []).filter((u) => u.role === 'user');
    const bookings = Array.isArray(window.allBookings) ? window.allBookings : [];
    const cargo = Array.isArray(window.allCargo) ? window.allCargo : [];
    const calcB = window.AdminFinance?.calcBookingPrice;
    const calcC = window.AdminFinance?.calcCargoPrice;
    const esc = window.esc || ((s) => s);

    const rows = users.map((u) => {
      const uBookings = bookings.filter((b) => b.user_id === u.id || b.email === u.email);
      const uCargo = cargo.filter((c) => c.user_id === u.id || c.sender_email === u.email);
      let spent = 0;
      uBookings.forEach((b) => {
        if (window.AdminFinance?.paymentStatusFromBooking(b.status) === 'paid' && calcB) spent += calcB(b);
      });
      uCargo.forEach((c) => {
        if (window.AdminFinance?.paymentStatusFromCargo(c.status) === 'paid' && calcC) spent += calcC(c);
      });
      return {
        col1: u.full_name,
        col2: u.email,
        col3: `${uBookings.length} bk · ${uCargo.length} cargo`,
        col4: fmtMoney(spent),
        sort: spent,
      };
    }).sort((a, b) => b.sort - a.sort);

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('rep-cust-total', users.length);
    set('rep-cust-active', users.filter((u) => u.is_active !== false).length);
    set('rep-cust-booking', bookings.length);
    set('rep-cust-cargo', cargo.length);

    const tbody = document.getElementById('report-customers-body');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><i class="fas fa-users"></i>No customer data.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.slice(0, 20).map((r, i) => `
      <tr>
        <td class="td-muted">${i + 1}</td>
        <td class="td-bold">${esc(r.col1)}</td>
        <td class="td-muted">${esc(r.col2)}</td>
        <td class="td-muted">${r.col3}</td>
        <td class="td-bold">${r.col4}</td>
      </tr>`).join('');
  };

  const showReportPanel = (tab) => {
    document.querySelectorAll('.report-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.reportTab === tab);
    });
    ['flights', 'cargo', 'revenue', 'customers'].forEach((t) => {
      document.getElementById(`report-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
  };

  const renderReportsSection = () => {
    try {
      showReportPanel(reportTab);
      renderFlightsReport();
      renderCargoReport();
      renderRevenueReport();
      renderCustomersReport();
    } catch (err) {
      console.error('Reports render error:', err);
    }
  };

  window.setReportTab = (tab) => {
    reportTab = tab;
    renderReportsSection();
  };

  window.renderReportsSection = renderReportsSection;
})();
