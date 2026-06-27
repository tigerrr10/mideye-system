/**
 * Homepage WhatsApp support — saves ticket then opens WhatsApp
 */
(() => {
  'use strict';

  const WHATSAPP_OFFICE = '252907816567';
  const API = window.location.origin + '/api';

  const normalizePhone = (phone) => {
    const cleaned = String(phone || '').replace(/[\s-]/g, '');
    if (/^0\d{9}$/.test(cleaned)) return `+252${cleaned.slice(1)}`;
    if (/^\+252\d{9}$/.test(cleaned)) return cleaned;
    if (/^252\d{9}$/.test(cleaned)) return `+${cleaned}`;
    return null;
  };

  const openModal = () => {
    document.getElementById('supportContactModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    document.getElementById('supportContactModal')?.classList.remove('open');
    document.body.style.overflow = '';
  };

  const submitSupport = async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('support-name');
    const phoneEl = document.getElementById('support-phone');
    const msgEl = document.getElementById('support-message');
    const errEl = document.getElementById('support-form-error');
    const btn = document.getElementById('support-submit-btn');

    const customer_name = nameEl?.value?.trim();
    const phone = phoneEl?.value?.trim();
    const message = msgEl?.value?.trim();

    if (!customer_name || !phone || !message) {
      if (errEl) errEl.textContent = 'Fadlan buuxi dhammaan goobaha.';
      return;
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      if (errEl) errEl.textContent = 'Geli lambar sax ah (tusaale: +252 90 1234567).';
      return;
    }

    if (errEl) errEl.textContent = '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    }

    try {
      const res = await fetch(`${API}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name,
          phone: normalized,
          message,
          subject: message.slice(0, 80),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send request');
      }

      const code = data.data?.ticket?.ticket_code || '';
      const waText =
        `Salaam Mideye Travel,\n\n${message}\n\n` +
        (code ? `Ticket: ${code}\n` : '') +
        `Magacayga: ${customer_name}\nLambarkayga: ${normalized}`;

      closeModal();
      document.getElementById('supportContactForm')?.reset();
      window.open(`https://wa.me/${WHATSAPP_OFFICE}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Cilad ayaa dhacday. Isku day mar kale.';
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Send &amp; Open WhatsApp';
      }
    }
  };

  const init = () => {
    const floatBtn = document.getElementById('whatsappFloatBtn');
    floatBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });

    document.getElementById('supportContactForm')?.addEventListener('submit', submitSupport);
    document.getElementById('supportModalClose')?.addEventListener('click', closeModal);
    document.getElementById('supportContactModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'supportContactModal') closeModal();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.closeSupportContactModal = closeModal;
})();
