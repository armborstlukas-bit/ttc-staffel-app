const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let c = fs.readFileSync(appPath, 'utf8');
let count = 0;

function rep(from, to, label) {
  if (c.indexOf(from) === -1) { console.warn('NOT FOUND: ' + label); return; }
  c = c.replace(from, to);
  count++;
  console.log('✓ ' + label);
}

// ── 1. STATUS_CONFIG (global, line ~76) ──────────────────────────────────────
rep(
  `  absent_unexcused: { label: 'Fehlt unentschuldigt', color: '#6b7280', bg: '#f3f4f6', symbol: '–' },
  absent_excused:   { label: 'Fehlt entschuldigt',   color: '#d97706', bg: '#fef3c7', symbol: '~' },`,
  `  absent_unexcused: { label: 'Fehlt unentschuldigt', color: '#ef4444', bg: '#fee2e2', symbol: '–' },
  absent_excused:   { label: 'Fehlt entschuldigt',   color: '#94a3b8', bg: '#f1f5f9', symbol: '~' },`,
  'STATUS_CONFIG global'
);

// ── 2. Admin attCfg (line ~4613) ─────────────────────────────────────────────
rep(
  `      absent_unexcused: { label:'Unentschuldigt',color:'#6b7280',bg:'#f3f4f6', symbol:'–'  },
      absent_excused:   { label:'Entschuldigt', color:'#d97706', bg:'#fef3c7', symbol:'⏰' },`,
  `      absent_unexcused: { label:'Unentschuldigt',color:'#ef4444',bg:'#fee2e2', symbol:'–'  },
      absent_excused:   { label:'Entschuldigt', color:'#94a3b8', bg:'#f1f5f9', symbol:'⏰' },`,
  'Admin attCfg'
);

// ── 3. Admin archive buttons (line ~4744) ────────────────────────────────────
rep(
  `                                        {k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#6b7280', border:'#9ca3af'},
                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#d97706', border:'#d97706'},`,
  `                                        {k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#ef4444', border:'#fca5a5'},
                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#64748b', border:'#94a3b8'},`,
  'Admin archive buttons'
);

// ── 4. sessionAttendance – stat boxes ────────────────────────────────────────
rep(
  `              {label:'Unentsch.',value:absentCount,color:'rgba(255,255,255,0.5)',bg:'rgba(255,255,255,0.06)',border:'rgba(255,255,255,0.1)'},
              {label:'Entsch.',value:excusedCount,color:'#fde68a',bg:'rgba(253,230,138,0.08)',border:'rgba(253,230,138,0.2)'},`,
  `              {label:'Unentsch.',value:absentCount,color:'#f87171',bg:'rgba(239,68,68,0.09)',border:'rgba(239,68,68,0.22)'},
              {label:'Entsch.',value:excusedCount,color:'#94a3b8',bg:'rgba(148,163,184,0.08)',border:'rgba(148,163,184,0.2)'},`,
  'sessionAttendance stat boxes'
);

// ── 5. sessionAttendance – unexcused big button ───────────────────────────────
rep(
  `style={{width:'48px',height:'48px',border:\`2px solid \${status==='absent_unexcused'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.12)'}\`,background:status==='absent_unexcused'?'rgba(107,114,128,0.7)':'rgba(255,255,255,0.05)',color:status==='absent_unexcused'?'white':'rgba(255,255,255,0.35)',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',transition:'all 0.12s'}}>`,
  `style={{width:'48px',height:'48px',border:\`2px solid \${status==='absent_unexcused'?'#ef4444':'rgba(239,68,68,0.2)'}\`,background:status==='absent_unexcused'?'rgba(220,38,38,0.8)':'rgba(239,68,68,0.06)',color:status==='absent_unexcused'?'white':'#f87171',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',transition:'all 0.12s'}}>`,
  'sessionAttendance unexcused button'
);

// ── 6. sessionAttendance – excused big button ─────────────────────────────────
rep(
  `style={{width:'48px',height:'48px',border:\`2px solid \${status==='absent_excused'?'#d97706':'rgba(253,230,138,0.2)'}\`,background:status==='absent_excused'?'rgba(217,119,6,0.8)':'rgba(253,230,138,0.06)',color:status==='absent_excused'?'white':'#fde68a',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>`,
  `style={{width:'48px',height:'48px',border:\`2px solid \${status==='absent_excused'?'#64748b':'rgba(148,163,184,0.2)'}\`,background:status==='absent_excused'?'rgba(71,85,105,0.85)':'rgba(148,163,184,0.06)',color:status==='absent_excused'?'white':'#94a3b8',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>`,
  'sessionAttendance excused button'
);

