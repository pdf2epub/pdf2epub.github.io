/**
 * PDF to EPUB Pro - Global Theme & Cookie Consent Handler
 * Handles single source of truth for Dark/Light theme switching & GDPR/CCPA cookie banner
 */

(function () {
  // Global theme functions accessible anywhere
  window.setAppTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('p2e_theme', theme);
    } catch (e) {
      console.warn('localStorage access error:', e);
    }
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      updateThemeIcon(themeBtn, theme);
    }
  };

  window.toggleAppTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    window.setAppTheme(next);
  };

  function updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }

  function initTheme() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('p2e_theme') || 'dark';
    } catch (e) {
      console.warn('localStorage not accessible:', e);
    }
    window.setAppTheme(savedTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn && !themeBtn._themeBound) {
      themeBtn._themeBound = true;
      themeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.toggleAppTheme();
      });
    }
  }

  function initCookieConsent() {
    let consent = null;
    try {
      consent = localStorage.getItem('p2e_cookie_consent');
    } catch (e) {}

    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    if (consent) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');

    const acceptBtn = document.getElementById('acceptCookiesBtn');
    const declineBtn = document.getElementById('declineCookiesBtn');

    if (acceptBtn && !acceptBtn._bound) {
      acceptBtn._bound = true;
      acceptBtn.addEventListener('click', function () {
        try {
          localStorage.setItem('p2e_cookie_consent', 'accepted');
        } catch (e) {}
        banner.classList.add('hidden');
      });
    }

    if (declineBtn && !declineBtn._bound) {
      declineBtn._bound = true;
      declineBtn.addEventListener('click', function () {
        try {
          localStorage.setItem('p2e_cookie_consent', 'essential_only');
        } catch (e) {}
        banner.classList.add('hidden');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      initCookieConsent();
    });
  } else {
    initTheme();
    initCookieConsent();
  }
})();
