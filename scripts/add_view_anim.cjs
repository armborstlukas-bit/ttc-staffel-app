const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

// For dark-theme views: their root div starts with:
// <div style={{minHeight:'100vh',background:'linear-gradient(
// Add className="ttc-view-enter" and key={viewKey} to these

// Pattern 1: Dark full-screen views (login, role picker, pending, admin, dashboards)
content = content.replace(
  /<div style=\{\{minHeight:'100vh',background:'linear-gradient\(/g,
  `<div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(`
);

// Pattern 2: s.page() based views
// <div style={s.page(...)}>
content = content.replace(
  /<div style=\{s\.page\(([^)]*)\)\}>/g,
  (match, args) => `<div className="ttc-view-enter" key={viewKey} style={s.page(${args})}>`
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Done: added ttc-view-enter animations to view roots.');
