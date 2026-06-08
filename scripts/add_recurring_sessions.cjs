// Add recurring (Dauer) sessions feature
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

// ─────────────────────────────────────────────────────────────────
// 1. emptySession – add isRecurring field
// ─────────────────────────────────────────────────────────────────
const oldEmpty = "const emptySession = { subgroupIds: [], date: new Date().toISOString().split('T')[0], time: '17:00', trainer: '', info: '', repeat: false, repeatWeeks: 8 };";
const newEmpty = "const emptySession = { subgroupIds: [], date: new Date().toISOString().split('T')[0], time: '17:00', trainer: '', info: '', repeat: false, repeatWeeks: 8, isRecurring: false };";
if(c.indexOf(oldEmpty)===-1){console.log('X emptySession not found');process.exit(1);}
c = c.replace(oldEmpty, newEmpty);
console.log('1 emptySession updated');

// ─────────────────────────────────────────────────────────────────
// 2. Add recurringTemplates state after newSession state
// ─────────────────────────────────────────────────────────────────
const oldState = "  const [newSession, setNewSession]             = useState(emptySession);";
const newState = "  const [newSession, setNewSession]             = useState(emptySession);\n  const [recurringTemplates, setRecurringTemplates] = useState({});";
if(c.indexOf(oldState)===-1){console.log('X newSession state not found');process.exit(1);}
c = c.replace(oldState, newState);
console.log('2 recurringTemplates state added');

// ─────────────────────────────────────────────────────────────────
// 3. Add Firestore listener for recurringTemplates
// ─────────────────────────────────────────────────────────────────
const oldSnap = "      onSnapshot(doc(db,'ttc','sessions'),           s => setSessions(s.exists()?s.data():{})),";
const newSnap = "      onSnapshot(doc(db,'ttc','sessions'),           s => setSessions(s.exists()?s.data():{})),\n      onSnapshot(doc(db,'ttc','recurringTemplates'),  s => setRecurringTemplates(s.exists()?s.data():{})),";
if(c.indexOf(oldSnap)===-1){console.log('X sessions snapshot not found');process.exit(1);}
c = c.replace(oldSnap, newSnap);
console.log('3 Firestore listener added');

// ─────────────────────────────────────────────────────────────────
// 4. Add saveRecurringTemplates function after saveSessions
// ─────────────────────────────────────────────────────────────────
const oldSaveSess = "  const saveSessions           = u => { setSessions(u);           setDoc(doc(db,'ttc','sessions'),           u); };";
const newSaveSess = "  const saveSessions           = u => { setSessions(u);           setDoc(doc(db,'ttc','sessions'),           u); };\n  const saveRecurringTemplates = u => { setRecurringTemplates(u); setDoc(doc(db,'ttc','recurringTemplates'),  u); };";
if(c.indexOf(oldSaveSess)===-1){console.log('X saveSessions not found');process.exit(1);}
c = c.replace(oldSaveSess, newSaveSess);
console.log('4 saveRecurringTemplates added');

// ─────────────────────────────────────────────────────────────────
// 5. Add materializeRecurringSessions helper + useEffect
// ─────────────────────────────────────────────────────────────────
const oldCreateSessComment = "  // ── Training anlegen ─────────────────────────────────────────";

if(c.indexOf(oldCreateSessComment)===-1){
  // try without the dashes (in case the comment is different)
  console.log('X Training anlegen comment not found');
  // show what we have near "createSession"
  const idx = c.indexOf('const createSession');
  if(idx>0) console.log('Context:', JSON.stringify(c.slice(idx-100,idx)));
  process.exit(1);
}

