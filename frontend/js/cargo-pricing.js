/**
 * Mideye – Cargo Estimated Price Calculator
 * Computes domestic shipping cost from weight.
 */

const CARGO_RATES = {
  domestic: {
    label: 'Domestic',
    tiers: [
      { max: 10,  rate: 2.50, base: 5,  label: '0–10 kg' },
      { max: 50,  rate: 2.00, base: 5,  label: '10–50 kg' },
      { max: Infinity, rate: 1.50, base: 5, label: '50+ kg' },
    ],
  },
};

/** Return the pricing tier for a given weight. */
const getWeightTier = (weight) => {
  const tiers = CARGO_RATES.domestic.tiers;
  if (weight <= 10)  return tiers[0];
  if (weight <= 50)  return tiers[1];
  return tiers[2];
};

/** Calculate total: (weight × rate/kg) + base fee. */
const calculateCargoPrice = (weight) => {
  const tier = getWeightTier(weight);
  const total = weight * tier.rate + tier.base;
  return { tier, total };
};

const formatMoney = (amount) => `$${amount.toFixed(2)}`;

const initCargoPricing = () => {
  const calcBtn      = document.getElementById('calculatePriceBtn');
  const weightInput  = document.getElementById('cargoWeight');
  const resultBox    = document.getElementById('priceResult');
  const resultValue  = document.getElementById('priceResultValue');
  const resultBreak  = document.getElementById('priceResultBreakdown');
  const errorEl      = document.getElementById('priceCalcError');

  if (!calcBtn || !weightInput) return;

  const runCalculation = () => {
    const weight = parseFloat(weightInput.value);
    errorEl?.classList.remove('is-visible');
    resultBox?.classList.remove('is-visible');

    if (!weight || weight <= 0) {
      errorEl.textContent = 'Please enter a valid weight in the Cargo Details section.';
      errorEl?.classList.add('is-visible');
      return;
    }

    const { tier, total } = calculateCargoPrice(weight);

    resultValue.textContent = formatMoney(total);
    resultBreak.textContent =
      `Domestic · ${tier.label} · ${formatMoney(tier.rate)}/kg × ${weight} kg + ${formatMoney(tier.base)} base fee`;
    resultBox?.classList.add('is-visible');
  };

  calcBtn.addEventListener('click', runCalculation);

  weightInput.addEventListener('input', () => {
    if (resultBox?.classList.contains('is-visible')) runCalculation();
  });

  document.getElementById('cargoRequestForm')?.addEventListener('reset', () => {
    resultBox?.classList.remove('is-visible');
    errorEl?.classList.remove('is-visible');
  });

  const params = new URLSearchParams(window.location.search);
  const dest = params.get('to');
  const destSelect = document.getElementById('cargoDestination');
  if (dest && destSelect?.querySelector(`option[value="${dest}"]`)) {
    destSelect.value = dest;
  }
};

window.calculateCargoPrice = calculateCargoPrice;

document.addEventListener('DOMContentLoaded', initCargoPricing);
