/**
 * Mideye – Confirm & Pay modal
 * Shared payment confirmation flow for Travel Booking and Cargo Shipment.
 */

const PAY_WHATSAPP_NUMBER = typeof MIDEYE_WHATSAPP_NUMBER !== 'undefined'
  ? MIDEYE_WHATSAPP_NUMBER
  : '252907816567';

const PAYMENT_OPTIONS = {
  mobile_money: {
    label: 'Mobile Money',
    hint: 'Pay via EVC Plus, Zaad, or Sahal',
    icon: 'fa-mobile-alt',
    waLabel: 'Mobile Money',
    waNote: 'I have selected Mobile Money as my payment method.',
  },
  cash_office: {
    label: 'Cash on Office',
    hint: 'Pay in person at our Galkacyo office',
    icon: 'fa-building',
    waLabel: 'Cash on Office',
    waNote: 'I will pay at the office (Cash on Office).',
  },
};

let activeSession = null;
let modalReady = false;

const generateBookingRef = (prefix) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${rand}${Date.now().toString().slice(-4)}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const buildWhatsAppMessage = (data) => {
  const payment = PAYMENT_OPTIONS[data.paymentMethod];
  const lines = [
    'Hello,',
    '',
    'I would like to confirm my booking.',
    '',
    `Booking Reference: ${data.reference}`,
    `Customer Name: ${data.customerName}`,
    `Phone Number: ${data.phone}`,
    `Service Type: ${data.serviceType}`,
    `Destination: ${data.destination}`,
    `Amount: ${data.amount}`,
    `Payment Method: ${payment?.waLabel || data.paymentMethod}`,
    '',
    payment?.waNote || '',
    '',
    'Please assist me with payment confirmation.',
  ];
  return lines.filter((l, i, arr) => !(l === '' && arr[i + 1] === '')).join('\n');
};

