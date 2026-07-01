/**
 * Mideye – Cargo Request Wizard
 * Step-by-step flow matching the flight booking wizard.
 */

const CARGO_WIZARD_STEPS = [1, 2, 3, 4, 5, 6, 7, 8];

let currentCargoStep = 1;
let pendingCargoSession = null;

const getCargoStepIndex = (step) => CARGO_WIZARD_STEPS.indexOf(step);

const getCargoForm = () => document.getElementById('cargoRequestForm');

const getCargoFieldEls = () => {
  const form = getCargoForm();
  if (!form) return {};
  const textInputs = form.querySelectorAll('input[type="text"]');
  const telInputs = form.querySelectorAll('input[type="tel"]');
  return {
    form,
    senderName: textInputs[0],
    senderAddress: textInputs[1],
    recipientName: textInputs[2],
    senderPhone: telInputs[0],
    recipientPhone: telInputs[1],
    senderEmail: form.querySelector('input[type="email"]'),
    destination: form.querySelector('#cargoDestination'),
    cargoType: form.querySelector('#cargoType'),
    pieces: form.querySelector('#cargoPieces'),
    weight: document.getElementById('cargoWeight'),
    description: form.querySelector('#cargoDescription'),
  };
};

const markInvalid = (el, invalid) => {
  el?.classList.toggle('is-invalid', invalid);
  return !invalid;
};

const validateCargoWizardStep = (step) => {
  const f = getCargoFieldEls();

  if (step === 1) {
    let ok = true;
    ok = markInvalid(f.senderName, !f.senderName?.value.trim()) && ok;
    ok = markInvalid(f.senderPhone, !f.senderPhone?.value.trim()) && ok;
    if (!ok) showCargoWizardToast('Please complete all required sender fields.');
    return ok;
  }

  if (step === 2) {
    let ok = true;
    ok = markInvalid(f.recipientName, !f.recipientName?.value.trim()) && ok;
    ok = markInvalid(f.recipientPhone, !f.recipientPhone?.value.trim()) && ok;
    ok = markInvalid(f.destination, !f.destination?.value) && ok;
    if (!ok) showCargoWizardToast('Please complete all required recipient fields.');
    return ok;
  }

  if (step === 3) {
    let ok = true;
    ok = markInvalid(f.cargoType, !f.cargoType?.value) && ok;
    ok = markInvalid(f.pieces, !(f.pieces?.value && Number(f.pieces.value) > 0)) && ok;
    ok = markInvalid(f.weight, !(f.weight?.value && Number(f.weight.value) > 0)) && ok;
    ok = markInvalid(f.description, !f.description?.value.trim()) && ok;
    if (!ok) showCargoWizardToast('Please complete all required cargo details.');
    return ok;
  }

  return true;
};

const showCargoWizardToast = (msg) => {
  if (typeof window.showAlert === 'function') {
    window.showAlert(msg, 'error');
    return;
  }
  alert(msg);
};

