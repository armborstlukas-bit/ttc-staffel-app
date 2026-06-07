const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const ptViewsPath = path.join(__dirname, 'pt_views.jsx');

let c = fs.readFileSync(appPath, 'utf8');
const ptViews = fs.readFileSync(ptViewsPath, 'utf8');
const R = '\r\n';
let n = 0;

function rep(from, to, label) {
  const idx = c.indexOf(from);
  if (idx === -1) { console.log('✗ NOT FOUND: ' + label); return; }
  c = c.slice(0, idx) + to + c.slice(idx + from.length);
  n++; console.log('✓ ' + label);
}

// ── 1. STATE VARIABLES ────────────────────────────────────────────────────────
rep(
  '  const [showMdForm, setShowMdForm]                         = useState(false);',
  '  const [showMdForm, setShowMdForm]                         = useState(false);' + R +
  '  // Practice Tournaments' + R +
  '  const [practiceTournaments, setPracticeTournaments]               = useState({});' + R +
  '  const [archivedPracticeTournaments, setArchivedPracticeTournaments] = useState({});' + R +
  '  const [activePracticeId, setActivePracticeId]                     = useState(null);' + R +
  '  const [ptCreating, setPtCreating]                                 = useState(false);' + R +
  '  const [ptCreateStep, setPtCreateStep]                             = useState(1);' + R +
  '  const [ptCreateForm, setPtCreateForm]                             = useState({type:\'4er_gruppe\',winSets:2,setLength:11,deciderLength:7,trackSetScores:false});' + R +
  '  const [ptSelectedChildren, setPtSelectedChildren]                 = useState([]);' + R +
  '  const [ptSubgroupFilter, setPtSubgroupFilter]                     = useState(\'all\');' + R +
  '  const [ptMatchEditing, setPtMatchEditing]                         = useState(null);' + R +
  '  const [ptMatchDraft, setPtMatchDraft]                             = useState(null);',
  'State: Practice Tournaments'
);

// ── 2. FIREBASE LISTENERS ─────────────────────────────────────────────────────
rep(
  "      onSnapshot(doc(db,'ttc','appSettings'),        s => setAppSettings(s.exists()?{mannschaftEnabled:true,...s.data()}:{mannschaftEnabled:true})),",
  "      onSnapshot(doc(db,'ttc','appSettings'),        s => setAppSettings(s.exists()?{mannschaftEnabled:true,...s.data()}:{mannschaftEnabled:true}))," + R +
  "      onSnapshot(doc(db,'ttc','practiceTournaments'),          s => setPracticeTournaments(s.exists()?s.data():{}))," + R +
  "      onSnapshot(doc(db,'ttc','archivedPracticeTournaments'),  s => setArchivedPracticeTournaments(s.exists()?s.data():{})),",
  'Firebase: PT listeners'
);

// ── 3. SAVE FUNCTIONS ─────────────────────────────────────────────────────────
rep(
  "  const saveAppSettings        = u => { setAppSettings(u);        setDoc(doc(db,'ttc','appSettings'),        u); };",
  "  const saveAppSettings                  = u => { setAppSettings(u);                  setDoc(doc(db,'ttc','appSettings'),                  u); };" + R +
  "  const savePracticeTournaments          = u => { setPracticeTournaments(u);          setDoc(doc(db,'ttc','practiceTournaments'),          u); };" + R +
  "  const saveArchivedPracticeTournaments  = u => { setArchivedPracticeTournaments(u);  setDoc(doc(db,'ttc','archivedPracticeTournaments'),  u); };",
  'Save: PT functions'
);

// ── 4. SCHNELLZUGRIFF CARD ────────────────────────────────────────────────────
rep(
  "      {label:'Trainingsplan',    icon:'📅', color:'#86efac', bg:'rgba(134,239,172,0.1)',  border:'rgba(134,239,172,0.25)', action:()=>navTo('trainingsplan')},",
  "      {label:'Übungswettkämpfe',icon:'🎮', color:'#c4b5fd', bg:'rgba(196,181,253,0.1)',  border:'rgba(196,181,253,0.25)', action:()=>navTo('practiceTournaments')}," + R +
  "      {label:'Trainingsplan',    icon:'📅', color:'#86efac', bg:'rgba(134,239,172,0.1)',  border:'rgba(134,239,172,0.25)', action:()=>navTo('trainingsplan')},",
  'Schnellzugriff: PT card'
);

// ── 5. NEW VIEWS (before archiv view) ─────────────────────────────────────────
rep(
  "  if (view === 'archiv') {",
  ptViews + R + "  if (view === 'archiv') {",
  'Views: PT views inserted'
);

// ── 6. ARCHIVE TAB: Add practiceTournaments tab ──────────────────────────────
rep(
  "[['sessions','🏋️ Archiv Training'],['tournaments','🏆 Archiv Turniere']]",
  "[['sessions','🏋️ Archiv Training'],['tournaments','🏆 Archiv Turniere'],['practiceTournaments','🎮 Übungswettkämpfe']]",
  'Archive: Add PT tab'
);

