// Script 3: Add pause button + fix child/parent profile PT display
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

// ── 1. Update auto-archive: skip paused tournaments ──────────────────────────
const oldAutoArchive = 'const done=pt.matches.every(m=>m.result);\n              return done && pt.createdAt < sevenDaysAgo;';
const newAutoArchive = 'const done=pt.matches.every(m=>m.result);\n              return done && !pt.paused && pt.createdAt < sevenDaysAgo;';
if(c.indexOf(oldAutoArchive)===-1){console.log('✗ auto-archive filter not found');process.exit(1);}
c = c.replace(oldAutoArchive, newAutoArchive);
console.log('✓ Auto-archive skips paused');

// ── 2. Update "Letzte 7 Tage" section: exclude paused ───────────────────────
const oldRecentFilter = 'return done && pt.createdAt >= sevenDaysAgo2;';
const newRecentFilter = 'return done && !pt.paused && pt.createdAt >= sevenDaysAgo2;';
if(c.indexOf(oldRecentFilter)===-1){console.log('✗ recent filter not found');process.exit(1);}
c = c.replace(oldRecentFilter, newRecentFilter);
console.log('✓ Recent section excludes paused');

// ── 3. Update PTCard: add pause button + paused badge ────────────────────────
const oldBadge = `<span style={{fontSize:'10px',fontWeight:'700',color:allDone2?'#4ade80':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:\`1px solid \${allDone2?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>
                            {allDone2?'✓ Abgeschlossen':'● Laufend'}
                          </span>`;
const newBadge = `<span style={{fontSize:'10px',fontWeight:'700',color:allDone2?'#4ade80':pt.paused?'#fbbf24':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':pt.paused?'rgba(251,191,36,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:\`1px solid \${allDone2?'rgba(74,222,128,0.25)':pt.paused?'rgba(251,191,36,0.3)':'rgba(253,230,138,0.25)'}\`}}>
                            {allDone2?'✓ Abgeschlossen':pt.paused?'⏸ Pausiert':'● Laufend'}
                          </span>`;
if(c.indexOf(oldBadge)===-1){console.log('✗ badge not found');process.exit(1);}
c = c.replace(oldBadge, newBadge);
console.log('✓ PTCard badge updated');

// Add pause button before delete button in PTCard
const oldButtons = `<button onClick={(e)=>deletePT(e,pt.id)}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
                          title=\"Wettkampf löschen\">
                          <Trash2 size={12}/>
                        </button>`;
const newButtons = `{!allDone2&&(
                          <button onClick={(e)=>{e.stopPropagation();const upd={...practiceTournaments,[pt.id]:{...pt,paused:!pt.paused}};savePracticeTournaments(upd);}}
                            style={{width:'28px',height:'28px',borderRadius:'7px',background:pt.paused?'rgba(251,191,36,0.15)':'rgba(167,139,250,0.1)',border:\`1px solid \${pt.paused?'rgba(251,191,36,0.3)':'rgba(167,139,250,0.2)'}\`,color:pt.paused?'#fbbf24':'rgba(167,139,250,0.6)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
                            title={pt.paused?'Fortsetzen':'Pausieren'}>
                            <span style={{fontSize:'11px',lineHeight:1}}>{pt.paused?'▶':'⏸'}</span>
                          </button>
                        )}
                        <button onClick={(e)=>deletePT(e,pt.id)}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
                          title=\"Wettkampf löschen\">
                          <Trash2 size={12}/>
                        </button>`;
if(c.indexOf(oldButtons)===-1){console.log('✗ delete button in PTCard not found');process.exit(1);}
c = c.replace(oldButtons, newButtons);
console.log('✓ PTCard pause button added');

// ── 4. Add pause button in detail view ──────────────────────────────────────
// Find the archiveTournament button call
const oldArchBtn = `const archiveTournament = () => {`;
const archIdx = c.indexOf(oldArchBtn);
if(archIdx===-1){console.log('✗ archiveTournament not found');process.exit(1);}
// Add pauseTournament function before archiveTournament
const newArchBtn = `const pauseTournament = () => {
      const newPaused = !pt.paused;
      savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, paused:newPaused}});
    };

    const archiveTournament = () => {`;
c = c.slice(0, archIdx) + newArchBtn + c.slice(archIdx + oldArchBtn.length);
console.log('✓ pauseTournament function added');

