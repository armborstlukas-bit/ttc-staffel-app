import React, { useState, useEffect } from 'react';
// Font: Inter via Google Fonts (injected at runtime for no build-step dependency)
if (typeof document !== 'undefined' && !document.getElementById('inter-font')) {
  const l = document.createElement('link');
  l.id = 'inter-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(l);
}
if (typeof document !== 'undefined' && !document.getElementById('ttc-global-styles')) {
  const st = document.createElement('style');
  st.id = 'ttc-global-styles';
  st.textContent = `
    @keyframes ttcFadeSlide {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes ttcFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ttcScaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }
    .ttc-view-enter {
      animation: ttcFadeSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .ttc-sticky-hdr {
      position: sticky;
      top: 0;
      z-index: 600;
      background: rgba(2,26,10,0.97);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .ttc-sticky-hdr-light {
      position: sticky;
      top: 0;
      z-index: 600;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    html { scroll-behavior: smooth; }
    button, [role=button] { -webkit-tap-highlight-color: transparent; }
    .ttc-modal-enter {
      animation: ttcScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.25); border-radius: 99px; }
    input, textarea, button { font-family: inherit; }
    @media (max-width: 600px) {
      .ttc-hide-mobile { display: none !important; }
      .ttc-mobile-full { width: 100% !important; }
      .ttc-mobile-stack { flex-direction: column !important; }
      .ttc-mobile-pad { padding: 0 12px 80px !important; }
    }
    @media (min-width: 601px) {
      .ttc-hide-desktop { display: none !important; }
    }
  `;
  document.head.appendChild(st);
}
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Check, X, Plus, Trash2, Download, ChevronDown, LogOut, ArrowLeft, Clock, BarChart2, MoveRight, Shield, Users, Calendar, Info, RefreshCw, ChevronRight, Edit2, Save, Trophy, Home, Archive, MessageSquare, Bell, Send } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyCrx34HEgaHnRE187Cja4JNAtbexvrA6Vg",
  authDomain: "ttc-staffel-app.firebaseapp.com",
  projectId: "ttc-staffel-app",
  storageBucket: "ttc-staffel-app.firebasestorage.app",
  messagingSenderId: "393124037099",
  appId: "1:393124037099:web:74188e37a786b7a81819ae",
  measurementId: "G-20T9EK68WQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FIXED_GROUPS = [
  { id: 'jugend',    name: 'Jugendgruppe',    emoji: '🏓', color: '#358941' },
  { id: 'anfaenger', name: 'Anfängergruppe',  emoji: '⭐', color: '#2563eb' },
  { id: 'kleinkind', name: 'Kleinkindgruppe', emoji: '🌟', color: '#d97706' },
];

const STATUS_CONFIG = {
  present:          { label: 'Anwesend',             color: '#16a34a', bg: '#dcfce7', symbol: '✓' },
  absent_unexcused: { label: 'Fehlt unentschuldigt', color: '#ef4444', bg: '#fee2e2', symbol: '–' },
  absent_excused:   { label: 'Fehlt entschuldigt',   color: '#94a3b8', bg: '#f1f5f9', symbol: '~' },
};

const ROLE_CONFIG = {
  pending:    { label: 'Wartend',      color: '#dc2626', bg: '#fee2e2' },
  admin:      { label: 'Admin',        color: '#7c3aed', bg: '#ede9fe' },
  trainer:    { label: 'Trainer',      color: '#358941', bg: '#dcfce7' },
  eltern:     { label: 'Eltern',       color: '#2563eb', bg: '#dbeafe' },
  jugendlich: { label: 'Jugendliche',  color: '#d97706', bg: '#fef3c7' },
};

const WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

const emptySession = { subgroupIds: [], extraPlayerIds: [], date: new Date().toISOString().split('T')[0], time: '17:00', trainer: '', info: '', repeat: false, repeatWeeks: 8, isRecurring: false };

