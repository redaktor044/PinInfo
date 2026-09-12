const RESEARCH_KEY = 'pininfo:research';
const FAVORITES_KEY = 'pininfo:favorites';

async function getState() {
  const data = await chrome.storage.local.get([RESEARCH_KEY, FAVORITES_KEY]);
  return {
    research: Array.isArray(data[RESEARCH_KEY]) ? data[RESEARCH_KEY] : [],
    favorites: Array.isArray(data[FAVORITES_KEY]) ? data[FAVORITES_KEY] : []
  };
}

function escapeCsv(value) {
  if (value == null) return '';
  const text = String(value).replace(/\r?\n|\r/g, ' ');
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(pins) {
  const columns = ['pin_id','pin_url','image_url','title','creator','creator_url','board','board_url','description','source_url','saves','comments','published_at','observed_at','keywords','trend_score','source'];
  const rows = pins.map(pin => columns.map(column => escapeCsv(pin[column])).join(','));
  return [columns.join(','), ...rows].join('\n');
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function refresh() {
  const state = await getState();
  document.querySelector('#researchCount').textContent = state.research.length;
  document.querySelector('#favoriteCount').textContent = state.favorites.length;
}

document.querySelector('#exportCsv').addEventListener('click', async () => {
  const state = await getState();
  const pins = state.research.length ? state.research : state.favorites;
  download(`pininfo-research-${new Date().toISOString().slice(0,10)}.csv`, toCsv(pins), 'text/csv;charset=utf-8');
});

document.querySelector('#exportJson').addEventListener('click', async () => {
  const state = await getState();
  download(`pininfo-research-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(state, null, 2), 'application/json');
});

document.querySelector('#clearResearch').addEventListener('click', async () => {
  await chrome.storage.local.set({ [RESEARCH_KEY]: [] });
  await refresh();
});

document.querySelector('#clearFavorites').addEventListener('click', async () => {
  await chrome.storage.local.set({ [FAVORITES_KEY]: [] });
  await refresh();
});

refresh();
