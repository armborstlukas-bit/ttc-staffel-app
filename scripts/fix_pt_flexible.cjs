// Script 4: Flexible group sizes 3-10 for practice tournaments
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname,'..','src','App.jsx');
let c = fs.readFileSync(appPath,'utf8');
const R = '\r\n';

// ── 1. Add groupSize:4 to ptCreateForm initial state (2 places) ─────────────
c = c.replace(
  "useState({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false})",
  "useState({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false})"
);
c = c.replace(
  "setPtCreateForm({type:'4er_gruppe',winSets:2,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false})",
  "setPtCreateForm({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false})"
);
console.log('✓ groupSize:4 added to ptCreateForm');

// ── 2. Update typeInfo / maxPlayers to use groupSize ────────────────────────
const oldTypeInfo = `const typeInfo = { label:'4er Gruppe', emoji:'🎯', maxPlayers:4, desc:'Rundenturnier · 3 Runden · 4 Spieler' };
    const maxPlayers = typeInfo.maxPlayers;`;
const newTypeInfo = `const maxPlayers = ptCreateForm.groupSize || 4;`;
if(c.indexOf(oldTypeInfo)===-1){console.log('✗ typeInfo not found');process.exit(1);}
c = c.replace(oldTypeInfo, newTypeInfo);
console.log('✓ typeInfo replaced with dynamic maxPlayers');

// ── 3. Replace hardcoded match generation with round-robin ──────────────────
const oldMatches = `        players: seeded.map((p,i) => ({...p, seed:i+1})),
        matches: [
          {round:1,p1Idx:0,p2Idx:3,result:null},
          {round:1,p1Idx:1,p2Idx:2,result:null},
          {round:2,p1Idx:0,p2Idx:2,result:null},
          {round:2,p1Idx:1,p2Idx:3,result:null},
          {round:3,p1Idx:0,p2Idx:1,result:null},
          {round:3,p1Idx:2,p2Idx:3,result:null},
        ],`;
const newMatches = `        players: seeded.map((p,i) => ({...p, seed:i+1})),
        matches: (()=>{
          // Round-robin schedule: fix player 0, rotate rest; top 2 seeds always meet in last round
          const n = seeded.length;
          const hasBye = n % 2 === 1;
          const N = hasBye ? n + 1 : n;
          const circle = Array.from({length: N}, (_, i) => i < n ? i : -1);
          const rotating = circle.slice(1);
          const allMatches = [];
          for (let r = 0; r < N - 1; r++) {
            const all = [circle[0], ...rotating];
            for (let j = 0; j < N/2; j++) {
              const p1 = all[j], p2 = all[N-1-j];
              if (p1 !== -1 && p2 !== -1) allMatches.push({round:r+1, p1Idx:p1, p2Idx:p2, result:null});
            }
            rotating.unshift(rotating.pop());
          }
          return allMatches;
        })(),`;
if(c.indexOf(oldMatches)===-1){console.log('✗ old matches not found');process.exit(1);}
c = c.replace(oldMatches, newMatches);
console.log('✓ Round-robin match generation added');

// ── 4. Update detail view: dynamic rounds ───────────────────────────────────
const oldRounds = 'const rounds = [1,2,3];';
const newRounds = 'const numRoundsTotal = players.length % 2 === 0 ? players.length - 1 : players.length;\n    const rounds = Array.from({length:numRoundsTotal}, (_, i) => i+1);';
if(c.indexOf(oldRounds)===-1){console.log('✗ const rounds not found');process.exit(1);}
c = c.replace(oldRounds, newRounds);
console.log('✓ Dynamic rounds in detail view');

// ── 5. Update placeEmoji in detail view (extend to 10) ──────────────────────
const oldPlaceEmoji = "const placeEmoji = ['🥇','🥈','🥉','4️⃣'];";
// Find in detail view (not the archive one)
const detailIdx = c.indexOf("const placeEmoji = ['🥇','🥈','🥉','4️⃣'];");
if(detailIdx!==-1){
  c = c.slice(0, detailIdx) + "const placeEmoji = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];" + c.slice(detailIdx + oldPlaceEmoji.length);
  console.log('✓ placeEmoji extended to 10 in detail view');
} else { console.log('ℹ placeEmoji already updated or not found in detail view'); }

// Also extend in archive view if still 4 (already done by fix_archive_pt_collapsible.cjs)

