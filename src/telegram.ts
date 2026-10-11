import { Bot } from 'grammy';
import type { ChannelTransport, ChannelState, IncomingMessage, Delivery } from './index.js';

export class TelegramTransport implements ChannelTransport {
  private bot?: Bot;
  private running?: Promise<void>;
  constructor(private token: string, private createBot: (token: string) => Bot = token => new Bot(token, { client: { timeoutSeconds: 15 } })) {}
  async start(receive: (message: IncomingMessage) => Promise<void>, state: (value: ChannelState) => void): Promise<void> {
    const bot = this.createBot(this.token);
    this.bot = bot;
    bot.on('message:text', async ctx => {
      if (ctx.from.is_bot) return;
      await receive({ channel: 'telegram', id: String(ctx.message.message_id),
        conversationId: String(ctx.chat.id), senderId: String(ctx.from.id),
        senderName: ctx.from.username || ctx.from.first_name, text: ctx.message.text,
        timestamp: new Date(ctx.message.date * 1000).toISOString() });
    });
    bot.catch(() => { state('error'); });
    await bot.init();
    if (this.bot !== bot) return;
    const webhook = await bot.api.getWebhookInfo();
    if (this.bot !== bot) return;
    if (webhook.url) throw new Error('Remove the existing Telegram webhook before enabling polling');
    // Keep the polling promise so shutdown waits for its completion.
    let ready!: () => void;
    let fail!: (error: unknown) => void;
    const started = new Promise<void>((resolve, reject) => { ready = resolve; fail = reject; });
    this.running = bot.start({ onStart: () => { state('connected'); ready(); } });
    void this.running.catch(error => { state('error'); fail(error); });
    await started;
  }
  async stop(): Promise<void> {
    const bot = this.bot;
    this.bot = undefined;
    if (bot?.isRunning()) await bot.stop();
    await this.running?.catch(() => {});
    this.running = undefined;
  }
  async send(conversationId: string, text: string): Promise<Delivery> {
    if (!this.bot) throw new Error('Telegram is not started');
    const result = await this.bot.api.sendMessage(conversationId, text);
    return { id: String(result.message_id), conversationId: String(result.chat.id) };
  }
}
