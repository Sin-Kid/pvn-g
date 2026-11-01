// Tiny static server for site/. It applies the same headers as Netlify (read from
// site/_headers), so local runs and CI see the real Content-Security-Policy.
// Usage: npm run serve   (PORT=8080 by default)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../site/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json'
};

async function headerRules() {
  const rules = [];
  let current = null;
  for (const raw of (await readFile(join(ROOT, '_headers'), 'utf8')).split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { current = { pattern: line.trim(), headers: {} }; rules.push(current); continue; }
    const i = line.indexOf(':');
    if (current && i > 0) current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}

function matches(pattern, path) {
  return pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path;
}

export async function serve(port = 0) {
  const rules = await headerRules();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    let file = normalize(join(ROOT, path));
    let status = 200;
    let body;
    try {
      if (!file.startsWith(ROOT)) throw new Error('outside site/');
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      body = await readFile(file);
    } catch {
      status = 404;
      file = join(ROOT, '404.html');
      body = await readFile(file);
    }
    const headers = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' };
    for (const rule of rules) if (matches(rule.pattern, url.pathname)) Object.assign(headers, rule.headers);
    res.writeHead(status, headers);
    res.end(body);
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  await serve(port);
  console.log(`Serving site/ at http://localhost:${port}`);
}
