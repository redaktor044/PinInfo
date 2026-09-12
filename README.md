# PinInfo

Pinterest research assistant for Chrome.

## Current status

**v0.1.0 — observation MVP**

PinInfo currently:
- detects visible Pinterest Pin links in the DOM;
- extracts the Pin URL and Pin ID;
- extracts basic image/title information when exposed in the page DOM;
- adds a lightweight research overlay to detected Pins;
- stores selected Pins locally in Chrome storage;
- exports the research dataset as JSON.

It intentionally does **not** attempt to access private data, identify individual users who saved/shared a Pin, bypass Pinterest controls, or use undocumented security-sensitive endpoints.

## Architecture

```text
Pinterest page
     │
     ▼
Content observer (MutationObserver)
     │
     ▼
Pin DOM parser
     │
     ├── URL / Pin ID
     ├── visible title/alt text
     └── image URL
     │
     ▼
Research overlay
     │
     ▼
Chrome local storage
     │
     ▼
Popup → JSON export
```

## Install locally

1. Open Chrome → `chrome://extensions/`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the cloned `PinInfo` repository folder.
5. Open Pinterest and refresh the page.

## Research roadmap

### Phase 1 — Pinterest data audit
Verify, using the live Pinterest UI and page payloads, which fields are actually exposed for each Pin and under which contexts.

### Phase 2 — reliable extraction
Add modular extractors for structured metadata, embedded application state and visible UI values. Every field gets a provenance flag: `dom`, `structured-data`, `embedded-state`, `api`, or `unavailable`.

### Phase 3 — research dataset
Add CSV export, deduplication, snapshots and observation history so the same Pin can be compared over time.

### Phase 4 — trend engine
Calculate transparent scores from measurable signals such as freshness, engagement when available, repeat observations, topic frequency and creator momentum. No invented metrics.

### Phase 5 — dashboard
Rising topics, repeated keywords, creators, boards, formats and high-potential Pins.

### Phase 6 — optional authenticated/API integrations
Only after the public-data MVP is tested. API-only/private fields will be clearly separated from browser-observed data.

## Design principles

1. **Evidence first** — if Pinterest does not expose a value, PinInfo reports `unavailable` rather than guessing.
2. **Modular parsers** — Pinterest markup changes; extraction logic must be replaceable independently.
3. **Local-first research** — collected research stays in the user's browser unless an explicit sync feature is later added.
4. **No bypassing controls** — no circumvention of authentication, access controls or anti-abuse mechanisms.
5. **Explainable scoring** — trend scores must show their components.

## License

MIT
