import test from 'node:test';
import assert from 'node:assert/strict';
import { InstagramPublisher } from '../dist/instagram.js';
import { LinkedInPublisher } from '../dist/linkedin.js';
import { XPublisher } from '../dist/x.js';
import { YouTubePublisher } from '../dist/youtube.js';
import { TikTokPublisher } from '../dist/tiktok.js';

function harness(replies) {
  const calls = [];
  return { calls, getAccessToken: async () => 'fake-user-token', fetch: async (url, init) => {
    calls.push({ url, init });
    const next = replies.shift(); assert.ok(next, `Unexpected request: ${url}`);
    if (next instanceof Error) throw next;
    const { body, status = 200, headers = {} } = next;
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
  } };
}
const igPost = { platform: 'instagram', accountId: '123', placement: 'feed', text: 'Caption', media: [{ kind: 'image', url: 'https://media.example/image.jpg' }] };
const liPost = { platform: 'linkedin', accountId: 'urn:li:organization:123', placement: 'feed', text: 'Hello' };
const xPost = { platform: 'x', accountId: '123', placement: 'feed', text: 'Hello' };
const channelId = 'UC' + 'a'.repeat(22);
const ytPost = { platform: 'youtube', accountId: channelId, placement: 'video', title: 'Title', description: 'Description', video: new Blob(['test'], { type: 'video/mp4' }), privacy: 'private', madeForKids: false };
const ttPost = { platform: 'tiktok', accountId: 'open_id', placement: 'video', text: 'Caption', media: [{ kind: 'video', url: 'https://media.example/video.mp4', durationSeconds: 20 }], privacy: 'SELF_ONLY', consent: true, disableComment: true, disableDuet: true, disableStitch: true };
const creator = { error: { code: 'ok' }, data: { creator_username: 'sample', creator_nickname: 'Sample', privacy_level_options: ['SELF_ONLY'], comment_disabled: false, duet_disabled: false, stitch_disabled: false, max_video_post_duration_sec: 60 } };
const ttIdentity = { body: { error: { code: 'ok' }, data: { user: { open_id: 'open_id' } } } };

test('Instagram persists a container before status check and publishes only a FINISHED container', async () => {
  const h = harness([{ body: { id: '456' } }, { body: { status_code: 'IN_PROGRESS' } }, { body: { status_code: 'FINISHED' } }, { body: { id: '789' } }]);
  const p = new InstagramPublisher({ ...h, apiVersion: 'v27.0', login: 'instagram' });
  assert.equal((await p.publish(igPost)).status, 'processing');
  assert.equal(h.calls.length, 1);
  const saved = { accountId: '123', containerId: '456' };
  assert.equal((await p.complete(saved)).status, 'processing');
  const result = await p.complete(saved);
  assert.equal(result.status, 'published'); assert.equal(result.providerId, '789');
  assert.equal(h.calls[0].url, 'https://graph.instagram.com/v27.0/123/media');
  assert.deepEqual(JSON.parse(h.calls[3].init.body), { creation_id: '456' });
});

test('Instagram maps Reels and Stories correctly for Facebook Login without misleading captions', async () => {
  for (const placement of ['reel', 'story']) {
    const h = harness([{ body: { id: '456' } }]);
    const p = new InstagramPublisher({ ...h, apiVersion: 'v27.0', login: 'facebook' });
    await p.publish({ ...igPost, placement, media: [{ kind: 'video', url: 'https://media.example/a.mp4' }] });
    const body = JSON.parse(h.calls[0].init.body);
    assert.equal(body.media_type, placement === 'reel' ? 'REELS' : 'STORIES');
    assert.equal(body.video_url, 'https://media.example/a.mp4');
    assert.equal('caption' in body, placement !== 'story');
    assert.match(h.calls[0].url, /^https:\/\/graph.facebook.com/);
  }
});

test('Instagram failed/expired containers never publish, already published containers require reconciliation', async () => {
  for (const state of ['ERROR', 'EXPIRED', 'PUBLISHED', 'UNRECOGNIZED']) {
    const h = harness([{ body: { status_code: state } }]);
    const p = new InstagramPublisher({ ...h, apiVersion: 'v27.0', login: 'instagram' });
    if (['ERROR', 'EXPIRED'].includes(state)) assert.equal((await p.complete({ accountId: '123', containerId: '456' })).status, 'failed');
    else await assert.rejects(p.complete({ accountId: '123', containerId: '456' }));
    assert.equal(h.calls.length, 1);
  }
});

