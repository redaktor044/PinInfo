const rendered = new Set();

function overlayFor(anchor, pin) {
  if (!anchor || rendered.has(pin.url)) return;
  rendered.add(pin.url);

  const card = document.createElement('div');
  card.className = 'pininfo-overlay';
  card.innerHTML = `
    <div class="pininfo-header">PININFO <span>RESEARCH</span></div>
    <div class="pininfo-row"><b>Pin ID</b><span>${pin.id ?? '—'}</span></div>
    <div class="pininfo-row"><b>Observed</b><span>now</span></div>
    <button type="button">SAVE TO RESEARCH</button>
  `;

  card.querySelector('button').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PININFO_SAVE_RESEARCH', pin });
    card.querySelector('button').textContent = 'SAVED ✓';
  });

  const host = anchor.closest('div') || anchor.parentElement;
  if (!host) return;
  host.style.position ||= 'relative';
  host.appendChild(card);
}

export function renderPinOverlay(anchor, pin) {
  overlayFor(anchor, pin);
}
