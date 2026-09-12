const PIN_SELECTORS = [
  'a[href*="/pin/"]',
  'a[href*="/pin/" i]'
];

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

function parseFromAnchor(anchor) {
  const url = absoluteUrl(anchor.getAttribute('href'));
  if (!url || !/\/pin\/\d+/i.test(url)) return null;

  const container = anchor.closest('div') || anchor.parentElement || anchor;
  const image = anchor.querySelector('img') || container.querySelector?.('img');
  const imageUrl = image?.currentSrc || image?.src || image?.getAttribute('src') || null;

  return {
    id: extractPinId(url),
    url,
    title: clean(image?.alt) || clean(anchor.getAttribute('aria-label')) || null,
    imageUrl,
    observedAt: new Date().toISOString(),
    source: 'dom'
  };
}

export function discoverPins(root = document) {
  const anchors = root.querySelectorAll(PIN_SELECTORS.join(','));
  const seen = new Set();
  const pins = [];

  for (const anchor of anchors) {
    const pin = parseFromAnchor(anchor);
    if (!pin || seen.has(pin.url)) continue;
    seen.add(pin.url);
    pins.push(pin);
  }

  return pins;
}
