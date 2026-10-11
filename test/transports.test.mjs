import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Events } from 'discord.js';
import { TelegramTransport, DiscordTransport } from '../dist/index.js';

test('Telegram normalizes text, acknowledges provider IDs, rejects existing webhooks, and stops polling', async () => {
  let receive; let stopped = false; let end;
  const bot = {
    on: (_event, handler) => { receive = handler; }, catch: () => {}, init: async () => {},
    api: { getWebhookInfo: async () => ({ url: '' }), sendMessage: async (chat, text) => ({ message_id: 42, chat: { id: chat } }) },
    start: ({ onStart }) => { onStart(); return new Promise(resolve => { end = resolve; }); },
    isRunning: () => !stopped, stop: async () => { stopped = true; end(); },
  };
  const events = []; const states = [];
  const transport = new TelegramTransport('test', () => bot);
  await transport.start(async message => events.push(message), state => states.push(state));
  await receive({ from: { id: 7, first_name: 'User' }, chat: { id: 10 }, message: { message_id: 3, text: 'hi', date: 1000 } });
  assert.equal(events[0].senderId, '7'); assert.equal(events[0].conversationId, '10');
  assert.equal((await transport.send('10', 'hi')).id, '42');
  await transport.stop(); assert.equal(stopped, true); assert.deepEqual(states, ['connected']);
  bot.api.getWebhookInfo = async () => ({ url: 'https://existing.example' });
  await assert.rejects(new TelegramTransport('test', () => bot).start(async () => {}, () => {}), /existing Telegram webhook/);
});
test('Discord ignores bots and DMs, handles disconnects, disables outbound mentions and destroys client', async () => {
  const client = new EventEmitter(); let options; let destroyed = false;
  client.login = async () => client.emit(Events.ClientReady);
  client.isReady = () => true;
  client.destroy = async () => { destroyed = true; };
  client.channels = { fetch: async () => ({ isSendable: () => true, send: async value => { options = value; return { id: '42', channelId: 'room' }; } }) };
  const events = []; const states = [];
  const transport = new DiscordTransport('test', () => client);
  await transport.start(async message => events.push(message), state => states.push(state));
  const message = { id: '1', author: { id: '7', username: 'User', bot: false }, channelId: 'room', guildId: 'guild', content: 'hi', createdAt: new Date() };
  client.emit(Events.MessageCreate, message);
  client.emit(Events.MessageCreate, { ...message, author: { ...message.author, bot: true } });
  client.emit(Events.MessageCreate, { ...message, guildId: null });
  assert.equal(events.length, 1);
  client.emit(Events.ShardDisconnect); assert.equal(states.at(-1), 'connecting');
  client.emit(Events.ShardResume); assert.equal(states.at(-1), 'connected');
  await transport.send('room', '@everyone hello'); assert.deepEqual(options.allowedMentions, { parse: [] });
  await transport.stop(); assert.equal(destroyed, true);
});
test('stopping Telegram during initialization cannot start an orphan polling loop', async () => {
  let finishInitialization;
  let starts = 0;
  const bot = {
    on: () => {}, catch: () => {},
    init: () => new Promise(resolve => { finishInitialization = resolve; }),
    api: { getWebhookInfo: async () => ({ url: '' }) },
    start: () => { starts++; return new Promise(() => {}); },
    isRunning: () => false,
  };
  const transport = new TelegramTransport('test', () => bot);
  const start = transport.start(async () => {}, () => {});
  await transport.stop();
  finishInitialization();
  await start;
  assert.equal(starts, 0);
});
