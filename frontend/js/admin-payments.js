/**
 * Mideye Admin – Payment Management
 * Invoices, receipts, refunds, payment methods (derived from bookings & cargo)
 */
(() => {
  'use strict';

  const PAYMENT_METHODS = [
    { id: 'evc', name: 'EVC Plus', icon: 'fa-mobile-alt', accent: '#1565c0' },
    { id: 'edahab', name: 'E-dahab', icon: 'fa-gem', accent: '#c9a227' },
    { id: 'zaad', name: 'Zaad', icon: 'fa-sim-card', accent: '#0d6640' },
    { id: 'sahal', name: 'Sahal', icon: 'fa-credit-card', accent: '#6a1b9a' },
    { id: 'cash', name: 'Cash', icon: 'fa-money-bill-wave', accent: '#441306' },
  ];

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

  const paymentStatusFromBooking = (status) => {
    if (status === 'Completed') return 'paid';
    if (status === 'Cancelled') return 'refund';
    return 'unpaid';
  };

  const paymentStatusFromCargo = (status) => {
    if (['Arrived', 'Ready for Pickup', 'Delivered'].includes(status)) return 'paid';
    if (status === 'Cancelled') return 'refund';
    return 'unpaid';
  };

  const getPaymentMethod = (type, id) => {
    const idx = (Number(id) + (type === 'cargo' ? 3 : 0)) % PAYMENT_METHODS.length;
    return PAYMENT_METHODS[idx];
  };

  const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const bookingInvoiceRef = (b) =>
    `BK-${new Date(b.created_at || Date.now()).getFullYear()}-${String(b.id).padStart(5, '0')}`;

  const buildInvoices = () => {
    const bookings = Array.isArray(window.allBookings) ? window.allBookings : [];
    const cargo = Array.isArray(window.allCargo) ? window.allCargo : [];

    const fromBookings = bookings.map((b) => {
      const payStatus = paymentStatusFromBooking(b.status);
      const method = getPaymentMethod('booking', b.id);
      return {
        id: b.id,
        type: 'booking',
        ref: bookingInvoiceRef(b),
        customer: b.passenger_name || '—',
        email: b.email || '—',
        description: `Flight ${b.origin || '—'} → ${b.destination || '—'}`,
        amount: calcBookingPrice(b),
        status: payStatus,
        method,
        date: b.created_at,
        raw: b,
      };
    });

    const fromCargo = cargo.map((c) => {
      const payStatus = paymentStatusFromCargo(c.status);
      const method = getPaymentMethod('cargo', c.id);
      return {
        id: c.id,
        type: 'cargo',
        ref: c.tracking_id || `CRG-${c.id}`,
        customer: c.sender_name || '—',
        email: c.sender_email || '—',
        description: `Cargo to ${c.destination || '—'}`,
        amount: calcCargoPrice(c),
        status: payStatus,
        method,
        date: c.created_at,
        raw: c,
      };
    });

    return [...fromBookings, ...fromCargo].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  };

  const paymentBadge = (status) => {
    const map = {
      paid: ['Paid', 'badge-payment-paid'],
      unpaid: ['Unpaid', 'badge-payment-unpaid'],
      refund: ['Refunded', 'badge-payment-refund'],
    };
    const [label, cls] = map[status] || ['Unknown', 'badge-payment-unpaid'];
    return `<span class="badge-status ${cls}">${label}</span>`;
  };

  let paymentTab = 'invoices';
  let paymentFilter = 'all';

  const renderPaymentStats = (invoices) => {
    const paid = invoices.filter((i) => i.status === 'paid');
    const unpaid = invoices.filter((i) => i.status === 'unpaid');
    const refunds = invoices.filter((i) => i.status === 'refund');
    const totalPaid = paid.reduce((s, i) => s + i.amount, 0);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('pay-stat-paid', paid.length);
    set('pay-stat-unpaid', unpaid.length);
    set('pay-stat-refunds', refunds.length);
    set('pay-stat-total', fmtMoney(totalPaid));
  };

  const filterInvoices = (invoices) => {
    if (paymentFilter === 'all') return invoices;
    return invoices.filter((i) => i.status === paymentFilter);
  };

  const renderInvoiceTable = (invoices) => {
    const tbodyId = paymentTab === 'receipts' ? 'payments-receipts-body' : 'payments-invoices-body';
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const esc = window.esc || ((s) => String(s ?? '—'));
    const list = filterInvoices(invoices);

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="fas fa-file-invoice-dollar"></i>No invoices in this view.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((inv, idx) => {
      const section = inv.type === 'booking' ? 'bookings' : 'cargo';
      return `
      <tr>
        <td class="td-muted">${idx + 1}</td>
        <td class="td-bold">${esc(inv.ref)}</td>
        <td>
          <span class="badge-status badge-${inv.type === 'booking' ? 'confirmed' : 'pending'}">${inv.type === 'booking' ? 'Flight' : 'Cargo'}</span>
        </td>
        <td>
          <div class="td-bold">${esc(inv.customer)}</div>
          <div class="td-muted" style="font-size:var(--fs-base)">${esc(inv.description)}</div>
        </td>
        <td class="td-muted">${esc(inv.method.name)}</td>
        <td class="td-bold">${fmtMoney(inv.amount)}</td>
        <td>${paymentBadge(inv.status)}</td>
        <td>
          <div class="actions-group">
            ${inv.status === 'paid' ? `
              <button class="btn-action btn-action-gold" onclick="open${inv.type === 'booking' ? 'Booking' : 'Cargo'}Receipt(${inv.id})" title="Receipt">
                <i class="fas fa-receipt"></i>
              </button>` : ''}
            <button class="btn-action btn-action-brown" onclick="navigate('${section}', document.querySelector('[data-section=${section}]'))" title="View record">
              <i class="fas fa-external-link-alt"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  const renderPaymentMethods = (invoices) => {
    const grid = document.getElementById('payment-methods-grid');
    if (!grid) return;

    const stats = PAYMENT_METHODS.map((m) => ({
      ...m,
      count: 0,
      amount: 0,
      paid: 0,
    }));

    invoices.forEach((inv) => {
      const slot = stats.find((s) => s.id === inv.method.id);
      if (!slot) return;
      slot.count += 1;
      if (inv.status === 'paid') {
        slot.paid += 1;
        slot.amount += inv.amount;
      }
    });

    grid.innerHTML = stats.map((m) => `
      <div class="payment-method-card" style="--pm-accent:${m.accent}">
        <div class="payment-method-card__icon"><i class="fas ${m.icon}"></i></div>
        <div class="payment-method-card__name">${m.name}</div>
        <div class="payment-method-card__meta">
          <span class="payment-method-card__stat">${m.count} invoice${m.count !== 1 ? 's' : ''} · ${m.paid} paid</span>
          <span class="payment-method-card__amount">${fmtMoney(m.amount)} <small>received</small></span>
        </div>
      </div>`).join('');
  };

  const showPaymentPanel = (tab) => {
    document.querySelectorAll('.finance-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.payTab === tab);
    });
    document.getElementById('pay-panel-invoices')?.classList.toggle('hidden', tab !== 'invoices');
    document.getElementById('pay-panel-receipts')?.classList.toggle('hidden', tab !== 'receipts');
    document.getElementById('pay-panel-methods')?.classList.toggle('hidden', tab !== 'methods');
  };

  const renderPaymentsSection = () => {
    try {
      const invoices = buildInvoices();
      renderPaymentStats(invoices);

      if (paymentTab === 'receipts') paymentFilter = 'paid';

      renderInvoiceTable(invoices);
      renderPaymentMethods(invoices);
      showPaymentPanel(paymentTab);

      document.querySelectorAll('.finance-filter-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.payFilter === paymentFilter);
        btn.onclick = () => {
          paymentFilter = btn.dataset.payFilter;
          paymentTab = 'invoices';
          renderPaymentsSection();
        };
      });

      const countEl = document.getElementById('payments-count');
      if (countEl) countEl.textContent = `${invoices.length} invoices`;
    } catch (err) {
      console.error('Payments render error:', err);
      const tbody = document.getElementById('payments-invoices-body');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="fas fa-exclamation-circle"></i>Failed to load invoices.</div></td></tr>`;
      }
    }
  };

  window.setPaymentTab = (tab) => {
    if (tab === 'receipts') paymentFilter = 'paid';
    else if (tab === 'invoices' && paymentTab === 'receipts') paymentFilter = 'all';
    paymentTab = tab;
    renderPaymentsSection();
  };

  window.setPaymentFilter = (filter) => {
    paymentFilter = filter;
    paymentTab = 'invoices';
    renderPaymentsSection();
  };

  window.renderPaymentsSection = renderPaymentsSection;

  window.AdminFinance = {
    calcBookingPrice,
    calcCargoPrice,
    paymentStatusFromBooking,
    paymentStatusFromCargo,
    buildInvoices,
    fmtMoney,
    PAYMENT_METHODS,
  };
})();
