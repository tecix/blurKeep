(function () {
  'use strict';

  const OVERLAY_ID = 'blurkeep-overlay';
  let isEnabled = true;
  let blurAmount = 6;
  let updateTimer = null;

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

  function isNoteOpen() {
    // Keep uses #NOTE/..., #LIST/..., #BLOB/..., etc. when a note is open.
    // Match any hash that looks like TYPE/ID (uppercase letters, then slash, then ID).
    if (/^#[A-Z]+\//.test(window.location.hash)) return true;

    // Fallback: ARIA-based (Keep may or may not use these)
    return !!(
      document.querySelector('[role="dialog"]') ||
      document.querySelector('[aria-modal="true"]') ||
      document.querySelector('dialog[open]')
    );
  }

  function applyState() {
    const active = isEnabled && isNoteOpen();
    document.documentElement.classList.toggle('blurkeep-active', active);
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
