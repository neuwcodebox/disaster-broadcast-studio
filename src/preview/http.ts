import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { PreviewProject } from './project.js';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.mp4': 'video/mp4',
};

async function serveFile(request: IncomingMessage, response: ServerResponse, root: string, relative: string) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) {
    response.writeHead(404).end(); return;
  }
  let info;
  try { info = await stat(file); } catch { response.writeHead(404).end(); return; }
  if (!info.isFile()) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
  response.setHeader('Accept-Ranges', 'bytes');
  let start = 0, end = info.size - 1;
  if (request.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    }
    if (!match || (!match[1] && !match[2]) || start > end || start >= info.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return;
    }
    response.statusCode = 206;
    response.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
  }
  response.setHeader('Content-Length', Math.max(0, end - start + 1));
  if (request.method === 'HEAD' || !info.size) { response.end(); return; }
  const stream = createReadStream(file, { start, end });
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
}

export function createPreviewServer(project: PreviewProject, publicDir: string, bundleDir: string) {
  return createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    void (async () => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
      }
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (pathname === '/api/status' || pathname === '/api/scenario') {
        const body = JSON.stringify(pathname === '/api/status' ? project.status() : project.current());
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(request.method === 'HEAD' ? undefined : body); return;
      }
      if (pathname.startsWith('/public/'))
        await serveFile(request, response, publicDir, pathname.slice('/public/'.length));
      else
        await serveFile(request, response, bundleDir, pathname === '/' ? 'index.html' : pathname.slice(1));
    })().catch(() => { if (!response.headersSent) response.writeHead(400); response.end(); });
  });
}