const insertBefore = oldCreateSessComment;
const materializeCode = [
  "  // ── Dauereinheiten materialisieren ─────────────────────────────────────",
  "  const materializeRecurringSessions = (templates, currentSessions) => {",
  "    const today = new Date(); today.setHours(0,0,0,0);",
  "    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 28);",
  "    const updated = {...currentSessions};",
  "    let changed = false;",
  "    Object.values(templates).forEach(tmpl => {",
  "      const start = new Date(today);",
  "      const diff = (tmpl.dayOfWeek - start.getDay() + 7) % 7;",
  "      start.setDate(start.getDate() + diff);",
  "      const cur = new Date(start);",
  "      while(cur <= horizon) {",
  "        const dateStr = cur.toISOString().split('T')[0];",
  "        const exists = Object.values(currentSessions).some(s => s.templateId === tmpl.id && s.date === dateStr);",
  "        if(!exists) {",
  "          const id = 'session_rt_' + tmpl.id + '_' + dateStr;",
  "          updated[id] = { id, subgroupIds: tmpl.subgroupIds, date: dateStr, time: tmpl.time, trainer: tmpl.trainer, info: tmpl.info, templateId: tmpl.id, repeatId: null, responses: {} };",
  "          changed = true;",
  "        }",
  "        cur.setDate(cur.getDate() + 7);",
  "      }",
  "    });",
  "    if(changed) saveSessions(updated);",
  "  };",
  "",
  "  // Run materialization when templates change",
  "  useEffect(() => {",
  "    if(Object.keys(recurringTemplates).length > 0) {",
  "      materializeRecurringSessions(recurringTemplates, sessions);",
  "    }",
  "  // eslint-disable-next-line react-hooks/exhaustive-deps",
  "  }, [recurringTemplates]);",
  ""
].join('\n');

c = c.replace(insertBefore, materializeCode + '\n' + insertBefore);
console.log('5 materializeRecurringSessions + useEffect added');

// ─────────────────────────────────────────────────────────────────
// 6. Modify createSession to handle isRecurring
// ─────────────────────────────────────────────────────────────────
const oldCreate = [
  "  const createSession = () => {",
  "    const { subgroupIds, date, time, trainer, info, repeat, repeatWeeks } = newSession;",
  "    if (!date || !time || subgroupIds.length===0) { alert('Bitte mindestens eine Untergruppe auswählen!'); return; }",
  "    const updated = { ...sessions };",
  "    const repeatId = repeat ? 'repeat_' + Date.now() : null;",
  "    if (repeat) {",
  "      for (let i=0; i<repeatWeeks; i++) {",
  "        const d = new Date(date+'T12:00:00');",
  "        d.setDate(d.getDate()+i*7);",
  "        const dateStr = d.toISOString().split('T')[0];",
  "        const id = 'session_'+Date.now()+'_'+i;",
  "        updated[id] = { id, subgroupIds, date:dateStr, time, trainer, info, repeatId, responses:{} };",
  "      }",
  "    } else {",
  "      const id = 'session_'+Date.now();",
  "      updated[id] = { id, subgroupIds, date, time, trainer, info, repeatId:null, responses:{} };",
  "    }",
  "    saveSessions(updated);",
  "    setNewSession(emptySession);",
  "  };"
].join('\r\n');

const newCreate = [
  "  const createSession = () => {",
  "    const { subgroupIds, date, time, trainer, info, repeat, repeatWeeks, isRecurring } = newSession;",
  "    if (!time || subgroupIds.length===0) { alert('Bitte mindestens eine Untergruppe auswählen!'); return; }",
  "    if (!isRecurring && !date) { alert('Bitte ein Datum auswählen!'); return; }",
  "",
  "    if (isRecurring) {",
  "      const dayOfWeek = new Date(date+'T12:00:00').getDay();",
  "      const id = 'rt_' + Date.now();",
  "      const tmpl = { id, subgroupIds, dayOfWeek, time, trainer, info, startDate: date, createdAt: new Date().toISOString() };",
  "      const updatedTemplates = { ...recurringTemplates, [id]: tmpl };",
  "      saveRecurringTemplates(updatedTemplates);",
  "      materializeRecurringSessions(updatedTemplates, sessions);",
  "      setNewSession(emptySession);",
  "      return;",
  "    }",
  "",
  "    const updated = { ...sessions };",
  "    const repeatId = repeat ? 'repeat_' + Date.now() : null;",
  "    if (repeat) {",
  "      for (let i=0; i<repeatWeeks; i++) {",
  "        const d = new Date(date+'T12:00:00');",
  "        d.setDate(d.getDate()+i*7);",
  "        const dateStr = d.toISOString().split('T')[0];",
  "        const id = 'session_'+Date.now()+'_'+i;",
  "        updated[id] = { id, subgroupIds, date:dateStr, time, trainer, info, repeatId, responses:{} };",
  "      }",
  "    } else {",
  "      const id = 'session_'+Date.now();",
  "      updated[id] = { id, subgroupIds, date, time, trainer, info, repeatId:null, responses:{} };",
  "    }",
  "    saveSessions(updated);",
  "    setNewSession(emptySession);",
  "  };"
].join('\n');

