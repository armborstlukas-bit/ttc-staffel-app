// Kleiner Node-Server für Google Cloud Run: stellt die Funktionen aus api/*.js unter /api/<name> bereit
// – mit derselben req/res-Schnittstelle wie bisher bei Vercel (req.query, req.body, res.status().json()).
import http from 'node:http';
import fs from 'node:fs';

const apiDir = new URL('../api/', import.meta.url);
const handlers = {};
for (const f of fs.readdirSync(apiDir)) {
  if (f.endsWith('.js')) handlers[f.slice(0, -3)] = (await import(new URL(f, apiDir))).default;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/i)?.[1];
  const handler = name && handlers[name];
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (body) => { res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); return res; };
  if (!handler) return res.status(404).json({ error: 'Nicht gefunden' });

  req.query = {};
  for (const [k, v] of url.searchParams) req.query[k] = k in req.query ? [].concat(req.query[k], v) : v;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  req.body = raw;
  if ((req.headers['content-type'] || '').includes('application/json')) {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  }
  try {
    await handler(req, res);
    if (!res.writableEnded) res.end();
  } catch (e) {
    console.error(`[${name}]`, e);
    if (!res.headersSent) res.status(500).json({ error: String(e?.message || e) });
    else res.end();
  }
});
server.listen(Number(process.env.PORT) || 8080, () => console.log('TTC-App-API bereit auf Port', process.env.PORT || 8080));
