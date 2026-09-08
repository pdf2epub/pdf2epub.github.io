/**
 * PDF to EPUB Pro - Global Theme Controller
 * Fast, flash-free, bulletproof dark/light mode toggle
 */

(function () {
  try {
    var savedTheme = localStorage.getItem('p2e_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  } catch (e) {}

  window.toggleAppTheme = function (e) {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (err) {}
    }
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('p2e_theme', next);
    } catch (err) {}
    updateThemeButtons(next);
  };

  function updateThemeButtons(theme) {
    var btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(function (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      updateThemeButtons(current);
    });
  } else {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeButtons(current);
  }
})();