// ── 7. ARCHIVE CONTENT: PT tab section ───────────────────────────────────────
// Find end of tournaments tab section and add PT section before closing divs
const ptArchiveContent = R +
  "          {/* ── ÜBUNGSWETTKÄMPFE TAB ── */" + R +
  "          {archiveTab==='practiceTournaments' && (() => {" + R +
  "            const sortedPTs = Object.values(archivedPracticeTournaments).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));" + R +
  "            const placeEmoji = ['🥇','🥈','🥉','4️⃣'];" + R +
  "            return (" + R +
  "              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>" + R +
  "                {sortedPTs.length===0 && <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>Noch keine archivierten Übungswettkämpfe.</div>}" + R +
  "                {sortedPTs.map(pt=>{" + R +
  "                  const fs2 = pt.finalStandings||[];" + R +
  "                  return (" + R +
  "                    <div key={pt.id} style={{background:'rgba(167,139,250,0.06)',borderRadius:'16px',padding:'16px',border:'1px solid rgba(167,139,250,0.2)'}}>" + R +
  "                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'12px'}}>" + R +
  "                        <div>" + R +
  "                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>" + R +
  "                            <span style={{fontSize:'18px'}}>🎯</span>" + R +
  "                            <span style={{fontWeight:'800',color:'white',fontSize:'16px'}}>4er Gruppe</span>" + R +
  "                          </div>" + R +
  "                          <p style={{margin:0,fontSize:'12px',color:'rgba(167,139,250,0.6)'}}>" + R +
  "                            {new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.createdBy}" + R +
  "                          </p>" + R +
  "                          <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{pt.settings.winSets} Gewinnsätze · {pt.settings.setLength}/{pt.settings.deciderLength}</p>" + R +
  "                        </div>" + R +
  "                      </div>" + R +
  "                      <div style={{display:'grid',gap:'5px'}}>" + R +
  "                        {fs2.map(s=>(" + R +
  "                          <div key={s.childId} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.07)'}}>" + R +
  "                            <span style={{fontSize:'20px',flexShrink:0}}>{placeEmoji[s.place-1]||`${s.place}.`}</span>" + R +
  "                            <div style={{flex:1}}>" + R +
  "                              <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'14px'}}>{s.name}</p>" + R +
  "                              <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}{pt.settings.trackSetScores?` · Punkte ${s.ptsWon}:${s.ptsLost}`:''}</p>" + R +
  "                            </div>" + R +
  "                          </div>" + R +
  "                        ))}" + R +
  "                      </div>" + R +
  "                    </div>" + R +
  "                  );" + R +
  "                })}" + R +
  "              </div>" + R +
  "            );" + R +
  "          })()}" + R;

rep(
  "        </div>" + R + "      </div>" + R + "      </>" + R + "    );" + R + "  }" + R + "}",
  ptArchiveContent + "        </div>" + R + "      </div>" + R + "      </>" + R + "    );" + R + "  }" + R + "}",
  'Archive: PT tab content'
);

// ── 8. CHILDHISTORY: PT section ───────────────────────────────────────────────
const ptChildSection =
  "          {/* Trainingswettkämpfe im Kind-Profil */" + R +
  "          {(()=>{" + R +
  "            const placeEmojiCH=['🥇','🥈','🥉','4️⃣'];" + R +
  "            const childPTs=Object.values(archivedPracticeTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id)).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));" + R +
  "            if(childPTs.length===0) return null;" + R +
  "            return (<div style={{marginBottom:'20px'}}>" + R +
  "              <h3 style={{margin:'0 0 12px',color:'white',fontSize:'16px',fontWeight:'800'}}>🎮 Trainingswettkämpfe</h3>" + R +
  "              <div style={{display:'grid',gap:'7px'}}>" + R +
  "                {childPTs.map(pt=>{" + R +
  "                  const fs3=(pt.finalStandings||[]).find(s=>s.childId===child.id);" + R +
  "                  if(!fs3) return null;" + R +
  "                  const opps=pt.players.filter(p=>p.childId!==child.id).map(p=>p.name);" + R +
  "                  return(<div key={pt.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'12px'}}>" + R +
  "                    <span style={{fontSize:'22px',flexShrink:0}}>{placeEmojiCH[fs3.place-1]||`${fs3.place}.`}</span>" + R +
  "                    <div style={{flex:1,minWidth:0}}>" + R +
  "                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>" + R +
  "                        <span style={{fontWeight:'800',color:'white',fontSize:'14px'}}>Platz {fs3.place}</span>" + R +
  "                        <span style={{fontSize:'11px',color:'rgba(167,139,250,0.7)',fontWeight:'600'}}>4er Gruppe</span>" + R +
  "                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>" + R +
  "                      </div>" + R +
  "                      <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>vs. {opps.join(', ')} · {fs3.wins}S {fs3.losses}N · Sätze {fs3.setsWon}:{fs3.setsLost}</p>" + R +
  "                    </div>" + R +
  "                  </div>);" + R +
  "                })}" + R +
  "              </div>" + R +
  "            </div>);" + R +
  "          })()} ";

// Insert before the manual date entry section in childHistory
rep(
  "          {/* Manuell hinzufügen */}" + R + "          {canEdit()&&(",
  ptChildSection + R + "          {/* Manuell hinzufügen */}" + R + "          {canEdit()&&(",
  'childHistory: PT section'
);

fs.writeFileSync(appPath, c, 'utf8');
console.log(`\n✅ Done. ${n}/9 replacements made.`);
