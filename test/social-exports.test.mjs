import test from 'node:test';
import assert from 'node:assert/strict';

test('All social package subpaths import on a server without a DOM or credentials', async () => {
  const expected = { facebook: 'FacebookPagePublisher', instagram: 'InstagramPublisher', linkedin: 'LinkedInPublisher', x: 'XPublisher', youtube: 'YouTubePublisher', tiktok: 'TikTokPublisher', studio: 'mountSocialStudio' };
  for (const [subpath, name] of Object.entries(expected)) {
    const module = await import(`agent-connect-dpro/${subpath}`);
    assert.equal(typeof module[name], 'function');
  }
  const { SOCIAL_CAPABILITIES } = await import('agent-connect-dpro/social');
  assert.equal(SOCIAL_CAPABILITIES.length, 6);
});
