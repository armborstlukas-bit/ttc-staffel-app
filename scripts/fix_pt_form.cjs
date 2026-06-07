const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update initial form state: add deciderCustom:false
c = c.replace(
  "setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false})",
  "setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false})"
);
c = c.replace(
  "const [ptCreateForm, setPtCreateForm]                             = useState({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false});",
  "const [ptCreateForm, setPtCreateForm]                             = useState({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false});"
);

// 2. When saving: deciderLength = setLength if deciderCustom is false
c = c.replace(
  "settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderLength, trackSetScores:ptCreateForm.trackSetScores },",
  "settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderCustom?ptCreateForm.deciderLength:ptCreateForm.setLength, trackSetScores:ptCreateForm.trackSetScores },"
);

// 3. Replace the full settings grid with the new conditional version
const oldGrid = `                    {/* Gewinnsätze */}
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
                  </div>`;

const newGrid = `                    {/* Gewinnsätze */}
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

                    {/* Satzlänge — nur bei Satzergebnissen */}
                    {ptCreateForm.trackSetScores && (
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'rgba(255,255,255,0.45)',fontWeight:'700'}}>Satzlänge</p>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.max(5,f.setLength-1)}))} style={smBtn(false)}>−</button>
                        <span style={{fontSize:'22px',fontWeight:'900',color:'white',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.setLength}</span>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.min(21,f.setLength+1)}))} style={smBtn(false)}>+</button>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>Punkte</span>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Entscheidungssatz — Checkbox + bedingte Länge */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'20px',padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px'}}>
                    <button onClick={()=>setPtCreateForm(f=>({...f,deciderCustom:!f.deciderCustom}))}
                      style={{width:'22px',height:'22px',borderRadius:'6px',border:\`2px solid \${ptCreateForm.deciderCustom?'#fde68a':'rgba(255,255,255,0.2)'}\`,background:ptCreateForm.deciderCustom?'rgba(253,230,138,0.2)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                      {ptCreateForm.deciderCustom&&<span style={{fontSize:'14px',color:'#fde68a',lineHeight:1}}>✓</span>}
                    </button>
                    <div style={{flex:1}}>
                      <p style={{margin:'0 0 2px',fontSize:'13px',fontWeight:'700',color:ptCreateForm.deciderCustom?'#fde68a':'rgba(255,255,255,0.5)',cursor:'pointer'}} onClick={()=>setPtCreateForm(f=>({...f,deciderCustom:!f.deciderCustom}))}>
                        Abweichende Entscheidungssatzlänge
                      </p>
                      <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>
                        {ptCreateForm.deciderCustom?'Eigene Punktzahl für den Entscheidungssatz festlegen':'Entscheidungssatz hat dieselbe Länge wie normale Sätze'}
                      </p>
                      {ptCreateForm.deciderCustom&&(
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'10px'}}>
                          <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.max(5,f.deciderLength-1)}))} style={smBtn(false)}>−</button>
                          <span style={{fontSize:'22px',fontWeight:'900',color:'#fde68a',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.deciderLength}</span>
                          <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.min(21,f.deciderLength+1)}))} style={smBtn(false)}>+</button>
                          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.3)'}}>Punkte</span>
                        </div>
                      )}
                    </div>
                  </div>`;

const idx = c.indexOf(oldGrid);
if (idx === -1) { console.log('✗ Grid not found'); process.exit(1); }
c = c.slice(0, idx) + newGrid + c.slice(idx + oldGrid.length);
console.log('✓ Form grid replaced');

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('Done.');
