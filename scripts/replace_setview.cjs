const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

// Replace setView( with navTo( in onClick/action handlers and navigation contexts
// but NOT in useState declarations or the navTo definition itself
// We do a careful replacement: only where it's used as a call inside JSX or event handlers

// Replace patterns like: setView('home'), setView('group'), etc. - but not the state declaration
// Strategy: replace all setView( that appear AFTER the navTo definition (line ~815)

const navToDefLine = "  const navTo = (v) => { setView(v); setViewKey(k => k + 1); };";
const idx = content.indexOf(navToDefLine);
if (idx === -1) { console.error('navTo def not found'); process.exit(1); }

// Split at navTo definition
const before = content.slice(0, idx + navToDefLine.length);
let after = content.slice(idx + navToDefLine.length);

// In the 'after' part, replace setView( with navTo(
// EXCEPT: keep setView inside useState, and inside the navTo def itself (already handled by split)
// Also keep setView calls that are part of the Role picker and login flows (those are fine to use navTo)
after = after.replace(/\bsetView\(/g, 'navTo(');

content = before + after;
fs.writeFileSync(appPath, content, 'utf8');
console.log('Done: replaced setView with navTo in navigation calls.');
