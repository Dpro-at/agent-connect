#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args[0] !== 'doctor') {
  console.log('Usage: agent-connect doctor [--python /path/to/python]');
  console.log('Checks adapter imports/factories without connecting accounts. Install the optional Python requirements first.');
  process.exit(args.length ? 1 : 0);
}
const pythonIndex = args.indexOf('--python');
const python = pythonIndex >= 0 ? args[pythonIndex + 1] : 'python';
if (!python) { console.error('Missing Python executable.'); process.exit(1); }
const worker = spawn(python, [fileURLToPath(new URL('./python/worker.py', import.meta.url))], {
  shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
});
worker.stderr.resume();
const timeout = setTimeout(() => { console.error('Runtime diagnostics timed out.'); worker.kill(); process.exitCode = 1; }, 60000);
worker.on('error', () => { clearTimeout(timeout); console.error('Cannot start the configured Python executable.'); process.exitCode = 1; });
worker.on('exit', () => clearTimeout(timeout));
createInterface({ input: worker.stdout }).on('line', line => {
  try {
    const frame = JSON.parse(line);
    if (frame.id === 'doctor') {
      console.log(JSON.stringify(frame.result ?? frame.error, null, 2));
      if (!Array.isArray(frame.result) || frame.result.some(item => !item.importable || !item.factory)) process.exitCode = 1;
    }
  } catch { console.error('Invalid diagnostic frame.'); worker.kill(); process.exitCode = 1; }
});
worker.stdin.end(JSON.stringify({ id: 'doctor', method: 'diagnose' }) + '\n' + JSON.stringify({ id: 'stop', method: 'stop' }) + '\n');
