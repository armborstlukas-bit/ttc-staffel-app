  // ── STARTSEITE (Trainer/Admin Dashboard) ───────────────────────────────
  if (view==='home' && canEdit()) {
    const todayStr = new Date().toISOString().split('T')[0];
    const in6 = new Date(); in6.setDate(in6.getDate()+6);
    const in6Str = in6.toISOString().split('T')[0];
    const allSess = getAllUpcomingSessions().filter(s=>canAccessSession(s));
    const pastSess = allSess.filter(s=>s.date<todayStr).sort((a,b)=>b.date.localeCompare(a.date));
    const upcomingSess = allSess.filter(s=>s.date>=todayStr&&s.date<=in6Str);
    const in3m=new Date(); in3m.setMonth(in3m.getMonth()+3);
    const in3mStr=in3m.toISOString().split('T')[0];
    const tourneys=getUpcomingTournaments().filter(t=>(t.dateFrom||t.date||'')<=in3mStr);
    const unreadCount = Object.values(notifications).filter(n=>
      n.type==='parent_message'&&!n.trashedAt&&canAccessGroup(n.toGroupId)
    ).length;
    const hour = new Date().getHours();
    const greeting = hour<12?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
    const dateLabel = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const QL_STYLE = (bg,border) => ({
      position:'relative',padding:'15px 8px 13px',background:bg,border:'1px solid '+border,
      borderRadius:'16px',cursor:'pointer',display:'flex',flexDirection:'column',
      alignItems:'center',gap:'8px',transition:'transform 0.12s',textAlign:'center'
    });
    const quickLinks = [
      {label:'Trainingsplan',    icon:'📅', color:'#86efac', bg:'rgba(134,239,172,0.1)',  border:'rgba(134,239,172,0.25)', action:()=>setView('trainingsplan')},
      {label:'Turniere',         icon:'🏆', color:'#fde68a', bg:'rgba(253,230,138,0.1)',  border:'rgba(253,230,138,0.25)', action:()=>setView('turniere')},
      {label:'Nachrichten',      icon:'💬', color:'#bbf7d0', bg:'rgba(187,247,208,0.1)',  border:'rgba(187,247,208,0.25)', action:()=>setView('notifications'), badge: unreadCount},
      {label:'Archiv',           icon:'📦', color:'#e2e8f0', bg:'rgba(226,232,240,0.08)', border:'rgba(226,232,240,0.2)',  action:()=>setView('archiv')},
      {label:'Errungenschaften', icon:'🏅', color:'#d9f99d', bg:'rgba(217,249,157,0.1)',  border:'rgba(217,249,157,0.25)', action:()=>setView('achievements')},
      ...(appSettings.mannschaftEnabled?[{label:'Mannschaft',icon:'⚽',color:'#6ee7b7',bg:'rgba(110,231,183,0.1)',border:'rgba(110,231,183,0.25)',action:()=>setView('mannschaft')}]:[]),
      ...(userRole==='admin'?[{label:'Admin',icon:'🛡️',color:'#c4b5fd',bg:'rgba(196,181,253,0.1)',border:'rgba(196,181,253,0.25)',action:()=>setView('admin')}]:[]),
    ];
    const groups = FIXED_GROUPS.filter(g=>canAccessGroup(g.id));

    const inputStyle = {padding:'10px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(134,239,172,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box'};

    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        {archiveTournDialog&&<ArchiveTournDialog tournament={archiveTournDialog} onClose={()=>setArchiveTournDialog(null)} onConfirm={confirmArchiveTournament}/>}

        {/* ── Profil-Modal ── */}
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

        {/* ── Rollenwechsel-Modal ── */}
        {showRolePicker&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'24px',maxWidth:'300px',width:'100%'}}>
              <h3 style={{margin:'0 0 16px',color:'white',fontWeight:'800',fontSize:'18px'}}>Rolle wechseln</h3>
              {(userProfile?.roles||[userRole]).filter(r=>r!=='pending').map(role=>{
                const rc2=ROLE_CONFIG[role]||{};
                return (
                  <button key={role} onClick={()=>{setUserRole(role);setShowRolePicker(false);setView('home');}}
                    style={{display:'block',width:'100%',padding:'11px 14px',marginBottom:'8px',background:userRole===role?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.05)',border:userRole===role?'1px solid rgba(74,222,128,0.4)':'1px solid rgba(255,255,255,0.1)',borderRadius:'11px',cursor:'pointer',color:'white',fontWeight:'700',fontSize:'14px',textAlign:'left'}}>
                    {rc2.label}
                  </button>
                );
              })}
              <button onClick={()=>setShowRolePicker(false)} style={{width:'100%',padding:'9px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:'13px',marginTop:'4px'}}>Abbrechen</button>
            </div>
          </div>
        )}

        <div style={{maxWidth:'820px',margin:'0 auto',padding:'0 20px 60px'}}>

          {/* ── Top-Bar ─────────────────────────────────────────── */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'22px 0 30px',borderBottom:'1px solid rgba(74,222,128,0.08)',marginBottom:'32px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(135deg,#15803d,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',boxShadow:'0 4px 16px rgba(74,222,128,0.25)'}}>🏓</div>
              <div>
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß</p>
                <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{userRole==='admin'?'Administrator':'Trainer'}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {(()=>{const sel=(userProfile?.roles||[userRole]).filter(r=>r!=='pending');return sel.length>1?<button onClick={()=>setShowRolePicker(true)} style={{padding:'8px 13px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#86efac',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>👤 Rolle</button>:null;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px 13px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>⚙️ Profil</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px 13px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Abmelden</button>
            </div>
          </div>

          {/* ── Greeting ─────────────────────────────────────────── */}
          <div style={{marginBottom:'36px'}}>
            <p style={{margin:'0 0 8px',color:'rgba(74,222,128,0.5)',fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase'}}>{dateLabel}</p>
            <h1 style={{margin:0,color:'white',fontSize:'36px',fontWeight:'800',letterSpacing:'-1px',lineHeight:1.1}}>{greeting}, <span style={{color:'#4ade80'}}>{(userProfile?.name||'Trainer').split(' ')[0]}</span> 👋</h1>
          </div>

          {/* ── Schnellzugriff ────────────────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Schnellzugriff</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px',marginBottom:'40px'}}>
            {quickLinks.map((ql,i)=>(
              <button key={i} onClick={ql.action} style={QL_STYLE(ql.bg,ql.border)}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <span style={{fontSize:'24px',lineHeight:1}}>{ql.icon}</span>
                <span style={{fontSize:'11px',fontWeight:'700',color:ql.color,lineHeight:'1.3'}}>{ql.label}</span>
                {ql.badge>0&&<span style={{position:'absolute',top:'8px',right:'8px',background:'#dc2626',color:'white',borderRadius:'50%',width:'18px',height:'18px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center'}}>{ql.badge}</span>}
              </button>
            ))}
          </div>

          {/* ── Gruppen ───────────────────────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Meine Gruppen</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:'12px',marginBottom:'40px'}}>
            {groups.map(group=>{
              const subs=getSubgroupsForGroup(group.id);
              const totalKids=subs.reduce((s2,sub)=>s2+getChildrenForSubgroup(sub.id).length,0);
              const isJugend=group.id==='jugend';
              const gradBg    = isJugend ? 'linear-gradient(135deg,#052e16 0%,#0f5a28 100%)' : 'linear-gradient(135deg,#0c2340 0%,#1a4070 100%)';
              const gradBorder= isJugend ? 'rgba(74,222,128,0.3)' : 'rgba(96,165,250,0.3)';
              const gradSub   = isJugend ? 'rgba(134,239,172,0.5)' : 'rgba(147,197,253,0.5)';
              const gradArrow = isJugend ? 'rgba(74,222,128,0.35)' : 'rgba(96,165,250,0.35)';
              return (
                <div key={group.id} onClick={()=>{setActiveGroup(group);setView('group');}}
                  style={{borderRadius:'20px',padding:'22px 20px',cursor:'pointer',position:'relative',overflow:'hidden',transition:'transform 0.15s,box-shadow 0.15s',background:gradBg,border:'1px solid '+gradBorder,boxShadow:'inset 0 1px 0 rgba(255,255,255,0.07)'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.5)';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.07)';}}>
                  <div style={{position:'absolute',bottom:'-10px',right:'-8px',fontSize:'86px',opacity:0.06,lineHeight:1,userSelect:'none',pointerEvents:'none'}}>{group.emoji}</div>
                  <p style={{margin:'0 0 10px',fontSize:'30px',lineHeight:1}}>{group.emoji}</p>
                  <h2 style={{margin:'0 0 5px',color:'white',fontSize:'19px',fontWeight:'800',letterSpacing:'-0.3px'}}>{group.name}</h2>
                  <p style={{margin:0,color:gradSub,fontSize:'13px',fontWeight:'500'}}>{subs.length} {subs.length===1?'Gruppe':'Gruppen'} · {totalKids} {totalKids===1?'Kind':'Kinder'}</p>
                  <ChevronRight size={15} color={gradArrow} style={{position:'absolute',top:'22px',right:'18px'}}/>
                </div>
              );
            })}
          </div>

          {/* ── Training diese Woche ──────────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Training diese Woche</p>
          <div style={{background:'rgba(74,222,128,0.03)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'20px',overflow:'hidden',marginBottom:'20px',boxShadow:'inset 0 1px 0 rgba(74,222,128,0.07)'}}>
            <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(74,222,128,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:'800',color:'white',fontSize:'16px',letterSpacing:'-0.3px'}}>📅 Training diese Woche</span>
              <button onClick={()=>setView('trainingsplan')} style={{background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',color:'#4ade80',borderRadius:'10px',padding:'6px 14px',fontSize:'12px',cursor:'pointer',fontWeight:'700'}}>Trainingsplan →</button>
            </div>
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'8px'}}>
              {pastSess.length===0&&upcomingSess.length===0
                ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',textAlign:'center',padding:'32px 0',margin:0}}>Keine Einheiten in den nächsten 7 Tagen.</p>
                : <>
                  {pastSess.length>0&&<p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'rgba(252,165,165,0.55)',textTransform:'uppercase',letterSpacing:'1px'}}>Vergangen – Anwesenheit eintragen</p>}
                  {pastSess.map(session=>{
                    const sessionSubs=(session.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                    const allKids2=(session.subgroupIds||[]).flatMap(sid=>getChildrenForSubgroup(sid));
                    const recorded=allKids2.filter(c=>!!(children[c.id]?.attendance||{})[session.date]).length;
                    const archivable=isSessionArchivable(session);
                    const allDone=allKids2.length>0&&recorded===allKids2.length;
                    return (
                      <div key={session.id} onClick={()=>{setActiveSession(session);setView('sessionAttendance');}}
                        style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 16px',background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.18)',borderRadius:'14px',cursor:'pointer',transition:'background 0.12s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(220,38,38,0.13)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(220,38,38,0.07)'}>
                        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(220,38,38,0.14)',border:'1px solid rgba(220,38,38,0.28)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'18px'}}>{allDone?'✅':'📋'}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px',alignItems:'center'}}>
                            {sessionSubs.map(sub=>{const g=FIXED_GROUPS.find(x=>x.id===sub.groupId);return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:g?.color||'#ccc'}}>{g?.emoji} {sub.name}</span>;})}
                            {archivable&&<span style={{fontSize:'10px',background:'rgba(55,65,81,0.6)',color:'#9ca3af',padding:'1px 7px',borderRadius:'20px',fontWeight:'600'}}>📦 Archivierbar</span>}
                          </div>
                          <span style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',fontWeight:'500'}}>{new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'})} · {session.time} Uhr</span>
                        </div>
                        {allKids2.length>0&&<div style={{textAlign:'right',flexShrink:0}}>
                          <p style={{margin:'0 0 2px',fontSize:'15px',fontWeight:'800',color:allDone?'#4ade80':'#fca5a5'}}>{recorded}/{allKids2.length}</p>
                          <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.3)',fontWeight:'600'}}>erfasst</p>
                        </div>}
                        <ChevronRight size={16} color="rgba(220,38,38,0.45)"/>
                      </div>
                    );
                  })}
                  {upcomingSess.length>0&&pastSess.length>0&&<div style={{height:'1px',background:'rgba(74,222,128,0.08)',margin:'4px 0'}}/>}
                  {upcomingSess.length>0&&<p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'rgba(74,222,128,0.5)',textTransform:'uppercase',letterSpacing:'1px'}}>Kommend</p>}
                  {upcomingSess.map(session=>{
                    const sessionSubs=(session.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                    const isToday=session.date===todayStr;
                    return (
                      <div key={session.id} onClick={()=>{setActiveSession(session);setView('sessionAttendance');}}
                        style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 16px',background:isToday?'rgba(74,222,128,0.07)':'rgba(255,255,255,0.025)',border:'1px solid '+(isToday?'rgba(74,222,128,0.22)':'rgba(255,255,255,0.065)'),borderRadius:'14px',cursor:'pointer',transition:'background 0.12s'}}
                        onMouseEnter={e=>e.currentTarget.style.background=isToday?'rgba(74,222,128,0.13)':'rgba(255,255,255,0.05)'}
                        onMouseLeave={e=>e.currentTarget.style.background=isToday?'rgba(74,222,128,0.07)':'rgba(255,255,255,0.025)'}>
                        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:isToday?'rgba(74,222,128,0.14)':'rgba(255,255,255,0.06)',border:'1px solid '+(isToday?'rgba(74,222,128,0.28)':'rgba(255,255,255,0.1)'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'18px'}}>{isToday?'⚡':'🏓'}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px',alignItems:'center'}}>
                            {sessionSubs.map(sub=>{const g=FIXED_GROUPS.find(x=>x.id===sub.groupId);return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:g?.color||'#ccc'}}>{g?.emoji} {sub.name}</span>;})}
                            {isToday&&<span style={{fontSize:'10px',background:'rgba(74,222,128,0.2)',color:'#4ade80',padding:'2px 9px',borderRadius:'20px',fontWeight:'800'}}>Heute</span>}
                          </div>
                          <span style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',fontWeight:'500'}}>{new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'})} · {session.time} Uhr</span>
                        </div>
                        <ChevronRight size={16} color={isToday?'rgba(74,222,128,0.45)':'rgba(255,255,255,0.18)'}/>
                      </div>
                    );
                  })}
                </>
              }
            </div>
          </div>

          {/* ── Kommende Turniere ─────────────────────────────────── */}
          <p style={{color:'rgba(253,230,138,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Kommende Turniere</p>
          <div style={{background:'rgba(253,230,138,0.025)',border:'1px solid rgba(253,230,138,0.12)',borderRadius:'20px',overflow:'hidden',marginBottom:'20px',boxShadow:'inset 0 1px 0 rgba(253,230,138,0.06)'}}>
            <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(253,230,138,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:'800',color:'white',fontSize:'16px',letterSpacing:'-0.3px'}}>🏆 Kommende Turniere</span>
              <button onClick={()=>setView('turniere')} style={{background:'rgba(253,230,138,0.12)',border:'1px solid rgba(253,230,138,0.25)',color:'#fde68a',borderRadius:'10px',padding:'6px 14px',fontSize:'12px',cursor:'pointer',fontWeight:'700'}}>Alle Turniere →</button>
            </div>
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'8px'}}>
              {tourneys.length===0
                ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',textAlign:'center',padding:'32px 0',margin:0}}>Kein Turnier in den nächsten 3 Monaten.</p>
                : tourneys.map(t=>{
                  const from=t.dateFrom||t.date||''; const to=t.dateTo||from;
                  const dl2=to!==from
                    ? new Date(from+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'long'})+' – '+new Date(to+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'})
                    : new Date(from+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
                  const total=getTournamentParticipantIds(t).length;
                  const coming=Object.values(t.responses||{}).filter(r=>r==='coming').length;
                  const missing=Object.values(t.responses||{}).filter(r=>r==='missing').length;
                  const open=total-coming-missing;
                  const canArchive=isTournamentArchivable(t);
                  return (
                    <div key={t.id} style={{padding:'14px 16px',background:'rgba(253,230,138,0.04)',border:'1px solid rgba(253,230,138,0.12)',borderRadius:'14px',cursor:'pointer',transition:'background 0.12s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(253,230,138,0.09)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(253,230,138,0.04)'}
                      onClick={()=>{setScrollToTournId(t.id);setView('turniere');}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(253,230,138,0.1)',border:'1px solid rgba(253,230,138,0.22)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'20px'}}>🏆</div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:'0 0 3px',fontWeight:'800',color:'#fde68a',fontSize:'15px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</p>
                          <p style={{margin:'0 0 10px',fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'500'}}>{dl2}{t.location?' · 📍 '+t.location:''}</p>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'12px',fontWeight:'700',color:'#4ade80',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',padding:'3px 11px',borderRadius:'20px'}}>✓ {coming} dabei</span>
                            <span style={{fontSize:'12px',fontWeight:'700',color:'#f87171',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',padding:'3px 11px',borderRadius:'20px'}}>✗ {missing} fehlen</span>
                            {open>0&&<span style={{fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',padding:'3px 11px',borderRadius:'20px'}}>– {open} offen</span>}
                          </div>
                        </div>
                        <ChevronRight size={16} color="rgba(253,230,138,0.3)" style={{marginTop:'4px',flexShrink:0}}/>
                      </div>
                      {canArchive&&<div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(253,230,138,0.08)'}} onClick={e=>e.stopPropagation()}>
                        <button onClick={e=>{e.stopPropagation();openArchiveTournDialog(t);}} style={{width:'100%',padding:'7px',background:'rgba(55,65,81,0.35)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)',borderRadius:'9px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>📦 Turnier archivieren</button>
                      </div>}
                    </div>
                  );
                })
              }
            </div>
          </div>

        </div>
      </div>
    );
  }