const redirectToWhatsApp = (message) => {
  const url = `https://wa.me/${PAY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.location.href = url;
};

const getModalEls = () => ({
  overlay: document.getElementById('confirmPayOverlay'),
  formView: document.getElementById('confirmPayFormView'),
  successView: document.getElementById('confirmPaySuccessView'),
  ref: document.getElementById('confirmPayRef'),
  customer: document.getElementById('confirmPayCustomer'),
  service: document.getElementById('confirmPayService'),
  destination: document.getElementById('confirmPayDestination'),
  date: document.getElementById('confirmPayDate'),
  amount: document.getElementById('confirmPayAmount'),
  details: document.getElementById('confirmPayDetails'),
  confirmCheck: document.getElementById('confirmPayCheckbox'),
  payBtn: document.getElementById('confirmPayBtn'),
  error: document.getElementById('confirmPayError'),
  successTitle: document.getElementById('confirmPaySuccessTitle'),
  successMsg: document.getElementById('confirmPaySuccessMsg'),
  doneBtn: document.getElementById('confirmPayDoneBtn'),
});

const updatePayButtonState = () => {
  const { confirmCheck, payBtn } = getModalEls();
  if (!payBtn) return;
  const payment = document.querySelector('input[name="confirmPayMethod"]:checked');
  const ready = payment && confirmCheck?.checked;
  payBtn.disabled = !ready;
};

const renderDetails = (summary) => {
  const { details } = getModalEls();
  if (!details) return;
  details.innerHTML = (summary || [])
    .map(({ label, value }) => `
      <div class="confirm-pay-detail-row">
        <span>${label}</span>
        <span>${value || '—'}</span>
      </div>`)
    .join('');
};

const showError = (msg) => {
  const { error } = getModalEls();
  if (!error) return;
  error.textContent = msg;
  error.classList.add('is-visible');
};

const hideError = () => {
  const { error } = getModalEls();
  error?.classList.remove('is-visible');
};

const resetModalForm = () => {
  const els = getModalEls();
  document.querySelectorAll('input[name="confirmPayMethod"]').forEach((r) => { r.checked = false; });
  if (els.confirmCheck) els.confirmCheck.checked = false;
  els.formView?.classList.remove('is-hidden');
  els.successView?.classList.remove('is-visible');
  hideError();
  updatePayButtonState();
};

const populateModal = (session) => {
  const els = getModalEls();
  if (els.ref) els.ref.innerHTML = `<i class="fas fa-hashtag"></i> ${session.reference}`;
  if (els.customer) els.customer.textContent = session.customerName;
  if (els.service) els.service.textContent = session.serviceType;
  if (els.destination) els.destination.textContent = session.destination;
  if (els.date) els.date.textContent = session.date;
  if (els.amount) els.amount.textContent = session.amountFormatted;
  renderDetails(session.summary);
  resetModalForm();
};

const showSuccess = (session, finalRef) => {
  const els = getModalEls();
  const statusLabel = session.serviceType === 'Cargo' ? 'Pending' : 'Pending';
  els.formView?.classList.add('is-hidden');
  els.successView?.classList.add('is-visible');
  if (els.successTitle) {
    els.successTitle.textContent = session.serviceType === 'Travel'
      ? 'Booking Submitted!'
      : 'Shipment Submitted!';
  }
  if (els.successMsg) {
    els.successMsg.innerHTML = `Your reference <strong>${finalRef}</strong> has been recorded with status <strong>${statusLabel}</strong>. You are being redirected to WhatsApp to complete payment confirmation.`;
  }
};

const closeConfirmPayModal = () => {
  const { overlay } = getModalEls();
  overlay?.classList.remove('is-open');
  document.body.style.overflow = '';
  activeSession = null;
};

const handlePayNow = async () => {
  if (!activeSession) return;

  const paymentInput = document.querySelector('input[name="confirmPayMethod"]:checked');
  const { confirmCheck, payBtn } = getModalEls();

  hideError();

  if (!paymentInput) {
    showError('Please select a payment method.');
    return;
  }
  if (!confirmCheck?.checked) {
    showError('Please confirm that all booking information is correct.');
    return;
  }

  const paymentMethod = paymentInput.value;
  const originalHtml = payBtn.innerHTML;
  payBtn.disabled = true;
  payBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing…';

  let finalRef = activeSession.reference;

  try {
    if (typeof activeSession.submitFn === 'function') {
      const result = await activeSession.submitFn();
      if (result == null) {
        throw new Error('Your request could not be saved. Please log in and try again.');
      }
      if (result?.reference) finalRef = result.reference;
    }
  } catch (err) {
    showError(err.message || 'Could not save your request. Please try again.');
    payBtn.innerHTML = originalHtml;
    updatePayButtonState();
    return;
  }

  const waMessage = buildWhatsAppMessage({
    reference: finalRef,
    customerName: activeSession.customerName,
    phone: activeSession.phone,
    serviceType: activeSession.serviceType,
    destination: activeSession.destination,
    amount: activeSession.amountFormatted,
    paymentMethod,
  });

  showSuccess(activeSession, finalRef);

  if (typeof activeSession.onSuccess === 'function') {
    activeSession.onSuccess({ reference: finalRef, paymentMethod });
  }

  setTimeout(() => redirectToWhatsApp(waMessage), 600);
};

const injectModal = () => {
  if (document.getElementById('confirmPayOverlay')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="confirm-pay-overlay" id="confirmPayOverlay" role="dialog" aria-modal="true" aria-labelledby="confirmPayTitle">
      <div class="confirm-pay-modal">
        <div class="confirm-pay-header">
          <div>
            <h2 id="confirmPayTitle">Confirm &amp; Pay</h2>
            <p>Review your details and choose a payment method</p>
          </div>
          <button type="button" class="confirm-pay-close" id="confirmPayCloseBtn" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div id="confirmPayFormView" class="confirm-pay-form-view">
          <div class="confirm-pay-body">
            <div class="confirm-pay-ref" id="confirmPayRef"></div>

            <div class="confirm-pay-highlights">
              <div class="confirm-pay-highlight">
                <div class="confirm-pay-highlight__label">Customer</div>
                <div class="confirm-pay-highlight__value" id="confirmPayCustomer">—</div>
              </div>
              <div class="confirm-pay-highlight">
                <div class="confirm-pay-highlight__label">Service Type</div>
                <div class="confirm-pay-highlight__value" id="confirmPayService">—</div>
              </div>
              <div class="confirm-pay-highlight">
                <div class="confirm-pay-highlight__label">Destination</div>
                <div class="confirm-pay-highlight__value" id="confirmPayDestination">—</div>
              </div>
              <div class="confirm-pay-highlight">
                <div class="confirm-pay-highlight__label">Date</div>
                <div class="confirm-pay-highlight__value" id="confirmPayDate">—</div>
              </div>
              <div class="confirm-pay-highlight confirm-pay-highlight--full confirm-pay-highlight--amount">
                <div class="confirm-pay-highlight__label">Total Amount</div>
                <div class="confirm-pay-highlight__value" id="confirmPayAmount">—</div>
              </div>
            </div>

            <p class="confirm-pay-section-title">Booking Summary</p>
            <div class="confirm-pay-details" id="confirmPayDetails"></div>

            <p class="confirm-pay-section-title">Payment Method</p>
            <div class="confirm-pay-methods">
              <label class="confirm-pay-method">
                <input type="radio" name="confirmPayMethod" value="mobile_money"/>
                <div class="confirm-pay-method__card">
                  <div class="confirm-pay-method__icon"><i class="fas fa-mobile-alt"></i></div>
                  <div class="confirm-pay-method__label">Mobile Money</div>
                  <div class="confirm-pay-method__hint">EVC Plus, Zaad, or Sahal</div>
                </div>
              </label>
              <label class="confirm-pay-method">
                <input type="radio" name="confirmPayMethod" value="cash_office"/>
                <div class="confirm-pay-method__card">
                  <div class="confirm-pay-method__icon"><i class="fas fa-building"></i></div>
                  <div class="confirm-pay-method__label">Cash on Office</div>
                  <div class="confirm-pay-method__hint">Pay at our Galkacyo office</div>
                </div>
              </label>
            </div>

            <label class="confirm-pay-confirm">
              <input type="checkbox" id="confirmPayCheckbox"/>
              <span>I confirm that all booking information is correct.</span>
            </label>

            <div class="confirm-pay-error" id="confirmPayError"></div>

            <button type="button" class="btn-pay-now" id="confirmPayBtn" disabled>
              <i class="fab fa-whatsapp"></i> Pay Now
            </button>
          </div>
        </div>

        <div class="confirm-pay-success" id="confirmPaySuccessView">
          <div class="confirm-pay-success__icon"><i class="fas fa-check"></i></div>
          <h3 id="confirmPaySuccessTitle">Booking Submitted!</h3>
          <p id="confirmPaySuccessMsg"></p>
          <button type="button" class="btn-confirm-pay-done" id="confirmPayDoneBtn">Done</button>
        </div>
      </div>
    </div>`);

  const els = getModalEls();

  els.overlay?.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeConfirmPayModal();
  });
  document.getElementById('confirmPayCloseBtn')?.addEventListener('click', closeConfirmPayModal);
  els.doneBtn?.addEventListener('click', closeConfirmPayModal);
  els.payBtn?.addEventListener('click', handlePayNow);

  document.querySelectorAll('input[name="confirmPayMethod"]').forEach((r) => {
    r.addEventListener('change', updatePayButtonState);
  });
  els.confirmCheck?.addEventListener('change', updatePayButtonState);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.overlay?.classList.contains('is-open')) {
      closeConfirmPayModal();
    }
  });

  modalReady = true;
};

const openConfirmPayModal = (session) => {
  if (!modalReady) injectModal();
  if (!session) return;

  activeSession = session;
  populateModal(session);

  const { overlay } = getModalEls();
  overlay?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
};

window.openConfirmPayModal = openConfirmPayModal;
window.closeConfirmPayModal = closeConfirmPayModal;
window.generateBookingRef = generateBookingRef;
window.formatDisplayDate = formatDisplayDate;

document.addEventListener('DOMContentLoaded', injectModal);
