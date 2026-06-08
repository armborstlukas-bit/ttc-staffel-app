// Script 2: Overhaul Gefahrenzone with multi-select
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');
const R = '\r\n';

// 1. Add dangerSelections state after resetError state
const stateOld = "  const [resetError, setResetError]             = useState('');"+R;
const stateNew = stateOld +
  "  const [dangerSelections, setDangerSelections]         = useState({});"+R;
if(c.indexOf(stateOld)===-1){console.log('✗ resetError state not found');process.exit(1);}
c = c.replace(stateOld, stateNew);
console.log('✓ Added dangerSelections state');

// 2. Replace the Gefahrenzone block
const oldStart = '\n        {/* Gefahrenzone */}';
const oldEnd = '\n        {/* ── Mannschaften';
const startIdx = c.indexOf(oldStart);
const endIdx = c.indexOf(oldEnd, startIdx);
if(startIdx===-1||endIdx===-1){console.log('✗ Gefahrenzone block not found');process.exit(1);}

const newZone = `
        {/* Gefahrenzone */}
        <div style={{...s.card,border:'2px solid #fca5a5',background:'#fff5f5'}}>
          <h2 style={{margin:'0 0 4px',color:'#dc2626',fontSize:'18px'}}>⚠️ Gefahrenzone</h2>
          <p style={{margin:'0 0 16px',color:'#888',fontSize:'12px'}}>Wähle die Datenbereiche aus, die du löschen möchtest.</p>
          {(()=>{
            const cats = [
              {id:'attendance',  label:'Anwesenheitsdaten',          desc:'Alle Anwesenheiten aller Kinder + Trainingsdaten in Untergruppen', icon:'📋', needsPw:true},
              {id:'sessions',    label:'Trainingseinheiten (aktiv)',  desc:'Alle geplanten und laufenden Einheiten', icon:'🏋️'},
              {id:'tournaments', label:'Turniere (aktiv)',            desc:'Alle laufenden Turniere', icon:'🏆'},
              {id:'practiceT',   label:'Übungswettkämpfe (aktiv)',   desc:'Alle laufenden Übungswettkämpfe', icon:'🎮'},
              {id:'messages',    label:'Trainer-Nachrichten',         desc:'Alle manuell gesendeten Nachrichten', icon:'💬'},
              {id:'archSessions',label:'Archiv Training',             desc:'Alle archivierten Trainingseinheiten', icon:'📦'},
              {id:'archTourneys',label:'Archiv Turniere',             desc:'Alle archivierten Turniere', icon:'📦'},
              {id:'archPT',      label:'Archiv Übungswettkämpfe',    desc:'Alle archivierten Übungswettkämpfe', icon:'📦'},
            ];
            const sel = dangerSelections;
            const allSel = cats.every(c=>sel[c.id]);
            const anySel = cats.some(c=>sel[c.id]);
            const toggle = id => setDangerSelections(p=>({...p,[id]:!p[id]}));
            const selectAll = () => setDangerSelections(Object.fromEntries(cats.map(c=>[c.id,true])));
            const selectNone = () => setDangerSelections({});
            const handleDelete = () => {
              const selected = cats.filter(c=>sel[c.id]);
              if(selected.length===0) return;
              const nonPw = selected.filter(c=>!c.needsPw);
              const hasPw = selected.some(c=>c.needsPw);
              const labels = selected.map(c=>c.label).join(', ');
              if(nonPw.length>0){
                if(!window.confirm(\`Folgende Daten werden unwiderruflich gelöscht:\\n\\n\${nonPw.map(c=>c.label).join('\\n')}\\n\\nFortfahren?\`)) return;
                nonPw.forEach(cat=>{
                  if(cat.id==='sessions')     saveSessions({});
                  if(cat.id==='tournaments')  saveTournaments({});
                  if(cat.id==='practiceT')    savePracticeTournaments({});
                  if(cat.id==='messages'){
                    const u={};
                    Object.values(notifications).forEach(n=>{if(n.type!=='trainer_message')u[n.id]=n;});
                    saveNotifications(u);
                  }
                  if(cat.id==='archSessions')  saveArchivedSessions({});
                  if(cat.id==='archTourneys')  saveArchivedTournaments({});
                  if(cat.id==='archPT')        saveArchivedPracticeTournaments({});
                });
                setDangerSelections(p=>{const n={...p};nonPw.forEach(c=>{delete n[c.id];});return n;});
              }
              if(hasPw){ setResetDialog(true); }
            };
            return (
              <div>
                <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                  <button onClick={selectAll} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'700',borderRadius:'7px',border:'1px solid #fca5a5',background:allSel?'#fca5a5':'white',color:allSel?'white':'#dc2626',cursor:'pointer'}}>
                    Alle auswählen
                  </button>
                  <button onClick={selectNone} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'700',borderRadius:'7px',border:'1px solid #e5e7eb',background:'white',color:'#6b7280',cursor:'pointer'}}>
                    Keine
                  </button>
                </div>
                <div style={{display:'grid',gap:'6px',marginBottom:'16px'}}>
                  {cats.map(cat=>(
                    <label key={cat.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 12px',background:sel[cat.id]?'#fee2e2':'#fafafa',border:\`1px solid \${sel[cat.id]?'#fca5a5':'#e5e7eb'}\`,borderRadius:'10px',cursor:'pointer',transition:'all 0.1s'}}
                      onClick={()=>toggle(cat.id)}>
                      <div style={{width:'18px',height:'18px',borderRadius:'4px',border:\`2px solid \${sel[cat.id]?'#dc2626':'#d1d5db'}\`,background:sel[cat.id]?'#dc2626':'white',flexShrink:0,marginTop:'1px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {sel[cat.id]&&<span style={{color:'white',fontSize:'12px',lineHeight:1,fontWeight:'900'}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                          <span style={{fontSize:'13px'}}>{cat.icon}</span>
                          <span style={{fontWeight:'700',fontSize:'13px',color:'#1f2937'}}>{cat.label}</span>
                          {cat.needsPw&&<span style={{fontSize:'10px',background:'#fef3c7',color:'#92400e',padding:'1px 5px',borderRadius:'4px',fontWeight:'600'}}>Passwort</span>}
                        </div>
                        <p style={{margin:'2px 0 0',fontSize:'11px',color:'#9ca3af'}}>{cat.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleDelete}
                  disabled={!anySel}
                  style={{width:'100%',padding:'12px',background:anySel?'#dc2626':'#e5e7eb',color:anySel?'white':'#9ca3af',border:'none',borderRadius:'10px',cursor:anySel?'pointer':'not-allowed',fontWeight:'700',fontSize:'14px',transition:'all 0.2s'}}>
                  🗑️ {anySel ? \`\${cats.filter(c=>sel[c.id]).length} Bereich\${cats.filter(c=>sel[c.id]).length!==1?'e':''} löschen\` : 'Keine Auswahl'}
                </button>
              </div>
            );
          })()}
        </div>
\r`;

c = c.slice(0, startIdx) + newZone + c.slice(endIdx);
console.log('✓ Gefahrenzone replaced');

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
