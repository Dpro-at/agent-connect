import { Client, Events, GatewayIntentBits } from 'discord.js';
import type { ChannelTransport, ChannelState, IncomingMessage, Delivery } from './index.js';

export class DiscordTransport implements ChannelTransport {
  private client?: Client;
  constructor(private token: string, private createClient: () => Client = () => new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    rest: { timeout: 15000 },
  })) {}
  async start(receive: (message: IncomingMessage) => Promise<void>, state: (value: ChannelState) => void): Promise<void> {
    const client = this.createClient();
    this.client = client;
    client.on(Events.Error, () => state('error'));
    client.on(Events.ShardDisconnect, () => state('connecting'));
    client.on(Events.ShardResume, () => state('connected'));
    client.on(Events.ClientReady, () => state('connected'));
    client.on(Events.MessageCreate, message => {
      if (message.author.bot || message.webhookId || !message.guildId || !message.content.trim()) return;
      void receive({ channel: 'discord', id: message.id, conversationId: message.channelId,
        senderId: message.author.id, senderName: message.author.username,
        text: message.content, guildId: message.guildId,
        timestamp: message.createdAt.toISOString() }).catch(() => state('error'));
    });
    await client.login(this.token);
  }
  async stop(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    await client?.destroy();
  }
  async send(conversationId: string, text: string): Promise<Delivery> {
    if (!this.client?.isReady()) throw new Error('Discord is not ready');
    const channel = await this.client.channels.fetch(conversationId);
    if (!channel?.isSendable()) throw new Error('Discord channel cannot receive messages');
    const result = await channel.send({ content: text, allowedMentions: { parse: [] } });
    return { id: result.id, conversationId: result.channelId };
  }
}
