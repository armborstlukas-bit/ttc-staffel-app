const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
let n = 0;

function rep(from, to, label) {
  const idx = c.indexOf(from);
  if (idx === -1) { console.log('✗ ' + label); return; }
  c = c.slice(0, idx) + to + c.slice(idx + from.length);
  n++; console.log('✓ ' + label);
}

const R = '\r\n';

rep(
  'absent_unexcused: { label: \'Fehlt unentschuldigt\', color: \'#6b7280\', bg: \'#f3f4f6\', symbol: \'–\' },' + R + '  absent_excused:   { label: \'Fehlt entschuldigt\',   color: \'#d97706\', bg: \'#fef3c7\', symbol: \'~\' },',
  'absent_unexcused: { label: \'Fehlt unentschuldigt\', color: \'#ef4444\', bg: \'#fee2e2\', symbol: \'–\' },' + R + '  absent_excused:   { label: \'Fehlt entschuldigt\',   color: \'#94a3b8\', bg: \'#f1f5f9\', symbol: \'~\' },',
  'STATUS_CONFIG'
);

rep(
  'absent_unexcused: { label:\'Unentschuldigt\',color:\'#6b7280\',bg:\'#f3f4f6\', symbol:\'–\'  },' + R + '      absent_excused:   { label:\'Entschuldigt\', color:\'#d97706\', bg:\'#fef3c7\', symbol:\'⏰\' },',
  'absent_unexcused: { label:\'Unentschuldigt\',color:\'#ef4444\',bg:\'#fee2e2\', symbol:\'–\'  },' + R + '      absent_excused:   { label:\'Entschuldigt\', color:\'#94a3b8\', bg:\'#f1f5f9\', symbol:\'⏰\' },',
  'Admin attCfg'
);

rep(
  "{k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#6b7280', border:'#9ca3af'}," + R + "                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#d97706', border:'#d97706'},",
  "{k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#ef4444', border:'#fca5a5'}," + R + "                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#64748b', border:'#94a3b8'},",
  'Admin buttons'
);

rep(
  "{label:'Unentsch.',value:stats.unexcused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'}," + R + "                      {label:'Entsch.',value:stats.excused,color:'#fde68a',bg:'rgba(253,230,138,0.1)'},",
  "{label:'Unentsch.',value:stats.unexcused,color:'#f87171',bg:'rgba(239,68,68,0.1)'}," + R + "                      {label:'Entsch.',value:stats.excused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},",
  'parent stat boxes'
);

rep(
  "statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(253,230,138,0.07)':status==='absent_unexcused'?'rgba(248,113,113,0.07)':'rgba(255,255,255,0.03)';" + R + "                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(253,230,138,0.15)':status==='absent_unexcused'?'rgba(248,113,113,0.15)':'rgba(255,255,255,0.07)';",
  "statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(148,163,184,0.07)':status==='absent_unexcused'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.03)';" + R + "                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.18)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.07)';",
  'parent row colors'
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('Done: ' + n + '/5');
