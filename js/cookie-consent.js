/**
 * PDF to EPUB Pro - Cookie Banner & Consent Handler
 * GDPR & CCPA compliant client-side consent management
 */

(function () {
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
    document.addEventListener('DOMContentLoaded', initCookieConsent);
  } else {
    initCookieConsent();
  }
})();