const buildCargoSession = () => {
  const form = getCargoForm();
  if (!form || typeof window.collectCargoPayload !== 'function') return null;

  const payload = window.collectCargoPayload(form);
  if (!window.validateCargoPayload?.(payload)) return null;

  const destLabel = window.CitiesLoader?.getName(payload.destination)
    || payload.destination;
  const cargoLabels = {
    electronics: 'Electronics',
    textiles: 'Textiles & Clothing',
    machinery: 'Machinery & Parts',
    food: 'Food & Beverages',
    medicine: 'Medicine / Dawo',
    furniture: 'Furniture',
    documents: 'Documents',
    other: 'Other',
  };
  const cargoLabel = cargoLabels[payload.cargo_type] || payload.cargo_type;
  const amount = window.getCargoAmount?.(form) || 0;
  const amountFormatted = amount > 0 ? `$${amount.toFixed(2)}` : 'To be confirmed';
  const reference = window.generateBookingRef?.('ME-CG') || `ME-CG-${Date.now()}`;
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return {
    serviceType: 'Cargo',
    reference,
    customerName: payload.sender_name,
    phone: payload.sender_phone,
    email: payload.sender_email,
    destination: destLabel,
    date: today,
    amount,
    amountFormatted,
    summary: [
      { label: 'Sender', value: `${payload.sender_name} (${payload.sender_phone})` },
      { label: 'Recipient', value: `${payload.recipient_name} (${payload.recipient_phone})` },
      { label: 'Destination', value: destLabel },
      { label: 'Cargo Type', value: cargoLabel },
      { label: 'Pieces', value: String(payload.pieces) },
      { label: 'Weight', value: `${payload.weight} kg` },
      { label: 'Shipping Speed', value: payload.shipping_speed === 'express' ? 'Express' : 'Standard' },
      { label: 'Description', value: payload.description },
    ],
    submitFn: async () => {
      const API = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000/api';
      const token = localStorage.getItem('mideye_token');
      const res = await fetch(`${API}/cargo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (window.handleUnauthorized?.(res)) {
        throw new Error('Session expired. Please log in again.');
      }
      const data = await res.json();
      if (!data.success) {
        const msg = data.errors
          ? data.errors.map((er) => er.message).join(', ')
          : data.message;
        throw new Error(msg || 'Cargo request could not be saved.');
      }
      return { reference: data.data.tracking_id, cargo: data.data.cargo };
    },
    onSuccess: ({ reference: trackingId }) => {
      window.clearDashboardCache?.();
      const refEl = document.getElementById('cargoConfirmedRef');
      const msgEl = document.getElementById('cargoConfirmedMsg');
      if (refEl) refEl.textContent = `Tracking ID: ${trackingId}`;
      if (msgEl) {
        msgEl.textContent = 'Your cargo request has been recorded. You are being redirected to WhatsApp to complete payment confirmation.';
      }
    },
  };
};

const renderCargoReview = () => {
  const container = document.getElementById('cargoReviewSummary');
  const session = buildCargoSession();
  if (!container || !session) return;

  pendingCargoSession = session;
  container.innerHTML = session.summary.map(({ label, value }) => `
    <div class="booking-review-row">
      <span>${label}</span>
      <span>${value || '—'}</span>
    </div>`).join('') + `
    <div class="booking-review-row booking-review-row--total">
      <span>Estimated Total</span>
      <span>${session.amountFormatted}</span>
    </div>`;
};

const populateCargoPaymentStep = () => {
  const session = pendingCargoSession || buildCargoSession();
  if (!session) return;
  pendingCargoSession = session;

  const refEl = document.getElementById('cargoWizardPayRef');
  const highlights = document.getElementById('cargoWizardPayHighlights');
  if (refEl) refEl.innerHTML = `<i class="fas fa-hashtag"></i> ${session.reference}`;
  if (highlights) {
    highlights.innerHTML = `
      <div class="confirm-pay-highlight">
        <div class="confirm-pay-highlight__label">Sender</div>
        <div class="confirm-pay-highlight__value">${session.customerName}</div>
      </div>
      <div class="confirm-pay-highlight">
        <div class="confirm-pay-highlight__label">Destination</div>
        <div class="confirm-pay-highlight__value">${session.destination}</div>
      </div>
      <div class="confirm-pay-highlight">
        <div class="confirm-pay-highlight__label">Date</div>
        <div class="confirm-pay-highlight__value">${session.date}</div>
      </div>
      <div class="confirm-pay-highlight confirm-pay-highlight--full confirm-pay-highlight--amount">
        <div class="confirm-pay-highlight__label">Estimated Total</div>
        <div class="confirm-pay-highlight__value">${session.amountFormatted}</div>
      </div>`;
  }

  document.querySelectorAll('input[name="cargoWizardPayMethod"]').forEach((r) => { r.checked = false; });
  const confirm = document.getElementById('cargoWizardPayConfirm');
  if (confirm) confirm.checked = false;
  document.getElementById('cargoWizardPayError')?.classList.remove('is-visible');
  updateCargoWizardPayButton();
};

const updateCargoWizardPayButton = () => {
  const payBtn = document.getElementById('cargoWizardPayBtn');
  if (!payBtn) return;
  const payment = document.querySelector('input[name="cargoWizardPayMethod"]:checked');
  const confirmed = document.getElementById('cargoWizardPayConfirm')?.checked;
  payBtn.disabled = !(payment && confirmed);
};

const showCargoWizardPayError = (msg) => {
  const error = document.getElementById('cargoWizardPayError');
  if (!error) return;
  error.textContent = msg;
  error.classList.add('is-visible');
};

const goToCargoStep = (step) => {
  if (!CARGO_WIZARD_STEPS.includes(step)) return;
  currentCargoStep = step;

  document.querySelectorAll('.cargo-step').forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.step) === step);
  });

  document.querySelectorAll('#cargoWizardProgress li').forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.remove('is-active', 'is-done');
    if (s === step) li.classList.add('is-active');
    else if (getCargoStepIndex(s) < getCargoStepIndex(step)) li.classList.add('is-done');
  });

  const backBtn = document.getElementById('cargoWizardBackBtn');
  const nextBtn = document.getElementById('cargoWizardNextBtn');
  const payBtn = document.getElementById('cargoWizardPayBtn');
  const nav = document.getElementById('cargoWizardNav');

  if (backBtn) backBtn.disabled = step === 1;
  if (nextBtn) {
    nextBtn.hidden = step === 7 || step === 8;
    nextBtn.innerHTML = step === 6
      ? 'Continue to Payment <i class="fas fa-arrow-right"></i>'
      : 'Next <i class="fas fa-arrow-right"></i>';
  }
  if (payBtn) payBtn.hidden = step !== 7;
  if (nav) nav.style.display = step === 8 ? 'none' : 'flex';

  if (step === 6) renderCargoReview();
  if (step === 7) populateCargoPaymentStep();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleCargoWizardNext = () => {
  if (!validateCargoWizardStep(currentCargoStep)) return;

  const idx = getCargoStepIndex(currentCargoStep);
  if (idx < 0 || idx >= CARGO_WIZARD_STEPS.length - 1) return;

  if (currentCargoStep === 5) {
    pendingCargoSession = buildCargoSession();
  }

  goToCargoStep(CARGO_WIZARD_STEPS[idx + 1]);
};

const handleCargoWizardBack = () => {
  const idx = getCargoStepIndex(currentCargoStep);
  if (idx <= 0) return;
  goToCargoStep(CARGO_WIZARD_STEPS[idx - 1]);
};

const handleCargoWizardPayNow = async () => {
  const payBtn = document.getElementById('cargoWizardPayBtn');
  const paymentMethod = document.querySelector('input[name="cargoWizardPayMethod"]:checked')?.value;
  const confirmed = document.getElementById('cargoWizardPayConfirm')?.checked;

  document.getElementById('cargoWizardPayError')?.classList.remove('is-visible');

  if (!paymentMethod || !confirmed) {
    showCargoWizardPayError('Please select a payment method and confirm your details.');
    return;
  }

  const session = pendingCargoSession || buildCargoSession();
  if (!session) {
    showCargoWizardPayError('Please complete all required fields.');
    return;
  }

  const originalHtml = payBtn.innerHTML;
  payBtn.disabled = true;
  payBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing…';

  const result = await window.executeBookingPayment?.(session, {
    paymentMethod,
    onError: showCargoWizardPayError,
    onPayButtonRestore: () => {
      payBtn.innerHTML = originalHtml;
      updateCargoWizardPayButton();
    },
  });

  if (!result) {
    payBtn.innerHTML = originalHtml;
    updateCargoWizardPayButton();
    return;
  }

  const { finalRef } = result;
  session.onSuccess?.({ reference: finalRef, paymentMethod: result.paymentMethod });

  goToCargoStep(8);

  if (result.waMessage) {
    setTimeout(() => {
      const num = typeof MIDEYE_WHATSAPP_NUMBER !== 'undefined' ? MIDEYE_WHATSAPP_NUMBER : '252907816567';
      window.location.href = `https://wa.me/${num}?text=${encodeURIComponent(result.waMessage)}`;
    }, 1200);
  }
};

