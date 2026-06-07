const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const content = fs.readFileSync(appPath, 'utf8');

// Find the OLD eltern/jugendlich block at line ~1991.
// It starts with the ELTERN / JUGENDLICHE comment:
const startMarker = '  // ── ELTERN / JUGENDLICHE ─────────────────────────────────────\n  if (\'[\'eltern\',\'jugendlich\']\'.includes(userRole))';

// Use a different approach: find the block that precedes ADMIN
// The old block ends just before the ADMIN section
const adminMarker = '  // ── ADMIN ────────────────────────────────────────────────────';
const elternComment = '  // ── ELTERN / JUGENDLICHE ─────────────────────────────────────';

const ei = content.indexOf(elternComment);
const ai = content.indexOf(adminMarker);

if (ei === -1) { console.error('ELTERN COMMENT NOT FOUND'); process.exit(1); }
if (ai === -1) { console.error('ADMIN MARKER NOT FOUND'); process.exit(1); }

if (ei >= ai) { console.error('Eltern comment is AFTER admin - already replaced?'); process.exit(1); }

// Delete the old eltern block (from elternComment to just before adminMarker)
const result = content.slice(0, ei) + content.slice(ai);
fs.writeFileSync(appPath, result, 'utf8');
console.log('Done. Removed old white parent/youth view.');
console.log(`Removed ${ai - ei} characters.`);
