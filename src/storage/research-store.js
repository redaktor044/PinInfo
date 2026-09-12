export const RESEARCH_KEY = 'pininfo:research';
export const FAVORITES_KEY = 'pininfo:favorites';
export const MAX_ITEMS = 5000;

export async function getList(key) {
  const data = await chrome.storage.local.get(key);
  return Array.isArray(data[key]) ? data[key] : [];
}

export async function upsert(key, item) {
  if (!item?.url) throw new Error('Missing pin URL');
  const current = await getList(key);
  const next = [item, ...current.filter((x) => x.url !== item.url)].slice(0, MAX_ITEMS);
  await chrome.storage.local.set({ [key]: next });
  return next;
}

export async function remove(key, url) {
  const current = await getList(key);
  const next = current.filter((x) => x.url !== url);
  await chrome.storage.local.set({ [key]: next });
  return next;
}

export async function clear(key) {
  await chrome.storage.local.set({ [key]: [] });
}