// Add pause button in the detail view top bar (near archive/delete buttons)
const oldDelBtn = `<button onClick={deleteActiveTournament} style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={14}/>
              </button>`;
if(c.indexOf(oldDelBtn)===-1){console.log('✗ detail delete button not found');process.exit(1);}
const newDelBtn = `<button onClick={pauseTournament} style={{height:'34px',padding:'0 12px',borderRadius:'8px',background:pt.paused?'rgba(251,191,36,0.15)':'rgba(167,139,250,0.08)',border:\`1px solid \${pt.paused?'rgba(251,191,36,0.3)':'rgba(167,139,250,0.2)'}\`,color:pt.paused?'#fbbf24':'rgba(167,139,250,0.6)',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontWeight:'700',fontSize:'12px'}}>
                <span style={{fontSize:'13px'}}>{pt.paused?'▶':'⏸'}</span>
                <span>{pt.paused?'Fortsetzen':'Pausieren'}</span>
              </button>
              <button onClick={deleteActiveTournament} style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={14}/>
              </button>`;
c = c.replace(oldDelBtn, newDelBtn);
console.log('✓ Pause button added to detail view');

// ── 5. Update childHistory to show paused + archived PTs ─────────────────────
const oldChildFilter = "const childPTs=Object.values(archivedPracticeTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id)).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));";
const newChildFilter = `const childPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.paused&&pt.players&&pt.players.some(p=>p.childId===child.id)),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));`;
if(c.indexOf(oldChildFilter)===-1){console.log('✗ childPTs filter not found');process.exit(1);}
c = c.replace(oldChildFilter, newChildFilter);
console.log('✓ childHistory includes paused PTs');

// Update childHistory card to handle paused (no finalStandings)
const oldChildCard = `const fs3=(pt.finalStandings||[]).find(s=>s.childId===child.id);
                  if(!fs3) return null;`;
const newChildCard = `let fs3=(pt.finalStandings||[]).find(s=>s.childId===child.id);
                  if(!fs3&&pt.paused){
                    // Compute current standings for paused PT
                    const stats5=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats5[m.p1Idx].setsWon+=sets1;stats5[m.p1Idx].setsLost+=sets2;stats5[m.p2Idx].setsWon+=sets2;stats5[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats5[m.p1Idx].wins++;else stats5[m.p2Idx].wins++;});
                    const sorted5=[...stats5].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const mi5=pt.players.findIndex(p=>p.childId===child.id);
                    const mr5=sorted5.findIndex(s=>s.idx===mi5);
                    const ms5=stats5[mi5]||{wins:0,setsWon:0,setsLost:0};
                    const mc5=pt.matches.filter(m=>m.result&&(m.p1Idx===mi5||m.p2Idx===mi5)).length;
                    fs3={place:mr5+1,wins:ms5.wins,losses:mc5-ms5.wins,setsWon:ms5.setsWon,setsLost:ms5.setsLost,paused:true};
                  }
                  if(!fs3) return null;`;
if(c.indexOf(oldChildCard)===-1){console.log('✗ childCard fs3 not found');process.exit(1);}
c = c.replace(oldChildCard, newChildCard);
console.log('✓ childHistory handles paused standings');

// Update the place emoji to show ⏸ for paused
const oldChildEmoji = `<span style={{fontSize:'22px',flexShrink:0}}>{placeEmojiCH[fs3.place-1]||String(fs3.place)+'.'}  </span>`;
const newChildEmoji = `<span style={{fontSize:'22px',flexShrink:0}}>{fs3.paused?'⏸':(placeEmojiCH[fs3.place-1]||String(fs3.place)+'.')}</span>`;
if(c.indexOf(oldChildEmoji)===-1){console.log('✗ childHistory place emoji not found');process.exit(1);}
c = c.replace(oldChildEmoji, newChildEmoji);
console.log('✓ childHistory place emoji updated for paused');

// Update child card type label to show group size
const oldChildType = `<span style={{fontSize:'11px',color:'rgba(167,139,250,0.7)',fontWeight:'600'}}>4er Gruppe</span>`;
const newChildType = `<span style={{fontSize:'11px',color:'rgba(167,139,250,0.7)',fontWeight:'600'}}>{pt.players?pt.players.length+'er Gruppe':'4er Gruppe'}</span>`;
if(c.indexOf(oldChildType)===-1){console.log('✗ child type label not found');}
else { c = c.replace(oldChildType, newChildType); console.log('✓ childHistory group size label updated'); }

