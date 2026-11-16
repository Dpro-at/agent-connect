import { SocialPublishError } from './social.js';
import type { SocialPost, SocialPublisher, PublishResult, ValidationIssue } from './social.js';
import { ProviderHttp, invalid, acknowledgement, safeId, providerUrl } from './social-http.js';
import type { PublisherOptions } from './social-http.js';
export interface LinkedInPost extends Omit<SocialPost, 'media'> { media?: { kind: 'image'; id: string }[]; }
export interface LinkedInPublisherOptions extends PublisherOptions { apiVersion: string; }
export class LinkedInPublisher implements SocialPublisher<LinkedInPost> {
  private readonly http: ProviderHttp;
  private readonly version: string;
  constructor(options: LinkedInPublisherOptions) {
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(options.apiVersion)) invalid();
    this.http = new ProviderHttp(options); this.version = options.apiVersion;
  }
  private headers(): Record<string, string> { return { 'LinkedIn-Version': this.version, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' }; }
  validate(post: LinkedInPost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'linkedin' || !safeId(post.accountId, /^urn:li:(person|organization):[A-Za-z0-9_-]+$/)) issues.push({ field: 'accountId', message: 'Choose an explicit person or organization URN.' });
    if (post.placement !== 'feed') issues.push({ field: 'placement', message: 'Only feed is supported.' });
    if (typeof post.text !== 'string' || post.text.length > 3000 || (!post.text.trim() && !post.media?.length)) issues.push({ field: 'text', message: 'Provide text or an image, with text up to 3000 UTF-16 code units.' });
    if (post.media !== undefined && (!Array.isArray(post.media) || post.media.length > 1 || post.media.some(item => !item || item.kind !== 'image' || !safeId(item.id, /^urn:li:image:[A-Za-z0-9_-]+$/)))) issues.push({ field: 'media', message: 'Use one previously uploaded LinkedIn image URN.' });
    return issues;
  }
  async uploadImage(accountId: string, image: Blob): Promise<string> {
    if (!safeId(accountId, /^urn:li:(person|organization):[A-Za-z0-9_-]+$/) || !(image instanceof Blob) || !['image/jpeg', 'image/png'].includes(image.type) || image.size === 0 || image.size > 10 * 1024 * 1024) invalid();
    const token = await this.http.token(accountId);
    const response = await this.http.raw('https://api.linkedin.com/rest/images?action=initializeUpload', token, {
      method: 'POST', headers: this.headers(), body: JSON.stringify({ initializeUploadRequest: { owner: accountId } }),
    });
    const data = await this.http.read(response);
    const id = acknowledgement(data?.value?.image, /^urn:li:image:[A-Za-z0-9_-]+$/);
    const url = providerUrl(data?.value?.uploadUrl, ['www.linkedin.com', 'api.linkedin.com']);
    await this.http.raw(url, token, { method: 'PUT', headers: { 'Content-Type': image.type }, body: image });
    return id;
  }
  async publish(post: LinkedInPost): Promise<PublishResult> {
    if (this.validate(post).length) invalid();
    const input = structuredClone(post);
    const token = await this.http.token(input.accountId);
    const body: Record<string, unknown> = {
      author: input.accountId, commentary: input.text, visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
    };
    if (input.media?.[0]) body.content = { media: { id: input.media[0].id } };
    const response = await this.http.raw('https://api.linkedin.com/rest/posts', token, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (response.status !== 201) throw new SocialPublishError('delivery_unknown', 'unknown');
    const id = acknowledgement(response.headers.get('x-restli-id'), /^urn:li:(share|ugcPost):\d+$/);
    return { platform: 'linkedin', accountId: input.accountId, providerId: id, status: 'published', stage: 'post' };
  }
}
