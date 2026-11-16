import { SocialPublishError } from './social.js';
export interface PublisherOptions {
  getAccessToken(accountId: string): Promise<string>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}
export class ProviderHttp {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly timeout: number;
  private readonly resolveToken: PublisherOptions['getAccessToken'];
  constructor(options: PublisherOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.resolveToken = options.getAccessToken;
    this.timeout = options.timeoutMs ?? 30_000;
    if (!Number.isFinite(this.timeout) || this.timeout <= 0 || this.timeout > 2_147_483_647) invalid();
  }
  async token(accountId: string): Promise<string> {
    try {
      const token = await this.resolveToken(accountId);
      if (typeof token !== 'string' || !token.trim() || !/^[\x21-\x7e]+$/.test(token)) throw Error();
      return token;
    } catch { throw new SocialPublishError('authentication', 'not_sent'); }
  }
  async raw(url: string, token: string | undefined, init: RequestInit = {}, write = true, acceptedStatuses: number[] = []): Promise<Response> {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.fetcher(url, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(this.timeout) });
    } catch { throw new SocialPublishError(write ? 'delivery_unknown' : 'provider', write ? 'unknown' : 'not_sent'); }
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      if (response.status >= 500 && write) throw new SocialPublishError('delivery_unknown', 'unknown');
      const code = response.status === 401 ? 'authentication' : response.status === 403 ? 'permission'
        : response.status === 429 ? 'rate_limit' : response.status === 402 ? 'payment_required' : 'provider';
      throw new SocialPublishError(code, write ? 'rejected' : 'not_sent');
    }
    return response;
  }
  async json(url: string, token: string, body?: unknown, write = true): Promise<any> {
    const response = await this.raw(url, token, body === undefined ? { method: 'GET' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, write);
    return this.read(response, write);
  }
  async read(response: Response, write = true): Promise<any> {
    try { return await response.json(); }
    catch { throw new SocialPublishError(write ? 'delivery_unknown' : 'provider', write ? 'unknown' : 'not_sent'); }
  }
}
export function invalid(): never { throw new SocialPublishError('validation', 'not_sent'); }
export function acknowledgement(value: unknown, pattern: RegExp = /^[A-Za-z0-9_:~.-]+$/): string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new SocialPublishError('delivery_unknown', 'unknown');
  return value;
}
export function safeId(value: unknown, pattern: RegExp = /^[A-Za-z0-9_:~.-]+$/): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && pattern.test(value);
}
export function providerUrl(value: unknown, hosts: string[]): string {
  if (typeof value !== 'string') throw new SocialPublishError('provider', 'not_sent');
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.includes(url.hostname)) return url.href;
  } catch {}
  throw new SocialPublishError('provider', 'not_sent');
}
