import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Invalid URL'); return; }
  const publicFiles = new Set(['/index.html', '/style.css', '/app.js', '/geometry.js', '/annotations.js', '/image-export.js']);
  if (pathname === '/') pathname = '/index.html';
  if (!publicFiles.has(pathname)) { res.writeHead(404).end('Not found'); return; }
  const file = path.join(root, pathname);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(5173, '127.0.0.1', () => console.log('Boxroom: http://127.0.0.1:5173'));
