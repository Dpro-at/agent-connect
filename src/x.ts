import { SocialPublishError } from './social.js';
import type { SocialPost, SocialPublisher, PublishResult, ValidationIssue } from './social.js';
import { ProviderHttp, invalid, acknowledgement, safeId } from './social-http.js';
import type { PublisherOptions } from './social-http.js';
export interface XPost extends Omit<SocialPost, 'media'> { media?: { kind: 'image'; id: string }[]; }
/** Supply a user-context OAuth token from the customer's own developer application. */
export class XPublisher implements SocialPublisher<XPost> {
  private readonly http: ProviderHttp;
  constructor(options: PublisherOptions) { this.http = new ProviderHttp(options); }
  validate(post: XPost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'x' || !safeId(post.accountId, /^\d+$/)) issues.push({ field: 'accountId', message: 'An explicit X user ID is required.' });
    if (post.placement !== 'feed') issues.push({ field: 'placement', message: 'Only feed posts are supported.' });
    if (typeof post.text !== 'string' || (!post.text.trim() && !post.media?.length)) issues.push({ field: 'text', message: 'Text or an uploaded image is required.' });
    // X validates weighted text length and entitlement; a JavaScript string length is not equivalent.
    if (post.media !== undefined && (!Array.isArray(post.media) || post.media.length > 4 || post.media.some(item => !item || item.kind !== 'image' || !safeId(item.id, /^\d+$/)))) issues.push({ field: 'media', message: 'Use at most four uploaded image IDs.' });
    return issues;
  }
  private async verifyAccount(accountId: string, token: string): Promise<void> {
    const data = await this.http.json('https://api.x.com/2/users/me', token, undefined, false);
    if (data?.data?.id !== accountId) throw new SocialPublishError('permission', 'not_sent');
  }
  async uploadImage(accountId: string, image: Blob): Promise<string> {
    if (!safeId(accountId, /^\d+$/) || !(image instanceof Blob) || !['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size === 0 || image.size > 5 * 1024 * 1024) invalid();
    const token = await this.http.token(accountId);
    await this.verifyAccount(accountId, token);
    const body = new FormData(); body.set('media', image, 'image'); body.set('media_category', 'tweet_image'); body.set('media_type', image.type);
    const response = await this.http.raw('https://api.x.com/2/media/upload', token, { method: 'POST', body });
    const data = await this.http.read(response);
    if (data?.errors?.length) throw new SocialPublishError('provider', 'rejected');
    return acknowledgement(data?.data?.id, /^\d+$/);
  }
  async publish(post: XPost): Promise<PublishResult> {
    if (this.validate(post).length) invalid();
    const input = structuredClone(post);
    const token = await this.http.token(input.accountId);
    await this.verifyAccount(input.accountId, token);
    const body: Record<string, unknown> = { text: input.text };
    if (input.media?.length) body.media = { media_ids: input.media.map(item => item.id) };
    const data = await this.http.json('https://api.x.com/2/tweets', token, body);
    if (data?.errors?.length && !data?.data?.id) throw new SocialPublishError('provider', 'rejected');
    return { platform: 'x', accountId: input.accountId, status: 'published', providerId: acknowledgement(data?.data?.id, /^\d+$/), stage: 'post' };
  }
}
