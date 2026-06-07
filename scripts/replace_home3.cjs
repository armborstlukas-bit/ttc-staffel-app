const fs = require('fs');
const path = require('path');

const appPath  = path.join(__dirname, '..', 'src', 'App.jsx');
const newPath  = path.join(__dirname, 'dashboard_v3.jsx');

const content    = fs.readFileSync(appPath, 'utf8');
const newSection = fs.readFileSync(newPath, 'utf8');

const startMarker = '  // ── STARTSEITE (Trainer/Admin Dashboard) ───────────────────────────────';
const endMarker   = '  // ── STARTSEITE (Eltern/Jugendlich) ─────────────────────────────';

const si = content.indexOf(startMarker);
const ei = content.indexOf(endMarker);

if (si === -1) { console.error('START MARKER NOT FOUND'); process.exit(1); }
if (ei === -1) { console.error('END MARKER NOT FOUND');   process.exit(1); }

const result = content.slice(0, si) + newSection + '\n\n' + content.slice(ei);
fs.writeFileSync(appPath, result, 'utf8');
console.log('Done. Replaced trainer dashboard (v3).');
