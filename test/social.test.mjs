import test from 'node:test';
import assert from 'node:assert/strict';
import { FacebookPagePublisher } from '../dist/facebook.js';
import { SOCIAL_CAPABILITIES, SocialPublishError } from '../dist/social.js';

const post = { platform: 'facebook', accountId: '123', placement: 'feed', text: 'Hello' };
function fixture(reply = { id: '123_456' }, status = 200) {
  const calls = [];
  const publisher = new FacebookPagePublisher({
    apiVersion: 'v27.0', getPageAccessToken: async id => { assert.equal(id, '123'); return 'fake-test-token'; },
    fetch: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(reply), { status }); },
  });
  return { publisher, calls };
}

test('Facebook text publishing uses an explicit Page and runtime token without query credentials', async () => {
  const { publisher, calls } = fixture();
  assert.deepEqual(await publisher.publish(post), { platform: 'facebook', accountId: '123', status: 'published', providerId: '123_456' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v27.0/123/feed');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer fake-test-token');
  assert.equal(calls[0].init.body.get('message'), 'Hello');
  assert.equal(calls[0].init.body.has('access_token'), false);
  assert.equal(calls[0].init.redirect, 'error');
});

test('Facebook single image is published through photos with caption and provider acknowledgement', async () => {
  const { publisher, calls } = fixture({ id: '789', post_id: '123_789' });
  const result = await publisher.publish({ ...post, media: [{ kind: 'image', url: 'https://media.example/image.jpg' }] });
  assert.equal(result.providerId, '123_789');
  assert.match(calls[0].url, /\/photos$/);
  assert.equal(calls[0].init.body.get('url'), 'https://media.example/image.jpg');
  assert.equal(calls[0].init.body.get('caption'), 'Hello');
  assert.equal(calls[0].init.body.get('published'), 'true');
});

test('Unsupported platforms, placements, targets and media fail before credential lookup or network', async () => {
  let touched = false;
  const publisher = new FacebookPagePublisher({ apiVersion: 'v27.0', getPageAccessToken: async () => { touched = true; return 'fake'; }, fetch: async () => { touched = true; throw Error(); } });
  for (const input of [
    { ...post, platform: 'x' }, { ...post, placement: 'reel' }, { ...post, accountId: '../me' },
    { ...post, text: ' ' }, { ...post, text: undefined }, { ...post, media: 'bad' },
    { ...post, media: [{ kind: 'video', url: 'https://example.com/a' }] },
    { ...post, media: [{ kind: 'image', url: 'http://example.com/a' }] },
    { ...post, media: [{ kind: 'image', url: 'https://user:secret@example.com/a' }] },
    { ...post, media: [{ kind: 'image', url: 'https://example.com/a' }, { kind: 'image', url: 'https://example.com/b' }] },
  ]) await assert.rejects(publisher.publish(input), error => error.code === 'validation' && error.delivery === 'not_sent');
  assert.equal(touched, false);
});

test('Credential failures are sanitized and never reach the provider', async () => {
  for (const getPageAccessToken of [async () => { throw Error('secret credential'); }, async () => '', async () => 'bad\r\nsecret']) {
    const publisher = new FacebookPagePublisher({ apiVersion: 'v27.0', getPageAccessToken, fetch: async () => assert.fail('Network must not run') });
    await assert.rejects(publisher.publish(post), error => error.code === 'authentication' && !String(error).includes('secret') && !error.cause);
  }
});

test('Provider errors map to safe categories without exposing bodies or retrying', async () => {
  for (const [status, providerCode, expected] of [[401, 190, 'authentication'], [403, 200, 'permission'], [429, 4, 'rate_limit'], [400, 100, 'provider'], [500, 1, 'delivery_unknown']]) {
    const { publisher, calls } = fixture({ error: { code: providerCode, message: 'fake-test-token' } }, status);
    await assert.rejects(publisher.publish(post), error => error instanceof SocialPublishError && error.code === expected && !String(error).includes('fake-test-token'));
    assert.equal(calls.length, 1);
  }
});

test('Network failures and malformed acknowledgements remain unknown and are never retried', async () => {
  for (const fetch of [async () => { throw Error('fake-test-token'); }, async () => new Response('invalid json'), async () => new Response('{}')]) {
    let attempts = 0;
    const publisher = new FacebookPagePublisher({ apiVersion: 'v27.0', getPageAccessToken: async () => 'fake-test-token', fetch: async (...args) => { attempts++; return fetch(...args); } });
    await assert.rejects(publisher.publish(post), error => error.code === 'delivery_unknown' && error.delivery === 'unknown' && !String(error).includes('fake-test-token'));
    assert.equal(attempts, 1);
  }
});

test('Content and target are snapshotted before asynchronous credential resolution', async () => {
  const input = { ...post, media: [{ kind: 'image', url: 'https://example.com/original.jpg' }] };
  let resolveToken;
  let captured;
  const publisher = new FacebookPagePublisher({ apiVersion: 'v27.0', getPageAccessToken: () => new Promise(resolve => { resolveToken = resolve; }), fetch: async (url, init) => { captured = { url, init }; return new Response('{"id":"456"}'); } });
  const pending = publisher.publish(input);
  input.accountId = '999'; input.text = 'Changed'; input.media[0].url = 'https://example.com/changed.jpg';
  resolveToken('fake');
  await pending;
  assert.match(captured.url, /\/123\/photos$/);
  assert.equal(captured.init.body.get('caption'), 'Hello');
  assert.equal(captured.init.body.get('url'), 'https://example.com/original.jpg');
});

test('The social inventory exposes the six mock-tested providers separately from channels', () => {
  assert.deepEqual(SOCIAL_CAPABILITIES.filter(item => item.implemented).map(item => item.platform), ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok']);
  assert.equal(SOCIAL_CAPABILITIES.every(item => item.validation === 'mock-tested'), true);
  assert.throws(() => new FacebookPagePublisher({ apiVersion: '../invalid', getPageAccessToken: async () => 'fake' }));
});
