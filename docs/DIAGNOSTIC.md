# PinInfo Diagnostic Mode

## Purpose

Diagnostic mode maps data that is observable in the current Pinterest browser page. It is deliberately privacy-safe: it does not export cookies, localStorage, sessionStorage, authorization headers, credentials, or private account data.

## Test procedure

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the PinInfo repository folder.
5. Open `https://www.pinterest.com/` while logged in normally.
6. Let several Pins load.
7. Click **PinInfo • Export diagnostic** in the bottom-right corner.
8. Repeat on several contexts: home feed, search results, creator profile, board, and an individual Pin.
9. Keep the exported JSON files locally and inspect them before sharing.

## What the collector records

- page URL and title
- detected Pin URLs / IDs
- visible image URLs and alt text
- selected HTML meta fields
- JSON-LD structured data
- selected application JSON script payloads
- relevant Pinterest links
- basic browser/page environment information

## What it deliberately does not record

- cookies
- localStorage / sessionStorage
- authentication tokens
- authorization headers
- passwords
- form contents
- private messages
- individual user identities inferred from private data

## Audit goal

For each desired Pin field we will classify provenance as DOM, structured-data, embedded-state, official API, or unavailable. Individual saver/share identities are not assumed to be available merely because an aggregate save/share metric exists.

## Next phase

Use diagnostic samples to build a resilient parser and regression fixtures. Do not add undocumented access-control bypasses or anti-bot workarounds.
