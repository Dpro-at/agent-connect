# Using Agent Connect

Agent Connect by Dpro connects persistent Node.js applications to messaging platforms, inboxes and webhooks. The npm package is `agent-connect-dpro`. Source version 0.2.0 includes 33 integrations; see the [complete catalog and optional Python setup](CHANNELS.md).

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
