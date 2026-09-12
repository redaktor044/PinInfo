(() => {
  'use strict';

  const VERSION = '0.1.0-diagnostic';
  const MAX_TEXT = 5000;
  const MAX_HTML = 12000;

  const clean = (value, max = MAX_TEXT) => {
    if (value == null) return null;
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, max) : null;
  };

  function getPinId(url = location.href) {
    const match = url.match(/\/pin\/(\d+)/i);
    return match ? match[1] : null;
  }

  function extractLinks(root = document) {
    return [...root.querySelectorAll('a[href]')]
      .map(a => ({ text: clean(a.textContent, 300), href: a.href }))
      .filter(x => x.href.includes('pinterest.') || x.href.includes('/pin/'))
      .slice(0, 100);
  }

  function collectStructuredData() {
    return [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node, index) => ({ index, text: clean(node.textContent, 8000) }))
      .filter(x => x.text);
  }

  function collectEmbeddedState() {
    const selectors = [
      'script[id*="__PWS"]',
      'script[id*="initial"]',
      'script[type="application/json"]'
    ];

    const found = [];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        const text = clean(node.textContent, MAX_HTML);
        if (text) found.push({ selector, id: node.id || null, text });
        if (found.length >= 20) return found;
      }
    }
    return found;
  }

  function collectMeta() {
    const names = [
      'description', 'og:title', 'og:description', 'og:image', 'og:url',
      'twitter:title', 'twitter:description', 'twitter:image'
    ];
    return names.map(name => {
      const node = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      return { name, content: node?.content || null };
    }).filter(x => x.content);
  }

  function collectVisiblePinCandidates() {
    const nodes = [...document.querySelectorAll('a[href*="/pin/"]')].slice(0, 100);
    return nodes.map((a, index) => {
      const img = a.querySelector('img');
      return {
        index,
        href: a.href,
        text: clean(a.textContent, 500),
        image: img ? { src: img.currentSrc || img.src || null, alt: clean(img.alt, 500) } : null,
        rect: (() => {
          const r = a.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        })()
      };
    });
  }

  function buildReport() {
    const report = {
      schema_version: 1,
      extension_version: VERSION,
      captured_at: new Date().toISOString(),
      page: {
        url: location.href,
        title: clean(document.title),
        pin_id: getPinId()
      },
      environment: {
        language: navigator.language,
        user_agent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      },
      observable: {
        meta: collectMeta(),
        structured_data: collectStructuredData(),
        embedded_state: collectEmbeddedState(),
        pin_candidates: collectVisiblePinCandidates(),
        relevant_links: extractLinks()
      },
      privacy: {
        note: 'Diagnostic export intentionally excludes cookies, localStorage, sessionStorage, authorization headers and credentials.'
      }
    };

    return report;
  }

  function downloadReport(report) {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `pininfo-diagnostic-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function addDiagnosticButton() {
    if (document.getElementById('pininfo-diagnostic-button')) return;

    const button = document.createElement('button');
    button.id = 'pininfo-diagnostic-button';
    button.type = 'button';
    button.textContent = 'PinInfo • Export diagnostic';
    Object.assign(button.style, {
      position: 'fixed', right: '18px', bottom: '18px', zIndex: '2147483647',
      padding: '10px 14px', border: '0', borderRadius: '999px',
      background: '#111', color: '#fff', font: '600 13px/1.2 system-ui, sans-serif',
      boxShadow: '0 4px 18px rgba(0,0,0,.25)', cursor: 'pointer'
    });

    button.addEventListener('click', () => {
      button.disabled = true;
      button.textContent = 'PinInfo • collecting…';
      try {
        downloadReport(buildReport());
        button.textContent = 'PinInfo • exported ✓';
      } catch (error) {
        console.error('[PinInfo] diagnostic error', error);
        button.textContent = 'PinInfo • error';
      }
      setTimeout(() => {
        button.disabled = false;
        button.textContent = 'PinInfo • Export diagnostic';
      }, 2500);
    });

    document.documentElement.appendChild(button);
  }

  function boot() {
    addDiagnosticButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
