import { isHttpsUrl, SocialPublishError } from './social.js';
import type { SocialPost, SocialPublisher, PublishResult, ValidationIssue } from './social.js';

export interface FacebookPublisherOptions {
  /** Explicit version selected by the host after checking Meta's supported versions. */
  apiVersion: string;
  /** Return the selected Page's token from host-owned encrypted storage. Never a user token. */
  getPageAccessToken(accountId: string): Promise<string>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/** Publishes immediately. The host owns authorization, approvals, scheduling and deduplication. */
export class FacebookPagePublisher implements SocialPublisher {
  private readonly request: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  constructor(private readonly options: FacebookPublisherOptions) {
    if (!/^v\d+\.0$/.test(options.apiVersion)) throw new SocialPublishError('validation', 'not_sent');
    this.options = { ...options };
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new SocialPublishError('validation', 'not_sent');
    this.request = options.fetch ?? globalThis.fetch;
  }
  validate(post: SocialPost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'facebook') issues.push({ field: 'platform', message: 'Expected facebook.' });
    if (!/^\d+$/.test(post.accountId)) issues.push({ field: 'accountId', message: 'A numeric Page ID is required.' });
    if (post.placement !== 'feed') issues.push({ field: 'placement', message: 'Only feed posts are implemented.' });
    if (typeof post.text !== 'string') issues.push({ field: 'text', message: 'Text must be a string.' });
    if (post.media !== undefined && !Array.isArray(post.media)) issues.push({ field: 'media', message: 'Expected an array.' });
    else {
      const media = post.media ?? [];
      if (media.length > 1 || media.some(item => !item || item.kind !== 'image' || !isHttpsUrl(item.url))) {
        issues.push({ field: 'media', message: 'Only one image with an HTTPS URL is implemented.' });
      }
      if (typeof post.text === 'string' && !post.text.trim() && media.length === 0) issues.push({ field: 'text', message: 'Text or an image is required.' });
    }
    return issues;
  }
  async publish(post: SocialPost): Promise<PublishResult> {
    // Copy before awaiting credentials so a mutable caller cannot change the selected target/content.
    const snapshot: SocialPost = { ...post, media: Array.isArray(post.media) ? post.media.map(item => ({ ...item })) : post.media };
    if (this.validate(snapshot).length) throw new SocialPublishError('validation', 'not_sent');
    let token: string;
    try { token = await this.options.getPageAccessToken(snapshot.accountId); }
    catch { throw new SocialPublishError('authentication', 'not_sent'); }
    if (typeof token !== 'string' || !token.trim() || !/^[\x21-\x7e]+$/.test(token)) throw new SocialPublishError('authentication', 'not_sent');
    const image = snapshot.media?.[0];
    const body = new URLSearchParams(image
      ? { url: image.url, caption: snapshot.text, published: 'true' }
      : { message: snapshot.text });
    let response: Response;
    let data: any;
    try {
      response = await this.request(`https://graph.facebook.com/${this.options.apiVersion}/${snapshot.accountId}/${image ? 'photos' : 'feed'}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
      });
      data = await response.json();
    } catch { throw new SocialPublishError('delivery_unknown', 'unknown'); }
    if (!response.ok || data?.error) {
      if (response.status >= 500) throw new SocialPublishError('delivery_unknown', 'unknown');
      const code = data?.error?.code;
      const category = response.status === 401 || code === 190 ? 'authentication'
        : response.status === 403 || code === 10 || code === 200 ? 'permission'
        : response.status === 429 || [4, 17, 32, 613].includes(code) ? 'rate_limit' : 'provider';
      throw new SocialPublishError(category, 'rejected');
    }
    const providerId = image ? data?.post_id ?? data?.id : data?.id;
    if (typeof providerId !== 'string' || !/^[\d_]+$/.test(providerId)) throw new SocialPublishError('delivery_unknown', 'unknown');
    return { platform: 'facebook', accountId: snapshot.accountId, status: 'published', providerId };
  }
}
