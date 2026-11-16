# Using Agent Connect

Agent Connect by Dpro connects persistent Node.js applications to messaging platforms, inboxes and webhooks. The npm package is `agent-connect-dpro`. Source version 0.3.0 includes 33 integrations; see the [complete catalog and optional Python setup](CHANNELS.md).

## Install

Use Node.js 22.12 or newer:

```sh
npm install agent-connect-dpro
```

The package uses ESM and includes TypeScript declarations. See the [README examples](../README.md#telegram-example) for complete Telegram and Discord setup.

## Connect your application

1. Create a Telegram bot with BotFather or a Discord bot in the Developer Portal.
2. Supply the bot token through your server's secret configuration. Never expose it in browser code or commit it.
3. Create `ChannelConnector` with `TelegramTransport` or `DiscordTransport`.
4. In the `receive` hook, check trusted sender IDs before invoking your application or agent. For Discord, also check permitted channel IDs.
5. Call `connect()` once and `disconnect()` when shutting down. Call `send(conversationId, text)` to send a plain-text message and obtain the provider acknowledgement.

Telegram uses long polling and refuses to start if a webhook exists. Coordinate migration with your previous deployment. Discord requires Message Content Intent and View Channel/Send Messages permissions; this release supports guild text channels.

## Framework integration

Run the connector in a persistent Node.js backend or worker alongside Next.js, React, Express, Fastify or NestJS. Short-lived serverless functions are unsuitable for polling and Gateway connections. PHP/Python applications can call a separately hosted Node.js service; an HTTP bridge is not included in this package.

The host application owns authentication, sender authorization, storage, deduplication, rate limits and model execution. Agent Connect does not include an agent model, database, HTTP server or React interface. Agent Player supplies its own backend adapter and channel settings screens.

## Agent Player setup

In the separately configured Agent Player application:

1. Sign in as an active owner/admin and open `/dashboard/channels/telegram` or `/dashboard/channels/discord`.
2. Enable the extension, restart the backend and reload the page.
3. Save the bot token and trusted sender IDs. Discord also requires permitted channel IDs.
4. Keep automatic replies off while testing outbound and inbound messages. Confirm actual delivery in the provider.
5. Configure the primary agent's model, then explicitly enable automatic replies and verify an actual response.

These screens belong to Agent Player and are not shipped by the npm package. Empty allowlists intentionally block inbound agent processing.

## Release boundaries

The native Telegram/Discord transports have automated tests with fake provider clients. The optional Python worker has a local ntfy provider test, and all 33 adapter imports/factories are checked. Live bot/model validation remains pending. The shared API currently exposes plain-text sending; full media/interactive features and durable queues are outside this boundary. Python delivery is adapter-reported, so confirm receipt in the provider. See the catalog guide for runtime/SDK/service requirements.

## Support

Source and issues: [Dpro-at/agent-connect](https://github.com/Dpro-at/agent-connect).

Package: [agent-connect-dpro on npm](https://www.npmjs.com/package/agent-connect-dpro).


## Social publishing (0.3.0)

Social publishers are server-only and independent of `ChannelConnector`. No adapter loads credentials from the environment, stores credentials on disk, logs provider responses or retries requests automatically. Every action needs an explicit target. The host owns workspace authorization, encrypted credentials, OAuth consent/exchange/refresh, app reviews, approvals, media inspection, durable job claims and scheduling. The same adapters accept tokens from the service's app or a customer's own app; X is intended for customer-owned developer credentials and billing.

### Provider contracts and prerequisites

| Provider | Constructor / required options | Implemented formats | Important boundary |
| --- | --- | --- | --- |
| Facebook | `FacebookPagePublisher({apiVersion, getPageAccessToken})` | Feed text or one HTTPS image | Page token with publishing permissions; no personal profiles, video or Reels |
| Instagram | `InstagramPublisher({apiVersion, login, getAccessToken})` | One feed image, one Reel video, or one Story image/video | Professional account; `login` selects Instagram or Facebook token/API host; no carousels or sticker compositing |
| LinkedIn | `LinkedInPublisher({apiVersion, getAccessToken})` | Feed text or one image from `uploadImage(accountId, blob)` | Explicit person/organization URN, version in YYYYMM; organization permissions/review; no videos/multi-image |
| X | `XPublisher({getAccessToken})` | Feed text, up to four image IDs from `uploadImage(accountId, blob)` | User-context OAuth, not app-only bearer; user identity checked; host/customer covers API charges; no video upload |
| YouTube | `YouTubePublisher({getAccessToken})` | Video Blob with title/description, explicit privacy/audience | Channel ownership checked; resumable upload and processing status; no custom thumbnail or native scheduling |
| TikTok | `TikTokPublisher({getAccessToken})` | One URL video with inspected duration, or up to 35 URL photos | Creator options, explicit consent/privacy, URL-domain ownership and Direct Post audit; no file upload or branded-content controls |

Each constructor accepts an injected `fetch` and `timeoutMs` for testing/configuration. Credentials are selected through the host callback for the explicit account ID. API versions are deliberately host-selected rather than silently upgraded. Local validation is a subset of platform rules: providers enforce current eligibility, entitlements and quotas. X weighted text length is provider-validated, rather than incorrectly using JavaScript string length. Uploaded image helpers accept bounded JPEG/PNG Blobs (also WEBP for X). No adapter downloads arbitrary image/video URLs itself.

Official references: [Meta Page feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/), [Instagram publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/), [LinkedIn Posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [LinkedIn Images](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api), [X posts](https://docs.x.com/x-api/posts/create-post), [X media](https://docs.x.com/x-api/media/upload-media), [YouTube resumable uploads](https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol), [TikTok Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post).

### Facebook example

```ts
import { FacebookPagePublisher } from 'agent-connect-dpro/facebook';
const publisher = new FacebookPagePublisher({
  apiVersion: configuredMetaApiVersion,
  getPageAccessToken: pageId => credentialStore.getPageToken(workspaceId, pageId),
});
const delivery = await publisher.publish({
  platform: 'facebook', accountId: selectedPageId, placement: 'feed',
  text: approvedText, media: [{ kind: 'image', url: approvedImageUrl }],
});
```

### Async publishing and delivery uncertainty

Instagram `publish(post)` creates a container and returns `status: 'processing', stage: 'container'`. Persist its `providerId` and account before calling `complete({accountId, containerId})`. Each completion call checks status once; only a FINISHED container triggers publishing. IN_PROGRESS stays processing; ERROR/EXPIRED fails. Already-PUBLISHED containers return unknown delivery instead of sending again. Do not call `publish` repeatedly to poll. There are no sleeps or background polling loops.

YouTube uploads should use `beginUpload(post)` → persist the sensitive `YouTubeUpload` session privately → `upload(session, videoBlob)`. After a network interruption, use `queryUpload(session)` to learn uploaded byte count or recover a completed video ID. If still uploading, `upload(session, videoBlob, confirmedOffset)` resumes the remaining bytes. Do not create a new session blindly. `publish(post)` is a convenience for non-durable callers. Upload acceptance is processing, not completed publication; `getStatus(accountId, videoId)` checks the processing result. Shorts classification is YouTube's decision, not a separate guaranteed API placement. Default visibility is never inferred; the caller must choose it.

TikTok hosts must first call `getCreatorInfo(accountId)` and display the fresh privacy/interaction choices before collecting consent. `publish(post)` rechecks these choices, verifies the authenticated open_id and rejects excess video duration. It returns a processing publish ID; persist it and call `getStatus(accountId, publishId)` rather than submitting again. Only PUBLISH_COMPLETE means published; final public post IDs may be absent for private posts or pending moderation. Review/audit restrictions apply even to customer-owned keys. This adapter does not support branded-content disclosure; do not use it for such content until that workflow is implemented.

`SocialPublishError` exposes only safe `code` and `delivery` fields, never raw provider messages or causes. `not_sent` means local/preflight failure; `rejected` means a provider rejected that request; `unknown` means it may have been accepted (network/server failures or malformed acknowledgement). `payment_required` distinguishes HTTP 402. Errors after a container/upload was created do not erase that checkpoint; persist each returned checkpoint before progressing. No cross-platform transaction or exactly-once guarantee exists. The host must serialize jobs, bind approval to exact content/targets, back off on quotas and reconcile uncertain outcomes. Success IDs acknowledge provider acceptance/processing; public visibility is not guaranteed. Blob upload helpers use bounded in-memory images; video callers own resource limits and storage.

### Shared browser studio

`agent-connect-dpro/studio` exports `mountSocialStudio` and TypeScript declarations. It is a dependency-free browser component with a Shadow DOM editor, six platform previews, calendar, content library and account summary. No React or Angular dependency is added to the server package. Consumers mount it once and destroy it on unmount; they do not rebuild these screens.

```ts
import { mountSocialStudio } from 'agent-connect-dpro/studio';
const studio = await mountSocialStudio(containerElement, {
  mode: 'connected', workspaceName: 'My workspace',
  accounts: [{ platform: 'facebook', id: selectedPageId, name: 'My Page' }],
  posts: workspacePosts,
  onSave: post => workspaceApi.savePost(post),
  onPublish: post => workspaceApi.publishApprovedPost(post),
  onDelete: id => workspaceApi.deletePost(id),
  onConnect: platform => workspaceApi.connectAccount(platform),
  onReconnect: account => workspaceApi.reconnectAccount(account),
  onCheckConnection: account => workspaceApi.checkAccount(account),
  onDisconnect: account => workspaceApi.disconnectAccount(account),
  onUpload: file => workspaceApi.uploadMedia(file),
});
// On host refresh: studio.setPosts(updatedWorkspacePosts);
// On component unmount: studio.destroy();
```

Supply all available accounts; multiple accounts on the same platform are supported with no package-imposed count limit. Selecting a platform opens its searchable account chooser with Select all and Clear selection. Each saved `accountIds` value is an array, for example `{ facebook: ['page-1', 'page-2'], instagram: ['ig-1', 'ig-2'] }`. The host must dispatch and track one delivery per selected account, retaining platform/workspace identity in its credential lookup. Platform quotas and app-review limits still apply. `onConnect(platform)` performs the host's OAuth flow and returns account metadata only (one account or an array); no credentials enter the studio. Call `studio.setAccounts(updatedAccounts)` when workspace accounts change. The Accounts view uses a Connect account dialog: select a platform, continue through host authorization, then add returned account metadata only after success. `onReconnect(account)` renews the same account (a different ID is rejected); `onCheckConnection(account)` returns refreshed metadata/status; `onDisconnect(account)` runs only after explicit confirmation and removes the local account after host success. Cancellation/failure preserves current connections. Account metadata supports `status: connected | expired | error`, `expiresAt` and `lastCheckedAt`; expired/error accounts cannot be selected as publishing targets. Demo mode explicitly labels the simulated authorization step and persists sample metadata locally, without opening real provider login pages. Connected mode never uses browser local storage for posts or credentials. Callbacks must return authoritative saved post state; no callback means that action is unavailable. Shared UI posts are editable drafts, not raw API requests: the host maps them to platform contracts, resolves local wall time against the workspace timezone, enforces permissions/media rules, and collects any additional platform fields (YouTube audience, TikTok fresh creator settings/disclosures) before calling a publisher. The shared studio is not a compliant TikTok export screen or an OAuth/account-registration screen by itself. Those provider-specific host flows are still required.

The studio is an embedded panel: its four sections (Editor, Calendar, Posts, Accounts) are horizontal tabs, with no sidebar, global app navigation, marketing header or viewport-height requirement. Layout follows the mounting container width, not just the browser viewport. Platform SVG marks are bundled locally under `studio/icons/`; their sources and per-icon licenses are recorded in `sources.json` with the registry MIT notice. No CDN or additional UI framework is loaded.

Pass `theme: 'light' | 'dark' | 'system'` when mounting, or call `studio.setTheme(theme)` when the host theme changes. The base palette, compact spacing and system-font stack follow the Girru design rules. The host can override semantic CSS custom properties on the mounting element: `--studio-canvas`, `--studio-surface`, `--studio-subtle`, `--studio-text`, `--studio-muted`, `--studio-border`, `--studio-control`, `--studio-accent` and `--studio-on-accent`. Preview cards keep the illustrated platform's own appearance. Tabs support arrow/Home/End keys; New uses Cmd/Ctrl+N within the component. Optional fields live in Post options; validation opens and focuses the required review field. Media supports picker or drop. Demo deletion offers Undo; connected deletion offers Undo only when the host supplies `onRestore(post)` for its soft-delete workflow. Cmd/Ctrl+Z restores outside text inputs without stealing the editor's native undo.

Previews are approximate. A CSS crop does not alter or export the media. Validate files and prepare per-platform variants server-side. Browser media upload is delegated to `onUpload`; demo-only local file previews must be reselected after reopening.

For a standalone local demo, run `npm run demo` and visit `http://127.0.0.1:4318`. It uses the same component in explicit `mode: 'demo'`, sample accounts, simulated publishing and browser-local sample posts. No real credentials or provider requests are involved. The demo server is development-only and excluded from npm packaging. Consumers must allow the component's injected styles in their content-security policy (or adapt the style delivery to their policy); no external fonts/CDN assets are needed.