// ── 6. Update PTCard: show dynamic group size ────────────────────────────────
const oldPTCardLabel = `<span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>4er Gruppe</span>`;
const newPTCardLabel = `<span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>{pt.players?pt.players.length+'er Gruppe':'4er Gruppe'}</span>`;
if(c.indexOf(oldPTCardLabel)===-1){console.log('✗ PTCard label not found');}
else { c = c.replace(oldPTCardLabel, newPTCardLabel); console.log('✓ PTCard label dynamic'); }

// ── 7. Update detail view title: dynamic group size ─────────────────────────
const oldDetailTitle = `<span style={{fontWeight:'800',color:'white',fontSize:'20px'}}>4er Gruppe</span>`;
const idx7 = c.indexOf(oldDetailTitle);
if(idx7!==-1){
  c = c.replace(oldDetailTitle, `<span style={{fontWeight:'800',color:'white',fontSize:'20px'}}>{players.length}er Gruppe</span>`);
  console.log('✓ Detail view title dynamic');
} else { console.log('ℹ detail title already updated or uses different pattern'); }

// ── 8. Replace type selector in wizard step 1 with group size selector ───────
const oldTypeSelector = `Wettkampftyp</p>
                  <div style={{display:'flex',gap:'10px',marginBottom:'22px'}}>
                    {[{k:'4er_gruppe',emoji:'🎯',label:'4er Gruppe',desc:'Rundenturnier · 3 Runden · 4 Spieler'}].map(t=>(
                      <div key={t.k} onClick={()=>setPtCreateForm(f=>({...f,type:t.k}))}
                        style={{flex:1,padding:'16px',borderRadius:'14px',border:\`2px solid \${ptCreateForm.type===t.k?'#a78bfa':'rgba(255,255,255,0.1)'}\`,background:ptCreateForm.type===t.k?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',transition:'all 0.12s'}}>
                        <div style={{fontSize:'30px',marginBottom:'6px'}}>{t.emoji}</div>
                        <div style={{fontWeight:'800',color:'white',fontSize:'15px'}}>{t.label}</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginTop:'4px'}}>{t.desc}</div>
                      </div>
                    ))}
                  </div>`;
const newTypeSelector = `Wettkampftyp</p>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'12px',marginBottom:'22px'}}>
                    <span style={{fontSize:'22px'}}>🎯</span>
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'14px'}}>Rundenturnier</p>
                      <p style={{margin:'2px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>Jeder spielt gegen jeden · bester vs. zweitbester immer in der letzten Runde</p>
                    </div>
                  </div>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Gruppengröße</p>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'22px'}}>
                    {[3,4,5,6,7,8,9,10].map(n=>(
                      <button key={n} onClick={()=>setPtCreateForm(f=>({...f,groupSize:n}))}
                        style={{...ptBtn(ptCreateForm.groupSize===n),flex:'none',width:'42px',fontSize:'15px'}}>
                        {n}
                      </button>
                    ))}
                  </div>`;
if(c.indexOf(oldTypeSelector)===-1){console.log('✗ type selector not found');process.exit(1);}
c = c.replace(oldTypeSelector, newTypeSelector);
console.log('✓ Type selector replaced with group size selector');

// ── 9. Update "4er Gruppe" in archive section if still present ───────────────
// Already handled by fix_archive_pt_collapsible.cjs which uses pt.players.length

// ── 10. Fix step 2 "Freirunde" display for odd-sized groups ─────────────────
// In detail view, add a note when a player has a bye in a round
// Find where bye rounds would appear (a round might have fewer matches)
// The existing rounds.map just shows matches.filter(m=>m.round===round)
// For odd group sizes, some rounds will have an odd player getting a bye
// Let's add a small note showing which player gets a bye
const oldRoundHeader = `<p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>Runde {round}</p>`;
const newRoundHeader = `<p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>
                Runde {round}
                {players.length % 2 === 1 && (() => {
                  const playersInRound = new Set(matches.filter(m=>m.round===round).flatMap(m=>[m.p1Idx,m.p2Idx]));
                  const bye = players.findIndex((_,i) => !playersInRound.has(i));
                  return bye >= 0 ? <span style={{fontSize:'10px',color:'rgba(251,191,36,0.5)',marginLeft:'8px',fontWeight:'600',textTransform:'none'}}>⏸ Freirunde: {players[bye]?.name}</span> : null;
                })()}
              </p>`;
if(c.indexOf(oldRoundHeader)===-1){console.log('✗ round header not found');}
else { c = c.replace(oldRoundHeader, newRoundHeader); console.log('✓ Freirunde display added for odd group sizes'); }

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done.');
