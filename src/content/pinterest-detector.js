import { discoverPins } from './pin-parser.js';
import { renderPinOverlay } from './pin-overlay.js';

const processed = new WeakSet();

function scan(root = document) {
  const pins = discoverPins(root);
  for (const pin of pins) {
    const anchors = root.querySelectorAll(`a[href*="/pin/${pin.id}"]`);
    for (const anchor of anchors) {
      if (processed.has(anchor)) continue;
      processed.add(anchor);
      renderPinOverlay(anchor, pin);
    }
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
