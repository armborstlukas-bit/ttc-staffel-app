// Script 1: Make archive PT cards collapsible
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

// 1. Add ptArchiveExpanded state after ptMatchDraft (CRLF)
const R = '\r\n';
const stateOld = '  const [ptMatchDraft, setPtMatchDraft]                             = useState(null);' + R;
const stateNew = stateOld + '  const [ptArchiveExpanded, setPtArchiveExpanded]                     = useState({});' + R;
if(c.indexOf(stateOld)===-1){console.log('✗ ptMatchDraft state not found');process.exit(1);}
c = c.replace(stateOld, stateNew);
console.log('✓ Added ptArchiveExpanded state');

// 2. Replace archive PT tab content using start+end splice
const startMarker = "archiveTab==='practiceTournaments' && (() => {";
const startIdx = c.indexOf(startMarker);
if(startIdx===-1){console.log('✗ Start marker not found');process.exit(1);}
// Find the closing })()}  for this block
const endMarker = '})()}';
let searchFrom = startIdx;
let endIdx = -1;
// Need to find the right })()}  - it's the one closing the IIFE
// Look for it after the last '})}'
let depth = 0;
for(let i=startIdx; i<c.length-5; i++){
  if(c.slice(i,i+5)==='})()}'){
    endIdx = i;
    break;
  }
}
if(endIdx===-1){console.log('✗ End marker not found');process.exit(1);}
const endEnd = endIdx + 5; // after })()}

const oldBlock = c.slice(startIdx, endEnd);
console.log('Old block length:', oldBlock.length);

const newBlock = `archiveTab==='practiceTournaments' && (() => {
            const sortedPTs = Object.values(archivedPracticeTournaments).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));
            const placeEmoji = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            return (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {sortedPTs.length===0 && <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>Noch keine archivierten Übungswettkämpfe.</div>}
                {sortedPTs.map(pt=>{
                  const fs2 = pt.finalStandings||[];
                  const expanded = !!ptArchiveExpanded[pt.id];
                  const groupSize = pt.players ? pt.players.length : 4;
                  const dateStr = new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return (
                    <div key={pt.id} style={{background:'rgba(167,139,250,0.06)',borderRadius:'14px',border:'1px solid rgba(167,139,250,0.2)',overflow:'hidden'}}>
                      {/* Collapsed header — always visible */}
                      <div onClick={()=>setPtArchiveExpanded(prev=>({...prev,[pt.id]:!prev[pt.id]}))}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(167,139,250,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{fontSize:'13px',color:'rgba(167,139,250,0.5)',flexShrink:0,whiteSpace:'nowrap'}}>{dateStr}</span>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{groupSize}er</span>
                        <div style={{flex:1,display:'flex',gap:'5px',flexWrap:'wrap',overflow:'hidden',minWidth:0}}>
                          {fs2.map((s,i)=>(
                            <span key={s.childId} style={{fontSize:'12px',color:i===0?'#fde68a':i===1?'#e2e8f0':i===2?'#fdba74':'rgba(255,255,255,0.4)',fontWeight:i<3?'800':'600',whiteSpace:'nowrap'}}>
                              {i>0&&<span style={{color:'rgba(255,255,255,0.15)',margin:'0 2px'}}>·</span>}{s.name}
                            </span>
                          ))}
                        </div>
                        <span style={{fontSize:'18px',color:'rgba(167,139,250,0.5)',transform:expanded?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0,lineHeight:1}}>›</span>
                      </div>
                      {expanded && (
                        <div style={{borderTop:'1px solid rgba(167,139,250,0.12)',padding:'12px 14px',display:'grid',gap:'5px'}}>
                          <div style={{display:'flex',gap:'10px',marginBottom:'8px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'11px',color:'rgba(167,139,250,0.6)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>von {pt.createdBy}</span>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{pt.settings.winSets} Gewinnsätze</span>
                          </div>
                          {fs2.map(s=>(
                            <div key={s.childId} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.07)'}}>
                              <span style={{fontSize:'20px',flexShrink:0}}>{placeEmoji[s.place-1]||\`\${s.place}.\`}</span>
                              <div style={{flex:1}}>
                                <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'14px'}}>{s.name}</p>
                                <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}{pt.settings.trackSetScores?\` · Punkte \${s.ptsWon}:\${s.ptsLost}\":''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}`;

c = c.slice(0, startIdx) + newBlock + c.slice(endEnd);
console.log('✓ Archive PT cards replaced with collapsible version');

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