const resetCargoWizard = () => {
  pendingCargoSession = null;
  getCargoForm()?.reset();
  document.getElementById('priceResult')?.classList.remove('is-visible');
  document.getElementById('priceCalcError')?.classList.remove('is-visible');
  goToCargoStep(1);
};

const bindCargoWizardNav = () => {
  document.getElementById('cargoWizardNextBtn')?.addEventListener('click', handleCargoWizardNext);
  document.getElementById('cargoWizardBackBtn')?.addEventListener('click', handleCargoWizardBack);
  document.getElementById('cargoWizardPayBtn')?.addEventListener('click', handleCargoWizardPayNow);
  document.getElementById('cargoWizardNewBtn')?.addEventListener('click', resetCargoWizard);

  document.querySelectorAll('input[name="cargoWizardPayMethod"]').forEach((r) => {
    r.addEventListener('change', updateCargoWizardPayButton);
  });
  document.getElementById('cargoWizardPayConfirm')?.addEventListener('change', updateCargoWizardPayButton);

  getCargoForm()?.addEventListener('submit', (e) => e.preventDefault());
};

const initCargoWizard = () => {
  if (!document.getElementById('cargoWizard')) return;
  bindCargoWizardNav();
  goToCargoStep(1);
};

document.addEventListener('DOMContentLoaded', initCargoWizard);
