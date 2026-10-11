# Channel catalog and runtime setup

Version 0.2.0 bundles 33 integrations. This inventory includes messaging providers, inboxes, webhooks, API interfaces and relay transports. It does not mean 33 accounts have been configured or live-tested.

Telegram and Discord keep their lightweight native Node.js transports. Every bundled adapter is also accessible through the optional isolated Python runtime. No Python package installation or account activation runs during `npm install`.

## Optional Python runtime

Install the package, then create an isolated Python 3.11–3.13 environment. From your application directory:

```sh
npm install agent-connect-dpro
python -m venv .channel-runtime
```

On Linux/macOS:

```sh
.channel-runtime/bin/python -m pip install -r node_modules/agent-connect-dpro/runtime/python/requirements-lock.txt
npx agent-connect doctor --python .channel-runtime/bin/python
```

On Windows PowerShell:

```powershell
.channel-runtime\Scripts\python.exe -m pip install -r node_modules/agent-connect-dpro/runtime/python/requirements-lock.txt
npx agent-connect doctor --python .channel-runtime\Scripts\python.exe
```

The doctor checks imports and registered factories without opening provider connections. Provider SDKs, external services, credentials and allowed sender/conversation IDs still require setup. Matrix encryption may require system libraries; iMessage integrations require their respective macOS server or Photon service. OS compatibility follows the provider's SDK and bridge requirements.

## Example: ntfy

```ts
import { ChannelConnector, PythonTransport } from 'agent-connect-dpro';

const allowedTopics = new Set(['private-topic']);
const channel = new ChannelConnector('ntfy', new PythonTransport('ntfy', {
  pythonExecutable: process.env.CHANNEL_PYTHON || '.channel-runtime/bin/python',
  stateDirectory: './private/channel-state/ntfy',
  settings: { extra: { server: 'https://ntfy.sh', topic: 'private-topic' } },
  environment: { NTFY_TOKEN: process.env.NTFY_TOKEN || '' },
}), {
  async receive(message) {
    if (!allowedTopics.has(message.senderId)) return;
    // ntfy identity is the topic, not an authenticated individual publisher.
    // Protect the topic through the provider's access controls.
    await channel.send(message.conversationId, 'Received.');
  },
});
await channel.connect();
// Disconnect during application shutdown.
```

`settings` accepts `token`, `api_key` and provider-specific `extra` fields. `environment` supplies provider environment variables over the private stdin pipe. `stateDirectory` stores private adapter/session data and must stay out of public assets and Git. Do not run two workers against the same bot account/state directory. Reserved process environment variables cannot be overridden through provider settings.

## Provider SDKs and bridges

Install SDKs only for the providers you select. See the catalog below for their configuration variables. Common optional SDKs include `slack-bolt`/`slack-sdk`, `lark-oapi` for Feishu, `dingtalk-stream`/`alibabacloud-dingtalk`, `mautrix[encryption]` for Matrix, Microsoft Teams apps SDK, and Google's API/auth clients for Google Chat. LINE, SMS and several webhook adapters use the base HTTP runtime.

WhatsApp uses the included Baileys bridge under `runtime/python/vendor/scripts/whatsapp-bridge`; run `npm ci` in that directory before configuring it. Photon uses the included Spectrum sidecar under `runtime/python/vendor/plugins/platforms/photon/sidecar`; install its own dependencies before setup. Buzz and Raft require their external CLI binaries. Signal requires a separately configured `signal-cli` HTTP daemon. These services and accounts are not installed or activated by the package.

## Agent Player

The Agent Player host adds a catalog at `/dashboard/channels/agent-connect`. Enable its Agent Connect extension and restart the backend, then configure each additional adapter. The existing Telegram and Discord screens retain the native Node.js transports. Use the dedicated adapter routes for Slack and WhatsApp to avoid overlapping legacy integrations.

Each adapter requires explicit trusted sender IDs and permitted conversation IDs before invoking the primary agent. Automatic replies default off. Stored provider settings/secrets are not returned by configuration/inspection APIs. Existing application database storage policy still applies.

