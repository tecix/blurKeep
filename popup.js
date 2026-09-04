'use strict';

const toggleEl = document.getElementById('toggle');
const blurRange = document.getElementById('blur-range');
const blurValue = document.getElementById('blur-value');
const controls = document.getElementById('controls');
const notOnKeep = document.getElementById('not-on-keep');

async function getActiveKeepTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab && tab.url && tab.url.startsWith('https://keep.google.com')) {
    return tab;
  }
  return null;
}

async function init() {
  const tab = await getActiveKeepTab();

  if (!tab) {
    controls.style.display = 'none';
    notOnKeep.style.display = 'block';
    return;
  }

  let state = { enabled: true, blurAmount: 6 };
  try {
    state = await browser.tabs.sendMessage(tab.id, { type: 'getState' });
  } catch (_) {
    // Content script not yet ready; fall back to storage
    const stored = await browser.storage.local.get({ enabled: true, blurAmount: 6 });
    state = stored;
  }

  toggleEl.checked = state.enabled;
  blurRange.value = state.blurAmount;
  blurValue.textContent = state.blurAmount;
  blurRange.disabled = !state.enabled;

  toggleEl.addEventListener('change', async () => {
    const enabled = toggleEl.checked;
    blurRange.disabled = !enabled;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'setState', enabled });
    } catch (_) {
      browser.storage.local.set({ enabled });
    }
  });

  blurRange.addEventListener('input', () => {
    blurValue.textContent = blurRange.value;
  });

  blurRange.addEventListener('change', async () => {
    const amount = Number(blurRange.value);
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'setBlur', amount });
    } catch (_) {
      browser.storage.local.set({ blurAmount: amount });
    }
  });
}

init();
