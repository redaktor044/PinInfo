const STORAGE_KEY = 'pininfo:research';
const FAVORITES_KEY = 'pininfo:favorites';
const MAX_ITEMS = 5000;

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([STORAGE_KEY, FAVORITES_KEY]);
  const patch = {};
  if (!Array.isArray(data[STORAGE_KEY])) patch[STORAGE_KEY] = [];
  if (!Array.isArray(data[FAVORITES_KEY])) patch[FAVORITES_KEY] = [];
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
});

async function getList(key) {
  const data = await chrome.storage.local.get(key);
  return Array.isArray(data[key]) ? data[key] : [];
}

async function upsert(key, pin) {
  if (!pin?.url) throw new Error('Missing pin URL');
  const current = await getList(key);
  const next = [pin, ...current.filter(item => item.url !== pin.url)].slice(0, MAX_ITEMS);
  await chrome.storage.local.set({ [key]: next });
  return next;
}

async function remove(key, url) {
  const current = await getList(key);
  const next = current.filter(item => item.url !== url);
  await chrome.storage.local.set({ [key]: next });
  return next;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case 'PININFO_OBSERVE_PIN': {
          const next = await upsert(STORAGE_KEY, message.pin);
          return sendResponse({ ok:true, count:next.length });
        }
        case 'PININFO_SAVE_RESEARCH': {
          const next = await upsert(STORAGE_KEY, message.pin);
          return sendResponse({ ok:true, count:next.length });
        }
        case 'PININFO_TOGGLE_FAVORITE': {
          const favorites = await getList(FAVORITES_KEY);
          const exists = favorites.some(item => item.url === message.pin?.url);
          const next = exists ? await remove(FAVORITES_KEY, message.pin.url) : await upsert(FAVORITES_KEY, message.pin);
          return sendResponse({ ok:true, favorite:!exists, count:next.length });
        }
        case 'PININFO_GET_STATE': {
          const [research, favorites] = await Promise.all([getList(STORAGE_KEY), getList(FAVORITES_KEY)]);
          return sendResponse({ ok:true, research, favorites });
        }
        case 'PININFO_CLEAR_RESEARCH':
          await chrome.storage.local.set({ [STORAGE_KEY]:[] });
          return sendResponse({ ok:true });
        case 'PININFO_CLEAR_FAVORITES':
          await chrome.storage.local.set({ [FAVORITES_KEY]:[] });
          return sendResponse({ ok:true });
        default:
          return sendResponse({ ok:false, error:'Unknown message' });
      }
    } catch (error) {
      return sendResponse({ ok:false, error:String(error) });
    }
  })();
  return true;
});
