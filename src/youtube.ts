import { SocialPublishError } from './social.js';
import type { SocialPublisher, PublishResult, ValidationIssue } from './social.js';
import { ProviderHttp, invalid, acknowledgement, safeId, providerUrl } from './social-http.js';
import type { PublisherOptions } from './social-http.js';
export interface YouTubePost {
  platform: 'youtube'; accountId: string; placement: 'video';
  title: string; description: string; video: Blob;
  privacy: 'private' | 'unlisted' | 'public';
  madeForKids: boolean;
  containsSyntheticMedia?: boolean;
}
/** Sensitive upload URL: persist privately to reconcile interruptions, never expose to browsers/logs. */
export interface YouTubeUpload { accountId: string; uploadUrl: string; size: number; mimeType: string; }
export type YouTubeUploadProgress = PublishResult | { status: 'uploading'; uploadedBytes: number };
export class YouTubePublisher implements SocialPublisher<YouTubePost> {
  private readonly http: ProviderHttp;
  constructor(options: PublisherOptions) { this.http = new ProviderHttp(options); }
  validate(post: YouTubePost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'youtube' || !safeId(post.accountId, /^UC[A-Za-z0-9_-]{22}$/) || post.placement !== 'video') issues.push({ field: 'accountId', message: 'Choose an explicit YouTube channel and video placement.' });
    if (typeof post.title !== 'string' || !post.title.trim() || post.title.length > 100 || /[<>]/.test(post.title)) issues.push({ field: 'title', message: 'Provide a title up to 100 characters without angle brackets.' });
    if (typeof post.description !== 'string' || Buffer.byteLength(post.description) > 5000 || /[<>]/.test(post.description)) issues.push({ field: 'description', message: 'Description must be at most 5000 bytes without angle brackets.' });
    if (!(post.video instanceof Blob) || !/^video\/[a-z0-9.+-]+$/i.test(post.video.type) || post.video.size === 0) issues.push({ field: 'video', message: 'A nonempty video Blob is required.' });
    if (!['private', 'unlisted', 'public'].includes(post.privacy) || typeof post.madeForKids !== 'boolean' || (post.containsSyntheticMedia !== undefined && typeof post.containsSyntheticMedia !== 'boolean')) issues.push({ field: 'privacy', message: 'Choose privacy and declare the audience explicitly.' });
    return issues;
  }
  private async verifyChannel(accountId: string, token: string): Promise<void> {
    const data = await this.http.json('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', token, undefined, false);
    if (!Array.isArray(data?.items) || !data.items.some((item: any) => item?.id === accountId)) throw new SocialPublishError('permission', 'not_sent');
  }
  async beginUpload(post: YouTubePost): Promise<YouTubeUpload> {
    if (this.validate(post).length) invalid();
    const input = { ...post };
    const token = await this.http.token(input.accountId);
    await this.verifyChannel(input.accountId, token);
    const response = await this.http.raw('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Length': String(input.video.size), 'X-Upload-Content-Type': input.video.type },
      body: JSON.stringify({ snippet: { title: input.title, description: input.description }, status: {
        privacyStatus: input.privacy, selfDeclaredMadeForKids: input.madeForKids,
        ...(input.containsSyntheticMedia === undefined ? {} : { containsSyntheticMedia: input.containsSyntheticMedia }),
      } }),
    });
    const uploadUrl = this.uploadUrl(response.headers.get('location'));
    return { accountId: input.accountId, uploadUrl, size: input.video.size, mimeType: input.video.type };
  }
  private uploadUrl(value: unknown): string {
    const url = providerUrl(value, ['www.googleapis.com']);
    if (!new URL(url).pathname.startsWith('/upload/youtube/v3/videos')) throw new SocialPublishError('provider', 'not_sent');
    return url;
  }
  private session(value: YouTubeUpload): YouTubeUpload {
    const copy = { ...value };
    if (!safeId(copy.accountId, /^UC[A-Za-z0-9_-]{22}$/) || !Number.isSafeInteger(copy.size) || copy.size <= 0 || !/^video\/[a-z0-9.+-]+$/i.test(copy.mimeType)) invalid();
    copy.uploadUrl = this.uploadUrl(copy.uploadUrl); return copy;
  }
  async upload(session: YouTubeUpload, video: Blob, offset = 0): Promise<PublishResult> {
    const saved = this.session(session);
    if (!(video instanceof Blob) || video.size !== saved.size || video.type !== saved.mimeType || !Number.isSafeInteger(offset) || offset < 0 || offset >= saved.size) invalid();
    const token = await this.http.token(saved.accountId);
    const response = await this.http.raw(saved.uploadUrl, token, { method: 'PUT', headers: { 'Content-Type': saved.mimeType, ...(offset ? { 'Content-Range': `bytes ${offset}-${saved.size - 1}/${saved.size}` } : {}) }, body: offset ? video.slice(offset) : video });
    const data = await this.http.read(response);
    return this.result(saved.accountId, data);
  }
  /** Prefer beginUpload + persisted session + upload for durable jobs. */
  async publish(post: YouTubePost): Promise<PublishResult> {
    const input = { ...post };
    const session = await this.beginUpload(input);
    return this.upload(session, input.video);
  }
  async queryUpload(session: YouTubeUpload): Promise<YouTubeUploadProgress> {
    const saved = this.session(session);
    const token = await this.http.token(saved.accountId);
    const response = await this.http.raw(saved.uploadUrl, token, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${saved.size}` } }, false, [308]);
    if (response.status === 308) {
      const range = response.headers.get('range');
      if (range && !/^bytes=0-\d+$/.test(range)) throw new SocialPublishError('provider', 'not_sent');
      const uploadedBytes = range ? Number(range.split('-')[1]) + 1 : 0;
      if (!Number.isSafeInteger(uploadedBytes) || uploadedBytes > saved.size) throw new SocialPublishError('provider', 'not_sent');
      return { status: 'uploading', uploadedBytes };
    }
    return this.result(saved.accountId, await this.http.read(response, false));
  }
  async getStatus(accountId: string, videoId: string): Promise<PublishResult> {
    if (!safeId(accountId, /^UC[A-Za-z0-9_-]{22}$/) || !safeId(videoId, /^[A-Za-z0-9_-]{11}$/)) invalid();
    const token = await this.http.token(accountId);
    const data = await this.http.json(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}`, token, undefined, false);
    const video = data?.items?.[0];
    if (video?.id !== videoId || video?.snippet?.channelId !== accountId) throw new SocialPublishError('permission', 'not_sent');
    return this.result(accountId, video);
  }
  private result(accountId: string, data: any): PublishResult {
    const providerId = acknowledgement(data?.id, /^[A-Za-z0-9_-]{11}$/);
    const state = data?.status?.uploadStatus;
    return { platform: 'youtube', accountId, providerId, status: ['failed', 'rejected', 'deleted'].includes(state) ? 'failed' : state === 'processed' ? 'published' : 'processing', stage: 'post' };
  }
}
