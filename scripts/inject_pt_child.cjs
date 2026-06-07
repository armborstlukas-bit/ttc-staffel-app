const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let c = fs.readFileSync(appPath, 'utf8');

const marker = '          {/* Manuell hinzufügen */}\n          {canEdit()&&(';
const idx = c.indexOf(marker);
if (idx === -1) { console.log('✗ Marker not found'); process.exit(1); }

const ptSection = `          {/* Trainingswettkämpfe im Kind-Profil */}
          {(()=>{
            const placeEmojiCH=['🥇','🥈','🥉','4️⃣'];
            const childPTs=Object.values(archivedPracticeTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id)).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));
            if(childPTs.length===0) return null;
            return (<div style={{marginBottom:'20px'}}>
              <h3 style={{margin:'0 0 12px',color:'white',fontSize:'16px',fontWeight:'800'}}>🎮 Trainingswettkämpfe</h3>
              <div style={{display:'grid',gap:'7px'}}>
                {childPTs.map(pt=>{
                  const fs3=(pt.finalStandings||[]).find(s=>s.childId===child.id);
                  if(!fs3) return null;
                  const opps=pt.players.filter(p=>p.childId!==child.id).map(p=>p.name);
                  return(<div key={pt.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'12px'}}>
                    <span style={{fontSize:'22px',flexShrink:0}}>{placeEmojiCH[fs3.place-1]||String(fs3.place)+'.'}  </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>
                        <span style={{fontWeight:'800',color:'white',fontSize:'14px'}}>Platz {fs3.place}</span>
                        <span style={{fontSize:'11px',color:'rgba(167,139,250,0.7)',fontWeight:'600'}}>4er Gruppe</span>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
                      </div>
                      <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>vs. {opps.join(', ')} · {fs3.wins}S {fs3.losses}N · Sätze {fs3.setsWon}:{fs3.setsLost}</p>
                    </div>
                  </div>);
                })}
              </div>
            </div>);
          })()}

`;

c = c.slice(0, idx) + ptSection + marker + c.slice(idx + marker.length);
fs.writeFileSync(appPath, c, 'utf8');
console.log('✓ childHistory PT section inserted');
