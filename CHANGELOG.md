# Changelog

## 0.3.0 — 2026-11-16

- Add Flowxtra-style connection dialog and per-account check/reconnect/disconnect callbacks, explicit confirmation, safe failure/cancellation, expiry states and unavailable-target exclusion.

- Support multiple accounts per platform, searchable account selection, host connection callbacks and per-platform target ID arrays; invalidate approval after content/target changes.

- Add independent social publishing contracts and a six-provider capability inventory.
- Add Facebook Page text/image, Instagram image/Reel/Story containers, LinkedIn text/image, X text/images, YouTube resumable video uploads and TikTok URL-based photos/video Direct Post.
- Resolve credentials through runtime host callbacks; sanitize failures, report uncertain delivery, and avoid automatic retries.
- Add reusable embedded browser studio with four horizontal tabs, editor, six previews, calendar, library and host callbacks, plus a source-only local demo.
- Apply compact Girru light/dark tokens, container-responsive layouts, bundled platform SVGs, keyboard tab navigation, media drop and deletion undo.
- Add fake-provider tests. Real-account delivery, OAuth flows and provider reviews remain unverified; live delivery remains unverified.

## 0.2.0 — 2026-10-11

- Bundle 33 messaging, inbox, webhook, API and relay integrations.
- Keep native Telegram/Discord transports and add an optional isolated Python adapter runtime.
- Include optional bridge sources, dependency diagnostics, the full channel catalog and required third-party MIT notice.
- Add local-provider tests for Node/Python inbound forwarding, send acknowledgements and shutdown.
- Python sends are adapter-reported; live provider/account validation remains pending.

## 0.1.0 — Release candidate

- Standalone ESM TypeScript library with typed channel, transport and delivery contracts.
- Telegram text messaging through long polling.
- Discord guild text messaging through Gateway events.
- Connection lifecycle, provider acknowledgement, safe delivery errors and text length checks.
- Injectable provider factories for offline transport tests.
- Root and provider-specific exports.
- Restart cleanup and cancellation of Telegram startup before polling begins.

Published on npm as agent-connect-dpro. Live-account validation remains pending.
