const fs = require('fs');
const path = require('path');

const appPath  = path.join(__dirname, '..', 'src', 'App.jsx');
const newPath  = path.join(__dirname, 'parent_dashboard.jsx');

const content    = fs.readFileSync(appPath, 'utf8');
const newSection = fs.readFileSync(newPath, 'utf8');

const startMarker = '  // ── STARTSEITE (Eltern/Jugendlich) ─────────────────────────────';
const endMarker   = '  // ── STARTSEITE (Trainer/Admin Fallback – Gruppen-Liste) ─';

const si = content.indexOf(startMarker);
const ei = content.indexOf(endMarker);

if (si === -1) { console.error('START MARKER NOT FOUND'); process.exit(1); }

let result;
if (ei === -1) {
  // No "Fallback" marker – find the next marker "// ── GRUPPE"
  const altEnd = '  // ── GRUPPE ─';
  const ai = content.indexOf(altEnd);
  if (ai === -1) { console.error('END MARKER NOT FOUND'); process.exit(1); }
  result = content.slice(0, si) + newSection + '\n\n' + content.slice(ai);
} else {
  result = content.slice(0, si) + newSection + '\n\n' + content.slice(ei);
}

fs.writeFileSync(appPath, result, 'utf8');
console.log('Done. Replaced parent/youth dashboard.');
