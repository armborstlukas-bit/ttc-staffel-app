const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
let n = 0;

function rep(from, to, label) {
  const idx = c.indexOf(from);
  if (idx === -1) { console.log('✗ NOT FOUND: ' + label); return; }
  c = c.slice(0, idx) + to + c.slice(idx + from.length);
  n++; console.log('✓ ' + label);
}

// ── 1. PT-SECTION IM ELTERN/JUGEND-PROFIL ────────────────────────────────────
// Insert before closing of parent/youth dashboard (before the MobileBottomNav line)
rep(
  `        {isMobile && <MobileBottomNav view={view} navTo={navTo} userRole={userRole} canEdit={canEdit} appSettings={appSettings} unreadCount={0}/>}
      </div>
    );
  }



  // ── GRUPPE ───────────────────────────────────────────────────
  // ── GRUPPE ───────────────────────────────────────────────────`,
  `        {/* PT-Section im Eltern/Jugend-Profil */}
        {myChild&&(()=>{
          const placeEmojiPD=['🥇','🥈','🥉','4️⃣'];
          const myPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.matches&&pt.matches.every(m=>m.result)),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));
          if(myPTs.length===0) return null;
          return (
            <div style={{padding:'0 16px 16px'}}>
              <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 10px'}}>Trainingswettkämpfe</span>
              <div style={{background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px',padding:'14px 16px',display:'grid',gap:'8px'}}>
                {myPTs.map(pt=>{
                  const allDonePD=pt.matches&&pt.matches.every(m=>m.result);
                  // For active (not yet archived) completed tournaments, calculate standings inline
                  let myEntry=null;
                  if(pt.finalStandings){
                    myEntry=pt.finalStandings.find(s=>s.childId===myChild.id);
                  } else if(allDonePD){
                    const stats2=pt.players.map((_,i)=>({idx:i,wins:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats2[m.p1Idx].setsWon+=sets1;stats2[m.p1Idx].setsLost+=sets2;stats2[m.p2Idx].setsWon+=sets2;stats2[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats2[m.p1Idx].wins++;else stats2[m.p2Idx].wins++;});
                    const sorted2=[...stats2].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const myIdx2=pt.players.findIndex(p=>p.childId===myChild.id);
                    const myRank2=sorted2.findIndex(s=>s.idx===myIdx2);
                    const myStat2=stats2[myIdx2];
                    myEntry={place:myRank2+1,wins:myStat2.wins,losses:pt.matches.filter(m=>(m.p1Idx===myIdx2||m.p2Idx===myIdx2)&&m.result).length-myStat2.wins,setsWon:myStat2.setsWon,setsLost:myStat2.setsLost};
                  }
                  if(!myEntry) return null;
                  const opps=pt.players.filter(p=>p.childId!==myChild.id).map(p=>p.name);
                  const dateStr=new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return(
                    <div key={pt.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(167,139,250,0.12)'}}>
                      <span style={{fontSize:'20px',flexShrink:0}}>{placeEmojiPD[myEntry.place-1]||myEntry.place+'.'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'2px'}}>
                          <span style={{fontWeight:'800',color:'white',fontSize:'14px'}}>Platz {myEntry.place}</span>
                          <span style={{fontSize:'11px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>4er Gruppe</span>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{dateStr}</span>
                          {!pt.finalStandings&&<span style={{fontSize:'10px',color:'#fde68a',fontWeight:'700',background:'rgba(253,230,138,0.1)',padding:'1px 6px',borderRadius:'8px'}}>läuft noch</span>}
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
        {isMobile && <MobileBottomNav view={view} navTo={navTo} userRole={userRole} canEdit={canEdit} appSettings={appSettings} unreadCount={0}/>}
      </div>
    );
  }



  // ── GRUPPE ───────────────────────────────────────────────────
  // ── GRUPPE ───────────────────────────────────────────────────`,
  'Parent/Youth: PT section'
);

// ── 2. ARCHIVE BUTTON + DELETE ON CARD + 7-TAGE-SECTION ──────────────────────
// Replace top bar of practiceTournaments view (no archive button yet)
rep(
  `            {!ptCreating && (
              <button onClick={()=>{setPtCreating(true);setPtCreateStep(1);setPtSelectedChildren([]);setPtSubgroupFilter('all');setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false});}}
                style={{padding:'9px 16px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={15}/> Neuer Wettkampf
              </button>
            )}`,
  `            {!ptCreating && (<div style={{display:'flex',gap:'8px',flexShrink:0}}>
              <button onClick={()=>{setArchiveTab('practiceTournaments');navTo('archiv');}}
                style={{padding:'9px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',color:'rgba(255,255,255,0.55)',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}>
                <Archive size={14}/> Archiv
              </button>
              <button onClick={()=>{setPtCreating(true);setPtCreateStep(1);setPtSelectedChildren([]);setPtSubgroupFilter('all');setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false});}}
                style={{padding:'9px 16px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={15}/> Neuer Wettkampf
              </button>
            </div>)}`,
  'PT list: archive button'
);

