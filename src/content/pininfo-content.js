const processed = new WeakSet();
const rendered = new Set();

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : null;
}

function absoluteUrl(value) {
  if (!value) return null;
  try { return new URL(value, location.origin).href; } catch { return null; }
}

function extractPinId(url) {
  const match = url?.match(/\/pin\/(\d+)/i);
  return match?.[1] ?? null;
}

function parsePin(anchor) {
  const url = absoluteUrl(anchor.getAttribute('href'));
  if (!url || !/\/pin\/\d+/i.test(url)) return null;
  const container = anchor.closest('div') || anchor.parentElement || anchor;
  const image = anchor.querySelector('img') || container.querySelector?.('img');
  return {
    id: extractPinId(url),
    url,
    title: clean(image?.alt) || clean(anchor.getAttribute('aria-label')) || null,
    imageUrl: image?.currentSrc || image?.src || null,
    observedAt: new Date().toISOString(),
    source: 'dom'
  };
}

function send(type, pin) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, pin }, (response) => {
      if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
      resolve(response || { ok: false });
    });
  });
}

async function toggleFavorite(pin, button) {
  const result = await send('PININFO_TOGGLE_FAVORITE', pin);
  if (!result.ok) return;
  button.textContent = result.favorite ? '★ FAVORITE' : '☆ FAVORITE';
  button.classList.toggle('is-favorite', result.favorite);
}

async function saveResearch(pin, button) {
  const result = await send('PININFO_SAVE_RESEARCH', pin);
  if (!result.ok) return;
  button.textContent = 'SAVED ✓';
}

function render(anchor, pin) {
  if (rendered.has(pin.url)) return;
  rendered.add(pin.url);
  const host = anchor.closest('div') || anchor.parentElement;
  if (!host) return;
  host.style.position ||= 'relative';

  const card = document.createElement('div');
  card.className = 'pininfo-overlay';
  card.innerHTML = `<div class="pininfo-header">PININFO <span>RESEARCH</span></div>
    <div class="pininfo-row"><b>Pin ID</b><span>${pin.id ?? '—'}</span></div>
    <div class="pininfo-row"><b>Title</b><span>${pin.title ?? '—'}</span></div>
    <div class="pininfo-actions">
      <button type="button" class="pininfo-favorite">☆ FAVORITE</button>
      <button type="button" class="pininfo-research">SAVE TO RESEARCH</button>
    </div>`;
  card.querySelector('.pininfo-favorite').addEventListener('click', (event) => toggleFavorite(pin, event.currentTarget));
  card.querySelector('.pininfo-research').addEventListener('click', (event) => saveResearch(pin, event.currentTarget));
  host.appendChild(card);
}

function scan(root = document) {
  const anchors = root.querySelectorAll?.('a[href*="/pin/"]') || [];
  for (const anchor of anchors) {
    if (processed.has(anchor)) continue;
    processed.add(anchor);
    const pin = parsePin(anchor);
    if (pin) render(anchor, pin);
  }
}

scan();
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
