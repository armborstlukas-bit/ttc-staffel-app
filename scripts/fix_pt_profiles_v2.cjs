// Overhaul: remove pause, show all PTs in profiles, add clickable modal
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

// ── 1. Add ptDetailModal state ─────────────────────────────────────────────
const R = '\r\n';
const stateOld = '  const [ptArchiveExpanded, setPtArchiveExpanded]                     = useState({});'+R;
const stateNew = stateOld +
  '  const [ptDetailModal, setPtDetailModal]                           = useState(null);'+R;
if(c.indexOf(stateOld)===-1){console.log('✗ ptArchiveExpanded state not found');process.exit(1);}
c = c.replace(stateOld, stateNew);
console.log('✓ ptDetailModal state added');

// ── 2. Remove pauseTournament function from detail view ────────────────────
const oldPauseFn = "    const pauseTournament = () => {\r\n      const newPaused = !pt.paused;\r\n      savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, paused:newPaused}});\r\n    };\r\n\r\n    const archiveTournament";
const newPauseFn = "    const archiveTournament";
if(c.indexOf(oldPauseFn)===-1){console.log('✗ pauseTournament fn not found');process.exit(1);}
c = c.replace(oldPauseFn, newPauseFn);
console.log('✓ pauseTournament removed');

// ── 3. Remove pause button from detail view ────────────────────────────────
const oldPauseBtn = `<button onClick={pauseTournament} style={{height:'34px',padding:'0 12px',borderRadius:'8px',background:pt.paused?'rgba(251,191,36,0.15)':'rgba(167,139,250,0.08)',border:\`1px solid \${pt.paused?'rgba(251,191,36,0.3)':'rgba(167,139,250,0.2)'}\`,color:pt.paused?'#fbbf24':'rgba(167,139,250,0.6)',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontWeight:'700',fontSize:'12px'}}>\r\n                <span style={{fontSize:'13px'}}>{pt.paused?'▶':'⏸'}</span>\r\n                <span>{pt.paused?'Fortsetzen':'Pausieren'}</span>\r\n              </button>\r`;
if(c.indexOf(oldPauseBtn)===-1){console.log('✗ pause btn in detail view not found');process.exit(1);}
c = c.replace(oldPauseBtn, '');
console.log('✓ Pause button removed from detail view');

// ── 4. Remove pause button from PTCard + revert badge ─────────────────────
// Remove the entire {!allDone2&&(...)} pause button block
const oldPauseCard = `{!allDone2&&(\r\n                          <button onClick={(e)=>{e.stopPropagation();const upd={...practiceTournaments,[pt.id]:{...pt,paused:!pt.paused}};savePracticeTournaments(upd);}}\r\n                            style={{width:'28px',height:'28px',borderRadius:'7px',background:pt.paused?'rgba(251,191,36,0.15)':'rgba(167,139,250,0.1)',border:\`1px solid \${pt.paused?'rgba(251,191,36,0.3)':'rgba(167,139,250,0.2)'}\`,color:pt.paused?'#fbbf24':'rgba(167,139,250,0.6)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}\r\n                            title={pt.paused?'Fortsetzen':'Pausieren'}>\r\n                            <span style={{fontSize:'11px',lineHeight:1}}>{pt.paused?'▶':'⏸'}</span>\r\n                          </button>\r\n                        )}\r\n                        `;
if(c.indexOf(oldPauseCard)===-1){console.log('✗ pause btn in PTCard not found');process.exit(1);}
c = c.replace(oldPauseCard, '');
console.log('✓ Pause button removed from PTCard');

// Revert badge to 2-state (remove paused state from badge)
const oldBadge = `color:allDone2?'#4ade80':pt.paused?'#fbbf24':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':pt.paused?'rgba(251,191,36,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:\`1px solid \${allDone2?'rgba(74,222,128,0.25)':pt.paused?'rgba(251,191,36,0.3)':'rgba(253,230,138,0.25)'}\`}}>\r\n                            {allDone2?'✓ Abgeschlossen':pt.paused?'⏸ Pausiert':'● Laufend'}`;
const newBadge = `color:allDone2?'#4ade80':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:\`1px solid \${allDone2?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>\r\n                            {allDone2?'✓ Abgeschlossen':'● Laufend'}`;
if(c.indexOf(oldBadge)===-1){console.log('✗ PTCard badge not found');process.exit(1);}
c = c.replace(oldBadge, newBadge);
console.log('✓ PTCard badge reverted to 2-state');

// ── 5. Remove !pt.paused from auto-archive filter ─────────────────────────
c = c.replace(
  'return done && !pt.paused && pt.createdAt < sevenDaysAgo;',
  'return done && pt.createdAt < sevenDaysAgo;'
);
c = c.replace(
  'return done && !pt.paused && pt.createdAt >= sevenDaysAgo2;',
  'return done && pt.createdAt >= sevenDaysAgo2;'
);
console.log('✓ Removed !pt.paused from filters');

