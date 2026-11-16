/** Social publishing is separate from conversational messaging. */
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok';
export interface SocialImage { kind: 'image'; url: string; }
export interface SocialVideo { kind: 'video'; url: string; durationSeconds?: number; }
export interface SocialPost {
  platform: SocialPlatform;
  accountId: string;
  placement: 'feed' | 'reel' | 'story' | 'video';
  text: string;
  media?: (SocialImage | SocialVideo)[];
}
export interface PublishResult {
  platform: SocialPlatform;
  accountId: string;
  status: 'published' | 'processing' | 'failed';
  stage?: 'container' | 'upload' | 'post';
  postIds?: string[];
  providerId: string;
}
export interface SocialPublisher<Post = SocialPost> {
  validate(post: Post): ValidationIssue[];
  publish(post: Post): Promise<PublishResult>;
}
export interface ValidationIssue { field: string; message: string; }
export type PublishErrorCode = 'validation' | 'authentication' | 'permission' | 'rate_limit' | 'provider' | 'delivery_unknown' | 'payment_required';
export class SocialPublishError extends Error {
  constructor(public readonly code: PublishErrorCode, public readonly delivery: 'not_sent' | 'rejected' | 'unknown') {
    super(`Social publishing failed: ${code}`);
    this.name = 'SocialPublishError';
  }
}
/** Implemented capability inventory, not a promise of live-account verification. */
export const SOCIAL_CAPABILITIES = [
  { platform: 'facebook', implemented: true, placements: ['feed'], media: ['single-image-url'], text: true, validation: 'mock-tested' },
  { platform: 'instagram', implemented: true, placements: ['feed', 'reel', 'story'], media: ['single-image-url', 'single-video-url'], text: false, validation: 'mock-tested' },
  { platform: 'linkedin', implemented: true, placements: ['feed'], media: ['single-image-upload'], text: true, validation: 'mock-tested' },
  { platform: 'x', implemented: true, placements: ['feed'], media: ['image-upload', 'uploaded-media-id'], text: true, validation: 'mock-tested' },
  { platform: 'youtube', implemented: true, placements: ['video'], media: ['video-upload'], text: false, validation: 'mock-tested' },
  { platform: 'tiktok', implemented: true, placements: ['feed', 'video'], media: ['image-urls', 'single-video-url'], text: false, validation: 'mock-tested' },
] as const;

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
}

export type { PublisherOptions } from './social-http.js';
