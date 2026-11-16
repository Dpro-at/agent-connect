import { isHttpsUrl, SocialPublishError } from './social.js';
import type { SocialPost, SocialPublisher, PublishResult, ValidationIssue } from './social.js';
import { ProviderHttp, invalid, acknowledgement, safeId } from './social-http.js';
import type { PublisherOptions } from './social-http.js';
export interface InstagramPublisherOptions extends PublisherOptions {
  apiVersion: string;
  login: 'instagram' | 'facebook';
}
export interface InstagramContainer { accountId: string; containerId: string; }
export class InstagramPublisher implements SocialPublisher {
  private readonly http: ProviderHttp;
  private readonly base: string;
  constructor(options: InstagramPublisherOptions) {
    if (!/^v\d+\.0$/.test(options.apiVersion) || !['instagram', 'facebook'].includes(options.login)) invalid();
    this.http = new ProviderHttp(options);
    this.base = `https://${options.login === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com'}/${options.apiVersion}`;
  }
  validate(post: SocialPost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'instagram' || !safeId(post.accountId, /^\d+$/)) issues.push({ field: 'accountId', message: 'An Instagram professional account is required.' });
    if (!['feed', 'reel', 'story'].includes(post.placement)) issues.push({ field: 'placement', message: 'Use feed, reel or story.' });
    if (typeof post.text !== 'string' || post.text.length > 2200) issues.push({ field: 'text', message: 'Caption must be at most 2200 UTF-16 code units.' });
    const media = post.media;
    if (!Array.isArray(media) || media.length !== 1 || !media[0] || !['image', 'video'].includes(media[0].kind) || !isHttpsUrl(media[0].url)
      || (post.placement === 'reel' && media[0].kind !== 'video') || (post.placement === 'feed' && media[0].kind !== 'image')) {
      issues.push({ field: 'media', message: 'Use one HTTPS image for feed, a video for reel, or one image/video for story.' });
    }
    return issues;
  }
  /** Creates a container only. Persist its ID before calling complete(). */
  async publish(post: SocialPost): Promise<PublishResult> {
    if (this.validate(post).length) invalid();
    const input = structuredClone(post);
    const token = await this.http.token(input.accountId);
    const media = input.media![0];
    const body: Record<string, string> = media.kind === 'image' ? { image_url: media.url } : { video_url: media.url };
    if (input.placement === 'reel') body.media_type = 'REELS';
    if (input.placement === 'story') body.media_type = 'STORIES';
    if (input.placement !== 'story') body.caption = input.text;
    const data = await this.http.json(`${this.base}/${input.accountId}/media`, token, body);
    this.checkError(data, true);
    return { platform: 'instagram', accountId: input.accountId, providerId: acknowledgement(data?.id, /^\d+$/), status: 'processing', stage: 'container' };
  }
  /** One status check; no sleeping or hidden retry. Only FINISHED containers are published. */
  async complete(container: InstagramContainer): Promise<PublishResult> {
    const { accountId, containerId } = { ...container };
    if (!safeId(accountId, /^\d+$/) || !safeId(containerId, /^\d+$/)) invalid();
    const token = await this.http.token(accountId);
    const data = await this.http.json(`${this.base}/${containerId}?fields=status_code`, token, undefined, false);
    this.checkError(data, false);
    const result = { platform: 'instagram' as const, accountId, providerId: containerId, stage: 'container' as const };
    if (['ERROR', 'EXPIRED'].includes(data?.status_code)) return { ...result, status: 'failed' };
    if (data?.status_code === 'IN_PROGRESS') return { ...result, status: 'processing' };
    // A PUBLISHED container cannot reliably supply the final media ID. Reconcile in the host.
    if (data?.status_code === 'PUBLISHED') throw new SocialPublishError('delivery_unknown', 'unknown');
    if (data?.status_code !== 'FINISHED') throw new SocialPublishError('provider', 'not_sent');
    const published = await this.http.json(`${this.base}/${accountId}/media_publish`, token, { creation_id: containerId });
    this.checkError(published, true);
    return { platform: 'instagram', accountId, providerId: acknowledgement(published?.id, /^\d+$/), status: 'published', stage: 'post' };
  }
  private checkError(data: any, write: boolean): void {
    if (!data?.error) return;
    const code = data.error.code;
    throw new SocialPublishError(code === 190 ? 'authentication' : [4, 17, 32, 613].includes(code) ? 'rate_limit' : [10, 200].includes(code) ? 'permission' : 'provider', write ? 'rejected' : 'not_sent');
  }
}
