/**
 * Mideye Travel Agency – Frontend Auth Guard
 *
 * Usage — place ONE of these calls at the very top of each protected page:
 *
 *   AuthGuard.requireAuth();    // any logged-in user (admin or regular)
 *   AuthGuard.requireAdmin();   // admin pages only
 *   AuthGuard.requireStaffPanel(); // admin + staff panel
 *   AuthGuard.requireUser();    // regular users only (not admin/staff)
 *   AuthGuard.requireGuest();   // redirect away if already logged in
 *   AuthGuard.redirectIfLoggedIn(); // alias for requireGuest
 */

const AuthGuard = (() => {
  'use strict';

  const TOKEN_KEY = 'mideye_token';
  const USER_KEY  = 'mideye_user';
  const REDIRECT_KEY = 'mideye_redirect_after_login';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const getUser  = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  };

  // Flash-of-unauthorized-content prevention: hide body until guard runs
  const hideBody = () => { document.documentElement.style.visibility = 'hidden'; };
  const showBody = () => { document.documentElement.style.visibility = ''; };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('mideye_dash_')) sessionStorage.removeItem(key);
    });
  };

  const saveReturnUrl = () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const target = `${page}${window.location.search || ''}`;
    if (!['login.html', 'register.html'].includes(page)) {
      sessionStorage.setItem(REDIRECT_KEY, target);
    }
  };

  const consumeRedirectAfterLogin = (defaultUrl = 'index.html') => {
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    if (saved && !['login.html', 'register.html'].includes(saved.split('?')[0])) {
      return saved;
    }
    return defaultUrl;
  };

  const redirectToLogin = () => {
    saveReturnUrl();
    clearSession();
    window.location.replace('login.html');
  };

  const isLoggedIn = () => !!(getToken() && getUser());

  // Show a brief "Access Denied" overlay before redirecting
  const showDenied = (message, redirectTo) => {
    showBody();
    document.body.innerHTML = `
      <div style="
        min-height:100vh;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:#f4ede0;font-family:'DM Sans',sans-serif;
      ">
        <div style="
          background:#fff;border-radius:16px;
          padding:3rem 2.5rem;max-width:400px;width:90%;
          box-shadow:0 8px 40px rgba(68,19,6,0.13);
          text-align:center;border-top:4px solid #441306;
        ">
          <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
          <h2 style="color:#441306;font-size:1.5rem;margin-bottom:0.5rem;">Access Denied</h2>
          <p style="color:#8a6558;font-size:0.9rem;margin-bottom:1.5rem;">${message}</p>
          <div style="
            background:#fee685;color:#441306;
            border-radius:8px;padding:0.6rem 1rem;
            font-size:0.82rem;font-weight:600;
          ">
            Redirecting you now…
          </div>
        </div>
      </div>`;
    setTimeout(() => window.location.replace(redirectTo), 2000);
  };

  // ── requireAuth ───────────────────────────────────────────────────────────────
  // Any protected app page: must have a valid token (admin or regular user)
  const requireAuth = () => {
    hideBody();
    if (!isLoggedIn()) {
      redirectToLogin();
      return;
    }
    showBody();
  };

  const isPanelUser = (user) => user && ['admin', 'staff'].includes(user.role);

  // ── requireStaffPanel ────────────────────────────────────────────────────────
  // Admin panel: admin or staff
  const requireStaffPanel = () => {
    hideBody();
    if (!isLoggedIn()) {
      redirectToLogin();
      return;
    }

    const user = getUser();

    if (!isPanelUser(user)) {
      showDenied(
        'You do not have permission to view this page. This area is restricted to administrators and staff.',
        'user-dashboard.html'
      );
      return;
    }

    showBody();
    document.dispatchEvent(new CustomEvent('mideye:panel-ready', { detail: { user } }));
  };

  // ── requireAdmin ─────────────────────────────────────────────────────────────
  // Admin pages: must have token AND role === 'admin'
  const requireAdmin = () => {
    hideBody();
    if (!isLoggedIn()) {
      redirectToLogin();
      return;
    }

    const user = getUser();

    if (user.role !== 'admin') {
      showDenied(
        'You do not have permission to view this page. This area is restricted to administrators.',
        isPanelUser(user) ? 'admin.html' : 'user-dashboard.html'
      );
      return;
    }

    showBody();
  };

  // ── requireUser ───────────────────────────────────────────────────────────────
  // User dashboard pages: must have a valid token
  const requireUser = () => {
    hideBody();
    if (!isLoggedIn()) {
      redirectToLogin();
      return;
    }

    const user = getUser();

    // Admins/staff who land on user-dashboard get sent to admin panel
    if (isPanelUser(user)) {
      window.location.replace('admin.html');
      return;
    }

    showBody();
  };

  // ── requireGuest ──────────────────────────────────────────────────────────────
  // Login / Register: redirect away if already logged in
  const requireGuest = () => {
    const token = getToken();
    const user  = getUser();

    if (token && user) {
      window.location.replace(isPanelUser(user) ? 'admin.html' : 'index.html');
    }
  };

  // ── logout ────────────────────────────────────────────────────────────────────
  const logout = () => {
    clearSession();
    window.location.replace('login.html');
  };

  return {
    requireAuth,
    requireAdmin,
    requireStaffPanel,
    requireUser,
    requireGuest,
    redirectIfLoggedIn: requireGuest,
    logout,
    redirectToLogin,
    consumeRedirectAfterLogin,
    isLoggedIn,
    isPanelUser,
  };
})();

window.AuthGuard = AuthGuard;
