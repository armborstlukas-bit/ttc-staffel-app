const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
const R = '\r\n';

const marker = '        {isMobile && <MobileBottomNav view={view} navTo={navTo} userRole={userRole} canEdit={canEdit} appSettings={appSettings} unreadCount={0}/>}' + R + '      </div>' + R + '    );' + R + '  }';
const idx = c.indexOf(marker);
if (idx === -1) { console.log('✗ Marker not found'); process.exit(1); }

const ptSection = R +
`        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}
        {myChild&&(()=>{
          const placeEmojiPD=['🥇','🥈','🥉','4️⃣'];
          const sevenDaysAgo3=new Date(Date.now()-7*24*60*60*1000).toISOString();
          const myPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.matches&&pt.matches.every(m=>m.result)&&pt.createdAt>=sevenDaysAgo3),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||''));
          if(myPTs.length===0) return null;
          return (
            <div style={{padding:'0 0 16px'}}>
              <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px',margin:'0 16px 10px'}}>Trainingswettkämpfe</span>
              <div style={{margin:'0 16px',background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px',padding:'12px 14px',display:'grid',gap:'8px'}}>
                {myPTs.map(pt=>{
                  const allDonePD=pt.matches&&pt.matches.every(m=>m.result);
                  let myEntry=null;
                  if(pt.finalStandings){myEntry=pt.finalStandings.find(s=>s.childId===myChild.id);}
                  else if(allDonePD){
                    const s4=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;s4[m.p1Idx].setsWon+=sets1;s4[m.p1Idx].setsLost+=sets2;s4[m.p2Idx].setsWon+=sets2;s4[m.p2Idx].setsLost+=sets1;if(sets1>sets2)s4[m.p1Idx].wins++;else s4[m.p2Idx].wins++;});
                    const srt4=[...s4].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const mi4=pt.players.findIndex(p=>p.childId===myChild.id);
                    const mr4=srt4.findIndex(s=>s.idx===mi4);
                    const ms4=s4[mi4]||{wins:0,setsWon:0,setsLost:0};
                    const mc4=pt.matches.filter(m=>m.result&&(m.p1Idx===mi4||m.p2Idx===mi4)).length;
                    myEntry={place:mr4+1,wins:ms4.wins,losses:mc4-ms4.wins,setsWon:ms4.setsWon,setsLost:ms4.setsLost};
                  }
                  if(!myEntry) return null;
                  const opps=pt.players.filter(p=>p.childId!==myChild.id).map(p=>p.name);
                  const dateStr=new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return(
                    <div key={pt.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(167,139,250,0.1)'}}>
                      <span style={{fontSize:'20px',flexShrink:0}}>{placeEmojiPD[myEntry.place-1]||(myEntry.place+'.')}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'2px'}}>
                          <span style={{fontWeight:'800',color:'white',fontSize:'13px'}}>Platz {myEntry.place}</span>
                          <span style={{fontSize:'10px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>4er Gruppe</span>
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

c = c.slice(0, idx) + ptSection + marker + c.slice(idx + marker.length);
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('✓ Parent/Youth PT section inserted');