// ── 7. sessionAttendance – Legende ────────────────────────────────────────────
rep(
  `            <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>– Unentschuldigt</span>
            <span style={{fontSize:'12px',color:'#fde68a',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigt</span>`,
  `            <span style={{fontSize:'12px',color:'#f87171',fontWeight:'600'}}>– Unentschuldigt</span>
            <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigt</span>`,
  'sessionAttendance Legende'
);

// ── 8. sessionAttendance – card border/bg for excused ────────────────────────
rep(
  `const cardBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_unexcused'?'rgba(255,255,255,0.04)':status==='absent_excused'?'rgba(253,230,138,0.06)':'rgba(255,255,255,0.03)';
                const cardBorder = status==='present'?'rgba(74,222,128,0.25)':status==='absent_unexcused'?'rgba(255,255,255,0.1)':status==='absent_excused'?'rgba(253,230,138,0.2)':parentExcused?'rgba(253,230,138,0.3)':parentComing?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.07)';`,
  `const cardBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_unexcused'?'rgba(239,68,68,0.07)':status==='absent_excused'?'rgba(148,163,184,0.07)':'rgba(255,255,255,0.03)';
                const cardBorder = status==='present'?'rgba(74,222,128,0.25)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':status==='absent_excused'?'rgba(148,163,184,0.25)':parentExcused?'rgba(148,163,184,0.3)':parentComing?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.07)';`,
  'sessionAttendance card colors'
);

// ── 9. sessionAttendance – parent excused badge (Eltern: abgemeldet) ─────────
rep(
  `{parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#fde68a',background:'rgba(253,230,138,0.12)',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(253,230,138,0.25)'}}>Eltern: abgemeldet</span>}`,
  `{parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#94a3b8',background:'rgba(148,163,184,0.12)',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(148,163,184,0.25)'}}>Eltern: abgemeldet</span>}`,
  'sessionAttendance parent-excused badge'
);

// ── 10. childHistory – stat box Unentsch. ────────────────────────────────────
rep(
  `{label:'Unentsch.',value:stats.unexcused,color:'rgba(255,255,255,0.45)',bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.08)'},
              {label:'Entsch.',value:stats.excused,color:'#fde68a',bg:'rgba(253,230,138,0.07)',border:'rgba(253,230,138,0.18)'},`,
  `{label:'Unentsch.',value:stats.unexcused,color:'#f87171',bg:'rgba(239,68,68,0.08)',border:'rgba(239,68,68,0.2)'},
              {label:'Entsch.',value:stats.excused,color:'#94a3b8',bg:'rgba(148,163,184,0.07)',border:'rgba(148,163,184,0.18)'},`,
  'childHistory stat boxes'
);

// ── 11. childHistory – history row bg/border ─────────────────────────────────
rep(
  `const rowBg=status==='present'?'rgba(74,222,128,0.07)':status==='absent_excused'?'rgba(253,230,138,0.06)':status==='absent_unexcused'?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.025)';
                const rowBorder=status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(253,230,138,0.15)':'rgba(255,255,255,0.07)';`,
  `const rowBg=status==='present'?'rgba(74,222,128,0.07)':status==='absent_excused'?'rgba(148,163,184,0.06)':status==='absent_unexcused'?'rgba(239,68,68,0.07)':'rgba(255,255,255,0.025)';
                const rowBorder=status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.15)':status==='absent_unexcused'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)';`,
  'childHistory row bg/border'
);

// ── 12. childHistory – small edit button: unexcused ──────────────────────────
rep(
  `<button onClick={()=>setChildStatus(date,'absent_unexcused')} style={{width:'34px',height:'34px',border:\`2px solid \${status==='absent_unexcused'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.1)'}\`,background:status==='absent_unexcused'?'rgba(107,114,128,0.6)':'rgba(255,255,255,0.04)',color:status==='absent_unexcused'?'white':'rgba(255,255,255,0.3)',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>–</button>`,
  `<button onClick={()=>setChildStatus(date,'absent_unexcused')} style={{width:'34px',height:'34px',border:\`2px solid \${status==='absent_unexcused'?'#ef4444':'rgba(239,68,68,0.2)'}\`,background:status==='absent_unexcused'?'rgba(220,38,38,0.75)':'rgba(239,68,68,0.06)',color:status==='absent_unexcused'?'white':'#f87171',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>–</button>`,
  'childHistory small unexcused button'
);

