import test from 'node:test';
import assert from 'node:assert/strict';
import { ChannelConnector } from '../dist/index.js';

function fakeTransport() {
  return {
    starts: 0, stops: 0, sent: [],
    async start(receive, state) { this.starts++; this.receive = receive; this.changeState = state; state('connected'); },
    async stop() { this.stops++; },
    async send(conversationId, text) { this.sent.push(text); return { id: 'provider-id', conversationId }; },
  };
}
test('connection deduplicates starts and stops accepting messages after disconnect', async () => {
  const transport = fakeTransport(); const messages = [];
  const channel = new ChannelConnector('telegram', transport, { receive: async message => messages.push(message) });
  await Promise.all([channel.connect(), channel.connect()]);
  assert.equal(transport.starts, 1);
  await transport.receive({ text: 'hello' });
  await channel.disconnect();
  await transport.receive({ text: 'ignored' });
  assert.equal(messages.length, 1);
  assert.equal(channel.state, 'disconnected');
  await assert.rejects(channel.send('1', 'hello'), /not connected/);
});
test('failed provider sends never return a delivery and sanitize provider errors', async () => {
  const transport = fakeTransport();
  transport.send = async () => { throw new Error('secret-provider-token'); };
  const channel = new ChannelConnector('discord', transport, { receive: async () => {} });
  await channel.connect();
  await assert.rejects(channel.send('1', 'hello'), { message: 'discord delivery failed' });
  await assert.rejects(channel.send('1', 'x'.repeat(2001)), /1-2000/);
});
test('failed startup reports error and cleans up transport', async () => {
  const transport = fakeTransport();
  transport.start = async () => { throw new Error('invalid token'); };
  const channel = new ChannelConnector('telegram', transport, { receive: async () => {} });
  await assert.rejects(channel.connect(), /connection failed/);
  assert.equal(channel.state, 'error'); assert.equal(transport.stops, 1);
});
test('reconnecting an errored transport closes its old connection first', async () => {
  const transport = fakeTransport();
  const channel = new ChannelConnector('discord', transport, { receive: async () => {} });
  await channel.connect();
  const previousReceiver = transport.receive;
  transport.changeState('error');
  await channel.connect();
  assert.equal(transport.stops, 1);
  assert.equal(transport.starts, 2);
  assert.equal(channel.state, 'connected');
  await previousReceiver({ text: 'old connection' });
  await channel.disconnect();
});