if(c.indexOf(oldCreate)===-1){console.log('X createSession not found');process.exit(1);}
c = c.replace(oldCreate, newCreate);
console.log('6 createSession updated for isRecurring');

// ─────────────────────────────────────────────────────────────────
// 7. Add deleteRecurringTemplate before deleteRepeatBlock
// ─────────────────────────────────────────────────────────────────
const oldDeleteRepeat = "  const deleteRepeatBlock = (repeatId) => {";
const newDeleteRepeat = [
  "  const deleteRecurringTemplate = (templateId) => {",
  "    if (!window.confirm('Dauereinheit und alle zukünftigen Termine löschen?')) return;",
  "    const updTemplates = {...recurringTemplates}; delete updTemplates[templateId];",
  "    saveRecurringTemplates(updTemplates);",
  "    const today = new Date().toISOString().split('T')[0];",
  "    const updSessions = Object.fromEntries(Object.entries(sessions).filter(([,s]) => !(s.templateId===templateId && s.date>=today)));",
  "    saveSessions(updSessions);",
  "  };",
  "",
  "  const deleteRepeatBlock = (repeatId) => {"
].join('\n');

if(c.indexOf(oldDeleteRepeat)===-1){console.log('X deleteRepeatBlock not found');process.exit(1);}
c = c.replace(oldDeleteRepeat, newDeleteRepeat);
console.log('7 deleteRecurringTemplate added');

// ─────────────────────────────────────────────────────────────────
// 8. Add "Dauereinheit" checkbox to the form (replace repeat section)
// ─────────────────────────────────────────────────────────────────
// Find by unique anchor
const repAnchor = "border:'1px solid #bae6fd'";
const repStart = c.indexOf(repAnchor);
if(repStart===-1){console.log('X repeat block anchor not found');process.exit(1);}
// Walk back to find start of div
const repDivStart = c.lastIndexOf('\r\n          <div ', repStart) + 2; // +2 to skip \r\n
// Find the closing </div> of the outer wrapper div (two levels up from nested content)
// Approach: find second occurrence of \r\n          </div> after repStart
let searchFrom = repStart;
let closeCount = 0;
let repEnd = -1;
while(closeCount < 1) {
  const nextClose = c.indexOf('\r\n          </div>', searchFrom+1);
  if(nextClose===-1) break;
  searchFrom = nextClose;
  closeCount++;
  repEnd = nextClose;
}
const repEndFull = repEnd + '\r\n          </div>'.length;

console.log('Repeat block found at', repDivStart, '-', repEndFull);

