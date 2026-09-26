(function () {
  'use strict';

  if (window.CMDQuietTipUI) return;
  window.CMDQuietTipUI = { installed: true };

  function init() {
    var tips = Array.from(document.querySelectorAll('[data-quiet-tip]'));
    if (!tips.length) return;

    var unsubscribe = null;

    function render(state) {
      var eligible = Boolean(state && state.eligible);
      tips.forEach(function (tip) {
        tip.hidden = !eligible;
        if (!eligible) tip.open = false;
      });
    }

    function connect() {
      if (typeof unsubscribe === 'function') unsubscribe();
      unsubscribe = null;
      var api = window.CMDQuietTip;
      if (!api || typeof api.getState !== 'function') return;
      try {
        render(api.getState());
        if (typeof api.subscribe === 'function') unsubscribe = api.subscribe(render);
      } catch (_) {
        render(null);
      }
    }

    tips.forEach(function (tip) {
      var input = tip.querySelector('.quiet-tip-email');
      var copy = tip.querySelector('.quiet-tip-copy');
      var status = tip.querySelector('.quiet-tip-status');
      if (!input || !copy || !status) return;

      function manualCopy() {
        input.focus();
        input.select();
        try { input.setSelectionRange(0, input.value.length); } catch (_) {}
        status.textContent = 'Select and copy this email.';
      }

      copy.addEventListener('click', function () {
        status.textContent = '';
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
          manualCopy();
          return;
        }
        try {
          Promise.resolve(navigator.clipboard.writeText(input.value)).then(function () {
            status.textContent = 'Email copied.';
          }, manualCopy);
        } catch (_) {
          manualCopy();
        }
      });

      tip.addEventListener('toggle', function () {
        if (!tip.open) status.textContent = '';
      });

      tip.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || !tip.open) return;
        event.preventDefault();
        event.stopPropagation();
        tip.open = false;
        var summary = tip.querySelector('summary');
        if (summary) summary.focus({ preventScroll: true });
      });
    });

    window.addEventListener('pagehide', function () {
      if (typeof unsubscribe === 'function') unsubscribe();
      unsubscribe = null;
    });
    window.addEventListener('pageshow', connect);
    connect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
