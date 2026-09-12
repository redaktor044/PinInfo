(() => {
  'use strict';
  const processed = new WeakSet();
  const ui = new Map();
  let openPanel = null;

  const clean = value => typeof value === 'string' ? value.replace(/\s+/g,' ').trim() : null;
  const absolute = value => { try { return new URL(value, location.origin).href; } catch { return null; } };
  const pinId = url => url?.match(/\/pin\/(\d+)/i)?.[1] || null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function metric(label, text=document.body.innerText) {
    const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:\\-]?\\s*([0-9][0-9.,]*[KMB]?)','i');
    return text.match(re)?.[1] || null;
  }

  function extractMetrics(url) {
    const isSingle = new RegExp(`/pin/${pinId(url)}(?:/|$)`, 'i').test(location.href);
    if (!isSingle) return { impressions:null, saves:null, pin_clicks:null, outbound_clicks:null, metrics_source:'unavailable' };
    const text = document.body.innerText || '';
    const found = {
      impressions: metric('Impressions', text),
      saves: metric('Saves', text),
      pin_clicks: metric('Pin clicks', text) || metric('Clicks', text),
      outbound_clicks: metric('Outbound clicks', text),
      comments: metric('Comments', text)
    };
    const any = Object.values(found).some(Boolean);
    return {...found, metrics_source:any?'dom':'unavailable'};
  }

  function parsePin(anchor) {
    const url = absolute(anchor.getAttribute('href'));
    if (!url || !/\/pin\/\d+/i.test(url)) return null;
    const container = anchor.closest('div') || anchor.parentElement || anchor;
    const image = anchor.querySelector('img') || container.querySelector?.('img');
    const title = clean(image?.alt) || clean(anchor.getAttribute('aria-label')) || clean(container.getAttribute?.('aria-label'));
    const links = [...container.querySelectorAll?.('a[href]') || []];
    const profile = links.find(a => /\/(?:[a-z0-9_-]+)\/?$/i.test(new URL(a.href).pathname) && !/\/pin\//i.test(a.href));
    return {
      id: pinId(url), url, pin_url:url, image_url:image?.currentSrc || image?.src || null,
      title, creator:profile?.textContent?.trim() || null, creator_url:profile?.href || null,
      observed_at:new Date().toISOString(), observed_from_url:location.href, source:'dom',
      ...extractMetrics(url)
    };
  }

  function send(type,pin){return new Promise(resolve=>chrome.runtime.sendMessage({type,pin},r=>resolve(chrome.runtime.lastError?{ok:false}:r||{ok:false})));}

  async function favorite(pin, button){const r=await send('PININFO_TOGGLE_FAVORITE',pin);if(r.ok){button.textContent=r.favorite?'★':'☆';button.classList.toggle('active',r.favorite)}}
  async function research(pin, button){const r=await send('PININFO_SAVE_RESEARCH',pin);if(r.ok){button.textContent='✓ SAVED';button.classList.add('saved')}}

  function createUI(anchor,pin){
    if(ui.has(anchor))return;
    const badge=document.createElement('button');badge.className='pininfo-badge';badge.type='button';badge.innerHTML='<span>PI</span><b>PinInfo</b>';
    const panel=document.createElement('section');panel.className='pininfo-panel';panel.innerHTML=`
      <header><div><strong>PinInfo</strong><small>PIN RESEARCH</small></div><button class="close">×</button></header>
      <div class="pininfo-title">${esc(pin.title || 'Untitled Pin')}</div>
      <div class="pininfo-grid">
        <div><b>${esc(pin.saves || '—')}</b><small>Saves</small></div>
        <div><b>${esc(pin.pin_clicks || '—')}</b><small>Pin clicks</small></div>
        <div><b>${esc(pin.outbound_clicks || '—')}</b><small>Outbound</small></div>
        <div><b>${esc(pin.impressions || '—')}</b><small>Impressions</small></div>
      </div>
      <div class="pininfo-meta"><span>👤 ${esc(pin.creator || 'Creator unavailable')}</span><span>🆔 ${esc(pin.id || '—')}</span></div>
      <div class="pininfo-note">${pin.metrics_source==='dom'?'✓ Metrics observed on this Pinterest page':'— Pinterest metrics are not exposed on this page'}</div>
      <div class="pininfo-buttons"><button class="fav">☆</button><button class="save">SAVE TO RESEARCH</button><a class="open" target="_blank">OPEN PIN ↗</a></div>`;
    panel.querySelector('.fav').addEventListener('click',e=>favorite(pin,e.currentTarget));
    panel.querySelector('.save').addEventListener('click',e=>research(pin,e.currentTarget));
    panel.querySelector('.open').href=pin.url;
    panel.querySelector('.close').addEventListener('click',()=>closePanel());
    badge.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();togglePanel(anchor,panel,badge)});
    document.body.appendChild(badge);document.body.appendChild(panel);
    ui.set(anchor,{badge,panel,pin});
    position(anchor,badge,panel);
  }

  function position(anchor,badge,panel){const r=anchor.getBoundingClientRect();const bw=70,bh=28;badge.style.left=`${Math.max(4,Math.min(innerWidth-bw-4,r.left+6))}px`;badge.style.top=`${Math.max(4,r.top+6)}px`;if(panel.classList.contains('open')){const pw=300,ph=300;let left=r.right+10;if(left+pw>innerWidth)left=Math.max(8,r.left-pw-10);let top=Math.min(Math.max(8,r.top),innerHeight-ph-8);panel.style.left=`${left}px`;panel.style.top=`${top}px`}}
  function togglePanel(anchor,panel,badge){if(openPanel&&openPanel!==panel)openPanel.classList.remove('open');const open=panel.classList.toggle('open');badge.classList.toggle('active',open);openPanel=open?panel:null;position(anchor,badge,panel)}
  function closePanel(){if(openPanel){openPanel.classList.remove('open');openPanel=null}document.querySelectorAll('.pininfo-badge.active').forEach(b=>b.classList.remove('active'))}

  function scan(root=document){for(const anchor of root.querySelectorAll?.('a[href*="/pin/"]')||[]){if(processed.has(anchor))continue;processed.add(anchor);const pin=parsePin(anchor);if(pin)createUI(anchor,pin)}}
  function refresh(){for(const [anchor,{badge,panel}] of ui){if(!document.contains(anchor)){badge.remove();panel.remove();ui.delete(anchor);continue}position(anchor,badge,panel)}}
  scan();
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)}))).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('scroll',refresh,{passive:true});addEventListener('resize',refresh);document.addEventListener('click',e=>{if(openPanel&&!e.target.closest('.pininfo-panel,.pininfo-badge'))closePanel()});
})();
