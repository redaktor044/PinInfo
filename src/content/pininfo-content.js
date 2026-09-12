(() => {
  'use strict';

  const processed = new WeakSet();
  const ui = new Map();
  let openPanel = null;

  const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : null;
  const absolute = value => { try { return new URL(value, location.href).href; } catch { return null; } };
  const pinId = url => url?.match(/\/pin\/(\d+)/i)?.[1] || null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function numberValue(value) {
    if (!value) return null;
    const s = String(value).replace(/\s/g, '').replace(',', '.').toUpperCase();
    const m = s.match(/([0-9]+(?:\.[0-9]+)?)([KMB])?/);
    if (!m) return null;
    const mult = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'B' ? 1e9 : 1;
    return Math.round(Number(m[1]) * mult);
  }

  function metricFromText(labels, text) {
    if (!text) return null;
    for (const label of labels) {
      const re = new RegExp(`(?:^|[^a-z])${label}(?:[^0-9]{0,35})([0-9][0-9.,]*\\s*[KMB]?)`, 'i');
      const match = text.match(re);
      if (match) return numberValue(match[1]);
    }
    return null;
  }

  function extractMetrics(container, url) {
    const pageText = clean(container?.innerText || '') || '';
    const aria = [...(container?.querySelectorAll?.('[aria-label]') || [])].map(el => el.getAttribute('aria-label')).filter(Boolean).join(' | ');
    const text = `${pageText} | ${aria}`;
    const singlePin = new RegExp(`/pin/${pinId(url)}(?:/|$)`, 'i').test(location.href);

    const found = {
      saves: metricFromText(['saves?', 'saved'], text),
      comments: metricFromText(['comments?'], text),
      impressions: null,
      pin_clicks: null,
      outbound_clicks: null
    };

    if (singlePin) {
      found.impressions = metricFromText(['impressions?'], document.body.innerText || '');
      found.pin_clicks = metricFromText(['pin clicks?', 'clicks?'], document.body.innerText || '');
      found.outbound_clicks = metricFromText(['outbound clicks?', 'outbound'], document.body.innerText || '');
    }

    const source = [found.saves, found.comments, found.impressions, found.pin_clicks, found.outbound_clicks].some(v => v != null)
      ? (singlePin ? 'pinterest-page' : 'pin-card')
      : 'unavailable';
    return { ...found, metrics_source: source };
  }

  function extractKeywords(title, description, imageAlt) {
    const stop = new Set(['the','and','for','with','from','this','that','your','you','how','what','are','into','about','jak','dla','z','na','do','w','i','lub','or','to','jest','się','ten','ta','te']);
    const text = `${title || ''} ${description || ''} ${imageAlt || ''}`.toLowerCase();
    const words = text.match(/[a-ząćęłńóśźż0-9]{4,}/gi) || [];
    const counts = new Map();
    words.forEach(w => { if (!stop.has(w)) counts.set(w, (counts.get(w) || 0) + 1); });
    return [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  }

  function researchScore(pin) {
    let score = 35;
    if (pin.title) score += 10;
    if (pin.image_url) score += 10;
    if (pin.creator) score += 5;
    if (pin.saves != null) score += Math.min(20, Math.log10(pin.saves + 1) * 7);
    if (pin.comments != null) score += Math.min(10, Math.log10(pin.comments + 1) * 4);
    if (pin.outbound_clicks != null) score += Math.min(10, Math.log10(pin.outbound_clicks + 1) * 4);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function parsePin(anchor) {
    const url = absolute(anchor.getAttribute('href'));
    if (!url || !/\/pin\/\d+/i.test(url)) return null;

    const card = anchor.closest('[data-test-id]') || anchor.closest('article') || anchor.parentElement?.parentElement || anchor.parentElement || anchor;
    const image = anchor.querySelector('img') || card.querySelector?.('img');
    const title = clean(image?.alt) || clean(anchor.getAttribute('aria-label')) || clean(card.getAttribute?.('aria-label')) || clean(card.textContent)?.slice(0, 180);
    const description = clean(card.getAttribute?.('data-description')) || clean(card.querySelector?.('[data-test-id*="description"]')?.textContent);
    const links = [...(card.querySelectorAll?.('a[href]') || [])];
    const profile = links.find(a => {
      try { const path = new URL(a.href).pathname; return /^\/[a-z0-9_-]+\/?$/i.test(path) && !/\/pin\//i.test(a.href); } catch { return false; }
    });
    const boardLink = links.find(a => /\/pin\/\d+\/|\/boards?\//i.test(a.href) && !/\/pin\/\d+\/?$/i.test(a.href));
    const metrics = extractMetrics(card, url);

    const pin = {
      id: pinId(url),
      url,
      pin_url: url,
      image_url: image?.currentSrc || image?.src || null,
      title,
      description,
      creator: clean(profile?.textContent),
      creator_url: profile?.href || null,
      board: clean(boardLink?.textContent),
      board_url: boardLink?.href || null,
      source_url: location.href,
      observed_from_url: location.href,
      observed_at: new Date().toISOString(),
      is_video: !!card.querySelector?.('video'),
      keywords: extractKeywords(title, description, image?.alt),
      ...metrics
    };
    pin.research_score = researchScore(pin);
    pin.trend_score = pin.research_score;
    return pin;
  }

  function send(type, pin) {
    return new Promise(resolve => chrome.runtime.sendMessage({ type, pin }, r => resolve(chrome.runtime.lastError ? { ok:false, error:chrome.runtime.lastError.message } : r || { ok:false })));
  }

  async function observe(pin) { await send('PININFO_OBSERVE_PIN', pin); }
  async function favorite(pin, button) { const r = await send('PININFO_TOGGLE_FAVORITE', pin); if (r.ok) { button.textContent = r.favorite ? '★' : '☆'; button.classList.toggle('active', r.favorite); } }
  async function research(pin, button) { const r = await send('PININFO_SAVE_RESEARCH', pin); if (r.ok) { button.textContent = '✓ SAVED'; button.classList.add('saved'); } }

  function metricBox(value, label, hint = '') {
    return `<div class="pininfo-metric ${value == null ? 'muted' : ''}"><b>${esc(value == null ? '—' : Intl.NumberFormat().format(value))}</b><small>${label}</small>${hint ? `<em>${hint}</em>` : ''}</div>`;
  }

  function createUI(anchor, pin) {
    if (ui.has(anchor)) return;

    const badge = document.createElement('button');
    badge.className = 'pininfo-badge';
    badge.type = 'button';
    badge.innerHTML = `<span>PI</span><b>${esc(pin.research_score)}</b><small>PinInfo</small>`;
    badge.title = 'Open PinInfo research';

    const panel = document.createElement('section');
    panel.className = 'pininfo-panel';
    panel.innerHTML = `
      <header><div><strong>PinInfo</strong><small>PIN RESEARCH ENGINE</small></div><button class="close" aria-label="Close">×</button></header>
      <div class="pininfo-title">${esc(pin.title || 'Untitled Pin')}</div>
      <div class="pininfo-score"><span>RESEARCH SCORE</span><b>${esc(pin.research_score)}/100</b></div>
      <div class="pininfo-grid">
        ${metricBox(pin.saves, 'Saves', pin.saves != null ? 'observed' : 'not exposed')}
        ${metricBox(pin.pin_clicks, 'Pin clicks', pin.pin_clicks != null ? 'observed' : 'analytics')}
        ${metricBox(pin.outbound_clicks, 'Outbound', pin.outbound_clicks != null ? 'observed' : 'analytics')}
        ${metricBox(pin.impressions, 'Impressions', pin.impressions != null ? 'observed' : 'analytics')}
      </div>
      <div class="pininfo-secondary">${metricBox(pin.comments, 'Comments')}<div class="pininfo-facts"><span>🆔 ${esc(pin.id || '—')}</span><span>🎥 ${pin.is_video ? 'Video Pin' : 'Static Pin'}</span><span>🔎 ${esc((pin.keywords || []).slice(0,5).join(' · ') || 'No keywords')}</span></div></div>
      <div class="pininfo-meta"><span>👤 ${esc(pin.creator || 'Creator unavailable')}</span>${pin.board ? `<span>📁 ${esc(pin.board)}</span>` : ''}</div>
      <div class="pininfo-note">${pin.metrics_source === 'pinterest-page' ? '✓ Pinterest analytics visible on this Pin page' : pin.metrics_source === 'pin-card' ? '✓ Observable count found in this Pin card' : '— Pinterest does not expose these analytics for this Pin here. PinInfo will not invent them.'}</div>
      <div class="pininfo-buttons"><button class="fav" title="Favorite">☆</button><button class="save">SAVE TO RESEARCH</button><a class="open" target="_blank" rel="noreferrer">OPEN PIN ↗</a></div>`;

    panel.querySelector('.fav').addEventListener('click', e => favorite(pin, e.currentTarget));
    panel.querySelector('.save').addEventListener('click', e => research(pin, e.currentTarget));
    panel.querySelector('.open').href = pin.url;
    panel.querySelector('.close').addEventListener('click', closePanel);
    badge.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(anchor, panel, badge); });

    document.body.appendChild(badge);
    document.body.appendChild(panel);
    ui.set(anchor, { badge, panel, pin });
    position(anchor, badge, panel);
    observe(pin);
  }

  function position(anchor, badge, panel) {
    const r = anchor.getBoundingClientRect();
    const bw = 72, bh = 28;
    badge.style.left = `${Math.max(4, Math.min(innerWidth - bw - 4, r.left + 6))}px`;
    badge.style.top = `${Math.max(4, Math.min(innerHeight - bh - 4, r.top + 6))}px`;
    if (panel.classList.contains('open')) {
      const pw = 350, ph = Math.min(520, innerHeight - 16);
      let left = r.right + 12;
      if (left + pw > innerWidth) left = Math.max(8, r.left - pw - 12);
      let top = Math.min(Math.max(8, r.top), innerHeight - ph - 8);
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }
  }

  function togglePanel(anchor, panel, badge) {
    if (openPanel && openPanel !== panel) openPanel.classList.remove('open');
    const open = panel.classList.toggle('open');
    document.querySelectorAll('.pininfo-badge.active').forEach(b => b.classList.remove('active'));
    badge.classList.toggle('active', open);
    openPanel = open ? panel : null;
    position(anchor, badge, panel);
  }

  function closePanel() {
    if (openPanel) openPanel.classList.remove('open');
    openPanel = null;
    document.querySelectorAll('.pininfo-badge.active').forEach(b => b.classList.remove('active'));
  }

  function scan(root = document) {
    const anchors = [];
    if (root.matches?.('a[href*="/pin/"]')) anchors.push(root);
    anchors.push(...(root.querySelectorAll?.('a[href*="/pin/"]') || []));
    for (const anchor of anchors) {
      if (processed.has(anchor)) continue;
      const pin = parsePin(anchor);
      if (!pin) continue;
      processed.add(anchor);
      createUI(anchor, pin);
    }
  }

  function refresh() {
    for (const [anchor, { badge, panel }] of ui) {
      if (!document.contains(anchor)) { badge.remove(); panel.remove(); ui.delete(anchor); continue; }
      position(anchor, badge, panel);
    }
  }

  scan();
  new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); }))).observe(document.documentElement, { childList:true, subtree:true });
  addEventListener('scroll', refresh, { passive:true });
  addEventListener('resize', refresh);
  document.addEventListener('click', e => { if (openPanel && !e.target.closest('.pininfo-panel,.pininfo-badge')) closePanel(); });
})();
