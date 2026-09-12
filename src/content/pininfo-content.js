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

function saveResearch(pin, button) {
  chrome.runtime.sendMessage({ type: 'PININFO_SAVE_RESEARCH', pin }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) return;
    button.textContent = 'SAVED ✓';
  });
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
    <button type="button">SAVE TO RESEARCH</button>`;
  const button = card.querySelector('button');
  button.addEventListener('click', () => saveResearch(pin, button));
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
