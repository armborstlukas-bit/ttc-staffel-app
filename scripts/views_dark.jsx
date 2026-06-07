  // ── GRUPPE ───────────────────────────────────────────────────
  if (view==='group') {
    const subs=getSubgroupsForGroup(activeGroup.id);
    const GRP = activeGroup;
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>navTo('home')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,minWidth:0}}>
              <span style={{fontSize:'28px'}}>{GRP.emoji}</span>
              <div>
                <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px',letterSpacing:'-0.3px'}}>{GRP.name}</h2>
                <p style={{margin:0,color:'rgba(74,222,128,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{subs.length} Trainingsgruppen</p>
              </div>
            </div>
          </div>

          {/* Neue Gruppe hinzufügen */}
          {canEdit()&&(
            <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
              <input style={{flex:1,padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'14px',outline:'none'}}
                placeholder="Neue Trainingsgruppe..." value={newSubgroupName} onChange={e=>setNewSubgroupName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addSubgroup()}/>
              <button onClick={addSubgroup} style={{padding:'11px 18px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={16}/> Gruppe
              </button>
            </div>
          )}

          {/* Gruppen-Liste */}
          <div style={{display:'grid',gap:'10px'}}>
            {subs.length===0
              ? <div style={{textAlign:'center',padding:'48px 20px',color:'rgba(255,255,255,0.2)',fontSize:'15px'}}>Noch keine Trainingsgruppen.</div>
              : subs.map(sub=>{
                const kids=getChildrenForSubgroup(sub.id);
                const presentToday=kids.filter(c=>(c.attendance||{})[trainingDate]==='present').length;
                const totalSess=(sub.trainingDates||[]).length;
                const totalPres=kids.reduce((s2,c)=>s2+getAttendanceStats(c.id,sub.id).present,0);
                const avgPct=kids.length>0&&totalSess>0?Math.round((totalPres/(kids.length*totalSess))*100):null;
                return (
                  <div key={sub.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'16px',overflow:'hidden',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(74,222,128,0.28)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(74,222,128,0.12)'}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',cursor:'pointer'}} onClick={()=>{setActiveSubgroup(sub);navTo('subgroup');}}>
                      <div style={{flex:1,minWidth:0}}>
                        <h3 style={{margin:'0 0 4px',color:'white',fontSize:'17px',fontWeight:'700'}}>{sub.name}</h3>
                        <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'500'}}>{kids.length} Kinder</span>
                          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'500'}}>{totalSess} Trainings</span>
                          {avgPct!==null&&<span style={{fontSize:'12px',fontWeight:'700',color:avgPct>=80?'#4ade80':avgPct>=60?'#fde68a':'#f87171'}}>Ø {avgPct}%</span>}
                          <span style={{fontSize:'12px',color:'rgba(74,222,128,0.6)',fontWeight:'600'}}>Heute: {presentToday} anwesend</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();exportSubgroupExcel(sub);}}
                          style={{padding:'6px 12px',background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.3)',borderRadius:'8px',color:'#4ade80',fontSize:'12px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
                          <Download size={13}/> Excel
                        </button>
                        {canEdit()&&<button onClick={e=>{e.stopPropagation();deleteSubgroup(sub.id);}}
                          style={{width:'32px',height:'32px',padding:0,background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'8px',cursor:'pointer',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <Trash2 size={14}/>
                        </button>}
                        <ChevronRight size={18} color="rgba(74,222,128,0.35)"/>
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    {avgPct!==null&&(
                      <div style={{height:'3px',background:'rgba(255,255,255,0.05)'}}>
                        <div style={{height:'100%',width:`${avgPct}%`,background:avgPct>=80?'linear-gradient(90deg,#16a34a,#4ade80)':avgPct>=60?'linear-gradient(90deg,#d97706,#fde68a)':'linear-gradient(90deg,#dc2626,#f87171)',transition:'width 0.6s ease'}}/>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    );
  }

  // ── UNTERGRUPPE ──────────────────────────────────────────────
  if (view==='subgroup') {
    const sub=subgroups[activeSubgroup.id]||activeSubgroup;
    const kids=getChildrenForSubgroup(sub.id);
    const allSubs=Object.values(subgroups);
    const totalPresent=kids.reduce((sum,c)=>sum+getAttendanceStats(c.id,sub.id).present,0);
    const totalSessions=(sub.trainingDates||[]).length;
    const avgPct=kids.length>0&&totalSessions>0?Math.round((totalPresent/(kids.length*totalSessions))*100):0;

    const DI = {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'14px',outline:'none'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>navTo('group')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:'0 0 1px',color:'rgba(74,222,128,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{activeGroup?.emoji} {activeGroup?.name}</p>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px',letterSpacing:'-0.3px'}}>{sub.name}</h2>
            </div>
            <div style={{display:'flex',gap:'8px',flexShrink:0}}>
              <button onClick={()=>exportSubgroupExcel(sub)}
                style={{padding:'8px 14px',background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.3)',borderRadius:'10px',color:'#4ade80',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
                <Download size={14}/> Excel
              </button>
              {canEdit()&&<button onClick={()=>deleteSubgroup(sub.id)}
                style={{width:'38px',height:'38px',padding:0,background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'10px',cursor:'pointer',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={15}/>
              </button>}
            </div>
          </div>

          {/* Statistik-Kacheln */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'24px'}}>
            {[
              {label:'Kinder',value:kids.length,color:'rgba(255,255,255,0.7)',bg:'rgba(255,255,255,0.06)',border:'rgba(255,255,255,0.1)'},
              {label:'Trainings',value:totalSessions,color:'rgba(255,255,255,0.7)',bg:'rgba(255,255,255,0.06)',border:'rgba(255,255,255,0.1)'},
              {label:'Ø Anwesenheit',value:`${avgPct}%`,color:avgPct>=80?'#4ade80':avgPct>=60?'#fde68a':'#f87171',bg:avgPct>=80?'rgba(74,222,128,0.08)':avgPct>=60?'rgba(253,230,138,0.08)':'rgba(248,113,113,0.08)',border:avgPct>=80?'rgba(74,222,128,0.2)':avgPct>=60?'rgba(253,230,138,0.2)':'rgba(248,113,113,0.2)'},
            ].map(({label,value,color,bg,border})=>(
              <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:'14px',padding:'14px 10px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'26px',fontWeight:'800',color,letterSpacing:'-0.5px'}}>{value}</p>
                <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Kind hinzufügen */}
          {canEdit()&&(
            <div style={{display:'flex',gap:'8px',marginBottom:'24px',paddingBottom:'24px',borderBottom:'1px solid rgba(74,222,128,0.08)'}}>
              <input style={{...DI,flex:1,padding:'11px 14px'}} placeholder="Kind hinzufügen..." value={newChildName} onChange={e=>setNewChildName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addChild()}/>
              <button onClick={addChild} style={{padding:'11px 18px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={16}/> Kind
              </button>
            </div>
          )}

          {/* Kinderliste */}
          <div style={{display:'grid',gap:'8px'}}>
            {kids.length===0
              ? <div style={{textAlign:'center',padding:'48px 20px',color:'rgba(255,255,255,0.2)',fontSize:'15px'}}>Noch keine Kinder. Oben hinzufügen!</div>
              : kids.map(child=>{
                const stats=getAttendanceStats(child.id,sub.id);
                const pct=stats.percent;
                return (
                  <div key={child.id} onClick={()=>{setActiveChild(child);navTo('childHistory');}}
                    style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:'14px',cursor:'pointer',transition:'all 0.12s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(74,222,128,0.07)';e.currentTarget.style.borderColor='rgba(74,222,128,0.22)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(74,222,128,0.1)';}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:'0 0 7px',fontWeight:'700',color:'white',fontSize:'15px'}}>{child.name}</p>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <div style={{flex:1,background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'7px',overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'linear-gradient(90deg,#16a34a,#4ade80)':pct>=60?'linear-gradient(90deg,#d97706,#fde68a)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:'99px'}}/>
                        </div>
                        <span style={{fontSize:'13px',fontWeight:'800',color:pct>=80?'#4ade80':pct>=60?'#fde68a':'#f87171',minWidth:'36px',textAlign:'right'}}>{pct}%</span>
                      </div>
                      <p style={{margin:'5px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>
                        {stats.present}/{stats.total} · {stats.excused}x entsch. · {stats.unexcused}x unentsch.
                      </p>
                    </div>
                    <ChevronRight size={16} color="rgba(74,222,128,0.3)"/>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    );
  }

  // ── SESSION ANWESENHEIT ──────────────────────────────────────
  if (view==='sessionAttendance') {
    const session = sessions[activeSession?.id] || activeSession;
    const sessionSubs = (session?.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
    const allKids = sessionSubs.flatMap(sub => getChildrenForSubgroup(sub.id));
    const sessionDate = session?.date;

    const setSessionStatus = (childId, subgroupId, status) => {
      ensureTrainingDate(subgroupId, sessionDate);
      const child = children[childId];
      const cur = (child.attendance||{})[sessionDate];
      const next = cur===status ? null : status;
      const att = { ...(child.attendance||{}), [sessionDate]: next };
      if (next===null) delete att[sessionDate];
      saveChildren({ ...children, [childId]: { ...child, attendance: att } });
    };

    const presentCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='present').length;
    const absentCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='absent_unexcused').length;
    const excusedCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='absent_excused').length;
    const openCount2 = allKids.length - presentCount - absentCount - excusedCount;

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>navTo('home')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:'0 0 1px',color:'rgba(74,222,128,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Anwesenheitserfassung</p>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:isMobile?'15px':'18px',letterSpacing:'-0.3px'}}>
                {new Date(sessionDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · {session?.time} Uhr
              </h2>
            </div>
          </div>

          {/* Gruppen-Tags + Info */}
          <div style={{marginBottom:'20px'}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
              {sessionSubs.map(sub=>{
                const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:grp?.color||'#4ade80',background:'rgba(74,222,128,0.08)',padding:'4px 12px',borderRadius:'20px',border:`1px solid rgba(74,222,128,0.2)`}}>{grp?.emoji} {sub.name}</span>;
              })}
            </div>
            {session?.trainer&&<p style={{margin:'0 0 4px',fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>👤 Trainer: {session.trainer}</p>}
            {session?.info&&<div style={{display:'flex',gap:'6px',padding:'10px 12px',background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'10px',marginTop:'8px'}}>
              <Info size={14} color="#93c5fd" style={{flexShrink:0,marginTop:'2px'}}/>
              <p style={{margin:0,fontSize:'13px',color:'#93c5fd'}}>{session.info}</p>
            </div>}
          </div>

          {/* Statistik */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'24px'}}>
            {[
              {label:'Anwesend',value:presentCount,color:'#4ade80',bg:'rgba(74,222,128,0.1)',border:'rgba(74,222,128,0.25)'},
              {label:'Unentsch.',value:absentCount,color:'rgba(255,255,255,0.5)',bg:'rgba(255,255,255,0.06)',border:'rgba(255,255,255,0.1)'},
              {label:'Entsch.',value:excusedCount,color:'#fde68a',bg:'rgba(253,230,138,0.08)',border:'rgba(253,230,138,0.2)'},
              {label:'Offen',value:openCount2,color:'rgba(255,255,255,0.3)',bg:'rgba(255,255,255,0.03)',border:'rgba(255,255,255,0.07)'},
            ].map(({label,value,color,bg,border})=>(
              <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:'12px',padding:'12px 8px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'24px',fontWeight:'800',color,letterSpacing:'-0.5px'}}>{value}</p>
                <p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Fortschritts-Leiste */}
          <div style={{marginBottom:'24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>Erfassungsfortschritt</span>
              <span style={{fontSize:'12px',fontWeight:'800',color:openCount2===0?'#4ade80':'rgba(255,255,255,0.5)'}}>{presentCount+absentCount+excusedCount}/{allKids.length}</span>
            </div>
            <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'6px',overflow:'hidden'}}>
              <div style={{width:`${allKids.length>0?Math.round(((presentCount+absentCount+excusedCount)/allKids.length)*100):0}%`,height:'100%',background:'linear-gradient(90deg,#16a34a,#4ade80)',borderRadius:'99px',transition:'width 0.4s ease'}}/>
            </div>
          </div>

          {/* Kinderliste */}
          <div style={{display:'grid',gap:'8px',marginBottom:'24px'}}>
            {allKids.length===0
              ? <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.2)'}}>Keine Kinder in den zugewiesenen Gruppen.</div>
              : allKids.map(child=>{
                const currentChild = children[child.id] || child;
                const status = (currentChild.attendance||{})[sessionDate];
                const parentResponse = getParentResponse(child.id, sessionDate);
                const parentExcused = parentResponse==='missing';
                const parentComing = parentResponse==='coming';
                const sub = subgroups[child.subgroupId];
                const cardBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_unexcused'?'rgba(255,255,255,0.04)':status==='absent_excused'?'rgba(253,230,138,0.06)':'rgba(255,255,255,0.03)';
                const cardBorder = status==='present'?'rgba(74,222,128,0.25)':status==='absent_unexcused'?'rgba(255,255,255,0.1)':status==='absent_excused'?'rgba(253,230,138,0.2)':parentExcused?'rgba(253,230,138,0.3)':parentComing?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.07)';
                return (
                  <div key={child.id} style={{padding:'13px 16px',borderRadius:'14px',background:cardBg,border:`1.5px solid ${cardBorder}`,transition:'border-color 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'100px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'2px'}}>
                          <p style={{margin:0,fontWeight:'700',color:'white',fontSize:'15px'}}>{child.name}</p>
                          {parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#fde68a',background:'rgba(253,230,138,0.12)',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(253,230,138,0.25)'}}>Eltern: abgemeldet</span>}
                          {parentComing&&<span style={{fontSize:'10px',fontWeight:'700',color:'#4ade80',background:'rgba(74,222,128,0.12)',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(74,222,128,0.25)'}}>Eltern: angemeldet</span>}
                        </div>
                        {sub&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{sub.name}</p>}
                      </div>
                      {/* 3 Anwesenheits-Buttons */}
                      <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'present')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='present'?'#16a34a':'rgba(74,222,128,0.25)'}`,background:status==='present'?'#16a34a':'rgba(74,222,128,0.08)',color:status==='present'?'white':'#4ade80',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>
                          <Check size={24}/>
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_unexcused')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='absent_unexcused'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.12)'}`,background:status==='absent_unexcused'?'rgba(107,114,128,0.7)':'rgba(255,255,255,0.05)',color:status==='absent_unexcused'?'white':'rgba(255,255,255,0.35)',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',transition:'all 0.12s'}}>
                          –
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_excused')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='absent_excused'?'#d97706':'rgba(253,230,138,0.2)'}`,background:status==='absent_excused'?'rgba(217,119,6,0.8)':'rgba(253,230,138,0.06)',color:status==='absent_excused'?'white':'#fde68a',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>
                          <Clock size={22}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Legende */}
          <div style={{display:'flex',gap:'16px',flexWrap:'wrap',padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',marginBottom:'16px'}}>
            <span style={{fontSize:'12px',color:'#4ade80',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Check size={13}/> Anwesend</span>
            <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>– Unentschuldigt</span>
            <span style={{fontSize:'12px',color:'#fde68a',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigt</span>
          </div>

          {/* Archiv-Button */}
          {canEdit()&&(()=>{
            const archivable = isSessionArchivable(session);
            return archivable ? (
              <button onClick={()=>{if(window.confirm('Dieses Training archivieren? Es verschwindet aus der Übersicht, die Anwesenheitsdaten bleiben erhalten.')) archiveSession(session); navTo('home');}}
                style={{width:'100%',padding:'13px',background:'rgba(55,65,81,0.4)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                <Archive size={16}/> Training archivieren
              </button>
            ) : (
              <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'12px'}}>
                ⏳ Archivieren möglich sobald alle {allKids.length} Kinder erfasst sind ({presentCount+absentCount+excusedCount}/{allKids.length})
              </p>
            );
          })()}
        </div>
      </div>
    );
  }

  // ── KIND VERLAUF ─────────────────────────────────────────────
  if (view==='childHistory') {
    const child=children[activeChild.id]||activeChild;
    const sub=subgroups[child.subgroupId];
    const grp=FIXED_GROUPS.find(g=>g.id===sub?.groupId);
    const dates=(sub?.trainingDates||[]).sort().reverse();
    const stats=getAttendanceStats(child.id,child.subgroupId);
    const allSubs=Object.values(subgroups);

    const setChildStatus = (date, status) => {
      ensureTrainingDate(child.subgroupId, date);
      const cur=(child.attendance||{})[date];
      const next=cur===status?null:status;
      const att={...(child.attendance||{}),[date]:next};
      if (next===null) delete att[date];
      saveChildren({...children,[child.id]:{...child,attendance:att}});
    };

    const DI2 = {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',padding:'8px 12px'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 90px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'16px 0 20px':'22px 0 28px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'24px'}}>
            <button onClick={()=>navTo('subgroup')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:'0 0 1px',color:'rgba(74,222,128,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{grp?.emoji} {grp?.name} · {sub?.name}</p>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px',letterSpacing:'-0.3px'}}>{child.name}</h2>
            </div>
            {canEdit()&&(
              <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                <button onClick={()=>setMoveChildId(moveChildId===child.id?null:child.id)}
                  style={{padding:'8px 12px',background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.25)',borderRadius:'10px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
                  <MoveRight size={13}/> Verschieben
                </button>
                <button onClick={()=>deleteChild(child.id)}
                  style={{width:'36px',height:'36px',padding:0,background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'10px',cursor:'pointer',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            )}
          </div>

          {/* Verschieben */}
          {moveChildId===child.id&&canEdit()&&(
            <div style={{marginBottom:'20px',padding:'14px 16px',background:'rgba(96,165,250,0.07)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'14px'}}>
              <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'700',color:'#93c5fd'}}>In welche Gruppe verschieben?</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                {allSubs.filter(sg=>sg.id!==child.subgroupId).map(sg=>{
                  const g=FIXED_GROUPS.find(f=>f.id===sg.groupId);
                  return <button key={sg.id} onClick={()=>moveChild(child.id,sg.id)}
                    style={{padding:'7px 14px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'8px',color:'#4ade80',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                    {g?.emoji} {sg.name}
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* Statistik */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'20px'}}>
            {[
              {label:'Trainings',value:stats.total,color:'rgba(255,255,255,0.7)',bg:'rgba(255,255,255,0.06)',border:'rgba(255,255,255,0.1)'},
              {label:'Anwesend',value:stats.present,color:'#4ade80',bg:'rgba(74,222,128,0.09)',border:'rgba(74,222,128,0.2)'},
              {label:'Unentsch.',value:stats.unexcused,color:'rgba(255,255,255,0.45)',bg:'rgba(255,255,255,0.05)',border:'rgba(255,255,255,0.08)'},
              {label:'Entsch.',value:stats.excused,color:'#fde68a',bg:'rgba(253,230,138,0.07)',border:'rgba(253,230,138,0.18)'},
            ].map(({label,value,color,bg,border})=>(
              <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:'12px',padding:'12px 6px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'22px',fontWeight:'800',color,letterSpacing:'-0.5px'}}>{value}</p>
                <p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.3)',fontWeight:'600'}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{marginBottom:'24px',padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span style={{fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.5)'}}>Anwesenheitsquote</span>
              <span style={{fontSize:'15px',fontWeight:'800',color:stats.percent>=80?'#4ade80':stats.percent>=60?'#fde68a':'#f87171'}}>{stats.percent}%</span>
            </div>
            <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'10px',overflow:'hidden'}}>
              <div style={{width:`${stats.percent}%`,height:'100%',background:stats.percent>=80?'linear-gradient(90deg,#16a34a,#4ade80)':stats.percent>=60?'linear-gradient(90deg,#d97706,#fde68a)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:'99px',transition:'width 0.6s ease'}}/>
            </div>
          </div>

          {/* Errungenschaften (Jugend) */}
          {grp?.id === 'jugend' && (()=>{
            const ach = getAchievements(child.id);
            const ttrUnlocked = ach.ttrUnlocked || [];
            const currentMonth = new Date().toISOString().slice(0,7);
            const currentLevel = getMonthlyAttendanceLevel(child.id, currentMonth);
            const cumul = getAttendanceCumulatives(child.id);
            const totalTrainings2 = getTotalTrainingsAttended(child.id);
            const streak2 = getLongestStreak(child.id);
            const tournParts2 = getTournamentParticipations(child.id);

            const Sec2 = ({title, children: ch}) => (
              <div style={{marginBottom:'12px'}}>
                <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'700',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{title}</p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>{ch}</div>
              </div>
            );

            const SmTile2 = ({icon,iconGray='⬜',label,sub2,has,activeBg='rgba(74,222,128,0.1)',activeBorder='rgba(74,222,128,0.3)',activeTextColor='#4ade80',onClick}) => (
              <button onClick={onClick}
                style={{padding:'7px 10px',borderRadius:'10px',border:`2px solid ${has?activeBorder:'rgba(255,255,255,0.08)'}`,background:has?activeBg:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',minWidth:'60px',transition:'transform 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.07)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{fontSize:'18px'}}>{has?icon:iconGray}</div>
                <div style={{fontSize:'10px',fontWeight:'700',color:has?activeTextColor:'rgba(255,255,255,0.2)',marginTop:'2px',lineHeight:'1.2'}}>{label}</div>
                {sub2&&<div style={{fontSize:'10px',fontWeight:'700',color:has?activeTextColor:'rgba(255,255,255,0.2)'}}>{sub2}</div>}
              </button>
            );

            const openP = (icon,title,desc,count) => setAchievementPopup({icon,title,desc,count});

            return (
              <div style={{marginBottom:'20px',padding:'16px',background:'rgba(253,230,138,0.04)',border:'1px solid rgba(253,230,138,0.14)',borderRadius:'16px'}}>
                <h4 style={{margin:'0 0 14px',color:'#fde68a',fontSize:'14px',fontWeight:'800',display:'flex',alignItems:'center',gap:'6px'}}>🏅 Errungenschaften</h4>
                <Sec2 title="TTR Meilensteine">
                  {TTR_MILESTONES.map((val,i)=>{
                    const unlocked=ttrUnlocked.includes(val);
                    const col=TTR_COLORS[i];
                    return <button key={val} onClick={()=>openP('🏓',`${val} TTR`,unlocked?ACHIEVEMENT_DESCRIPTIONS.ttr(val):`Ziel: ${val} TTR`)}
                      style={{padding:'5px 9px',borderRadius:'8px',border:`2px solid ${unlocked?col.bg:'rgba(255,255,255,0.08)'}`,background:unlocked?col.bg:'rgba(255,255,255,0.03)',color:unlocked?col.text:'rgba(255,255,255,0.2)',fontWeight:'700',fontSize:'11px',cursor:'pointer',transition:'transform 0.1s'}}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
                      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                      {unlocked?'🏓 ':''}{val}
                    </button>;
                  })}
                </Sec2>
                <Sec2 title="Trainings-Meilensteine">
                  {[10,25,50,100,200,500,1000].map(m=>{const has=totalTrainings2>=m;return <SmTile2 key={m} icon="🏋️" label={`${m}×`} sub2={has?'✓':`${totalTrainings2}/${m}`} has={has} activeBg="rgba(74,222,128,0.1)" activeBorder="rgba(74,222,128,0.3)" activeTextColor="#4ade80" onClick={()=>openP('🏋️',`${m} Trainings`,`Aktuell: ${totalTrainings2}.`)}/>;  })}
                  {[5,10,20,30,50].map(m=>{const has=streak2>=m;return <SmTile2 key={`s${m}`} icon="🔥" label={`${m}er`} sub2={has?'✓':`${streak2}/${m}`} has={has} activeBg="rgba(251,146,60,0.1)" activeBorder="rgba(251,146,60,0.3)" activeTextColor="#fb923c" onClick={()=>openP('🔥',`${m}er Serie`,`Längste Serie: ${streak2}.`)}/>;  })}
                </Sec2>
                <Sec2 title="Turnier-Teilnahmen">
                  {[1,5,10,20].map(m=>{const has=tournParts2>=m;return <SmTile2 key={m} icon="🏆" label={`${m}×`} sub2={has?'✓':`${tournParts2}/${m}`} has={has} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openP('🏆',`${m} Turniere`,`Bisher: ${tournParts2}.`)}/>;  })}
                </Sec2>
                <Sec2 title="Einzel">
                  {[{i:'🥇',f:'einzel1',d:ACHIEVEMENT_DESCRIPTIONS.einzel1},{i:'🥈',f:'einzel2',d:ACHIEVEMENT_DESCRIPTIONS.einzel2},{i:'🥉',f:'einzel3',d:ACHIEVEMENT_DESCRIPTIONS.einzel3}].map(({i,f,d})=>{const c=ach[f]||0;return <SmTile2 key={f} icon={i} label="Platz" sub2={c>0?`×${c}`:undefined} has={c>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openP(i,f,d,c)}/>;  })}
                </Sec2>
                <Sec2 title="Doppel">
                  {[{i:'🥇',f:'doppel1',d:ACHIEVEMENT_DESCRIPTIONS.doppel1},{i:'🥈',f:'doppel2',d:ACHIEVEMENT_DESCRIPTIONS.doppel2},{i:'🥉',f:'doppel3',d:ACHIEVEMENT_DESCRIPTIONS.doppel3}].map(({i,f,d})=>{const c=ach[f]||0;return <SmTile2 key={f} icon={i} label="Platz" sub2={c>0?`×${c}`:undefined} has={c>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openP(i,f,d,c)}/>;  })}
                </Sec2>
                <Sec2 title="Mannschaft & Auszeichnungen">
                  {[{i:'🏆',f:'team',d:ACHIEVEMENT_DESCRIPTIONS.team},{i:'⭐',f:'spielerDesMonats',d:'Spieler des Monats'}].map(({i,f,d})=>{const c=ach[f]||0;return <SmTile2 key={f} icon={i} label={f==='team'?'Meister':'Sp.d.M.'} sub2={c>0?`×${c}`:undefined} has={c>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openP(i,f==='team'?'Meisterschaft':'Spieler d.M.',d,c)}/>;  })}
                </Sec2>
              </div>
            );
          })()}

          {/* Trainings-Verlauf */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <h3 style={{margin:0,color:'white',fontSize:'16px',fontWeight:'800'}}>📋 Trainings-Verlauf</h3>
            {canEdit()&&<div style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'20px'}}>
              <Edit2 size={11} color="#93c5fd"/>
              <span style={{fontSize:'11px',color:'#93c5fd',fontWeight:'700'}}>Anpassbar</span>
            </div>}
          </div>
          <div style={{display:'grid',gap:'7px',marginBottom:'20px'}}>
            {dates.length===0
              ? <div style={{textAlign:'center',padding:'28px',color:'rgba(255,255,255,0.2)'}}>Noch keine Trainings erfasst.</div>
              : dates.map(date=>{
                const status=(child.attendance||{})[date];
                const cfg=STATUS_CONFIG[status];
                const parentResponse=getParentResponse(child.id, date);
                const parentExcused=parentResponse==='missing';
                const parentComing=parentResponse==='coming';
                const rowBg=status==='present'?'rgba(74,222,128,0.07)':status==='absent_excused'?'rgba(253,230,138,0.06)':status==='absent_unexcused'?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.025)';
                const rowBorder=status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(253,230,138,0.15)':'rgba(255,255,255,0.07)';
                return (
                  <div key={date} style={{padding:'11px 14px',background:rowBg,borderRadius:'10px',border:`1px solid ${rowBorder}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <p style={{margin:'0 0 3px',fontSize:'13px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>
                          {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                        </p>
                        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                          {parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#fde68a',background:'rgba(253,230,138,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(253,230,138,0.2)'}}>Eltern abgemeldet</span>}
                          {parentComing&&<span style={{fontSize:'10px',fontWeight:'700',color:'#4ade80',background:'rgba(74,222,128,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(74,222,128,0.2)'}}>Eltern angemeldet</span>}
                        </div>
                      </div>
                      {canEdit() ? (
                        <div style={{display:'flex',gap:'5px'}}>
                          <button onClick={()=>setChildStatus(date,'present')} style={{width:'34px',height:'34px',border:`2px solid ${status==='present'?'#16a34a':'rgba(74,222,128,0.2)'}`,background:status==='present'?'#16a34a':'rgba(74,222,128,0.06)',color:status==='present'?'white':'#4ade80',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={16}/></button>
                          <button onClick={()=>setChildStatus(date,'absent_unexcused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_unexcused'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.1)'}`,background:status==='absent_unexcused'?'rgba(107,114,128,0.6)':'rgba(255,255,255,0.04)',color:status==='absent_unexcused'?'white':'rgba(255,255,255,0.3)',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>–</button>
                          <button onClick={()=>setChildStatus(date,'absent_excused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_excused'?'#d97706':'rgba(253,230,138,0.2)'}`,background:status==='absent_excused'?'rgba(217,119,6,0.7)':'rgba(253,230,138,0.05)',color:status==='absent_excused'?'white':'#fde68a',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Clock size={15}/></button>
                        </div>
                      ) : (
                        <span style={{fontSize:'12px',fontWeight:'700',color:cfg?.color||'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.06)',padding:'4px 11px',borderRadius:'20px'}}>
                          {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Manuell hinzufügen */}
          {canEdit()&&(
            <div style={{padding:'16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px'}}>
              <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.4)'}}>Training manuell hinzufügen:</p>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)} style={{padding:'8px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',fontSize:'14px',color:'white',outline:'none'}}/>
                <div style={{display:'flex',gap:'5px'}}>
                  <button onClick={()=>setChildStatus(trainingDate,'present')} style={{padding:'8px 12px',background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.3)',borderRadius:'8px',color:'#4ade80',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Check size={13}/> Da</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_unexcused')} style={{padding:'8px 12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>– Unentsch.</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_excused')} style={{padding:'8px 12px',background:'rgba(253,230,138,0.08)',border:'1px solid rgba(253,230,138,0.2)',borderRadius:'8px',color:'#fde68a',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Clock size={13}/> Entsch.</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

