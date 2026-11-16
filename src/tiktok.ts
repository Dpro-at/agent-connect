import { isHttpsUrl, SocialPublishError } from './social.js';
import type { SocialPost, SocialPublisher, PublishResult, ValidationIssue } from './social.js';
import { ProviderHttp, invalid, acknowledgement, safeId } from './social-http.js';
import type { PublisherOptions } from './social-http.js';
export interface TikTokPost extends SocialPost {
  privacy: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  consent: true;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  title?: string;
  isAigc?: boolean;
}
export interface TikTokCreatorInfo {
  username: string;
  nickname: string;
  privacyLevels: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoDurationSeconds: number;
}
export class TikTokPublisher implements SocialPublisher<TikTokPost> {
  private readonly http: ProviderHttp;
  private readonly base = 'https://open.tiktokapis.com/v2';
  constructor(options: PublisherOptions) { this.http = new ProviderHttp(options); }
  validate(post: TikTokPost): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (post.platform !== 'tiktok' || !safeId(post.accountId)) issues.push({ field: 'accountId', message: 'An explicit TikTok open_id is required.' });
    if (!['feed', 'video'].includes(post.placement)) issues.push({ field: 'placement', message: 'Use feed for photos or video for video.' });
    if (post.consent !== true || !['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'].includes(post.privacy)
      || [post.disableComment, post.disableDuet, post.disableStitch].some(value => typeof value !== 'boolean') || (post.isAigc !== undefined && typeof post.isAigc !== 'boolean')) issues.push({ field: 'consent', message: 'Explicit consent, privacy and interaction choices are required.' });
    if (typeof post.text !== 'string' || post.text.length > (post.placement === 'video' ? 2200 : 4000) || (post.title !== undefined && (typeof post.title !== 'string' || post.title.length > 90))) issues.push({ field: 'text', message: 'Check title and description lengths for the selected placement.' });
    const media = post.media;
    if (!Array.isArray(media) || !media.length || media.some(item => !item || !isHttpsUrl(item.url))
      || (post.placement === 'feed' && (media.length > 35 || media.some(item => item.kind !== 'image')))
      || (post.placement === 'video' && (media.length !== 1 || media[0].kind !== 'video' || !Number.isFinite(media[0].durationSeconds) || (media[0].durationSeconds ?? 0) <= 0))) issues.push({ field: 'media', message: 'Use up to 35 HTTPS photos or one HTTPS video with inspected duration.' });
    return issues;
  }
  private check(data: any, write: boolean): any {
    const code = data?.error?.code;
    if (code !== 'ok') throw new SocialPublishError(code === 'access_token_invalid' ? 'authentication' : code === 'rate_limit_exceeded' ? 'rate_limit' : code === 'scope_not_authorized' ? 'permission' : 'provider', write ? 'rejected' : 'not_sent');
    return data.data;
  }
  private async verifyAccount(accountId: string, token: string): Promise<void> {
    const data = this.check(await this.http.json(`${this.base}/user/info/?fields=open_id`, token, undefined, false), false);
    if (data?.user?.open_id !== accountId) throw new SocialPublishError('permission', 'not_sent');
  }
  private async creator(token: string): Promise<TikTokCreatorInfo> {
    const data = this.check(await this.http.json(`${this.base}/post/publish/creator_info/query/`, token, {}, false), false);
    if (!Array.isArray(data?.privacy_level_options) || !data.privacy_level_options.every((item: unknown) => typeof item === 'string')
      || ![data.comment_disabled, data.duet_disabled, data.stitch_disabled].every(value => typeof value === 'boolean') || !Number.isFinite(data.max_video_post_duration_sec)) throw new SocialPublishError('provider', 'not_sent');
    return { username: typeof data.creator_username === 'string' ? data.creator_username : '', nickname: typeof data.creator_nickname === 'string' ? data.creator_nickname : '',
      privacyLevels: data.privacy_level_options, commentDisabled: data.comment_disabled, duetDisabled: data.duet_disabled, stitchDisabled: data.stitch_disabled, maxVideoDurationSeconds: data.max_video_post_duration_sec };
  }
  /** Render these fresh creator settings before collecting consent in the host UI. */
  async getCreatorInfo(accountId: string): Promise<TikTokCreatorInfo> {
    if (!safeId(accountId)) invalid();
    const token = await this.http.token(accountId);
    await this.verifyAccount(accountId, token);
    return this.creator(token);
  }
  async publish(post: TikTokPost): Promise<PublishResult> {
    if (this.validate(post).length) invalid();
    const input = structuredClone(post);
    const token = await this.http.token(input.accountId);
    await this.verifyAccount(input.accountId, token);
    const creator = await this.creator(token);
    if (!creator.privacyLevels.includes(input.privacy) || (creator.commentDisabled && !input.disableComment)
      || (creator.duetDisabled && !input.disableDuet) || (creator.stitchDisabled && !input.disableStitch)) invalid();
    const video = input.placement === 'video';
    if (video && input.media![0].kind === 'video' && input.media![0].durationSeconds! > creator.maxVideoDurationSeconds) invalid();
    const postInfo = video ? { title: input.text, privacy_level: input.privacy, disable_comment: input.disableComment, disable_duet: input.disableDuet, disable_stitch: input.disableStitch, ...(input.isAigc === undefined ? {} : { is_aigc: input.isAigc }) }
      : { title: input.title ?? '', description: input.text, privacy_level: input.privacy, disable_comment: input.disableComment, auto_add_music: false };
    const body = video ? { post_info: postInfo, source_info: { source: 'PULL_FROM_URL', video_url: input.media![0].url } }
      : { post_info: postInfo, source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: input.media!.map(item => item.url) }, post_mode: 'DIRECT_POST', media_type: 'PHOTO', ...(input.isAigc === undefined ? {} : { is_aigc: input.isAigc }) };
    const data = this.check(await this.http.json(`${this.base}/post/publish/${video ? 'video' : 'content'}/init/`, token, body), true);
    return { platform: 'tiktok', accountId: input.accountId, providerId: acknowledgement(data?.publish_id), status: 'processing', stage: 'post' };
  }
  async getStatus(accountId: string, publishId: string): Promise<PublishResult> {
    if (!safeId(accountId) || !safeId(publishId)) invalid();
    const token = await this.http.token(accountId);
    await this.verifyAccount(accountId, token);
    const data = this.check(await this.http.json(`${this.base}/post/publish/status/fetch/`, token, { publish_id: publishId }, false), false);
    const status = data?.status;
    if (!['PROCESSING_UPLOAD', 'PROCESSING_DOWNLOAD', 'SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'].includes(status)) throw new SocialPublishError('provider', 'not_sent');
    const ids = data?.publicaly_available_post_id ?? [];
    if (!Array.isArray(ids) || !ids.every((id: unknown) => safeId(id, /^\d+$/))) throw new SocialPublishError('provider', 'not_sent');
    return { platform: 'tiktok', accountId, providerId: publishId, status: status === 'PUBLISH_COMPLETE' ? 'published' : status === 'FAILED' ? 'failed' : 'processing', stage: 'post', postIds: ids };
  }
}
