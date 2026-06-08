// Comprehensive mobile UX: sticky headers, remove bottom nav, mobile improvements
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

// ─────────────────────────────────────────────────────────────────
// 1. ADD GLOBAL CSS for sticky headers
// ─────────────────────────────────────────────────────────────────
// File uses CRLF - probe the exact anchor
const cssAnchor = '.ttc-view-enter {\r\n      animation: ttcFadeSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;\r\n    }';
if(c.indexOf(cssAnchor)===-1){console.log('✗ CSS anchor not found');process.exit(1);}
const cssAddition = '\r\n    .ttc-sticky-hdr {\r\n      position: sticky;\r\n      top: 0;\r\n      z-index: 600;\r\n      background: rgba(2,26,10,0.97);\r\n      backdrop-filter: blur(14px);\r\n      -webkit-backdrop-filter: blur(14px);\r\n    }\r\n    .ttc-sticky-hdr-light {\r\n      position: sticky;\r\n      top: 0;\r\n      z-index: 600;\r\n      background: rgba(0,0,0,0.4);\r\n      backdrop-filter: blur(14px);\r\n      -webkit-backdrop-filter: blur(14px);\r\n    }\r\n    html { scroll-behavior: smooth; }\r\n    button, [role=button] { -webkit-tap-highlight-color: transparent; }';
c = c.replace(cssAnchor, cssAnchor + cssAddition);
console.log('✓ Global CSS added');

// ─────────────────────────────────────────────────────────────────
// 2. STICKY HEADERS – 6 dark views with gap:'14px' pattern
// ─────────────────────────────────────────────────────────────────
const oldTopBarDark = `<div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>`;
const newTopBarDark = `<div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>`;
let replCount = 0;
while(c.indexOf(oldTopBarDark)!==-1){
  c = c.replace(oldTopBarDark, newTopBarDark);
  replCount++;
}
if(replCount===0){console.log('✗ dark top-bar not found');process.exit(1);}
console.log(`✓ Replaced ${replCount} dark top-bar headers (sticky)`);

// ─────────────────────────────────────────────────────────────────
// 3. STICKY HEADER – trainer/admin dashboard
// ─────────────────────────────────────────────────────────────────
const oldTrainerBar = `<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:isMobile?'16px 0 20px':'22px 0 30px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:isMobile?'24px':'32px'}}>`;
const newTrainerBar = `<div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 32px'}}>`;
if(c.indexOf(oldTrainerBar)===-1){console.log('✗ trainer top-bar not found');process.exit(1);}
c = c.replace(oldTrainerBar, newTrainerBar);
console.log('✓ Trainer dashboard top-bar sticky');

// ─────────────────────────────────────────────────────────────────
// 4. STICKY HEADER – parent/youth dashboard
// ─────────────────────────────────────────────────────────────────
const oldParentBar = `<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:isMobile?'16px 0 20px':'22px 0 24px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:isMobile?'22px':'28px'}}>`;
const newParentBar = `<div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 22px':'0 -24px 28px'}}>`;
if(c.indexOf(oldParentBar)===-1){console.log('✗ parent top-bar not found');process.exit(1);}
c = c.replace(oldParentBar, newParentBar);
console.log('✓ Parent/youth dashboard top-bar sticky');

// ─────────────────────────────────────────────────────────────────
// 5. STICKY HEADER – archive view
// ─────────────────────────────────────────────────────────────────
const oldArchiveBar = `<div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>`;
const newArchiveBar = `<div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>`;
if(c.indexOf(oldArchiveBar)===-1){console.log('✗ archive header not found');process.exit(1);}
c = c.replace(oldArchiveBar, newArchiveBar);
console.log('✓ Archive view header sticky');

// ─────────────────────────────────────────────────────────────────
// 6. REMOVE BOTTOM NAV – trainer/admin dashboard
// ─────────────────────────────────────────────────────────────────
const oldNav1 = `        {isMobile && <MobileBottomNav view={view} navTo={navTo} userRole={userRole} canEdit={canEdit} appSettings={appSettings} unreadCount={unreadCount}/>}\r\n`;
if(c.indexOf(oldNav1)===-1){console.log('✗ Bottom nav 1 (trainer) not found');process.exit(1);}
c = c.replace(oldNav1, '');
console.log('✓ Bottom nav removed from trainer/admin dashboard');

// ─────────────────────────────────────────────────────────────────
// 7. REMOVE BOTTOM NAV – parent/youth dashboard
// ─────────────────────────────────────────────────────────────────
const oldNav2 = `        {isMobile && <MobileBottomNav view={view} navTo={navTo} userRole={userRole} canEdit={canEdit} appSettings={appSettings} unreadCount={0}/>}\r\n`;
if(c.indexOf(oldNav2)===-1){console.log('✗ Bottom nav 2 (parent) not found');process.exit(1);}
c = c.replace(oldNav2, '');
console.log('✓ Bottom nav removed from parent/youth dashboard');

// ─────────────────────────────────────────────────────────────────
// 8. FIX BOTTOM PADDING (was 90/100px for nav, now 40px)
// ─────────────────────────────────────────────────────────────────
let padReplaced = 0;
const padFixes = [
  ["padding:isMobile?'0 14px 90px'", "padding:isMobile?'0 14px 40px'"],
  ["padding:isMobile?'0 14px 100px'", "padding:isMobile?'0 14px 40px'"],
  ["padding:isMobile?'0 16px 90px'", "padding:isMobile?'0 16px 40px'"],
  ["padding:isMobile?'0 14px 80px'", "padding:isMobile?'0 14px 40px'"],
  ["padding:'0 0 100px'", "padding:'0 0 40px'"],
];
for(const [o,n] of padFixes){
  while(c.indexOf(o)!==-1){ c = c.replace(o,n); padReplaced++; }
}
console.log(`✓ Bottom padding reduced (${padReplaced} replacements)`);

// ─────────────────────────────────────────────────────────────────
// 9. MOBILE: PT form max-width
// ─────────────────────────────────────────────────────────────────
const ptFormOld = "maxWidth:'420px',margin:'0 auto'";
if(c.indexOf(ptFormOld)!==-1){
  c = c.replace(ptFormOld, "maxWidth:isMobile?'100%':'420px',margin:'0 auto'");
  console.log('✓ PT form full-width on mobile');
}

// ─────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync(appPath, c, 'utf8');
console.log('Done. File saved.');