const newRepeatSection = [
  "          <div style={{marginBottom:'16px',padding:'14px',background:'#f0f9ff',borderRadius:'8px',border:'1px solid #bae6fd'}}>",
  "            {/* Dauereinheit */}",
  "            <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:'10px'}}>",
  "              <input type=\"checkbox\" checked={newSession.isRecurring} onChange={e=>setNewSession({...newSession,isRecurring:e.target.checked,repeat:false})} style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#15803d'}}/>",
  "              <span style={{fontWeight:'700',color:'#15803d',fontSize:'14px'}}>∞ Dauereinheit (kein Enddatum)</span>",
  "            </label>",
  "            {newSession.isRecurring&&(",
  "              <div style={{padding:'10px',background:'#f0fdf4',borderRadius:'6px',border:'1px solid #86efac',marginBottom:'8px'}}>",
  "                <p style={{margin:'0 0 4px',fontSize:'13px',color:'#15803d',fontWeight:'600'}}>",
  "                  Wiederholt sich jeden {newSession.date ? WEEKDAYS[new Date(newSession.date+'T12:00:00').getDay()] : '...'} · ab {newSession.date||'Datum wählen'}",
  "                </p>",
  "                <p style={{margin:0,fontSize:'12px',color:'#16a34a'}}>Wird automatisch in die geplanten Einheiten eingetragen, bis du sie löschst.</p>",
  "              </div>",
  "            )}",
  "            {/* Wöchentlich wiederholen */}",
  "            {!newSession.isRecurring&&(<>",
  "              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:newSession.repeat?'12px':0}}>",
  "                <input type=\"checkbox\" checked={newSession.repeat} onChange={e=>setNewSession({...newSession,repeat:e.target.checked})} style={{width:'18px',height:'18px',cursor:'pointer'}}/>",
  "                <span style={{fontWeight:'600',color:'#0369a1',fontSize:'14px'}}><RefreshCw size={16} style={{display:'inline',marginRight:'6px'}}/>Wöchentlich wiederholen</span>",
  "              </label>",
  "              {newSession.repeat&&(",
  "                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>",
  "                  <label style={{...s.label,margin:0}}>Wochen:</label>",
  "                  <input type=\"number\" min=\"1\" max=\"52\" value={newSession.repeatWeeks} onChange={e=>setNewSession({...newSession,repeatWeeks:parseInt(e.target.value)||1})} style={{width:'70px',padding:'6px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'14px'}}/>",
  "                  <span style={{fontSize:'13px',color:'#0369a1'}}>= {newSession.repeatWeeks}x jeden {WEEKDAYS[new Date(newSession.date+'T12:00:00').getDay()]}</span>",
  "                </div>",
  "              )}",
  "            </>)}",
  "          </div>"
].join('\n');

c = c.slice(0, repDivStart) + newRepeatSection + c.slice(repEndFull);
console.log('8 Dauereinheit checkbox added to form');

// ─────────────────────────────────────────────────────────────────
// 9. Update the "Anlegen" button label
// ─────────────────────────────────────────────────────────────────
const oldBtn = "          <button onClick={createSession} style={s.btn('#0369a1')}>\r\n            <Calendar size={18}/> {newSession.repeat?`${newSession.repeatWeeks} Einheiten anlegen`:'Einheit anlegen'}\r\n          </button>";
if(c.indexOf(oldBtn)===-1){
  console.log('X create button not found (trying alt)');
  // Search for a simpler match
  const idx2 = c.indexOf("onClick={createSession}");
  if(idx2>0) console.log('Button context:', JSON.stringify(c.slice(idx2-50, idx2+200)));
  // Not critical, skip
} else {
  const newBtn = "          <button onClick={createSession} style={s.btn(newSession.isRecurring?'#15803d':'#0369a1')}>\n            <Calendar size={18}/> {newSession.isRecurring?'Dauereinheit anlegen':newSession.repeat?`${newSession.repeatWeeks} Einheiten anlegen`:'Einheit anlegen'}\n          </button>";
  c = c.replace(oldBtn, newBtn);
  console.log('9 Create button label updated');
}

