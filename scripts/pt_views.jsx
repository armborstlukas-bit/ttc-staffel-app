  // ── ÜBUNGSWETTKÄMPFE (Liste + Erstellen) ─────────────────────
  if (view === 'practiceTournaments') {
    const jugendSubs = Object.values(subgroups).filter(sg => sg.groupId === 'jugend');
    const allPTList = Object.values(practiceTournaments).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const typeInfo = { label:'4er Gruppe', emoji:'🎯', maxPlayers:4, desc:'Rundenturnier · 3 Runden · 4 Spieler' };
    const maxPlayers = typeInfo.maxPlayers;

    const getSeededPlayers = (ids) => ids
      .map(id => {
        const ach = getAchievements(id);
        const ttrUnlocked = ach.ttrUnlocked || [];
        const maxTTR = ttrUnlocked.length > 0 ? Math.max(...ttrUnlocked) : 0;
        const achScore = (ach.einzel1||0)*3+(ach.einzel2||0)*2+(ach.einzel3||0) +
          (ach.doppel1||0)*3+(ach.doppel2||0)*2+(ach.doppel3||0) +
          (ach.team||0)*2+(ach.spielerDesMonats||0)+ttrUnlocked.length;
        return { childId:id, name:children[id]?.name||'?', subgroupId:children[id]?.subgroupId, maxTTR, achScore };
      })
      .sort((a,b) => b.maxTTR!==a.maxTTR ? b.maxTTR-a.maxTTR : b.achScore!==a.achScore ? b.achScore-a.achScore : a.name.localeCompare(b.name,'de'));

    const jugendChildren = Object.values(children).filter(c => subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const filteredChildren = ptSubgroupFilter==='all' ? jugendChildren : jugendChildren.filter(c=>c.subgroupId===ptSubgroupFilter);
    const seededPreview = getSeededPlayers(ptSelectedChildren);

    const startTournament = () => {
      const seeded = getSeededPlayers(ptSelectedChildren);
      const id = 'pt_' + Date.now();
      const newPT = {
        id, type:'4er_gruppe',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || user?.email || 'Trainer',
        settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderLength, trackSetScores:ptCreateForm.trackSetScores },
        players: seeded.map((p,i) => ({...p, seed:i+1})),
        matches: [
          {round:1,p1Idx:0,p2Idx:3,result:null},
          {round:1,p1Idx:1,p2Idx:2,result:null},
          {round:2,p1Idx:0,p2Idx:2,result:null},
          {round:2,p1Idx:1,p2Idx:3,result:null},
          {round:3,p1Idx:0,p2Idx:1,result:null},
          {round:3,p1Idx:2,p2Idx:3,result:null},
        ],
        status:'active',
      };
      savePracticeTournaments({...practiceTournaments, [id]: newPT});
      setActivePracticeId(id);
      setPtCreating(false); setPtCreateStep(1); setPtSelectedChildren([]); setPtSubgroupFilter('all');
      navTo('practiceTournamentDetail');
    };

    const DIN = {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none'};
    const ptBtn = (active) => ({flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${active?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:active?'rgba(167,139,250,0.15)':'rgba(255,255,255,0.04)',color:active?'#c4b5fd':'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'800',fontSize:'15px',transition:'all 0.12s'});
    const smBtn = (active) => ({width:'34px',height:'34px',borderRadius:'8px',background:active?'rgba(167,139,250,0.15)':'rgba(255,255,255,0.04)',border:`2px solid ${active?'#a78bfa':'rgba(255,255,255,0.1)'}`,color:active?'#c4b5fd':'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'});

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>navTo('home')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px'}}>🎮 Übungswettkämpfe</h2>
              <p style={{margin:0,color:'rgba(167,139,250,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{allPTList.length} laufend{allPTList.length!==1?'e':''}</p>
            </div>
            {!ptCreating && (
              <button onClick={()=>{setPtCreating(true);setPtCreateStep(1);setPtSelectedChildren([]);setPtSubgroupFilter('all');setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false});}}
                style={{padding:'9px 16px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={15}/> Neuer Wettkampf
              </button>
            )}
          </div>

          {/* ── Erstellungs-Wizard ─────────────────────────────── */}
          {ptCreating && (
            <div style={{background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'20px',padding:'20px',marginBottom:'24px'}}>

              {/* Step-Indicator */}
              <div style={{display:'flex',gap:'12px',marginBottom:'22px',alignItems:'center'}}>
                {[{n:1,l:'Einstellungen'},{n:2,l:'Spieler'}].map(({n,l})=>(
                  <div key={n} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:ptCreateStep>=n?'#a78bfa':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:'white'}}>{n}</div>
                    <span style={{fontSize:'12px',color:ptCreateStep>=n?'#c4b5fd':'rgba(255,255,255,0.3)',fontWeight:'600'}}>{l}</span>
                    {n<2&&<span style={{color:'rgba(255,255,255,0.2)',marginLeft:'4px'}}>›</span>}
                  </div>
                ))}
                <button onClick={()=>{setPtCreating(false);setPtCreateStep(1);}} style={{marginLeft:'auto',padding:'4px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'12px'}}>✕</button>
              </div>

              {/* Step 1: Typ + Einstellungen */}
              {ptCreateStep===1 && (
                <>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Wettkampftyp</p>
                  <div style={{display:'flex',gap:'10px',marginBottom:'22px'}}>
                    {[{k:'4er_gruppe',emoji:'🎯',label:'4er Gruppe',desc:'Rundenturnier · 3 Runden · 4 Spieler'}].map(t=>(
                      <div key={t.k} onClick={()=>setPtCreateForm(f=>({...f,type:t.k}))}
                        style={{flex:1,padding:'16px',borderRadius:'14px',border:`2px solid ${ptCreateForm.type===t.k?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptCreateForm.type===t.k?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',transition:'all 0.12s'}}>
                        <div style={{fontSize:'30px',marginBottom:'6px'}}>{t.emoji}</div>
                        <div style={{fontWeight:'800',color:'white',fontSize:'15px'}}>{t.label}</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'4px'}}>{t.desc}</div>
                      </div>
                    ))}
                  </div>

                  <p style={{margin:'0 0 14px',fontSize:'11px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielmodus</p>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px',marginBottom:'22px'}}>

                    {/* Gewinnsätze */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(255,255,255,0.45)',fontWeight:'700'}}>Gewinnsätze</p>
                      <div style={{display:'flex',gap:'6px'}}>
                        {[1,2,3].map(n=>(
                          <button key={n} onClick={()=>setPtCreateForm(f=>({...f,winSets:n}))} style={ptBtn(ptCreateForm.winSets===n)}>{n}</button>
                        ))}
                      </div>
                    </div>

                    {/* Ergebniserfassung */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(255,255,255,0.45)',fontWeight:'700'}}>Ergebniserfassung</p>
                      <div style={{display:'flex',gap:'6px'}}>
                        {[{v:false,l:'Nur Sätze'},{v:true,l:'Satzergebnisse'}].map(opt=>(
                          <button key={String(opt.v)} onClick={()=>setPtCreateForm(f=>({...f,trackSetScores:opt.v}))}
                            style={{...ptBtn(ptCreateForm.trackSetScores===opt.v),fontSize:'12px',fontWeight:'700',lineHeight:'1.3'}}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Satzlänge */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(255,255,255,0.45)',fontWeight:'700'}}>Satzlänge</p>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.max(5,f.setLength-1)}))} style={smBtn(false)}>−</button>
                        <span style={{fontSize:'22px',fontWeight:'900',color:'white',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.setLength}</span>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.min(21,f.setLength+1)}))} style={smBtn(false)}>+</button>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>Punkte</span>
                      </div>
                    </div>

                    {/* Entscheidungssatz */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(255,255,255,0.45)',fontWeight:'700'}}>Entscheidungssatz</p>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.max(5,f.deciderLength-1)}))} style={smBtn(false)}>−</button>
                        <span style={{fontSize:'22px',fontWeight:'900',color:'#fde68a',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.deciderLength}</span>
                        <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.min(21,f.deciderLength+1)}))} style={smBtn(false)}>+</button>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>Punkte</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={()=>setPtCreateStep(2)}
                    style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'15px'}}>
                    Weiter → Spieler auswählen
                  </button>
                </>
              )}

              {/* Step 2: Spieler */}
              {ptCreateStep===2 && (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
                    <button onClick={()=>setPtCreateStep(1)} style={{padding:'6px 12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>← Zurück</button>
                    <h3 style={{margin:0,color:'#c4b5fd',fontSize:'15px',fontWeight:'800'}}>Spieler auswählen ({ptSelectedChildren.length}/{maxPlayers})</h3>
                  </div>

                  {/* Untergruppen-Filter */}
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                    {[{id:'all',name:'Alle Jugend'},...jugendSubs].map(s=>(
                      <button key={s.id} onClick={()=>setPtSubgroupFilter(s.id)}
                        style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${ptSubgroupFilter===s.id?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.1)'}`,background:ptSubgroupFilter===s.id?'rgba(167,139,250,0.15)':'transparent',color:ptSubgroupFilter===s.id?'#c4b5fd':'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'12px',fontWeight:'700'}}>
                        {s.name}
                      </button>
                    ))}
                  </div>

                  {/* Kinderliste */}
                  <div style={{display:'grid',gap:'6px',marginBottom:'16px',maxHeight:'260px',overflowY:'auto',paddingRight:'4px'}}>
                    {filteredChildren.length===0
                      ? <p style={{color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'20px 0'}}>Keine Kinder in dieser Gruppe.</p>
                      : filteredChildren.map(child=>{
                        const selected = ptSelectedChildren.includes(child.id);
                        const ach = getAchievements(child.id);
                        const ttrUnlocked = ach.ttrUnlocked||[];
                        const maxTTR = ttrUnlocked.length>0?Math.max(...ttrUnlocked):null;
                        const disabled = !selected && ptSelectedChildren.length>=maxPlayers;
                        return (
                          <div key={child.id} onClick={()=>{if(disabled)return;setPtSelectedChildren(prev=>selected?prev.filter(id=>id!==child.id):[...prev,child.id]);}}
                            style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'10px',border:`1.5px solid ${selected?'rgba(167,139,250,0.4)':'rgba(255,255,255,0.07)'}`,background:selected?'rgba(167,139,250,0.1)':'rgba(255,255,255,0.03)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1,transition:'all 0.1s'}}>
                            <div style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${selected?'#a78bfa':'rgba(255,255,255,0.2)'}`,background:selected?'#a78bfa':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {selected&&<Check size={13} color="white"/>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{margin:0,fontWeight:'700',color:'white',fontSize:'14px'}}>{child.name}</p>
                              <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{subgroups[child.subgroupId]?.name}{maxTTR?` · TTR ${maxTTR}`:' · kein TTR'}</p>
                            </div>
                            {maxTTR&&<span style={{fontSize:'11px',fontWeight:'800',color:'#a78bfa',background:'rgba(167,139,250,0.12)',padding:'2px 8px',borderRadius:'10px',flexShrink:0}}>TTR {maxTTR}</span>}
                          </div>
                        );
                      })
                    }
                  </div>

                  {/* Setzungs-Vorschau */}
                  {seededPreview.length>0&&(
                    <div style={{marginBottom:'14px',padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px'}}>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px'}}>Setzung (nach TTR + Errungenschaften)</p>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                        {seededPreview.map((p,i)=>(
                          <div key={p.childId} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'14px',fontWeight:'900',color:'rgba(74,222,128,0.7)',minWidth:'20px'}}>{i+1}.</span>
                            <span style={{fontSize:'14px',fontWeight:'700',color:'white'}}>{p.name}</span>
                            {p.maxTTR>0&&<span style={{fontSize:'11px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>TTR {p.maxTTR}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={startTournament} disabled={ptSelectedChildren.length!==maxPlayers}
                    style={{width:'100%',padding:'14px',background:ptSelectedChildren.length===maxPlayers?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(255,255,255,0.06)',color:'white',border:'none',borderRadius:'12px',cursor:ptSelectedChildren.length===maxPlayers?'pointer':'not-allowed',fontWeight:'800',fontSize:'15px',opacity:ptSelectedChildren.length===maxPlayers?1:0.5,transition:'all 0.15s'}}>
                    {ptSelectedChildren.length===maxPlayers?'🎮 Wettkampf starten!':`Noch ${maxPlayers-ptSelectedChildren.length} Spieler auswählen`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Aktive Wettkämpfe ──────────────────────────────── */}
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
                          <span style={{fontSize:'11px',fontWeight:'700',color:allDone?'#4ade80':'#fde68a',background:allDone?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.1)',padding:'2px 8px',borderRadius:'10px',border:`1px solid ${allDone?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}`}}>
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
                      <div style={{width:`${(done/total)*100}%`,height:'100%',background:allDone?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#7c3aed,#a78bfa)',transition:'width 0.4s ease'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ÜBUNGSWETTKAMPF DETAIL ────────────────────────────────────
  if (view === 'practiceTournamentDetail') {
    const pt = practiceTournaments[activePracticeId];
    if (!pt) return (
      <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',color:'white'}}>
        <p style={{fontSize:'16px',color:'rgba(255,255,255,0.4)'}}>Wettkampf nicht gefunden (möglicherweise archiviert).</p>
        <button onClick={()=>navTo('practiceTournaments')} style={{padding:'10px 20px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'10px',color:'#4ade80',cursor:'pointer',fontWeight:'700'}}>← Zurück</button>
      </div>
    );

    const { settings, players, matches } = pt;
    const maxSets = settings.winSets * 2 - 1;
    const rounds = [1,2,3];

    // Calculate standings
    const stats = players.map((_,i) => ({idx:i,wins:0,losses:0,setsWon:0,setsLost:0,ptsWon:0,ptsLost:0}));
    matches.forEach(m => {
      if (!m.result) return;
      const {sets1,sets2,scores} = m.result;
      stats[m.p1Idx].setsWon+=sets1; stats[m.p1Idx].setsLost+=sets2;
      stats[m.p2Idx].setsWon+=sets2; stats[m.p2Idx].setsLost+=sets1;
      if (sets1>sets2){stats[m.p1Idx].wins++;stats[m.p2Idx].losses++;}else{stats[m.p2Idx].wins++;stats[m.p1Idx].losses++;}
      if (scores) scores.forEach(({s1,s2})=>{
        if(s1!==''&&s2!==''){stats[m.p1Idx].ptsWon+=Number(s1);stats[m.p1Idx].ptsLost+=Number(s2);stats[m.p2Idx].ptsWon+=Number(s2);stats[m.p2Idx].ptsLost+=Number(s1);}
      });
    });

    const standings = [...stats].sort((a,b)=>{
      if (b.wins!==a.wins) return b.wins-a.wins;
      const sbA=a.setsWon-a.setsLost, sbB=b.setsWon-b.setsLost;
      if (sbB!==sbA) return sbB-sbA;
      if (settings.trackSetScores) {
        const pbA=a.ptsWon-a.ptsLost, pbB=b.ptsWon-b.ptsLost;
        if (pbB!==pbA) return pbB-pbA;
      }
      const dm=matches.find(m=>(m.p1Idx===a.idx&&m.p2Idx===b.idx)||(m.p1Idx===b.idx&&m.p2Idx===a.idx));
      if (dm?.result){const aWon=(dm.p1Idx===a.idx&&dm.result.sets1>dm.result.sets2)||(dm.p2Idx===a.idx&&dm.result.sets2>dm.result.sets1);return aWon?-1:1;}
      return a.idx-b.idx;
    });

    const allDone = matches.every(m=>m.result!==null);
    const placeEmoji = ['🥇','🥈','🥉','4️⃣'];
    const placeColor = ['#fde68a','#e2e8f0','#fdba74','rgba(255,255,255,0.35)'];

    const updateMatchResult = (matchIdx, result) => {
      const updMatches = matches.map((m,i) => i===matchIdx ? {...m,result} : m);
      savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matches:updMatches}});
    };

    const deleteResult = (matchIdx) => {
      const updMatches = matches.map((m,i) => i===matchIdx ? {...m,result:null} : m);
      savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matches:updMatches}});
    };

    const archiveTournament = () => {
      const finalStandings = standings.map((s,place) => ({
        place:place+1, childId:players[s.idx].childId, name:players[s.idx].name, seed:players[s.idx].seed,
        wins:s.wins, losses:s.losses, setsWon:s.setsWon, setsLost:s.setsLost, ptsWon:s.ptsWon, ptsLost:s.ptsLost,
      }));
      const archivedPT = {...pt, status:'archived', archivedAt:new Date().toISOString(), finalStandings};
      const newActive = {...practiceTournaments};
      delete newActive[pt.id];
      savePracticeTournaments(newActive);
      saveArchivedPracticeTournaments({...archivedPracticeTournaments, [pt.id]: archivedPT});
      setActivePracticeId(null);
      navTo('practiceTournaments');
    };

    const deleteActiveTournament = () => {
      if (!window.confirm('Wettkampf wirklich löschen? Alle Ergebnisse gehen verloren.')) return;
      const newActive = {...practiceTournaments};
      delete newActive[pt.id];
      savePracticeTournaments(newActive);
      setActivePracticeId(null);
      navTo('practiceTournaments');
    };

    const initDraft = (matchIdx) => {
      const existing = matches[matchIdx].result;
      if (settings.trackSetScores) {
        setPtMatchDraft({mode:'scores', scores:existing?.scores?.map(s=>({s1:String(s.s1),s2:String(s.s2)}))||[{s1:'',s2:''}]});
      } else {
        setPtMatchDraft({mode:'simple', sets1:existing?.sets1||0, sets2:existing?.sets2||0});
      }
      setPtMatchEditing(matchIdx);
    };

    const isDraftValid = () => {
      if (!ptMatchDraft) return false;
      if (ptMatchDraft.mode==='scores') {
        const valid = ptMatchDraft.scores.filter(r=>r.s1!==''&&r.s2!==''&&Number(r.s1)!==Number(r.s2));
        const s1=valid.filter(r=>Number(r.s1)>Number(r.s2)).length;
        const s2=valid.filter(r=>Number(r.s2)>Number(r.s1)).length;
        return s1===settings.winSets||s2===settings.winSets;
      } else {
        const {sets1,sets2}=ptMatchDraft;
        return (sets1===settings.winSets||sets2===settings.winSets)&&sets1!==sets2;
      }
    };

    const saveDraft = () => {
      if (ptMatchEditing===null||!ptMatchDraft) return;
      let result;
      if (ptMatchDraft.mode==='scores') {
        const validScores = ptMatchDraft.scores.filter(r=>r.s1!==''&&r.s2!=='').map(r=>({s1:Number(r.s1),s2:Number(r.s2)}));
        const s1=validScores.filter(r=>r.s1>r.s2).length;
        const s2=validScores.filter(r=>r.s2>r.s1).length;
        result = {sets1:s1, sets2:s2, scores:validScores};
      } else {
        result = {sets1:ptMatchDraft.sets1, sets2:ptMatchDraft.sets2, scores:[]};
      }
      updateMatchResult(ptMatchEditing, result);
      setPtMatchEditing(null);
      setPtMatchDraft(null);
    };

    const inpStyle = {background:'rgba(255,255,255,0.09)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'white',fontSize:'20px',fontWeight:'900',textAlign:'center',width:'58px',height:'44px',outline:'none'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>{setPtMatchEditing(null);setPtMatchDraft(null);navTo('practiceTournaments');}} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:'0 0 1px',color:'rgba(167,139,250,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                🎯 4er Gruppe · {settings.winSets} Gewinnsätze · {settings.setLength}/{settings.deciderLength} · {settings.trackSetScores?'Satzergebnisse':'Nur Sätze'}
              </p>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:isMobile?'14px':'17px',letterSpacing:'-0.2px'}}>
                {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.createdBy}
              </h2>
            </div>
            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
              <button onClick={deleteActiveTournament} style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>

          {/* ── Tabelle ─────────────────────────────────────────── */}
          <div style={{marginBottom:'28px'}}>
            <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px',overflow:'hidden'}}>
              {/* Header */}
              <div style={{display:'grid',gridTemplateColumns:'36px 1fr 44px 70px'+(settings.trackSetScores?' 80px':''),padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',gap:'4px',alignItems:'center'}}>
                {['Pl.','Name','S','Sätze',...(settings.trackSetScores?['Punkte']:[])].map(h=>(
                  <span key={h} style={{fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.3px',textAlign:h==='Name'?'left':'center'}}>{h}</span>
                ))}
              </div>
              {standings.map((s,place)=>{
                const p=players[s.idx];
                return (
                  <div key={s.idx} style={{display:'grid',gridTemplateColumns:'36px 1fr 44px 70px'+(settings.trackSetScores?' 80px':''),padding:'11px 16px',gap:'4px',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.04)',background:place===0?'rgba(253,230,138,0.04)':place===1?'rgba(226,232,240,0.02)':'transparent'}}>
                    <div style={{fontSize:'18px',textAlign:'center'}}>{placeEmoji[place]}</div>
                    <div>
                      <p style={{margin:0,fontWeight:'800',color:placeColor[place],fontSize:'14px'}}>{p.name}</p>
                      <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>Setzung {p.seed}</p>
                    </div>
                    <div style={{textAlign:'center',fontSize:'18px',fontWeight:'900',color:s.wins>=2?'#4ade80':s.wins===1?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.3)'}}>{s.wins}</div>
                    <div style={{textAlign:'center',fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.45)'}}>{s.setsWon}:{s.setsLost}</div>
                    {settings.trackSetScores&&<div style={{textAlign:'center',fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'600'}}>{s.ptsWon}:{s.ptsLost}</div>}
                  </div>
                );
              })}
            </div>
            <p style={{margin:'5px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.2)',textAlign:'right'}}>S = Siege · sortiert nach: Siege → Satzbilanz{settings.trackSetScores?' → Punktbilanz':''} → Direktvergleich</p>
          </div>

          {/* ── Runden & Partien ────────────────────────────────── */}
          {rounds.map(round=>(
            <div key={round} style={{marginBottom:'20px'}}>
              <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>Runde {round}</p>
              <div style={{display:'grid',gap:'8px'}}>
                {matches.filter(m=>m.round===round).map(match=>{
                  const matchIdx = matches.indexOf(match);
                  const p1=players[match.p1Idx], p2=players[match.p2Idx];
                  const res=match.result;
                  const isEditing=ptMatchEditing===matchIdx;
                  const p1Won=res&&res.sets1>res.sets2, p2Won=res&&res.sets2>res.sets1;

                  return (
                    <div key={matchIdx} style={{background:'rgba(255,255,255,0.04)',border:`1.5px solid ${isEditing?'rgba(167,139,250,0.45)':res?'rgba(74,222,128,0.18)':'rgba(255,255,255,0.08)'}`,borderRadius:'14px',overflow:'hidden',transition:'border-color 0.15s'}}>

                      {/* Match-Kopf */}
                      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px'}}>
                        {/* Spieler 1 */}
                        <div style={{flex:1,textAlign:'right',minWidth:0}}>
                          <p style={{margin:0,fontWeight:'800',fontSize:isMobile?'13px':'15px',color:p1Won?'#4ade80':res?'rgba(255,255,255,0.35)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p1.name}</p>
                          <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>#{p1.seed}</p>
                        </div>

                        {/* Ergebnis */}
                        <div style={{minWidth:'64px',textAlign:'center',flexShrink:0}}>
                          {res
                            ? <span style={{fontSize:'20px',fontWeight:'900',color:'white',letterSpacing:'2px'}}>{res.sets1}:{res.sets2}</span>
                            : <span style={{fontSize:'13px',color:'rgba(255,255,255,0.2)',fontWeight:'600'}}>vs</span>
                          }
                        </div>

                        {/* Spieler 2 */}
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontWeight:'800',fontSize:isMobile?'13px':'15px',color:p2Won?'#4ade80':res?'rgba(255,255,255,0.35)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p2.name}</p>
                          <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>#{p2.seed}</p>
                        </div>

                        {/* Eintragen-Button */}
                        {!isEditing&&(
                          <button onClick={()=>initDraft(matchIdx)}
                            style={{flexShrink:0,padding:'6px 10px',background:res?'rgba(255,255,255,0.06)':'rgba(167,139,250,0.12)',border:`1px solid ${res?'rgba(255,255,255,0.1)':'rgba(167,139,250,0.3)'}`,borderRadius:'8px',cursor:'pointer',color:res?'rgba(255,255,255,0.45)':'#c4b5fd',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>
                            {res?'✏️ Edit':'Eintragen'}
                          </button>
                        )}
                      </div>

                      {/* Satzergebnisse-Detail (wenn vorhanden) */}
                      {!isEditing&&res&&res.scores&&res.scores.length>0&&(
                        <div style={{padding:'4px 14px 10px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                          {res.scores.map((sc,si)=>(
                            <span key={si} style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700'}}>
                              {si===maxSets-1?'⚡':''} S{si+1}: {sc.s1}:{sc.s2}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ergebnis-Eingabe */}
                      {isEditing&&ptMatchDraft&&(
                        <div style={{padding:'14px',borderTop:'1px solid rgba(167,139,250,0.15)',background:'rgba(167,139,250,0.05)'}}>

                          {ptMatchDraft.mode==='scores' ? (
                            <>
                              <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>
                                Satzergebnisse · Satzlänge {settings.setLength} · Entscheidungssatz {settings.deciderLength}
                              </p>
                              <div style={{display:'grid',gap:'7px',marginBottom:'10px'}}>
                                {ptMatchDraft.scores.map((row,si)=>{
                                  const isDecider = si===maxSets-1;
                                  const updateRow = (field,val) => {
                                    const sc=[...ptMatchDraft.scores]; sc[si]={...sc[si],[field]:val};
                                    setPtMatchDraft(d=>({...d,scores:sc}));
                                  };
                                  return (
                                    <div key={si} style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                                      <span style={{fontSize:'11px',fontWeight:'700',color:isDecider?'#fde68a':'rgba(255,255,255,0.3)',minWidth:'68px'}}>
                                        {isDecider?'⚡ Entscheid.':` Satz ${si+1}`}
                                      </span>
                                      <input type="number" min="0" max="99" value={row.s1}
                                        onChange={e=>updateRow('s1',e.target.value===''?'':e.target.value)}
                                        style={inpStyle} placeholder="0"/>
                                      <span style={{color:'rgba(255,255,255,0.3)',fontWeight:'900',fontSize:'18px'}}>:</span>
                                      <input type="number" min="0" max="99" value={row.s2}
                                        onChange={e=>updateRow('s2',e.target.value===''?'':e.target.value)}
                                        style={inpStyle} placeholder="0"/>
                                      {ptMatchDraft.scores.length>1&&(
                                        <button onClick={()=>setPtMatchDraft(d=>({...d,scores:d.scores.filter((_,j)=>j!==si)}))}
                                          style={{width:'28px',height:'28px',borderRadius:'6px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                                      )}
                                    </div>
                                  );
                                })}
                                {ptMatchDraft.scores.length<maxSets&&(
                                  <button onClick={()=>setPtMatchDraft(d=>({...d,scores:[...d.scores,{s1:'',s2:''}]}))}
                                    style={{padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(167,139,250,0.3)',borderRadius:'8px',color:'rgba(167,139,250,0.6)',cursor:'pointer',fontSize:'12px',fontWeight:'700',marginTop:'2px'}}>
                                    + Satz hinzufügen
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <p style={{margin:'0 0 12px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>Gewonnene Sätze (Best of {settings.winSets*2-1})</p>
                              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px',flexWrap:'wrap'}}>
                                <div style={{flex:1,minWidth:'130px',textAlign:'center'}}>
                                  <p style={{margin:'0 0 7px',fontSize:'13px',fontWeight:'800',color:'white'}}>{p1.name}</p>
                                  <div style={{display:'flex',gap:'5px',justifyContent:'center'}}>
                                    {Array.from({length:settings.winSets+1},(_,n)=>(
                                      <button key={n} onClick={()=>setPtMatchDraft(d=>({...d,sets1:n}))}
                                        style={{width:'38px',height:'38px',borderRadius:'9px',border:`2px solid ${ptMatchDraft.sets1===n?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptMatchDraft.sets1===n?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.04)',color:ptMatchDraft.sets1===n?'white':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'900',fontSize:'17px'}}>
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <span style={{fontWeight:'900',color:'rgba(255,255,255,0.2)',fontSize:'22px',flexShrink:0}}>:</span>
                                <div style={{flex:1,minWidth:'130px',textAlign:'center'}}>
                                  <p style={{margin:'0 0 7px',fontSize:'13px',fontWeight:'800',color:'white'}}>{p2.name}</p>
                                  <div style={{display:'flex',gap:'5px',justifyContent:'center'}}>
                                    {Array.from({length:settings.winSets+1},(_,n)=>(
                                      <button key={n} onClick={()=>setPtMatchDraft(d=>({...d,sets2:n}))}
                                        style={{width:'38px',height:'38px',borderRadius:'9px',border:`2px solid ${ptMatchDraft.sets2===n?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptMatchDraft.sets2===n?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.04)',color:ptMatchDraft.sets2===n?'white':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'900',fontSize:'17px'}}>
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                            {res&&<button onClick={()=>{deleteResult(matchIdx);setPtMatchEditing(null);setPtMatchDraft(null);}}
                              style={{padding:'8px 10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'8px',cursor:'pointer',color:'#f87171',fontWeight:'700',fontSize:'12px'}}>
                              🗑️ Löschen
                            </button>}
                            <button onClick={()=>{setPtMatchEditing(null);setPtMatchDraft(null);}} style={{flex:1,padding:'9px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>Abbrechen</button>
                            <button onClick={saveDraft} disabled={!isDraftValid()}
                              style={{flex:2,padding:'9px',background:isDraftValid()?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(255,255,255,0.06)',border:'none',borderRadius:'8px',color:'white',cursor:isDraftValid()?'pointer':'not-allowed',fontWeight:'800',fontSize:'13px',opacity:isDraftValid()?1:0.45}}>
                              ✓ Speichern
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Abschluss ────────────────────────────────────────── */}
          {allDone&&(
            <div style={{padding:'18px 20px',background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.22)',borderRadius:'16px',textAlign:'center',marginTop:'8px'}}>
              <p style={{margin:'0 0 6px',fontSize:'17px',fontWeight:'900',color:'#4ade80'}}>🏆 Alle Partien abgeschlossen!</p>
              <p style={{margin:'0 0 14px',fontSize:'13px',color:'rgba(255,255,255,0.45)'}}>Sieger: <strong style={{color:'#fde68a'}}>{players[standings[0].idx].name}</strong></p>
              <button onClick={archiveTournament}
                style={{padding:'12px 28px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'inline-flex',alignItems:'center',gap:'8px'}}>
                <Archive size={16}/> Wettkampf archivieren
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

