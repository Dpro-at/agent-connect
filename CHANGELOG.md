# Changelog

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
