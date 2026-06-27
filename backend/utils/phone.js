const cleanPhone = (value) => String(value || '').replace(/[\s-]/g, '');

const isValidSomaliPhone = (value) => {
  const cleaned = cleanPhone(value);
  return /^(?:\+252\d{9}|0\d{9})$/.test(cleaned);
};

const normalizeSomaliPhone = (value) => {
  const cleaned = cleanPhone(value);
  if (/^0\d{9}$/.test(cleaned)) return `+252${cleaned.slice(1)}`;
  if (/^\+252\d{9}$/.test(cleaned)) return cleaned;
  return null;
};

module.exports = { cleanPhone, isValidSomaliPhone, normalizeSomaliPhone };
