const STORAGE_KEY = 'pininfo:research';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY).then((data) => {
    if (!Array.isArray(data[STORAGE_KEY])) {
      chrome.storage.local.set({ [STORAGE_KEY]: [] });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PININFO_SAVE_RESEARCH') return;

  chrome.storage.local.get(STORAGE_KEY).then((data) => {
    const current = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
    const pin = message.pin;
    if (!pin?.url) return sendResponse({ ok: false, error: 'Missing pin URL' });

    const next = [
      pin,
      ...current.filter((item) => item.url !== pin.url)
    ].slice(0, 5000);

    return chrome.storage.local.set({ [STORAGE_KEY]: next }).then(() => {
      sendResponse({ ok: true, count: next.length });
    });
  }).catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