## Delivery and validation

The Python boundary returns adapter-reported delivery results with `acknowledgement: 'adapter'`. Some protocols only acknowledge a local send or synthesize message identifiers; confirm actual receipt in the provider. Native Telegram/Discord transports retain provider acknowledgements. A bundled adapter or successful import does not prove live delivery.

The transferred adapter source and local helper closure are included with their required MIT notice. The worker registers platform factories and delegates messages to the host; it does not instantiate an agent or model. The shared Node.js API currently sends plain text; advanced media/streaming features of individual source adapters are not fully exposed through that API.

All 33 adapter modules/factories are checked with the base runtime. Automated local-provider tests exercise the Node/Python bridge. Real-account tests remain pending for every provider.

## Inventory

The table below is generated from the bundled catalog. Runtime prerequisites apply independently to each integration.

| ID | Integration | Runtime | Configuration variables |
| --- | --- | --- | --- |
| a2a | A2A | python | Provider-specific settings.extra; see adapter setup |
| api_server | API Server | python | Provider-specific settings.extra; see adapter setup |
| bluebubbles | iMessage via BlueBubbles | python | Provider-specific settings.extra; see adapter setup |
| buzz | Buzz | python | BUZZ_RELAY_URL, BUZZ_PRIVATE_KEY |
| dingtalk | DingTalk | python | DINGTALK_CLIENT_ID, DINGTALK_CLIENT_SECRET |
| discord | Discord | node-or-python | DISCORD_BOT_TOKEN |
| email | Email | python | EMAIL_ADDRESS, EMAIL_PASSWORD, EMAIL_SMTP_HOST |
| feishu | Feishu / Lark | python | FEISHU_APP_ID, FEISHU_APP_SECRET |
| google_chat | Google Chat | python | GOOGLE_CHAT_SERVICE_ACCOUNT_JSON |
| homeassistant | Home Assistant | python | HASS_TOKEN |
| irc | IRC | python | IRC_SERVER, IRC_CHANNEL, IRC_NICKNAME |
| line | LINE | python | LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET |
| matrix | Matrix | python | MATRIX_HOMESERVER, MATRIX_ACCESS_TOKEN |
| mattermost | Mattermost | python | MATTERMOST_URL, MATTERMOST_TOKEN |
| msgraph_webhook | Microsoft Graph Webhook | python | Provider-specific settings.extra; see adapter setup |
| ntfy | ntfy | python | NTFY_TOPIC |
| photon | iMessage via Photon | python | PHOTON_PROJECT_ID, PHOTON_PROJECT_SECRET |
| qqbot | QQ Bot | python | Provider-specific settings.extra; see adapter setup |
| raft | Raft | python | RAFT_PROFILE |
| relay | Connector Relay | python | Provider-specific settings.extra; see adapter setup |
| signal | Signal | python | Provider-specific settings.extra; see adapter setup |
| simplex | SimpleX Chat | python | SIMPLEX_WS_URL |
| slack | Slack | python | SLACK_BOT_TOKEN, SLACK_APP_TOKEN |
| sms | SMS (Twilio) | python | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER |
| teams | Microsoft Teams | python | TEAMS_CLIENT_ID, TEAMS_CLIENT_SECRET, TEAMS_TENANT_ID |
| telegram | Telegram | node-or-python | TELEGRAM_BOT_TOKEN |
| webhook | Webhook | python | Provider-specific settings.extra; see adapter setup |
| wecom | WeCom (Enterprise WeChat) | python | WECOM_BOT_ID, WECOM_SECRET |
| wecom_callback | WeCom Callback (self-built apps) | python | WECOM_CALLBACK_CORP_ID, WECOM_CALLBACK_CORP_SECRET |
| weixin | Weixin | python | Provider-specific settings.extra; see adapter setup |
| whatsapp | WhatsApp | python | WHATSAPP_ENABLED |
| whatsapp_cloud | WhatsApp Cloud API | python | Provider-specific settings.extra; see adapter setup |
| yuanbao | Yuanbao | python | Provider-specific settings.extra; see adapter setup |