// ── 6. Helper: modal JSX (reusable string) ────────────────────────────────
const MODAL_JSX = `
        {/* PT Detail Modal */}
        {ptDetailModal&&(()=>{
          const mpt=ptDetailModal;
          const mPlayers=mpt.players||[];
          const mMatches=mpt.matches||[];
          const mSettings=mpt.settings||{};
          const isArchived=!!mpt.archivedAt;
          const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          // Compute standings
          const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
          mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
          const mStandings=(mpt.finalStandings||(()=>{
            return[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost}));
          })());
          const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
          const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
          return(
            <div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'16px'}}>🎯</span>
                      <span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span>
                      <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:isArchived?'#4ade80':'#fde68a',background:isArchived?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.08)',border:\`1px solid \${isArchived?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>
                        {isArchived?'✓ Abgeschlossen':'● Laufend'}
                      </span>
                    </div>
                    <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{new Date(mpt.archivedAt||mpt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})} · von {mpt.createdBy}</p>
                  </div>
                  <button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                </div>
                {/* Standings */}
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
                <div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>
                  {mStandings.map(s=>(
                    <div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Rounds */}
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spielplan</p>
                {roundsM.map(round=>(
                  <div key={round} style={{marginBottom:'12px'}}>
                    <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                    <div style={{display:'grid',gap:'4px'}}>
                      {mMatches.filter(m=>m.round===round).map((m,mi)=>{
                        const p1=mPlayers[m.p1Idx];const p2=mPlayers[m.p2Idx];
                        const res=m.result;
                        return(
                          <div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.05)'}}>
                            <span style={{flex:1,fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                            <span style={{fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'36px',textAlign:'center',flexShrink:0}}>
                              {res?\`\${res.sets1}:\${res.sets2}\`:'–:–'}
                            </span>
                            <span style={{flex:1,fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                          </div>
                        );
                      })}
                      {mPlayers.length%2===1&&(()=>{
                        const playersInRound=new Set(mMatches.filter(m=>m.round===round).flatMap(m=>[m.p1Idx,m.p2Idx]));
                        const bye=mPlayers.findIndex((_,i)=>!playersInRound.has(i));
                        return bye>=0?<p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.25)',paddingLeft:'10px'}}>⏸ Freirunde: {mPlayers[bye]?.name}</p>:null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
`;

// ── 7. Replace parent/youth PT section (full rewrite) ─────────────────────
const ptParentStart = '        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}\r\n';
const ptParentStartIdx = c.indexOf(ptParentStart);
if(ptParentStartIdx===-1){console.log('✗ PT parent section start not found');process.exit(1);}
// Find end: })()}\r\n + next line
const ptParentEndStr = '        })()}\r\n              {/* ── Errungenschaften (nur Jugend) ── */}';
// Actually find end with just the closing
const ptParentEndSearch = '})()}\n              {/* ── Errungenschaften';
let ptParentEndIdx = c.indexOf(ptParentEndSearch, ptParentStartIdx);
if(ptParentEndIdx===-1){
  // Try CRLF
  const alt = '})()}\r\n              {/* ── Errungenschaften';
  ptParentEndIdx = c.indexOf(alt, ptParentStartIdx);
  if(ptParentEndIdx===-1){console.log('✗ PT parent section end not found');process.exit(1);}
  ptParentEndIdx += '})()}\r\n'.length;
} else {
  ptParentEndIdx += '})()}\n'.length;
}
const oldParentSection = c.slice(ptParentStartIdx, ptParentEndIdx);
console.log('PT parent section length:', oldParentSection.length);