// ── 13. childHistory – small edit button: excused ────────────────────────────
rep(
  `<button onClick={()=>setChildStatus(date,'absent_excused')} style={{width:'34px',height:'34px',border:\`2px solid \${status==='absent_excused'?'#d97706':'rgba(253,230,138,0.2)'}\`,background:status==='absent_excused'?'rgba(217,119,6,0.7)':'rgba(253,230,138,0.05)',color:status==='absent_excused'?'white':'#fde68a',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Clock size={15}/></button>`,
  `<button onClick={()=>setChildStatus(date,'absent_excused')} style={{width:'34px',height:'34px',border:\`2px solid \${status==='absent_excused'?'#64748b':'rgba(148,163,184,0.2)'}\`,background:status==='absent_excused'?'rgba(71,85,105,0.8)':'rgba(148,163,184,0.05)',color:status==='absent_excused'?'white':'#94a3b8',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Clock size={15}/></button>`,
  'childHistory small excused button'
);

// ── 14. childHistory – manual date: unexcused button ─────────────────────────
rep(
  `<button onClick={()=>setChildStatus(trainingDate,'absent_unexcused')} style={{padding:'8px 12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>– Unentsch.</button>`,
  `<button onClick={()=>setChildStatus(trainingDate,'absent_unexcused')} style={{padding:'8px 12px',background:'rgba(239,68,68,0.09)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',color:'#f87171',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>– Unentsch.</button>`,
  'childHistory manual unexcused button'
);

// ── 15. childHistory – manual date: excused button ───────────────────────────
rep(
  `<button onClick={()=>setChildStatus(trainingDate,'absent_excused')} style={{padding:'8px 12px',background:'rgba(253,230,138,0.08)',border:'1px solid rgba(253,230,138,0.2)',borderRadius:'8px',color:'#fde68a',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Clock size={13}/> Entsch.</button>`,
  `<button onClick={()=>setChildStatus(trainingDate,'absent_excused')} style={{padding:'8px 12px',background:'rgba(148,163,184,0.09)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'8px',color:'#94a3b8',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Clock size={13}/> Entsch.</button>`,
  'childHistory manual excused button'
);

// ── 16. parent dashboard – stat boxes (Unentsch./Entsch.) ────────────────────
rep(
  `                      {label:'Unentsch.',value:stats.unexcused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},
                      {label:'Entsch.',value:stats.excused,color:'#fde68a',bg:'rgba(253,230,138,0.1)'},`,
  `                      {label:'Unentsch.',value:stats.unexcused,color:'#f87171',bg:'rgba(239,68,68,0.1)'},
                      {label:'Entsch.',value:stats.excused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},`,
  'parent dashboard stat boxes'
);

// ── 17. parent dashboard – row bg/border ────────────────────────────────────
rep(
  `const statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(253,230,138,0.07)':status==='absent_unexcused'?'rgba(248,113,113,0.07)':'rgba(255,255,255,0.03)';
                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(253,230,138,0.15)':status==='absent_unexcused'?'rgba(248,113,113,0.15)':'rgba(255,255,255,0.07)';`,
  `const statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(148,163,184,0.07)':status==='absent_unexcused'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.03)';
                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.18)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.07)';`,
  'parent dashboard row colors'
);

// ── 18. parent dashboard – "Entschuldigen" button ───────────────────────────
rep(
  `style={{padding:'6px 12px',background:'rgba(253,230,138,0.12)',border:'1px solid rgba(253,230,138,0.25)',borderRadius:'8px',cursor:'pointer',color:'#fde68a',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigen</button>`,
  `style={{padding:'6px 12px',background:'rgba(148,163,184,0.12)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'8px',cursor:'pointer',color:'#94a3b8',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigen</button>`,
  'parent dashboard Entschuldigen button'
);

// ── 19. parent dashboard – childHistory badge "Eltern abgemeldet" ────────────
rep(
  `{parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#fde68a',background:'rgba(253,230,138,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(253,230,138,0.2)'}}>Eltern abgemeldet</span>}`,
  `{parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#94a3b8',background:'rgba(148,163,184,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(148,163,184,0.2)'}}>Eltern abgemeldet</span>}`,
  'childHistory Eltern-abgemeldet badge'
);

// done
fs.writeFileSync(appPath, c, 'utf8');
console.log(`\nDone. ${count} replacements made.`);
