import { channelInfo } from './catalog.js';
import type { ChannelId } from './catalog.js';
export { CHANNEL_CATALOG, channelInfo } from './catalog.js';
export type { ChannelId } from './catalog.js';
export type ChannelState = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface IncomingMessage {
  channel: ChannelId;
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  guildId?: string;
  threadId?: string;
  mediaUrls?: string[];
}
export interface Delivery { id: string; conversationId: string; acknowledgement?: 'provider' | 'adapter'; }
export interface ChannelTransport {
  start(receive: (message: IncomingMessage) => Promise<void>, state: (value: ChannelState) => void): Promise<void>;
  stop(): Promise<void>;
  send(conversationId: string, text: string): Promise<Delivery>;
}
export interface ChannelHooks {
  receive(message: IncomingMessage): Promise<void>;
  onError?(operation: 'connect' | 'receive' | 'send', error: unknown): void;
}

/** Framework-independent lifecycle. The host owns persistence and authorization. */
export class ChannelConnector {
  state: ChannelState = 'disconnected';
  private generation = 0;
  private pending?: Promise<void>;
  constructor(readonly id: ChannelId, private transport: ChannelTransport, private hooks: ChannelHooks) {}
  async connect(): Promise<void> {
    if (this.pending) return this.pending;
    if (this.state === 'connected') return;
    const restart = this.state !== 'disconnected';
    const generation = ++this.generation;
    this.state = 'connecting';
    this.pending = (async () => {
      try {
        // An errored/reconnecting transport may still own sockets or a polling loop.
        if (restart) await this.transport.stop();
        await this.transport.start(async message => {
          if (generation !== this.generation || this.state !== 'connected') return;
          try { await this.hooks.receive(message); }
          catch (error) { this.hooks.onError?.('receive', error); }
        }, state => { if (generation === this.generation) this.state = state; });
      } catch (error) {
        if (generation === this.generation) this.state = 'error';
        await this.transport.stop();
        this.hooks.onError?.('connect', error);
        throw new Error(`${this.id} connection failed`);
      }
    })();
    try { await this.pending; } finally { this.pending = undefined; }
  }
  async disconnect(): Promise<void> {
    ++this.generation;
    this.state = 'disconnected';
    await this.transport.stop();
    if (this.pending) { await this.pending.catch(() => {}); await this.transport.stop(); }
  }
  async send(conversationId: string, text: string): Promise<Delivery> {
    if (this.state !== 'connected') throw new Error(`${this.id} is not connected`);
    const limit = channelInfo(this.id).maxTextLength;
    if (!conversationId || !text.trim() || text.length > limit) throw new Error(`Message must contain 1-${limit} characters and a destination`);
    try { return await this.transport.send(conversationId, text); }
    catch (error) {
      this.hooks.onError?.('send', error);
      throw new Error(`${this.id} delivery failed`);
    }
  }
}
export { TelegramTransport } from './telegram.js';
export { DiscordTransport } from './discord.js';
export { PythonTransport } from './python.js';
export type { PythonTransportOptions } from './python.js';
