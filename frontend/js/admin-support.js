/**
 * Mideye Admin – Support Requests (API + booking/cargo derived)
 */
(() => {
  'use strict';

  const WHATSAPP_OFFICE = '252907816567';
  let supportFilter = 'all';
  let apiTickets = [];

  const normalizePhone = (phone) => {
    if (!phone) return WHATSAPP_OFFICE;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('252')) return digits;
    if (digits.startsWith('0') && digits.length === 10) return `252${digits.slice(1)}`;
    if (digits.length === 9) return `252${digits}`;
    return digits || WHATSAPP_OFFICE;
  };

  const supportBadge = (status) => {
    const map = {
      Open: ['badge-support-open', 'Open'],
      'In Progress': ['badge-support-progress', 'In Progress'],
      Resolved: ['badge-support-resolved', 'Resolved'],
    };
    const [cls, label] = map[status] || map.Open;
    return `<span class="badge-status ${cls}">${label}</span>`;
  };

  const mapApiTicket = (t) => ({
    id: t.ticket_code,
    db_id: t.id,
    source: t.source || 'whatsapp',
    customer: t.customer_name,
    phone: t.phone,
    email: t.email,
    subject: t.subject,
    message: t.message,
    status: t.status,
    priority: t.priority || 'Normal',
    created_at: t.created_at,
  });

  const buildDerivedTickets = () => {
    const tickets = [];

    (window.allBookings || []).forEach((b) => {
      if (b.status === 'Cancelled' && b.cancellation_reason) {
        tickets.push({
          id: `BK-${b.id}`,
          customer: b.passenger_name,
          phone: b.phone || b.email,
          subject: `Cancelled booking — ${b.origin} → ${b.destination}`,
          message: b.cancellation_reason,
          status: 'Open',
          priority: 'High',
          created_at: b.updated_at || b.created_at,
          derived: true,
        });
      }
    });

    (window.allCargo || []).forEach((c) => {
      if (c.special_requests && c.status !== 'Cancelled') {
        tickets.push({
          id: `CRG-${c.id}`,
          customer: c.sender_name,
          phone: c.sender_phone,
          subject: `Cargo ${c.tracking_id}`,
          message: c.special_requests,
          status: 'In Progress',
          priority: 'Normal',
          created_at: c.updated_at || c.created_at,
          derived: true,
        });
      }
    });

    return tickets;
  };

  const getAllTickets = () => {
    const derived = buildDerivedTickets();
    const merged = [...apiTickets];
    derived.forEach((d) => {
      if (!merged.some((m) => m.id === d.id)) merged.push(d);
    });
    return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const loadSupportTickets = async () => {
    const token = localStorage.getItem('mideye_token');
    const API = window.API || `${window.location.origin}/api`;
    try {
      const res = await fetch(`${API}/admin/support`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const { data } = await res.json();
      apiTickets = (data.tickets || []).map(mapApiTicket);
    } catch {
      apiTickets = [];
    }
  };

  const renderSupportStats = (tickets) => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('support-stat-open', tickets.filter((t) => t.status === 'Open').length);
    set('support-stat-progress', tickets.filter((t) => t.status === 'In Progress').length);
    set('support-stat-resolved', tickets.filter((t) => t.status === 'Resolved').length);
    set('support-stat-total', tickets.length);

    const badge = document.getElementById('badge-support');
    if (badge) {
      const open = tickets.filter((t) => t.status === 'Open').length;
      badge.textContent = open || '–';
    }
  };

  const buildWhatsAppReply = (ticket) => {
    const name = ticket.customer?.split(' ')[0] || 'Customer';
    return `Hello ${name}, this is Mideye Travel support regarding "${ticket.subject}". Ref: ${ticket.id}. How can we help you?`;
  };

  const renderSupportTable = (tickets) => {
    const tbody = document.getElementById('support-body');
    if (!tbody) return;
    const esc = window.esc || ((s) => String(s ?? '—'));

    const list = supportFilter === 'all'
      ? tickets
      : tickets.filter((t) => t.status === supportFilter);

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><i class="fas fa-headset"></i>No support tickets yet.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((t, i) => {
      const waPhone = normalizePhone(t.phone);
      const reply = buildWhatsAppReply(t);
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(reply)}`;
      const sourceBadge = t.source === 'whatsapp'
        ? '<span class="badge-status badge-confirmed" style="font-size:0.7rem">WhatsApp</span> '
        : '';
      return `
      <tr>
        <td class="td-muted">${i + 1}</td>
        <td class="td-bold">${sourceBadge}${esc(t.id)}</td>
        <td>
          <div class="td-bold">${esc(t.customer)}</div>
          <div class="td-muted" style="font-size:var(--fs-base)">${esc(t.phone || t.email)}</div>
        </td>
        <td>
          <div class="td-bold">${esc(t.subject)}</div>
          <div class="td-muted" style="font-size:var(--fs-base)">${esc(t.message?.slice(0, 60))}${t.message?.length > 60 ? '…' : ''}</div>
        </td>
        <td><span class="badge-status badge-${t.priority === 'High' ? 'cancelled' : 'pending'}">${t.priority}</span></td>
        <td>${supportBadge(t.status)}</td>
        <td class="td-muted">${new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
        <td>
          <div class="actions-group">
            <a class="btn-whatsapp" href="${waUrl}" target="_blank" rel="noopener" title="Reply on WhatsApp">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
            ${t.status !== 'Resolved' && t.db_id ? `
              <button class="btn-action btn-action-brown" onclick="resolveSupportTicket(${t.db_id})" title="Mark resolved">
                <i class="fas fa-check"></i>
              </button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  const resolveSupportTicket = async (dbId) => {
    const token = localStorage.getItem('mideye_token');
    const API = window.API || `${window.location.origin}/api`;
    try {
      const res = await fetch(`${API}/admin/support/${dbId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'Resolved' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      window.showToast?.('Ticket marked as resolved', 'fa-check-circle');
      await renderSupportSection();
    } catch {
      window.showToast?.('Could not update ticket', 'fa-times-circle');
    }
  };

  const renderSupportSection = async () => {
    const tbody = document.getElementById('support-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-loading"><div class="spinner"></div>Loading tickets…</div></td></tr>`;
    }
    await loadSupportTickets();
    const tickets = getAllTickets();
    renderSupportStats(tickets);
    renderSupportTable(tickets);

    document.querySelectorAll('.support-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.supportFilter === supportFilter);
      btn.onclick = () => {
        supportFilter = btn.dataset.supportFilter;
        renderSupportSection();
      };
    });
  };

  window.setSupportFilter = (filter) => {
    supportFilter = filter;
    renderSupportSection();
  };
  window.resolveSupportTicket = resolveSupportTicket;
  window.renderSupportSection = renderSupportSection;
  window.getSupportOpenCount = () => getAllTickets().filter((t) => t.status === 'Open').length;
})();
