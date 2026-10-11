import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHANNEL_CATALOG, ChannelConnector, PythonTransport } from '../dist/index.js';

test('complete channel catalog includes all 33 adapter factories and separates runtime requirements', () => {
  assert.equal(CHANNEL_CATALOG.length, 33);
  assert.equal(new Set(CHANNEL_CATALOG.map(item => item.id)).size, 33);
  for (const id of ['slack', 'whatsapp', 'whatsapp_cloud', 'signal', 'matrix', 'email', 'sms', 'teams', 'wecom_callback', 'qqbot', 'relay']) {
    assert.ok(CHANNEL_CATALOG.some(item => item.id === id));
  }
  assert.equal(CHANNEL_CATALOG.find(item => item.id === 'discord').maxTextLength, 2000);
  assert.equal(CHANNEL_CATALOG.find(item => item.id === 'telegram').runtime, 'node-or-python');
});

test('Python worker connects ntfy, forwards an inbound event and acknowledges a send using a local provider', {
  skip: !process.env.AGENT_CONNECT_TEST_PYTHON,
  timeout: 30000,
}, async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), 'agent-connect-python-'));
  const streams = new Set();
  let streamReady;
  const streamConnected = new Promise(resolve => { streamReady = resolve; });
  let incoming;
  const received = new Promise(resolve => { incoming = resolve; });
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url.startsWith('/test-topic/json')) {
      response.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      response.write(JSON.stringify({ event: 'open', topic: 'test-topic', id: 'open', time: Math.floor(Date.now() / 1000) }) + '\n');
      streams.add(response);
      response.on('close', () => streams.delete(response));
      streamReady(response);
    } else if (request.method === 'POST' && request.url === '/test-topic') {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => {
        assert.equal(body, 'outbound marker');
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ id: 'provider-delivery-123' }));
      });
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const channel = new ChannelConnector('ntfy', new PythonTransport('ntfy', {
    pythonExecutable: process.env.AGENT_CONNECT_TEST_PYTHON,
    stateDirectory,
    settings: { extra: { server: url, topic: 'test-topic' } },
    timeoutMs: 10000,
  }), { receive: async message => { incoming(message); } });
  try {
    await channel.connect();
    assert.equal(channel.state, 'connected');
    const stream = await streamConnected;
    stream.write(JSON.stringify({ event: 'message', id: 'provider-inbound-123', topic: 'test-topic', message: 'inbound marker', time: Math.floor(Date.now() / 1000) }) + '\n');
    const message = await received;
    assert.equal(message.channel, 'ntfy');
    assert.equal(message.id, 'provider-inbound-123');
    assert.equal(message.text, 'inbound marker');
    assert.equal(message.senderId, 'test-topic');
    assert.deepEqual(await channel.send('test-topic', 'outbound marker'), {
      id: 'provider-delivery-123', conversationId: 'test-topic', acknowledgement: 'adapter',
    });
    await channel.disconnect();
    assert.equal(channel.state, 'disconnected');
  } finally {
    await channel.disconnect();
    for (const response of streams) response.destroy();
    await new Promise(resolve => server.close(resolve));
    await rm(stateDirectory, { recursive: true, force: true });
  }
});
