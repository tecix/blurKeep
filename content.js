(function () {
  'use strict';

  const OVERLAY_ID = 'blurkeep-overlay';
  let isEnabled = true;
  let blurAmount = 6;
  let updateTimer = null;
  let watchTimer = null;

  function ensureOverlay() {
    if (!document.getElementById(OVERLAY_ID)) {
      const el = document.createElement('div');
      el.id = OVERLAY_ID;
      document.body.appendChild(el);
    }
  }

  function setBlurAmount(px) {
    document.documentElement.style.setProperty('--blurkeep-blur', `${px}px`);
  }

  // Keep (and Google web apps generally) often leave dialog containers
  // mounted in the DOM after closing them, just toggling visibility instead
  // of removing them. A plain querySelector for [role="dialog"] etc. would
  // then match forever, holding the blur on permanently. Require the match
  // to actually be visible.
  function isVisible(el) {
    if (!el) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isNoteOpen() {
    // Keep uses #NOTE/..., #LIST/..., #BLOB/..., etc. when a note is open.
    // Match any hash that looks like TYPE/ID (uppercase letters, then slash, then ID).
    if (/^#[A-Z]+\//.test(window.location.hash)) return true;

    // Fallback: ARIA-based (Keep may or may not use these)
    const candidates = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]');
    for (const el of candidates) {
      if (isVisible(el)) return true;
    }
    return false;
  }

  function applyState() {
    const active = isEnabled && isNoteOpen();
    document.documentElement.classList.toggle('blurkeep-active', active);

    // Keep closes notes via the page's history.pushState, which the content
    // script can't intercept (isolated world), so no event fires for it. If
    // the last DOM mutation lands before the URL updates (fast open/close),
    // nothing would re-check. While blurred, keep re-checking until closed.
    if (active && !watchTimer) {
      watchTimer = setInterval(applyState, 200);
    } else if (!active && watchTimer) {
      clearInterval(watchTimer);
      watchTimer = null;
    }
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(applyState, 40);
  }

  // MutationObserver catches DOM-level changes (dialog elements added/removed/shown)
  const observer = new MutationObserver(scheduleUpdate);

  // hashchange fires on back/forward navigation
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('popstate', scheduleUpdate);

  // Keep uses history.pushState to navigate — intercept it
  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);
  history.pushState = function (...args) { _push(...args); scheduleUpdate(); };
  history.replaceState = function (...args) { _replace(...args); scheduleUpdate(); };

  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'setState') {
      isEnabled = msg.enabled;
      browser.storage.local.set({ enabled: isEnabled });
      applyState();
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'setBlur') {
      blurAmount = msg.amount;
      setBlurAmount(blurAmount);
      browser.storage.local.set({ blurAmount });
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'getState') {
      sendResponse({ enabled: isEnabled, blurAmount });
      return false;
    }
  });

  browser.storage.local.get({ enabled: true, blurAmount: 6 }, (result) => {
    isEnabled = result.enabled;
    blurAmount = result.blurAmount;
    setBlurAmount(blurAmount);
    ensureOverlay();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-hidden', 'hidden']
    });
    applyState();
  });
})();
