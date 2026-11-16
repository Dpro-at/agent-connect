import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([
  ['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']],
  ['/studio/index.js', ['../studio/index.js', 'text/javascript']], ['/studio/assets.js', ['../studio/assets.js', 'text/javascript']],
]);
files.set('/studio/ui-icons.js', ['../studio/ui-icons.js', 'text/javascript']);
for (const name of ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok']) files.set(`/studio/icons/${name}.svg`, [`../studio/icons/${name}.svg`, 'image/svg+xml']);
const server = createServer(async (req, res) => {
  const item = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!item || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
  try {
    const data = await readFile(new URL(item[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${item[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    res.end(data);
  } catch { res.writeHead(500); res.end('Unable to load demo'); }
});
server.listen(Number(process.env.DEMO_PORT ?? 4318), '127.0.0.1', () => {
  console.log(`Social studio demo: http://127.0.0.1:${server.address().port}`);
});