test('LinkedIn publishes text and uploaded image URNs using the current Posts API and response header', async () => {
  for (const media of [undefined, [{ kind: 'image', id: 'urn:li:image:abc' }]]) {
    const h = harness([{ status: 201, headers: { 'x-restli-id': 'urn:li:share:456' } }]);
    const p = new LinkedInPublisher({ ...h, apiVersion: '202610' });
    assert.equal((await p.publish({ ...liPost, media })).providerId, 'urn:li:share:456');
    const body = JSON.parse(h.calls[0].init.body);
    assert.equal(body.author, liPost.accountId); assert.equal(body.lifecycleState, 'PUBLISHED');
    assert.equal(h.calls[0].init.headers.get('LinkedIn-Version'), '202610');
    if (media) assert.equal(body.content.media.id, 'urn:li:image:abc');
  }
});

test('LinkedIn image upload uses host bytes and rejects untrusted provider upload hosts before sending bytes', async () => {
  for (const uploadUrl of ['https://www.linkedin.com/dms-uploads/test', 'https://attacker.example/upload']) {
    const h = harness([{ body: { value: { image: 'urn:li:image:abc', uploadUrl } } }, { status: 201 }]);
    const p = new LinkedInPublisher({ ...h, apiVersion: '202610' });
    const image = new Blob(['test'], { type: 'image/png' });
    if (uploadUrl.includes('attacker')) { await assert.rejects(p.uploadImage(liPost.accountId, image)); assert.equal(h.calls.length, 1); }
    else { assert.equal(await p.uploadImage(liPost.accountId, image), 'urn:li:image:abc'); assert.equal(h.calls[1].init.body, image); }
  }
});

test('LinkedIn success without a post acknowledgement is unknown, never retried', async () => {
  const h = harness([{ status: 201 }]); const p = new LinkedInPublisher({ ...h, apiVersion: '202610' });
  await assert.rejects(p.publish(liPost), error => error.code === 'delivery_unknown'); assert.equal(h.calls.length, 1);
});

test('X verifies the authenticated user then posts text and attached media IDs', async () => {
  const h = harness([{ body: { data: { id: '123' } } }, { body: { data: { id: '456' } } }]);
  const p = new XPublisher(h);
  assert.equal((await p.publish({ ...xPost, media: [{ kind: 'image', id: '789' }] })).providerId, '456');
  assert.match(h.calls[0].url, /users\/me$/);
  assert.deepEqual(JSON.parse(h.calls[1].init.body), { text: 'Hello', media: { media_ids: ['789'] } });
});

test('X account mismatch prevents publication and HTTP 402 is a payment error', async () => {
  const h = harness([{ body: { data: { id: '999' } } }]);
  await assert.rejects(new XPublisher(h).publish(xPost), error => error.code === 'permission'); assert.equal(h.calls.length, 1);
  const paid = harness([{ body: { data: { id: '123' } } }, { status: 402, body: { secret: 'fake-user-token' } }]);
  await assert.rejects(new XPublisher(paid).publish(xPost), error => error.code === 'payment_required' && !String(error).includes('fake-user-token'));
});

test('X image upload uses multipart and never fetches untrusted media URLs', async () => {
  const h = harness([{ body: { data: { id: '123' } } }, { body: { data: { id: '789' } } }]);
  assert.equal(await new XPublisher(h).uploadImage('123', new Blob(['test'], { type: 'image/png' })), '789');
  assert.equal(h.calls[1].init.body.get('media_category'), 'tweet_image');
  assert.equal(h.calls[1].init.headers.has('Content-Type'), false);
});

