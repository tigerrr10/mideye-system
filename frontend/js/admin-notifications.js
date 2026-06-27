/**
 * Mideye Admin – WhatsApp Notifications
 * Tickets, delays, cargo, payments
 */
(() => {
  'use strict';

  const WHATSAPP_OFFICE = '252907816567';
  const WA_LOG_KEY = 'mideye_whatsapp_log';
  const LEGACY_SMS_KEY = 'mideye_sms_log';

  const WA_TEMPLATES = {
    ticket: {
      label: 'E-Ticket Ready',
      icon: 'fa-ticket-alt',
      badge: 'badge-notif-ticket',
      build: (ctx) =>
        `Salaam ${ctx.name || 'macmiil'},\n\n` +
        `Mideye Travel — E-ticket-kaaga waa diyaar.\n` +
        `✈️ Route: ${ctx.route || '—'}\n` +
        `📋 Ref: ${ctx.ref || '—'}\n\n` +
        `Mahadsanid,\nMideye Travel`,
    },
    delay: {
      label: 'Flight Delay',
      icon: 'fa-clock',
      badge: 'badge-notif-delay',
      build: (ctx) =>
        `Salaam ${ctx.name || 'macmiil'},\n\n` +
        `Mideye Travel — Duulimaadkaaga waa dib u dhacay.\n` +
        `✈️ Flight: ${ctx.ref || '—'}\n` +
        `📍 Route: ${ctx.route || '—'}\n` +
        `🕐 New departure: ${ctx.extra || 'TBC'}\n\n` +
        `Waan ka xunnahay dhibta. Nala soo xiriir: +${WHATSAPP_OFFICE}`,
    },
    cargo: {
      label: 'Cargo Update',
      icon: 'fa-box',
      badge: 'badge-notif-cargo',
      build: (ctx) =>
        `Salaam ${ctx.name || 'macmiil'},\n\n` +
        `Mideye Travel — Cargo update.\n` +
        `📦 Tracking: ${ctx.ref || '—'}\n` +
        `📍 Destination: ${ctx.dest || '—'}\n` +
        `📊 Status: ${ctx.status || 'updated'}\n\n` +
        `Mahadsanid,\nMideye Travel`,
    },
    payment: {
      label: 'Payment Reminder',
      icon: 'fa-credit-card',
      badge: 'badge-notif-payment',
      build: (ctx) =>
        `Salaam ${ctx.name || 'macmiil'},\n\n` +
        `Mideye Travel — Lacag bixinta waa la sugayaa.\n` +
        `📋 Ref: ${ctx.ref || '—'}\n` +
        `💵 Amount: ${ctx.amount || '—'}\n\n` +
        `Ku bixi EVC Plus, Zaad, ama WhatsApp: +${WHATSAPP_OFFICE}`,
    },
  };

  const normalizePhone = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('252')) return digits;
    if (digits.startsWith('0') && digits.length === 10) return `252${digits.slice(1)}`;
    if (digits.length === 9) return `252${digits}`;
    return digits;
  };

  const getWaLog = () => {
    try {
      const current = localStorage.getItem(WA_LOG_KEY);
      if (current) return JSON.parse(current);
      const legacy = localStorage.getItem(LEGACY_SMS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(WA_LOG_KEY, legacy);
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  };

  const saveWaLog = (entries) => {
    localStorage.setItem(WA_LOG_KEY, JSON.stringify(entries.slice(0, 200)));
  };

  const getRecipients = () => {
    const list = [];
    (window.allBookings || []).forEach((b) => {
      if (b.phone) {
        list.push({
          id: `b-${b.id}`,
          name: b.passenger_name,
          phone: b.phone,
          label: `${b.passenger_name} · ${b.origin}→${b.destination}`,
        });
      }
    });
    (window.allCargo || []).forEach((c) => {
      if (c.sender_phone) {
        list.push({
          id: `c-${c.id}`,
          name: c.sender_name,
          phone: c.sender_phone,
          label: `${c.sender_name} · Cargo ${c.tracking_id}`,
        });
      }
    });
    const seen = new Set();
    return list.filter((r) => {
      const key = normalizePhone(r.phone);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const notifBadge = (type) => {
    const t = WA_TEMPLATES[type] || WA_TEMPLATES.ticket;
    return `<span class="badge-status ${t.badge}">${t.label}</span>`;
  };

  const getRecipientContext = () => {
    const recipientId = document.getElementById('notif-recipient')?.value;
    const recipientSel = document.getElementById('notif-recipient');
    const phoneInput = document.getElementById('notif-phone');
    const phone = normalizePhone(phoneInput?.value);
    let ctx = { ref: '—', route: '—', status: '—', dest: '—', amount: '—', extra: '—', name: 'macmiil' };

    const fillFromBooking = (b) => {
      const firstName = (b.passenger_name || '').split(' ')[0];
      return {
        name: firstName || 'macmiil',
        ref: `BK-${b.id}`,
        route: `${b.origin} → ${b.destination}`,
        status: b.status,
        amount: window.AdminFinance?.fmtMoney?.(window.AdminFinance.calcBookingPrice(b)) || '—',
        extra: b.travel_date ? new Date(b.travel_date).toLocaleDateString('en-GB') : 'TBC',
      };
    };

    const fillFromCargo = (c) => {
      const firstName = (c.sender_name || '').split(' ')[0];
      return {
        name: firstName || 'macmiil',
        ref: c.tracking_id,
        dest: c.destination,
        status: c.status,
        amount: window.AdminFinance?.fmtMoney?.(window.AdminFinance.calcCargoPrice(c)) || '—',
      };
    };

    if (recipientId?.startsWith('b-')) {
      const b = (window.allBookings || []).find((x) => `b-${x.id}` === recipientId);
      if (b) ctx = fillFromBooking(b);
    } else if (recipientId?.startsWith('c-')) {
      const c = (window.allCargo || []).find((x) => `c-${x.id}` === recipientId);
      if (c) ctx = fillFromCargo(c);
    } else if (phone) {
      const booking = (window.allBookings || []).find((b) => normalizePhone(b.phone) === phone);
      const cargo = (window.allCargo || []).find((c) => normalizePhone(c.sender_phone) === phone);
      if (booking) ctx = fillFromBooking(booking);
      else if (cargo) ctx = fillFromCargo(cargo);
    } else if (recipientSel?.selectedOptions[0]?.value) {
      const label = recipientSel.selectedOptions[0].textContent?.split(' · ')[0] || '';
      ctx.name = label.split(' ')[0] || 'macmiil';
    }

    return ctx;
  };

  const renderNotificationStats = () => {
    const log = getWaLog();
    const today = new Date().toDateString();
    const sentToday = log.filter((e) => new Date(e.sent_at).toDateString() === today).length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('notif-stat-total', log.length);
    set('notif-stat-today', sentToday);
    set('notif-stat-ticket', log.filter((e) => e.type === 'ticket').length);
    set('notif-stat-cargo', log.filter((e) => e.type === 'cargo').length);
  };

  const renderRecipientSelect = () => {
    const sel = document.getElementById('notif-recipient');
    if (!sel) return;
    const prev = sel.value;
    const prevPhone = document.getElementById('notif-phone')?.value;
    const recipients = getRecipients();
    sel.innerHTML = `<option value="">— Select customer —</option>${recipients.map((r) =>
      `<option value="${r.id}" data-phone="${normalizePhone(r.phone)}">${r.label}</option>`
    ).join('')}`;
    if (prev && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    }
    const phoneEl = document.getElementById('notif-phone');
    if (phoneEl && !phoneEl.value && sel.value) {
      phoneEl.value = sel.selectedOptions[0]?.dataset.phone || prevPhone || '';
    }
  };

  const applyTemplate = () => {
    const type = document.getElementById('notif-type')?.value || 'ticket';
    const msgEl = document.getElementById('notif-message');
    if (!msgEl) return false;

    const ctx = getRecipientContext();
    const template = WA_TEMPLATES[type];
    if (!template) return false;

    msgEl.value = template.build(ctx);
    msgEl.scrollTop = 0;
    return true;
  };

  let notifFormBound = false;

  const bindNotificationForm = () => {
    if (notifFormBound) return;
    const typeEl = document.getElementById('notif-type');
    const recipientEl = document.getElementById('notif-recipient');
    const phoneEl = document.getElementById('notif-phone');

    typeEl?.addEventListener('change', () => applyTemplate());
    recipientEl?.addEventListener('change', () => {
      if (phoneEl && recipientEl.value) {
        phoneEl.value = recipientEl.selectedOptions[0]?.dataset.phone || '';
      }
      applyTemplate();
    });
    phoneEl?.addEventListener('input', () => {
      clearTimeout(phoneEl._notifDebounce);
      phoneEl._notifDebounce = setTimeout(() => applyTemplate(), 400);
    });
    phoneEl?.addEventListener('blur', () => applyTemplate());

    notifFormBound = true;
  };

  const renderWaLog = () => {
    const tbody = document.getElementById('notif-log-body');
    if (!tbody) return;
    const esc = window.esc || ((s) => String(s ?? '—'));
    const log = getWaLog();

    if (!log.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><i class="fab fa-whatsapp"></i>No WhatsApp messages sent yet.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = log.map((e, i) => `
      <tr>
        <td class="td-muted">${i + 1}</td>
        <td>${notifBadge(e.type)}</td>
        <td>
          <div class="td-bold">${esc(e.recipient_name)}</div>
          <div class="td-muted" style="font-size:var(--fs-base)">${esc(e.phone)}</div>
        </td>
        <td class="td-muted" style="max-width:280px;white-space:pre-line">${esc(e.message?.slice(0, 80))}${(e.message?.length > 80) ? '…' : ''}</td>
        <td class="td-muted">${new Date(e.sent_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td><span class="badge-status badge-confirmed"><i class="fab fa-whatsapp"></i> Sent</span></td>
      </tr>`).join('');
  };

  const sendWhatsAppNotification = () => {
    const type = document.getElementById('notif-type')?.value || 'ticket';
    const recipientSel = document.getElementById('notif-recipient');
    const phoneInput = document.getElementById('notif-phone');
    const msg = document.getElementById('notif-message')?.value?.trim();

    let phone = phoneInput?.value?.trim();
    let name = 'Customer';

    if (recipientSel?.value) {
      const opt = recipientSel.selectedOptions[0];
      phone = opt?.dataset.phone || phone;
      name = opt?.textContent?.split(' · ')[0] || name;
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      window.showToast?.('Geli lambarka WhatsApp sax ah', 'fa-times-circle');
      return;
    }
    if (!msg) {
      window.showToast?.('Geli fariinta', 'fa-times-circle');
      return;
    }

    const log = getWaLog();
    log.unshift({
      id: Date.now(),
      type,
      channel: 'whatsapp',
      recipient_name: name,
      phone: `+${normalized}`,
      message: msg,
      sent_at: new Date().toISOString(),
    });
    saveWaLog(log);

    const waUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    window.showToast?.('WhatsApp waa la furay — dir fariinta customer-ka', 'fa-check-circle');
    renderNotificationsSection();
  };

  const renderNotificationsSection = () => {
    bindNotificationForm();
    renderNotificationStats();
    renderRecipientSelect();
    renderWaLog();
    applyTemplate();
  };

  window.onNotifRecipientChange = () => {
    const sel = document.getElementById('notif-recipient');
    const phoneEl = document.getElementById('notif-phone');
    if (sel?.value && phoneEl) {
      phoneEl.value = sel.selectedOptions[0]?.dataset.phone || '';
    }
    applyTemplate();
  };
  window.sendWhatsAppNotification = sendWhatsAppNotification;
  window.sendSmsNotification = sendWhatsAppNotification;
  window.renderNotificationsSection = renderNotificationsSection;
})();
