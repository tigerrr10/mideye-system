'use strict';

(function () {
  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'tempmail.com',
    'throwaway.email', 'yopmail.com', '10minutemail.com', 'trashmail.com',
    'getnada.com', 'fakeinbox.com', 'dispostable.com', 'maildrop.cc',
    'temp-mail.org', 'sharklasers.com', 'grr.la', 'mailnesia.com',
  ]);

  const FULL_NAME_RE = /^[\p{L}][\p{L}\s'.-]*[\p{L}]$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const SOMALI_PHONE_RE = /^(?:\+252\d{9}|0\d{9})$/;

  const cleanPhone = (value) => value.replace(/[\s-]/g, '');

  const normalizeSomaliPhone = (value) => {
    const cleaned = cleanPhone(value);
    if (/^0\d{9}$/.test(cleaned)) return `+252${cleaned.slice(1)}`;
    if (/^\+252\d{9}$/.test(cleaned)) return cleaned;
    return cleaned;
  };

  const fields = {};
  const getEl = (id) => document.getElementById(id);

  const setFieldState = (field, { valid, message, successMessage }) => {
    const input = fields[field]?.input;
    const errorEl = fields[field]?.error;
    const successEl = fields[field]?.success;
    if (!input) return valid;

    input.classList.remove('is-valid', 'is-invalid');
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');

    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.classList.toggle('is-visible', !valid && !!message);
    }
    if (successEl) {
      successEl.textContent = successMessage || '';
      successEl.classList.toggle('is-visible', valid && !!successMessage);
    }

    if (valid && input.value.trim()) input.classList.add('is-valid');
    else if (!valid && message) input.classList.add('is-invalid');

    return valid;
  };

  const validateFullName = (showMessage = true) => {
    const value = fields.fullName.input.value.trim().replace(/\s+/g, ' ');
    const parts = value.split(' ').filter(Boolean);

    if (!value) {
      return showMessage ? setFieldState('fullName', { valid: false, message: 'Please enter your legal full name.' }) : false;
    }
    if (value.length < 2 || value.length > 100) {
      return showMessage ? setFieldState('fullName', { valid: false, message: 'Full name must be between 2 and 100 characters.' }) : false;
    }
    if (parts.length < 2) {
      return showMessage ? setFieldState('fullName', { valid: false, message: 'Enter at least first and last name (e.g. Ahmed Hassan Ali).' }) : false;
    }
    if (!FULL_NAME_RE.test(value)) {
      return showMessage ? setFieldState('fullName', { valid: false, message: 'Use letters only. Hyphens, apostrophes, and spaces are allowed.' }) : false;
    }
    return showMessage
      ? setFieldState('fullName', { valid: true, successMessage: 'Full name looks good.' })
      : true;
  };

  const validatePhone = (showMessage = true) => {
    const raw = fields.phone.input.value.trim();
    const cleaned = cleanPhone(raw);

    if (!raw) {
      return showMessage ? setFieldState('phone', { valid: false, message: 'Phone number is required.' }) : false;
    }
    if (!SOMALI_PHONE_RE.test(cleaned)) {
      return showMessage
        ? setFieldState('phone', { valid: false, message: 'Enter a valid Somali number (e.g. +252 61 1234567 or 0611234567).' })
        : false;
    }
    return showMessage
      ? setFieldState('phone', { valid: true, successMessage: 'Phone number looks good.' })
      : true;
  };

  const validateEmail = (showMessage = true) => {
    const value = fields.email.input.value.trim().toLowerCase();

    if (!value) {
      return showMessage ? setFieldState('email', { valid: false, message: 'Please enter your email address.' }) : false;
    }
    if (!EMAIL_RE.test(value)) {
      return showMessage ? setFieldState('email', { valid: false, message: 'Enter a valid email address (e.g. name@example.com).' }) : false;
    }
    const domain = value.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return showMessage ? setFieldState('email', { valid: false, message: 'Temporary email addresses are not allowed. Use a real email.' }) : false;
    }
    return showMessage
      ? setFieldState('email', { valid: true, successMessage: 'Email format is valid.' })
      : true;
  };

  const getPasswordChecks = (password) => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  });

  const getPasswordStrength = (password) => {
    const checks = getPasswordChecks(password);
    const score = Object.values(checks).filter(Boolean).length;
    if (!password) return { label: '', level: '' };
    if (score <= 2 || password.length < 8) return { label: 'Weak', level: 'weak' };
    if (score <= 4) return { label: 'Medium', level: 'medium' };
    return { label: 'Strong', level: 'strong' };
  };

  const updatePasswordRequirements = (password) => {
    const checks = getPasswordChecks(password);
    Object.entries(checks).forEach(([key, ok]) => {
      const el = getEl(`req-${key}`);
      if (!el) return;
      el.classList.toggle('met', ok);
      const icon = el.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-check', ok);
        icon.classList.toggle('fa-circle', !ok);
      }
    });
  };

  const updateStrengthMeter = (password) => {
    const meter = getEl('passwordStrengthBar');
    const label = getEl('passwordStrengthLabel');
    const { label: text, level } = getPasswordStrength(password);

    if (meter) {
      meter.className = `password-strength-bar ${level || 'empty'}`;
      meter.style.width = !password ? '0%' : level === 'weak' ? '33%' : level === 'medium' ? '66%' : '100%';
    }
    if (label) {
      label.textContent = text;
      label.className = `password-strength-label ${level || ''}`;
    }
  };

  const validatePassword = (showMessage = true) => {
    const password = fields.password.input.value;
    const checks = getPasswordChecks(password);
    updatePasswordRequirements(password);
    updateStrengthMeter(password);

    if (!password) {
      return showMessage ? setFieldState('password', { valid: false, message: 'Please create a password.' }) : false;
    }
    if (!checks.length) {
      return showMessage ? setFieldState('password', { valid: false, message: 'Password must be at least 8 characters.' }) : false;
    }
    if (!checks.upper || !checks.lower || !checks.number || !checks.special) {
      return showMessage ? setFieldState('password', { valid: false, message: 'Include uppercase, lowercase, a number, and a special character.' }) : false;
    }
    return showMessage
      ? setFieldState('password', { valid: true, successMessage: 'Password meets all requirements.' })
      : true;
  };

  const validateConfirm = (showMessage = true) => {
    const password = fields.password.input.value;
    const confirm = fields.confirm.input.value;

    if (!confirm) {
      return showMessage ? setFieldState('confirm', { valid: false, message: 'Please confirm your password.' }) : false;
    }
    if (password !== confirm) {
      return showMessage ? setFieldState('confirm', { valid: false, message: 'Passwords do not match.' }) : false;
    }
    return showMessage
      ? setFieldState('confirm', { valid: true, successMessage: 'Passwords match.' })
      : true;
  };

  const updateSubmitState = () => {
    const btn = getEl('registerSubmitBtn');
    if (!btn) return;
    const ok = validateFullName(false) && validateEmail(false) && validatePhone(false) && validatePassword(false) && validateConfirm(false);
    btn.disabled = !ok;
  };

  const bindPasswordToggle = (btnId, inputId) => {
    const btn = getEl(btnId);
    const input = getEl(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show
        ? '<i class="fas fa-eye-slash" aria-hidden="true"></i>'
        : '<i class="fas fa-eye" aria-hidden="true"></i>';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  };

  window.getRegisterPhone = () => normalizeSomaliPhone(fields.phone?.input?.value || '');

  window.validateRegisterForm = () => {
    const results = [
      validateFullName(true),
      validateEmail(true),
      validatePhone(true),
      validatePassword(true),
      validateConfirm(true),
    ];
    updateSubmitState();
    return results.every(Boolean);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!getEl('registerForm')) return;

    fields.fullName = { input: getEl('regFullName'), error: getEl('fullNameError'), success: getEl('fullNameSuccess') };
    fields.email = { input: getEl('regEmail'), error: getEl('emailError'), success: getEl('emailSuccess') };
    fields.phone = { input: getEl('regPhone'), error: getEl('phoneError'), success: getEl('phoneSuccess') };
    fields.password = { input: getEl('regPassword'), error: getEl('passwordError'), success: getEl('passwordSuccess') };
    fields.confirm = { input: getEl('regConfirm'), error: getEl('confirmError'), success: getEl('confirmSuccess') };

    bindPasswordToggle('toggleRegPassword', 'regPassword');
    bindPasswordToggle('toggleRegConfirm', 'regConfirm');

    fields.fullName.input?.addEventListener('input', () => { validateFullName(true); updateSubmitState(); });
    fields.fullName.input?.addEventListener('blur', () => validateFullName(true));

    fields.email.input?.addEventListener('input', () => { validateEmail(true); updateSubmitState(); });
    fields.email.input?.addEventListener('blur', () => validateEmail(true));

    fields.phone.input?.addEventListener('input', () => { validatePhone(true); updateSubmitState(); });
    fields.phone.input?.addEventListener('blur', () => validatePhone(true));

    fields.password.input?.addEventListener('input', () => {
      validatePassword(true);
      if (fields.confirm.input.value) validateConfirm(true);
      updateSubmitState();
    });
    fields.password.input?.addEventListener('blur', () => validatePassword(true));

    fields.confirm.input?.addEventListener('input', () => { validateConfirm(true); updateSubmitState(); });
    fields.confirm.input?.addEventListener('blur', () => validateConfirm(true));

    updateSubmitState();
  });
})();