test('YouTube verifies channel, initializes a resumable upload, and distinguishes upload from processing', async () => {
  const h = harness([{ body: { items: [{ id: channelId }] } }, { headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test' } }, { body: { id: 'abcdefghijk', status: { uploadStatus: 'uploaded' } } }, { body: { items: [{ id: 'abcdefghijk', snippet: { channelId }, status: { uploadStatus: 'processed' } }] } }]);
  const p = new YouTubePublisher(h);
  const saved = await p.beginUpload(ytPost); assert.equal(saved.size, 4);
  assert.equal(JSON.parse(h.calls[1].init.body).status.privacyStatus, 'private');
  assert.equal((await p.upload(saved, ytPost.video)).status, 'processing');
  assert.equal((await p.getStatus(channelId, 'abcdefghijk')).status, 'published');
  assert.equal(h.calls[2].init.body, ytPost.video);
});

test('YouTube refuses channel mismatch and untrusted upload destinations', async () => {
  const h = harness([{ body: { items: [{ id: 'other' }] } }]);
  await assert.rejects(new YouTubePublisher(h).beginUpload(ytPost), error => error.code === 'permission'); assert.equal(h.calls.length, 1);
  const bad = harness([{ body: { items: [{ id: channelId }] } }, { headers: { location: 'https://attacker.example/upload' } }]);
  await assert.rejects(new YouTubePublisher(bad).beginUpload(ytPost)); assert.equal(bad.calls.length, 2);
});

test('YouTube queries interrupted uploads without restarting the upload', async () => {
  const h = harness([{ status: 308, headers: { range: 'bytes=0-1' } }]);
  const result = await new YouTubePublisher(h).queryUpload({ accountId: channelId, uploadUrl: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test', size: 4, mimeType: 'video/mp4' });
  assert.deepEqual(result, { status: 'uploading', uploadedBytes: 2 });
  assert.equal(h.calls[0].init.headers.get('Content-Range'), 'bytes */4');
});

test('TikTok uses fresh creator restrictions and returns a processing publish ID', async () => {
  const h = harness([ttIdentity, { body: creator }, { body: { error: { code: 'ok' }, data: { publish_id: 'v_pub_url~v2-1.123' } } }]);
  const result = await new TikTokPublisher(h).publish(ttPost);
  assert.equal(result.status, 'processing'); assert.equal(result.providerId, 'v_pub_url~v2-1.123');
  const body = JSON.parse(h.calls[2].init.body);
  assert.equal(body.source_info.source, 'PULL_FROM_URL'); assert.equal(body.post_info.privacy_level, 'SELF_ONLY');
});

test('TikTok photo publishing uses content init and explicit photo metadata', async () => {
  const h = harness([ttIdentity, { body: creator }, { body: { error: { code: 'ok' }, data: { publish_id: 'p_pub_123' } } }]);
  await new TikTokPublisher(h).publish({ ...ttPost, placement: 'feed', title: 'Photo title', media: [{ kind: 'image', url: 'https://media.example/a.jpg' }], isAigc: true });
  const body = JSON.parse(h.calls[2].init.body);
  assert.match(h.calls[2].url, /content\/init\/$/); assert.equal(body.post_mode, 'DIRECT_POST'); assert.equal(body.is_aigc, true); assert.equal(body.source_info.photo_images.length, 1);
});

test('TikTok rejects changed privacy, excess duration and forbidden interactions before init', async () => {
  for (const change of [{ privacy: 'PUBLIC_TO_EVERYONE' }, { media: [{ kind: 'video', url: 'https://media.example/a.mp4', durationSeconds: 61 }] }, { disableComment: false }]) {
    const info = structuredClone(creator); info.data.comment_disabled = true;
    const h = harness([ttIdentity, { body: info }]);
    await assert.rejects(new TikTokPublisher(h).publish({ ...ttPost, ...change }), error => error.code === 'validation'); assert.equal(h.calls.length, 2);
  }
});

test('TikTok exposes creator settings and polls completion/failure without republishing', async () => {
  for (const [status, expected] of [['PUBLISH_COMPLETE', 'published'], ['FAILED', 'failed'], ['PROCESSING_DOWNLOAD', 'processing']]) {
    const h = harness([ttIdentity, { body: { error: { code: 'ok' }, data: { status, publicaly_available_post_id: status === 'PUBLISH_COMPLETE' ? ['123'] : [] } } }]);
    const result = await new TikTokPublisher(h).getStatus('open_id', 'v_pub_123');
    assert.equal(result.status, expected); assert.equal(h.calls.length, 2);
  }
  const h = harness([ttIdentity, { body: creator }]);
  assert.deepEqual((await new TikTokPublisher(h).getCreatorInfo('open_id')).privacyLevels, ['SELF_ONLY']);
});

test('All new providers validate before touching credentials or the network', async () => {
  const options = { getAccessToken: async () => assert.fail('Credentials must not be read'), fetch: async () => assert.fail('Network must not run') };
  const cases = [
    [new InstagramPublisher({ ...options, apiVersion: 'v27.0', login: 'instagram' }), { ...igPost, media: [] }],
    [new LinkedInPublisher({ ...options, apiVersion: '202610' }), { ...liPost, media: [{ kind: 'image', id: 'bad' }] }],
    [new XPublisher(options), { ...xPost, accountId: '../me' }],
    [new YouTubePublisher(options), { ...ytPost, privacy: undefined }],
    [new TikTokPublisher(options), { ...ttPost, consent: false }],
  ];
  for (const [publisher, input] of cases) await assert.rejects(publisher.publish(input), error => error.code === 'validation');
});

test('All new providers sanitize credential exceptions', async () => {
  const options = { getAccessToken: async () => { throw Error('fake-secret-token'); } };
  for (const [publisher, input] of [
    [new InstagramPublisher({ ...options, apiVersion: 'v27.0', login: 'instagram' }), igPost],
    [new LinkedInPublisher({ ...options, apiVersion: '202610' }), liPost], [new XPublisher(options), xPost],
    [new YouTubePublisher(options), ytPost], [new TikTokPublisher(options), ttPost],
  ]) await assert.rejects(publisher.publish(input), error => error.code === 'authentication' && !String(error).includes('fake-secret-token') && !error.cause);
});

test('A failed Instagram publish acknowledgement is unknown and is not retried', async () => {
  const h = harness([{ body: { status_code: 'FINISHED' } }, new Error('fake-user-token')]);
  const p = new InstagramPublisher({ ...h, apiVersion: 'v27.0', login: 'instagram' });
  await assert.rejects(p.complete({ accountId: '123', containerId: '456' }), error => error.delivery === 'unknown' && !String(error).includes('fake-user-token'));
  assert.equal(h.calls.length, 2);
});


test('YouTube resumes only from a caller-confirmed offset without reinitializing a session', async () => {
  const h = harness([{ body: { id: 'abcdefghijk', status: { uploadStatus: 'uploaded' } } }]);
  const publisher = new YouTubePublisher(h);
  await publisher.upload({ accountId: channelId, uploadUrl: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test', size: 4, mimeType: 'video/mp4' }, ytPost.video, 2);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].init.headers.get('Content-Range'), 'bytes 2-3/4');
  assert.equal(h.calls[0].init.body.size, 2);
});

test('Shared HTTP handling refuses redirects, does not leak provider failures, and never retries writes', async () => {
  for (const [reply, category] of [
    [{ status: 429, body: { error: 'fake-user-token' } }, 'rate_limit'],
    [{ status: 403, body: { error: 'fake-user-token' } }, 'permission'],
    [{ status: 500, body: { error: 'fake-user-token' } }, 'delivery_unknown'],
    [{ status: 302, headers: { location: 'https://attacker.example' } }, 'provider'],
    [new Error('fake-user-token'), 'delivery_unknown'],
  ]) {
    const h = harness([reply]);
    await assert.rejects(new LinkedInPublisher({ ...h, apiVersion: '202610' }).publish(liPost), error => error.code === category && !String(error).includes('fake-user-token'));
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0].init.redirect, 'error');
  }
});

test('Unsupported media and invalid token bytes fail before any network send', async () => {
  const options = { getAccessToken: async () => 'invalid token\r\nsecret', fetch: async () => assert.fail('Must not send credentials') };
  await assert.rejects(new XPublisher(options).publish(xPost), error => error.code === 'authentication');
  await assert.rejects(new TikTokPublisher(options).publish({ ...ttPost, media: [{ kind: 'video', url: 'http://media.example/a.mp4', durationSeconds: 10 }] }), error => error.code === 'validation');
  await assert.rejects(new XPublisher(options).uploadImage('123', new Blob(['x'], { type: 'video/mp4' })), error => error.code === 'validation');
});