const newParentSection = `        {/* PT Detail Modal */}
        {ptDetailModal&&(()=>{
          const mpt=ptDetailModal;
          const mPlayers=mpt.players||[];
          const mMatches=mpt.matches||[];
          const isArchived=!!mpt.archivedAt;
          const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
          mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
          const mStandings=(mpt.finalStandings||(()=>[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost})))());
          const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
          const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
          return(
            <div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px 36px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'16px'}}>🎯</span>
                      <span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span>
                      <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:isArchived?'#4ade80':'#fde68a',background:isArchived?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.08)',border:\`1px solid \${isArchived?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>{isArchived?'✓ Abgeschlossen':'● Laufend'}</span>
                    </div>
                    <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{new Date(mpt.archivedAt||mpt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                  </div>
                  <button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                </div>
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
                <div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>
                  {mStandings.map(s=>(
                    <div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spielplan</p>
                {roundsM.map(round=>(
                  <div key={round} style={{marginBottom:'12px'}}>
                    <p style={{margin:'0 0 5px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                    <div style={{display:'grid',gap:'3px'}}>
                      {mMatches.filter(m=>m.round===round).map((m,mi)=>{
                        const p1=mPlayers[m.p1Idx];const p2=mPlayers[m.p2Idx];const res=m.result;
                        return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                          <span style={{flex:1,fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                          <span style={{fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'34px',textAlign:'center',flexShrink:0}}>{res?\`\${res.sets1}:\${res.sets2}\`:'–:–'}</span>
                          <span style={{flex:1,fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                        </div>);
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}
        {myChild&&(()=>{
          const placeEmojiPD=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const myPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id)),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));
          if(myPTs.length===0) return null;
          return (
            <div style={{padding:'0 0 16px'}}>
              <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px',margin:'0 16px 10px'}}>Trainingswettkämpfe</span>
              <div style={{margin:'0 16px',display:'grid',gap:'6px'}}>
                {myPTs.map(pt=>{
                  const isArc=!!pt.archivedAt;
                  // Compute my current standing
                  const myIdx=pt.players.findIndex(p=>p.childId===myChild.id);
                  const stats=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                  pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats[m.p1Idx].setsWon+=sets1;stats[m.p1Idx].setsLost+=sets2;stats[m.p2Idx].setsWon+=sets2;stats[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats[m.p1Idx].wins++;else stats[m.p2Idx].wins++;});
                  let myEntry=null;
                  if(pt.finalStandings){myEntry=pt.finalStandings.find(s=>s.childId===myChild.id);}
                  else{
                    const srt=[...stats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const myRank=srt.findIndex(s=>s.idx===myIdx);
                    const ms=stats[myIdx]||{wins:0,setsWon:0,setsLost:0};
                    const mc=pt.matches.filter(m=>m.result&&(m.p1Idx===myIdx||m.p2Idx===myIdx)).length;
                    myEntry={place:myRank+1,wins:ms.wins,losses:mc-ms.wins,setsWon:ms.setsWon,setsLost:ms.setsLost};
                  }
                  const done=pt.matches.filter(m=>m.result).length;
                  const total=pt.matches.length;
                  const dateStr=new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return(
                    <div key={pt.id} onClick={()=>setPtDetailModal(pt)}
                      style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'12px',border:\`1px solid \${isArc?'rgba(74,222,128,0.12)':'rgba(167,139,250,0.12)'}\`,cursor:'pointer'}}
                      onTouchStart={e=>e.currentTarget.style.background='rgba(167,139,250,0.1)'}
                      onTouchEnd={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                      <span style={{fontSize:'20px',flexShrink:0}}>{isArc?(placeEmojiPD[myEntry?.place-1]||(myEntry?.place+'.')):'🎯'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'2px'}}>
                          {isArc
                            ?<span style={{fontWeight:'800',color:'white',fontSize:'13px'}}>Platz {myEntry?.place}</span>
                            :<span style={{fontWeight:'800',color:'#fde68a',fontSize:'13px'}}>Laufend {done}/{total}</span>}
                          <span style={{fontSize:'10px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>{pt.players.length}er Gruppe</span>
                          <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>{dateStr}</span>
                        </div>
                        {myEntry&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{myEntry.wins}S {myEntry.losses}N · Sätze {myEntry.setsWon}:{myEntry.setsLost}</p>}
                      </div>
                      <span style={{fontSize:'14px',color:'rgba(167,139,250,0.3)',flexShrink:0}}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
`;

c = c.slice(0, ptParentStartIdx) + newParentSection + c.slice(ptParentEndIdx);
console.log('✓ Parent/youth PT section replaced');

// ── 8. Replace childHistory PT section (full rewrite) ─────────────────────
const chStart = '          {/* Trainingswettkämpfe im Kind-Profil */}\r\n';
const chStartIdx = c.indexOf(chStart);
if(chStartIdx===-1){console.log('✗ childHistory PT start not found');process.exit(1);}
// Find end - the section ends with })()}\n\n
const chEndStr = '          })()}\r\n\r\n';
const chEndIdx = c.indexOf(chEndStr, chStartIdx);
if(chEndIdx===-1){console.log('✗ childHistory PT end not found');process.exit(1);}
const chEndFull = chEndIdx + chEndStr.length;
console.log('childHistory PT section length:', chEndFull - chStartIdx);

