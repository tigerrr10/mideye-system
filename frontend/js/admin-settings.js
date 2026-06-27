/**
 * Mideye Admin – Settings & Security
 * Company info, admin users, roles, permissions
 */
(() => {
  'use strict';

  const SETTINGS_KEY = 'mideye_company_settings';

  const DEFAULT_SETTINGS = {
    company_name: 'Mideye Travel Agency',
    tagline: 'Your journey starts here',
    phone: '+252 907 816567',
    whatsapp: '+252907816567',
    email: 'info@mideye.com',
    address: 'Main Street, Galkacyo, Somalia',
    office_hours: 'Sat–Thu: 8:00 AM – 6:00 PM',
    currency: 'USD',
    sms_enabled: true,
    email_alerts: true,
  };

  const PERMISSIONS = [
    { module: 'Dashboard', admin: true, staff: true, agent: false },
    { module: 'Users', admin: true, staff: false, agent: false },
    { module: 'Bookings', admin: true, staff: true, agent: true },
    { module: 'Cargo', admin: true, staff: true, agent: true },
    { module: 'Flights', admin: true, staff: true, agent: false },
    { module: 'Cities', admin: true, staff: true, agent: false },
    { module: 'Payments', admin: true, staff: true, agent: false },
    { module: 'Reports', admin: true, staff: false, agent: false },
    { module: 'Notifications', admin: true, staff: true, agent: false },
    { module: 'Support', admin: true, staff: true, agent: true },
    { module: 'Settings', admin: true, staff: false, agent: false },
  ];

  let settingsTab = 'company';

  const getSettings = () => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const saveSettings = (data) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  };

  const permCell = (allowed) =>
    allowed ? '<span class="perm-yes"><i class="fas fa-check"></i></span>' : '<span class="perm-no">—</span>';

  const showSettingsPanel = (tab) => {
    settingsTab = tab;
    document.querySelectorAll('.settings-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.settingsTab === tab);
    });
    ['company', 'admins', 'roles', 'security'].forEach((t) => {
      document.getElementById(`settings-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
  };

  const loadCompanyForm = () => {
    const s = getSettings();
    const map = {
      'set-company-name': s.company_name,
      'set-tagline': s.tagline,
      'set-phone': s.phone,
      'set-whatsapp': s.whatsapp,
      'set-email': s.email,
      'set-address': s.address,
      'set-hours': s.office_hours,
      'set-currency': s.currency,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    });
    const sms = document.getElementById('set-sms-enabled');
    const email = document.getElementById('set-email-alerts');
    if (sms) sms.checked = s.sms_enabled !== false;
    if (email) email.checked = s.email_alerts !== false;
  };

  const renderAdminUsers = () => {
    const tbody = document.getElementById('settings-admins-body');
    if (!tbody) return;
    const esc = window.esc || ((s) => String(s ?? '—'));
    const users = (window.allUsers || []).filter((u) => u.role === 'admin');

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><i class="fas fa-user-shield"></i>No admin accounts found.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u, i) => `
      <tr>
        <td class="td-muted">${i + 1}</td>
        <td class="td-bold">${esc(u.full_name)}</td>
        <td class="td-muted">${esc(u.email)}</td>
        <td>${window.roleBadge?.(u.role) || u.role}</td>
        <td><span class="badge-status badge-${u.is_active !== false ? 'confirmed' : 'cancelled'}">${u.is_active !== false ? 'Active' : 'Inactive'}</span></td>
      </tr>`).join('');
  };

  const renderPermissions = () => {
    const tbody = document.getElementById('settings-permissions-body');
    if (!tbody) return;
    const esc = window.esc || ((s) => s);

    tbody.innerHTML = PERMISSIONS.map((p) => `
      <tr>
        <td class="td-bold">${esc(p.module)}</td>
        <td>${permCell(p.admin)}</td>
        <td>${permCell(p.staff)}</td>
        <td>${permCell(p.agent)}</td>
      </tr>`).join('');
  };

  const renderSecurityInfo = () => {
    const user = JSON.parse(localStorage.getItem('mideye_user') || 'null');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    set('sec-current-user', user?.full_name);
    set('sec-current-email', user?.email);
    set('sec-current-role', user?.role || 'admin');
    set('sec-session', 'Active (JWT)');
    set('sec-last-login', new Date().toLocaleString('en-GB'));
  };

  const saveCompanySettings = () => {
    const data = {
      company_name: document.getElementById('set-company-name')?.value?.trim(),
      tagline: document.getElementById('set-tagline')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      whatsapp: document.getElementById('set-whatsapp')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      office_hours: document.getElementById('set-hours')?.value?.trim(),
      currency: document.getElementById('set-currency')?.value || 'USD',
      sms_enabled: document.getElementById('set-sms-enabled')?.checked,
      email_alerts: document.getElementById('set-email-alerts')?.checked,
    };
    saveSettings(data);
    window.showToast?.('Company settings saved', 'fa-check-circle');
    renderSettingsSection();
  };

  const renderSettingsSection = () => {
    showSettingsPanel(settingsTab);
    loadCompanyForm();
    renderAdminUsers();
    renderPermissions();
    renderSecurityInfo();
  };

  window.setSettingsTab = (tab) => {
    settingsTab = tab;
    renderSettingsSection();
  };
  window.saveCompanySettings = saveCompanySettings;
  window.renderSettingsSection = renderSettingsSection;
  window.getCompanySettings = getSettings;
})();
