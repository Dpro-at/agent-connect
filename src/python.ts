import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ChannelId, ChannelTransport, ChannelState, IncomingMessage, Delivery } from './index.js';

export interface PythonTransportOptions {
  /** Python 3.11-3.13 executable in an environment containing the adapter dependencies. */
  pythonExecutable?: string;
  /** Private persistent adapter state. Never deploy this directory as public assets. */
  stateDirectory?: string;
  settings?: { token?: string; api_key?: string; extra?: Record<string, unknown>; [key: string]: unknown };
  /** Provider-specific settings/secrets are sent through stdin, not command-line arguments. */
  environment?: Record<string, string>;
  timeoutMs?: number;
}

/** Optional isolated Python adapter runtime; no model or agent execution occurs in this worker. */
export class PythonTransport implements ChannelTransport {
  private child?: ChildProcessWithoutNullStreams;
  private sequence = 0;
  private pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private state?: (value: ChannelState) => void;
  private stopping = false;
  constructor(readonly channel: ChannelId, private options: PythonTransportOptions = {}) {}

  private request(method: string, payload: Record<string, unknown> = {}): Promise<any> {
    const child = this.child;
    if (!child || child.stdin.destroyed) return Promise.reject(new Error('Adapter worker is unavailable'));
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Adapter ${method} timed out`));
      }, this.options.timeoutMs ?? 60000);
      this.pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ id, method, ...payload }) + '\n', error => {
        if (!error) return;
        clearTimeout(timer); this.pending.delete(id);
        reject(new Error('Adapter worker write failed'));
      });
    });
  }

  async start(receive: (message: IncomingMessage) => Promise<void>, state: (value: ChannelState) => void): Promise<void> {
    if (this.child) throw new Error('Adapter worker is already started');
    this.state = state;
    this.stopping = false;
    const stateDirectory = this.options.stateDirectory ?? join(homedir(), '.agent-connect', this.channel);
    await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
    if (this.stopping) throw new Error('Adapter start was cancelled');
    // Do not inherit model, bot, npm or GitHub credentials from the host process.
    const environment: NodeJS.ProcessEnv = {};
    for (const key of ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) {
      if (process.env[key]) environment[key] = process.env[key];
    }
    Object.assign(environment, { PYTHONUNBUFFERED: '1', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', HERMES_HOME: stateDirectory });
    const child = spawn(this.options.pythonExecutable ?? 'python', [fileURLToPath(new URL('../runtime/python/worker.py', import.meta.url))], {
      env: environment, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    // Donor SDKs can print credentials in diagnostics. Consume but never forward stderr.
    child.stderr.resume();
    const rejectAll = () => {
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Adapter worker stopped')); }
      this.pending.clear();
      if (!this.stopping) state('error');
    };
    child.on('error', rejectAll);
    child.on('exit', rejectAll);
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', line => {
      try {
        if (line.length > 1024 * 1024) throw new Error('Frame too large');
        const frame = JSON.parse(line);
        if (frame.event === 'state') {
          if (['connected', 'connecting', 'disconnected', 'error'].includes(frame.state)) state(frame.state);
        } else if (frame.event === 'message') {
          const message = frame.message;
          if (message?.channel !== this.channel || !message.id || !message.conversationId || !message.senderId || typeof message.text !== 'string') throw new Error('Invalid message');
          void receive(message).catch(() => state('error')).finally(() => {
            if (!this.stopping && !child.stdin.destroyed) child.stdin.write(JSON.stringify({ method: 'complete', callbackId: frame.callbackId }) + '\n');
          });
        } else if (frame.id) {
          const pending = this.pending.get(String(frame.id));
          if (!pending) return;
          clearTimeout(pending.timer); this.pending.delete(String(frame.id));
          if (frame.error) pending.reject(new Error('Adapter operation failed; verify configuration and installed dependencies'));
          else pending.resolve(frame.result);
        }
      } catch { state('error'); child.kill(); }
    });
    await this.request('start', { channel: this.channel, settings: this.options.settings ?? {}, environment: this.options.environment ?? {} });
    if (this.child !== child || this.stopping) throw new Error('Adapter start was cancelled');
  }

  async send(conversationId: string, text: string): Promise<Delivery> {
    const delivery = await this.request('send', { conversationId, text });
    if (!delivery?.id || delivery.conversationId !== conversationId) throw new Error('Adapter did not acknowledge delivery');
    return delivery;
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.stopping = true;
    if (!child) return;
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([this.request('stop'), new Promise<void>(resolve => { timeout = setTimeout(resolve, 12000); })]);
    } catch { /* Failed workers still need process cleanup. */ }
    finally {
      if (timeout) clearTimeout(timeout);
      child.stdin.end();
      if (child.exitCode === null) child.kill();
      if (this.child === child) this.child = undefined;
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Adapter worker stopped')); }
      this.pending.clear();
      this.state?.('disconnected');
    }
  }
}
