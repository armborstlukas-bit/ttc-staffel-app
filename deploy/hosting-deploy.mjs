// Lädt einen Ordner per Firebase-Hosting-REST-API hoch und veröffentlicht ihn mit der Konfiguration aus <config.json>.
// Aufruf: node deploy/hosting-deploy.mjs <site> <ordner> <config.json> <projekt>   (Token: gcloud auth print-access-token, Umgebungsvariable TOKEN)
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
const [site, dir, configFile, project] = process.argv.slice(2);
const token = process.env.TOKEN;
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const API = 'https://firebasehosting.googleapis.com/v1beta1';
const H = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' };
const call = async (url, opt = {}) => { const r = await fetch(url, { ...opt, headers: { ...H, ...(opt.headers || {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${url}\n${t}`); return t ? JSON.parse(t) : {}; };
const files = {}; const blobs = {};
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) return walk(f); const gz = zlib.gzipSync(fs.readFileSync(f), { level: 9 }); const h = crypto.createHash('sha256').update(gz).digest('hex'); files['/' + path.relative(dir, f).split(path.sep).join('/')] = h; blobs[h] = gz; });
walk(dir);
const version = await call(`${API}/sites/${site}/versions`, { method: 'POST', body: JSON.stringify({ config }) });
const pop = await call(`${API}/${version.name}:populateFiles`, { method: 'POST', body: JSON.stringify({ files }) });
for (const h of pop.uploadRequiredHashes || []) {
  const r = await fetch(`${pop.uploadUrl}/${h}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: blobs[h] });
  if (!r.ok) throw new Error('Upload ' + r.status + ' ' + await r.text());
}
await call(`${API}/${version.name}?update_mask=status`, { method: 'PATCH', body: JSON.stringify({ status: 'FINALIZED' }) });
const rel = await call(`${API}/sites/${site}/releases?versionName=${version.name}`, { method: 'POST', body: JSON.stringify({ message: process.env.MESSAGE || 'Veröffentlichung' }) });
console.log('Dateien', Object.keys(files).length, 'hochgeladen', (pop.uploadRequiredHashes || []).length, '→', rel.name);
