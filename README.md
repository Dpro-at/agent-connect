<div align="center">

# Agent Connect

**Messaging and webhook connectors by Dpro.**

<p>
  <img src="docs/brand/channels/telegram.svg" alt="Telegram" title="Telegram" height="32">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/brand/channels/discord.svg" alt="Discord" title="Discord" height="32">
</p>

33 bundled integrations. One framework-independent TypeScript interface.

[![CI](https://github.com/Dpro-at/agent-connect/actions/workflows/ci.yml/badge.svg)](https://github.com/Dpro-at/agent-connect/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

Messaging and webhook connectors by **Dpro**. Agent Connect is a standalone TypeScript library for persistent Node.js applications. It does not require Next.js, React, Fastify, a database, or a particular AI framework. Telegram and Discord retain native Node.js transports; additional adapters use an optional isolated Python runtime.

Package name: `agent-connect-dpro`. Version 0.2.0 bundles all 33 integrations in the channel catalog. npm accepted publication on October 11, 2026; registry processing may delay availability. Version 0.1.0 is already available on npm. Live-account validation remains pending.

See the [usage and integration guide](docs/USAGE.md).
See the complete [channel catalog and Python runtime setup](docs/CHANNELS.md).

## Requirements

Node.js 22.12 or newer and a persistent server process. Additional adapters require Python 3.11–3.13, the base runtime and provider-specific SDKs or bridges. No Python environment or account is installed/activated during npm installation. Run one process per bot token.

## Installation

Install from npm:

```sh
npm install agent-connect-dpro
```

The [npm package](https://www.npmjs.com/package/agent-connect-dpro) exports ESM JavaScript and TypeScript declarations. CommonJS consumers can use dynamic `import()`.

## Telegram example

```ts
import { ChannelConnector, TelegramTransport } from 'agent-connect-dpro';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const trustedSenders = new Set(['YOUR_TELEGRAM_USER_ID']);
const channel = new ChannelConnector('telegram', new TelegramTransport(token), {
  async receive(message) {
    if (!trustedSenders.has(message.senderId)) return;
    // Authorize the sender before saving messages or invoking an agent.
    await channel.send(message.conversationId, 'Message received.');
  },
  onError(operation) {
    // Provider errors can contain credentials; log a safe summary only.
    console.warn(`Telegram ${operation} failed`);
  },
});
await channel.connect();
process.once('SIGINT', async () => {
  await channel.disconnect();
  process.exit(0);
});
```

Create a bot with Telegram's BotFather. This transport uses grammY long polling and refuses to start when a webhook is already configured. Remove the webhook in the previous deployment before migrating; Agent Connect never deletes it automatically. Group privacy settings determine which messages Telegram sends to a bot. See the [grammY guide](https://grammy.dev/guide/getting-started).

## Discord example

```ts
import { ChannelConnector, DiscordTransport } from 'agent-connect-dpro';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error('DISCORD_BOT_TOKEN is required');
const allowedUsers = new Set(['YOUR_DISCORD_USER_ID']);
const allowedChannels = new Set(['YOUR_DISCORD_CHANNEL_ID']);
const channel = new ChannelConnector('discord', new DiscordTransport(token), {
  async receive(message) {
    if (!allowedUsers.has(message.senderId)) return;
    if (!allowedChannels.has(message.conversationId)) return;
    await channel.send(message.conversationId, 'Message received.');
  },
});
await channel.connect();
// Call await channel.disconnect() during application shutdown.
```

Enable Message Content Intent in Discord Developer Portal and invite the bot with View Channel and Send Messages permissions. This release receives guild text messages and ignores bots, webhooks and direct messages. Outbound automatic mentions are disabled. See the [discord.js Client documentation](https://discord.js.org/docs/packages/discord.js/main/Client:Class).

## API

`ChannelConnector(id, transport, hooks)` provides:

| Member | Contract |
| --- | --- |
| `id` | Any ID in `CHANNEL_CATALOG`; use a matching native or Python transport |
| `state` | `disconnected`, `connecting`, `connected`, or `error` |
| `connect()` | Start the provider transport; concurrent calls share startup |
| `disconnect()` | Stop the transport and reject messages from the previous connection |
| `send(conversationId, text)` | Send plain text and return `{id, conversationId}` after provider acknowledgement |

`hooks.receive(message)` receives `channel`, `id`, `conversationId`, `senderId`, `senderName`, `text`, `timestamp`, and optional `guildId`. `hooks.onError(operation, error)` reports connect, receive or send failures. The host owns sender authorization, persistence, deduplication and agent execution. The core does not authorize users automatically.

`ChannelTransport` is the extension contract: implement `start(receive, state)`, `stop()`, and `send(conversationId, text)` to add a provider. Provider-specific imports are also available at `agent-connect-dpro/telegram` and `agent-connect-dpro/discord`.

Text limits are 4096 characters for Telegram and 2000 for Discord. The core rejects oversized messages instead of truncating them. It does not retry sends automatically: a provider can accept a message before the network fails, making a retry potentially duplicate delivery. Attachments, rich keyboards, slash command registration and durable queues are outside this release.

## Using other frameworks

Import the library into an Express, Fastify, NestJS or persistent Next.js-adjacent Node.js service, then supply your own configuration and identity checks. For PHP, Python or other backend languages, wrap the library in a persistent HTTP service and call that service. React UI and HTTP endpoints are host integrations, not dependencies of the core.

Agent Player integrates the library through a separate Fastify adapter and React panel. The application repository contains its setup and integration tests; they are not part of this package.

## Development

From this standalone source directory:

```sh
npm ci
npm test
npm pack
```

Tests use fake provider clients and do not require Agent Player, external accounts or a model. `npm pack` builds first and includes compiled JavaScript, declarations, README, changelog, MIT license, NOTICE and channel icons. Internal collaboration notes and credentials are excluded.