const newChSection = `          {/* Trainingswettkämpfe im Kind-Profil */}
          {(()=>{
            const placeEmojiCH=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            const childPTs=[
              ...Object.values(archivedPracticeTournaments),
              ...Object.values(practiceTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id)),
            ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id))
             .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));
            if(childPTs.length===0) return null;
            return (<>
              {ptDetailModal&&(()=>{
                const mpt=ptDetailModal;
                const mPlayers=mpt.players||[];
                const mMatches=mpt.matches||[];
                const isArchived=!!mpt.archivedAt;
                const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
                const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
                const mStandings=(mpt.finalStandings||(()=>[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost})))());
                const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
                const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
                return(
                  <div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                    <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px 36px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'16px'}}>🎯</span>
                            <span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span>
                            <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:isArchived?'#4ade80':'#fde68a',background:isArchived?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.08)',border:\`1px solid \${isArchived?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>{isArchived?'✓ Abgeschlossen':'● Laufend'}</span>
                          </div>
                          <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{new Date(mpt.archivedAt||mpt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                        </div>
                        <button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                      </div>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
                      <div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>
                        {mStandings.map(s=>(
                          <div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                            <span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                              <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spielplan</p>
                      {roundsM.map(round=>(
                        <div key={round} style={{marginBottom:'12px'}}>
                          <p style={{margin:'0 0 5px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                          <div style={{display:'grid',gap:'3px'}}>
                            {mMatches.filter(m=>m.round===round).map((m,mi)=>{
                              const p1=mPlayers[m.p1Idx];const p2=mPlayers[m.p2Idx];const res=m.result;
                              return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                <span style={{flex:1,fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                                <span style={{fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'34px',textAlign:'center',flexShrink:0}}>{res?\`\${res.sets1}:\${res.sets2}\`:'–:–'}</span>
                                <span style={{flex:1,fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                              </div>);
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div style={{marginBottom:'20px'}}>
                <h3 style={{margin:'0 0 12px',color:'white',fontSize:'16px',fontWeight:'800'}}>🎮 Trainingswettkämpfe</h3>
                <div style={{display:'grid',gap:'7px'}}>
                  {childPTs.map(pt=>{
                    const isArc=!!pt.archivedAt;
                    const myIdx=pt.players.findIndex(p=>p.childId===child.id);
                    const stats=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats[m.p1Idx].setsWon+=sets1;stats[m.p1Idx].setsLost+=sets2;stats[m.p2Idx].setsWon+=sets2;stats[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats[m.p1Idx].wins++;else stats[m.p2Idx].wins++;});
                    let fs3=null;
                    if(pt.finalStandings){fs3=pt.finalStandings.find(s=>s.childId===child.id);}
                    else{
                      const srt=[...stats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                      const myRank=srt.findIndex(s=>s.idx===myIdx);
                      const ms=stats[myIdx]||{wins:0,setsWon:0,setsLost:0};
                      const mc=pt.matches.filter(m=>m.result&&(m.p1Idx===myIdx||m.p2Idx===myIdx)).length;
                      fs3={place:myRank+1,wins:ms.wins,losses:mc-ms.wins,setsWon:ms.setsWon,setsLost:ms.setsLost};
                    }
                    const done=pt.matches.filter(m=>m.result).length;
                    const total=pt.matches.length;
                    const opps=pt.players.filter(p=>p.childId!==child.id).map(p=>p.name);
                    return(<div key={pt.id} onClick={()=>setPtDetailModal(pt)}
                      style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',background:isArc?'rgba(167,139,250,0.06)':'rgba(253,230,138,0.04)',border:\`1px solid \${isArc?'rgba(167,139,250,0.15)':'rgba(253,230,138,0.15)'}\`,borderRadius:'12px',cursor:'pointer'}}>
                      <span style={{fontSize:'22px',flexShrink:0}}>{isArc?(placeEmojiCH[fs3?.place-1]||String(fs3?.place)+'.'):'🎯'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>
                          {isArc
                            ?<span style={{fontWeight:'800',color:'white',fontSize:'14px'}}>Platz {fs3?.place}</span>
                            :<span style={{fontWeight:'800',color:'#fde68a',fontSize:'14px'}}>Laufend {done}/{total}</span>}
                          <span style={{fontSize:'11px',color:isArc?'rgba(167,139,250,0.7)':'rgba(253,230,138,0.6)',fontWeight:'600'}}>{pt.players?pt.players.length+'er Gruppe':'4er Gruppe'}</span>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
                        </div>
                        {fs3&&<p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>vs. {opps.join(', ')} · {fs3.wins}S {fs3.losses}N</p>}
                      </div>
                      <span style={{fontSize:'16px',color:'rgba(255,255,255,0.2)',flexShrink:0}}>›</span>
                    </div>);
                  })}
                </div>
              </div>
            </>);
          })()}

`;

c = c.slice(0, chStartIdx) + newChSection + c.slice(chEndFull);
console.log('✓ childHistory PT section replaced');

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
