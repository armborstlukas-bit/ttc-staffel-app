  if (['eltern','jugendlich'].includes(userRole)) {
    const myChild=getMyChild();
    const sub=myChild?subgroups[myChild.subgroupId]:null;
    const grp=sub?FIXED_GROUPS.find(g=>g.id===sub.groupId):null;
    const dates=(sub?.trainingDates||[]).sort().reverse();
    const stats=myChild?getAttendanceStats(myChild.id,myChild.subgroupId):null;
    const mySessions=myChild&&sub ? getUpcomingSessionsForSubgroup(myChild.subgroupId) : [];

    const dateToSession = {};
    Object.values(sessions||{}).forEach(sess=>{
      if(sess.date) dateToSession[sess.date] = sess;
    });

    const hour = new Date().getHours();
    const greeting = hour<12?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
    const dateLabel = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const DARK_CARD = {
      background:'rgba(255,255,255,0.04)',
      border:'1px solid rgba(74,222,128,0.12)',
      borderRadius:'18px',
      padding:'18px 20px',
      marginBottom:'14px',
    };
    const DARK_CARD_YELLOW = {
      ...DARK_CARD,
      border:'1px solid rgba(253,230,138,0.15)',
      background:'rgba(253,230,138,0.03)',
    };
    const DARK_CARD_TEAL = {
      ...DARK_CARD,
      border:'1px solid rgba(20,184,166,0.2)',
      background:'rgba(20,184,166,0.04)',
    };
    const inputStyle = {padding:'10px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(134,239,172,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box'};
    const SECTION_LABEL = (color='rgba(74,222,128,0.45)') => ({color,fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 10px',display:'block'});

    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <AchievementPopup data={achievementPopup} onClose={()=>setAchievementPopup(null)}/>

        {/* Profil-Modal */}
        {showProfile&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}>
              <h3 style={{margin:'0 0 2px',color:'white',fontSize:'20px',fontWeight:'800'}}>Mein Profil</h3>
              <p style={{margin:'0 0 22px',color:'rgba(255,255,255,0.35)',fontSize:'13px'}}>{user?.email}</p>
              <h4 style={{margin:'0 0 10px',color:'#4ade80',fontSize:'13px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Passwort ändern</h4>
              {pwSuccess&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'10px',fontSize:'13px',color:'#4ade80',fontWeight:'600'}}>✅ Passwort erfolgreich geändert!</div>}
              {pwError&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',fontSize:'13px',color:'#fca5a5'}}>{pwError}</div>}
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px'}}>
                <input type="password" placeholder="Aktuelles Passwort" value={pwCurrent} onChange={e=>setPwCurrent(e.target.value)} style={inputStyle}/>
                <input type="password" placeholder="Neues Passwort (min. 6 Zeichen)" value={pwNew} onChange={e=>setPwNew(e.target.value)} style={inputStyle}/>
                <input type="password" placeholder="Neues Passwort bestätigen" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleChangePassword()} style={inputStyle}/>
                <button onClick={handleChangePassword} style={{padding:'11px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>Passwort ändern</button>
              </div>
              <button onClick={()=>{setShowProfile(false);setPwError('');setPwSuccess(false);setPwCurrent('');setPwNew('');setPwConfirm('');}}
                style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>Schließen</button>
            </div>
          </div>
        )}

        <div style={{maxWidth:'820px',margin:'0 auto',padding:'0 20px 60px'}}>

          {/* ── Top-Bar ── */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'22px 0 24px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(135deg,#15803d,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',boxShadow:'0 4px 16px rgba(74,222,128,0.25)'}}>🏓</div>
              <div>
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß Staffel</p>
                <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{userRole==='eltern'?'Eltern-Portal':'Jugend-Portal'}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {(()=>{const sel=(userProfile?.roles||[userRole]).filter(r=>r!=='pending');return sel.length>1?<button onClick={()=>setShowRolePicker(true)} style={{padding:'8px 13px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#86efac',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>👤 Rolle</button>:null;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px 13px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>⚙️ Profil</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px 13px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Abmelden</button>
            </div>
          </div>

          {/* ── Greeting ── */}
          <div style={{marginBottom:'32px'}}>
            <p style={{margin:'0 0 6px',color:'rgba(74,222,128,0.5)',fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase'}}>{dateLabel}</p>
            <h1 style={{margin:0,color:'white',fontSize:'32px',fontWeight:'800',letterSpacing:'-1px',lineHeight:1.1}}>
              {greeting}, <span style={{color:'#4ade80'}}>{myChild?myChild.name.split(' ')[0]:(userProfile?.name||'').split(' ')[0]||'Hallo'}</span> 👋
            </h1>
          </div>

          {/* ── Kind-Info (kompakt) ── */}
          {myChild && (
            <>
              <span style={SECTION_LABEL()}>Übersicht</span>
              <div style={{...DARK_CARD,marginBottom:'28px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px',marginBottom:'14px'}}>
                  <div>
                    <span style={{fontWeight:'800',fontSize:'18px',color:grp?.color||'#4ade80'}}>{myChild.name}</span>
                    <span style={{marginLeft:'10px',fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>{grp?.emoji} {grp?.name} · {sub?.name}</span>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {[
                      {label:'Gesamt',value:stats.total,color:'rgba(255,255,255,0.6)',bg:'rgba(255,255,255,0.07)'},
                      {label:'Anwesend',value:stats.present,color:'#4ade80',bg:'rgba(74,222,128,0.12)'},
                      {label:'Unentsch.',value:stats.unexcused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},
                      {label:'Entsch.',value:stats.excused,color:'#fde68a',bg:'rgba(253,230,138,0.1)'},
                    ].map(({label,value,color,bg})=>(
                      <div key={label} style={{background:bg,borderRadius:'10px',padding:'6px 12px',textAlign:'center',minWidth:'54px',border:'1px solid rgba(255,255,255,0.07)'}}>
                        <p style={{margin:0,fontSize:'16px',fontWeight:'800',color}}>{value}</p>
                        <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'rgba(255,255,255,0.4)'}}>Anwesenheitsquote</span>
                    <span style={{fontSize:'13px',fontWeight:'800',color:stats.percent>=80?'#4ade80':stats.percent>=60?'#fde68a':'#f87171'}}>{stats.percent}%</span>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'8px',overflow:'hidden'}}>
                    <div style={{width:`${stats.percent}%`,height:'100%',background:stats.percent>=80?'linear-gradient(90deg,#16a34a,#4ade80)':stats.percent>=60?'linear-gradient(90deg,#d97706,#fde68a)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:'99px',transition:'width 0.6s ease'}}/>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Benachrichtigungen ── */}
          {myChild && (()=>{
            const { active, trashed } = getCleanedNotifications(myChild.id);
            const showTrash = notifTab === 'trash';
            const items = showTrash ? trashed : active;
            return (
              <>
                <span style={SECTION_LABEL()}>Benachrichtigungen {active.length>0&&`(${active.length})`}</span>
                <div style={{...DARK_CARD,marginBottom:'28px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <Bell size={18} color="#4ade80"/>
                      <h3 style={{margin:0,color:'white',fontSize:'16px',fontWeight:'800'}}>Nachrichten</h3>
                      {active.length>0&&<span style={{background:'#16a34a',color:'white',borderRadius:'50%',width:'20px',height:'20px',fontSize:'11px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>{active.length}</span>}
                    </div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      <button onClick={()=>setNotifTab('inbox')} style={{padding:'5px 13px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:notifTab==='inbox'?'#16a34a':'rgba(255,255,255,0.07)',color:notifTab==='inbox'?'white':'rgba(255,255,255,0.5)'}}>Posteingang</button>
                      <button onClick={()=>setNotifTab('trash')} style={{padding:'5px 13px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:notifTab==='trash'?'#374151':'rgba(255,255,255,0.07)',color:notifTab==='trash'?'white':'rgba(255,255,255,0.5)'}}>🗑️ Papierkorb {trashed.length>0&&`(${trashed.length})`}</button>
                      <button onClick={()=>setShowParentCompose(v=>!v)} style={{padding:'5px 13px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:showParentCompose?'#7c3aed':'rgba(255,255,255,0.07)',color:showParentCompose?'white':'rgba(255,255,255,0.5)'}}>✉️ Schreiben</button>
                    </div>
                  </div>

                  {showParentCompose&&(
                    <div style={{background:'rgba(124,58,237,0.1)',borderRadius:'12px',padding:'14px',marginBottom:'14px',border:'1px solid rgba(124,58,237,0.25)',display:'grid',gap:'8px'}}>
                      <p style={{margin:0,fontSize:'13px',fontWeight:'700',color:'#c4b5fd'}}>✉️ Nachricht an Trainer schreiben</p>
                      <input value={parentMsgTitle} onChange={e=>setParentMsgTitle(e.target.value)} placeholder="Betreff" style={inputStyle}/>
                      <textarea value={parentMsgText} onChange={e=>setParentMsgText(e.target.value)} placeholder="Ihre Nachricht..." rows={3} style={{...inputStyle,resize:'vertical'}}/>
                      <div style={{display:'flex',gap:'8px'}}>
                        <button onClick={sendParentMessage} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><Send size={14}/> Senden</button>
                        <button onClick={()=>{setShowParentCompose(false);setParentMsgTitle('');setParentMsgText('');}} style={{flex:1,padding:'10px',background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>Abbrechen</button>
                      </div>
                    </div>
                  )}

                  {items.length === 0
                    ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>{showTrash?'Papierkorb ist leer.':'Keine Nachrichten.'}</p>
                    : <div style={{display:'grid',gap:'8px'}}>
                        {items.map(n=>{
                          const typeColors = {
                            achievement:         {bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.25)',  icon:'🏅'},
                            tournament_reminder: {bg:'rgba(253,230,138,0.08)', border:'rgba(253,230,138,0.25)', icon:'🏆'},
                            training_reminder:   {bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.25)',  icon:'📅'},
                            unexcused_absences:  {bg:'rgba(248,113,113,0.08)', border:'rgba(248,113,113,0.25)', icon:'❗'},
                            trainer_message:     {bg:'rgba(196,181,253,0.08)', border:'rgba(196,181,253,0.25)', icon:'💬'},
                          };
                          const cfg2 = typeColors[n.type] || {bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)',icon:'🔔'};
                          const dateStr = new Date(n.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                          return (
                            <div key={n.id} style={{background:cfg2.bg,border:`1px solid ${cfg2.border}`,borderRadius:'12px',padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:'10px'}}>
                              <span style={{fontSize:'20px',flexShrink:0,marginTop:'1px'}}>{cfg2.icon}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <p style={{margin:'0 0 3px',fontWeight:'700',fontSize:'14px',color:'white'}}>{n.title}</p>
                                <p style={{margin:'0 0 5px',fontSize:'13px',color:'rgba(255,255,255,0.55)',lineHeight:'1.4'}}>{n.message}</p>
                                <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>{dateStr}</p>
                              </div>
                              {showTrash
                                ? <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                                    <button onClick={()=>restoreNotification(n.id)} title="Wiederherstellen" style={{padding:'5px 9px',background:'rgba(74,222,128,0.12)',border:'none',borderRadius:'8px',cursor:'pointer',color:'#4ade80',fontSize:'13px',fontWeight:'700'}}>↩</button>
                                    <button onClick={()=>deleteNotificationPermanently(n.id)} title="Endgültig löschen" style={{padding:'5px',background:'rgba(220,38,38,0.12)',border:'none',borderRadius:'8px',cursor:'pointer',color:'#f87171'}}><Trash2 size={14}/></button>
                                  </div>
                                : <button onClick={()=>trashNotification(n.id)} title="In Papierkorb" style={{padding:'5px',background:'rgba(255,255,255,0.06)',border:'none',borderRadius:'8px',cursor:'pointer',color:'rgba(255,255,255,0.3)',flexShrink:0}}><X size={16}/></button>
                              }
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </>
            );
          })()}

          {!myChild
            ? <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}>
                <p style={{fontSize:'18px',color:'rgba(255,255,255,0.5)',margin:'0 0 8px'}}>Dein Account ist noch keinem Kind zugeordnet.</p>
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:'14px',margin:0}}>Bitte wende dich an den Trainer oder Admin.</p>
              </div>
            : <>

              {/* ── Kommende Trainings ── */}
              <span style={SECTION_LABEL()}>Kommende Trainings</span>
              <div style={{...DARK_CARD,marginBottom:'28px',border:'1px solid rgba(74,222,128,0.18)'}}>
                <h3 style={{margin:'0 0 16px',color:'#4ade80',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}><Calendar size={18}/> Kommende 10 Trainings</h3>
                {mySessions.length===0
                  ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>Kein Training geplant.</p>
                  : <div style={{display:'grid',gap:'10px'}}>
                    {mySessions.slice(0,10).map(session=>{
                      const childId=myChild.id;
                      const myResponse=(session.responses||{})[childId];
                      const sessSubIds = session.subgroupIds||[];
                      const sessGrpNames = [...new Set(sessSubIds.map(sid=>{
                        const sg=subgroups[sid]; const fg=sg?FIXED_GROUPS.find(g=>g.id===sg.groupId):null;
                        return fg?`${fg.emoji} ${fg.name}`:null;
                      }).filter(Boolean))];
                      const isComing = myResponse==='coming';
                      const isMissing = myResponse==='missing';
                      return (
                        <div key={session.id} style={{padding:'14px 16px',borderRadius:'14px',border:`1px solid ${isComing?'rgba(74,222,128,0.3)':isMissing?'rgba(248,113,113,0.3)':'rgba(255,255,255,0.08)'}`,background:isComing?'rgba(74,222,128,0.07)':isMissing?'rgba(248,113,113,0.07)':'rgba(255,255,255,0.025)'}}>
                          <div style={{marginBottom:'12px'}}>
                            <p style={{margin:'0 0 3px',fontWeight:'700',color:'white',fontSize:'15px'}}>
                              {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · {session.time} Uhr
                            </p>
                            {sessGrpNames.length>0&&<p style={{margin:'0 0 2px',fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>📂 {sessGrpNames.join(', ')}</p>}
                            {session.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>👤 {session.trainer}</p>}
                            {session.info&&<div style={{display:'flex',alignItems:'flex-start',gap:'6px',marginTop:'8px',padding:'8px 10px',background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'8px'}}><Info size={14} color="#93c5fd" style={{marginTop:'2px',flexShrink:0}}/><p style={{margin:0,fontSize:'13px',color:'#93c5fd'}}>{session.info}</p></div>}
                          </div>
                          <div style={{display:'flex',gap:'8px'}}>
                            <button onClick={()=>respondToSession(session.id,'coming')}
                              style={{flex:1,padding:'10px',border:`2px solid #16a34a`,background:isComing?'#16a34a':'transparent',color:isComing?'white':'#4ade80',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all 0.12s'}}>
                              <Check size={18}/> Ich komme
                            </button>
                            <button onClick={()=>respondToSession(session.id,'missing')}
                              style={{flex:1,padding:'10px',border:`2px solid #dc2626`,background:isMissing?'#dc2626':'transparent',color:isMissing?'white':'#f87171',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all 0.12s'}}>
                              <X size={18}/> Ich fehle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>

              {/* ── Trainings-Verlauf ── */}
              <span style={SECTION_LABEL()}>Verlauf</span>
              <div style={{...DARK_CARD,marginBottom:'28px'}}>
                <button onClick={()=>setShowTrainingHistory(v=>!v)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',padding:0,margin:0}}>
                  <h3 style={{margin:0,color:'white',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}>📋 Trainings-Verlauf
                    {dates.length>0&&<span style={{fontSize:'12px',fontWeight:'500',color:'rgba(255,255,255,0.35)',fontFamily:'sans-serif'}}>({dates.length} Einträge)</span>}
                  </h3>
                  <span style={{fontSize:'18px',color:'rgba(74,222,128,0.5)',transform:showTrainingHistory?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s',lineHeight:1}}>▾</span>
                </button>
                {showTrainingHistory&&(
                  <div style={{display:'grid',gap:'8px',marginTop:'16px'}}>
                    {dates.length===0
                      ? <p style={{color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'20px',margin:0}}>Noch keine Trainings erfasst.</p>
                      : dates.map(date=>{
                        const status=(myChild.attendance||{})[date];
                        const cfg=STATUS_CONFIG[status];
                        const sess2 = dateToSession[date];
                        const sessSubIds = sess2?.subgroupIds||[];
                        const grpNames = [...new Set(sessSubIds.map(sid=>{
                          const sg=subgroups[sid]; const fg=sg?FIXED_GROUPS.find(g=>g.id===sg.groupId):null;
                          return fg?`${fg.emoji} ${fg.name}`:null;
                        }).filter(Boolean))];
                        const statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(253,230,138,0.07)':status==='absent_unexcused'?'rgba(248,113,113,0.07)':'rgba(255,255,255,0.03)';
                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(253,230,138,0.15)':status==='absent_unexcused'?'rgba(248,113,113,0.15)':'rgba(255,255,255,0.07)';
                        return (
                          <div key={date} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:statusBg,borderRadius:'10px',border:`1px solid ${statusBorder}`,gap:'8px',flexWrap:'wrap'}}>
                            <div>
                              <span style={{fontSize:'14px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>
                                {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                              </span>
                              {grpNames.length>0&&<span style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'1px'}}>📂 {grpNames.join(', ')}</span>}
                            </div>
                            <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                              <span style={{fontSize:'13px',fontWeight:'700',color:cfg?.color||'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.06)',padding:'4px 12px',borderRadius:'20px',border:`1px solid rgba(255,255,255,0.1)`}}>
                                {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                              </span>
                              {status==='absent_unexcused'&&(
                                <button onClick={()=>excuseMyChild(date)} style={{padding:'6px 12px',background:'rgba(253,230,138,0.12)',border:'1px solid rgba(253,230,138,0.25)',borderRadius:'8px',cursor:'pointer',color:'#fde68a',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigen</button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>

              {/* ── Mannschaftsspiele ── */}
              {appSettings.mannschaftEnabled&&(()=>{
                const myTeam = Object.values(teams).find(t=>(t.childIds||[]).includes(myChild.id));
                const today = new Date().toISOString().split('T')[0];
                const upcomingMds = myTeam
                  ? Object.values(matchdays).filter(m=>m.teamId===myTeam.id && m.date>=today).sort((a,b)=>a.date.localeCompare(b.date))
                  : [];
                return (
                  <>
                    <span style={SECTION_LABEL('rgba(20,184,166,0.5)')}>Mannschaft</span>
                    <div style={{...DARK_CARD_TEAL,marginBottom:'28px'}}>
                      <h3 style={{margin:'0 0 16px',color:'#2dd4bf',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}>⚽ Mannschaftsspiele{myTeam&&<span style={{fontSize:'13px',fontWeight:'500',color:'rgba(255,255,255,0.35)'}}>· {myTeam.name}</span>}</h3>
                      {!myTeam
                        ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>Keine Mannschaft zugeordnet.</p>
                        : upcomingMds.length===0
                          ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>Kein Spiel in den nächsten Wochen.</p>
                          : <div style={{display:'grid',gap:'12px'}}>
                              {upcomingMds.map(md=>{
                                const myResp = (md.responses||{})[myChild.id];
                                const isPostponed = !!md.postponement;
                                const dateStr = new Date(md.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
                                const borderCol = myResp==='yes'?'rgba(74,222,128,0.4)':myResp==='no'?'rgba(248,113,113,0.4)':'rgba(20,184,166,0.25)';
                                const bgCol = myResp==='yes'?'rgba(74,222,128,0.07)':myResp==='no'?'rgba(248,113,113,0.07)':isPostponed?'rgba(251,146,60,0.07)':'rgba(20,184,166,0.04)';
                                return (
                                  <div key={md.id} style={{borderRadius:'14px',border:`2px solid ${borderCol}`,background:bgCol,overflow:'hidden'}}>
                                    <div style={{padding:'14px 16px'}}>
                                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'6px'}}>
                                        <span style={{fontWeight:'800',color:'#2dd4bf',fontSize:'15px'}}>
                                          {md.isHome?'🏠 Heim':'🚌 Auswärts'}{md.opponent?` · ${md.opponent}`:''}
                                        </span>
                                        {isPostponed&&<span style={{fontSize:'11px',background:'rgba(251,146,60,0.2)',color:'#fb923c',padding:'2px 8px',borderRadius:'10px',fontWeight:'700'}}>⏳ Verlegungsabfrage</span>}
                                        {md.result&&<span style={{fontSize:'12px',background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.6)',padding:'2px 8px',borderRadius:'10px',fontWeight:'600'}}>Ergebnis: {md.result}</span>}
                                      </div>
                                      <p style={{margin:'0 0 2px',fontSize:'14px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>{dateStr} · {md.time} Uhr</p>
                                      {md.location&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>📍 {md.location}</p>}
                                      {md.meetingPoint&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>🚗 Treffpunkt: {md.meetingPoint}{md.meetingTime?` · ${md.meetingTime} Uhr`:''}</p>}
                                    </div>
                                    {isPostponed&&md.postponement.confirmedOption==null&&(
                                      <div style={{padding:'12px 16px',borderTop:'1px solid rgba(251,146,60,0.2)',background:'rgba(251,146,60,0.05)'}}>
                                        <p style={{margin:'0 0 8px',fontSize:'13px',fontWeight:'700',color:'#fb923c'}}>📅 Verlegung: Welcher Termin passt?</p>
                                        {md.postponement.reason&&<p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(251,146,60,0.7)'}}>{md.postponement.reason}</p>}
                                        <div style={{display:'grid',gap:'6px'}}>
                                          {(md.postponement.options||[]).map((opt,i)=>{
                                            const myVotes = (md.postponement.responses||{})[myChild.id]||[];
                                            const voted = myVotes.includes(i);
                                            const optDate = new Date(opt.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
                                            return (
                                              <button key={i} onClick={()=>{
                                                const cur = (md.postponement.responses||{})[myChild.id]||[];
                                                const next = voted?cur.filter(x=>x!==i):[...cur,i];
                                                saveMatchdays({...matchdays,[md.id]:{...md,postponement:{...md.postponement,responses:{...(md.postponement.responses||{}),[myChild.id]:next}}}});
                                              }}
                                                style={{padding:'9px 14px',borderRadius:'9px',border:`2px solid ${voted?'#fb923c':'rgba(251,146,60,0.2)'}`,background:voted?'rgba(251,146,60,0.15)':'transparent',color:voted?'#fb923c':'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px',textAlign:'left',transition:'all 0.12s'}}>
                                                {voted?'✅ ':'⬜ '}{optDate} · {opt.time} Uhr
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {isPostponed&&md.postponement.confirmedOption!=null&&(
                                      <div style={{padding:'10px 16px',borderTop:'1px solid rgba(74,222,128,0.15)',background:'rgba(74,222,128,0.07)',fontSize:'13px',color:'#4ade80',fontWeight:'700'}}>
                                        ✅ Neuer Termin: {(()=>{const o=md.postponement.options[md.postponement.confirmedOption];return `${new Date(o.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})} · ${o.time} Uhr`;})()}
                                      </div>
                                    )}
                                    {!isPostponed&&(
                                      <div style={{padding:'12px 16px',borderTop:`1px solid ${borderCol}`,display:'flex',gap:'8px'}}>
                                        <button onClick={()=>saveMatchdays({...matchdays,[md.id]:{...md,responses:{...(md.responses||{}),[myChild.id]:'yes'}}})}
                                          style={{flex:1,padding:'9px',border:`2px solid #16a34a`,background:myResp==='yes'?'#16a34a':'transparent',color:myResp==='yes'?'white':'#4ade80',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'13px',transition:'all 0.12s'}}>
                                          ✅ Ich bin dabei
                                        </button>
                                        <button onClick={()=>saveMatchdays({...matchdays,[md.id]:{...md,responses:{...(md.responses||{}),[myChild.id]:'no'}}})}
                                          style={{flex:1,padding:'9px',border:`2px solid #dc2626`,background:myResp==='no'?'#dc2626':'transparent',color:myResp==='no'?'white':'#f87171',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'13px',transition:'all 0.12s'}}>
                                          ❌ Ich fehle
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                      }
                    </div>
                  </>
                );
              })()}

              {/* ── Kommende Turniere ── */}
              {(()=>{
                const myTournaments = getMyUpcomingTournaments();
                return (
                  <>
                    <span style={SECTION_LABEL('rgba(253,230,138,0.45)')}>Turniere</span>
                    <div style={{...DARK_CARD_YELLOW,marginBottom:'28px'}}>
                      <h3 style={{margin:'0 0 16px',color:'#fde68a',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}><Trophy size={18}/> Kommende Turniere</h3>
                      {myTournaments.length===0
                        ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>Kein Turnier in den nächsten 3 Monaten.</p>
                        : <div style={{display:'grid',gap:'12px'}}>
                          {myTournaments.map(t=>{
                            const childId = myChild.id;
                            const myResponse = (t.responses||{})[childId];
                            const myKonkurrenzen = (t.konkurrenzen||[]).filter(k=>(k.participantIds||[]).includes(childId));
                            const borderCol = myResponse==='coming'?'rgba(74,222,128,0.4)':myResponse==='missing'?'rgba(248,113,113,0.4)':'rgba(253,230,138,0.25)';
                            const bgCol = myResponse==='coming'?'rgba(74,222,128,0.07)':myResponse==='missing'?'rgba(248,113,113,0.07)':'rgba(253,230,138,0.04)';
                            return (
                              <div key={t.id} style={{borderRadius:'14px',border:`2px solid ${borderCol}`,background:bgCol,overflow:'hidden'}}>
                                <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(253,230,138,0.1)'}}>
                                  <p style={{margin:'0 0 3px',fontWeight:'800',color:'#fde68a',fontSize:'16px'}}>🏆 {t.name}</p>
                                  <p style={{margin:'0 0 3px',fontSize:'14px',color:'rgba(255,255,255,0.6)',fontWeight:'600'}}>
                                    {(()=>{
                                      const from=t.dateFrom||t.date||''; const to=t.dateTo||from;
                                      if(!from) return '';
                                      const f=new Date(from+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
                                      if(to===from) return f;
                                      return `${f} – ${new Date(to+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}`;
                                    })()}
                                  </p>
                                  {t.location&&<p style={{margin:0,fontSize:'13px',color:'rgba(253,230,138,0.5)'}}>📍 {t.location}</p>}
                                </div>
                                {myKonkurrenzen.length>0&&(
                                  <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(253,230,138,0.1)',display:'grid',gap:'6px'}}>
                                    {myKonkurrenzen.map(konk=>{
                                      const dep = konk.departureTimes?.[childId];
                                      return (
                                        <div key={konk.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'rgba(253,230,138,0.07)',borderRadius:'8px'}}>
                                          <span style={{fontWeight:'700',color:'#fde68a',fontSize:'14px'}}>{konk.name||'Konkurrenz'}</span>
                                          <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                                            <span style={{fontSize:'13px',color:'rgba(253,230,138,0.6)',display:'inline-flex',alignItems:'center',gap:'3px'}}><Clock size={12}/> {konk.time} Uhr</span>
                                            {dep&&<span style={{fontSize:'13px',color:'#fde68a',fontWeight:'700',display:'inline-flex',alignItems:'center',gap:'3px'}}>🚗 {dep} Uhr</span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div style={{padding:'12px 16px',display:'flex',gap:'8px'}}>
                                  <button onClick={()=>respondToTournament(t.id,'coming')}
                                    style={{flex:1,padding:'10px',border:'2px solid #16a34a',background:myResponse==='coming'?'#16a34a':'transparent',color:myResponse==='coming'?'white':'#4ade80',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all 0.12s'}}>
                                    <Check size={18}/> Ich bin dabei
                                  </button>
                                  <button onClick={()=>respondToTournament(t.id,'missing')}
                                    style={{flex:1,padding:'10px',border:'2px solid #dc2626',background:myResponse==='missing'?'#dc2626':'transparent',color:myResponse==='missing'?'white':'#f87171',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all 0.12s'}}>
                                    <X size={18}/> Ich fehle
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>}
                    </div>
                  </>
                );
              })()}

              {/* ── Errungenschaften (nur Jugend) ── */}
              {grp?.id === 'jugend' && (()=>{
                const ach = getAchievements(myChild.id);
                const ttrUnlocked = ach.ttrUnlocked || [];
                const currentMonth = new Date().toISOString().slice(0,7);
                const currentLevel = getMonthlyAttendanceLevel(myChild.id, currentMonth);
                const cumul = getAttendanceCumulatives(myChild.id);
                const monthName = new Date().toLocaleDateString('de-DE',{month:'long',year:'numeric'});
                const totalTrainings = getTotalTrainingsAttended(myChild.id);
                const streak = getLongestStreak(myChild.id);
                const tournParts = getTournamentParticipations(myChild.id);

                const Sec = ({title,children:ch,mb=true}) => (
                  <div style={{marginBottom:mb?'18px':0}}>
                    <p style={{margin:'0 0 8px',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'1px solid rgba(255,255,255,0.06)',paddingBottom:'5px'}}>{title}</p>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>{ch}</div>
                  </div>
                );

                const Tile = ({icon,iconGray='⬜',label,sub,has,activeBg='rgba(74,222,128,0.1)',activeBorder='rgba(74,222,128,0.3)',activeTextColor='#4ade80',onClick}) => (
                  <button onClick={onClick}
                    style={{padding:'10px 12px',borderRadius:'12px',border:`2px solid ${has?activeBorder:'rgba(255,255,255,0.08)'}`,background:has?activeBg:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',minWidth:'76px',maxWidth:'100px',transition:'transform 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                    <div style={{fontSize:'22px'}}>{has?icon:iconGray}</div>
                    <div style={{fontSize:'11px',fontWeight:'700',color:has?activeTextColor:'rgba(255,255,255,0.2)',marginTop:'2px',lineHeight:'1.2'}}>{label}</div>
                    {sub&&<div style={{fontSize:'12px',fontWeight:'700',color:has?activeTextColor:'rgba(255,255,255,0.2)'}}>{sub}</div>}
                  </button>
                );

                const openCount = (icon,title,desc,count) => setAchievementPopup({icon,title,desc,count});

                return (
                  <>
                    <span style={SECTION_LABEL('rgba(253,230,138,0.45)')}>Errungenschaften</span>
                    <div style={DARK_CARD}>
                      <button onClick={()=>setShowAchievements(v=>!v)}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',padding:0,margin:'0 0 '+(showAchievements?'18px':'0')}}>
                        <h3 style={{margin:0,color:'white',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}>🏅 Errungenschaften</h3>
                        <span style={{fontSize:'18px',color:'rgba(253,230,138,0.5)',transform:showAchievements?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s',lineHeight:1}}>▾</span>
                      </button>

                      {showAchievements&&<>
                      <Sec title="🏓 TTR Meilensteine">
                        {TTR_MILESTONES.map((val,i)=>{
                          const unlocked = ttrUnlocked.includes(val);
                          const col = TTR_COLORS[i];
                          return (
                            <button key={val}
                              onClick={()=>setAchievementPopup({icon:unlocked?'🏓':'🔒',title:`${val} TTR`,desc:unlocked?ACHIEVEMENT_DESCRIPTIONS.ttr(val):`Noch nicht erreicht. Erreiche ${val} TTR-Punkte!`})}
                              style={{padding:'8px 10px',borderRadius:'10px',border:`2px solid ${unlocked?col.bg:'rgba(255,255,255,0.08)'}`,background:unlocked?col.bg:'rgba(255,255,255,0.03)',color:unlocked?col.text:'rgba(255,255,255,0.2)',fontWeight:'700',fontSize:'12px',cursor:'pointer',minWidth:'54px',transition:'transform 0.1s'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
                              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                              {unlocked?'🏓 ':''}{val}
                            </button>
                          );
                        })}
                      </Sec>

                      <Sec title="📅 Trainings-Meilensteine">
                        {[10,25,50,100,200,500,1000].map(m=>{
                          const has = totalTrainings>=m;
                          return <Tile key={m} icon="🏋️" label={`${m} Trainings`} sub={has?`✓`:`${totalTrainings}/${m}`}
                            has={has} activeBg="rgba(74,222,128,0.1)" activeBorder="rgba(74,222,128,0.3)" activeTextColor="#4ade80"
                            onClick={()=>setAchievementPopup({icon:'🏋️',title:`${m} Trainings`,desc:`Du hast insgesamt ${m} Trainingseinheiten absolviert! Aktuell: ${totalTrainings} Trainings.`})}/>;
                        })}
                        {[5,10,20,30,50].map(m=>{
                          const has = streak>=m;
                          return <Tile key={`str${m}`} icon="🔥" label={`${m}× Serie`} sub={has?'✓':`${streak}/${m}`}
                            has={has} activeBg="rgba(251,146,60,0.1)" activeBorder="rgba(251,146,60,0.3)" activeTextColor="#fb923c"
                            onClick={()=>setAchievementPopup({icon:'🔥',title:`${m}er Trainingsserie`,desc:`${m} Trainingseinheiten in Folge ohne Fehlzeit! Deine längste Serie: ${streak} Einheiten.`})}/>;
                        })}
                      </Sec>

                      <Sec title="🏆 Turnier-Teilnahmen">
                        {[1,5,10,20].map(m=>{
                          const has = tournParts>=m;
                          return <Tile key={m} icon="🏆" label={`${m} Turnier${m>1?'e':''}`} sub={has?'✓':`${tournParts}/${m}`}
                            has={has} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a"
                            onClick={()=>setAchievementPopup({icon:'🏆',title:`${m} Turnier${m>1?'e':''}`,desc:`Du hast an ${m} Turnier${m>1?'en':''} teilgenommen! Bisher: ${tournParts}.`})}/>;
                        })}
                      </Sec>

                      <Sec title="🥊 Turnierergebnisse Einzel">
                        {[
                          {icon:'🥇',label:'1. Platz',field:'einzel1',desc:ACHIEVEMENT_DESCRIPTIONS.einzel1},
                          {icon:'🥈',label:'2. Platz',field:'einzel2',desc:ACHIEVEMENT_DESCRIPTIONS.einzel2},
                          {icon:'🥉',label:'3. Platz',field:'einzel3',desc:ACHIEVEMENT_DESCRIPTIONS.einzel3},
                        ].map(({icon,label,field,desc})=>{
                          const count=ach[field]||0;
                          return <Tile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                            has={count>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a"
                            onClick={()=>openCount(icon,label,desc,count)}/>;
                        })}
                      </Sec>

                      <Sec title="🤝 Turnierergebnisse Doppel">
                        {[
                          {icon:'🥇',label:'1. Platz',field:'doppel1',desc:ACHIEVEMENT_DESCRIPTIONS.doppel1},
                          {icon:'🥈',label:'2. Platz',field:'doppel2',desc:ACHIEVEMENT_DESCRIPTIONS.doppel2},
                          {icon:'🥉',label:'3. Platz',field:'doppel3',desc:ACHIEVEMENT_DESCRIPTIONS.doppel3},
                        ].map(({icon,label,field,desc})=>{
                          const count=ach[field]||0;
                          return <Tile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                            has={count>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a"
                            onClick={()=>openCount(icon,label,desc,count)}/>;
                        })}
                      </Sec>

                      <Sec title="🏅 Mannschaft & Auszeichnungen">
                        {[
                          {icon:'🏆',label:'Meisterschaft',field:'team',desc:ACHIEVEMENT_DESCRIPTIONS.team},
                          {icon:'⭐',label:'Spieler d. M.',field:'spielerDesMonats',desc:'Du wurdest zum Spieler des Monats gewählt! Eine besondere Auszeichnung vom Trainer.'},
                        ].map(({icon,label,field,desc})=>{
                          const count=ach[field]||0;
                          return <Tile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                            has={count>0} activeBg="rgba(253,230,138,0.1)"
                            activeBorder={field==='spielerDesMonats'?'rgba(253,211,77,0.4)':'rgba(253,230,138,0.3)'}
                            activeTextColor="#fde68a"
                            onClick={()=>openCount(icon,label,desc,count)}/>;
                        })}
                      </Sec>

                      <Sec title={`📆 Anwesenheit ${monthName}`}>
                        {(()=>{
                          const attCfgMap = {
                            gold:  {icon:'🥇',color:'#fde68a',bg:'rgba(253,230,138,0.15)',border:'rgba(253,230,138,0.4)',label:'Gold (100%)'},
                            silver:{icon:'🥈',color:'rgba(255,255,255,0.6)',bg:'rgba(255,255,255,0.08)',border:'rgba(255,255,255,0.2)',label:'Silber (≥90%)'},
                            bronze:{icon:'🥉',color:'#fb923c',bg:'rgba(251,146,60,0.12)',border:'rgba(251,146,60,0.3)',label:'Bronze (≥80%)'},
                          };
                          const cfg3 = currentLevel ? attCfgMap[currentLevel] : null;
                          return (
                            <button onClick={()=>setAchievementPopup({icon:cfg3?cfg3.icon:'📅',title:monthName,desc:cfg3?ACHIEVEMENT_DESCRIPTIONS[`attendance${cfg3.label.split(' ')[0].charAt(0).toUpperCase()+cfg3.label.split(' ')[0].slice(1)}`]||cfg3.label:'Noch nicht genug Trainings besucht (mind. 80% für Bronze).'})}
                              style={{padding:'10px 14px',borderRadius:'12px',border:`2px solid ${cfg3?cfg3.border:'rgba(255,255,255,0.08)'}`,background:cfg3?cfg3.bg:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',minWidth:'100px'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
                              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                              <div style={{fontSize:'26px'}}>{cfg3?cfg3.icon:'⬜'}</div>
                              <div style={{fontSize:'12px',fontWeight:'700',color:cfg3?cfg3.color:'rgba(255,255,255,0.2)',marginTop:'2px'}}>{cfg3?cfg3.label:'Kein Rang'}</div>
                            </button>
                          );
                        })()}
                      </Sec>

                      <Sec title="📊 Anwesenheits-Monate (Gesamt)" mb={false}>
                        {[
                          {icon:'🥇',label:'Gold-Monate',count:cumul.gold,activeBg:'rgba(253,230,138,0.12)',activeBorder:'rgba(253,230,138,0.35)',activeTextColor:'#fde68a',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceGold},
                          {icon:'🥈',label:'Silber-Monate',count:cumul.silver,activeBg:'rgba(255,255,255,0.08)',activeBorder:'rgba(255,255,255,0.2)',activeTextColor:'rgba(255,255,255,0.7)',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceSilver},
                          {icon:'🥉',label:'Bronze-Monate',count:cumul.bronze,activeBg:'rgba(251,146,60,0.1)',activeBorder:'rgba(251,146,60,0.3)',activeTextColor:'#fb923c',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceBronze},
                        ].map(({icon,label,count,activeBg,activeBorder,activeTextColor,desc})=>(
                          <Tile key={label} icon={icon} label={label} sub={count>0?`${count}×`:undefined}
                            has={count>0} activeBg={activeBg} activeBorder={activeBorder} activeTextColor={activeTextColor}
                            onClick={()=>openCount(icon,label,desc,count)}/>
                        ))}
                      </Sec>
                      </>}
                    </div>
                  </>
                );
              })()}
            </>
          }
        </div>
      </div>
    );
  }