const TODAY = new Date().toISOString().split('T')[0];
const emptyTournament = { name: '', location: '', dateFrom: TODAY, dateTo: TODAY, konkurrenzen: [] };
const emptyKonkurrenz = () => ({ id: 'konk_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), name: '', date: '', time: '10:00', participantIds: [], departureTimes: {} });

function getDatesInRange(from, to) {
  if (!from || !to || to < from) return from ? [from] : [];
  const dates = [];
  const d = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  while (d <= end) { dates.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
  return dates;
}

function KonkurrenzForm({ konk, helpers, childList, tournamentDates, subgroups }) {
  return (
    <div style={{border:'1px solid #fde68a',borderRadius:'10px',overflow:'hidden',marginBottom:'10px'}}>
      <div style={{background:'#fef9c3',padding:'10px 12px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <input placeholder="Konkurrenzbezeichnung (z.B. Einzel U13)" value={konk.name}
          onChange={e=>helpers.update(konk.id,'name',e.target.value)}
          style={{flex:1,minWidth:'150px',padding:'6px 10px',border:'1px solid #d97706',borderRadius:'7px',fontSize:'13px'}}/>
        {tournamentDates.length > 1 && (
          <select value={konk.date||''} onChange={e=>helpers.update(konk.id,'date',e.target.value)}
            style={{padding:'6px 8px',border:'1px solid #d97706',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>
            <option value=''>Tag wählen</option>
            {tournamentDates.map(d=>(
              <option key={d} value={d}>{new Date(d+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</option>
            ))}
          </select>
        )}
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <Clock size={13} color="#b45309"/>
          <input type="time" value={konk.time} onChange={e=>helpers.update(konk.id,'time',e.target.value)}
            style={{padding:'6px 8px',border:'1px solid #d97706',borderRadius:'6px',fontSize:'13px',width:'90px'}}/>
        </div>
        <button onClick={()=>helpers.remove(konk.id)}
          style={{padding:'4px 8px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626',flexShrink:0}}>
          <Trash2 size={14}/>
        </button>
      </div>
      <div style={{padding:'10px 12px',display:'grid',gap:'6px'}}>
        {childList.length===0
          ? <p style={{color:'#999',fontSize:'12px',margin:0}}>Keine Kinder in dieser Gruppe.</p>
          : childList.map(child=>{
            const sub2 = subgroups[child.subgroupId];
            const grp2 = FIXED_GROUPS.find(g=>g.id===sub2?.groupId);
            const sel = (konk.participantIds||[]).includes(child.id);
            return (
              <div key={child.id} onClick={()=>helpers.toggleParticipant(konk.id,child.id)}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'7px',border:`2px solid ${sel?(grp2?.color||'#b45309'):'#eee'}`,background:sel?'#fffbeb':'white',cursor:'pointer'}}>
                <div style={{width:'16px',height:'16px',borderRadius:'3px',border:`2px solid ${sel?(grp2?.color||'#b45309'):'#ccc'}`,background:sel?(grp2?.color||'#b45309'):'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {sel&&<Check size={10} color="white"/>}
                </div>
                <span style={{flex:1,fontSize:'13px',fontWeight:'600',color:'#333'}}>{child.name}
                  {sub2&&<span style={{fontSize:'11px',color:'#999',fontWeight:'400',marginLeft:'5px'}}>{grp2?.emoji} {sub2.name}</span>}
                </span>
                {sel&&(
                  <div onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    <Clock size={11} color="#b45309"/>
                    <input type="time" value={konk.departureTimes?.[child.id]||''}
                      onChange={e=>helpers.setDeparture(konk.id,child.id,e.target.value)}
                      style={{padding:'3px 6px',border:'1px solid #d97706',borderRadius:'5px',fontSize:'12px',width:'82px'}}/>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ── Errungenschaften ─────────────────────────────────────────────────────────
const TTR_MILESTONES = [700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000];
const TTR_COLORS = [
  {bg:'#e8f5e9',text:'#1b5e20'},  // 700
  {bg:'#c8e6c9',text:'#1b5e20'},  // 800
  {bg:'#a5d6a7',text:'#1b5e20'},  // 900
  {bg:'#81c784',text:'#1b5e20'},  // 1000
  {bg:'#66bb6a',text:'#fff'},     // 1100
  {bg:'#4caf50',text:'#fff'},     // 1200
  {bg:'#43a047',text:'#fff'},     // 1300
  {bg:'#388e3c',text:'#fff'},     // 1400
  {bg:'#2e7d32',text:'#fff'},     // 1500
  {bg:'#27632a',text:'#fff'},     // 1600
  {bg:'#1b5e20',text:'#fff'},     // 1700
  {bg:'#145214',text:'#a5d6a7'},  // 1800
  {bg:'#0d3b0d',text:'#81c784'},  // 1900
  {bg:'#072107',text:'#66bb6a'},  // 2000
];

const ACHIEVEMENT_DESCRIPTIONS = {
  ttr: (val) => `Du hast einen TTR-Wert von ${val} erreicht! Der TTR-Wert (Tischtennis-Ranking) misst deine Spielstärke im deutschen Tischtennis.`,
  einzel1: 'Einzelsieger! Du hast ein Turnier im Einzel gewonnen.',
  einzel2: 'Vize-Meister! Du hast im Einzel den 2. Platz belegt.',
  einzel3: '3. Platz Einzel – Bronze ist auch eine Medaille!',
  doppel1: 'Doppelsieger! Du hast ein Turnier im Doppel gewonnen.',
  doppel2: '2. Platz im Doppel – Silber für dich und deinen Partner!',
  doppel3: '3. Platz Doppel – gemeinsam aufs Treppchen!',
  team: 'Mannschaftsmeister! Du hast mit deiner Mannschaft eine Meisterschaft gewonnen.',
  attendanceGold: 'Anzahl der Monate, in denen du bei 100% aller Trainings anwesend warst.',
  attendanceSilver: 'Anzahl der Monate, in denen du bei mindestens 90% aller Trainings anwesend warst.',
  attendanceBronze: 'Anzahl der Monate, in denen du bei mindestens 80% aller Trainings anwesend warst.',
};

function AchievementPopup({ data, onClose }) {
  if (!data) return null;
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:'20px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'360px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>{data.icon}</div>
        <h3 style={{margin:'0 0 8px',color:'#1b5e20',fontSize:'20px'}}>{data.title}</h3>
        <p style={{margin:'0 0 20px',color:'#555',fontSize:'14px',lineHeight:'1.5'}}>{data.desc}</p>
        {data.count !== undefined && data.count > 0 && (
          <div style={{background:'#f0fdf4',borderRadius:'10px',padding:'10px',marginBottom:'16px'}}>
            <span style={{fontWeight:'700',fontSize:'22px',color:'#16a34a'}}>{data.count}×</span>
            <span style={{fontSize:'13px',color:'#555',marginLeft:'6px'}}>erreicht</span>
          </div>
        )}
        <button onClick={onClose} style={{padding:'10px 28px',background:'#358941',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
          Schließen
        </button>
      </div>
    </div>
  );
}

// ── Archiv-Turnier-Dialog (OUTSIDE component to prevent focus loss) ──────────
const RESULT_FIELDS_EINZEL = [
  {field:'p1',  label:'🥇 Einzel 1. Platz'},
  {field:'p2',  label:'🥈 Einzel 2. Platz'},
  {field:'p3a', label:'🥉 Einzel 3. Platz (A)'},
  {field:'p3b', label:'🥉 Einzel 3. Platz (B)'},
];
const RESULT_FIELDS_DOPPEL = [
  {field:'dp1',  label:'🥇 Doppel 1. Platz'},
  {field:'dp2',  label:'🥈 Doppel 2. Platz'},
  {field:'dp3a', label:'🥉 Doppel 3. Platz (A)'},
  {field:'dp3b', label:'🥉 Doppel 3. Platz (B)'},
];

function ArchiveTournDialog({ tournament, onClose, onConfirm }) {
  const [results, setResults] = React.useState(() => {
    const r = {};
    (tournament?.konkurrenzen||[]).forEach(k => {
      r[k.id] = { p1:'', p2:'', p3a:'', p3b:'', dp1:'', dp2:'', dp3a:'', dp3b:'' };
    });
    return r;
  });
  if (!tournament) return null;
  const setResult = (kid, field, val) => setResults(prev => ({...prev, [kid]: {...(prev[kid]||{}), [field]: val}}));
  const konkurrenzen = tournament.konkurrenzen || [];
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px',overflowY:'auto'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'540px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
        <h3 style={{margin:'0 0 4px',color:'#92400e',fontSize:'20px'}}>🏆 Turnier archivieren</h3>
        <p style={{margin:'0 0 20px',color:'#666',fontSize:'13px'}}>{tournament.name} — Ergebnisse eintragen (optional)</p>
        {konkurrenzen.length===0
          ? <p style={{color:'#999',fontSize:'13px',marginBottom:'20px'}}>Keine Konkurrenzen vorhanden.</p>
          : <div style={{display:'grid',gap:'16px',marginBottom:'20px'}}>
            {konkurrenzen.map(konk => {
              const r = results[konk.id] || {};
              const konkDate = konk.date ? new Date(konk.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}) : null;
              return (
                <div key={konk.id} style={{padding:'14px',background:'#fffbeb',borderRadius:'10px',border:'1px solid #fde68a'}}>
                  <p style={{margin:'0 0 12px',fontWeight:'700',color:'#92400e',fontSize:'14px'}}>
                    {konk.name||'(Unbenannte Konkurrenz)'}
                    {konkDate&&<span style={{fontSize:'12px',fontWeight:'400',color:'#b45309',marginLeft:'8px'}}>{konkDate} · {konk.time} Uhr</span>}
                  </p>
                  <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'600',color:'#b45309',textTransform:'uppercase',letterSpacing:'0.4px'}}>Einzel</p>
                  <div style={{display:'grid',gap:'6px',marginBottom:'10px'}}>
                    {RESULT_FIELDS_EINZEL.map(({field,label}) => (
                      <div key={field} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'13px',color:'#555',minWidth:'170px'}}>{label}</span>
                        <input value={r[field]||''} onChange={e=>setResult(konk.id,field,e.target.value)}
                          placeholder="Name oder leer lassen"
                          style={{flex:1,padding:'6px 10px',border:'1px solid #fde68a',borderRadius:'7px',fontSize:'13px'}}/>
                      </div>
                    ))}
                  </div>
                  <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'600',color:'#b45309',textTransform:'uppercase',letterSpacing:'0.4px'}}>Doppel</p>
                  <div style={{display:'grid',gap:'6px'}}>
                    {RESULT_FIELDS_DOPPEL.map(({field,label}) => (
                      <div key={field} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'13px',color:'#555',minWidth:'170px'}}>{label}</span>
                        <input value={r[field]||''} onChange={e=>setResult(konk.id,field,e.target.value)}
                          placeholder="Name oder leer lassen"
                          style={{flex:1,padding:'6px 10px',border:'1px solid #fde68a',borderRadius:'7px',fontSize:'13px'}}/>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        }
        <div style={{display:'grid',gap:'8px'}}>
          <button onClick={()=>onConfirm(results)}
            style={{padding:'12px',background:'#374151',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            📦 Ins Archiv verschieben
          </button>
          <button onClick={onClose}
            style={{padding:'12px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Archiv-Turnier-Bearbeiten-Dialog (OUTSIDE component) ─────────────────────
function ArchiveTournEditDialog({ tournament, onClose, onSave }) {
  const [form, setForm] = React.useState(() => JSON.parse(JSON.stringify(tournament)));
  if (!tournament) return null;
  const setResult = (kid, field, val) =>
    setForm(prev => ({...prev, results: {...(prev.results||{}), [kid]: {...((prev.results||{})[kid]||{}), [field]: val}}}));
  const konkurrenzen = form.konkurrenzen || [];
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px',overflowY:'auto'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'540px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
        <h3 style={{margin:'0 0 16px',color:'#92400e',fontSize:'20px'}}>✏️ Turnier bearbeiten</h3>
        <div style={{display:'grid',gap:'10px',marginBottom:'16px'}}>
          <div>
            <label style={{fontSize:'12px',fontWeight:'600',color:'#555',display:'block',marginBottom:'3px'}}>Name</label>
            <input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
          </div>
          <div>
            <label style={{fontSize:'12px',fontWeight:'600',color:'#555',display:'block',marginBottom:'3px'}}>Ort</label>
            <input value={form.location||''} onChange={e=>setForm(f=>({...f,location:e.target.value}))}
              style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:'600',color:'#555',display:'block',marginBottom:'3px'}}>Von</label>
              <input type="date" value={form.dateFrom||''} onChange={e=>setForm(f=>({...f,dateFrom:e.target.value}))}
                style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:'600',color:'#555',display:'block',marginBottom:'3px'}}>Bis</label>
              <input type="date" value={form.dateTo||''} onChange={e=>setForm(f=>({...f,dateTo:e.target.value}))}
                style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
          </div>
        </div>
        {konkurrenzen.length>0 && (
          <div style={{marginBottom:'16px'}}>
            <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'700',color:'#92400e'}}>Ergebnisse bearbeiten:</p>
            <div style={{display:'grid',gap:'12px'}}>
              {konkurrenzen.map(konk => {
                const r = (form.results||{})[konk.id] || {};
                return (
                  <div key={konk.id} style={{padding:'12px',background:'#fffbeb',borderRadius:'10px',border:'1px solid #fde68a'}}>
                    <p style={{margin:'0 0 10px',fontWeight:'700',color:'#92400e',fontSize:'13px'}}>{konk.name||'(Konkurrenz)'}</p>
                    <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'#b45309',textTransform:'uppercase'}}>Einzel</p>
                    <div style={{display:'grid',gap:'5px',marginBottom:'8px'}}>
                      {RESULT_FIELDS_EINZEL.map(({field,label})=>(
                        <div key={field} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'12px',color:'#555',minWidth:'160px'}}>{label}</span>
                          <input value={r[field]||''} onChange={e=>setResult(konk.id,field,e.target.value)}
                            placeholder="leer lassen"
                            style={{flex:1,padding:'5px 8px',border:'1px solid #fde68a',borderRadius:'6px',fontSize:'13px'}}/>
                        </div>
                      ))}
                    </div>
                    <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'#b45309',textTransform:'uppercase'}}>Doppel</p>
                    <div style={{display:'grid',gap:'5px'}}>
                      {RESULT_FIELDS_DOPPEL.map(({field,label})=>(
                        <div key={field} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'12px',color:'#555',minWidth:'160px'}}>{label}</span>
                          <input value={r[field]||''} onChange={e=>setResult(konk.id,field,e.target.value)}
                            placeholder="leer lassen"
                            style={{flex:1,padding:'5px 8px',border:'1px solid #fde68a',borderRadius:'6px',fontSize:'13px'}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>onSave(form)}
            style={{flex:1,padding:'12px',background:'#374151',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
            💾 Speichern
          </button>
          <button onClick={onClose}
            style={{padding:'12px 20px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Bottom Navigation ─────────────────────────────────────────────────
function MobileBottomNav({ view, navTo, userRole, canEdit, appSettings, unreadCount }) {
  const isTrainer = canEdit();
  const items = isTrainer
    ? [
        { icon:'🏠', label:'Home',       v:'home' },
        { icon:'📅', label:'Training',   v:'trainingsplan' },
        { icon:'🏆', label:'Turniere',   v:'turniere' },
        { icon:'💬', label:'Nachrichten', v:'notifications', badge: unreadCount },
        ...(userRole==='admin' ? [{ icon:'🛡️', label:'Admin', v:'admin' }] : []),
      ]
    : [
        { icon:'🏠', label:'Home',       v:'home' },
        { icon:'💬', label:'Nachrichten', v:'notifications', badge: unreadCount },
        { icon:'📅', label:'Training',   v:'trainingsplan' },
        { icon:'🏆', label:'Turniere',   v:'turniere' },
      ];

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:900,
      background:'rgba(2,26,10,0.96)', backdropFilter:'blur(16px)',
      borderTop:'1px solid rgba(74,222,128,0.12)',
      display:'flex', alignItems:'stretch',
      paddingBottom:'env(safe-area-inset-bottom,0px)',
      boxShadow:'0 -8px 32px rgba(0,0,0,0.4)',
    }}>
      {items.map(item => {
        const active = view === item.v;
        return (
          <button key={item.v} onClick={() => navTo(item.v)}
            style={{
              flex:1, padding:'10px 4px 8px', background:'transparent', border:'none',
              cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center',
              gap:'3px', position:'relative', transition:'opacity 0.12s',
              opacity: active ? 1 : 0.45,
            }}>
            <span style={{
              fontSize:'22px', lineHeight:1,
              filter: active ? 'drop-shadow(0 0 6px rgba(74,222,128,0.7))' : 'none',
              transition:'filter 0.2s',
            }}>{item.icon}</span>
            <span style={{
              fontSize:'10px', fontWeight: active ? '800' : '600',
              color: active ? '#4ade80' : 'rgba(255,255,255,0.5)',
              letterSpacing:'0.2px', lineHeight:1, fontFamily:"'Inter',sans-serif",
            }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{
                position:'absolute', top:'6px', right:'calc(50% - 14px)',
                background:'#dc2626', color:'white', borderRadius:'50%',
                width:'16px', height:'16px', fontSize:'9px', fontWeight:'800',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{item.badge > 9 ? '9+' : item.badge}</span>
            )}
            {active && (
              <span style={{
                position:'absolute', top:0, left:'20%', right:'20%', height:'2px',
                background:'linear-gradient(90deg,transparent,#4ade80,transparent)',
                borderRadius:'99px',
              }}/>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function TrainingsApp() {
  const [user, setUser]               = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [subgroups, setSubgroups]     = useState({});
  const [children, setChildren]       = useState({});
  const [allUsers, setAllUsers]       = useState({});
  const [sessions, setSessions]       = useState({});
  const [tournaments, setTournaments] = useState({});

  const [view, setView]                     = useState('home');
  const [viewKey, setViewKey]               = useState(0);
  const [isMobile, setIsMobile]             = useState(typeof window !== 'undefined' && window.innerWidth <= 600);
  const [activeGroup, setActiveGroup]       = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [activeChild, setActiveChild]       = useState(null);
  const [activeSession, setActiveSession]   = useState(null);

  const [trainingDate, setTrainingDate]         = useState(new Date().toISOString().split('T')[0]);
  const [newSubgroupName, setNewSubgroupName]   = useState('');
  const [newChildName, setNewChildName]         = useState('');
  const [moveChildId, setMoveChildId]           = useState(null);
  const [newSession, setNewSession]             = useState(emptySession);
  const [recurringTemplates, setRecurringTemplates] = useState({});
  const [editingSession, setEditingSession]     = useState(null); // session being edited
  const [editForm, setEditForm]                 = useState({});
  const [deleteDialog, setDeleteDialog]         = useState(null);
  const [resetDialog, setResetDialog]           = useState(false);
  const [resetPassword, setResetPassword]       = useState('');
  const [resetError, setResetError]             = useState('');
  const [dangerSelections, setDangerSelections]         = useState({});
  const [showProfile, setShowProfile]           = useState(false);
  const [pwCurrent, setPwCurrent]               = useState('');
  const [pwNew, setPwNew]                       = useState('');
  const [pwConfirm, setPwConfirm]               = useState('');
  const [pwError, setPwError]                   = useState('');
  const [pwSuccess, setPwSuccess]               = useState(false); // {sessionId, repeatId, blockSize}
  const [adminRoleDialog, setAdminRoleDialog]   = useState(null); // { uid, newRoles } | null
  const [adminRolePw, setAdminRolePw]           = useState('');
  const [adminRoleError, setAdminRoleError]     = useState('');

  const [newTournament, setNewTournament]         = useState(emptyTournament);
  const [editingTournament, setEditingTournament] = useState(null);
  const [editTournForm, setEditTournForm]         = useState({});
  const [tournGroupFilter, setTournGroupFilter]   = useState(null);

  const [archivedSessions, setArchivedSessions]       = useState({});
  const [archivedTournaments, setArchivedTournaments] = useState({});
  const [archiveTab, setArchiveTab]                   = useState('sessions');
  const [archiveTournDialog, setArchiveTournDialog]         = useState(null); // tournament object or null
  const [editingArchivedSession, setEditingArchivedSession] = useState(null);
  const [editArchivedForm, setEditArchivedForm]             = useState({});
  const [editingArchivedTourn, setEditingArchivedTourn]     = useState(null); // tournament object or null
  const [scrollToTournId, setScrollToTournId]               = useState(null);
  const [achievementPopup, setAchievementPopup]             = useState(null);
  const [notifications, setNotifications]                   = useState({});
  const [teams, setTeams]                                   = useState({});
  const [matchdays, setMatchdays]                           = useState({});
  const [appSettings, setAppSettings]                       = useState({mannschaftEnabled: true});
  const [notifComposeTarget, setNotifComposeTarget]         = useState('all'); // 'all' | subgroupId | childId
  const [notifComposeText, setNotifComposeText]             = useState('');
  const [notifComposeTitle, setNotifComposeTitle]           = useState('');
  const [notifTab, setNotifTab]                             = useState('inbox'); // 'inbox' | 'trash'
  const [notifTrainerTab, setNotifTrainerTab]               = useState('sent'); // 'sent' | 'trash' | 'inbox'
  const [showTrainingHistory, setShowTrainingHistory]       = useState(false);
  const [showAchievements, setShowAchievements]             = useState(false);
  const [stayLoggedIn, setStayLoggedIn]                     = useState(false);
  const [registerIsParent, setRegisterIsParent]             = useState(false);
  // Mannschaft form states
  const [teamForm, setTeamForm]                             = useState({name:'', trainerUids:[], childIds:[]});
  const [editingTeam, setEditingTeam]                       = useState(null);
  const [mdForm, setMdForm]                                 = useState({teamId:'',date:'',time:'',location:'',meetingPoint:'',meetingTime:'',isHome:true,opponent:''});
  const [showMdForm, setShowMdForm]                         = useState(false);
  // Practice Tournaments
  const [practiceTournaments, setPracticeTournaments]               = useState({});
  const [archivedPracticeTournaments, setArchivedPracticeTournaments] = useState({});
  const [activePracticeId, setActivePracticeId]                     = useState(null);
  const [ptCreating, setPtCreating]                                 = useState(false);
  const [ptCreateStep, setPtCreateStep]                             = useState(1);
  const [ptCreateForm, setPtCreateForm]                             = useState({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false});
  const [ptSelectedChildren, setPtSelectedChildren]                 = useState([]);
  const [ptSubgroupFilter, setPtSubgroupFilter]                     = useState('all');
  const [ptMatchEditing, setPtMatchEditing]                         = useState(null);
  const [ptMatchDraft, setPtMatchDraft]                             = useState(null);
  const [ptArchiveExpanded, setPtArchiveExpanded]                     = useState({});
  const [ptDetailModal, setPtDetailModal]                           = useState(null);
  const [editingMd, setEditingMd]                           = useState(null);
  const [mdResultForm, setMdResultForm]                     = useState(null); // {id, result}
  const [postponeForm, setPostponeForm]                     = useState(null); // {matchdayId, reason, options:[{date,time}]}
  const [mannTeamFilter, setMannTeamFilter]                 = useState(null);
  const [showParentCompose, setShowParentCompose]           = useState(false);
  const [parentMsgTitle, setParentMsgTitle]                 = useState('');
  const [parentMsgText, setParentMsgText]                   = useState('');

  const [authMode, setAuthMode]           = useState('login');
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName]         = useState('');
  const [error, setError]                 = useState('');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showResetScreen, setShowResetScreen] = useState(false);
  const [resetEmail, setResetEmail]       = useState('');
  const [resetStatus, setResetStatus]     = useState(null); // null | 'sent' | 'error'

  // ── Auth ─────────────────────────────────────────────────────
  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Check inactivity logout (only if not "stay logged in")
        const stayIn = localStorage.getItem(`ttc_stayLoggedIn_${u.uid}`) === '1';
        if (!stayIn) {
          const last = parseInt(localStorage.getItem(`ttc_lastActivity_${u.uid}`) || '0');
          if (last && Date.now() - last > 86400000) {
            await signOut(auth);
            setLoading(false);
            return;
          }
        }
        setUser(u);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          // Backwards compat: roles array or single role string
          const roles = data.roles && data.roles.length > 0 ? data.roles : [data.role];
          const profile = { ...data, roles };
          setUserProfile(profile);
          const selectableRoles = roles.filter(r => r !== 'pending');
          if (selectableRoles.length > 1) {
            setUserRole(selectableRoles[0]);
            setShowRolePicker(true);
          } else {
            setUserRole(roles[0]);
          }
        }
      } else { setUser(null); setUserRole(null); setUserProfile(null); setShowRolePicker(false); }
      setLoading(false);
    });
  }, []);

  // ── Aktivitäts-Tracking (Auto-Logout nach 24h Inaktivität) ───
  useEffect(() => {
    if (!user) return;
    const stayIn = localStorage.getItem(`ttc_stayLoggedIn_${user.uid}`) === '1';
    if (stayIn) return;
    const update = () => localStorage.setItem(`ttc_lastActivity_${user.uid}`, Date.now().toString());
    update();
    window.addEventListener('mousemove', update, { passive: true });
    window.addEventListener('keydown',   update, { passive: true });
    window.addEventListener('click',     update, { passive: true });
    window.addEventListener('touchstart',update, { passive: true });
    return () => {
      window.removeEventListener('mousemove', update);
      window.removeEventListener('keydown',   update);
      window.removeEventListener('click',     update);
      window.removeEventListener('touchstart',update);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !userRole) return;
    const unsubs = [
      onSnapshot(doc(db,'ttc','subgroups'),          s => setSubgroups(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','children'),           s => setChildren(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','sessions'),           s => setSessions(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','recurringTemplates'),  s => setRecurringTemplates(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','tournaments'),        s => setTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedSessions'),   s => setArchivedSessions(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedTournaments'),s => setArchivedTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','notifications'),      s => setNotifications(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','teams'),              s => setTeams(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','matchdays'),          s => setMatchdays(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','appSettings'),        s => setAppSettings(s.exists()?{mannschaftEnabled:true,...s.data()}:{mannschaftEnabled:true})),
      onSnapshot(doc(db,'ttc','practiceTournaments'),          s => setPracticeTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedPracticeTournaments'),  s => setArchivedPracticeTournaments(s.exists()?s.data():{})),
    ];
    if (userRole==='admin')
      unsubs.push(onSnapshot(doc(db,'ttc','users'), s => setAllUsers(s.exists()?s.data():{})));
    return () => unsubs.forEach(u=>u());
  }, [user, userRole]);

  // ── Auto-Notifications ──────────────────────────────────────
  useEffect(() => {
    if (Object.keys(children).length === 0) return;
    if (Object.keys(notifications).length === 0 && Object.keys(sessions).length === 0 && Object.keys(tournaments).length === 0) return;
    const now = new Date();
    const updatedNotifs = { ...notifications };
    let changed = false;

    // 0. Cleanup: Veraltete auto-Erinnerungen wegräumen
    // Gültige Keys = nur zukünftige Sessions/Turniere
    const validTrainingKeys = new Set();
    Object.values(sessions).forEach(sess => {
      const sessStart = new Date(`${sess.date}T${sess.time||'12:00'}:00`);
      if (sessStart > now) {
        (sess.subgroupIds||[]).forEach(subgroupId => {
          getChildrenForSubgroup(subgroupId).forEach(child => {
            validTrainingKeys.add(`training_reminder_${sess.id}_${child.id}`);
          });
        });
      }
    });
    const validTournKeys = new Set();
    Object.values(tournaments).forEach(t => {
      const startDate = t.dateFrom || t.date || '';
      if (!startDate) return;
      const firstTime = (t.konkurrenzen||[])[0]?.time || '12:00';
      const tournStart = new Date(`${startDate}T${firstTime}:00`);
      if (tournStart > now) {
        (t.konkurrenzen||[]).forEach(konk => {
          (konk.participantIds||[]).forEach(childId => {
            validTournKeys.add(`tourn_reminder_${t.id}_${childId}`);
          });
        });
      }
    });
    Object.values(updatedNotifs).forEach(n => {
      if (n.trashedAt) return;
      if (n.type === 'training_reminder' && (!n.key || !validTrainingKeys.has(n.key))) {
        updatedNotifs[n.id] = { ...n, trashedAt: now.toISOString() }; changed = true;
      }
      if (n.type === 'tournament_reminder' && (!n.key || !validTournKeys.has(n.key))) {
        updatedNotifs[n.id] = { ...n, trashedAt: now.toISOString() }; changed = true;
      }
    });

    // Helper: create if not exists (dedup by key)
    const maybeCreate = (childId, type, title, message, key) => {
      const exists = Object.values(updatedNotifs).some(n => n.key === key && !n.trashedAt);
      if (exists) return;
      const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '_' + childId;
      updatedNotifs[id] = { id, childId, type, title, message, createdAt: now.toISOString(), trashedAt: null, key, batchId: null, trainerTrashedAt: {}, trainerDeletedBy: {} };
      changed = true;
    };

    // Helper: auto-trash by key when response exists
    const maybeAutoTrash = (key) => {
      Object.values(updatedNotifs).forEach(n => {
        if (n.key === key && !n.trashedAt) {
          updatedNotifs[n.id] = { ...n, trashedAt: now.toISOString() };
          changed = true;
        }
      });
    };

    // 1. Turnier-Erinnerung: ≤168 Stunden (7 Tage) vorher
    Object.values(tournaments).forEach(t => {
      const startDate = t.dateFrom || t.date || '';
      if (!startDate) return;
      // Use first Konkurrenz time or default noon
      const firstTime = (t.konkurrenzen||[])[0]?.time || '12:00';
      const tournStart = new Date(`${startDate}T${firstTime}:00`);
      const hoursUntil = (tournStart - now) / 3600000;
      (t.konkurrenzen||[]).forEach(konk => {
        (konk.participantIds||[]).forEach(childId => {
          const child = children[childId]; if (!child) return;
          const resp = (t.responses||{})[childId];
          const key = `tourn_reminder_${t.id}_${childId}`;
          if (resp || hoursUntil < 0) {
            // Has answer or tournament started → auto-trash reminder
            maybeAutoTrash(key);
          } else if (hoursUntil >= 0 && hoursUntil <= 168) {
            const hoursText = hoursUntil < 24
              ? `in ${Math.round(hoursUntil)} Stunde${Math.round(hoursUntil)===1?'':'n'}`
              : `in ${Math.round(hoursUntil/24)} Tag${Math.round(hoursUntil/24)===1?'':'en'}`;
            maybeCreate(childId, 'tournament_reminder',
              `⚠️ Turnieranmeldung ausstehend`,
              `Das Turnier „${t.name}" beginnt ${hoursUntil < 1 ? 'gleich' : hoursText}. Bitte Antwort für „${konk.name}" eintragen!`,
              key
            );
          }
        });
      });
    });

    // 2. Training-Erinnerung: ≤24 Stunden vorher
    Object.values(sessions).forEach(sess => {
      const sessStart = new Date(`${sess.date}T${sess.time||'12:00'}:00`);
      const hoursUntil = (sessStart - now) / 3600000;
      (sess.subgroupIds||[]).forEach(subgroupId => {
        getChildrenForSubgroup(subgroupId).forEach(child => {
          const resp = (sess.responses||{})[child.id];
          const key = `training_reminder_${sess.id}_${child.id}`;
          if (resp || hoursUntil < 0) {
            // Has answer or training passed → auto-trash reminder
            maybeAutoTrash(key);
          } else if (hoursUntil >= 0 && hoursUntil <= 24) {
            const dateStr = new Date(sess.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'});
            const hoursText = hoursUntil < 1 ? 'gleich' : `in ${Math.round(hoursUntil)} Stunde${Math.round(hoursUntil)===1?'':'n'}`;
            maybeCreate(child.id, 'training_reminder',
              `📅 Training ${hoursUntil < 2 ? 'gleich' : 'bald'}`,
              `Das Training am ${dateStr} um ${sess.time} Uhr beginnt ${hoursText}. Bitte An- oder Abmeldung eintragen!`,
              key
            );
          }
        });
      });
    });

    // 3. 3× unentschuldigt ohne Eltern-Rückmeldung
    Object.values(children).forEach(child => {
      const allSess = [...Object.values(sessions), ...Object.values(archivedSessions)]
        .filter(s => (s.subgroupIds||[]).includes(child.subgroupId));
      const unexcusedNoReply = allSess.filter(s => {
        const att = (child.attendance||{})[s.date];
        const resp = (s.responses||{})[child.id];
        return att === 'absent_unexcused' && !resp;
      });
      if (unexcusedNoReply.length >= 3) {
        const key = `unexcused_${child.id}_${unexcusedNoReply.length}`;
        maybeCreate(child.id, 'unexcused_absences',
          `❗ Fehlzeiten ohne Rückmeldung`,
          `${child.name} hat ${unexcusedNoReply.length} mal unentschuldigt gefehlt, ohne Rückmeldung. Bitte tragt euch rechtzeitig aus, wenn ihr nicht kommen könnt!`,
          key
        );
      }
    });

    if (changed) saveNotifications(updatedNotifs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, tournaments, children, archivedSessions, notifications]);

  // Scroll to tournament when navigating from home → Turnierwelt
  useEffect(() => {
    if (view === 'turniere' && scrollToTournId) {
      const el = document.getElementById('tourn-' + scrollToTournId);
      if (el) setTimeout(() => el.scrollIntoView({behavior:'smooth', block:'center'}), 150);
      setScrollToTournId(null);
    }
  }, [view, scrollToTournId]);

  const saveSubgroups          = u => { setSubgroups(u);          setDoc(doc(db,'ttc','subgroups'),          u); };
  const saveChildren           = u => { setChildren(u);           setDoc(doc(db,'ttc','children'),           u); };
  const saveSessions           = u => { setSessions(u);           setDoc(doc(db,'ttc','sessions'),           u); };
  const saveRecurringTemplates = u => { setRecurringTemplates(u); setDoc(doc(db,'ttc','recurringTemplates'),  u); };
  const saveTournaments        = u => { setTournaments(u);        setDoc(doc(db,'ttc','tournaments'),        u); };
  const saveArchivedSessions   = u => { setArchivedSessions(u);   setDoc(doc(db,'ttc','archivedSessions'),   u); };
  const saveArchivedTournaments= u => { setArchivedTournaments(u);setDoc(doc(db,'ttc','archivedTournaments'),u); };
  const saveNotifications      = u => { setNotifications(u);      setDoc(doc(db,'ttc','notifications'),      u); };
  const saveTeams              = u => { setTeams(u);              setDoc(doc(db,'ttc','teams'),              u); };
  const saveMatchdays          = u => { setMatchdays(u);          setDoc(doc(db,'ttc','matchdays'),          u); };
  const saveAppSettings                  = u => { setAppSettings(u);                  setDoc(doc(db,'ttc','appSettings'),                  u); };
  const savePracticeTournaments          = u => { setPracticeTournaments(u);          setDoc(doc(db,'ttc','practiceTournaments'),          u); };
  const saveArchivedPracticeTournaments  = u => { setArchivedPracticeTournaments(u);  setDoc(doc(db,'ttc','archivedPracticeTournaments'),  u); };

  // ── Notification Helpers ─────────────────────────────────────
  const createNotification = (childId, type, title, message, key=null) => {
    const now = new Date().toISOString();
    if (key) {
      const exists = Object.values(notifications).some(n => n.key===key && !n.trashedAt);
      if (exists) return;
    }
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const notif = { id, childId, type, title, message, createdAt: now, trashedAt: null, key, batchId: null, trainerTrashedAt: {}, trainerDeletedBy: {} };
    saveNotifications({ ...notifications, [id]: notif });
  };

  // Child-side trash (only affects child's inbox)
  const trashNotification = (id) => {
    const n = notifications[id]; if (!n) return;
    saveNotifications({ ...notifications, [id]: { ...n, trashedAt: new Date().toISOString() } });
  };
  const restoreNotification = (id) => {
    const n = notifications[id]; if (!n) return;
    saveNotifications({ ...notifications, [id]: { ...n, trashedAt: null } });
  };
  const deleteNotificationPermanently = (id) => {
    const u = { ...notifications }; delete u[id]; saveNotifications(u);
  };

  // Trainer-side trash: per-user uid maps, does NOT touch child's trashedAt
  // trainerTrashedAt: { [uid]: isoString }
  // trainerDeletedBy: { [uid]: true }
  const trainerTrashBatch = (batchId) => {
    if (!user?.uid) return;
    const now = new Date().toISOString();
    const u = { ...notifications };
    Object.values(u).forEach(n => {
      if (n.batchId !== batchId) return;
      const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? { ...n.trainerTrashedAt } : {};
      const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? { ...n.trainerDeletedBy } : {};
      if (!tdb[user.uid] && !tta[user.uid])
        u[n.id] = { ...n, trainerTrashedAt: { ...tta, [user.uid]: now }, trainerDeletedBy: tdb };
    });
    saveNotifications(u);
  };
  const trainerRestoreBatch = (batchId) => {
    if (!user?.uid) return;
    const u = { ...notifications };
    Object.values(u).forEach(n => {
      if (n.batchId !== batchId) return;
      const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? { ...n.trainerTrashedAt } : {};
      delete tta[user.uid];
      u[n.id] = { ...n, trainerTrashedAt: tta };
    });
    saveNotifications(u);
  };
  const trainerDeleteBatch = (batchId) => {
    if (!user?.uid) return;
    const u = { ...notifications };
    Object.values(u).forEach(n => {
      if (n.batchId !== batchId) return;
      const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? { ...n.trainerDeletedBy } : {};
      const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? { ...n.trainerTrashedAt } : {};
      delete tta[user.uid];
      u[n.id] = { ...n, trainerDeletedBy: { ...tdb, [user.uid]: true }, trainerTrashedAt: tta };
    });
    saveNotifications(u);
  };

  // Admin: delete ALL trainer_message notifications (cleanup old stuck messages)
  const adminDeleteAllTrainerMessages = () => {
    if (!window.confirm('Alle manuell gesendeten Nachrichten (trainer_message) aus allen Accounts löschen? Automatische Benachrichtigungen bleiben erhalten.')) return;
    const u = {};
    Object.values(notifications).forEach(n => { if (n.type !== 'trainer_message') u[n.id] = n; });
    saveNotifications(u);
  };

  // Cleanup expired notifications (called lazily on read for child view)
  const getCleanedNotifications = (childId) => {
    const now = new Date();
    const toDelete = [];
    const active = [];
    const trashed = [];
    Object.values(notifications).forEach(n => {
      if (n.childId !== childId) return;
      const daysSinceCreated = (now - new Date(n.createdAt)) / 86400000;
      if (n.trashedAt) {
        const daysTrashed = (now - new Date(n.trashedAt)) / 86400000;
        if (daysTrashed >= 7) toDelete.push(n.id);
        else trashed.push(n);
      } else {
        if (daysSinceCreated >= 14) toDelete.push(n.id);
        else active.push(n);
      }
    });
    if (toDelete.length > 0) {
      const u = { ...notifications };
      toDelete.forEach(id => delete u[id]);
      saveNotifications(u);
    }
    return { active: active.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), trashed: trashed.sort((a,b)=>b.trashedAt.localeCompare(a.trashedAt)) };
  };

  // Navigation helper – increments viewKey so CSS enter-animation fires
  const navTo = (v) => { setView(v); setViewKey(k => k + 1); };

  const canEdit = () => ['admin','trainer'].includes(userRole);

  // Groups this user may access: admins see all, trainers only their assigned groups
  const getMyGroupIds = () => {
    if (userRole === 'admin') return FIXED_GROUPS.map(g=>g.id);
    if (userRole === 'trainer') {
      const assigned = userProfile?.groupIds || [];
      return assigned.length > 0 ? assigned : FIXED_GROUPS.map(g=>g.id); // fallback: all (legacy)
    }
    return [];
  };
  const canAccessGroup = (groupId) => getMyGroupIds().includes(groupId);
  // can a session be seen? at least one subgroup must belong to an accessible group
  const canAccessSession = (sess) =>
    (sess.subgroupIds||[]).some(sid => canAccessGroup(subgroups[sid]?.groupId));

  const getSubgroupsForGroup = gid => Object.values(subgroups).filter(s=>s.groupId===gid);
  const getChildrenForSubgroup = sid => Object.values(children).filter(c=>c.subgroupId===sid).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  const getMyChild = () => userProfile?.linkedChildId ? children[userProfile.linkedChildId]||null : null;

  const getAttendanceStats = (childId, subgroupId) => {
    const child=children[childId], sub=subgroups[subgroupId];
    if (!child||!sub) return {present:0,unexcused:0,excused:0,total:0,percent:0};
    const dates=sub.trainingDates||[], att=child.attendance||{};
    const present=dates.filter(d=>att[d]==='present').length;
    const unexcused=dates.filter(d=>att[d]==='absent_unexcused').length;
    const excused=dates.filter(d=>att[d]==='absent_excused').length;
    return {present,unexcused,excused,total:dates.length, percent:dates.length>0?Math.round((present/dates.length)*100):0};
  };

  // Sessions für eine Untergruppe (zukünftig)
  const getSevenDaysAgo = () => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; };

  const getUpcomingSessionsForSubgroup = (subgroupId) => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sessions)
      .filter(s => s.date >= today && (s.subgroupIds||[]).includes(subgroupId))
      .sort((a,b) => a.date.localeCompare(b.date));
  };
  // Sessions für einen bestimmten Spieler (Gruppe + extraPlayerIds)
  const getUpcomingSessionsForChild = (childId, subgroupId) => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sessions)
      .filter(s => s.date >= today && (
        (s.subgroupIds||[]).includes(subgroupId) ||
        (s.extraPlayerIds||[]).includes(childId)
      ))
      .sort((a,b) => a.date.localeCompare(b.date));
  };

  const getAllUpcomingSessions = () => {
    const cutoff = getSevenDaysAgo();
    return Object.values(sessions).filter(s=>s.date>=cutoff).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  };

  // Prüfen ob Eltern/Jugendliche das Kind für ein Datum abgemeldet/angemeldet haben
  // Gibt { status: 'coming'|'missing', by: 'self'|'parent' } oder null zurück
  const getParentResponse = (childId, date) => {
    const child = children[childId];
    const matching = Object.values(sessions).filter(s =>
      s.date===date && (
        (s.subgroupIds||[]).some(sid => child?.subgroupId===sid) ||
        (s.extraPlayerIds||[]).includes(childId)
      )
    );
    for (const s of matching) {
      const r = (s.responses||{})[childId];
      if (!r) continue;
      if (typeof r === 'object') return r;
      return { status: r, by: 'parent' }; // legacy
    }
    return null;
  };

  // ── Auth Handler ─────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const uid = cred.user.uid;
      if (stayLoggedIn) {
        localStorage.setItem(`ttc_stayLoggedIn_${uid}`, '1');
        localStorage.removeItem(`ttc_lastActivity_${uid}`);
      } else {
        localStorage.removeItem(`ttc_stayLoggedIn_${uid}`);
        localStorage.setItem(`ttc_lastActivity_${uid}`, Date.now().toString());
      }
    }
    catch { setError('Login fehlgeschlagen!'); }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess(false);
    if (!pwCurrent) { setPwError('Bitte aktuelles Passwort eingeben!'); return; }
    if (pwNew.length < 6) { setPwError('Neues Passwort muss mindestens 6 Zeichen lang sein!'); return; }
    if (pwNew !== pwConfirm) { setPwError('Neue Passwörter stimmen nicht überein!'); return; }
    try {
      const credential = EmailAuthProvider.credential(user.email, pwCurrent);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, pwNew);
      setPwSuccess(true);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      if (err.code === 'auth/wrong-password') setPwError('Aktuelles Passwort ist falsch!');
      else setPwError('Fehler: ' + err.message);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(loginEmail); // pre-fill if they already typed email
    setResetStatus(null);
    setShowResetScreen(true);
  };
  const handleSendReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetStatus('sending');
    try {
      const actionCodeSettings = {
        url: window.location.origin, // redirect back to app after reset
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, resetEmail.trim(), actionCodeSettings);
      setResetStatus('sent');
    } catch(err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setResetStatus('notfound');
      } else if (code === 'auth/too-many-requests') {
        setResetStatus('ratelimit');
      } else {
        setResetStatus('error:' + code);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError('');
    if (!loginName.trim()) { setError('Bitte Name eingeben!'); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const profile = { uid:cred.user.uid, email:loginEmail, name:loginName, role:'pending', linkedChildId:null, isParent: registerIsParent };
      await setDoc(doc(db,'users',cred.user.uid), profile);
      const snap = await getDoc(doc(db,'ttc','users'));
      await setDoc(doc(db,'ttc','users'), { ...(snap.exists()?snap.data():{}), [cred.user.uid]:profile });
      setUserRole('pending'); setUserProfile(profile);
    } catch(err) { setError('Fehler: '+err.message); }
  };

  // ── Dauereinheiten materialisieren ─────────────────────────────────────
  const localDateStr = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const materializeRecurringSessions = (templates, currentSessions) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 28);
    const updated = {...currentSessions};
    let changed = false;
    Object.values(templates).forEach(tmpl => {
      const start = new Date(today);
      const diff = (tmpl.dayOfWeek - start.getDay() + 7) % 7;
      start.setDate(start.getDate() + diff);
      const cur = new Date(start);
      while(cur <= horizon) {
        const dateStr = localDateStr(cur);
        const exists = Object.values(currentSessions).some(s => s.templateId === tmpl.id && s.date === dateStr);
        if(!exists) {
          const id = 'session_rt_' + tmpl.id + '_' + dateStr;
          updated[id] = { id, subgroupIds: tmpl.subgroupIds, extraPlayerIds: tmpl.extraPlayerIds||[], date: dateStr, time: tmpl.time, trainer: tmpl.trainer, info: tmpl.info, templateId: tmpl.id, repeatId: null, responses: {} };
          changed = true;
        }
        cur.setDate(cur.getDate() + 7);
      }
    });
    if(changed) saveSessions(updated);
  };

  // Run materialization when templates change
  useEffect(() => {
    if(Object.keys(recurringTemplates).length > 0) {
      materializeRecurringSessions(recurringTemplates, sessions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringTemplates]);

  // ── Training anlegen ─────────────────────────────────────────
  const createSession = () => {
    const { subgroupIds, extraPlayerIds, date, time, trainer, info, repeat, repeatWeeks, isRecurring } = newSession;
    if (!time || subgroupIds.length===0) { alert('Bitte mindestens eine Untergruppe auswählen!'); return; }
    if (!isRecurring && !date) { alert('Bitte ein Datum auswählen!'); return; }
    const extras = extraPlayerIds||[];

    if (isRecurring) {
      const dayOfWeek = new Date(date+'T12:00:00').getDay();
      const id = 'rt_' + Date.now();
      const tmpl = { id, subgroupIds, extraPlayerIds: extras, dayOfWeek, time, trainer, info, startDate: date, createdAt: new Date().toISOString() };
      const updatedTemplates = { ...recurringTemplates, [id]: tmpl };
      saveRecurringTemplates(updatedTemplates);
      materializeRecurringSessions(updatedTemplates, sessions);
      setNewSession(emptySession);
      return;
    }

    const updated = { ...sessions };
    const repeatId = repeat ? 'repeat_' + Date.now() : null;
    if (repeat) {
      for (let i=0; i<repeatWeeks; i++) {
        const d = new Date(date+'T12:00:00');
        d.setDate(d.getDate()+i*7);
        const dateStr = d.toISOString().split('T')[0];
        const id = 'session_'+Date.now()+'_'+i;
        updated[id] = { id, subgroupIds, extraPlayerIds: extras, date:dateStr, time, trainer, info, repeatId, responses:{} };
      }
    } else {
      const id = 'session_'+Date.now();
      updated[id] = { id, subgroupIds, extraPlayerIds: extras, date, time, trainer, info, repeatId:null, responses:{} };
    }
    saveSessions(updated);
    setNewSession(emptySession);
  };

  const deleteSession = (id) => {
    if (!window.confirm('Diese Trainingseinheit löschen?')) return;
    const u={...sessions}; delete u[id]; saveSessions(u);
  };

  const deleteRecurringTemplate = (templateId) => {
    if (!window.confirm('Dauereinheit und alle zukünftigen Termine löschen?')) return;
    const updTemplates = {...recurringTemplates}; delete updTemplates[templateId];
    saveRecurringTemplates(updTemplates);
    const today = localDateStr(new Date());
    const updSessions = Object.fromEntries(Object.entries(sessions).filter(([,s]) => !(s.templateId===templateId && s.date>=today)));
    saveSessions(updSessions);
  };

  const deleteRepeatBlock = (repeatId) => {
    if (!window.confirm('Alle Einheiten dieser Wiederholungsreihe löschen?')) return;
    const u = Object.fromEntries(Object.entries(sessions).filter(([,s])=>s.repeatId!==repeatId));
    saveSessions(u);
  };

  const startEdit = (session) => {
    setEditingSession(session.id);
    setEditForm({ ...session });
  };

  const saveEdit = (blockEdit=false) => {
    const updated = {...sessions};
    if (blockEdit && editForm.repeatId) {
      // Alle Einheiten der Reihe bearbeiten (nur Zeit/Trainer/Info/Untergruppen, nicht Datum)
      Object.keys(updated).forEach(key => {
        if (updated[key].repeatId===editForm.repeatId) {
          updated[key] = { ...updated[key], time:editForm.time, trainer:editForm.trainer, info:editForm.info, subgroupIds:editForm.subgroupIds };
        }
      });
    } else {
      updated[editForm.id] = { ...editForm };
    }
    saveSessions(updated);
    setEditingSession(null);
  };

  const respondToSession = (sessionId, response) => {
    const myChild = getMyChild();
    const childId = myChild?.id || user?.uid;
    const session = sessions[sessionId];
    if (!session) return;
    const curRaw = (session.responses||{})[childId];
    const curStatus = typeof curRaw === 'object' ? curRaw?.status : curRaw;
    // Toggle: if same status → remove, else set new
    const by = userRole === 'jugendlich' ? 'self' : 'parent';
    const newVal = curStatus === response ? null : { status: response, by };
    const updatedSessions = { ...sessions, [sessionId]: { ...session, responses: { ...(session.responses||{}), [childId]: newVal } } };
    saveSessions(updatedSessions);
    // Auto-set attendance to absent_excused when marking as missing
    if (response === 'missing' && curStatus !== 'missing' && myChild) {
      saveChildren({ ...children, [myChild.id]: { ...myChild, attendance: { ...(myChild.attendance||{}), [session.date]: 'absent_excused' } } });
    }
  };

  const ensureTrainingDate = (sid, date) => {
    const sub=subgroups[sid];
    if (!sub) return;
    const dates=sub.trainingDates||[];
    if (!dates.includes(date)) saveSubgroups({...subgroups,[sid]:{...sub,trainingDates:[...dates,date].sort()}});
  };

  const setStatus = (childId, status) => {
    ensureTrainingDate(activeSubgroup.id, trainingDate);
    const child=children[childId];
    const cur=(child.attendance||{})[trainingDate];
    const next=cur===status?null:status;
    const att={...(child.attendance||{}),[trainingDate]:next};
    if (next===null) delete att[trainingDate];
    saveChildren({...children,[childId]:{...child,attendance:att}});
  };

  const excuseMyChild = (date) => {
    const child=getMyChild();
    if (!child) return;
    saveChildren({...children,[child.id]:{...child,attendance:{...(child.attendance||{}),[date]:'absent_excused'}}});
  };

  // Eltern/Jugendliche → Trainer Nachricht schicken
  const sendParentMessage = () => {
    if (!parentMsgTitle.trim() || !parentMsgText.trim()) { alert('Bitte Betreff und Text eingeben!'); return; }
    const child = getMyChild();
    const sub2 = child ? subgroups[child.subgroupId] : null;
    const grpId = sub2?.groupId;
    if (!grpId) { alert('Keine Gruppe gefunden.'); return; }
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const now = new Date().toISOString();
    const msg = { id, type:'parent_message', childId: null, toGroupId: grpId, fromChildId: child.id, fromName: child.name, title: parentMsgTitle.trim(), message: parentMsgText.trim(), createdAt: now, trashedAt: null };
    saveNotifications({ ...notifications, [id]: msg });
    setParentMsgTitle(''); setParentMsgText(''); setShowParentCompose(false);
    alert('✅ Nachricht an Trainer gesendet!');
  };


  const handleResetAllAttendance = async () => {
    setResetError('');
    try {
      const credential = EmailAuthProvider.credential(user.email, resetPassword);
      await reauthenticateWithCredential(user, credential);
      // Anwesenheiten + trainingDates bei allen Kindern/Gruppen löschen
      const updatedChildren = Object.fromEntries(
        Object.entries(children).map(([id, child]) => [id, { ...child, attendance: {} }])
      );
      const updatedSubgroups = Object.fromEntries(
        Object.entries(subgroups).map(([id, sub]) => [id, { ...sub, trainingDates: [] }])
      );
      saveChildren(updatedChildren);
      saveSubgroups(updatedSubgroups);
      saveSessions({});
      setResetDialog(false);
      setResetPassword('');
      alert('✅ Alle Anwesenheitsdaten wurden erfolgreich zurückgesetzt!');
    } catch {
      setResetError('Falsches Passwort! Bitte nochmal versuchen.');
    }
  };

  const createTournament = () => {
    const { name, location, dateFrom, dateTo, konkurrenzen } = newTournament;
    if (!name.trim() || !dateFrom) { alert('Bitte Name und Datum angeben!'); return; }
    const id = 'tournament_' + Date.now();
    saveTournaments({ ...tournaments, [id]: { id, name, location, dateFrom, dateTo: dateTo||dateFrom, konkurrenzen: konkurrenzen||[], responses: {} } });
    setNewTournament(emptyTournament);
  };

  const deleteTournament = (id) => {
    if (!window.confirm('Turnier löschen?')) return;
    const u = { ...tournaments }; delete u[id]; saveTournaments(u);
  };

  const saveTournamentEdit = () => {
    saveTournaments({ ...tournaments, [editTournForm.id]: { ...editTournForm } });
    setEditingTournament(null);
  };

  const respondToTournament = (tournamentId, response) => {
    const myChild = getMyChild();
    const childId = myChild?.id || user?.uid;
    const t = tournaments[tournamentId];
    if (!t) return;
    const cur = (t.responses||{})[childId];
    saveTournaments({ ...tournaments, [tournamentId]: { ...t, responses: { ...(t.responses||{}), [childId]: cur===response?null:response } } });
  };

  const getUpcomingTournaments = () => {
    const cutoff = getSevenDaysAgo();
    return Object.values(tournaments)
      .filter(t => (t.dateTo||t.dateFrom||t.date||'') >= cutoff)
      .sort((a,b) => (a.dateFrom||a.date||'').localeCompare(b.dateFrom||b.date||''));
  };

  // Alle childIds die in mindestens einer Konkurrenz eines Turniers sind
  const getTournamentParticipantIds = (t) =>
    [...new Set((t.konkurrenzen||[]).flatMap(k => k.participantIds||[]))];

  const getMyUpcomingTournaments = () => {
    const myChild = getMyChild();
    if (!myChild) return [];
    const today = new Date().toISOString().split('T')[0];
    return Object.values(tournaments)
      .filter(t => (t.dateTo||t.dateFrom||t.date||'') >= today && getTournamentParticipantIds(t).includes(myChild.id))
      .sort((a,b) => (a.dateFrom||a.date||'').localeCompare(b.dateFrom||b.date||''));
  };

  // Hilfsfunktionen für Konkurrenz-Bearbeitung in einem Formular
  const konkurrenzHelpers = (form, setForm) => ({
    add: () => setForm({ ...form, konkurrenzen: [...(form.konkurrenzen||[]), emptyKonkurrenz()] }),
    remove: (kid) => setForm({ ...form, konkurrenzen: (form.konkurrenzen||[]).filter(k=>k.id!==kid) }),
    update: (kid, field, val) => setForm({ ...form, konkurrenzen: (form.konkurrenzen||[]).map(k=>k.id===kid?{...k,[field]:val}:k) }),
    toggleParticipant: (kid, childId) => {
      const konk = (form.konkurrenzen||[]).find(k=>k.id===kid);
      if (!konk) return;
      const ids = konk.participantIds||[];
      const next = ids.includes(childId) ? ids.filter(i=>i!==childId) : [...ids, childId];
      const dep = { ...konk.departureTimes };
      if (!next.includes(childId)) delete dep[childId];
      setForm({ ...form, konkurrenzen: (form.konkurrenzen||[]).map(k=>k.id===kid?{...k,participantIds:next,departureTimes:dep}:k) });
    },
    setDeparture: (kid, childId, time) => {
      setForm({ ...form, konkurrenzen: (form.konkurrenzen||[]).map(k=>k.id===kid?{...k,departureTimes:{...k.departureTimes,[childId]:time}}:k) });
    },
  });

  // ── Archiv-Logik ─────────────────────────────────────────────
  const isTournamentArchivable = (t) => {
    const endDate = t.dateTo || t.dateFrom || t.date || '';
    if (!endDate) return false;
    const dayAfter = new Date(endDate + 'T12:00:00');
    dayAfter.setDate(dayAfter.getDate() + 1);
    return new Date().toISOString().split('T')[0] >= dayAfter.toISOString().split('T')[0];
  };

  const openArchiveTournDialog = (t) => setArchiveTournDialog(t);

  const confirmArchiveTournament = (results) => {
    const t = archiveTournDialog;
    const archivedAt = new Date().toISOString();
    saveArchivedTournaments({ ...archivedTournaments, [t.id]: { ...t, archivedAt, results } });
    const u = { ...tournaments }; delete u[t.id]; saveTournaments(u);
    setArchiveTournDialog(null);
  };

  const saveArchivedTournEdit = (form) => {
    saveArchivedTournaments({ ...archivedTournaments, [form.id]: form });
    setEditingArchivedTourn(null);
  };

  // ── Errungenschaften Helpers ─────────────────────────────────
  const getAchievements = (childId) => children[childId]?.achievements || {};
  const saveChildAchievements = (childId, newAch) => {
    // Use functional setChildren to always work with the latest state (avoids stale closures)
    setChildren(prev => {
      const prevChild = prev[childId];
      if (!prevChild) return prev;
      const updated = { ...prev, [childId]: { ...prevChild, achievements: newAch } };
      setDoc(doc(db,'ttc','children'), updated);
      return updated;
    });
  };

  const getMonthlyAttendanceLevel = (childId, yearMonth) => {
    const child = children[childId];
    if (!child) return null;
    const allSess = [...Object.values(sessions), ...Object.values(archivedSessions)];
    const monthSess = allSess.filter(s => (s.date||'').startsWith(yearMonth) && (s.subgroupIds||[]).includes(child.subgroupId));
    if (monthSess.length === 0) return null;
    const present = monthSess.filter(s => (child.attendance||{})[s.date] === 'present').length;
    const pct = Math.round((present / monthSess.length) * 100);
    if (pct >= 100) return 'gold';
    if (pct >= 90) return 'silver';
    if (pct >= 80) return 'bronze';
    return null;
  };

  const getAttendanceCumulatives = (childId) => {
    const allSess = [...Object.values(sessions), ...Object.values(archivedSessions)];
    const currentMonth = new Date().toISOString().slice(0,7);
    const months = [...new Set(allSess.map(s=>(s.date||'').slice(0,7)).filter(m=>m && m<currentMonth))];
    let gold=0, silver=0, bronze=0;
    months.forEach(m => {
      const lvl = getMonthlyAttendanceLevel(childId, m);
      if (lvl==='gold') gold++;
      else if (lvl==='silver') silver++;
      else if (lvl==='bronze') bronze++;
    });
    return { gold, silver, bronze };
  };

  const getTotalTrainingsAttended = (childId) => {
    const child = children[childId];
    if (!child) return 0;
    return Object.values(child.attendance||{}).filter(s=>s==='present').length;
  };

  const getLongestStreak = (childId) => {
    const child = children[childId];
    if (!child) return 0;
    const allSess = [...Object.values(sessions), ...Object.values(archivedSessions)]
      .filter(s => (s.subgroupIds||[]).includes(child.subgroupId))
      .sort((a,b) => (a.date||'').localeCompare(b.date||''));
    let max=0, cur=0;
    allSess.forEach(s => {
      const st = (child.attendance||{})[s.date];
      if (st==='present') { cur++; if(cur>max) max=cur; }
      else if (st) { cur=0; } // only reset on recorded absence
    });
    return max;
  };

  const getTournamentParticipations = (childId) => {
    const all = [...Object.values(tournaments), ...Object.values(archivedTournaments)];
    return all.filter(t => getTournamentParticipantIds(t).includes(childId)).length;
  };

  const deleteArchivedSession = (id) => {
    if (!window.confirm('Eintrag wirklich endgültig aus dem Archiv löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const u = {...archivedSessions}; delete u[id]; saveArchivedSessions(u);
  };

  const deleteArchivedTournament = (id) => {
    if (!window.confirm('Turnier wirklich endgültig aus dem Archiv löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const u = {...archivedTournaments}; delete u[id]; saveArchivedTournaments(u);
  };

  const restoreTournament = (t) => {
    const { archivedAt, results, ...rest } = t;
    saveTournaments({ ...tournaments, [rest.id]: rest });
    const u = { ...archivedTournaments }; delete u[rest.id]; saveArchivedTournaments(u);
  };

  const isSessionArchivable = (session) => {
    const subs = (session.subgroupIds||[]).map(id=>subgroups[id]).filter(Boolean);
    const allKids = subs.flatMap(sub => getChildrenForSubgroup(sub.id));
    if (allKids.length === 0) return false;
    return allKids.every(c => !!(children[c.id]?.attendance||{})[session.date]);
  };

  const archiveSession = (session) => {
    const archivedAt = new Date().toISOString();
    saveArchivedSessions({ ...archivedSessions, [session.id]: { ...session, archivedAt } });
    const u = { ...sessions }; delete u[session.id]; saveSessions(u);
  };

  const restoreSession = (session) => {
    const { archivedAt, ...rest } = session;
    saveSessions({ ...sessions, [rest.id]: rest });
    const u = { ...archivedSessions }; delete u[rest.id]; saveArchivedSessions(u);
  };

  const saveArchivedSessionEdit = () => {
    const { editAttendance, ...sessionData } = editArchivedForm;
    // Update children attendance in Firestore
    if (editAttendance && sessionData.date) {
      const updatedChildren = { ...children };
      Object.entries(editAttendance).forEach(([childId, status]) => {
        if (updatedChildren[childId]) {
          updatedChildren[childId] = { ...updatedChildren[childId], attendance: { ...(updatedChildren[childId].attendance||{}), [sessionData.date]: status || undefined } };
          if (!status) delete updatedChildren[childId].attendance[sessionData.date];
        }
      });
      saveChildren(updatedChildren);
    }
    saveArchivedSessions({ ...archivedSessions, [sessionData.id]: sessionData });
    setEditingArchivedSession(null);
  };

  const getSessionAttendanceStats = (session) => {
    const subs = (session.subgroupIds||[]).map(id=>subgroups[id]).filter(Boolean);
    return subs.map(sub => {
      const kids = getChildrenForSubgroup(sub.id);
      const present = kids.filter(c=>(children[c.id]?.attendance||{})[session.date]==='present').length;
      const excused = kids.filter(c=>(children[c.id]?.attendance||{})[session.date]==='absent_excused').length;
      const unexcused = kids.filter(c=>(children[c.id]?.attendance||{})[session.date]==='absent_unexcused').length;
      const total = kids.length;
      const grp = FIXED_GROUPS.find(g=>g.id===sub.groupId);
      return { sub, grp, present, excused, unexcused, total, percent: total>0?Math.round((present/total)*100):0 };
    });
  };

  const changeUserRole = async (uid, newRole) => {
    const updated={...allUsers,[uid]:{...allUsers[uid],role:newRole}};
    await setDoc(doc(db,'ttc','users'),updated);
    await setDoc(doc(db,'users',uid),{...allUsers[uid],role:newRole});
    setAllUsers(updated);
  };

  // Save roles array for a user (admin function)
  const saveUserRoles = async (uid, roles) => {
    // Keep legacy `role` field as first role for backwards compat
    const primaryRole = roles[0] || 'pending';
    const updated = { ...allUsers, [uid]: { ...allUsers[uid], roles, role: primaryRole } };
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users',uid), { ...allUsers[uid], roles, role: primaryRole });
    setAllUsers(updated);
  };

  const saveUserGroupIds = async (uid, groupIds) => {
    const updated = { ...allUsers, [uid]: { ...allUsers[uid], groupIds } };
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users',uid), { ...allUsers[uid], groupIds });
    setAllUsers(updated);
  };

  const linkChildToUser = async (uid, childId) => {
    const updated={...allUsers,[uid]:{...allUsers[uid],linkedChildId:childId||null}};
    await setDoc(doc(db,'ttc','users'),updated);
    await setDoc(doc(db,'users',uid),{...allUsers[uid],linkedChildId:childId||null});
    setAllUsers(updated);
  };

  const exportSubgroupExcel = (sub) => {
    const kids  = getChildrenForSubgroup(sub.id);
    const dates = (sub.trainingDates||[]).sort();
    const grp   = FIXED_GROUPS.find(g=>g.id===sub.groupId);
    const grpName = grp?.name || sub.groupId;
    const subName = sub.name;

    const WOCHENTAGE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const MONATE     = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    const isoKW = (d) => {
      const dt = new Date(d.getTime());
      dt.setHours(0,0,0,0);
      dt.setDate(dt.getDate()+3-(dt.getDay()+6)%7);
      const week1 = new Date(dt.getFullYear(),0,4);
      return 1+Math.round(((dt.getTime()-week1.getTime())/86400000-3+(week1.getDay()+6)%7)/7);
    };

    const header = [
      'Gruppe','Untergruppe','Name',
      'Datum_DE','Datum_ISO',
      'Wochentag','KW','Monat','Jahr',
      'Status',
      'Anwesend','Entschuldigt','Unentschuldigt'
    ].join(';');

    const rows = [];
    dates.forEach(dateISO => {
      const dt  = new Date(dateISO+'T12:00:00');
      const datDE = dt.toLocaleDateString('de-DE');
      const wt  = WOCHENTAGE[dt.getDay()];
      const kw  = isoKW(dt);
      const mon = MONATE[dt.getMonth()];
      const yr  = dt.getFullYear();
      kids.forEach(child => {
        const att = (child.attendance||{})[dateISO];
        const statusText =
          att === 'present'          ? 'Anwesend'       :
          att === 'absent_excused'   ? 'Entschuldigt'   :
          att === 'absent_unexcused' ? 'Unentschuldigt' : 'Keine Angabe';
        rows.push([
          grpName, subName, child.name,
          datDE, dateISO,
          wt, kw, mon, yr,
          statusText,
          att==='present'?1:0,
          att==='absent_excused'?1:0,
          att==='absent_unexcused'?1:0
        ].join(';'));
      });
    });

    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().split('T')[0];
    link.download = `TTC_${grpName}_${subName}_Pivot_${fileDate}.csv`;
    link.click();
  };
  function addSubgroup() {
    if (!newSubgroupName.trim()) return;
    const id='sub_'+Date.now();
    saveSubgroups({...subgroups,[id]:{id,name:newSubgroupName,groupId:activeGroup.id,trainingDates:[]}});
    setNewSubgroupName('');
  }
  function deleteSubgroup(sid) {
    if (!window.confirm('Untergruppe löschen?')) return;
    const u={...subgroups}; delete u[sid]; saveSubgroups(u);
  }
  function addChild() {
    if (!newChildName.trim()) return;
    const id='child_'+Date.now();
    saveChildren({...children,[id]:{id,name:newChildName,subgroupId:activeSubgroup.id,attendance:{}}});
    setNewChildName('');
  }
  function deleteChild(cid) {
    if (!window.confirm('Kind löschen?')) return;
    const u={...children}; delete u[cid]; saveChildren(u);
  }
  function moveChild(cid,newSid) {
    saveChildren({...children,[cid]:{...children[cid],subgroupId:newSid}});
    setMoveChildId(null);
  }

  const s = {
    page:  (color=null) => ({minHeight:'100vh', background: view==='turniere' ? 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)' : 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}),
    wrap:  {maxWidth:'900px',margin:'0 auto',padding:isMobile?'12px 12px 90px':'20px'},
    card:  {background:'white',borderRadius:'12px',padding:isMobile?'14px':'20px',marginBottom:'14px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
    btn:   (bg,col='white',sm=false)=>({padding:sm?'6px 12px':'10px 16px',background:bg,color:col,border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:sm?'13px':'14px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}),
    input: {padding:'10px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',flex:1,minWidth:0},
    label: {fontSize:'13px',fontWeight:'600',color:'#555',marginBottom:'4px',display:'block'},
  };

  if (loading) return <div style={{...s.page(activeGroup?.color),display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'white',fontSize:'20px'}}>Laden...</p></div>;

  // ── Passwort-Reset Screen ─────────────────────────────────────
  if (!user && showResetScreen) return (
    <div className="ttc-view-enter" key="reset" style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <img src="/logo.png" alt="TTC Logo" style={{width:'100px',height:'100px',objectFit:'contain',borderRadius:'18px',display:'block',margin:'0 auto 18px',filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.6))'}}/>
          <h1 style={{margin:'0 0 4px',color:'white',fontSize:'22px',fontWeight:'900'}}>Passwort zurücksetzen</h1>
          <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'13px'}}>TTC Grün-Weiß Staffel</p>
        </div>

        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:'20px',padding:'28px',border:'1px solid rgba(74,222,128,0.12)'}}>
          {resetStatus==='sent' ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'52px',marginBottom:'16px'}}>📬</div>
              <h2 style={{margin:'0 0 10px',color:'#4ade80',fontSize:'18px',fontWeight:'800'}}>E-Mail wurde gesendet!</h2>
              <p style={{margin:'0 0 6px',color:'rgba(255,255,255,0.7)',fontSize:'14px',lineHeight:'1.5'}}>
                Wir haben eine E-Mail an <strong style={{color:'white'}}>{resetEmail}</strong> gesendet.
              </p>
              <p style={{margin:'0 0 24px',color:'rgba(255,255,255,0.45)',fontSize:'13px',lineHeight:'1.5'}}>
                Bitte prüfe auch deinen Spam-Ordner. Der Link ist 1 Stunde gültig.
              </p>
              <button onClick={()=>{setShowResetScreen(false);setResetStatus(null);}}
                style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'800',cursor:'pointer'}}>
                ← Zurück zum Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendReset} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div>
                <p style={{margin:'0 0 16px',color:'rgba(255,255,255,0.6)',fontSize:'14px',lineHeight:'1.6'}}>
                  Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
                </p>
                <input type="email" placeholder="Deine E-Mail-Adresse" value={resetEmail}
                  onChange={e=>setResetEmail(e.target.value)} required autoFocus
                  style={{padding:'13px 16px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'12px',color:'white',fontSize:'15px',outline:'none',width:'100%',boxSizing:'border-box'}}/>
              </div>
              {resetStatus==='notfound'&&(
                <div style={{padding:'10px 14px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',color:'#f87171',fontSize:'13px',fontWeight:'600'}}>
                  ❌ Diese E-Mail-Adresse ist nicht registriert.
                </div>
              )}
              {resetStatus==='ratelimit'&&(
                <div style={{padding:'10px 14px',background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:'10px',color:'#fbbf24',fontSize:'13px',fontWeight:'600'}}>
                  ⏳ Zu viele Anfragen. Bitte warte einige Minuten.
                </div>
              )}
              {resetStatus&&resetStatus.startsWith('error:')&&(
                <div style={{padding:'10px 14px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',color:'#f87171',fontSize:'13px',fontWeight:'600'}}>
                  ❌ Fehler: {resetStatus.replace('error:','')||'Unbekannt'}. Bitte versuche es erneut.
                </div>
              )}
              <button type="submit" disabled={resetStatus==='sending'}
                style={{padding:'14px',background:resetStatus==='sending'?'#374151':'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'800',cursor:resetStatus==='sending'?'wait':'pointer',boxShadow:'0 4px 20px rgba(22,163,74,0.35)'}}>
                {resetStatus==='sending'?'⏳ Sende…':'📧 Reset-Link senden'}
              </button>
              <button type="button" onClick={()=>{setShowResetScreen(false);setResetStatus(null);}}
                style={{padding:'11px',background:'transparent',color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>
                ← Zurück zum Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        {/* Logo & Titel */}
        <div style={{textAlign:'center',marginBottom:'36px'}}>
          <img src="/logo.png" alt="TTC Logo" style={{width:'125px',height:'125px',objectFit:'contain',borderRadius:'20px',display:'block',margin:'0 auto 20px',filter:'drop-shadow(0 8px 32px rgba(0,0,0,0.6))'}}/>
          <h1 style={{margin:'0 0 4px',color:'white',fontSize:'26px',fontWeight:'900',letterSpacing:'-0.5px'}}>TTC Grün-Weiß Staffel</h1>
          <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'13px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1px'}}>Vereinsapp</p>
        </div>

        {/* Card */}
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'24px',padding:'32px',backdropFilter:'blur(10px)',boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}}>
          {/* Tab-Switcher */}
          <div style={{display:'flex',marginBottom:'28px',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'4px',gap:'4px'}}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setAuthMode(m);setError('');}}
                style={{flex:1,padding:'10px',background:authMode===m?'linear-gradient(135deg,#15803d,#16a34a)':'transparent',color:authMode===m?'white':'rgba(255,255,255,0.4)',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'14px',borderRadius:'9px',transition:'all 0.15s',boxShadow:authMode===m?'0 4px 12px rgba(22,163,74,0.35)':'none'}}>
                {m==='login'?'Anmelden':'Registrieren'}
              </button>
            ))}
          </div>

          {error&&<div style={{marginBottom:'16px',padding:'12px 14px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'12px',fontSize:'13px',color:'#fca5a5',fontWeight:'600',textAlign:'center'}}>{error}</div>}

          <form onSubmit={authMode==='login'?handleLogin:handleRegister} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {authMode==='register'&&(
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <input placeholder="Dein Name / Das meines Kindes" value={loginName} onChange={e=>setLoginName(e.target.value)} required
                  style={{padding:'12px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'15px',outline:'none',width:'100%',boxSizing:'border-box'}}/>
                <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'14px',color:'rgba(255,255,255,0.6)',userSelect:'none',padding:'8px 12px',background:'rgba(74,222,128,0.05)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'10px'}}>
                  <input type="checkbox" checked={registerIsParent} onChange={e=>setRegisterIsParent(e.target.checked)}
                    style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#4ade80',flexShrink:0}}/>
                  <span style={{flexShrink:0,whiteSpace:'nowrap'}}>Ich bin ein Elternteil</span>
                </label>
              </div>
            )}
            <input type="email" placeholder="E-Mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required
              style={{padding:'12px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'15px',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
              style={{padding:'12px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'15px',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            {authMode==='login'&&(
              <label style={{display:'flex',alignItems:'center',gap:'9px',cursor:'pointer',fontSize:'14px',color:'rgba(255,255,255,0.5)',userSelect:'none',paddingLeft:'2px'}}>
                <input type="checkbox" checked={stayLoggedIn} onChange={e=>setStayLoggedIn(e.target.checked)}
                  style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#4ade80'}}/>
                Eingeloggt bleiben
              </label>
            )}
            <button type="submit"
              style={{marginTop:'4px',padding:'14px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',fontWeight:'800',cursor:'pointer',boxShadow:'0 4px 20px rgba(22,163,74,0.4)',letterSpacing:'-0.2px'}}>
              {authMode==='login'?'Anmelden →':'Registrieren →'}
            </button>
          </form>

          {authMode==='register'&&(
            <div style={{marginTop:'16px',padding:'12px 14px',background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'12px',fontSize:'13px',color:'rgba(74,222,128,0.7)',lineHeight:'1.5'}}>
              Nach der Registrierung wird dein Account von einem Admin freigeschaltet.
            </div>
          )}
          {authMode==='login'&&(
            <div style={{marginTop:'14px',textAlign:'center'}}>
              <button onClick={handleForgotPassword}
                style={{background:'none',border:'none',color:'rgba(74,222,128,0.6)',cursor:'pointer',fontSize:'13px',fontWeight:'700',textDecoration:'underline',textUnderlineOffset:'3px',textDecorationColor:'rgba(74,222,128,0.3)'}}>
                🔑 Passwort vergessen?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Rollenwahl-Modal (Mehrfachrollen) ───────────────────────
  if (showRolePicker) {
    const selectableRoles = (userProfile?.roles || [userRole]).filter(r => r !== 'pending');
    const roleAccents = {
      admin:      {icon:'🛡️', accent:'rgba(196,181,253,0.9)', accentBg:'rgba(196,181,253,0.1)', accentBorder:'rgba(196,181,253,0.3)', desc:'Vollzugriff auf alle Bereiche'},
      trainer:    {icon:'🏓', accent:'rgba(134,239,172,0.9)', accentBg:'rgba(134,239,172,0.1)', accentBorder:'rgba(134,239,172,0.3)', desc:'Trainingsplanung, Gruppen & Turniere'},
      eltern:     {icon:'👨‍👩‍👧', accent:'rgba(253,230,138,0.9)', accentBg:'rgba(253,230,138,0.08)', accentBorder:'rgba(253,230,138,0.25)', desc:'Übersicht & An-/Abmeldung für dein Kind'},
      jugendlich: {icon:'🧒', accent:'rgba(110,231,183,0.9)', accentBg:'rgba(110,231,183,0.08)', accentBorder:'rgba(110,231,183,0.25)', desc:'Eigene Übersicht, Turniere & Errungenschaften'},
    };
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{width:'100%',maxWidth:'420px'}}>
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:'32px'}}>
          <img src="/logo.png" alt="TTC Logo" style={{width:'104px',height:'104px',objectFit:'contain',borderRadius:'18px',display:'block',margin:'0 auto 14px',filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.55))'}}/>
            <p style={{margin:'0 0 4px',color:'rgba(74,222,128,0.55)',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1.5px'}}>TTC Grün-Weiß Staffel</p>
            <h2 style={{margin:0,color:'white',fontSize:'22px',fontWeight:'800',letterSpacing:'-0.3px'}}>Willkommen, {(userProfile?.name||'').split(' ')[0]}!</h2>
          </div>

          {/* Card */}
          <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'24px',padding:'28px',boxShadow:'0 32px 80px rgba(0,0,0,0.5)'}}>
            <p style={{margin:'0 0 20px',color:'rgba(255,255,255,0.4)',fontSize:'14px',textAlign:'center',fontWeight:'500'}}>Mit welcher Rolle möchtest du fortfahren?</p>
            <div style={{display:'grid',gap:'10px'}}>
              {selectableRoles.map(role => {
                const ra = roleAccents[role] || {icon:'👤',accent:'rgba(255,255,255,0.7)',accentBg:'rgba(255,255,255,0.05)',accentBorder:'rgba(255,255,255,0.15)',desc:''};
                return (
                  <button key={role} onClick={()=>{ setUserRole(role); setShowRolePicker(false); navTo('home'); }}
                    style={{padding:'16px 18px',background:ra.accentBg,border:`1px solid ${ra.accentBorder}`,borderRadius:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',transition:'all 0.12s',width:'100%'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.3)`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
                    <div style={{width:'48px',height:'48px',borderRadius:'13px',background:`rgba(0,0,0,0.2)`,border:`1px solid ${ra.accentBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{ra.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:'0 0 3px',fontWeight:'800',fontSize:'16px',color:ra.accent}}>{ROLE_CONFIG[role]?.label||role}</p>
                      <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)',lineHeight:'1.4'}}>{ra.desc}</p>
                    </div>
                    <span style={{color:ra.accentBorder,fontSize:'18px',flexShrink:0}}>›</span>
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
              <button onClick={()=>signOut(auth)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole==='pending') return (
    <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{width:'100%',maxWidth:'400px',textAlign:'center'}}>
        <div style={{width:'80px',height:'80px',borderRadius:'22px',background:'linear-gradient(135deg,#15803d,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'38px',margin:'0 auto 20px',boxShadow:'0 8px 32px rgba(74,222,128,0.3)'}}>⏳</div>
        <h2 style={{margin:'0 0 10px',color:'white',fontSize:'24px',fontWeight:'800',letterSpacing:'-0.3px'}}>Account wird freigeschaltet</h2>
        <p style={{margin:'0 0 32px',color:'rgba(255,255,255,0.45)',fontSize:'15px',lineHeight:'1.6'}}>
          Hallo <strong style={{color:'#4ade80'}}>{userProfile?.name}</strong>!<br/>Ein Admin schaltet deinen Account bald frei.
        </p>
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'20px',padding:'24px',marginBottom:'20px'}}>
          <p style={{margin:'0 0 6px',color:'rgba(74,222,128,0.6)',fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px'}}>Registriert als</p>
          <p style={{margin:0,color:'white',fontSize:'16px',fontWeight:'700'}}>{userProfile?.email}</p>
        </div>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <button onClick={()=>window.location.reload()}
            style={{padding:'12px 22px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'14px',boxShadow:'0 4px 16px rgba(22,163,74,0.35)'}}>
            🔄 Neu laden
          </button>
          <button onClick={()=>signOut(auth)}
            style={{padding:'12px 22px',background:'rgba(220,38,38,0.12)',color:'#fca5a5',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
            <LogOut size={16}/> Abmelden
          </button>
        </div>
      </div>
    </div>
  );

  const Header = ({back,backLabel,backAction}) => {
    const rc=ROLE_CONFIG[userRole]||{};
    return (
      <>
        {/* Profil Modal */}
        {showProfile&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <h3 style={{margin:'0 0 4px',color:'#333',fontSize:'20px'}}>Mein Profil</h3>
              <p style={{margin:'0 0 24px',color:'#999',fontSize:'13px'}}>{user?.email} · <span style={{color:rc.color,fontWeight:'600'}}>{rc.label}</span></p>
              <h4 style={{margin:'0 0 12px',color:'#333',fontSize:'15px'}}>Passwort ändern</h4>
              {pwSuccess&&<div style={{marginBottom:'12px',padding:'10px',background:'#dcfce7',borderRadius:'8px',fontSize:'13px',color:'#16a34a',fontWeight:'600'}}>✅ Passwort erfolgreich geändert!</div>}
              {pwError&&<div style={{marginBottom:'12px',padding:'10px',background:'#fee2e2',borderRadius:'8px',fontSize:'13px',color:'#dc2626'}}>{pwError}</div>}
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                <input type="password" placeholder="Aktuelles Passwort" value={pwCurrent} onChange={e=>setPwCurrent(e.target.value)} style={{...s.input,flex:'none'}}/>
                <input type="password" placeholder="Neues Passwort (min. 6 Zeichen)" value={pwNew} onChange={e=>setPwNew(e.target.value)} style={{...s.input,flex:'none'}}/>
                <input type="password" placeholder="Neues Passwort bestätigen" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleChangePassword()} style={{...s.input,flex:'none'}}/>
                <button onClick={handleChangePassword} style={{padding:'10px',background:'#358941',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  Passwort ändern
                </button>
              </div>
              <button onClick={()=>{setShowProfile(false);setPwError('');setPwSuccess(false);setPwCurrent('');setPwNew('');setPwConfirm('');}}
                style={{width:'100%',padding:'10px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                Schließen
              </button>
            </div>
          </div>
        )}
        <div style={{...s.card,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            {back&&<button onClick={backAction} style={s.btn('#f3f4f6','#333')}><ArrowLeft size={18}/> {backLabel}</button>}
            <div>
              <h1 style={{margin:'0 0 2px',color:'#358941',fontSize:'20px'}}>TTC Grün-Weiß Staffel</h1>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{background:'none',border:'none',padding:0,cursor:'pointer'}}>
                  <p style={{margin:0,color:'#999',fontSize:'12px',textDecoration:'underline'}}>{userProfile?.name||user?.email}</p>
                </button>
                <span style={{fontSize:'11px',fontWeight:'700',color:rc.color,background:rc.bg,padding:'2px 8px',borderRadius:'20px'}}>{rc.label}</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {view!=='home'&&<button onClick={()=>navTo('home')} style={s.btn('#358941')} title="Startseite"><Home size={16}/></button>}
            {/* Rollenwechsel – nur bei Mehrfachrollen */}
            {(()=>{
              const selectableRoles = (userProfile?.roles||[userRole]).filter(r=>r!=='pending');
              if (selectableRoles.length < 2) return null;
              return (
                <button onClick={()=>setShowRolePicker(true)}
                  style={{...s.btn('#6b7280'),position:'relative'}} title="Rolle wechseln">
                  👤 Rolle wechseln
                </button>
              );
            })()}
            {userRole==='admin'&&<button onClick={()=>navTo('admin')} style={s.btn('#7c3aed')}><Shield size={16}/> Admin</button>}
            {canEdit()&&<button onClick={()=>navTo('trainingsplan')} style={s.btn('#0369a1')}><Calendar size={16}/> Trainingsplan</button>}
            {canEdit()&&<button onClick={()=>navTo('turniere')} style={s.btn('#b45309')}><Trophy size={16}/> Turniere</button>}
            {canEdit()&&<button onClick={()=>navTo('archiv')} style={s.btn('#374151')}><Archive size={16}/> Archiv</button>}
            {canEdit()&&<button onClick={()=>navTo('achievements')} style={s.btn('#7c3aed')}>🏅 Errungenschaften</button>}
            {canEdit()&&appSettings.mannschaftEnabled&&<button onClick={()=>navTo('mannschaft')} style={s.btn('#0f766e')}>⚽ Mannschaft</button>}
            {canEdit()&&(()=>{
              // Badge = nur eingehende Eltern-Nachrichten für zugängliche Gruppen
              const unreadCount = Object.values(notifications).filter(n =>
                n.type === 'parent_message' && !n.trashedAt && canAccessGroup(n.toGroupId)
              ).length;
              return (
                <button onClick={()=>navTo('notifications')} style={{...s.btn('#059669'),position:'relative'}} title="Benachrichtigungen">
                  <MessageSquare size={16}/>
                  {unreadCount>0&&<span style={{position:'absolute',top:'-6px',right:'-6px',background:'#dc2626',color:'white',borderRadius:'50%',width:'18px',height:'18px',fontSize:'10px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{unreadCount>9?'9+':unreadCount}</span>}
                </button>
              );
            })()}
            <button onClick={()=>signOut(auth)} style={s.btn('#ef4444')}><LogOut size={16}/></button>
          </div>
        </div>
      </>
    );
  };

  // ── CUSTOM DELETE DIALOG ─────────────────────────────────────
  const DeleteDialog = () => {
    if (!deleteDialog) return null;
    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
        <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'380px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
          <h3 style={{margin:'0 0 8px',color:'#333',fontSize:'18px'}}>Einheit löschen</h3>
          <p style={{margin:'0 0 24px',color:'#666',fontSize:'14px'}}>
            Diese Einheit gehört zu einer Wiederholungsreihe ({deleteDialog.blockSize} Einheiten). Was möchtest du löschen?
          </p>
          <div style={{display:'grid',gap:'10px'}}>
            <button onClick={()=>{ deleteSession(deleteDialog.sessionId); setDeleteDialog(null); }}
              style={{padding:'12px',background:'#fee2e2',color:'#dc2626',border:'2px solid #dc2626',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px',textAlign:'left'}}>
              🗑️ Nur diese eine Einheit löschen
            </button>
            <button onClick={()=>{ deleteRepeatBlock(deleteDialog.repeatId); setDeleteDialog(null); }}
              style={{padding:'12px',background:'#fef3c7',color:'#d97706',border:'2px solid #d97706',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px',textAlign:'left'}}>
              🗑️ Alle {deleteDialog.blockSize} Einheiten der Reihe löschen
            </button>
            <button onClick={()=>setDeleteDialog(null)}
              style={{padding:'12px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── TRAININGSPLAN ────────────────────────────────────────────
  if (view==='trainingsplan') {
    const upcoming=getAllUpcomingSessions().filter(s=>canAccessSession(s));
    const allSubs=Object.values(subgroups).filter(s=>canAccessGroup(s.groupId)).sort((a,b)=>{
      const ga=FIXED_GROUPS.findIndex(g=>g.id===a.groupId), gb=FIXED_GROUPS.findIndex(g=>g.id===b.groupId);
      return ga-gb || a.name.localeCompare(b.name,'de');
    });

    const toggleSubgroup = (sid) => {
      const ids=newSession.subgroupIds||[];
      setNewSession({...newSession, subgroupIds: ids.includes(sid)?ids.filter(i=>i!==sid):[...ids,sid]});
    };
    const toggleExtraPlayer = (cid) => {
      const ids=newSession.extraPlayerIds||[];
      setNewSession({...newSession, extraPlayerIds: ids.includes(cid)?ids.filter(i=>i!==cid):[...ids,cid]});
    };

    const toggleEditSubgroup = (sid) => {
      const ids=editForm.subgroupIds||[];
      setEditForm({...editForm, subgroupIds: ids.includes(sid)?ids.filter(i=>i!==sid):[...ids,sid]});
    };

    // Wiederholungsblöcke
    const repeatBlocks = {};
    upcoming.forEach(s => { if (s.repeatId) { if (!repeatBlocks[s.repeatId]) repeatBlocks[s.repeatId]=[]; repeatBlocks[s.repeatId].push(s); }});

    return (
      <div style={{minHeight:'100vh',background:"linear-gradient(135deg,#0c2d6b 0%,#0369a1 100%)",fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <DeleteDialog/>
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#0369a1')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📅 Trainingsplan</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

        {/* Neue Einheit */}
        <div style={{...s.card,border:'1px solid #e0f2fe'}}>
          <h2 style={{margin:'0 0 20px',color:'#0369a1',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800'}}><Plus size={20}/> Neue Trainingseinheit</h2>

          {/* Untergruppen auswählen */}
          <div style={{marginBottom:'16px'}}>
            <label style={s.label}>Untergruppen (mehrere möglich)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
              {allSubs.length===0
                ? <p style={{color:'#999',fontSize:'13px'}}>Noch keine Untergruppen vorhanden.</p>
                : allSubs.map(sub=>{
                  const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                  const selected=(newSession.subgroupIds||[]).includes(sub.id);
                  return (
                    <button key={sub.id} onClick={()=>toggleSubgroup(sub.id)}
                      style={{padding:'6px 12px',border:`2px solid ${grp?.color||'#ddd'}`,borderRadius:'20px',background:selected?(grp?.color||'#358941'):'white',color:selected?'white':(grp?.color||'#333'),cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>
                      {grp?.emoji} {sub.name}
                    </button>
                  );
                })
              }
            </div>
          </div>

          {/* Einzelspieler hinzufügen – Dropdown */}
          <div style={{marginBottom:'16px'}}>
            <label style={s.label}>Einzelspieler (optional – zusätzlich zu Gruppen)</label>
            {/* Dropdown */}
            <select
              value=""
              onChange={e=>{ if(e.target.value) toggleExtraPlayer(e.target.value); }}
              style={{width:'100%',padding:'10px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',color:'#333',background:'white',cursor:'pointer',marginBottom:'8px'}}>
              <option value="">+ Spieler hinzufügen…</option>
              {allChildrenList
                .filter(child=>!(newSession.subgroupIds||[]).includes(child.subgroupId) && !(newSession.extraPlayerIds||[]).includes(child.id))
                .map(child=>{
                  const sub=subgroups[child.subgroupId];
                  const grp=FIXED_GROUPS.find(g=>g.id===sub?.groupId);
                  return <option key={child.id} value={child.id}>{child.name}{sub?` – ${grp?.emoji||''} ${sub.name}`:''}</option>;
                })
              }
            </select>
            {/* Ausgewählte Spieler als entfernbare Chips */}
            {(newSession.extraPlayerIds||[]).length>0&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {(newSession.extraPlayerIds||[]).map(cid=>{
                  const child=children[cid]; if(!child) return null;
                  const sub=subgroups[child.subgroupId];
                  const grp=FIXED_GROUPS.find(g=>g.id===sub?.groupId);
                  return (
                    <span key={cid} style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#fef3c7',border:'1px solid #d97706',borderRadius:'20px',fontSize:'12px',fontWeight:'700',color:'#92400e'}}>
                      {child.name}
                      {sub&&<span style={{fontSize:'10px',color:'#b45309',fontWeight:'600'}}>{grp?.emoji} {sub.name}</span>}
                      <button onClick={()=>toggleExtraPlayer(cid)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#d97706',fontWeight:'900',fontSize:'14px',lineHeight:1,padding:'0 0 0 2px'}}>×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div>
              <label style={s.label}>Trainer</label>
              <input style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} placeholder="Name des Trainers" value={newSession.trainer} onChange={e=>setNewSession({...newSession,trainer:e.target.value})}/>
            </div>
            <div></div>
            <div>
              <label style={s.label}>Datum</label>
              <input type="date" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={newSession.date} onChange={e=>setNewSession({...newSession,date:e.target.value})}/>
            </div>
            <div>
              <label style={s.label}>Uhrzeit</label>
              <input type="time" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={newSession.time} onChange={e=>setNewSession({...newSession,time:e.target.value})}/>
            </div>
          </div>

          <div style={{marginBottom:'12px'}}>
            <label style={s.label}>Infos / Ausrüstung</label>
            <textarea style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box',resize:'vertical',minHeight:'60px'}} placeholder="z.B. Laufschuhe mitbringen..." value={newSession.info} onChange={e=>setNewSession({...newSession,info:e.target.value})}/>
          </div>

          <div style={{marginBottom:'16px',padding:'14px',background:'#f0f9ff',borderRadius:'8px',border:'1px solid #bae6fd'}}>
            {/* Dauereinheit */}
            <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:'10px'}}>
              <input type="checkbox" checked={newSession.isRecurring} onChange={e=>setNewSession({...newSession,isRecurring:e.target.checked,repeat:false})} style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#15803d'}}/>
              <span style={{fontWeight:'700',color:'#15803d',fontSize:'14px'}}>∞ Dauereinheit (kein Enddatum)</span>
            </label>
            {newSession.isRecurring&&(
              <div style={{padding:'10px',background:'#f0fdf4',borderRadius:'6px',border:'1px solid #86efac',marginBottom:'8px'}}>
                <p style={{margin:'0 0 4px',fontSize:'13px',color:'#15803d',fontWeight:'600'}}>
                  Wiederholt sich jeden {newSession.date ? WEEKDAYS[new Date(newSession.date+'T12:00:00').getDay()] : '...'} · ab {newSession.date||'Datum wählen'}
                </p>
                <p style={{margin:0,fontSize:'12px',color:'#16a34a'}}>Wird automatisch in die geplanten Einheiten eingetragen, bis du sie löschst.</p>
              </div>
            )}
            {/* Wöchentlich wiederholen */}
            {!newSession.isRecurring&&(<>
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:newSession.repeat?'12px':0}}>
                <input type="checkbox" checked={newSession.repeat} onChange={e=>setNewSession({...newSession,repeat:e.target.checked})} style={{width:'18px',height:'18px',cursor:'pointer'}}/>
                <span style={{fontWeight:'600',color:'#0369a1',fontSize:'14px'}}><RefreshCw size={16} style={{display:'inline',marginRight:'6px'}}/>Wöchentlich wiederholen</span>
              </label>
              {newSession.repeat&&(
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <label style={{...s.label,margin:0}}>Wochen:</label>
                  <input type="number" min="1" max="52" value={newSession.repeatWeeks} onChange={e=>setNewSession({...newSession,repeatWeeks:parseInt(e.target.value)||1})} style={{width:'70px',padding:'6px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'14px'}}/>
                  <span style={{fontSize:'13px',color:'#0369a1'}}>= {newSession.repeatWeeks}x jeden {WEEKDAYS[new Date(newSession.date+'T12:00:00').getDay()]}</span>
                </div>
              )}
            </>)}
          </div>
          <button onClick={createSession} style={s.btn(newSession.isRecurring?'#15803d':'#0369a1')}>
            <Calendar size={18}/> {newSession.isRecurring?'Dauereinheit anlegen':newSession.repeat?`${newSession.repeatWeeks} Einheiten anlegen`:'Einheit anlegen'}
          </button>
        </div>

        {/* Dauereinheiten */}
        {Object.values(recurringTemplates).length > 0 && (
          <div style={s.card}>
            <h2 style={{margin:'0 0 16px',color:'#15803d',display:'flex',alignItems:'center',gap:'8px'}}>∞ Dauereinheiten</h2>
            <div style={{display:'grid',gap:'8px'}}>
              {Object.values(recurringTemplates).map(tmpl => {
                const tmplSubs = (tmpl.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                return (
                  <div key={tmpl.id} style={{padding:'12px 14px',borderRadius:'10px',border:'2px solid #86efac',background:'#f0fdf4',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'20px'}}>∞</span>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginBottom:'4px'}}>
                        {tmplSubs.map(sub=>{
                          const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                          return <span key={sub.id} style={{fontSize:'11px',fontWeight:'700',color:grp?.color,background:grp?.bg||'#f3f4f6',padding:'1px 7px',borderRadius:'20px',border:'1px solid '+(grp?.color||'#ccc')}}>{grp?.emoji} {sub.name}</span>;
                        })}
                      </div>
                      <p style={{margin:0,fontWeight:'700',color:'#15803d',fontSize:'14px'}}>
                        Jeden {WEEKDAYS[tmpl.dayOfWeek]} · {tmpl.time} Uhr
                        {tmpl.trainer&&<span style={{fontWeight:'400',color:'#555'}}> · 👤 {tmpl.trainer}</span>}
                      </p>
                      {tmpl.info&&<p style={{margin:'2px 0 0',fontSize:'12px',color:'#16a34a'}}>{tmpl.info}</p>}
                    </div>
                    <button onClick={()=>deleteRecurringTemplate(tmpl.id)}
                      style={{padding:'5px 10px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:'6px',color:'#dc2626',cursor:'pointer',fontWeight:'700',fontSize:'12px',flexShrink:0}}>
                      Löschen
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Geplante Einheiten */}
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:'#0369a1'}}>📅 Geplante Einheiten</h2>
          {upcoming.length===0
            ? <p style={{color:'#999',textAlign:'center',padding:'30px'}}>Noch keine Einheiten geplant.</p>
            : <div style={{display:'grid',gap:'10px'}}>
              {upcoming.map(session=>{
                const sessionSubs=(session.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                const isEditing=editingSession===session.id;
                const responses=session.responses||{};
                const getStatus=r=>typeof r==='object'?r?.status:r;
                const coming=Object.values(responses).filter(r=>getStatus(r)==='coming').length;
                const missing=Object.values(responses).filter(r=>getStatus(r)==='missing').length;
                const blockSize=session.repeatId?(repeatBlocks[session.repeatId]||[]).length:0;
                const sessionIsPast = session.date < new Date().toISOString().split('T')[0];

                return (
                  <div key={session.id} style={{padding:'14px',borderRadius:'10px',border:`1px solid ${sessionIsPast?'#fca5a5':'#ddd'}`,background:sessionIsPast?'#fff5f5':'white'}}>
                    {isEditing ? (
                      /* Bearbeitungsformular */
                      <div>
                        <h4 style={{margin:'0 0 12px',color:'#0369a1'}}>Einheit bearbeiten</h4>
                        <div style={{marginBottom:'10px'}}>
                          <label style={s.label}>Untergruppen</label>
                          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                            {allSubs.map(sub=>{
                              const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                              const sel=(editForm.subgroupIds||[]).includes(sub.id);
                              return <button key={sub.id} onClick={()=>toggleEditSubgroup(sub.id)} style={{padding:'4px 10px',border:`2px solid ${grp?.color||'#ddd'}`,borderRadius:'20px',background:sel?(grp?.color||'#358941'):'white',color:sel?'white':(grp?.color||'#333'),cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>{grp?.emoji} {sub.name}</button>;
                            })}
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                          <div><label style={s.label}>Datum</label><input type="date" value={editForm.date} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/></div>
                          <div><label style={s.label}>Uhrzeit</label><input type="time" value={editForm.time} onChange={e=>setEditForm({...editForm,time:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/></div>
                        </div>
                        <div style={{marginBottom:'8px'}}><label style={s.label}>Trainer</label><input value={editForm.trainer||''} onChange={e=>setEditForm({...editForm,trainer:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/></div>
                        <div style={{marginBottom:'12px'}}><label style={s.label}>Info</label><textarea value={editForm.info||''} onChange={e=>setEditForm({...editForm,info:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box',resize:'vertical',minHeight:'50px'}}/></div>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          <button onClick={()=>saveEdit(false)} style={s.btn('#358941',undefined,true)}><Save size={14}/> Diese speichern</button>
                          {session.repeatId&&<button onClick={()=>saveEdit(true)} style={s.btn('#0369a1',undefined,true)}><Save size={14}/> Alle {blockSize} speichern</button>}
                          <button onClick={()=>setEditingSession(null)} style={s.btn('#f3f4f6','#333',true)}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      /* Normale Ansicht */
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',flexWrap:'wrap'}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'6px'}}>
                            {sessionSubs.map(sub=>{
                              const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                              return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:grp?.color,background:grp?.bg||'#f3f4f6',padding:'2px 8px',borderRadius:'20px',border:`1px solid ${grp?.color}`}}>{grp?.emoji} {sub.name}</span>;
                            })}
                            {session.repeatId&&<span style={{fontSize:'11px',color:'#0369a1',background:'#e0f2fe',padding:'2px 8px',borderRadius:'20px'}}><RefreshCw size={10} style={{display:'inline'}}/> Block ({blockSize}x)</span>}
                            {session.templateId&&<span style={{fontSize:'11px',color:'#15803d',background:'#dcfce7',padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>∞ Dauereinheit</span>}
                            {sessionIsPast&&<span style={{fontSize:'11px',fontWeight:'700',color:'white',background:'#dc2626',padding:'2px 8px',borderRadius:'20px'}}>Vergangen</span>}
                          </div>
                          <p style={{margin:'0 0 2px',fontWeight:'600',color:'#333'}}>
                            {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})} · {session.time} Uhr
                          </p>
                          {session.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#555'}}>👤 Trainer: {session.trainer}</p>}
                          {session.info&&<p style={{margin:'0 0 4px',fontSize:'13px',color:'#0369a1',display:'flex',alignItems:'center',gap:'4px'}}><Info size={13}/> {session.info}</p>}
                          {missing>0&&<p style={{margin:0,fontSize:'12px',color:'#94a3b8'}}>✗ {missing} abgemeldet</p>}
                        </div>
                        <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                          <button onClick={()=>startEdit(session)} style={{padding:'6px',background:'#e0f2fe',border:'none',borderRadius:'6px',cursor:'pointer',color:'#0369a1'}}><Edit2 size={16}/></button>
                          <button onClick={()=>{
                            if (session.repeatId) {
                              setDeleteDialog({sessionId:session.id, repeatId:session.repeatId, blockSize:(repeatBlocks[session.repeatId]||[]).length});
                            } else {
                              deleteSession(session.id);
                            }
                          }} style={{padding:'6px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={16}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </div>
        </div>
      </div>
    );
  }

  // ── TURNIERWELT ──────────────────────────────────────────────
  if (view==='turniere') {
    const upcoming = getUpcomingTournaments();
    const allChildrenSorted = Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const jugendSubs = Object.values(subgroups).filter(sg=>sg.groupId==='jugend'&&canAccessGroup('jugend')).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const jugendSubIds = new Set(jugendSubs.map(sg=>sg.id));
    const jugendChildren = allChildrenSorted.filter(c => jugendSubIds.has(c.subgroupId));
    const filteredChildren = tournGroupFilter
      ? jugendChildren.filter(c => c.subgroupId === tournGroupFilter)
      : jugendChildren;

    const nh = konkurrenzHelpers(newTournament, setNewTournament);
    const eh = konkurrenzHelpers(editTournForm, setEditTournForm);

    const SubgroupFilterBar = ({small=false}) => (
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        <button onClick={()=>setTournGroupFilter(null)} style={{padding:small?'3px 8px':'5px 12px',borderRadius:'20px',border:'2px solid #b45309',background:!tournGroupFilter?'#b45309':'white',color:!tournGroupFilter?'white':'#b45309',cursor:'pointer',fontWeight:'600',fontSize:small?'11px':'13px'}}>Alle</button>
        {jugendSubs.map(sg=>(
          <button key={sg.id} onClick={()=>setTournGroupFilter(tournGroupFilter===sg.id?null:sg.id)}
            style={{padding:small?'3px 8px':'5px 12px',borderRadius:'20px',border:'2px solid #358941',background:tournGroupFilter===sg.id?'#358941':'white',color:tournGroupFilter===sg.id?'white':'#358941',cursor:'pointer',fontWeight:'600',fontSize:small?'11px':'13px'}}>
            🏓 {sg.name}
          </button>
        ))}
      </div>
    );

    const newDates = getDatesInRange(newTournament.dateFrom, newTournament.dateTo);
    const editDates = getDatesInRange(editTournForm.dateFrom, editTournForm.dateTo);

    const formatDateRange = (t) => {
      const from = t.dateFrom||t.date||'';
      const to = t.dateTo||from;
      if (!from) return '';
      const f = new Date(from+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
      if (to === from) return f;
      const t2 = new Date(to+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
      return `${f} – ${t2}`;
    };

    return (
      <div style={{minHeight:'100vh',background:"linear-gradient(135deg,#6b2d00 0%,#b45309 100%)",fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {archiveTournDialog && <ArchiveTournDialog tournament={archiveTournDialog} onClose={()=>setArchiveTournDialog(null)} onConfirm={confirmArchiveTournament}/>}
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#b45309')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🏆 Turniere</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

        {/* Neues Turnier */}
        <div style={{...s.card,border:'1px solid #fde68a'}}>
          <h2 style={{margin:'0 0 20px',color:'#b45309',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800'}}><Trophy size={20}/> Neues Turnier anlegen</h2>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={s.label}>Turnierbezeichnung</label>
              <input style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} placeholder="z.B. Kreismeisterschaft" value={newTournament.name} onChange={e=>setNewTournament({...newTournament,name:e.target.value})}/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={s.label}>Ort</label>
              <input style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} placeholder="z.B. TTC Halle, Musterstadt" value={newTournament.location||''} onChange={e=>setNewTournament({...newTournament,location:e.target.value})}/>
            </div>
            <div>
              <label style={s.label}>Von (erster Tag)</label>
              <input type="date" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={newTournament.dateFrom} onChange={e=>setNewTournament({...newTournament,dateFrom:e.target.value})}/>
            </div>
            <div>
              <label style={s.label}>Bis (letzter Tag)</label>
              <input type="date" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={newTournament.dateTo} onChange={e=>setNewTournament({...newTournament,dateTo:e.target.value})}/>
            </div>
          </div>

          {jugendSubs.length>0&&(
            <div style={{marginBottom:'14px'}}>
              <label style={s.label}>Kinder filtern nach Untergruppe</label>
              <SubgroupFilterBar/>
            </div>
          )}

          <div style={{marginBottom:'16px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
              <label style={{...s.label,margin:0}}>Konkurrenzen ({(newTournament.konkurrenzen||[]).length})</label>
              <button onClick={nh.add} style={s.btn('#b45309',undefined,true)}><Plus size={14}/> Konkurrenz hinzufügen</button>
            </div>
            {(newTournament.konkurrenzen||[]).length===0
              ? <p style={{color:'#999',fontSize:'13px',padding:'12px',background:'#fef9c3',borderRadius:'8px',textAlign:'center'}}>Noch keine Konkurrenzen. Oben hinzufügen!</p>
              : (newTournament.konkurrenzen||[]).map(konk=>(
                <KonkurrenzForm key={konk.id} konk={konk} helpers={nh} childList={filteredChildren} tournamentDates={newDates} subgroups={subgroups}/>
              ))
            }
          </div>

          <button onClick={createTournament} style={s.btn('#b45309')}>
            <Trophy size={18}/> Turnier anlegen
          </button>
        </div>

        {/* Kommende Turniere */}
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:'#b45309'}}>🏆 Kommende Turniere</h2>
          {upcoming.length===0
            ? <p style={{color:'#999',textAlign:'center',padding:'30px'}}>Noch keine Turniere geplant.</p>
            : <div style={{display:'grid',gap:'16px'}}>
              {upcoming.map(t=>{
                const isEditing = editingTournament===t.id;
                const allParticipantIds = getTournamentParticipantIds(t);
                const allParticipants = allParticipantIds.map(id=>children[id]).filter(Boolean);
                const coming = allParticipants.filter(c=>(t.responses||{})[c.id]==='coming');
                const missing = allParticipants.filter(c=>(t.responses||{})[c.id]==='missing');
                const noAnswer = allParticipants.filter(c=>!(t.responses||{})[c.id]);
                const tDates = getDatesInRange(t.dateFrom||t.date, t.dateTo||t.dateFrom||t.date);
                const todayStr2 = new Date().toISOString().split('T')[0];
                const tournIsPast = (t.dateTo||t.dateFrom||t.date||'') < todayStr2;
                const isHighlighted = scrollToTournId === t.id;

                return (
                  <div key={t.id} id={`tourn-${t.id}`} style={{borderRadius:'10px',border:`2px solid ${isHighlighted?'#3b82f6':tournIsPast?'#fca5a5':'#fde68a'}`,background:tournIsPast?'#fff5f5':'#fffbeb',overflow:'hidden',boxShadow:isHighlighted?'0 0 0 3px #93c5fd':undefined,transition:'box-shadow 0.3s'}}>
                    {isEditing ? (
                      <div style={{padding:'16px'}}>
                        <h4 style={{margin:'0 0 12px',color:'#b45309'}}>Turnier bearbeiten</h4>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                          <div style={{gridColumn:'1/-1'}}>
                            <label style={s.label}>Name</label>
                            <input style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={editTournForm.name||''} onChange={e=>setEditTournForm({...editTournForm,name:e.target.value})}/>
                          </div>
                          <div style={{gridColumn:'1/-1'}}>
                            <label style={s.label}>Ort</label>
                            <input style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={editTournForm.location||''} onChange={e=>setEditTournForm({...editTournForm,location:e.target.value})}/>
                          </div>
                          <div>
                            <label style={s.label}>Von</label>
                            <input type="date" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={editTournForm.dateFrom||''} onChange={e=>setEditTournForm({...editTournForm,dateFrom:e.target.value})}/>
                          </div>
                          <div>
                            <label style={s.label}>Bis</label>
                            <input type="date" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}} value={editTournForm.dateTo||''} onChange={e=>setEditTournForm({...editTournForm,dateTo:e.target.value})}/>
                          </div>
                        </div>
                        {jugendSubs.length>0&&(
                          <div style={{marginBottom:'12px'}}>
                            <label style={s.label}>Kinder filtern</label>
                            <SubgroupFilterBar small/>
                          </div>
                        )}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                          <label style={{...s.label,margin:0}}>Konkurrenzen</label>
                          <button onClick={eh.add} style={s.btn('#b45309',undefined,true)}><Plus size={13}/> Hinzufügen</button>
                        </div>
                        {(editTournForm.konkurrenzen||[]).map(konk=>(
                          <KonkurrenzForm key={konk.id} konk={konk} helpers={eh} childList={filteredChildren} tournamentDates={editDates} subgroups={subgroups}/>
                        ))}
                        <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                          <button onClick={saveTournamentEdit} style={s.btn('#358941',undefined,true)}><Save size={14}/> Speichern</button>
                          <button onClick={()=>setEditingTournament(null)} style={s.btn('#f3f4f6','#333',true)}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{padding:'14px 16px',borderBottom:'1px solid #fde68a',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                              <h3 style={{margin:0,color:tournIsPast?'#991b1b':'#92400e',fontSize:'18px'}}>🏆 {t.name}</h3>
                              {tournIsPast&&<span style={{background:'#dc2626',color:'white',fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'20px'}}>Vergangen</span>}
                            </div>
                            <p style={{margin:'0 0 2px',fontWeight:'600',color:'#333',fontSize:'14px'}}>{formatDateRange(t)}</p>
                            {t.location&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#666'}}>📍 {t.location}</p>}
                            <p style={{margin:0,fontSize:'13px',color:'#999'}}>{(t.konkurrenzen||[]).length} Konkurrenzen · {allParticipantIds.length} Teilnehmer</p>
                          </div>
                          <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                            {isTournamentArchivable(t)&&<button onClick={()=>openArchiveTournDialog(t)} style={{padding:'6px',background:'#e5e7eb',border:'none',borderRadius:'6px',cursor:'pointer',color:'#374151'}} title="Archivieren"><Archive size={16}/></button>}
                            <button onClick={()=>{setEditingTournament(t.id);setEditTournForm(JSON.parse(JSON.stringify(t)));}} style={{padding:'6px',background:'#fef3c7',border:'none',borderRadius:'6px',cursor:'pointer',color:'#b45309'}}><Edit2 size={16}/></button>
                            <button onClick={()=>deleteTournament(t.id)} style={{padding:'6px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={16}/></button>
                          </div>
                        </div>

                        <div style={{padding:'12px 16px',borderBottom:'1px solid #fde68a',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                          {[{v:coming.length,label:'Dabei',bg:'#dcfce7',c:'#16a34a'},{v:missing.length,label:'Fehlt',bg:'#fee2e2',c:'#dc2626'},{v:noAnswer.length,label:'Ausstehend',bg:'#f3f4f6',c:'#6b7280'}].map(({v,label,bg,c})=>(
                            <div key={label} style={{background:bg,borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                              <p style={{margin:0,fontSize:'20px',fontWeight:'700',color:c}}>{v}</p>
                              <p style={{margin:0,fontSize:'11px',color:c}}>{label}</p>
                            </div>
                          ))}
                        </div>

                        {jugendSubs.length>0&&(
                          <div style={{padding:'10px 16px',borderBottom:'1px solid #fde68a',display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                            <span style={{fontSize:'12px',color:'#92400e',fontWeight:'600',marginRight:'4px'}}>Filter:</span>
                            <SubgroupFilterBar small/>
                          </div>
                        )}

                        <div style={{padding:'14px 16px',display:'grid',gap:'12px'}}>
                          {(t.konkurrenzen||[]).length===0
                            ? <p style={{color:'#999',fontSize:'13px',textAlign:'center'}}>Keine Konkurrenzen angelegt.</p>
                            : (t.konkurrenzen||[]).map(konk=>{
                              const konkParticipants = (konk.participantIds||[]).map(id=>children[id]).filter(Boolean);
                              const shown = tournGroupFilter ? konkParticipants.filter(c=>c.subgroupId===tournGroupFilter) : konkParticipants;
                              const konkDate = konk.date ? new Date(konk.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}) : null;
                              return (
                                <div key={konk.id} style={{borderRadius:'8px',border:'1px solid #fde68a',overflow:'hidden'}}>
                                  <div style={{background:'#fef9c3',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'6px'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                                      <span style={{fontWeight:'700',color:'#92400e',fontSize:'15px'}}>{konk.name||'(Unbenannte Konkurrenz)'}</span>
                                      {konkDate&&<span style={{fontSize:'12px',color:'#92400e',background:'#fde68a',padding:'2px 8px',borderRadius:'10px'}}>{konkDate}</span>}
                                      <span style={{fontSize:'13px',color:'#b45309',display:'inline-flex',alignItems:'center',gap:'3px'}}><Clock size={12}/> {konk.time} Uhr</span>
                                    </div>
                                    <span style={{fontSize:'12px',color:'#92400e',fontWeight:'600'}}>{konkParticipants.length} TN</span>
                                  </div>
                                  <div style={{padding:'8px 12px',display:'grid',gap:'5px'}}>
                                    {shown.length===0
                                      ? <p style={{color:'#999',fontSize:'12px',margin:0,padding:'4px 0'}}>Keine Teilnehmer{tournGroupFilter?' in dieser Gruppe':' eingetragen'}.</p>
                                      : shown.sort((a,b)=>a.name.localeCompare(b.name,'de')).map(child=>{
                                        const resp=(t.responses||{})[child.id];
                                        const dep=konk.departureTimes?.[child.id];
                                        const sub2=subgroups[child.subgroupId];
                                        const grp2=FIXED_GROUPS.find(g=>g.id===sub2?.groupId);
                                        return (
                                          <div key={child.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'6px',background:resp==='coming'?'#f0fdf4':resp==='missing'?'#fef2f2':'#f9fafb',border:'1px solid #eee'}}>
                                            <div>
                                              <span style={{fontWeight:'600',fontSize:'13px',color:'#333'}}>{child.name}</span>
                                              {sub2&&<span style={{fontSize:'11px',color:'#999',marginLeft:'5px'}}>{grp2?.emoji} {sub2.name}</span>}
                                              {dep&&<span style={{fontSize:'11px',color:'#b45309',marginLeft:'6px',display:'inline-flex',alignItems:'center',gap:'2px'}}><Clock size={10}/> {dep} Uhr</span>}
                                            </div>
                                            <span style={{fontSize:'12px',fontWeight:'700',color:resp==='coming'?'#16a34a':resp==='missing'?'#dc2626':'#9ca3af'}}>
                                              {resp==='coming'?'✓ Dabei':resp==='missing'?'✗ Fehlt':'–'}
                                            </span>
                                          </div>
                                        );
                                      })
                                    }
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div></div>
    );
  }

  // ── ADMIN ────────────────────────────────────────────────────
  if (view==='admin') {
    const allChildrenList=Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const pendingCount=Object.values(allUsers).filter(u=>u.role==='pending').length;

    const confirmAdminRole = async () => {
      if (!adminRolePw.trim()) { setAdminRoleError('Bitte Passwort eingeben.'); return; }
      try {
        const credential = EmailAuthProvider.credential(user.email, adminRolePw);
        await reauthenticateWithCredential(user, credential);
        await saveUserRoles(adminRoleDialog.uid, adminRoleDialog.newRoles);
        setAdminRoleDialog(null);
        setAdminRolePw('');
        setAdminRoleError('');
      } catch {
        setAdminRoleError('Falsches Passwort. Bitte erneut versuchen.');
      }
    };

    return (
      <div style={{minHeight:'100vh',background:"linear-gradient(135deg,#1e0a3c 0%,#7c3aed 100%)",fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}><Shield size={20} style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}/>Administration</h1>
          {pendingCount>0&&<span style={{background:'#dc2626',color:'white',borderRadius:'20px',padding:'4px 12px',fontWeight:'700',fontSize:'13px'}}>⚠️ {pendingCount} wartend</span>}
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

        {/* Admin-Rollen-Bestätigung */}
        {adminRoleDialog&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'380px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <div style={{fontSize:'36px',textAlign:'center',marginBottom:'12px'}}>🛡️</div>
              <h3 style={{margin:'0 0 8px',color:'#7c3aed',fontSize:'18px',textAlign:'center'}}>Admin-Rolle vergeben</h3>
              <p style={{margin:'0 0 16px',color:'#666',fontSize:'14px',textAlign:'center'}}>
                Bitte bestätige mit deinem eigenen Admin-Passwort, um die Admin-Rolle zu vergeben.
              </p>
              {adminRoleError&&<p style={{color:'#dc2626',fontSize:'13px',marginBottom:'12px',padding:'8px',background:'#fee2e2',borderRadius:'6px'}}>{adminRoleError}</p>}
              <input
                type="password"
                placeholder="Dein Admin-Passwort"
                value={adminRolePw}
                onChange={e=>{setAdminRolePw(e.target.value);setAdminRoleError('');}}
                onKeyDown={e=>e.key==='Enter'&&confirmAdminRole()}
                autoFocus
                style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box',marginBottom:'14px',borderColor:'#7c3aed',borderWidth:'2px'}}
              />
              <div style={{display:'grid',gap:'8px'}}>
                <button onClick={confirmAdminRole}
                  style={{padding:'12px',background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  🛡️ Bestätigen & Admin-Rolle vergeben
                </button>
                <button onClick={()=>{setAdminRoleDialog(null);setAdminRolePw('');setAdminRoleError('');}}
                  style={{padding:'12px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Passwort-Bestätigungs-Dialog */}
        {resetDialog&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'380px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <h3 style={{margin:'0 0 8px',color:'#dc2626',fontSize:'18px'}}>⚠️ Anwesenheiten zurücksetzen</h3>
              <p style={{margin:'0 0 16px',color:'#666',fontSize:'14px'}}>
                Das löscht <strong>alle Anwesenheitsdaten</strong> aller Kinder sowie alle geplanten Einheiten.<br/><br/>
                Bitte bestätige mit deinem Admin-Passwort:
              </p>
              {resetError&&<p style={{color:'#dc2626',fontSize:'13px',marginBottom:'12px',padding:'8px',background:'#fee2e2',borderRadius:'6px'}}>{resetError}</p>}
              <input
                type="password"
                placeholder="Dein Admin-Passwort"
                value={resetPassword}
                onChange={e=>setResetPassword(e.target.value)}
                onKeyPress={e=>e.key==='Enter'&&handleResetAllAttendance()}
                style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box',marginBottom:'16px',borderColor:'#dc2626',borderWidth:'2px'}}
              />
              <div style={{display:'grid',gap:'8px'}}>
                <button onClick={handleResetAllAttendance}
                  style={{padding:'12px',background:'#dc2626',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  🗑️ Ja, alles zurücksetzen
                </button>
                <button onClick={()=>{setResetDialog(false);setResetPassword('');setResetError('');}}
                  style={{padding:'12px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nutzerverwaltung */}
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:'#7c3aed',display:'flex',alignItems:'center',gap:'8px'}}><Users size={20}/> Nutzerverwaltung</h2>
          {pendingCount>0&&<div style={{marginBottom:'16px',padding:'12px',background:'#fee2e2',borderRadius:'8px',border:'1px solid #fca5a5'}}><p style={{margin:0,fontWeight:'600',color:'#dc2626',fontSize:'14px'}}>⚠️ {pendingCount} Nutzer warten auf Freischaltung!</p></div>}
          <div style={{display:'grid',gap:'10px'}}>
            {Object.values(allUsers).sort((a,b)=>{
              if(a.role==='pending'&&b.role!=='pending') return -1;
              if(a.role!=='pending'&&b.role==='pending') return 1;
              return (a.name||'').localeCompare(b.name||'');
            }).map(u=>{
              const rc=ROLE_CONFIG[u.role]||{};
              const linkedChild=u.linkedChildId?children[u.linkedChildId]:null;
              return (
                <div key={u.uid} style={{padding:'12px 16px',background:u.role==='pending'?'#fff5f5':'#f8f9fa',borderRadius:'8px',border:u.role==='pending'?'2px solid #fca5a5':'1px solid #ddd'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'2px'}}>
                          <p style={{margin:0,fontWeight:'700',color:'#333',fontSize:'15px'}}>{u.name||u.email}</p>
                          {u.isParent&&<span style={{fontSize:'11px',background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:'10px',fontWeight:'700'}}>👨‍👧 Elternteil</span>}
                          {u.isParent===false&&u.role==='pending'&&<span style={{fontSize:'11px',background:'#fef9c3',color:'#92400e',padding:'2px 8px',borderRadius:'10px',fontWeight:'700'}}>🧒 Kein Elternteil</span>}
                        </div>
                        <p style={{margin:0,fontSize:'12px',color:'#999'}}>{u.email}</p>
                      </div>
                      {u.role==='pending'&&(
                        <button onClick={()=>{
                          // Use already-toggled roles (minus pending), fallback to 'eltern'
                          const assigned = (u.roles||[u.role]).filter(r=>r!=='pending');
                          saveUserRoles(u.uid, assigned.length>0 ? assigned : ['eltern']);
                        }}
                          style={{padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'15px',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(22,163,74,0.4)'}}>
                          ✓ Freischalten
                        </button>
                      )}
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                      {/* Rollen als Toggle-Buttons – Mehrfachauswahl möglich */}
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontSize:'12px',color:'#555',fontWeight:'600',marginRight:'2px'}}>Rollen:</span>
                        {Object.entries(ROLE_CONFIG).filter(([k])=>k!=='pending').map(([key,cfg])=>{
                          const userRoles = u.roles && u.roles.length>0 ? u.roles : [u.role];
                          const active = userRoles.includes(key);
                          return (
                            <button key={key} onClick={()=>{
                              // Always filter out 'pending' — assigning any real role removes pending status
                              const cur = (u.roles && u.roles.length>0 ? u.roles : [u.role]).filter(r=>r!=='pending');
                              let next;
                              if (active) {
                                next = cur.filter(r=>r!==key);
                                if (next.length===0) return; // mindestens eine Rolle
                              } else {
                                next = [...cur, key];
                              }
                              // Admin-Rolle erfordert Passwort-Bestätigung
                              if (key === 'admin' && !active) {
                                setAdminRoleDialog({ uid: u.uid, newRoles: next });
                                setAdminRolePw('');
                                setAdminRoleError('');
                              } else {
                                saveUserRoles(u.uid, next);
                              }
                            }} style={{padding:'3px 9px',borderRadius:'20px',border:`2px solid ${cfg.color}`,background:active?cfg.color:cfg.bg,color:active?'white':cfg.color,cursor:'pointer',fontWeight:'600',fontSize:'11px'}}>
                              {key==='admin'&&!active?'🔒 ':''}{cfg.label}
                            </button>
                          );
                        })}
                        {u.role==='pending'&&<span style={{fontSize:'11px',fontWeight:'700',color:'#dc2626',background:'#fee2e2',padding:'2px 8px',borderRadius:'20px'}}>⏳ Wartend</span>}
                      </div>
                      {/* Kind zuordnen bei Eltern/Jugendlichen */}
                      {(()=>{
                        const userRoles = u.roles && u.roles.length>0 ? u.roles : [u.role];
                        const needsChild = userRoles.some(r=>['eltern','jugendlich'].includes(r));
                        if (!needsChild) return null;
                        return (
                          <select value={u.linkedChildId||''} onChange={e=>linkChildToUser(u.uid,e.target.value||null)} style={{padding:'6px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>
                            <option value=''>-- Kind zuordnen --</option>
                            {allChildrenList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                  {linkedChild&&<p style={{margin:'6px 0 0',fontSize:'12px',color:'#358941'}}>👶 Verknüpft mit: <strong>{linkedChild.name}</strong></p>}
                  {/* Gruppenauswahl – sobald Trainer-Rolle aktiv */}
                  {(u.roles||[u.role]).includes('trainer')&&(
                    <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'12px',fontWeight:'600',color:'#555'}}>Gruppen:</span>
                      {FIXED_GROUPS.map(g=>{
                        const assigned=(u.groupIds||[]).includes(g.id);
                        return (
                          <button key={g.id} onClick={()=>{
                            const cur=u.groupIds||[];
                            saveUserGroupIds(u.uid, assigned?cur.filter(x=>x!==g.id):[...cur,g.id]);
                          }} style={{padding:'3px 10px',borderRadius:'20px',border:`2px solid ${g.color}`,background:assigned?g.color:'white',color:assigned?'white':g.color,cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                            {g.emoji} {g.name}
                          </button>
                        );
                      })}
                      {(u.groupIds||[]).length===0&&<span style={{fontSize:'11px',color:'#dc2626',fontStyle:'italic'}}>⚠️ Keine Gruppe zugewiesen</span>}
                    </div>
                  )}
                  {/* Account-Aktionen: Zurück auf Wartend + Löschen */}
                  {u.role!=='pending'&&(
                    <div style={{marginTop:'8px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      <button onClick={()=>{
                        if(window.confirm(`"${u.name||u.email}" zurück auf Wartend setzen?`))
                          saveUserRoles(u.uid,['pending']);
                      }} style={{padding:'3px 10px',background:'#fef3c7',border:'1px solid #d97706',borderRadius:'6px',cursor:'pointer',color:'#92400e',fontSize:'11px',fontWeight:'600'}}>
                        ⏳ Auf Wartend setzen
                      </button>
                      <button onClick={async()=>{
                        if(!window.confirm(`Account von "${u.name||u.email}" (${u.email}) wirklich löschen?\n\nDies entfernt den Account aus der App. Die Firebase-Auth-Anmeldung bleibt bestehen.`)) return;
                        const updated={...allUsers}; delete updated[u.uid];
                        await setDoc(doc(db,'ttc','users'),updated);
                        setAllUsers(updated);
                      }} style={{padding:'3px 10px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:'6px',cursor:'pointer',color:'#dc2626',fontSize:'11px',fontWeight:'600'}}>
                        🗑️ Account löschen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(allUsers).length===0&&<p style={{color:'#999',textAlign:'center',padding:'20px'}}>Noch keine Nutzer.</p>}
          </div>
        </div>

        {/* Gefahrenzone */}
        <div style={{...s.card,border:'2px solid #fca5a5',background:'#fff5f5'}}>
          <h2 style={{margin:'0 0 4px',color:'#dc2626',fontSize:'18px'}}>⚠️ Gefahrenzone</h2>
          <p style={{margin:'0 0 16px',color:'#888',fontSize:'12px'}}>Wähle die Datenbereiche aus, die du löschen möchtest.</p>
          {(()=>{
            const cats = [
              {id:'attendance',  label:'Anwesenheitsdaten',          desc:'Alle Anwesenheiten aller Kinder + Trainingsdaten in Untergruppen', icon:'📋', needsPw:true},
              {id:'sessions',    label:'Trainingseinheiten (aktiv)',  desc:'Alle geplanten und laufenden Einheiten', icon:'🏋️'},
              {id:'tournaments', label:'Turniere (aktiv)',            desc:'Alle laufenden Turniere', icon:'🏆'},
              {id:'practiceT',   label:'Übungswettkämpfe (aktiv)',   desc:'Alle laufenden Übungswettkämpfe', icon:'🎮'},
              {id:'messages',    label:'Trainer-Nachrichten',         desc:'Alle manuell gesendeten Nachrichten', icon:'💬'},
              {id:'archSessions',label:'Archiv Training',             desc:'Alle archivierten Trainingseinheiten', icon:'📦'},
              {id:'archTourneys',label:'Archiv Turniere',             desc:'Alle archivierten Turniere', icon:'📦'},
              {id:'archPT',      label:'Archiv Übungswettkämpfe',    desc:'Alle archivierten Übungswettkämpfe', icon:'📦'},
            ];
            const sel = dangerSelections;
            const allSel = cats.every(c=>sel[c.id]);
            const anySel = cats.some(c=>sel[c.id]);
            const toggle = id => setDangerSelections(p=>({...p,[id]:!p[id]}));
            const selectAll = () => setDangerSelections(Object.fromEntries(cats.map(c=>[c.id,true])));
            const selectNone = () => setDangerSelections({});
            const handleDelete = () => {
              const selected = cats.filter(c=>sel[c.id]);
              if(selected.length===0) return;
              const nonPw = selected.filter(c=>!c.needsPw);
              const hasPw = selected.some(c=>c.needsPw);
              const labels = selected.map(c=>c.label).join(', ');
              if(nonPw.length>0){
                if(!window.confirm(`Folgende Daten werden unwiderruflich gelöscht:\n\n${nonPw.map(c=>c.label).join('\n')}\n\nFortfahren?`)) return;
                nonPw.forEach(cat=>{
                  if(cat.id==='sessions')     saveSessions({});
                  if(cat.id==='tournaments')  saveTournaments({});
                  if(cat.id==='practiceT')    savePracticeTournaments({});
                  if(cat.id==='messages'){
                    const u={};
                    Object.values(notifications).forEach(n=>{if(n.type!=='trainer_message')u[n.id]=n;});
                    saveNotifications(u);
                  }
                  if(cat.id==='archSessions')  saveArchivedSessions({});
                  if(cat.id==='archTourneys')  saveArchivedTournaments({});
                  if(cat.id==='archPT')        saveArchivedPracticeTournaments({});
                });
                setDangerSelections(p=>{const n={...p};nonPw.forEach(c=>{delete n[c.id];});return n;});
              }
              if(hasPw){ setResetDialog(true); }
            };
            return (
              <div>
                <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                  <button onClick={selectAll} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'700',borderRadius:'7px',border:'1px solid #fca5a5',background:allSel?'#fca5a5':'white',color:allSel?'white':'#dc2626',cursor:'pointer'}}>
                    Alle auswählen
                  </button>
                  <button onClick={selectNone} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'700',borderRadius:'7px',border:'1px solid #e5e7eb',background:'white',color:'#6b7280',cursor:'pointer'}}>
                    Keine
                  </button>
                </div>
                <div style={{display:'grid',gap:'6px',marginBottom:'16px'}}>
                  {cats.map(cat=>(
                    <label key={cat.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 12px',background:sel[cat.id]?'#fee2e2':'#fafafa',border:`1px solid ${sel[cat.id]?'#fca5a5':'#e5e7eb'}`,borderRadius:'10px',cursor:'pointer',transition:'all 0.1s'}}
                      onClick={()=>toggle(cat.id)}>
                      <div style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${sel[cat.id]?'#dc2626':'#d1d5db'}`,background:sel[cat.id]?'#dc2626':'white',flexShrink:0,marginTop:'1px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {sel[cat.id]&&<span style={{color:'white',fontSize:'12px',lineHeight:1,fontWeight:'900'}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                          <span style={{fontSize:'13px'}}>{cat.icon}</span>
                          <span style={{fontWeight:'700',fontSize:'13px',color:'#1f2937'}}>{cat.label}</span>
                          {cat.needsPw&&<span style={{fontSize:'10px',background:'#fef3c7',color:'#92400e',padding:'1px 5px',borderRadius:'4px',fontWeight:'600'}}>Passwort</span>}
                        </div>
                        <p style={{margin:'2px 0 0',fontSize:'11px',color:'#9ca3af'}}>{cat.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleDelete}
                  disabled={!anySel}
                  style={{width:'100%',padding:'12px',background:anySel?'#dc2626':'#e5e7eb',color:anySel?'white':'#9ca3af',border:'none',borderRadius:'10px',cursor:anySel?'pointer':'not-allowed',fontWeight:'700',fontSize:'14px',transition:'all 0.2s'}}>
                  🗑️ {anySel ? `${cats.filter(c=>sel[c.id]).length} Bereich${cats.filter(c=>sel[c.id]).length!==1?'e':''} löschen` : 'Keine Auswahl'}
                </button>
              </div>
            );
          })()}
        </div>

        {/* ── Mannschaften verwalten ── */}
        <div style={s.card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
            <h3 style={{margin:0,color:'#0f766e',display:'flex',alignItems:'center',gap:'8px'}}>⚽ Mannschaften verwalten</h3>
            <button
              onClick={()=>saveAppSettings({...appSettings,mannschaftEnabled:!appSettings.mannschaftEnabled})}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'13px',
                background:appSettings.mannschaftEnabled?'#ccfbf1':'#fee2e2',
                color:appSettings.mannschaftEnabled?'#0f766e':'#dc2626',
                transition:'all 0.2s'}}>
              <span style={{width:'32px',height:'18px',borderRadius:'9px',background:appSettings.mannschaftEnabled?'#0f766e':'#dc2626',display:'inline-flex',alignItems:'center',padding:'2px',transition:'all 0.2s',position:'relative'}}>
                <span style={{width:'14px',height:'14px',borderRadius:'50%',background:'white',display:'block',position:'absolute',transition:'all 0.2s',left:appSettings.mannschaftEnabled?'16px':'2px'}}/>
              </span>
              {appSettings.mannschaftEnabled ? 'Funktion aktiv' : 'Funktion deaktiviert'}
            </button>
          </div>
          {!appSettings.mannschaftEnabled&&(
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'10px',padding:'16px',textAlign:'center',color:'#dc2626',fontSize:'13px',fontWeight:'600'}}>
              🚫 Die Mannschaftsfunktion ist deaktiviert. Für alle Nutzer ausgeblendet.
            </div>
          )}
          {appSettings.mannschaftEnabled&&<>

          {/* Neue Mannschaft anlegen / bearbeiten */}
          {(()=>{
            const isEditing = !!editingTeam;
            const form = isEditing ? editingTeam : teamForm;
            const setForm = isEditing ? setEditingTeam : setTeamForm;
            const allTrainers = Object.values(allUsers).filter(u=>(u.roles||[u.role]).includes('trainer')||u.role==='trainer').sort((a,b)=>a.name.localeCompare(b.name,'de'));
            const allKidsList = Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
            const save = () => {
              if (!form.name.trim()) { alert('Bitte Mannschaftsname eingeben!'); return; }
              const id = isEditing ? form.id : 'team_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
              saveTeams({ ...teams, [id]: { ...form, id, name: form.name.trim() } });
              if (isEditing) setEditingTeam(null); else setTeamForm({name:'',trainerUids:[],childIds:[]});
            };
            return (
              <div style={{background:'#f0fdfa',borderRadius:'10px',padding:'14px',marginBottom:'16px',border:'1px solid #99f6e4'}}>
                <p style={{margin:'0 0 10px',fontWeight:'700',color:'#0f766e',fontSize:'13px'}}>{isEditing?'✏️ Mannschaft bearbeiten':'➕ Neue Mannschaft'}</p>
                <div style={{display:'grid',gap:'8px'}}>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    placeholder="Mannschaftsname (z.B. Herren 1)" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  <div>
                    <label style={{...s.label}}>Trainer zuweisen</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                      {allTrainers.map(t=>{
                        const sel=(form.trainerUids||[]).includes(t.uid);
                        return <button key={t.uid} type="button" onClick={()=>setForm({...form,trainerUids:sel?(form.trainerUids||[]).filter(x=>x!==t.uid):[...(form.trainerUids||[]),t.uid]})}
                          style={{padding:'4px 10px',borderRadius:'20px',border:`2px solid ${sel?'#0f766e':'#e5e7eb'}`,background:sel?'#ccfbf1':'white',color:sel?'#0f766e':'#555',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                          {t.name}
                        </button>;
                      })}
                      {allTrainers.length===0&&<span style={{fontSize:'12px',color:'#9ca3af'}}>Keine Trainer-Accounts vorhanden.</span>}
                    </div>
                  </div>
                  <div>
                    <label style={{...s.label}}>Kinder zuweisen</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                      {allKidsList.map(c=>{
                        const sel=(form.childIds||[]).includes(c.id);
                        const sub2=subgroups[c.subgroupId];
                        return <button key={c.id} type="button" onClick={()=>setForm({...form,childIds:sel?(form.childIds||[]).filter(x=>x!==c.id):[...(form.childIds||[]),c.id]})}
                          style={{padding:'4px 10px',borderRadius:'20px',border:`2px solid ${sel?'#0f766e':'#e5e7eb'}`,background:sel?'#ccfbf1':'white',color:sel?'#0f766e':'#555',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                          {c.name}{sub2?` (${sub2.name})`:''}
                        </button>;
                      })}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={save} style={{...s.btn('#0f766e'),flex:1}}>{isEditing?'💾 Speichern':'➕ Anlegen'}</button>
                    {isEditing&&<button onClick={()=>setEditingTeam(null)} style={{...s.btn('#6b7280'),flex:1}}>Abbrechen</button>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Bestehende Mannschaften */}
          {Object.values(teams).length === 0
            ? <p style={{color:'#9ca3af',textAlign:'center',padding:'16px',margin:0}}>Noch keine Mannschaften angelegt.</p>
            : Object.values(teams).sort((a,b)=>a.name.localeCompare(b.name,'de')).map(team=>{
                const trainerNames = (team.trainerUids||[]).map(uid=>allUsers[uid]?.name||uid).join(', ') || '–';
                const kidNames = (team.childIds||[]).map(id=>children[id]?.name||id);
                const mdCount = Object.values(matchdays).filter(m=>m.teamId===team.id).length;
                return (
                  <div key={team.id} style={{marginBottom:'10px',border:'1px solid #99f6e4',borderRadius:'10px',overflow:'hidden'}}>
                    <div style={{background:'#f0fdfa',padding:'10px 14px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      <span style={{fontWeight:'700',fontSize:'15px',color:'#0f766e',flex:1}}>⚽ {team.name}</span>
                      <span style={{fontSize:'11px',color:'#6b7280'}}>{mdCount} Spieltage</span>
                      <button onClick={()=>setEditingTeam({...team})} style={{...s.btn('#0f766e'),padding:'4px 10px',fontSize:'12px'}}>✏️ Bearbeiten</button>
                      <button onClick={()=>{if(window.confirm(`Mannschaft "${team.name}" löschen?`)){const u={...teams};delete u[team.id];saveTeams(u);}}}
                        style={{...s.btn('#dc2626'),padding:'4px 10px',fontSize:'12px'}}>🗑️</button>
                    </div>
                    <div style={{padding:'8px 14px',fontSize:'12px',color:'#555'}}>
                      <span>👤 Trainer: {trainerNames}</span>
                      {kidNames.length>0&&<span style={{marginLeft:'12px'}}>🧒 {kidNames.join(', ')}</span>}
                    </div>
                  </div>
                );
              })
          }
          </>}
        </div>

        </div>
      </div>
    );
  }

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
      {label:'Übungswettkämpfe',icon:'🎮', color:'#c4b5fd', bg:'rgba(196,181,253,0.1)',  border:'rgba(196,181,253,0.25)', action:()=>navTo('practiceTournaments')},
      {label:'Trainingsplan',    icon:'📅', color:'#86efac', bg:'rgba(134,239,172,0.1)',  border:'rgba(134,239,172,0.25)', action:()=>navTo('trainingsplan')},
      {label:'Turniere',         icon:'🏆', color:'#fde68a', bg:'rgba(253,230,138,0.1)',  border:'rgba(253,230,138,0.25)', action:()=>navTo('turniere')},
      {label:'Nachrichten',      icon:'💬', color:'#bbf7d0', bg:'rgba(187,247,208,0.1)',  border:'rgba(187,247,208,0.25)', action:()=>navTo('notifications'), badge: unreadCount},
      {label:'Archiv',           icon:'📦', color:'#e2e8f0', bg:'rgba(226,232,240,0.08)', border:'rgba(226,232,240,0.2)',  action:()=>navTo('archiv')},
      {label:'Errungenschaften', icon:'🏅', color:'#d9f99d', bg:'rgba(217,249,157,0.1)',  border:'rgba(217,249,157,0.25)', action:()=>navTo('achievements')},
      ...(appSettings.mannschaftEnabled?[{label:'Mannschaft',icon:'⚽',color:'#6ee7b7',bg:'rgba(110,231,183,0.1)',border:'rgba(110,231,183,0.25)',action:()=>navTo('mannschaft')}]:[]),
      ...(userRole==='admin'?[{label:'Admin',icon:'🛡️',color:'#c4b5fd',bg:'rgba(196,181,253,0.1)',border:'rgba(196,181,253,0.25)',action:()=>navTo('admin')}]:[]),
    ];
    const groups = FIXED_GROUPS.filter(g=>canAccessGroup(g.id));

    const inputStyle = {padding:'10px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(134,239,172,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        {archiveTournDialog&&<ArchiveTournDialog tournament={archiveTournDialog} onClose={()=>setArchiveTournDialog(null)} onConfirm={confirmArchiveTournament}/>}

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

        {/* Rollenwechsel-Modal */}
        {showRolePicker&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'24px',maxWidth:'300px',width:'100%'}}>
              <h3 style={{margin:'0 0 16px',color:'white',fontWeight:'800',fontSize:'18px'}}>Rolle wechseln</h3>
              {(userProfile?.roles||[userRole]).filter(r=>r!=='pending').map(role=>{
                const rc2=ROLE_CONFIG[role]||{};
                return (
                  <button key={role} onClick={()=>{setUserRole(role);setShowRolePicker(false);navTo('home');}}
                    style={{display:'block',width:'100%',padding:'11px 14px',marginBottom:'8px',background:userRole===role?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.05)',border:userRole===role?'1px solid rgba(74,222,128,0.4)':'1px solid rgba(255,255,255,0.1)',borderRadius:'11px',cursor:'pointer',color:'white',fontWeight:'700',fontSize:'14px',textAlign:'left'}}>
                    {rc2.label}
                  </button>
                );
              })}
              <button onClick={()=>setShowRolePicker(false)} style={{width:'100%',padding:'9px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:'13px',marginTop:'4px'}}>Abbrechen</button>
            </div>
          </div>
        )}

        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 20px 60px'}}>

          {/* ── Top-Bar ─────────────────────────────────────────── */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 32px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <img src="/logo.png" alt="TTC Logo" style={{width:'55px',height:'55px',objectFit:'contain',borderRadius:'12px',flexShrink:0,filter:'drop-shadow(0 3px 12px rgba(0,0,0,0.5))'}}/>
              <div>
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß Staffel</p>
                <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{userRole==='admin'?'Administrator':'Trainer'}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              {(()=>{const sel=(userProfile?.roles||[userRole]).filter(r=>r!=='pending');return sel.length>1?<button onClick={()=>setShowRolePicker(true)} style={{padding:'8px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#86efac',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'👤':'👤 Rolle'}</button>:null;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:isMobile?'16px':'12px',fontWeight:'600',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'⚙️':'⚙️ Profil'}</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🚪':'Abmelden'}</button>
            </div>
          </div>

          {/* ── Greeting ─────────────────────────────────────────── */}
          <div style={{marginBottom:'36px'}}>
            <p style={{margin:'0 0 8px',color:'rgba(74,222,128,0.5)',fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase'}}>{dateLabel}</p>
            <h1 style={{margin:0,color:'white',fontSize:isMobile?'28px':'36px',fontWeight:'800',letterSpacing:'-1px',lineHeight:1.1}}>{greeting}, <span style={{color:'#4ade80'}}>{(userProfile?.name||'Trainer').split(' ')[0]}</span> 👋</h1>
          </div>

          {/* ── 1. Training diese Woche ──────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Training diese Woche</p>
          <div style={{background:'rgba(74,222,128,0.03)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'20px',overflow:'hidden',marginBottom:'32px',boxShadow:'inset 0 1px 0 rgba(74,222,128,0.07)'}}>
            <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(74,222,128,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:'800',color:'white',fontSize:'16px',letterSpacing:'-0.3px'}}>📅 Training diese Woche</span>
              <button onClick={()=>navTo('trainingsplan')} style={{background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',color:'#4ade80',borderRadius:'10px',padding:'6px 14px',fontSize:'12px',cursor:'pointer',fontWeight:'700'}}>Trainingsplan →</button>
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
                      <div key={session.id} onClick={()=>{setActiveSession(session);navTo('sessionAttendance');}}
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
                      <div key={session.id} onClick={()=>{setActiveSession(session);navTo('sessionAttendance');}}
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

          {/* ── 2. Schnellzugriff ────────────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Schnellzugriff</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px',marginBottom:'32px'}}>
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

          {/* ── 3. Kommende Turniere ─────────────────────────────── */}
          <p style={{color:'rgba(253,230,138,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Kommende Turniere</p>
          <div style={{background:'rgba(253,230,138,0.025)',border:'1px solid rgba(253,230,138,0.12)',borderRadius:'20px',overflow:'hidden',marginBottom:'32px',boxShadow:'inset 0 1px 0 rgba(253,230,138,0.06)'}}>
            <div style={{padding:'16px 22px',borderBottom:'1px solid rgba(253,230,138,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:'800',color:'white',fontSize:'16px',letterSpacing:'-0.3px'}}>🏆 Kommende Turniere</span>
              <button onClick={()=>navTo('turniere')} style={{background:'rgba(253,230,138,0.12)',border:'1px solid rgba(253,230,138,0.25)',color:'#fde68a',borderRadius:'10px',padding:'6px 14px',fontSize:'12px',cursor:'pointer',fontWeight:'700'}}>Alle Turniere →</button>
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
                      onClick={()=>{setScrollToTournId(t.id);navTo('turniere');}}>
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

          {/* ── 4. Gruppen ───────────────────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Meine Gruppen</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:'12px'}}>
            {groups.map(group=>{
              const subs=getSubgroupsForGroup(group.id);
              const totalKids=subs.reduce((s2,sub)=>s2+getChildrenForSubgroup(sub.id).length,0);
              const isJugend=group.id==='jugend';
              const gradBg    = isJugend ? 'linear-gradient(135deg,#052e16 0%,#0f5a28 100%)' : 'linear-gradient(135deg,#0c2340 0%,#1a4070 100%)';
              const gradBorder= isJugend ? 'rgba(74,222,128,0.3)' : 'rgba(96,165,250,0.3)';
              const gradSub   = isJugend ? 'rgba(134,239,172,0.5)' : 'rgba(147,197,253,0.5)';
              const gradArrow = isJugend ? 'rgba(74,222,128,0.35)' : 'rgba(96,165,250,0.35)';
              return (
                <div key={group.id} onClick={()=>{setActiveGroup(group);navTo('group');}}
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

        </div>
      </div>
    );
  }



  if (['eltern','jugendlich'].includes(userRole)) {
    const myChild=getMyChild();
    const sub=myChild?subgroups[myChild.subgroupId]:null;
    const grp=sub?FIXED_GROUPS.find(g=>g.id===sub.groupId):null;
    const dates=(sub?.trainingDates||[]).sort().reverse();
    const stats=myChild?getAttendanceStats(myChild.id,myChild.subgroupId):null;
    const mySessions=myChild&&sub ? getUpcomingSessionsForChild(myChild.id, myChild.subgroupId) : [];

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
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
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

        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 20px 60px'}}>

          {/* ── Top-Bar ── */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 22px':'0 -24px 28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <img src="/logo.png" alt="TTC Logo" style={{width:'55px',height:'55px',objectFit:'contain',borderRadius:'12px',flexShrink:0,filter:'drop-shadow(0 3px 12px rgba(0,0,0,0.5))'}}/>
              <div>
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß Staffel</p>
                <p style={{margin:0,color:'rgba(74,222,128,0.55)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{userRole==='eltern'?'Eltern-Portal':'Jugend-Portal'}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              {(()=>{const sel=(userProfile?.roles||[userRole]).filter(r=>r!=='pending');return sel.length>1?<button onClick={()=>setShowRolePicker(true)} style={{padding:'8px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#86efac',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'👤':'👤 Rolle'}</button>:null;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:isMobile?'16px':'12px',fontWeight:'600',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'⚙️':'⚙️ Profil'}</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🚪':'Abmelden'}</button>
            </div>
          </div>

          {/* ── Greeting ── */}
          <div style={{marginBottom:'32px'}}>
            <p style={{margin:'0 0 6px',color:'rgba(74,222,128,0.5)',fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase'}}>{dateLabel}</p>
            <h1 style={{margin:0,color:'white',fontSize:isMobile?'26px':'32px',fontWeight:'800',letterSpacing:'-1px',lineHeight:1.1}}>
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
                      {label:'Unentsch.',value:stats.unexcused,color:'#f87171',bg:'rgba(239,68,68,0.1)'},
                      {label:'Entsch.',value:stats.excused,color:'#94a3b8',bg:'rgba(148,163,184,0.1)'},
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
                      const myResponseRaw=(session.responses||{})[childId];
                      const myResponse=typeof myResponseRaw==='object'?myResponseRaw?.status:myResponseRaw;
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
                          <div style={{display:'flex'}}>
                            <button onClick={()=>respondToSession(session.id,'missing')}
                              style={{flex:1,padding:'10px',border:`2px solid #dc2626`,background:isMissing?'#dc2626':'transparent',color:isMissing?'white':'#f87171',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all 0.12s'}}>
                              <X size={18}/> {isMissing?'Abgemeldet – Rückgängig':'Ich fehle'}
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
                        const statusBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(148,163,184,0.07)':status==='absent_unexcused'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.03)';
                        const statusBorder = status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.18)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.07)';
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
                                <button onClick={()=>excuseMyChild(date)} style={{padding:'6px 12px',background:'rgba(148,163,184,0.12)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'8px',cursor:'pointer',color:'#94a3b8',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigen</button>
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

        {/* PT Detail Modal */}
        {ptDetailModal&&(()=>{
          const mpt=ptDetailModal;
          const mPlayers=mpt.players||[];
          const mMatches=mpt.matches||[];
          const isArchived=!!mpt.archivedAt;
          const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
          mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
          const mStandings=(mpt.finalStandings||(()=>[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost})))());
          const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
          const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
          return(
            <div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
              <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px 36px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'16px'}}>🎯</span>
                      <span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span>
                      <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:isArchived?'#4ade80':'#fde68a',background:isArchived?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.08)',border:`1px solid ${isArchived?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}`}}>{isArchived?'✓ Abgeschlossen':'● Laufend'}</span>
                    </div>
                    <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{new Date(mpt.archivedAt||mpt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                  </div>
                  <button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                </div>
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
                <div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>
                  {mStandings.map(s=>(
                    <div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span>
                      <div style={{flex:1}}>
                        <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spielplan</p>
                {roundsM.map(round=>(
                  <div key={round} style={{marginBottom:'12px'}}>
                    <p style={{margin:'0 0 5px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                    <div style={{display:'grid',gap:'3px'}}>
                      {mMatches.filter(m=>m.round===round).map((m,mi)=>{
                        const p1=mPlayers[m.p1Idx];const p2=mPlayers[m.p2Idx];const res=m.result;
                        return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                          <span style={{flex:1,fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                          <span style={{fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'34px',textAlign:'center',flexShrink:0}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
                          <span style={{flex:1,fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                        </div>);
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {/* PT-Ergebnisse im Eltern/Jugend-Profil */}
        {myChild&&(()=>{
          const placeEmojiPD=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const myPTs=[
            ...Object.values(archivedPracticeTournaments),
            ...Object.values(practiceTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id)),
          ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===myChild.id))
           .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||'')).slice(0,10);
          if(myPTs.length===0) return null;
          return (
            <div style={{padding:'0 0 16px'}}>
              <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px',margin:'0 16px 10px'}}>Trainingswettkämpfe</span>
              <div style={{margin:'0 16px',display:'grid',gap:'6px'}}>
                {myPTs.map(pt=>{
                  const isArc=!!pt.archivedAt;
                  // Compute my current standing
                  const myIdx=pt.players.findIndex(p=>p.childId===myChild.id);
                  const stats=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                  pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats[m.p1Idx].setsWon+=sets1;stats[m.p1Idx].setsLost+=sets2;stats[m.p2Idx].setsWon+=sets2;stats[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats[m.p1Idx].wins++;else stats[m.p2Idx].wins++;});
                  let myEntry=null;
                  if(pt.finalStandings){myEntry=pt.finalStandings.find(s=>s.childId===myChild.id);}
                  else{
                    const srt=[...stats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                    const myRank=srt.findIndex(s=>s.idx===myIdx);
                    const ms=stats[myIdx]||{wins:0,setsWon:0,setsLost:0};
                    const mc=pt.matches.filter(m=>m.result&&(m.p1Idx===myIdx||m.p2Idx===myIdx)).length;
                    myEntry={place:myRank+1,wins:ms.wins,losses:mc-ms.wins,setsWon:ms.setsWon,setsLost:ms.setsLost};
                  }
                  const done=pt.matches.filter(m=>m.result).length;
                  const total=pt.matches.length;
                  const dateStr=new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return(
                    <div key={pt.id} onClick={()=>setPtDetailModal(pt)}
                      style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'12px',border:`1px solid ${isArc?'rgba(74,222,128,0.12)':'rgba(167,139,250,0.12)'}`,cursor:'pointer'}}
                      onTouchStart={e=>e.currentTarget.style.background='rgba(167,139,250,0.1)'}
                      onTouchEnd={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                      <span style={{fontSize:'20px',flexShrink:0}}>{isArc?(placeEmojiPD[myEntry?.place-1]||(myEntry?.place+'.')):'🎯'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'5px',flexWrap:'wrap',marginBottom:'2px'}}>
                          {isArc
                            ?<span style={{fontWeight:'800',color:'white',fontSize:'13px'}}>Platz {myEntry?.place}</span>
                            :<span style={{fontWeight:'800',color:'#fde68a',fontSize:'13px'}}>Laufend {done}/{total}</span>}
                          <span style={{fontSize:'10px',color:'rgba(167,139,250,0.6)',fontWeight:'600'}}>{pt.players.length}er Gruppe</span>
                          <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>{dateStr}</span>
                        </div>
                        {myEntry&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{myEntry.wins}S {myEntry.losses}N · Sätze {myEntry.setsWon}:{myEntry.setsLost}</p>}
                      </div>
                      <span style={{fontSize:'14px',color:'rgba(167,139,250,0.3)',flexShrink:0}}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>
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



  // ── GRUPPE ───────────────────────────────────────────────────
  // ── GRUPPE ───────────────────────────────────────────────────
  if (view==='group') {
    const subs=getSubgroupsForGroup(activeGroup.id);
    const GRP = activeGroup;
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
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
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
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
    const subgroupKids = sessionSubs.flatMap(sub => getChildrenForSubgroup(sub.id));
    // Extra individual players not already in a subgroup
    const extraPlayers = (session?.extraPlayerIds||[])
      .map(id=>children[id]).filter(Boolean)
      .filter(ep=>!subgroupKids.some(k=>k.id===ep.id));
    const allKids = [...subgroupKids, ...extraPlayers];
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
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
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
              {label:'Unentsch.',value:absentCount,color:'#f87171',bg:'rgba(239,68,68,0.09)',border:'rgba(239,68,68,0.22)'},
              {label:'Entsch.',value:excusedCount,color:'#94a3b8',bg:'rgba(148,163,184,0.08)',border:'rgba(148,163,184,0.2)'},
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
                const parentExcused = parentResponse?.status==='missing';
                const parentComing = parentResponse?.status==='coming';
                const responseBy = parentResponse?.by ?? 'parent';
                const sub = subgroups[child.subgroupId];
                const cardBg = status==='present'?'rgba(74,222,128,0.08)':status==='absent_unexcused'?'rgba(239,68,68,0.07)':status==='absent_excused'?'rgba(148,163,184,0.07)':'rgba(255,255,255,0.03)';
                const cardBorder = status==='present'?'rgba(74,222,128,0.25)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':status==='absent_excused'?'rgba(148,163,184,0.25)':parentExcused?'rgba(148,163,184,0.3)':parentComing?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.07)';
                return (
                  <div key={child.id} style={{padding:'13px 16px',borderRadius:'14px',background:cardBg,border:`1.5px solid ${cardBorder}`,transition:'border-color 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'100px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'2px'}}>
                          <p style={{margin:0,fontWeight:'700',color:'white',fontSize:'15px'}}>{child.name}</p>
                          {parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#94a3b8',background:'rgba(148,163,184,0.12)',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(148,163,184,0.25)'}}>{responseBy==='self'?'Selbst abgemeldet':'Eltern: abgemeldet'}</span>}
                        </div>
                        {sub&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{sub.name}</p>}
                        {extraPlayers.some(ep=>ep.id===child.id)&&<p style={{margin:0,fontSize:'10px',fontWeight:'700',color:'#fbbf24'}}>⭐ Einzelspieler</p>}
                      </div>
                      {/* 3 Anwesenheits-Buttons */}
                      <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'present')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='present'?'#16a34a':'rgba(74,222,128,0.25)'}`,background:status==='present'?'#16a34a':'rgba(74,222,128,0.08)',color:status==='present'?'white':'#4ade80',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>
                          <Check size={24}/>
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_unexcused')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='absent_unexcused'?'#ef4444':'rgba(239,68,68,0.2)'}`,background:status==='absent_unexcused'?'rgba(220,38,38,0.8)':'rgba(239,68,68,0.06)',color:status==='absent_unexcused'?'white':'#f87171',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',transition:'all 0.12s'}}>
                          –
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_excused')}
                          style={{width:'48px',height:'48px',border:`2px solid ${status==='absent_excused'?'#64748b':'rgba(148,163,184,0.2)'}`,background:status==='absent_excused'?'rgba(71,85,105,0.85)':'rgba(148,163,184,0.06)',color:status==='absent_excused'?'white':'#94a3b8',borderRadius:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s'}}>
                          <Clock size={22}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Quick-Add Einzelspieler – Dropdown */}
          {canEdit()&&(()=>{
            const alreadyIds = new Set(allKids.map(k=>k.id));
            const addable = Object.values(children).filter(ch=>!alreadyIds.has(ch.id)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
            if(addable.length===0) return null;
            return (
              <div style={{marginBottom:'16px',padding:'14px',background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'12px'}}>
                <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'700',color:'#fbbf24'}}>⭐ Spieler kurzfristig hinzufügen</p>
                <select value="" onChange={e=>{
                  if(!e.target.value) return;
                  const cur=sessions[session.id]||session;
                  const newExtras=[...(cur.extraPlayerIds||[]),e.target.value];
                  saveSessions({...sessions,[session.id]:{...cur,extraPlayerIds:newExtras}});
                }}
                  style={{width:'100%',padding:'10px 12px',borderRadius:'10px',border:'1px solid rgba(251,191,36,0.35)',background:'rgba(0,0,0,0.3)',color:'#fbbf24',fontSize:'14px',fontWeight:'600',cursor:'pointer',outline:'none'}}>
                  <option value="" style={{background:'#1a1a1a'}}>+ Spieler zur Einheit hinzufügen…</option>
                  {addable.map(ch=>{
                    const sub2=subgroups[ch.subgroupId];
                    return <option key={ch.id} value={ch.id} style={{background:'#1a1a1a',color:'white'}}>{ch.name}{sub2?` – ${sub2.name}`:''}</option>;
                  })}
                </select>
              </div>
            );
          })()}

          {/* Legende */}
          <div style={{display:'flex',gap:'16px',flexWrap:'wrap',padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',marginBottom:'16px'}}>
            <span style={{fontSize:'12px',color:'#4ade80',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Check size={13}/> Anwesend</span>
            <span style={{fontSize:'12px',color:'#f87171',fontWeight:'600'}}>– Unentschuldigt</span>
            <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigt</span>
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
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
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
              {label:'Unentsch.',value:stats.unexcused,color:'#f87171',bg:'rgba(239,68,68,0.08)',border:'rgba(239,68,68,0.2)'},
              {label:'Entsch.',value:stats.excused,color:'#94a3b8',bg:'rgba(148,163,184,0.07)',border:'rgba(148,163,184,0.18)'},
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
                const parentExcused=parentResponse?.status==='missing';
                const parentComing=parentResponse?.status==='coming';
                const responseBy=parentResponse?.by??'parent';
                const rowBg=status==='present'?'rgba(74,222,128,0.07)':status==='absent_excused'?'rgba(148,163,184,0.06)':status==='absent_unexcused'?'rgba(239,68,68,0.07)':'rgba(255,255,255,0.025)';
                const rowBorder=status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.15)':status==='absent_unexcused'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)';
                return (
                  <div key={date} style={{padding:'11px 14px',background:rowBg,borderRadius:'10px',border:`1px solid ${rowBorder}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <p style={{margin:'0 0 3px',fontSize:'13px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>
                          {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                        </p>
                        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                          {parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#94a3b8',background:'rgba(148,163,184,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(148,163,184,0.2)'}}>{responseBy==='self'?'Selbst abgemeldet':'Eltern abgemeldet'}</span>}
                        </div>
                      </div>
                      {canEdit() ? (
                        <div style={{display:'flex',gap:'5px'}}>
                          <button onClick={()=>setChildStatus(date,'present')} style={{width:'34px',height:'34px',border:`2px solid ${status==='present'?'#16a34a':'rgba(74,222,128,0.2)'}`,background:status==='present'?'#16a34a':'rgba(74,222,128,0.06)',color:status==='present'?'white':'#4ade80',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={16}/></button>
                          <button onClick={()=>setChildStatus(date,'absent_unexcused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_unexcused'?'#ef4444':'rgba(239,68,68,0.2)'}`,background:status==='absent_unexcused'?'rgba(220,38,38,0.75)':'rgba(239,68,68,0.06)',color:status==='absent_unexcused'?'white':'#f87171',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>–</button>
                          <button onClick={()=>setChildStatus(date,'absent_excused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_excused'?'#64748b':'rgba(148,163,184,0.2)'}`,background:status==='absent_excused'?'rgba(71,85,105,0.8)':'rgba(148,163,184,0.05)',color:status==='absent_excused'?'white':'#94a3b8',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Clock size={15}/></button>
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

          {/* Trainingswettkämpfe im Kind-Profil */}
          {(()=>{
            const placeEmojiCH=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            const childPTs=[
              ...Object.values(archivedPracticeTournaments),
              ...Object.values(practiceTournaments).filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id)),
            ].filter(pt=>pt.players&&pt.players.some(p=>p.childId===child.id))
             .sort((a,b)=>(b.archivedAt||b.createdAt||'').localeCompare(a.archivedAt||a.createdAt||'')).slice(0,10);
            if(childPTs.length===0) return null;
            return (<>
              {ptDetailModal&&(()=>{
                const mpt=ptDetailModal;
                const mPlayers=mpt.players||[];
                const mMatches=mpt.matches||[];
                const isArchived=!!mpt.archivedAt;
                const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
                const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
                const mStandings=(mpt.finalStandings||(()=>[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost})))());
                const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
                const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
                return(
                  <div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
                    <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px 36px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'16px'}}>🎯</span>
                            <span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span>
                            <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:isArchived?'#4ade80':'#fde68a',background:isArchived?'rgba(74,222,128,0.1)':'rgba(253,230,138,0.08)',border:`1px solid ${isArchived?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}`}}>{isArchived?'✓ Abgeschlossen':'● Laufend'}</span>
                          </div>
                          <p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{new Date(mpt.archivedAt||mpt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                        </div>
                        <button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                      </div>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Tabelle</p>
                      <div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>
                        {mStandings.map(s=>(
                          <div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
                            <span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                              <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spielplan</p>
                      {roundsM.map(round=>(
                        <div key={round} style={{marginBottom:'12px'}}>
                          <p style={{margin:'0 0 5px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                          <div style={{display:'grid',gap:'3px'}}>
                            {mMatches.filter(m=>m.round===round).map((m,mi)=>{
                              const p1=mPlayers[m.p1Idx];const p2=mPlayers[m.p2Idx];const res=m.result;
                              return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                <span style={{flex:1,fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400',textAlign:'right'}}>{p1?.name||'?'}</span>
                                <span style={{fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'34px',textAlign:'center',flexShrink:0}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
                                <span style={{flex:1,fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                              </div>);
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div style={{marginBottom:'20px'}}>
                <h3 style={{margin:'0 0 12px',color:'white',fontSize:'16px',fontWeight:'800'}}>🎮 Trainingswettkämpfe</h3>
                <div style={{display:'grid',gap:'7px'}}>
                  {childPTs.map(pt=>{
                    const isArc=!!pt.archivedAt;
                    const myIdx=pt.players.findIndex(p=>p.childId===child.id);
                    const stats=pt.players.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
                    pt.matches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;stats[m.p1Idx].setsWon+=sets1;stats[m.p1Idx].setsLost+=sets2;stats[m.p2Idx].setsWon+=sets2;stats[m.p2Idx].setsLost+=sets1;if(sets1>sets2)stats[m.p1Idx].wins++;else stats[m.p2Idx].wins++;});
                    let fs3=null;
                    if(pt.finalStandings){fs3=pt.finalStandings.find(s=>s.childId===child.id);}
                    else{
                      const srt=[...stats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost));
                      const myRank=srt.findIndex(s=>s.idx===myIdx);
                      const ms=stats[myIdx]||{wins:0,setsWon:0,setsLost:0};
                      const mc=pt.matches.filter(m=>m.result&&(m.p1Idx===myIdx||m.p2Idx===myIdx)).length;
                      fs3={place:myRank+1,wins:ms.wins,losses:mc-ms.wins,setsWon:ms.setsWon,setsLost:ms.setsLost};
                    }
                    const done=pt.matches.filter(m=>m.result).length;
                    const total=pt.matches.length;
                    const opps=pt.players.filter(p=>p.childId!==child.id).map(p=>p.name);
                    return(<div key={pt.id} onClick={()=>setPtDetailModal(pt)}
                      style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',background:isArc?'rgba(167,139,250,0.06)':'rgba(253,230,138,0.04)',border:`1px solid ${isArc?'rgba(167,139,250,0.15)':'rgba(253,230,138,0.15)'}`,borderRadius:'12px',cursor:'pointer'}}>
                      <span style={{fontSize:'22px',flexShrink:0}}>{isArc?(placeEmojiCH[fs3?.place-1]||String(fs3?.place)+'.'):'🎯'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>
                          {isArc
                            ?<span style={{fontWeight:'800',color:'white',fontSize:'14px'}}>Platz {fs3?.place}</span>
                            :<span style={{fontWeight:'800',color:'#fde68a',fontSize:'14px'}}>Laufend {done}/{total}</span>}
                          <span style={{fontSize:'11px',color:isArc?'rgba(167,139,250,0.7)':'rgba(253,230,138,0.6)',fontWeight:'600'}}>{pt.players?pt.players.length+'er Gruppe':'4er Gruppe'}</span>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</span>
                        </div>
                        {fs3&&<p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>vs. {opps.join(', ')} · {fs3.wins}S {fs3.losses}N</p>}
                      </div>
                      <span style={{fontSize:'16px',color:'rgba(255,255,255,0.2)',flexShrink:0}}>›</span>
                    </div>);
                  })}
                </div>
              </div>
            </>);
          })()}

          {/* Manuell hinzufügen */}
          {canEdit()&&(
            <div style={{padding:'16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px'}}>
              <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.4)'}}>Training manuell hinzufügen:</p>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)} style={{padding:'8px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',fontSize:'14px',color:'white',outline:'none'}}/>
                <div style={{display:'flex',gap:'5px'}}>
                  <button onClick={()=>setChildStatus(trainingDate,'present')} style={{padding:'8px 12px',background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.3)',borderRadius:'8px',color:'#4ade80',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Check size={13}/> Da</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_unexcused')} style={{padding:'8px 12px',background:'rgba(239,68,68,0.09)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',color:'#f87171',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>– Unentsch.</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_excused')} style={{padding:'8px 12px',background:'rgba(148,163,184,0.09)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'8px',color:'#94a3b8',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}><Clock size={13}/> Entsch.</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // ── ERRUNGENSCHAFTEN VIEW (Trainer/Admin) ────────────────────────────────
  if (view === 'achievements') {
    // Achievements only for Jugendgruppe children, filtered by trainer's access
    const jugendSubs = Object.values(subgroups).filter(sg=>sg.groupId==='jugend'&&canAccessGroup('jugend'));
    const jugendSubIds = new Set(jugendSubs.map(sg=>sg.id));
    // Include children in jugend subgroups + extra players in any jugend session
    const extraInJugend = new Set(
      Object.values(sessions).filter(s=>(s.subgroupIds||[]).some(sid=>jugendSubIds.has(sid)))
        .flatMap(s=>s.extraPlayerIds||[])
    );
    const kidsWithSub = Object.values(children)
      .filter(c => jugendSubIds.has(c.subgroupId) || extraInJugend.has(c.id))
      .sort((a,b)=>a.name.localeCompare(b.name,'de'));

    const AchCounter = ({label, val, onInc, onDec}) => (
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        <span style={{fontSize:'12px',color:'#555',minWidth:'90px'}}>{label}</span>
        <button onClick={onDec} style={{width:'24px',height:'24px',border:'1px solid #ddd',borderRadius:'4px',background:'#f3f4f6',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
        <span style={{minWidth:'24px',textAlign:'center',fontWeight:'700',fontSize:'14px',color:'#111'}}>{val||0}</span>
        <button onClick={onInc} style={{width:'24px',height:'24px',border:'1px solid #ddd',borderRadius:'4px',background:'#f0fdf4',cursor:'pointer',fontWeight:'700',fontSize:'14px',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    );

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🏅 Errungenschaften verwalten</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          {kidsWithSub.length===0
            ? <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>Keine Kinder vorhanden.</div>
            : <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {kidsWithSub.map(child=>{
                const sg = subgroups[child.subgroupId];
                const ach = getAchievements(child.id);
                const ttrUnlocked = ach.ttrUnlocked || [];

                const ACH_LABELS = {
                  einzel1:'🥇 1. Platz Einzel', einzel2:'🥈 2. Platz Einzel', einzel3:'🥉 3. Platz Einzel',
                  doppel1:'🥇 1. Platz Doppel', doppel2:'🥈 2. Platz Doppel', doppel3:'🥉 3. Platz Doppel',
                  team:'🏆 Mannschaftsmeister', spielerDesMonats:'⭐ Spieler des Monats',
                };
                // All three functions read fresh ach inside setChildren functional update
                const toggleTTR = (val) => {
                  setChildren(prev => {
                    const prevChild = prev[child.id]; if (!prevChild) return prev;
                    const prevAch = prevChild.achievements || {};
                    const prevTTR = prevAch.ttrUnlocked || [];
                    const wasUnlocked = prevTTR.includes(val);
                    const next = wasUnlocked ? prevTTR.filter(v=>v!==val) : [...prevTTR, val];
                    const newAch = {...prevAch, ttrUnlocked: next};
                    const updated = {...prev, [child.id]: {...prevChild, achievements: newAch}};
                    setDoc(doc(db,'ttc','children'), updated);
                    return updated;
                  });
                  if (!ttrUnlocked.includes(val)) {
                    createNotification(child.id, 'achievement', '🏓 TTR-Meilenstein erreicht!',
                      `Glückwunsch ${child.name}! Du hast einen TTR-Wert von ${val} erreicht. ${ACHIEVEMENT_DESCRIPTIONS.ttr(val)}`);
                  }
                };
                const incField = (field) => {
                  setChildren(prev => {
                    const prevChild = prev[child.id]; if (!prevChild) return prev;
                    const prevAch = prevChild.achievements || {};
                    const newAch = {...prevAch, [field]: (prevAch[field]||0)+1};
                    const updated = {...prev, [child.id]: {...prevChild, achievements: newAch}};
                    setDoc(doc(db,'ttc','children'), updated);
                    return updated;
                  });
                  const label = ACH_LABELS[field] || field;
                  createNotification(child.id, 'achievement', `${label}`,
                    `Glückwunsch ${child.name}! Du hast eine neue Errungenschaft erhalten: ${label}. Weiter so! 🎉`);
                };
                const decField = (field) => {
                  setChildren(prev => {
                    const prevChild = prev[child.id]; if (!prevChild) return prev;
                    const prevAch = prevChild.achievements || {};
                    const newAch = {...prevAch, [field]: Math.max(0,(prevAch[field]||0)-1)};
                    const updated = {...prev, [child.id]: {...prevChild, achievements: newAch}};
                    setDoc(doc(db,'ttc','children'), updated);
                    return updated;
                  });
                };

                return (
                  <div key={child.id} style={{background:'white',borderRadius:'14px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:sg?.color||'#ddd',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'14px'}}>
                        {child.name[0]}
                      </div>
                      <div>
                        <div style={{fontWeight:'700',fontSize:'15px',color:'#111'}}>{child.name}</div>
                        <div style={{fontSize:'12px',color:'#888'}}>{sg?.name||'–'}</div>
                      </div>
                    </div>

                    {/* TTR Milestones */}
                    <div style={{marginBottom:'14px'}}>
                      <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>TTR Errungenschaften</p>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                        {TTR_MILESTONES.map((val,i)=>{
                          const unlocked = ttrUnlocked.includes(val);
                          const col = TTR_COLORS[i];
                          return (
                            <button key={val} onClick={()=>toggleTTR(val)}
                              title={`${val} TTR ${unlocked?'entfernen':'vergeben'}`}
                              style={{padding:'5px 10px',borderRadius:'8px',border:`2px solid ${unlocked?col.bg:'#e5e7eb'}`,background:unlocked?col.bg:'#f9fafb',color:unlocked?col.text:'#9ca3af',fontWeight:'700',fontSize:'12px',cursor:'pointer',transition:'all 0.15s'}}>
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tournament + Team */}
                    <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                      <div>
                        <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Einzel Turniere</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                          <AchCounter label="🥇 1. Platz" val={ach.einzel1} onInc={()=>incField('einzel1')} onDec={()=>decField('einzel1')}/>
                          <AchCounter label="🥈 2. Platz" val={ach.einzel2} onInc={()=>incField('einzel2')} onDec={()=>decField('einzel2')}/>
                          <AchCounter label="🥉 3. Platz" val={ach.einzel3} onInc={()=>incField('einzel3')} onDec={()=>decField('einzel3')}/>
                        </div>
                      </div>
                      <div>
                        <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Doppel Turniere</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                          <AchCounter label="🥇 1. Platz" val={ach.doppel1} onInc={()=>incField('doppel1')} onDec={()=>decField('doppel1')}/>
                          <AchCounter label="🥈 2. Platz" val={ach.doppel2} onInc={()=>incField('doppel2')} onDec={()=>decField('doppel2')}/>
                          <AchCounter label="🥉 3. Platz" val={ach.doppel3} onInc={()=>incField('doppel3')} onDec={()=>decField('doppel3')}/>
                        </div>
                      </div>
                      <div>
                        <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Mannschaft</p>
                        <AchCounter label="🏆 Meisterschaft" val={ach.team} onInc={()=>incField('team')} onDec={()=>decField('team')}/>
                      </div>
                      <div>
                        <p style={{margin:'0 0 6px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Auszeichnungen</p>
                        <AchCounter label="⭐ Spieler d. Monats" val={ach.spielerDesMonats} onInc={()=>incField('spielerDesMonats')} onDec={()=>decField('spielerDesMonats')}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
    );
  }

  // ── BENACHRICHTIGUNGEN VIEW (Trainer/Admin) ─────────────────────────────
  if (view === 'notifications' && canEdit()) {
    const allKids = Object.values(children).filter(c=>canAccessGroup(subgroups[c.subgroupId]?.groupId)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const allSubs = Object.values(subgroups).filter(s=>canAccessGroup(s.groupId)).sort((a,b)=>a.name.localeCompare(b.name,'de'));

    const sendTrainerNotif = () => {
      if (!notifComposeTitle.trim() || !notifComposeText.trim()) { alert('Bitte Titel und Text eingeben!'); return; }
      let targets = [];
      if (notifComposeTarget === 'all') {
        targets = allKids.map(c=>c.id);
      } else if (notifComposeTarget.startsWith('sub_')) {
        const subId = notifComposeTarget.replace('sub_','');
        targets = allKids.filter(c=>c.subgroupId===subId).map(c=>c.id);
      } else {
        targets = [notifComposeTarget];
      }
      if (targets.length === 0) { alert('Keine Empfänger gefunden.'); return; }
      const now = new Date().toISOString();
      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
      // Determine recipient label
      let recipientLabel = 'Alle Kinder';
      if (notifComposeTarget !== 'all') {
        if (notifComposeTarget.startsWith('sub_')) {
          const subId = notifComposeTarget.replace('sub_','');
          recipientLabel = allSubs.find(s=>s.id===subId)?.name || 'Gruppe';
          recipientLabel += ` (${targets.length} Kinder)`;
        } else {
          const c = children[notifComposeTarget];
          recipientLabel = c?.name || 'Kind';
        }
      } else {
        recipientLabel = `Alle Kinder (${targets.length})`;
      }
      const updated = { ...notifications };
      targets.forEach(childId => {
        const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '_' + childId;
        updated[id] = { id, childId, type:'trainer_message', title:notifComposeTitle.trim(), message:notifComposeText.trim(), createdAt:now, trashedAt:null, key:null, batchId, trainerTrashedAt:null, recipientLabel };
      });
      saveNotifications(updated);
      setNotifComposeTitle('');
      setNotifComposeText('');
      alert(`✅ Nachricht an ${targets.length} Empfänger gesendet!`);
    };

    // Trainer-side: per-uid batch inbox — each trainer sees their own view
    const uid = user?.uid || '';
    const now2 = new Date();
    const trainerMessages = Object.values(notifications).filter(n => n.type === 'trainer_message');

    // Auto-promote trainer trash → deleted after 7 days (per-uid)
    const autoTrainerDelete = trainerMessages.filter(n => {
      const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? n.trainerTrashedAt : {};
      return tta[uid] && (now2 - new Date(tta[uid])) / 86400000 >= 7;
    });
    if (autoTrainerDelete.length > 0) {
      const u = { ...notifications };
      autoTrainerDelete.forEach(n => {
        const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? { ...n.trainerDeletedBy } : {};
        const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? { ...n.trainerTrashedAt } : {};
        delete tta[uid];
        u[n.id] = { ...n, trainerDeletedBy: { ...tdb, [uid]: true }, trainerTrashedAt: tta };
      });
      saveNotifications(u);
    }

    // Helper: is this notification visible (not deleted) for current user?
    const notDeletedForMe = (n) => {
      const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? n.trainerDeletedBy : {};
      return !tdb[uid];
    };
    const isTrashedForMe = (n) => {
      const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? n.trainerTrashedAt : {};
      // backwards compat: old string value
      if (typeof n.trainerTrashedAt === 'string' && n.trainerTrashedAt) return true;
      return !!tta[uid];
    };

    // Group by batchId → one entry per batch, filter per current user
    const batchMap = {};
    trainerMessages.filter(n => notDeletedForMe(n) && !autoTrainerDelete.some(d=>d.id===n.id)).forEach(n => {
      const bid = n.batchId || n.id;
      if (!batchMap[bid]) batchMap[bid] = {
        batchId: bid, title: n.title, message: n.message,
        createdAt: n.createdAt, isTrashed: isTrashedForMe(n),
        trashedAt: (typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt) ? n.trainerTrashedAt[uid] : null,
        recipientLabel: n.recipientLabel || '?', count: 0,
      };
      batchMap[bid].count++;
      if (!isTrashedForMe(n)) batchMap[bid].isTrashed = false;
    });
    const sentBatches   = Object.values(batchMap).filter(b=>!b.isTrashed).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const trashedBatches = Object.values(batchMap).filter(b=>b.isTrashed).sort((a,b)=>(b.trashedAt||'').localeCompare(a.trashedAt||''));

    // Parent messages (type: 'parent_message') for trainers who can access the group
    const parentMessages = Object.values(notifications)
      .filter(n => n.type === 'parent_message' && canAccessGroup(n.toGroupId) && !n.trashedAt)
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt));

    // Active auto-notifications (non-trainer-message) by child
    const autoNotifsByChild = {};
    Object.values(notifications).filter(n=>n.type!=='trainer_message'&&n.type!=='parent_message'&&!n.trashedAt).forEach(n=>{
      if (!autoNotifsByChild[n.childId]) autoNotifsByChild[n.childId] = [];
      autoNotifsByChild[n.childId].push(n);
    });

    const typeLabels = {achievement:'🏅',tournament_reminder:'🏆',training_reminder:'📅',unexcused_absences:'❗',trainer_message:'💬',parent_message:'✉️'};

    return (
      <div style={{minHeight:'100vh',background:"linear-gradient(135deg,#064e3b 0%,#059669 100%)",fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#059669')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}><Bell size={20} style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}/>Benachrichtigungen</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

        {/* Compose */}
        <div style={{...s.card,border:'1px solid #d1fae5'}}>
          <h3 style={{margin:'0 0 16px',color:'#059669',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800'}}><Send size={18}/> Nachricht senden</h3>
          <div style={{display:'grid',gap:'10px'}}>
            <div>
              <label style={s.label}>Empfänger</label>
              <select value={notifComposeTarget} onChange={e=>setNotifComposeTarget(e.target.value)}
                style={{...s.input,flex:'none',width:'100%'}}>
                <option value="all">📢 Alle Kinder</option>
                {allSubs.map(sub=>{
                  const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                  return <option key={sub.id} value={`sub_${sub.id}`}>{grp?.emoji} {sub.name} (Gruppe)</option>;
                })}
                {allKids.map(child=>{
                  const sub2=subgroups[child.subgroupId];
                  return <option key={child.id} value={child.id}>👤 {child.name} ({sub2?.name||'?'})</option>;
                })}
              </select>
            </div>
            <div>
              <label style={s.label}>Titel</label>
              <input value={notifComposeTitle} onChange={e=>setNotifComposeTitle(e.target.value)}
                placeholder="z.B. Training fällt aus" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={s.label}>Nachricht</label>
              <textarea value={notifComposeText} onChange={e=>setNotifComposeText(e.target.value)}
                placeholder="Nachrichtentext..." rows={3}
                style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}}/>
            </div>
            <button onClick={sendTrainerNotif} style={{...s.btn('#059669'),alignSelf:'flex-start'}}>
              <Send size={16}/> Senden
            </button>
          </div>
        </div>

        {/* Gesendete Nachrichten + eigener Papierkorb */}
        <div style={s.card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
            <h3 style={{margin:0,color:'#333',display:'flex',alignItems:'center',gap:'8px'}}><MessageSquare size={18}/> Nachrichten</h3>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              <button onClick={()=>setNotifTrainerTab('sent')} style={{padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='sent'?'#059669':'#f3f4f6',color:notifTrainerTab==='sent'?'white':'#555'}}>Gesendet {sentBatches.length>0&&`(${sentBatches.length})`}</button>
              <button onClick={()=>setNotifTrainerTab('inbox')} style={{padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='inbox'?'#7c3aed':'#f3f4f6',color:notifTrainerTab==='inbox'?'white':'#555'}}>✉️ Von Eltern {parentMessages.length>0&&`(${parentMessages.length})`}</button>
              <button onClick={()=>setNotifTrainerTab('trash')} style={{padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='trash'?'#374151':'#f3f4f6',color:notifTrainerTab==='trash'?'white':'#555'}}>🗑️ Papierkorb {trashedBatches.length>0&&`(${trashedBatches.length})`}</button>
            </div>
          </div>
          {notifTrainerTab === 'inbox'
            ? parentMessages.length === 0
              ? <p style={{color:'#9ca3af',textAlign:'center',padding:'20px',margin:0}}>Keine Nachrichten von Eltern/Jugendlichen.</p>
              : parentMessages.map(msg => {
                  const dateStr = new Date(msg.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                  const grpInfo = FIXED_GROUPS.find(g=>g.id===msg.toGroupId);
                  return (
                    <div key={msg.id} style={{marginBottom:'10px',border:'1px solid #ddd8fe',borderRadius:'10px',padding:'12px 14px',background:'#faf5ff'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                        <span style={{fontSize:'20px',flexShrink:0}}>✉️</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'3px'}}>
                            <p style={{margin:0,fontWeight:'700',fontSize:'14px',color:'#1f2937'}}>{msg.title}</p>
                            <span style={{fontSize:'11px',background:'#ede9fe',color:'#7c3aed',padding:'1px 7px',borderRadius:'10px',fontWeight:'600'}}>👤 {msg.fromName}</span>
                            {grpInfo&&<span style={{fontSize:'11px',color:'#888'}}>{grpInfo.emoji} {grpInfo.name}</span>}
                          </div>
                          <p style={{margin:'0 0 5px',fontSize:'13px',color:'#374151',lineHeight:'1.4'}}>{msg.message}</p>
                          <p style={{margin:0,fontSize:'10px',color:'#9ca3af'}}>{dateStr}</p>
                        </div>
                        <button onClick={()=>{ const u={...notifications}; u[msg.id]={...msg,trashedAt:new Date().toISOString()}; saveNotifications(u); }}
                          title="Löschen" style={{padding:'4px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626',flexShrink:0}}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                })
            : (notifTrainerTab==='sent' ? sentBatches : trashedBatches).length === 0
              ? <p style={{color:'#9ca3af',textAlign:'center',padding:'20px',margin:0}}>{notifTrainerTab==='sent'?'Noch keine Nachrichten gesendet.':'Papierkorb ist leer.'}</p>
              : (notifTrainerTab==='sent' ? sentBatches : trashedBatches).map(batch=>{
                  const dateStr = new Date(batch.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                  const isTrash = notifTrainerTab==='trash';
                  return (
                    <div key={batch.batchId} style={{marginBottom:'10px',border:'1px solid #e5e7eb',borderRadius:'10px',padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:'10px',background:isTrash?'#f9fafb':'white'}}>
                      <span style={{fontSize:'20px',flexShrink:0}}>💬</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'3px'}}>
                          <p style={{margin:0,fontWeight:'700',fontSize:'14px',color:'#1f2937'}}>{batch.title}</p>
                          <span style={{fontSize:'11px',background:'#f0fdf4',color:'#059669',padding:'1px 7px',borderRadius:'10px',fontWeight:'600'}}>→ {batch.recipientLabel}</span>
                        </div>
                        <p style={{margin:'0 0 5px',fontSize:'13px',color:'#374151',lineHeight:'1.4'}}>{batch.message}</p>
                        <p style={{margin:0,fontSize:'10px',color:'#9ca3af'}}>{dateStr}</p>
                      </div>
                      <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                        {isTrash
                          ? <>
                              <button onClick={()=>trainerRestoreBatch(batch.batchId)} title="Wiederherstellen"
                                style={{padding:'4px 8px',background:'#f0fdf4',border:'none',borderRadius:'6px',cursor:'pointer',color:'#16a34a',fontSize:'12px',fontWeight:'700'}}>↩</button>
                              <button onClick={()=>trainerDeleteBatch(batch.batchId)} title="Endgültig löschen"
                                style={{padding:'4px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={14}/></button>
                            </>
                          : <button onClick={()=>trainerTrashBatch(batch.batchId)} title="In Papierkorb"
                              style={{padding:'4px',background:'#f3f4f6',border:'none',borderRadius:'6px',cursor:'pointer',color:'#6b7280'}}><Trash2 size={14}/></button>
                        }
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Auto-Benachrichtigungen Übersicht */}
        <div style={s.card}>
          <h3 style={{margin:'0 0 14px',color:'#333',display:'flex',alignItems:'center',gap:'8px'}}><Bell size={18}/> Automatische Benachrichtigungen (aktiv)</h3>
          {allKids.filter(c=>autoNotifsByChild[c.id]?.length>0).length===0
            ? <p style={{color:'#9ca3af',textAlign:'center',padding:'16px',margin:0}}>Keine aktiven automatischen Benachrichtigungen.</p>
            : allKids.filter(c=>autoNotifsByChild[c.id]?.length>0).map(child=>{
                const sub2=subgroups[child.subgroupId];
                const grp2=FIXED_GROUPS.find(g=>g.id===sub2?.groupId);
                const notifs=(autoNotifsByChild[child.id]||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
                return (
                  <div key={child.id} style={{marginBottom:'10px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'}}>
                    <div style={{background:'#f9fafb',padding:'7px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontWeight:'700',fontSize:'13px',color:'#1f2937'}}>{child.name}</span>
                      <span style={{fontSize:'11px',color:'#6b7280'}}>{grp2?.emoji} {sub2?.name}</span>
                      <span style={{marginLeft:'auto',background:'#f59e0b',color:'white',borderRadius:'20px',padding:'1px 8px',fontSize:'11px',fontWeight:'700'}}>{notifs.length}</span>
                    </div>
                    <div style={{padding:'8px 12px',display:'grid',gap:'5px'}}>
                      {notifs.map(n=>{
                        const dateStr=new Date(n.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                        return (
                          <div key={n.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',background:'white',borderRadius:'7px',border:'1px solid #f3f4f6'}}>
                            <span style={{fontSize:'15px',flexShrink:0}}>{typeLabels[n.type]||'🔔'}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{margin:'0 0 1px',fontWeight:'700',fontSize:'12px',color:'#1f2937'}}>{n.title}</p>
                              <p style={{margin:0,fontSize:'10px',color:'#9ca3af'}}>{dateStr}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          }
        </div>

      </div></div>
    );
  }

  // ── MANNSCHAFT VIEW (Trainer/Admin) ─────────────────────────────────────
  if (view === 'mannschaft' && canEdit() && appSettings.mannschaftEnabled) {
    const myTeams = userRole==='admin'
      ? Object.values(teams)
      : Object.values(teams).filter(t=>(t.trainerUids||[]).includes(user?.uid));
    myTeams.sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const activeTeam = mannTeamFilter
      ? teams[mannTeamFilter]
      : (myTeams[0] || null);
    const today = new Date().toISOString().split('T')[0];

    const teamMatchdays = activeTeam
      ? Object.values(matchdays).filter(m=>m.teamId===activeTeam.id).sort((a,b)=>b.date.localeCompare(a.date))
      : [];
    const upcomingMds = teamMatchdays.filter(m=>m.date>=today);
    const pastMds = teamMatchdays.filter(m=>m.date<today);

    const saveMatchday = () => {
      if (!mdForm.date||!mdForm.time||!mdForm.teamId) { alert('Datum, Uhrzeit und Mannschaft sind Pflichtfelder!'); return; }
      const id = editingMd ? editingMd : 'md_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
      saveMatchdays({...matchdays,[id]:{...mdForm,id,responses:matchdays[id]?.responses||{},postponement:matchdays[id]?.postponement||null,result:matchdays[id]?.result||'',createdAt:matchdays[id]?.createdAt||new Date().toISOString()}});
      setMdForm({teamId:activeTeam?.id||'',date:'',time:'',location:'',meetingPoint:'',meetingTime:'',isHome:true,opponent:''});
      setShowMdForm(false);
      setEditingMd(null);
    };

    const startEdit = (md) => {
      setMdForm({teamId:md.teamId,date:md.date,time:md.time,location:md.location||'',meetingPoint:md.meetingPoint||'',meetingTime:md.meetingTime||'',isHome:md.isHome!==false,opponent:md.opponent||''});
      setEditingMd(md.id);
      setShowMdForm(true);
    };

    const deleteMd = (id) => {
      if (!window.confirm('Spieltag löschen?')) return;
      const u={...matchdays}; delete u[id]; saveMatchdays(u);
    };

    const startPostpone = (md) => {
      setPostponeForm({matchdayId:md.id, reason:'', options:[{date:'',time:''},{date:'',time:''}]});
    };

    const sendPostponement = () => {
      if (!postponeForm) return;
      const opts = postponeForm.options.filter(o=>o.date&&o.time);
      if (opts.length < 1) { alert('Bitte mindestens einen Terminvorschlag eintragen!'); return; }
      const md = matchdays[postponeForm.matchdayId];
      saveMatchdays({...matchdays,[md.id]:{...md,postponement:{reason:postponeForm.reason,options:opts,responses:{},confirmedOption:null}}});
      setPostponeForm(null);
    };

    const confirmPostpone = (md, optIdx) => {
      const opt = md.postponement.options[optIdx];
      saveMatchdays({...matchdays,[md.id]:{...md,date:opt.date,time:opt.time,postponement:{...md.postponement,confirmedOption:optIdx}}});
    };

    const cancelPostpone = (md) => {
      saveMatchdays({...matchdays,[md.id]:{...md,postponement:null}});
    };

    const MatchdayCard = ({md, upcoming}) => {
      const teamKids = (activeTeam?.childIds||[]).map(id=>children[id]).filter(Boolean);
      const yesKids = teamKids.filter(c=>(md.responses||{})[c.id]==='yes');
      const noKids = teamKids.filter(c=>(md.responses||{})[c.id]==='no');
      const openKids = teamKids.filter(c=>!(md.responses||{})[c.id]);
      const dateStr = new Date(md.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
      const isPostponed = !!md.postponement;
      return (
        <div style={{border:`2px solid ${isPostponed?'#fed7aa':upcoming?'#99f6e4':'#e5e7eb'}`,borderRadius:'12px',background:isPostponed?'#fff7ed':upcoming?'#f0fdfa':'#f9fafb',overflow:'hidden',marginBottom:'12px'}}>
          <div style={{padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:'10px',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                <span style={{fontWeight:'700',fontSize:'15px',color:'#0f766e'}}>{md.isHome!==false?'🏠 Heim':'🚌 Auswärts'}{md.opponent?` · vs. ${md.opponent}`:''}</span>
                {isPostponed&&<span style={{fontSize:'11px',background:'#fed7aa',color:'#c2410c',padding:'2px 7px',borderRadius:'10px',fontWeight:'700'}}>⏳ Verlegung läuft</span>}
                {md.result&&<span style={{fontSize:'12px',background:'#f3f4f6',color:'#374151',padding:'2px 8px',borderRadius:'10px',fontWeight:'600'}}>Ergebnis: {md.result}</span>}
              </div>
              <p style={{margin:'0 0 2px',fontSize:'13px',color:'#333',fontWeight:'600'}}>{dateStr} · {md.time} Uhr</p>
              {md.location&&<p style={{margin:'0 0 2px',fontSize:'12px',color:'#555'}}>📍 {md.location}</p>}
              {md.meetingPoint&&<p style={{margin:'0 0 2px',fontSize:'12px',color:'#555'}}>🚗 {md.meetingPoint}{md.meetingTime?` · ${md.meetingTime} Uhr`:''}</p>}
            </div>
            <div style={{display:'flex',gap:'4px',flexShrink:0,flexWrap:'wrap'}}>
              <button onClick={()=>startEdit(md)} style={{...s.btn('#6b7280'),padding:'4px 8px',fontSize:'12px'}}>✏️</button>
              {!isPostponed&&upcoming&&<button onClick={()=>startPostpone(md)} style={{...s.btn('#f97316'),padding:'4px 8px',fontSize:'12px'}}>⏳ Verlegen</button>}
              {isPostponed&&<button onClick={()=>cancelPostpone(md)} style={{...s.btn('#6b7280'),padding:'4px 8px',fontSize:'12px'}}>✕ Abbrechen</button>}
              {mdResultForm?.id===md.id
                ? <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                    <input value={mdResultForm.result} onChange={e=>setMdResultForm({...mdResultForm,result:e.target.value})}
                      placeholder="z.B. 3:2" style={{...s.input,flex:'none',width:'80px',padding:'4px 8px',fontSize:'12px'}}/>
                    <button onClick={()=>{saveMatchdays({...matchdays,[md.id]:{...md,result:mdResultForm.result}});setMdResultForm(null);}} style={{...s.btn('#0f766e'),padding:'4px 8px',fontSize:'12px'}}>💾</button>
                    <button onClick={()=>setMdResultForm(null)} style={{...s.btn('#6b7280'),padding:'4px 8px',fontSize:'12px'}}>✕</button>
                  </div>
                : <button onClick={()=>setMdResultForm({id:md.id,result:md.result||''})} style={{...s.btn('#0f766e'),padding:'4px 8px',fontSize:'12px'}}>🏆 Ergebnis</button>
              }
              <button onClick={()=>deleteMd(md.id)} style={{...s.btn('#dc2626'),padding:'4px 8px',fontSize:'12px'}}>🗑️</button>
            </div>
          </div>

          {/* Verlegungsabstimmung: Trainer-Sicht */}
          {isPostponed&&md.postponement.confirmedOption==null&&(
            <div style={{padding:'10px 16px',borderTop:'1px solid #fed7aa',background:'#fffbeb'}}>
              <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'700',color:'#c2410c'}}>📊 Abstimmungsergebnis Verlegung</p>
              {md.postponement.reason&&<p style={{margin:'0 0 6px',fontSize:'12px',color:'#92400e'}}>Grund: {md.postponement.reason}</p>}
              <div style={{display:'grid',gap:'6px'}}>
                {(md.postponement.options||[]).map((opt,i)=>{
                  const votes = Object.values(md.postponement.responses||{}).filter(arr=>(arr||[]).includes(i)).length;
                  const total = (activeTeam?.childIds||[]).length;
                  const optDate = new Date(opt.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:'white',borderRadius:'8px',border:'1px solid #fde68a'}}>
                      <div style={{flex:1}}>
                        <span style={{fontWeight:'600',fontSize:'13px',color:'#92400e'}}>{optDate} · {opt.time} Uhr</span>
                        <span style={{marginLeft:'8px',fontSize:'12px',color:'#b45309'}}>✅ {votes}/{total}</span>
                      </div>
                      <button onClick={()=>confirmPostpone(md,i)}
                        style={{...s.btn('#16a34a'),padding:'4px 10px',fontSize:'12px'}}>✅ Als neuen Termin bestätigen</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {isPostponed&&md.postponement.confirmedOption!=null&&(
            <div style={{padding:'8px 16px',borderTop:'1px solid #bbf7d0',background:'#f0fdf4',fontSize:'13px',color:'#16a34a',fontWeight:'600'}}>
              ✅ Neuer Termin bestätigt: {(()=>{const o=md.postponement.options[md.postponement.confirmedOption];return `${new Date(o.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})} · ${o.time} Uhr`;})()}
            </div>
          )}

          {/* Anwesenheits-Übersicht */}
          {!isPostponed&&(
            <div style={{padding:'8px 16px',borderTop:`1px solid ${upcoming?'#99f6e4':'#e5e7eb'}`,display:'flex',gap:'12px',flexWrap:'wrap',fontSize:'12px'}}>
              {yesKids.length>0&&<span style={{color:'#16a34a',fontWeight:'600'}}>✅ Dabei ({yesKids.length}): {yesKids.map(c=>c.name).join(', ')}</span>}
              {noKids.length>0&&<span style={{color:'#dc2626',fontWeight:'600'}}>❌ Fehlt ({noKids.length}): {noKids.map(c=>c.name).join(', ')}</span>}
              {openKids.length>0&&<span style={{color:'#9ca3af',fontWeight:'600'}}>– Offen ({openKids.length}): {openKids.map(c=>c.name).join(', ')}</span>}
              {teamKids.length===0&&<span style={{color:'#9ca3af'}}>Keine Kinder zugewiesen.</span>}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f4c3a 0%,#134e4a 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#0f766e')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>⚽ Mannschaftsverwaltung</h1>
        </div>

        {/* Postpone Modal */}
        {postponeForm&&(()=>{
          const md = matchdays[postponeForm.matchdayId];
          return (
            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
              <div style={{background:'white',borderRadius:'16px',padding:'24px',maxWidth:'480px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
                <h3 style={{margin:'0 0 4px',color:'#c2410c'}}>⏳ Spieltag verlegen</h3>
                <p style={{margin:'0 0 16px',fontSize:'13px',color:'#666'}}>Terminvorschläge für die Eltern/Jugendlichen</p>
                <div style={{display:'grid',gap:'10px'}}>
                  <div>
                    <label style={s.label}>Grund der Verlegung (optional)</label>
                    <input value={postponeForm.reason} onChange={e=>setPostponeForm({...postponeForm,reason:e.target.value})}
                      placeholder="z.B. Hallenausfall" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <label style={s.label}>Terminvorschläge</label>
                  {postponeForm.options.map((opt,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <span style={{fontSize:'12px',color:'#6b7280',width:'20px',flexShrink:0}}>#{i+1}</span>
                      <input type="date" value={opt.date} onChange={e=>{const o=[...postponeForm.options];o[i]={...o[i],date:e.target.value};setPostponeForm({...postponeForm,options:o});}}
                        style={{...s.input,flex:1,boxSizing:'border-box'}}/>
                      <input type="time" value={opt.time} onChange={e=>{const o=[...postponeForm.options];o[i]={...o[i],time:e.target.value};setPostponeForm({...postponeForm,options:o});}}
                        style={{...s.input,flex:'none',width:'100px'}}/>
                      {postponeForm.options.length>1&&<button onClick={()=>setPostponeForm({...postponeForm,options:postponeForm.options.filter((_,j)=>j!==i)})}
                        style={{padding:'4px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><X size={14}/></button>}
                    </div>
                  ))}
                  {postponeForm.options.length<4&&(
                    <button onClick={()=>setPostponeForm({...postponeForm,options:[...postponeForm.options,{date:'',time:''}]})}
                      style={{...s.btn('#6b7280'),alignSelf:'flex-start',fontSize:'12px'}}>+ Weiterer Vorschlag</button>
                  )}
                  <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                    <button onClick={sendPostponement} style={{...s.btn('#f97316'),flex:1}}>📤 Abfrage senden</button>
                    <button onClick={()=>setPostponeForm(null)} style={{...s.btn('#6b7280'),flex:1}}>Abbrechen</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          {/* Team-Auswahl Tabs */}
          {myTeams.length>1&&(
            <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
              {myTeams.map(t=>(
                <button key={t.id} onClick={()=>{setMannTeamFilter(t.id);setShowMdForm(false);setEditingMd(null);}}
                  style={{padding:'10px 18px',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'14px',
                    background:(mannTeamFilter||myTeams[0]?.id)===t.id?'white':'rgba(255,255,255,0.2)',
                    color:(mannTeamFilter||myTeams[0]?.id)===t.id?'#0f766e':'white'}}>
                  ⚽ {t.name}
                </button>
              ))}
            </div>
          )}

          {myTeams.length===0&&(
            <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'40px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>
              {userRole==='admin'?'Noch keine Mannschaften angelegt. Bitte im Admin-Bereich anlegen.':'Du bist keiner Mannschaft als Trainer zugewiesen.'}
            </div>
          )}

          {activeTeam&&<>
            {/* Neuen Spieltag anlegen / bearbeiten */}
            <div style={{background:'white',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showMdForm?'16px':'0'}}>
                <h3 style={{margin:0,color:'#0f766e',display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'20px'}}>⚽</span>{activeTeam.name}</h3>
                <button onClick={()=>{if(!showMdForm){setMdForm({teamId:activeTeam.id,date:'',time:'',location:'',meetingPoint:'',meetingTime:'',isHome:true,opponent:''});setEditingMd(null);}setShowMdForm(v=>!v);}}
                  style={{...s.btn(showMdForm?'#6b7280':'#0f766e')}}>
                  {showMdForm?'✕ Abbrechen':'➕ Spieltag anlegen'}
                </button>
              </div>
              {showMdForm&&(
                <div style={{display:'grid',gap:'10px',gridTemplateColumns:'1fr 1fr',rowGap:'10px'}}>
                  <div>
                    <label style={s.label}>Datum *</label>
                    <input type="date" value={mdForm.date} onChange={e=>setMdForm({...mdForm,date:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Anstoß *</label>
                    <input type="time" value={mdForm.time} onChange={e=>setMdForm({...mdForm,time:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Gegner</label>
                    <input value={mdForm.opponent} onChange={e=>setMdForm({...mdForm,opponent:e.target.value})} placeholder="z.B. TTV Musterhausen" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Heim / Auswärts</label>
                    <div style={{display:'flex',gap:'8px'}}>
                      {[{v:true,l:'🏠 Heim'},{v:false,l:'🚌 Auswärts'}].map(({v,l})=>(
                        <button key={String(v)} type="button" onClick={()=>setMdForm({...mdForm,isHome:v})}
                          style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${mdForm.isHome===v?'#0f766e':'#e5e7eb'}`,background:mdForm.isHome===v?'#ccfbf1':'white',color:mdForm.isHome===v?'#0f766e':'#555',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Spielort</label>
                    <input value={mdForm.location} onChange={e=>setMdForm({...mdForm,location:e.target.value})} placeholder="Halle / Adresse" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Treffpunkt / Abfahrt</label>
                    <input value={mdForm.meetingPoint} onChange={e=>setMdForm({...mdForm,meetingPoint:e.target.value})} placeholder="z.B. Vereinsheim" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Abfahrtszeit</label>
                    <input type="time" value={mdForm.meetingTime} onChange={e=>setMdForm({...mdForm,meetingTime:e.target.value})} style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <button onClick={saveMatchday} style={{...s.btn('#0f766e'),width:'100%',justifyContent:'center'}}>
                      {editingMd?'💾 Spieltag speichern':'➕ Spieltag hinzufügen'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Kommende Spieltage */}
            <h3 style={{color:'white',margin:'0 0 12px',fontSize:'16px'}}>📅 Kommende Spieltage ({upcomingMds.length})</h3>
            {upcomingMds.length===0
              ? <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'10px',padding:'20px',textAlign:'center',color:'rgba(255,255,255,0.6)',marginBottom:'20px',fontSize:'13px'}}>Keine anstehenden Spieltage.</div>
              : upcomingMds.map(md=><MatchdayCard key={md.id} md={md} upcoming={true}/>)
            }

            {/* Vergangene Spieltage */}
            {pastMds.length>0&&<>
              <h3 style={{color:'white',margin:'20px 0 12px',fontSize:'16px'}}>📋 Vergangene Spieltage ({pastMds.length})</h3>
              {pastMds.map(md=><MatchdayCard key={md.id} md={md} upcoming={false}/>)}
            </>}
          </>}
        </div>
      </div>
    );
  }

  // ── ARCHIV VIEW ──────────────────────────────────────────────────────────
  // ── ÜBUNGSWETTKÄMPFE (Liste + Erstellen) ─────────────────────
  if (view === 'practiceTournaments') {
    const jugendSubs = Object.values(subgroups).filter(sg => sg.groupId === 'jugend');
    const allPTList = Object.values(practiceTournaments).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const maxPlayers = ptCreateForm.groupSize || 4;

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
        settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderCustom?ptCreateForm.deciderLength:ptCreateForm.setLength, trackSetScores:ptCreateForm.trackSetScores },
        players: seeded.map((p,i) => ({...p, seed:i+1})),
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
        })(),
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
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
            <button onClick={()=>navTo('home')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px'}}>🎮 Übungswettkämpfe</h2>
              <p style={{margin:0,color:'rgba(167,139,250,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{allPTList.length} laufend{allPTList.length!==1?'e':''}</p>
            </div>
            {!ptCreating && (<div style={{display:'flex',gap:'8px',flexShrink:0}}>
              <button onClick={()=>{setArchiveTab('practiceTournaments');navTo('archiv');}}
                style={{padding:'9px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',color:'rgba(255,255,255,0.55)',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}>
                <Archive size={14}/> Archiv
              </button>
              <button onClick={()=>{setPtCreating(true);setPtCreateStep(1);setPtSelectedChildren([]);setPtSubgroupFilter('all');setPtCreateForm({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false});}}
                style={{padding:'9px 16px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
                <Plus size={15}/> Neuer Wettkampf
              </button>
            </div>)}
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
                      style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${ptCreateForm.deciderCustom?'#fde68a':'rgba(255,255,255,0.2)'}`,background:ptCreateForm.deciderCustom?'rgba(253,230,138,0.2)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
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

          {/* ── Auto-Archivierung: abgeschlossene Wettkämpfe älter als 7 Tage ── */}
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
                    style={{padding:'14px 16px',background:allDone2?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.04)',border:`1px solid ${allDone2?'rgba(74,222,128,0.18)':'rgba(167,139,250,0.15)'}`,borderRadius:'16px',cursor:'pointer',transition:'all 0.12s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=allDone2?'rgba(74,222,128,0.09)':'rgba(167,139,250,0.08)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=allDone2?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.04)';}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'8px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'16px'}}>🎯</span>
                          <span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>{pt.players?pt.players.length+'er Gruppe':'4er Gruppe'}</span>
                          <span style={{fontSize:'10px',fontWeight:'700',color:allDone2?'#4ade80':'#fde68a',background:allDone2?'rgba(74,222,128,0.12)':'rgba(253,230,138,0.1)',padding:'2px 7px',borderRadius:'10px',border:`1px solid ${allDone2?'rgba(74,222,128,0.25)':'rgba(253,230,138,0.25)'}`}}>
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
                      <div style={{width:`${(done/total)*100}%`,height:'100%',background:allDone2?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#7c3aed,#a78bfa)',transition:'width 0.4s ease'}}/>
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
          })()}
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
    const numRoundsTotal = players.length % 2 === 0 ? players.length - 1 : players.length;
    const rounds = Array.from({length:numRoundsTotal}, (_, i) => i+1);

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
    const placeEmoji = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
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
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
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
              <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>
                Runde {round}
                {players.length % 2 === 1 && (() => {
                  const playersInRound = new Set(matches.filter(m=>m.round===round).flatMap(m=>[m.p1Idx,m.p2Idx]));
                  const bye = players.findIndex((_,i) => !playersInRound.has(i));
                  return bye >= 0 ? <span style={{fontSize:'10px',color:'rgba(251,191,36,0.5)',marginLeft:'8px',fontWeight:'600',textTransform:'none'}}>⏸ Freirunde: {players[bye]?.name}</span> : null;
                })()}
              </p>
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


  if (view === 'archiv') {
    const sortedArchivedSessions    = Object.values(archivedSessions).filter(s=>canAccessSession(s)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const sortedArchivedTournaments = Object.values(archivedTournaments).sort((a,b)=>(b.dateFrom||b.date||'').localeCompare(a.dateFrom||a.date||''));
    // Attendance status config
    const attCfg = {
      present:          { label:'Anwesend',     color:'#16a34a', bg:'#dcfce7', symbol:'✅' },
      absent_unexcused: { label:'Unentschuldigt',color:'#ef4444',bg:'#fee2e2', symbol:'–'  },
      absent_excused:   { label:'Entschuldigt', color:'#94a3b8', bg:'#f1f5f9', symbol:'⏰' },
    };

    return (
      <>
      {editingArchivedTourn && <ArchiveTournEditDialog tournament={editingArchivedTourn} onClose={()=>setEditingArchivedTourn(null)} onSave={saveArchivedTournEdit}/>}
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a3a2a 0%,#2d5a3d 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#358941')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📦 Archiv</h1>
        </div>

        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          {/* Tabs */}
          <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
            {[['sessions','🏋️ Archiv Training'],['tournaments','🏆 Archiv Turniere'],['practiceTournaments','🎮 Übungswettkämpfe']].map(([key,label])=>(
              <button key={key} onClick={()=>setArchiveTab(key)}
                style={{padding:'10px 20px',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'14px',
                  background:archiveTab===key?'white':'rgba(255,255,255,0.2)',
                  color:archiveTab===key?'#1a3a2a':'white'}}>
                {label}
              </button>
            ))}
          </div>

          {/* ── TRAINING TAB ── */}
          {archiveTab==='sessions' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {sortedArchivedSessions.length===0 && (
                <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>
                  Noch keine archivierten Trainingseinheiten.
                </div>
              )}
              {sortedArchivedSessions.map(session=>{
                const stats = getSessionAttendanceStats(session);
                const totalPresent = stats.reduce((s,st)=>s+st.present,0);
                const totalKids    = stats.reduce((s,st)=>s+st.total,0);
                const totalPct     = totalKids>0 ? Math.round((totalPresent/totalKids)*100) : 0;
                const isEditing    = editingArchivedSession === session.id;

                // All children for this session's subgroups
                const sessionKids  = (session.subgroupIds||[]).flatMap(sid=>getChildrenForSubgroup(sid));

                return (
                  <div key={session.id} style={{background:'white',borderRadius:'12px',boxShadow:'0 1px 4px rgba(0,0,0,0.12)'}}>
                    {/* ── Slim card (always visible) ── */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',flexWrap:'wrap'}}>
                      {/* Date */}
                      <div style={{minWidth:'160px'}}>
                        <div style={{fontWeight:'700',fontSize:'14px',color:'#1a3a2a'}}>
                          {session.date ? new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}) : '–'}
                        </div>
                        <div style={{fontSize:'12px',color:'#888'}}>{session.time||''} Uhr{session.trainer||session.trainerName ? ` · ${session.trainer||session.trainerName}` : ''}</div>
                      </div>
                      {/* Subgroup badges */}
                      <div style={{display:'flex',gap:'4px',flexWrap:'wrap',flex:1}}>
                        {(session.subgroupIds||[]).map(sid=>{
                          const sg=subgroups[sid];
                          return sg ? <span key={sid} style={{background:sg.color||'#ddd',color:'white',fontSize:'11px',padding:'2px 7px',borderRadius:'20px',fontWeight:'600'}}>{sg.name}</span> : null;
                        })}
                      </div>
                      {/* Attendance % */}
                      <div style={{textAlign:'right',minWidth:'70px'}}>
                        <span style={{fontSize:'15px',fontWeight:'700',color:totalPct>=75?'#16a34a':totalPct>=50?'#d97706':'#dc2626'}}>{totalPct}%</span>
                        <div style={{fontSize:'11px',color:'#888'}}>{totalPresent}/{totalKids} da</div>
                      </div>
                      {/* Buttons */}
                      <div style={{display:'flex',gap:'5px',flexShrink:0}}>
                        <button onClick={()=>restoreSession(session)}
                          style={{padding:'5px 10px',background:'#16a34a',color:'white',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>
                          ↩ Reaktivieren
                        </button>
                        <button onClick={()=>{
                          if (isEditing) { setEditingArchivedSession(null); return; }
                          const att = {};
                          sessionKids.forEach(c => { att[c.id] = (children[c.id]?.attendance||{})[session.date] || ''; });
                          setEditArchivedForm({ ...session, trainerName: session.trainerName||session.trainer||'', editAttendance: att });
                          setEditingArchivedSession(session.id);
                        }}
                          style={{padding:'5px 10px',background:isEditing?'#6b7280':'#3b82f6',color:'white',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
                          {isEditing ? '✕ Schließen' : '✏️ Bearbeiten'}
                        </button>
                        <button onClick={()=>deleteArchivedSession(session.id)}
                          style={{padding:'5px 10px',background:'#dc2626',color:'white',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* ── Edit form (expanded) ── */}
                    {isEditing && (
                      <div style={{borderTop:'1px solid #e5e7eb',padding:'16px',background:'#f8fafc'}}>
                        {/* Meta fields */}
                        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'16px'}}>
                          <div>
                            <label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'3px'}}>Trainer</label>
                            <input value={editArchivedForm.trainerName||''} onChange={e=>setEditArchivedForm(f=>({...f,trainerName:e.target.value}))}
                              style={{padding:'7px 10px',border:'1px solid #d1d5db',borderRadius:'7px',fontSize:'13px',width:'160px'}}/>
                          </div>
                          <div>
                            <label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'3px'}}>Uhrzeit</label>
                            <input type="time" value={editArchivedForm.time||''} onChange={e=>setEditArchivedForm(f=>({...f,time:e.target.value}))}
                              style={{padding:'7px 10px',border:'1px solid #d1d5db',borderRadius:'7px',fontSize:'13px'}}/>
                          </div>
                          <div style={{flex:1,minWidth:'180px'}}>
                            <label style={{fontSize:'12px',fontWeight:'600',color:'#374151',display:'block',marginBottom:'3px'}}>Notiz</label>
                            <input value={editArchivedForm.info||''} onChange={e=>setEditArchivedForm(f=>({...f,info:e.target.value}))}
                              style={{padding:'7px 10px',border:'1px solid #d1d5db',borderRadius:'7px',fontSize:'13px',width:'100%',boxSizing:'border-box'}}/>
                          </div>
                        </div>

                        {/* Per-child attendance */}
                        {sessionKids.length>0 && (
                          <div style={{marginBottom:'14px'}}>
                            <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Anwesenheit ({sessionKids.length} Kinder)</p>
                            <div style={{display:'grid',gap:'5px'}}>
                              {sessionKids.sort((a,b)=>a.name.localeCompare(b.name,'de')).map(child=>{
                                const cur = (editArchivedForm.editAttendance||{})[child.id] || '';
                                const sg  = subgroups[child.subgroupId];
                                return (
                                  <div key={child.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:'8px',background:'white',border:'1px solid #e5e7eb'}}>
                                    <div>
                                      <span style={{fontWeight:'600',fontSize:'13px',color:'#111'}}>{child.name}</span>
                                      {sg&&<span style={{fontSize:'11px',color:'#888',marginLeft:'5px'}}>{sg.name}</span>}
                                    </div>
                                    <div style={{display:'flex',gap:'5px'}}>
                                      {[
                                        {k:'present',         icon:'✅', title:'Anwesend',      active:'#16a34a', border:'#16a34a'},
                                        {k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#ef4444', border:'#fca5a5'},
                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#64748b', border:'#94a3b8'},
                                      ].map(({k,icon,title,active,border})=>(
                                        <button key={k} title={title}
                                          onClick={()=>setEditArchivedForm(f=>({...f,editAttendance:{...(f.editAttendance||{}),[child.id]:k}}))}
                                          style={{width:'34px',height:'34px',border:`2px solid ${cur===k?active:border}`,background:cur===k?active:'white',color:cur===k?'white':active,borderRadius:'6px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700'}}>
                                          {icon}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{display:'flex',gap:'8px'}}>
                          <button onClick={saveArchivedSessionEdit}
                            style={{padding:'9px 18px',background:'#1d4ed8',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'700'}}>
                            💾 Speichern
                          </button>
                          <button onClick={()=>setEditingArchivedSession(null)}
                            style={{padding:'9px 14px',background:'#e5e7eb',color:'#374151',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TURNIERE TAB ── */}
          {archiveTab==='tournaments' && (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {sortedArchivedTournaments.length===0 && (
                <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>
                  Noch keine archivierten Turniere.
                </div>
              )}
              {sortedArchivedTournaments.map(t=>{
                const dateStr = t.dateFrom && t.dateTo && t.dateFrom!==t.dateTo
                  ? `${new Date(t.dateFrom+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})} – ${new Date(t.dateTo+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`
                  : t.dateFrom ? new Date(t.dateFrom+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : 'Datum unbekannt';
                return (
                  <div key={t.id} style={{background:'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)',borderRadius:'14px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',border:'1px solid #fde68a'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'10px'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:'700',fontSize:'17px',color:'#92400e'}}>🏆 {t.name}</div>
                        <div style={{fontSize:'13px',color:'#78350f',marginTop:'2px'}}>📅 {dateStr}</div>
                        {t.location && <div style={{fontSize:'13px',color:'#78350f',marginTop:'2px'}}>📍 {t.location}</div>}
                      </div>
                      <div style={{display:'flex',gap:'6px',flexShrink:0,flexWrap:'wrap'}}>
                        <button onClick={()=>setEditingArchivedTourn(t)}
                          style={{padding:'6px 12px',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>
                          ✏️ Bearbeiten
                        </button>
                        <button onClick={()=>restoreTournament(t)}
                          style={{padding:'6px 12px',background:'#d97706',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>
                          ↩ Reaktivieren
                        </button>
                        <button onClick={()=>deleteArchivedTournament(t.id)}
                          style={{padding:'6px 12px',background:'#dc2626',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>
                          🗑️ Löschen
                        </button>
                      </div>
                    </div>

                    {/* Results per Konkurrenz */}
                    {t.konkurrenzen && t.konkurrenzen.length>0 && (
                      <div style={{borderTop:'1px solid #fde68a',paddingTop:'10px'}}>
                        <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'600',color:'#92400e',textTransform:'uppercase',letterSpacing:'0.5px'}}>Ergebnisse</p>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          {t.konkurrenzen.map(k=>{
                            const r = t.results && t.results[k.id];
                            const hasEinzel = r && (r.p1||r.p2||r.p3a||r.p3b);
                            const hasDoppel = r && (r.dp1||r.dp2||r.dp3a||r.dp3b);
                            const hasAny    = hasEinzel || hasDoppel;
                            return (
                              <div key={k.id} style={{background:'white',borderRadius:'10px',padding:'10px 14px',minWidth:'180px',border:'1px solid #fde68a'}}>
                                <div style={{fontWeight:'700',fontSize:'13px',color:'#92400e',marginBottom:'6px'}}>{k.name||'Konkurrenz'}</div>
                                {!hasAny
                                  ? <div style={{color:'#aaa',fontSize:'12px',fontStyle:'italic'}}>Kein Sieger in dieser Konkurrenz</div>
                                  : <div style={{display:'flex',flexDirection:'column',gap:'2px',fontSize:'12px'}}>
                                    {hasEinzel && <p style={{margin:'0 0 4px',fontSize:'11px',fontWeight:'700',color:'#b45309',textTransform:'uppercase'}}>Einzel</p>}
                                    {r.p1  && <div>🥇 {r.p1}</div>}
                                    {r.p2  && <div>🥈 {r.p2}</div>}
                                    {r.p3a && <div>🥉 {r.p3a}</div>}
                                    {r.p3b && <div>🥉 {r.p3b}</div>}
                                    {hasDoppel && <p style={{margin:'4px 0 4px',fontSize:'11px',fontWeight:'700',color:'#b45309',textTransform:'uppercase'}}>Doppel</p>}
                                    {r.dp1  && <div>🥇 {r.dp1}</div>}
                                    {r.dp2  && <div>🥈 {r.dp2}</div>}
                                    {r.dp3a && <div>🥉 {r.dp3a}</div>}
                                    {r.dp3b && <div>🥉 {r.dp3b}</div>}
                                  </div>
                                }
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ÜBUNGSWETTKÄMPFE TAB ── */}
          {archiveTab==='practiceTournaments' && (() => {
            const sortedPTs = Object.values(archivedPracticeTournaments).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));
            const placeEmoji = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            return (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {sortedPTs.length===0 && <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>Noch keine archivierten Übungswettkämpfe.</div>}
                {sortedPTs.map(pt=>{
                  const fs2 = pt.finalStandings||[];
                  const expanded = !!ptArchiveExpanded[pt.id];
                  const groupSize = pt.players ? pt.players.length : 4;
                  const dateStr = new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return (
                    <div key={pt.id} style={{background:'rgba(167,139,250,0.06)',borderRadius:'14px',border:'1px solid rgba(167,139,250,0.2)',overflow:'hidden'}}>
                      {/* Collapsed header — always visible */}
                      <div onClick={()=>setPtArchiveExpanded(prev=>({...prev,[pt.id]:!prev[pt.id]}))}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(167,139,250,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{fontSize:'13px',color:'rgba(167,139,250,0.5)',flexShrink:0,whiteSpace:'nowrap'}}>{dateStr}</span>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{groupSize}er</span>
                        <div style={{flex:1,display:'flex',gap:'5px',flexWrap:'wrap',overflow:'hidden',minWidth:0}}>
                          {fs2.map((s,i)=>(
                            <span key={s.childId} style={{fontSize:'12px',color:i===0?'#fde68a':i===1?'#e2e8f0':i===2?'#fdba74':'rgba(255,255,255,0.4)',fontWeight:i<3?'800':'600',whiteSpace:'nowrap'}}>
                              {i>0&&<span style={{color:'rgba(255,255,255,0.15)',margin:'0 2px'}}>·</span>}{s.name}
                            </span>
                          ))}
                        </div>
                        <span style={{fontSize:'18px',color:'rgba(167,139,250,0.5)',transform:expanded?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0,lineHeight:1}}>›</span>
                      </div>
                      {expanded && (
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
                                <span style={{fontSize:'18px',flexShrink:0}}>{placeEmoji[s.place-1]||`${s.place}.`}</span>
                                <div style={{flex:1}}>
                                  <p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p>
                                  <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N · Sätze {s.setsWon}:{s.setsLost}{pt.settings.trackSetScores?` · Punkte ${s.ptsWon}:${s.ptsLost}`:''}</p>
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
                                        <span style={{fontSize:'12px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.15)',minWidth:'30px',textAlign:'center',flexShrink:0}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
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
              </div>
            );
          })()}
        </div>
      </div>
      </>
    );
  }
}