// ── 3. AUTO-ARCHIVE + 7-TAGE + DELETE ON CARD ────────────────────────────────
// Replace the active tournaments list section
rep(
  `          {/* ── Aktive Wettkämpfe ──────────────────────────────── */}
          {allPTList.length===0&&!ptCreating ? (
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
              <div style={{fontSize:'52px',marginBottom:'14px'}}>🎮</div>
              <p style={{fontSize:'16px',fontWeight:'700',margin:'0 0 6px'}}>Noch keine Übungswettkämpfe</p>
              <p style={{fontSize:'13px',margin:0}}>Klicke oben auf "Neuer Wettkampf".</p>
            </div>
          ) : (
            <div style={{display:'grid',gap:'10px'}}>
              {allPTList.map(pt=>{
                const done=pt.matches.filter(m=>m.result).length;
                const total=pt.matches.length;
                const allDone=done===total;
                return (
                  <div key={pt.id} onClick={()=>{setActivePracticeId(pt.id);setPtMatchEditing(null);setPtMatchDraft(null);navTo('practiceTournamentDetail');}}
                    style={{padding:'16px 18px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px',cursor:'pointer',transition:'all 0.12s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(167,139,250,0.08)';e.currentTarget.style.borderColor='rgba(167,139,250,0.3)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(167,139,250,0.15)';}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'10px'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                          <span style={{fontSize:'18px'}}>🎯</span>
                          <span style={{fontWeight:'800',color:'white',fontSize:'16px'}}>4er Gruppe</span>
                          <span style={{fontSize:'11px',fontWeight:'700',color:allDone?'#4ade80':'#fde68a',background:allDone?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.1)',padding:'2px 8px',borderRadius:'10px',border:\`1px solid \${allDone?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>
                            {allDone?'✓ Fertig':'Laufend'}
                          </span>
                        </div>
                        <p style={{margin:'0 0 6px',fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>
                          {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.settings.winSets} Gewinnsätze · {pt.settings.setLength}/{pt.settings.deciderLength}
                        </p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'4px',color:'rgba(167,139,250,0.6)',flexShrink:0}}>
                        <span style={{fontSize:'12px',fontWeight:'700'}}>{done}/{total}</span>
                        <ChevronRight size={16}/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                      {pt.players.map(p=>(
                        <span key={p.childId} style={{fontSize:'12px',fontWeight:'700',color:'rgba(255,255,255,0.55)',background:'rgba(255,255,255,0.06)',padding:'2px 8px',borderRadius:'8px'}}>{p.seed}. {p.name}</span>
                      ))}
                    </div>
                    {/* Progress bar */}
                    <div style={{marginTop:'10px',height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                      <div style={{width:\`\${(done/total)*100}%\`,height:'100%',background:allDone?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#7c3aed,#a78bfa)',transition:'width 0.4s ease'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}`,
  `          {/* ── Auto-Archivierung: abgeschlossene Wettkämpfe älter als 7 Tage ── */}
          {(()=>{
            const sevenDaysAgo = new Date(Date.now()-7*24*60*60*1000).toISOString();
            const toAutoArchive = allPTList.filter(pt=>{
              const done=pt.matches.every(m=>m.result);
              return done && pt.createdAt < sevenDaysAgo;
            });
            if(toAutoArchive.length>0){
              toAutoArchive.forEach(pt=>{
                const finalStandings2=(()=>{
                  const stats3=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0,ptsWon:0,ptsLost:0}));
                  pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2,scores}=m.result;stats3[m.p1Idx].setsWon+=sets1;stats3[m.p1Idx].setsLost+=sets2;stats3[m.p2Idx].setsWon+=sets2;stats3[m.p2Idx].setsLost+=sets1;if(sets1>sets2){stats3[m.p1Idx].wins++;}else{stats3[m.p2Idx].wins++;}if(scores)scores.forEach(({s1,s2})=>{stats3[m.p1Idx].ptsWon+=Number(s1||0);stats3[m.p1Idx].ptsLost+=Number(s2||0);stats3[m.p2Idx].ptsWon+=Number(s2||0);stats3[m.p2Idx].ptsLost+=Number(s1||0);});});
                  const sorted3=[...stats3].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)||(b.ptsWon-b.ptsLost)-(a.ptsWon-a.ptsLost));
                  return sorted3.map((s,place)=>({place:place+1,childId:pt.players[s.idx].childId,name:pt.players[s.idx].name,seed:pt.players[s.idx].seed,wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost,ptsWon:s.ptsWon,ptsLost:s.ptsLost}));
                })();
                const archivedPT2={...pt,status:'archived',archivedAt:new Date().toISOString(),finalStandings:finalStandings2};
                const newActive2={...practiceTournaments};
                delete newActive2[pt.id];
                savePracticeTournaments(newActive2);
                saveArchivedPracticeTournaments({...archivedPracticeTournaments,[pt.id]:archivedPT2});
              });
            }
            return null;
          })()}

          {/* ── Aktive Wettkämpfe ──────────────────────────────── */}
          {(()=>{
            const activePTs = allPTList.filter(pt=>!pt.matches.every(m=>m.result));
            const recentDonePTs = allPTList.filter(pt=>{
              const done=pt.matches.every(m=>m.result);
              const sevenDaysAgo2=new Date(Date.now()-7*24*60*60*1000).toISOString();
              return done && pt.createdAt >= sevenDaysAgo2;
            });
            const deletePT = (e, ptId) => {
              e.stopPropagation();
              if(!window.confirm('Wettkampf löschen? Alle Ergebnisse gehen verloren.')) return;
              const upd={...practiceTournaments}; delete upd[ptId]; savePracticeTournaments(upd);
            };
            const PTCard = ({pt, showBadge}) => {
              const done=pt.matches.filter(m=>m.result).length;
              const total=pt.matches.length;
              const allDone2=done===total;
              return (
                <div style={{position:'relative'}}>
                  <div onClick={()=>{setActivePracticeId(pt.id);setPtMatchEditing(null);setPtMatchDraft(null);navTo('practiceTournamentDetail');}}
                    style={{padding:'14px 16px',background:allDone2?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.04)',border:\`1px solid \${allDone2?'rgba(74,222,128,0.18)':'rgba(167,139,250,0.15)'}\`,borderRadius:'16px',cursor:'pointer',transition:'all 0.12s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=allDone2?'rgba(74,222,128,0.09)':'rgba(167,139,250,0.08)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=allDone2?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.04)';}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'8px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'16px'}}>🎯</span>
                          <span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>4er Gruppe</span>
                          <span style={{fontSize:'10px',fontWeight:'700',color:allDone2?'#4ade80':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:\`1px solid \${allDone2?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}\`}}>
                            {allDone2?'✓ Abgeschlossen':'● Laufend'}
                          </span>
                        </div>
                        <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>
                          {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.settings.winSets} GS · {pt.settings.setLength}/{pt.settings.deciderLength}
                        </p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                        <span style={{fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.6)'}}>{done}/{total}</span>
                        <button onClick={(e)=>deletePT(e,pt.id)}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
                          title="Wettkampf löschen">
                          <Trash2 size={12}/>
                        </button>
                        <ChevronRight size={15} color="rgba(167,139,250,0.4)"/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'8px'}}>
                      {pt.players.map(p=>(
                        <span key={p.childId} style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.06)',padding:'2px 7px',borderRadius:'7px'}}>{p.seed}. {p.name}</span>
                      ))}
                    </div>
                    <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                      <div style={{width:\`\${(done/total)*100}%\`,height:'100%',background:allDone2?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#7c3aed,#a78bfa)',transition:'width 0.4s ease'}}/>
                    </div>
                  </div>
                </div>
              );
            };

            if(allPTList.length===0&&!ptCreating) return (
              <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
                <div style={{fontSize:'52px',marginBottom:'14px'}}>🎮</div>
                <p style={{fontSize:'16px',fontWeight:'700',margin:'0 0 6px'}}>Noch keine Übungswettkämpfe</p>
                <p style={{fontSize:'13px',margin:0}}>Klicke oben auf "Neuer Wettkampf".</p>
              </div>
            );

            return (
              <>
                {/* Laufende Wettkämpfe */}
                {activePTs.length>0&&(
                  <div style={{marginBottom:'20px'}}>
                    <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>Laufend</p>
                    <div style={{display:'grid',gap:'8px'}}>
                      {activePTs.map(pt=><PTCard key={pt.id} pt={pt}/>)}
                    </div>
                  </div>
                )}
                {/* Letzte 7 Tage – abgeschlossen */}
                {recentDonePTs.length>0&&(
                  <div>
                    <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(74,222,128,0.4)',textTransform:'uppercase',letterSpacing:'2px'}}>Letzte 7 Tage – Abgeschlossen</p>
                    <div style={{display:'grid',gap:'8px'}}>
                      {recentDonePTs.map(pt=><PTCard key={pt.id} pt={pt}/>)}
                    </div>
                    <p style={{margin:'8px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.2)',textAlign:'right'}}>⏱ Werden nach 7 Tagen automatisch archiviert</p>
                  </div>
                )}
              </>
            );
          })()}`,
  'PT list: auto-archive + 7-day + delete on card'
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log(`\nDone: ${n}/3 replacements`);
