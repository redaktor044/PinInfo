const KEY = 'pininfo:research';

async function getPins() {
  const data = await chrome.storage.local.get(KEY);
  return Array.isArray(data[KEY]) ? data[KEY] : [];
}

async function refresh() {
  const pins = await getPins();
  document.querySelector('#count').textContent = pins.length;
}

document.querySelector('#export').addEventListener('click', async () => {
  const pins = await getPins();
  const blob = new Blob([JSON.stringify(pins, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pininfo-research-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.querySelector('#clear').addEventListener('click', async () => {
  await chrome.storage.local.set({ [KEY]: [] });
  await refresh();
});

refresh();