// ─────────────────────────────────────────────────────────────────
// 10. Add Dauereinheiten list section before "Geplante Einheiten"
// ─────────────────────────────────────────────────────────────────
const oldGeplant = "        {/* Geplante Einheiten */}\r\n        <div style={s.card}>\r\n          <h2 style={{margin:'0 0 16px',color:'#0369a1'}}>📅 Geplante Einheiten</h2>";
const newGeplant = [
  "        {/* Dauereinheiten */}",
  "        {Object.values(recurringTemplates).length > 0 && (",
  "          <div style={s.card}>",
  "            <h2 style={{margin:'0 0 16px',color:'#15803d',display:'flex',alignItems:'center',gap:'8px'}}>∞ Dauereinheiten</h2>",
  "            <div style={{display:'grid',gap:'8px'}}>",
  "              {Object.values(recurringTemplates).map(tmpl => {",
  "                const tmplSubs = (tmpl.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);",
  "                return (",
  "                  <div key={tmpl.id} style={{padding:'12px 14px',borderRadius:'10px',border:'2px solid #86efac',background:'#f0fdf4',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>",
  "                    <span style={{fontSize:'20px'}}>∞</span>",
  "                    <div style={{flex:1}}>",
  "                      <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginBottom:'4px'}}>",
  "                        {tmplSubs.map(sub=>{",
  "                          const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);",
  "                          return <span key={sub.id} style={{fontSize:'11px',fontWeight:'700',color:grp?.color,background:grp?.bg||'#f3f4f6',padding:'1px 7px',borderRadius:'20px',border:'1px solid '+(grp?.color||'#ccc')}}>{grp?.emoji} {sub.name}</span>;",
  "                        })}",
  "                      </div>",
  "                      <p style={{margin:0,fontWeight:'700',color:'#15803d',fontSize:'14px'}}>",
  "                        Jeden {WEEKDAYS[tmpl.dayOfWeek]} · {tmpl.time} Uhr",
  "                        {tmpl.trainer&&<span style={{fontWeight:'400',color:'#555'}}> · 👤 {tmpl.trainer}</span>}",
  "                      </p>",
  "                      {tmpl.info&&<p style={{margin:'2px 0 0',fontSize:'12px',color:'#16a34a'}}>{tmpl.info}</p>}",
  "                    </div>",
  "                    <button onClick={()=>deleteRecurringTemplate(tmpl.id)}",
  "                      style={{padding:'5px 10px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:'6px',color:'#dc2626',cursor:'pointer',fontWeight:'700',fontSize:'12px',flexShrink:0}}>",
  "                      Löschen",
  "                    </button>",
  "                  </div>",
  "                );",
  "              })}",
  "            </div>",
  "          </div>",
  "        )}",
  "",
  "        {/* Geplante Einheiten */}",
  "        <div style={s.card}>",
  "          <h2 style={{margin:'0 0 16px',color:'#0369a1'}}>📅 Geplante Einheiten</h2>"
].join('\n');

if(c.indexOf(oldGeplant)===-1){console.log('X Geplante Einheiten not found');process.exit(1);}
c = c.replace(oldGeplant, newGeplant);
console.log('10 Dauereinheiten section added');

// ─────────────────────────────────────────────────────────────────
// 11. Show badge on sessions from recurring templates
// ─────────────────────────────────────────────────────────────────
const oldRepeatBadge = "{session.repeatId&&<span style={{fontSize:'11px',color:'#0369a1',background:'#e0f2fe',padding:'2px 8px',borderRadius:'20px'}}><RefreshCw size={10} style={{display:'inline'}}/> Block ({blockSize}x)</span>}";
const newRepeatBadge = "{session.repeatId&&<span style={{fontSize:'11px',color:'#0369a1',background:'#e0f2fe',padding:'2px 8px',borderRadius:'20px'}}><RefreshCw size={10} style={{display:'inline'}}/> Block ({blockSize}x)</span>}\n                            {session.templateId&&<span style={{fontSize:'11px',color:'#15803d',background:'#dcfce7',padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>∞ Dauereinheit</span>}";
if(c.indexOf(oldRepeatBadge)===-1){
  console.log('skip: repeat badge not found (non-critical)');
} else {
  c = c.replace(oldRepeatBadge, newRepeatBadge);
  console.log('11 badge added to recurring sessions');
}

// ─────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync(appPath, c, 'utf8');
console.log('\nDone. File saved.');
