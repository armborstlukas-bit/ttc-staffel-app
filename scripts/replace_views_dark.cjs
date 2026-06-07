const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const newViewsPath = path.join(__dirname, 'views_dark.jsx');

let content = fs.readFileSync(appPath, 'utf8');
const newViews = fs.readFileSync(newViewsPath, 'utf8');

// Find the start of view==='group' and end of view==='childHistory'
// Start marker: "  // ── GRUPPE ─" or the if(view==='group') line
const startMarker = "  if (view==='group') {";
const endMarker = "  // ── ERRUNGENSCHAFTEN VIEW (Trainer/Admin) ────────────────────────────────";

const si = content.indexOf(startMarker);
if (si === -1) { console.error('START MARKER NOT FOUND: ' + startMarker); process.exit(1); }

const ei = content.indexOf(endMarker);
if (ei === -1) { console.error('END MARKER NOT FOUND: ' + endMarker); process.exit(1); }

if (ei <= si) { console.error('End marker is before start marker'); process.exit(1); }

console.log(`Replacing lines from pos ${si} to ${ei} (${ei - si} chars)`);

const result = content.slice(0, si) + newViews + '\n' + content.slice(ei);
fs.writeFileSync(appPath, result, 'utf8');
console.log('Done. Dark views spliced in.');