// ── 6. Move parent/youth PT section above Errungenschaften & update filter ────
// First, extract the current PT section
const ptStartMarker = '        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}\n';
const ptStartIdx = c.indexOf(ptStartMarker);
if(ptStartIdx===-1){console.log('✗ PT section start not found');process.exit(1);}
const ptEndStr = '})()}\n        {isMobile';
const ptEndIdx = c.indexOf(ptEndStr, ptStartIdx);
if(ptEndIdx===-1){console.log('✗ PT section end not found');process.exit(1);}
const ptSectionFull = c.slice(ptStartIdx, ptEndIdx + '})()}\n'.length);

// Build new PT section with updated content: only archived + paused
const newPTSection = `        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}
        {myChild&&(()=>{
          const placeEmojiPD=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const myPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.paused),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));
          if(myPTs.length===0) return null;
          return (
            <div style={{padding:'0 0 16px'}}>
              <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px',margin:'0 16px 10px'}}>Trainingswettkämpfe</span>
              <div style={{margin:'0 16px',background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px',padding:'12px 14px',display:'grid',gap:'8px'}}>
                {myPTs.map(pt=>{
                  const isPaused=!!pt.paused;
                  let myEntry=null;
                  if(pt.finalStandings){myEntry=pt.finalStandings.find(s=>s.childId===myChild.id);}
                  else if(isPaused){
                    const s4=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;s4[m.p1Idx].setsWon+=sets1;s4[m.p1Idx].setsLost+=sets2;s4[m.p2Idx].setsWon+=sets2;s4[m.p2Idx].setsLost+=sets1;if(sets1>sets2)s4[m.p1Idx].wins++;else s4[m.p2Idx].wins++;});
                    const srt4=[...s4].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const mi4=pt.players.findIndex(p=>p.childId===myChild.id);
                    const mr4=srt4.findIndex(s=>s.idx===mi4);
                    const ms4=s4[mi4]||{wins:0,setsWon:0,setsLost:0};
                    const mc4=pt.matches.filter(m=>m.result&&(m.p1Idx===mi4||m.p2Idx===mi4)).length;
                    myEntry={place:mr4+1,wins:ms4.wins,losses:mc4-ms4.wins,setsWon:ms4.setsWon,setsLost:ms4.setsLost,paused:true};
                  }
                  if(!myEntry) return null;
                  const opps=pt.players.filter(p=>p.childId!==myChild.id).map(p=>p.name);
                  const dateStr=new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  const groupSize=pt.players?pt.players.length:4;
                  return(
                    <div key={pt.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(167,139,250,0.1)'}}>
                      <span style={{fontSize:'20px',flexShrink:0}}>{myEntry.paused?'⏸':(placeEmojiPD[myEntry.place-1]||(myEntry.place+'.'))}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'2px'}}>
                          {myEntry.paused
                            ?<span style={{fontWeight:'800',color:'#fbbf24',fontSize:'13px'}}>Pausiert</span>
                            :<span style={{fontWeight:'800',color:'white',fontSize:'13px'}}>Platz {myEntry.place}</span>}
                          <span style={{fontSize:'10px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>{groupSize}er Gruppe</span>
                          <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{dateStr}</span>
                        </div>
                        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>vs. {opps.join(', ')} · {myEntry.wins}S {myEntry.losses}N · Sätze {myEntry.setsWon}:{myEntry.setsLost}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
`;

// Remove old PT section
c = c.slice(0, ptStartIdx) + c.slice(ptStartIdx + ptSectionFull.length);
console.log('✓ Old parent PT section removed');

// Insert new PT section before Errungenschaften
const achMarker = '              {/* ── Errungenschaften (nur Jugend) ── */}';
const achIdx = c.indexOf(achMarker);
if(achIdx===-1){console.log('✗ Errungenschaften marker not found');process.exit(1);}
c = c.slice(0, achIdx) + newPTSection + c.slice(achIdx);
console.log('✓ New parent PT section inserted above Errungenschaften');

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
