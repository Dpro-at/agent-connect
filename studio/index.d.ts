export type StudioPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok';
export interface StudioMedia { url: string; kind: 'image' | 'video'; name: string; details?: string; }
export interface StudioPost {
  id: string;
  title: string;
  text: string;
  channels: StudioPlatform[];
  /** Selected account ID arrays, resolved from the host-supplied account list. */
  accountIds?: Partial<Record<StudioPlatform, string[]>>;
  placement: 'feed' | 'reel' | 'story' | 'video';
  ratio: 'square' | 'portrait' | 'vertical' | 'landscape';
  /** Local wall time; the host must resolve the workspace timezone before scheduling. */
  schedule: string;
  status: 'draft' | 'scheduled' | 'processing' | 'published' | 'failed';
  media: StudioMedia | null;
  privacy: 'private' | 'public' | 'unlisted';
}
export interface StudioAccount { platform: StudioPlatform; id: string; name: string; status?: 'connected' | 'expired' | 'error'; expiresAt?: string; lastCheckedAt?: string; }
export type StudioView = 'compose' | 'calendar' | 'library' | 'accounts';
export type StudioTheme = 'light' | 'dark' | 'system';
export interface StudioController { setPosts(posts: StudioPost[]): void; setAccounts(accounts: StudioAccount[]): void; setTheme(theme: StudioTheme): void; destroy(): void; }
export type StudioOptions = {
  mode: 'demo'; platforms?: StudioPlatform[]; storageKey?: string; theme?: StudioTheme; views?: StudioView[]; initialView?: StudioView;
} | {
  mode: 'connected'; platforms?: StudioPlatform[]; workspaceName?: string; connectablePlatforms?: StudioPlatform[]; theme?: StudioTheme; views?: StudioView[]; initialView?: StudioView;
  /** All available accounts, including multiple accounts on the same platform. No package-imposed count limit. */
  accounts: StudioAccount[]; posts: StudioPost[];
  /** Return authoritative persisted state; the UI never calls publishing APIs itself. */
  onSave?(post: StudioPost): Promise<StudioPost>;
  onPublish?(post: StudioPost): Promise<StudioPost>;
  onDelete?(id: string): Promise<void>;
  /** Restore a soft-deleted post; enables the Undo command in connected mode. */
  onRestore?(post: StudioPost): Promise<StudioPost>;
  /** Host performs OAuth and returns linked account metadata only, never tokens. */
  onConnect?(platform: StudioPlatform): Promise<StudioAccount | StudioAccount[] | null>;
  onReconnect?(account: StudioAccount): Promise<StudioAccount | null>;
  onCheckConnection?(account: StudioAccount): Promise<StudioAccount>;
  onDisconnect?(account: StudioAccount): Promise<void>;
  onUpload?(file: File): Promise<StudioMedia>;
};
/** Browser-only Shadow DOM component. No framework, stylesheet loader or credentials needed. */
export function mountSocialStudio(host: HTMLElement, options: StudioOptions): Promise<StudioController>;

export function mountSocialAccounts(host: HTMLElement, options: StudioOptions): Promise<StudioController>;
