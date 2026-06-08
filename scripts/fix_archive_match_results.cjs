// Add match results to expanded archive PT cards (splice approach)
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');

const startMarker = 'expanded && (';
const startIdx = c.indexOf(startMarker);
if(startIdx===-1){console.log('✗ expanded marker not found');process.exit(1);}

// End marker: the closing )} right before </div>
const endMarker = '                      )}\r\n                    </div>\r\n                  );\r\n                })}\r\n';
const endIdx = c.indexOf(endMarker, startIdx);
if(endIdx===-1){console.log('✗ end marker not found');process.exit(1);}
const endFull = endIdx + endMarker.length;

console.log('Block length:', endFull - startIdx);

const newExpanded = `expanded && (
                        <div style={{borderTop:'1px solid rgba(167,139,250,0.12)',padding:'12px 14px'}}>
                          <div style={{display:'flex',gap:'10px',marginBottom:'10px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'11px',color:'rgba(167,139,250,0.6)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>von {pt.createdBy}</span>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{pt.settings.winSets} Gewinnsätze</span>
                          </div>
                          <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Tabelle</p>
                          <div style={{display:'grid',gap:'4px',marginBottom:'14px'}}>
                            {fs2.map(s=>(
                              <div key={s.childId} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.07)'}}>
                                <span style={{fontSize:'18px',flexShrink:0}}>{placeEmoji[s.place-1]||\`\${s.place}.\`}</span>
                                <div style={{flex:1}}>
                                  <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                                  <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}{pt.settings.trackSetScores?\` · Punkte \${s.ptsWon}:\${s.ptsLost}\`:''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(()=>{
                            const ptPlayers=pt.players||[];
                            const ptMatches=pt.matches||[];
                            const numRoundsA=ptPlayers.length%2===0?ptPlayers.length-1:ptPlayers.length;
                            const roundsA=Array.from({length:numRoundsA},(_,i)=>i+1);
                            return(<>
                              <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Spielplan</p>
                              {roundsA.map(round=>(
                                <div key={round} style={{marginBottom:'8px'}}>
                                  <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                                  <div style={{display:'grid',gap:'3px'}}>
                                    {ptMatches.filter(m=>m.round===round).map((m,mi)=>{
                                      const p1=ptPlayers[m.p1Idx];const p2=ptPlayers[m.p2Idx];const res=m.result;
                                      return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                        <span style={{flex:1,fontSize:'11px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                                        <span style={{fontSize:'12px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.15)',minWidth:'30px',textAlign:'center',flexShrink:0}}>{res?\`\${res.sets1}:\${res.sets2}\`:'–:–'}</span>
                                        <span style={{flex:1,fontSize:'11px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                                      </div>);
                                    })}
                                  </div>
                                </div>
                              ))}
                            </>);
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
`;

c = c.slice(0, startIdx) + newExpanded + c.slice(endFull);
console.log('✓ Archive expanded: match results added');

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
