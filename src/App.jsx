import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Modal portal: renders children directly into document.body so position:fixed
// is always relative to the viewport, never affected by CSS transform stacking contexts.
const Modal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};
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
      from { opacity: 0; }
      to   { opacity: 1; }
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
    select.dark-select option { background: #1c1008; color: #fff; }
    select.dark-select { color-scheme: dark; }
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
import { getFirestore, doc, setDoc, updateDoc, deleteField, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore';
import { Check, X, Plus, Trash2, Download, LogOut, ArrowLeft, Clock, MoveRight, Shield, Users, Calendar, Info, RefreshCw, ChevronRight, Edit2, Save, Trophy, Home, Archive, MessageSquare, Bell, Send, Pencil } from 'lucide-react';

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
  aktiver:    { label: 'Aktiver',      color: '#0891b2', bg: '#cffafe' },
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

const RANK_TIERS = [
  { key:'top30',  label:'Top 30',  icon:'🎖️', maxRank:30 },
  { key:'top20',  label:'Top 20',  icon:'🎗️', maxRank:20 },
  { key:'top10',  label:'Top 10',  icon:'🏆', maxRank:10 },
  { key:'top5',   label:'Top 5',   icon:'⭐', maxRank:5  },
  { key:'platz3', label:'Platz 3', icon:'🥉', maxRank:3  },
  { key:'platz2', label:'Platz 2', icon:'🥈', maxRank:2  },
  { key:'platz1', label:'Platz 1', icon:'🥇', maxRank:1  },
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
    <Modal>
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}} onClick={onClose}>
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
    </Modal>
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
    <Modal>
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px',overflowY:'auto'}}>
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
    </Modal>
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
    <Modal>
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px',overflowY:'auto'}}>
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
    </Modal>
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

function RanglisteTile({ rangliste, myChildId, children: childMap, subgroups, alwaysOpen=false }) {
  const [open, setOpen] = useState(false);
  const myPos = rangliste.indexOf(myChildId);
  if (myPos === -1) return null;
  const medal = myPos===0?'🥇':myPos===1?'🥈':myPos===2?'🥉':null;
  const showList = alwaysOpen || open;
  return (
    <div style={{marginBottom:'12px'}}>
      <div onClick={alwaysOpen ? undefined : ()=>setOpen(o=>!o)}
        style={{background:'linear-gradient(135deg,rgba(252,211,77,0.12) 0%,rgba(217,119,6,0.08) 100%)',border:'1px solid rgba(252,211,77,0.25)',borderRadius:showList?'16px 16px 0 0':'16px',padding:'14px 18px',display:'flex',alignItems:'center',gap:'12px',cursor:alwaysOpen?'default':'pointer',userSelect:'none'}}>
        <div style={{width:'44px',height:'44px',borderRadius:'50%',background:myPos===0?'rgba(251,191,36,0.25)':myPos===1?'rgba(209,213,219,0.25)':myPos===2?'rgba(217,119,6,0.25)':'rgba(252,211,77,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:medal?'24px':'18px',fontWeight:'900',color:'#fcd34d'}}>
          {medal || `#${myPos+1}`}
        </div>
        <div style={{flex:1}}>
          <p style={{margin:'0 0 2px',fontWeight:'800',color:'white',fontSize:'15px'}}>📊 TTC Rangliste</p>
          <p style={{margin:0,color:'rgba(252,211,77,0.8)',fontSize:'13px',fontWeight:'600'}}>
            {medal?`${medal} Platz ${myPos+1} von ${rangliste.length}`:`Platz ${myPos+1} von ${rangliste.length}`}
          </p>
        </div>
        {!alwaysOpen && <span style={{color:'rgba(252,211,77,0.6)',fontSize:'18px',display:'inline-block',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>}
      </div>
      {showList && (
        <div style={{background:'rgba(0,0,0,0.25)',border:'1px solid rgba(252,211,77,0.18)',borderTop:'none',borderRadius:'0 0 16px 16px',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {rangliste.map((childId, idx) => {
            const child = childMap[childId];
            if (!child) return null;
            const isMe = childId === myChildId;
            const m = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':null;
            return (
              <div key={childId} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'10px',background:isMe?'rgba(252,211,77,0.12)':'rgba(255,255,255,0.03)',border:`1px solid ${isMe?'rgba(252,211,77,0.35)':'rgba(255,255,255,0.05)'}`,boxShadow:isMe?'0 0 0 2px rgba(252,211,77,0.2)':'none'}}>
                <div style={{width:'30px',height:'30px',borderRadius:'50%',background:idx===0?'#fbbf24':idx===1?'rgba(209,213,219,0.3)':idx===2?'rgba(217,119,6,0.4)':'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:'900',fontSize:m?'16px':'13px',color:'white'}}>
                  {m||(idx+1)}
                </div>
                <p style={{margin:0,fontWeight:isMe?'800':'600',color:isMe?'#fcd34d':'rgba(255,255,255,0.85)',fontSize:'14px',flex:1}}>
                  {child.name}
                  {isMe&&<span style={{fontSize:'10px',fontWeight:'800',color:'#fcd34d',marginLeft:'8px',background:'rgba(252,211,77,0.15)',padding:'1px 6px',borderRadius:'8px',border:'1px solid rgba(252,211,77,0.3)'}}>Du</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RlAchPanel({ rangliste, ranglisteAch, children: childMap, kidsWithSub, saveRanglisteAch, rlAchEditChild, setRlAchEditChild }) {
  const [open, setOpen] = useState(false);
  const editKid = rlAchEditChild ? (childMap[rlAchEditChild] || null) : null;
  const getAch = (childId) => ranglisteAch[childId] || { reached: {}, weeks: {} };
  const editAch = rlAchEditChild ? getAch(rlAchEditChild) : null;

  const setWeekCount = (childId, key, val) => {
    const prev = ranglisteAch[childId] || {};
    const weeks = { ...(prev.weeks||{}) };
    weeks[key] = { ...(weeks[key]||{ count:0, frozen:false }), count: Math.max(0, val) };
    saveRanglisteAch({ ...ranglisteAch, [childId]: { ...prev, weeks } });
  };
  const toggleFrozen = (childId, key) => {
    const prev = ranglisteAch[childId] || {};
    const weeks = { ...(prev.weeks||{}) };
    weeks[key] = { ...(weeks[key]||{ count:0, frozen:false }), frozen: !(weeks[key]?.frozen) };
    saveRanglisteAch({ ...ranglisteAch, [childId]: { ...prev, weeks } });
  };
  const toggleReached = (childId, key) => {
    const prev = ranglisteAch[childId] || {};
    const reached = { ...(prev.reached||{}) };
    if (reached[key]) delete reached[key]; else reached[key] = new Date().toISOString().slice(0,10);
    saveRanglisteAch({ ...ranglisteAch, [childId]: { ...prev, reached } });
  };

  return (
    <div style={{background:'white',borderRadius:'14px',marginBottom:'20px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:'20px'}}>⚙️</span>
        <div style={{flex:1}}>
          <p style={{margin:0,fontWeight:'800',color:'#1f2937',fontSize:'14px'}}>Ranglisten-Errungenschaften verwalten</p>
          <p style={{margin:0,fontSize:'12px',color:'#6b7280'}}>Manuelle Anpassung der automatisch gezählten Ranglisten-Errungenschaften</p>
        </div>
        <span style={{fontSize:'18px',color:'#9ca3af',display:'inline-block',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
      </button>
      {open && (
        <div style={{padding:'0 16px 16px',borderTop:'1px solid #f3f4f6'}}>
          <p style={{margin:'12px 0 6px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>Kind auswählen</p>
          <select value={rlAchEditChild} onChange={e=>setRlAchEditChild(e.target.value)}
            style={{width:'100%',padding:'9px 12px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'14px',color:'#1f2937',background:'white',marginBottom:'14px'}}>
            <option value="">Kind wählen…</option>
            {kidsWithSub.filter(c=>rangliste.includes(c.id)).map(c=>{
              const rank = rangliste.indexOf(c.id)+1;
              return <option key={c.id} value={c.id}>#{rank} {c.name}</option>;
            })}
          </select>
          {editKid && editAch && (
            <>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px',padding:'10px 12px',background:'#f9fafb',borderRadius:'10px',border:'1px solid #e5e7eb'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px'}}>{editKid.name[0]}</div>
                <div>
                  <p style={{margin:0,fontWeight:'800',color:'#1f2937',fontSize:'14px'}}>{editKid.name}</p>
                  <p style={{margin:0,fontSize:'12px',color:'#6b7280'}}>Rang #{rangliste.indexOf(editKid.id)+1} von {rangliste.length}</p>
                </div>
              </div>
              <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>🏁 Erstmals erreicht</p>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px'}}>
                {RANK_TIERS.map(t=>{
                  const has = !!editAch.reached?.[t.key];
                  return (
                    <button key={t.key} onClick={()=>toggleReached(editKid.id, t.key)}
                      title={has ? `Entfernen (erreicht am ${editAch.reached[t.key]})` : 'Als erreicht markieren'}
                      style={{padding:'5px 10px',borderRadius:'8px',border:`2px solid ${has?'#7c3aed':'#e5e7eb'}`,background:has?'rgba(124,58,237,0.1)':'#f9fafb',color:has?'#7c3aed':'#9ca3af',fontWeight:'700',fontSize:'12px',cursor:'pointer'}}>
                      {t.icon} {t.label}
                    </button>
                  );
                })}
              </div>
              <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'700',color:'#374151',textTransform:'uppercase',letterSpacing:'0.4px'}}>📅 Wochen-Counter</p>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {RANK_TIERS.map(t=>{
                  const w = editAch.weeks?.[t.key] || { count: 0, frozen: false };
                  return (
                    <div key={t.key} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',borderRadius:'8px',background:'#f9fafb',border:'1px solid #e5e7eb'}}>
                      <span style={{fontSize:'16px',flexShrink:0}}>{t.icon}</span>
                      <span style={{fontSize:'13px',fontWeight:'700',color:'#374151',flex:1}}>{t.label}</span>
                      <button onClick={()=>setWeekCount(editKid.id, t.key, w.count-1)} style={{width:'26px',height:'26px',border:'1px solid #d1d5db',borderRadius:'6px',background:'#f3f4f6',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                      <span style={{minWidth:'28px',textAlign:'center',fontWeight:'800',fontSize:'15px',color:'#111'}}>{w.count}</span>
                      <button onClick={()=>setWeekCount(editKid.id, t.key, w.count+1)} style={{width:'26px',height:'26px',border:'1px solid #d1d5db',borderRadius:'6px',background:'#f0fdf4',cursor:'pointer',fontWeight:'700',fontSize:'14px',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      <button onClick={()=>toggleFrozen(editKid.id, t.key)}
                        title={w.frozen ? 'Eingefroren – Klick für Auto' : 'Automatisch – Klick zum Einfrieren'}
                        style={{padding:'4px 8px',borderRadius:'6px',border:`1px solid ${w.frozen?'#fca5a5':'#86efac'}`,background:w.frozen?'#fee2e2':'#f0fdf4',color:w.frozen?'#dc2626':'#16a34a',cursor:'pointer',fontSize:'11px',fontWeight:'700',flexShrink:0,whiteSpace:'nowrap'}}>
                        {w.frozen?'❄️ Eingefroren':'▶ Auto'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
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
  const allUsersRef = useRef({});
  const [sessions, setSessions]       = useState({});
  const [tournaments, setTournaments] = useState({});

  const [view, setView]                     = useState('home');
  const [viewKey, setViewKey]               = useState(0);
  const [isMobile, setIsMobile]             = useState(typeof window !== 'undefined' && window.innerWidth <= 600);
  const [activeGroup, setActiveGroup]       = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [activeChild, setActiveChild]       = useState(null);
  const [activeChildId, setActiveChildId]   = useState(null); // for parent with multiple children
  const [activeSession, setActiveSession]   = useState(null);

  const [trainingDate, setTrainingDate]         = useState(new Date().toISOString().split('T')[0]);
  const [newSubgroupName, setNewSubgroupName]   = useState('');
  const [newChildName, setNewChildName]         = useState('');
  const [moveChildId, setMoveChildId]           = useState(null);
  const [newSession, setNewSession]             = useState(emptySession);
  const [recurringTemplates, setRecurringTemplates] = useState({});
  const [rangliste, setRangliste] = useState([]); // ordered array of childIds
  const [ranglistenspiele, setRanglistenspiele] = useState({ active: [], archived: [] });
  const [newSpielForm, setNewSpielForm] = useState({ open: false, challengerId: '', defenderId: '' });
  const [rangSelectionMode, setRangSelectionMode] = useState(false);
  const [rangSelection, setRangSelection] = useState([]);
  const [rangAddOpen, setRangAddOpen] = useState(false);
  const [ranglisteAch, setRanglisteAch] = useState({}); // { [childId]: { reached:{}, weeks:{}, lastCheck, lastRank } }
  const [rlAchEditChild, setRlAchEditChild] = useState(''); // trainer override: selected child
  const [achExpandedChild, setAchExpandedChild] = useState(null);
  const [karriereConfirmChild, setKarriereConfirmChild] = useState(null);
  const [achSearch, setAchSearch] = useState('');
  const [trikotDaten, setTrikotDaten] = useState({});
  const [trikotFilter, setTrikotFilter] = useState('alle');
  const [trikotSearch, setTrikotSearch] = useState('');
  const [trikotExpanded, setTrikotExpanded] = useState(null);
  const [editingSession, setEditingSession]     = useState(null); // session being edited
  const [editForm, setEditForm]                 = useState({});
  const [deleteDialog, setDeleteDialog]         = useState(null);
  const [resetDialog, setResetDialog]           = useState(false);
  const [resetPassword, setResetPassword]       = useState('');
  const [resetError, setResetError]             = useState('');
  const [expandedUser, setExpandedUser]                 = useState(null);
  const [dangerSelected, setDangerSelected]             = useState('');
  const [showProfile, setShowProfile]           = useState(false);
  const [pwCurrent, setPwCurrent]               = useState('');
  const [pwNew, setPwNew]                       = useState('');
  const [pwConfirm, setPwConfirm]               = useState('');
  const [pwError, setPwError]                   = useState('');
  const [pwSuccess, setPwSuccess]               = useState(false); // {sessionId, repeatId, blockSize}
  const [adminRoleDialog, setAdminRoleDialog]   = useState(null); // { uid, newRoles } | null
  const [pendingRoleSelections, setPendingRoleSelections] = useState({}); // { [uid]: roles[] } — local only until Freischalten
  const [pendingSpecialAccess, setPendingSpecialAccess] = useState({});
  const [adminUsersListOpen, setAdminUsersListOpen] = useState(false); // { [uid]: {rompel,pfand,pinnwand}[] }
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
  const [notificationsLoaded, setNotificationsLoaded]       = useState(false);
  const notificationsRef = React.useRef({});  // immer aktueller Wert ohne Dep-Trigger
  const [teams, setTeams]                                   = useState({});
  const [appSettings, setAppSettings]                       = useState({});
  const [leagueData, setLeagueData]                         = useState({ table: null, schedule: null, fetchedAt: null });
  const [leagueFetching, setLeagueFetching]                 = useState(false);
  const [notifComposeTarget, setNotifComposeTarget]         = useState('all'); // 'all' | subgroupId | childId
  const [notifComposeText, setNotifComposeText]             = useState('');
  const [notifComposeTitle, setNotifComposeTitle]           = useState('');
  const [notifTab, setNotifTab]                             = useState('inbox'); // 'inbox' | 'trash'
  const [notifTrainerTab, setNotifTrainerTab]               = useState('sent'); // 'sent' | 'trash' | 'inbox'
  const [showTrainingHistory, setShowTrainingHistory]       = useState(false);
  const [showMyTeam, setShowMyTeam]                         = useState(false);
  const [showAchievements, setShowAchievements]             = useState(false);
  const [editingChildName, setEditingChildName]             = useState(null); // childId being renamed
  const [editingChildNameVal, setEditingChildNameVal]       = useState('');
  const [stayLoggedIn, setStayLoggedIn]                     = useState(false);
  const [showLoginPassword, setShowLoginPassword]            = useState(false);
  const [registerIsParent, setRegisterIsParent]             = useState(false);
  // Mannschaft form states
  const [teamForm, setTeamForm]                             = useState({name:'', liga:'', tableUrl:'', scheduleUrl:'', trainerUids:[], childIds:[]});
  const [editingTeam, setEditingTeam]                       = useState(null);
  const [addingTeam, setAddingTeam]                         = useState(false);
  const [teamExpanded, setTeamExpanded]                     = useState({});
  const [teamFetching, setTeamFetching]                     = useState({});
  // Practice Tournaments
  const [practiceTournaments, setPracticeTournaments]               = useState({});
  const [archivedPracticeTournaments, setArchivedPracticeTournaments] = useState({});
  const [gegnerLogbuch, setGegnerLogbuch] = useState([]);
  const [materialverwaltung, setMaterialverwaltung] = useState({});
  const [materialEdit, setMaterialEdit] = useState(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialExpanded, setMaterialExpanded] = useState(null);
  const [ttrHistory, setTtrHistory] = useState({});
  const [ttrImportState, setTtrImportState] = useState(null); // {matches:[],raw:{}}
  const [ttrImportDone, setTtrImportDone] = useState(false);
  const [ttrVerlaufChild, setTtrVerlaufChild] = useState(null);
  const [ttrManChild, setTtrManChild] = useState('');
  const [ttrManMonth, setTtrManMonth] = useState(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});
  const [ttrManTtr, setTtrManTtr] = useState('');
  const [ttrManSaved, setTtrManSaved] = useState(false);
  const [ttrFilter, setTtrFilter] = useState('all');
  const [rompelData, setRompelData] = useState({hours:[], expenses:[]});
  const [aktiveSpieler, setAktiveSpieler] = useState({});
  const [aktiverForm, setAktiverForm] = useState({name:'', ttr:'', spielernr:''});
  const [rompelHoursForm, setRompelHoursForm] = useState({date:new Date().toISOString().split('T')[0], hours:'', desc:''});
  const [rompelExpForm, setRompelExpForm] = useState({date:new Date().toISOString().split('T')[0], amount:'', desc:''});
  const [pfandDaten, setPfandDaten] = useState({entries:[]});
  const [pfandForm, setPfandForm] = useState({type:'einnahme', date:TODAY, amount:'', desc:''});
  const [pfandEditId, setPfandEditId] = useState(null);
  const [elternSubView, setElternSubView] = useState(null);
  const [ttcNews, setTtcNews] = useState([]);
  const [ttcNewsLoading, setTtcNewsLoading] = useState(false);
  const [gegnerForm, setGegnerForm] = useState({date:'', verein:'', gegner:'', taktik:''});
  const [gegnerAdding, setGegnerAdding] = useState(false);
  const [gegnerEditId, setGegnerEditId] = useState(null);
  const [gegnerWeitereId, setGegnerWeitereId] = useState(null);
  const [gegnerWeitereText, setGegnerWeitereText] = useState('');
  const [gegnerSearchPlayer, setGegnerSearchPlayer] = useState('');
  const [gegnerSearchVerein, setGegnerSearchVerein] = useState('');
  const [gegnerExpandedId, setGegnerExpandedId] = useState(null);
  const [trainingsmatches, setTrainingsmatches] = useState([]);
  const [tmSort, setTmSort] = useState('winrate');
  const [tmAdding, setTmAdding] = useState(false);
  const [tmEditId, setTmEditId] = useState(null);
  const [tmSearch, setTmSearch] = useState('');
  const [tmSearchFocus, setTmSearchFocus] = useState(false);
  const [tmSearch2, setTmSearch2] = useState('');
  const [tmSearchFocus2, setTmSearchFocus2] = useState(false);
  const [tmForm, setTmForm] = useState({opponent:'',opponentCustom:'',useCustom:false,player1:'',result:'3:0',vorgabe:false,vorgabePlayer:'',vorgabePoints:1,date:'',otherMatch:false});
  const [tmMode, setTmMode] = useState(null); // null=Auswahl, 'single', 'double'
  const [wettenZitate, setWettenZitate] = useState([]);
  const [wzAdding, setWzAdding] = useState(false);
  const [wzEditId, setWzEditId] = useState(null);
  const [wzForm, setWzForm] = useState({type:'zitat',text:'',date:'',dueDate:'',options:['','']});
  const [wzEditText, setWzEditText] = useState('');
  const [wzSearch, setWzSearch] = useState('');
  const [wzFilter, setWzFilter] = useState('alle');
  const [wzAddOptionsId, setWzAddOptionsId] = useState(null);
  const [wzAddOptions, setWzAddOptions] = useState(['','']);
  const [wzExpandedBets, setWzExpandedBets] = useState(new Set());
  const [trainingsdoppel, setTrainingsdoppel] = useState([]);
  const [tmDoppelAdding, setTmDoppelAdding] = useState(false);
  const [tmDoppelEditId, setTmDoppelEditId] = useState(null);
  const [tmDoppelSort, setTmDoppelSort] = useState('winrate');
  const [tmDoppelForm, setTmDoppelForm] = useState({playerA:'',playerB:'',playerC:'',playerD:'',result:'3:0',date:''});
  const [activePracticeId, setActivePracticeId]                     = useState(null);
  const [ptCreating, setPtCreating]                                 = useState(false);
  const [ptCreateStep, setPtCreateStep]                             = useState(1);
  const [ptCreateForm, setPtCreateForm]                             = useState({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false,handicap:false,handicapPerTTR:60,handicapMax:6,doubleElim:false,teamSize:2,teamSystem:'kingsCup'});
  const [ptTeamOrderA, setPtTeamOrderA]                             = useState([]);
  const [ptTeamOrderB, setPtTeamOrderB]                             = useState([]);
  const [ptTeamNameA, setPtTeamNameA]                               = useState('Mannschaft A');
  const [ptTeamNameB, setPtTeamNameB]                               = useState('Mannschaft B');
  const [ptSelectedChildren, setPtSelectedChildren]                 = useState([]);
  const [ptSubgroupFilter, setPtSubgroupFilter]                     = useState('all');
  const [ptSelectedAktive, setPtSelectedAktive]                     = useState([]);
  const [ptManualPlayers, setPtManualPlayers]                       = useState([]);
  const [ptPlayerSearch, setPtPlayerSearch]                         = useState('');
  const [ptManualForm, setPtManualForm]                             = useState({name:'',verein:''});
  const [ptShowManualForm, setPtShowManualForm]                     = useState(false);
  const [sdmCustomOpen, setSdmCustomOpen]                           = useState(false);
  const [sdmCustomStart, setSdmCustomStart]                         = useState('');
  const [sdmCustomEnd, setSdmCustomEnd]                             = useState('');
  const [ptMatchEditing, setPtMatchEditing]                         = useState(null);
  const [ptMatchDraft, setPtMatchDraft]                             = useState(null);
  const [ptArchiveExpanded, setPtArchiveExpanded]                     = useState({});
  const [ptDetailModal, setPtDetailModal]                           = useState(null);
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
          const profile = { ...data, uid: u.uid, roles };
          setUserProfile(profile);
          const selectableRoles = roles.filter(r => r !== 'pending');
          if (selectableRoles.length > 1) {
            setUserRole(selectableRoles[0]);
            setShowRolePicker(true);
          } else {
            setUserRole(roles[0]);
          }
          // Admin in ttc/users eintragen falls noch nicht vorhanden
          if (roles.includes('admin')) {
            const ttcSnap = await getDoc(doc(db,'ttc','users'));
            const ttcUsers = ttcSnap.exists() ? ttcSnap.data() : {};
            if (!ttcUsers[u.uid]) {
              await setDoc(doc(db,'ttc','users'), {...ttcUsers, [u.uid]: profile});
            }
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
      onSnapshot(doc(db,'ttc','notifications'),      s => { setNotifications(s.exists()?s.data():{}); setNotificationsLoaded(true); }),
      onSnapshot(doc(db,'ttc','teams'),              s => setTeams(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','appSettings'),        s => setAppSettings(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','rompel'),             s => setRompelData(s.exists()?s.data():{hours:[],expenses:[]})),
      onSnapshot(doc(db,'ttc','pfandkasse'),          s => setPfandDaten(s.exists()?s.data():{entries:[]})),
      onSnapshot(doc(db,'ttc','aktiveSpieler'),      s => setAktiveSpieler(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','leagueData'),         s => setLeagueData(s.exists()?s.data():{ table: null, schedule: null, fetchedAt: null })),
      onSnapshot(doc(db,'ttc','rangliste'), s => setRangliste(s.exists()&&s.data().entries ? s.data().entries : [])),
      onSnapshot(doc(db,'ttc','ranglistenspiele'), s => setRanglistenspiele(s.exists() ? { active: s.data().active||[], archived: s.data().archived||[] } : { active:[], archived:[] })),
      onSnapshot(doc(db,'ttc','ranglisteAchievements'), s => setRanglisteAch(s.exists() ? s.data() : {})),
      onSnapshot(doc(db,'ttc','practiceTournaments'),          s => setPracticeTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedPracticeTournaments'),  s => setArchivedPracticeTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','gegnerLogbuch'), s => setGegnerLogbuch(s.exists()&&Array.isArray(s.data().entries)?s.data().entries:[])),
      onSnapshot(doc(db,'ttc','materialverwaltung'), s => setMaterialverwaltung(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','ttrHistory'), s => setTtrHistory(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','trainingsmatches'), s => setTrainingsmatches(s.exists()&&Array.isArray(s.data().matches)?s.data().matches:[])),
      onSnapshot(doc(db,'ttc','trainingsdoppel'), s => setTrainingsdoppel(s.exists()&&Array.isArray(s.data().matches)?s.data().matches:[])),
      onSnapshot(doc(db,'ttc','wettenZitate'), s => setWettenZitate(s.exists()&&Array.isArray(s.data().entries)?s.data().entries:[])),
      onSnapshot(doc(db,'ttc','trikotDaten'), s => setTrikotDaten(s.exists()?s.data():{})),
    ];
    // Fetch TTC News via rss2json
    fetchTtcNews();
    if (['admin','aktiver'].includes(userRole))
      unsubs.push(onSnapshot(doc(db,'ttc','users'), s => { const d=s.exists()?s.data():{};allUsersRef.current=d;setAllUsers(d); }));
    return () => unsubs.forEach(u=>u());
  }, [user, userRole]);

  // ── Weekly Rangliste Achievement check (runs when rangliste or achievements load) ──
  useEffect(() => {
    if (rangliste.length === 0) return;
    runWeeklyRankCheck(rangliste, ranglisteAch);
  }, [view === 'achievements']); // trigger when trainer opens achievements view

  // ── Initial rank achievement seeding (run once when data is ready) ──
  useEffect(() => {
    if (rangliste.length === 0 || Object.keys(ranglisteAch).length > 0) return;
    // First time: seed reached milestones for all current positions
    const today = new Date().toISOString().slice(0,10);
    const ach = {};
    rangliste.forEach((childId, idx) => {
      const rank = idx + 1;
      const reached = {};
      const weeks = {};
      RANK_TIERS.forEach(({ key, maxRank }) => {
        if (rank <= maxRank) reached[key] = today;
        weeks[key] = { count: 0, frozen: false };
      });
      ach[childId] = { reached, weeks, lastCheck: today, lastRank: rank };
    });
    saveRanglisteAch(ach);
  }, [rangliste.length > 0 && Object.keys(ranglisteAch).length === 0]);

  // ── Auto: TTR-Errungenschaften aus TTR-Verlauf ableiten ──────────────
  // Schaltet TTR-Meilensteine automatisch frei basierend auf dem persönlichen
  // HÖCHSTWERT über die gesamte Historie. Einmal erreicht bleibt der Meilenstein
  // bestehen, auch wenn der TTR-Wert später wieder fällt.
  useEffect(() => {
    if (!ttrHistory || Object.keys(ttrHistory).length === 0) return;
    if (!children || Object.keys(children).length === 0) return;
    const updated = { ...children };
    let changed = false;
    const newNotifs = {}; // id -> notif (für Meilensteine nach der Erst-Synchronisierung)
    Object.entries(ttrHistory).forEach(([childId, data]) => {
      const child = updated[childId];
      if (!child) return;
      const entries = (data && data.entries) || [];
      if (entries.length === 0) return;
      const personalMax = Math.max(...entries.map(e => Number(e.ttr) || 0));
      const ach = child.achievements || {};
      const prevUnlocked = ach.ttrUnlocked || [];
      const isFirstSeed = ach.ttrAutoMax === undefined; // erstmaliges Ableiten → still
      const earned = TTR_MILESTONES.filter(m => m <= personalMax);
      const union = [...new Set([...prevUnlocked, ...earned])].sort((a, b) => a - b);
      const unlockedChanged = union.length !== prevUnlocked.length;
      const autoMaxChanged = (ach.ttrAutoMax || 0) !== personalMax;
      if (!unlockedChanged && !autoMaxChanged) return;
      updated[childId] = { ...child, achievements: { ...ach, ttrUnlocked: union, ttrAutoMax: personalMax } };
      changed = true;
      // Benachrichtigung nur für echte neue Meilensteine (nicht beim Erst-Seed)
      if (!isFirstSeed) {
        const newOnes = earned.filter(m => !prevUnlocked.includes(m));
        newOnes.forEach(val => {
          const key = `ttr_auto_${childId}_${val}`;
          if (Object.values(notifications).some(n => n.key === key)) return;
          const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          newNotifs[id] = { id, childId, type: 'achievement', title: '🏓 TTR-Meilenstein erreicht!',
            message: `Glückwunsch ${child.name}! Du hast einen TTR-Wert von ${val} erreicht. ${ACHIEVEMENT_DESCRIPTIONS.ttr(val)}`,
            createdAt: new Date().toISOString(), trashedAt: null, key, batchId: null, trainerTrashedAt: {}, trainerDeletedBy: {} };
        });
      }
    });
    if (changed) {
      setChildren(updated);
      setDoc(doc(db, 'ttc', 'children'), updated);
      if (Object.keys(newNotifs).length > 0) saveNotifications({ ...notifications, ...newNotifs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttrHistory, children]);

  // Ref immer aktuell halten — ohne Auto-Notification-Effect neu auszulösen
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // ── Auto-Notifications ──────────────────────────────────────
  // WICHTIG: notifications ist bewusst NICHT in deps — der Effect soll nur bei
  // Datenänderungen (Sessions/Turniere/Kinder) laufen, NICHT wenn ein Nutzer
  // eine Nachricht löscht (sonst wird sie sofort neu erstellt).
  // Den aktuellen Notification-Stand lesen wir über notificationsRef.
  useEffect(() => {
    if (!notificationsLoaded) return; // warten bis Notifications aus Firestore geladen sind
    if (Object.keys(children).length === 0) return;
    const currentNotifs = notificationsRef.current;
    if (Object.keys(currentNotifs).length === 0 && Object.keys(sessions).length === 0 && Object.keys(tournaments).length === 0) return;
    const now = new Date();
    const updatedNotifs = { ...currentNotifs };
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

    // Helper: create if not exists (dedup by key).
    // Prüft bewusst OHNE !n.trashedAt — eine manuell gelöschte Auto-Nachricht
    // soll nicht neu erstellt werden, auch wenn sie getrasht wurde.
    const maybeCreate = (childId, type, title, message, key) => {
      const exists = Object.values(updatedNotifs).some(n => n.key === key);
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
  }, [sessions, tournaments, children, archivedSessions, notificationsLoaded]);
  // ↑ notifications selbst NICHT in deps — nur das einmalige "loaded"-Flag

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
  const sanitizeTeams = (u) => {
    const sanitizeRows = (rows) => (rows||[]).map(r => Array.isArray(r) ? {c:r} : r);
    return Object.fromEntries(Object.entries(u).map(([id,t]) => {
      if (!t.leagueData) return [id,t];
      const ld = t.leagueData;
      return [id, {...t, leagueData: {
        ...ld,
        table:    ld.table    ? {...ld.table,    rows: sanitizeRows(ld.table.rows)}    : ld.table,
        schedule: ld.schedule ? {...ld.schedule, rows: sanitizeRows(ld.schedule.rows)} : ld.schedule,
      }}];
    }));
  };
  const saveTeams = u => { const s=sanitizeTeams(u); setTeams(s); setDoc(doc(db,'ttc','teams'), s).catch(e=>console.error('saveTeams failed:',e)); };
  const saveAppSettings                  = u => { setAppSettings(u);                  setDoc(doc(db,'ttc','appSettings'),                  u); };
  const saveRompelData                   = u => { setRompelData(u);                   setDoc(doc(db,'ttc','rompel'),                        u); };
  const savePfandDaten                   = u => { setPfandDaten(u);                   setDoc(doc(db,'ttc','pfandkasse'),                    u); };
  const saveAktiveSpieler                = d => { setAktiveSpieler(d);               setDoc(doc(db,'ttc','aktiveSpieler'),                  d); };
  const canAccessRompel    = () => userRole === 'admin' || (appSettings.rompelTrainers  || []).includes(user?.uid);
  const canAccessPfand     = () => userRole === 'admin' || (appSettings.pfandTrainers   || []).includes(user?.uid);
  const canAccessPinnwand  = () => userRole === 'admin' || (appSettings.pinnwandUsers   || []).includes(user?.uid);
  const linkPlayerToUser = async (uid, spielerId) => {
    const cur = allUsersRef.current;
    const profile = cur[uid]||{};
    const updatedProfile = {...profile, linkedPlayerId: spielerId||null};
    const updated = {...cur, [uid]: updatedProfile};
    allUsersRef.current = updated;
    setAllUsers(updated);
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users',uid), updatedProfile);
  };
  const saveLeagueData                   = u => { setLeagueData(u);                   setDoc(doc(db,'ttc','leagueData'),                   u); };

  // ── Liga-Daten via eigene Vercel Serverless Function laden ──────────────
  const fetchLeagueData = async () => {
    const tableUrl    = appSettings.leagueTableUrl?.trim();
    const scheduleUrl = appSettings.leagueScheduleUrl?.trim();
    if (!tableUrl && !scheduleUrl) { alert('Bitte erst URLs in den Einstellungen eintragen.'); return; }
    setLeagueFetching(true);

    // Extrahiere Association + GroupId aus einer click-tt URL
    const parseClickTTUrl = (url) => {
      const m = url.match(/click-tt\/([^/]+)\/[^/]+\/ligen\/[^/]+\/gruppe\/(\d+)/);
      return m ? { assoc: m[1], groupId: m[2] } : null;
    };

    try {
      let table = null, schedule = null;

      const fmtDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' })
          + ', ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }) + ' Uhr';
      };
      const buildSchedule = (meetings) => ({
        headers: ['Datum', 'Heim', 'Gast', 'Ergebnis'],
        rows: meetings.map(m => ({ c: [
          fmtDate(m.date),
          m.team_home ?? '',
          m.team_away ?? '',
          m.state === 'done' ? `${m.matches_won ?? ''}:${m.matches_lost ?? ''}` : '–',
        ]})),
      });

      const buildProxyUrl = (url, type) => {
        const parsed = parseClickTTUrl(url);
        if (!parsed) return null;
        const seasonM = url.match(/click-tt\/[^/]+\/([^/]+)\/ligen/);
        const leagueM = url.match(/ligen\/([^/]+)\/gruppe/);
        const season  = seasonM?.[1] ?? '';
        const league  = leagueM?.[1] ?? '_';
        return `/api/league-proxy?assoc=${encodeURIComponent(parsed.assoc)}&groupId=${encodeURIComponent(parsed.groupId)}&season=${encodeURIComponent(season)}&league=${encodeURIComponent(league)}&type=${type}&filter=gesamt`;
      };

      // ── Tabelle: Vercel Function → Remix _data endpoint (volle Stats) ───
      if (tableUrl) {
        const proxyUrl = buildProxyUrl(tableUrl, 'tabelle');
        if (!proxyUrl) throw new Error('Tabellen-URL nicht erkannt. Bitte eine mytischtennis.de click-tt URL eintragen.');
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Tabelle konnte nicht geladen werden (HTTP ${res.status}).`);
        const json = await res.json();
        // Remix _data: { data: { league_table: [...], meetings_excerpt: { meetings: [...] } } }
        const leagueTable = json?.data?.league_table ?? json?.data ?? [];
        if (!Array.isArray(leagueTable) || leagueTable.length === 0) throw new Error('Keine Tabellendaten gefunden.');
        table = {
          headers: ['#', 'Mannschaft', 'Sp', 'S', 'U', 'N', 'Sätze', 'Punkte'],
          rows: leagueTable.map(t => ({ c: [
            String(t.table_rank ?? ''),
            t.team_name ?? '',
            String((t.meetings_won ?? 0) + (t.meetings_lost ?? 0) + (t.meetings_tie ?? 0)),
            String(t.meetings_won ?? ''),
            String(t.meetings_tie ?? ''),
            String(t.meetings_lost ?? ''),
            `${t.sets_won ?? 0}:${t.sets_lost ?? 0}`,
            `${t.points_won ?? 0}:${t.points_lost ?? 0}`,
          ]})),
        };
        // Spielplan aus demselben Response extrahieren (meetings_excerpt)
        const meetings = json?.data?.meetings_excerpt?.meetings ?? [];
        if (Array.isArray(meetings) && meetings.length > 0) {
          schedule = buildSchedule(meetings);
        }
      }

      // ── Spielplan-URL: falls anders als Tabellen-URL, separaten Request ──
      if (scheduleUrl && !schedule) {
        const proxyUrl = buildProxyUrl(scheduleUrl, 'spielplan');
        if (proxyUrl) {
          try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
              const json = await res.json();
              const meetings = json?.data?.meetings_excerpt?.meetings ?? json?.data?.meetings ?? [];
              if (Array.isArray(meetings) && meetings.length > 0) {
                schedule = buildSchedule(meetings);
              }
            }
          } catch {}
        }
      }

      saveLeagueData({ table, schedule, fetchedAt: new Date().toISOString() });
      const msg = table && !schedule
        ? '✅ Tabelle geladen!\n(Spielplan: konnte nicht geladen werden — wird ggf. ab September verfügbar sein.)'
        : '✅ Liga-Daten erfolgreich aktualisiert!';
      alert(msg);
    } catch (err) {
      console.error('Fehler beim Laden der Liga-Daten:', err);
      alert('❌ ' + (err.message || 'Fehler beim Laden der Daten.'));
    } finally {
      setLeagueFetching(false);
    }
  };
  const saveRangliste = (entries) => { setRangliste(entries); setDoc(doc(db,'ttc','rangliste'),{entries}); };
  const saveRanglistenspiele = (data) => { setRanglistenspiele(data); setDoc(doc(db,'ttc','ranglistenspiele'), data); };
  const saveRanglisteAch = (data) => { setRanglisteAch(data); setDoc(doc(db,'ttc','ranglisteAchievements'), data); };

  // ── Pro-Team Liga-Daten laden ─────────────────────────────────────────────
  const fetchTeamLeague = async (teamId) => {
    const team = teams[teamId];
    if (!team) return;
    const tableUrl    = team.tableUrl?.trim();
    const scheduleUrl = team.scheduleUrl?.trim();
    if (!tableUrl && !scheduleUrl) { alert('Bitte zuerst URLs bei der Mannschaft eintragen.'); return; }
    setTeamFetching(f => ({...f, [teamId]: true}));

    const parseUrl = (url) => {
      const m = url.match(/click-tt\/([^/]+)\/([^/]+)\/ligen\/([^/]+)\/gruppe\/(\d+)/);
      return m ? { assoc: m[1], season: m[2], league: m[3], groupId: m[4] } : null;
    };
    const fmtDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})+', '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
    };

    try {
      let table = null, schedule = null;

      if (tableUrl) {
        const p = parseUrl(tableUrl);
        if (!p) throw new Error('Tabellen-URL nicht erkannt.');
        const res = await fetch(`/api/league-proxy?assoc=${encodeURIComponent(p.assoc)}&groupId=${encodeURIComponent(p.groupId)}&season=${encodeURIComponent(p.season)}&league=${encodeURIComponent(p.league)}&type=tabelle&filter=gesamt`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const leagueTable = json?.data?.league_table ?? json?.data ?? [];
        if (!Array.isArray(leagueTable) || leagueTable.length === 0) throw new Error('Keine Tabellendaten.');
        table = {
          headers: ['#','Mannschaft','Sp','S','U','N','Sätze','Punkte'],
          rows: leagueTable.map(t => ({ c:[String(t.table_rank??''), t.team_name??'', String((t.meetings_won??0)+(t.meetings_lost??0)+(t.meetings_tie??0)), String(t.meetings_won??''), String(t.meetings_tie??''), String(t.meetings_lost??''), `${t.sets_won??0}:${t.sets_lost??0}`, `${t.points_won??0}:${t.points_lost??0}`] })),
        };
        const meetings = json?.data?.meetings_excerpt?.meetings ?? [];
        if (Array.isArray(meetings) && meetings.length > 0) {
          schedule = { headers:['Datum','Heim','Gast','Ergebnis'], rows: meetings.map(m => ({ c:[fmtDate(m.date), m.team_home??'', m.team_away??'', m.state==='done'?`${m.matches_won??''}:${m.matches_lost??''}`:'–'] })) };
        }
      }
      if (scheduleUrl && !schedule) {
        const p = parseUrl(scheduleUrl);
        if (p) {
          try {
            const res = await fetch(`/api/league-proxy?assoc=${encodeURIComponent(p.assoc)}&groupId=${encodeURIComponent(p.groupId)}&season=${encodeURIComponent(p.season)}&league=${encodeURIComponent(p.league)}&type=spielplan&filter=gesamt`, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
              const json = await res.json();
              const meetings = json?.data?.meetings_excerpt?.meetings ?? [];
              if (Array.isArray(meetings) && meetings.length > 0) {
                schedule = { headers:['Datum','Heim','Gast','Ergebnis'], rows: meetings.map(m => ({ c:[fmtDate(m.date), m.team_home??'', m.team_away??'', m.state==='done'?`${m.matches_won??''}:${m.matches_lost??''}`:'–'] })) };
              }
            }
          } catch {}
        }
      }
      saveTeams({ ...teams, [teamId]: { ...team, leagueData: { table, schedule, fetchedAt: new Date().toISOString() } } });
      alert(`✅ Liga-Daten für "${team.name}" geladen!`);
    } catch (err) {
      alert('❌ ' + (err.message || 'Fehler beim Laden.'));
    } finally {
      setTeamFetching(f => ({...f, [teamId]: false}));
    }
  };

  // Compute + save rangliste achievements for given children after rank change.
  // childUpdates: [{ childId, newRank }]  — newRank is 1-based (1=best), 0=not in list
  const applyRankAchievements = (newRangliste, childUpdates, existingAch) => {
    const today = new Date().toISOString().slice(0,10);
    let ach = { ...existingAch };
    childUpdates.forEach(({ childId, newRank }) => {
      const prev = ach[childId] || {};
      const reached = { ...( prev.reached || {}) };
      const weeks   = { ...( prev.weeks   || {}) };
      // ── 1. Weekly check: how many weeks since lastCheck at lastRank ──
      const lastCheck = prev.lastCheck;
      const lastRank  = prev.lastRank ?? null;
      if (lastCheck && lastRank !== null) {
        const daysElapsed = Math.floor((new Date(today) - new Date(lastCheck)) / 86400000);
        const weeksElapsed = Math.floor(daysElapsed / 7);
        if (weeksElapsed > 0) {
          RANK_TIERS.forEach(({ key, maxRank }) => {
            if (lastRank > 0 && lastRank <= maxRank) {
              const w = weeks[key] || { count: 0, frozen: false };
              weeks[key] = { ...w, count: w.frozen ? w.count : w.count + weeksElapsed };
            } else if (!weeks[key]) {
              weeks[key] = { count: 0, frozen: false };
            }
          });
        }
      } else if (!lastCheck) {
        // First time: init all weeks entries
        RANK_TIERS.forEach(({ key }) => { if (!weeks[key]) weeks[key] = { count: 0, frozen: false }; });
      }
      // ── 2. "Reached" milestones at new rank ──
      if (newRank > 0) {
        RANK_TIERS.forEach(({ key, maxRank }) => {
          if (newRank <= maxRank && !reached[key]) reached[key] = today;
        });
      }
      ach[childId] = { ...prev, reached, weeks, lastCheck: today, lastRank: newRank };
    });
    saveRanglisteAch(ach);
    return ach;
  };

  // Weekly check for all children in rangliste (called when trainer opens achievements)
  const runWeeklyRankCheck = (currentRangliste, existingAch) => {
    const updates = currentRangliste.map((childId, idx) => ({ childId, newRank: idx + 1 }));
    // Also add children who left the rangliste (rank=0) if they have existing data
    Object.keys(existingAch).forEach(childId => {
      if (!currentRangliste.includes(childId)) updates.push({ childId, newRank: 0 });
    });
    if (updates.length > 0) applyRankAchievements(currentRangliste, updates, existingAch);
  };

  const getRanglisteAch = (childId) => ranglisteAch[childId] || { reached: {}, weeks: {} };
  const finalizeRanglistenspiel = (spiel) => {
    const { challengerId, defenderId, sets1, sets2 } = spiel;
    let newRangliste = [...rangliste];
    const defIdx  = newRangliste.indexOf(defenderId);
    const chalIdx = newRangliste.indexOf(challengerId);
    const result = sets1 > sets2 ? 'challenger' : 'defender';
    if (result === 'challenger' && defIdx !== -1 && chalIdx !== -1 && chalIdx > defIdx) {
      newRangliste.splice(chalIdx, 1);
      newRangliste.splice(defIdx, 0, challengerId);
    }
    saveRangliste(newRangliste);
    const archived = { ...spiel, closedAt: new Date().toISOString(), result, challengerRank: chalIdx + 1, defenderRank: defIdx + 1 };
    saveRanglistenspiele({ active: ranglistenspiele.active.filter(s => s.id !== spiel.id), archived: [archived, ...ranglistenspiele.archived] });
    // Auto-update rangliste achievements for challenger + defender at their NEW ranks
    const chalNewRank = newRangliste.indexOf(challengerId) + 1;
    const defNewRank  = newRangliste.indexOf(defenderId) + 1;
    applyRankAchievements(newRangliste, [{ childId: challengerId, newRank: chalNewRank }, { childId: defenderId, newRank: defNewRank }], ranglisteAch);
  };
  const savePracticeTournaments          = u => { setPracticeTournaments(u);          setDoc(doc(db,'ttc','practiceTournaments'),          u); };
  const saveArchivedPracticeTournaments  = u => { setArchivedPracticeTournaments(u);  setDoc(doc(db,'ttc','archivedPracticeTournaments'),  u); };
  const saveGegnerLogbuch = entries => { setGegnerLogbuch(entries); setDoc(doc(db,'ttc','gegnerLogbuch'), {entries}); };
  const saveMaterialverwaltung = data => { setMaterialverwaltung(data); setDoc(doc(db,'ttc','materialverwaltung'), data); };
  const saveTtrHistory = data => { setTtrHistory(data); setDoc(doc(db,'ttc','ttrHistory'), data); };

  // ── Trainer Unread Count (Eltern-Nachrichten + Registrierungen) ──────────
  const getTrainerUnreadCount = () => {
    const uid = user?.uid || '';
    return Object.values(notifications).filter(n => {
      if (n.type === 'parent_message') return !n.trashedAt && canAccessGroup(n.toGroupId);
      if (n.type === 'new_registration') {
        const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? n.trainerDeletedBy : {};
        const tta = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt ? n.trainerTrashedAt : {};
        return !tdb[uid] && !tta[uid];
      }
      return false;
    }).length;
  };

  // ── Notification Helpers ─────────────────────────────────────
  const createNotification = (childId, type, title, message, key=null) => {
    const now = new Date().toISOString();
    if (key) {
      // Auch getrastete Nachrichten zählen — einmal gelöscht = nicht neu erstellen
      const exists = Object.values(notifications).some(n => n.key===key);
      if (exists) return;
    }
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const notif = { id, childId, type, title, message, createdAt: now, trashedAt: null, key, batchId: null, trainerTrashedAt: {}, trainerDeletedBy: {} };
    saveNotifications({ ...notifications, [id]: notif });
  };

  // Child-side trash (only affects child's inbox)
  const trashNotification = (id) => {
    const n = notifications[id]; if (!n) return;
    // Auto-generierte Nachrichten (key vorhanden): permanentlyDismissed setzen,
    // damit maybeCreate sie nie neu anlegt
    const update = { ...n, trashedAt: new Date().toISOString() };
    if (n.key) update.permanentlyDismissed = true;
    saveNotifications({ ...notifications, [id]: update });
  };
  const restoreNotification = (id) => {
    const n = notifications[id]; if (!n) return;
    // Wiederherstellen entfernt permanentlyDismissed — Nutzer will sie zurück
    const update = { ...n, trashedAt: null };
    delete update.permanentlyDismissed;
    saveNotifications({ ...notifications, [id]: update });
  };
  const deleteNotificationPermanently = (id) => {
    const n = notifications[id]; if (!n) return;
    // Auto-generierte Nachrichten (key vorhanden) nie wirklich löschen —
    // nur als permanentlyDismissed markieren, damit sie nicht neu erstellt werden.
    if (n.key) {
      saveNotifications({ ...notifications, [id]: { ...n, trashedAt: new Date().toISOString(), permanentlyDismissed: true } });
    } else {
      const u = { ...notifications }; delete u[id]; saveNotifications(u);
    }
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
      if (n.permanentlyDismissed) return; // dauerhaft ausgeblendet — nie anzeigen
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
  const fetchTtcNews = () => {
    setTtcNewsLoading(true);
    fetch('/api/news?_='+Date.now())
      .then(r=>r.json()).then(d=>{
        setTtcNews(Array.isArray(d.items)?d.items:[]);
      }).catch(()=>{}).finally(()=>setTtcNewsLoading(false));
  };
  const navTo = (v) => { setView(v); setViewKey(k => k + 1); setGegnerAdding(false); setGegnerEditId(null); setGegnerForm({date:'',verein:'',gegner:'',taktik:''}); setElternSubView(null); };

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
  const getMyLinkedChildIds = () => {
    if (userProfile?.linkedChildIds?.length > 0) return userProfile.linkedChildIds;
    if (userProfile?.linkedChildId) return [userProfile.linkedChildId];
    return [];
  };
  const getMyChild = () => {
    const ids = getMyLinkedChildIds();
    if (ids.length === 0) return null;
    const id = activeChildId && ids.includes(activeChildId) ? activeChildId : ids[0];
    return children[id] || null;
  };

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
    const in6 = new Date(); in6.setDate(in6.getDate()+6);
    const in6Str = in6.toISOString().split('T')[0];
    return Object.values(sessions)
      .filter(s => s.date >= today && s.date <= in6Str && (
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

      // ── Admin-Benachrichtigung im App-Nachrichten-Modul ──────────
      try {
        const now = new Date().toISOString();
        const dateStr = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        const userType = registerIsParent ? 'Elternteil' : 'Jugendlicher / Trainer';
        const notifId = 'notif_reg_' + cred.user.uid + '_' + Date.now();
        const regSnap = await getDoc(doc(db,'ttc','notifications'));
        const existing = regSnap.exists() ? regSnap.data() : {};
        await setDoc(doc(db,'ttc','notifications'), {
          ...existing,
          [notifId]: {
            id: notifId,
            type: 'new_registration',
            childId: null,
            toGroupId: null,
            fromUid: cred.user.uid,
            fromName: loginName,
            fromEmail: loginEmail,
            userType,
            title: `🆕 Neuer Nutzer: ${loginName}`,
            message: `${loginName} (${loginEmail}) hat sich am ${dateStr} Uhr als ${userType} registriert und wartet auf Freischaltung.`,
            createdAt: now,
            trashedAt: null,
            trainerTrashedAt: {},
            trainerDeletedBy: {},
          }
        });
      } catch (err) {
        console.warn('Registrierungs-Benachrichtigung konnte nicht gespeichert werden:', err);
      }

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
        // Check both active sessions AND archived sessions — don't re-create an archived session
        const existsActive   = Object.values(currentSessions).some(s => s.templateId === tmpl.id && s.date === dateStr);
        const existsArchived = Object.values(archivedSessions).some(s => s.templateId === tmpl.id && s.date === dateStr);
        if(!existsActive && !existsArchived) {
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

  // ── Spieler des Monats / Jahres – shared computation (view + errungenschaften) ──
  // NOTE: placed early so it's available in home/eltern view AND spielerDesMonats view.
  // Uses IDENTICAL logic to the spielerDesMonats view's calcWinners to guarantee consistency.
  const sdmJugendKids = Object.values(children).filter(c => subgroups[c.subgroupId]?.groupId === 'jugend' && !c.nachwuchsKarriereBeendet);
  const sdmAllMs = Object.values(ttrHistory).flatMap(h => (h.entries || []).map(e => e.month));
  const sdmLatestM = sdmAllMs.length ? sdmAllMs.reduce((a,b) => a>b?a:b) : null;
  const sdmPrevM = sdmLatestM ? (()=>{const[y,m]=sdmLatestM.split('-').map(Number);const d=new Date(y,m-2,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;})() : null;
  const sdmGetTtrAt = (sorted, ym) => {
    const exact = sorted.find(e => e.month === ym);
    if (exact) return exact;
    const before = sorted.filter(e => e.month < ym);
    return before.length ? before[before.length-1] : null;
  };
  // Returns array of {child, diff, currTtr, prevTtr} (max-diff winners only), or null
  const sdmCalcWinners = (endYM, startYM) => {
    const res = [];
    sdmJugendKids.forEach(c => {
      const entries = (ttrHistory[c.id]?.entries || []);
      if (entries.length < 2) return;
      const sorted = [...entries].sort((a,b) => a.month.localeCompare(b.month));
      const first = sorted[0];
      const curr = sdmGetTtrAt(sorted, endYM);
      const prev = sdmGetTtrAt(sorted, startYM);
      if (!curr || !prev) return;
      if (curr.month === prev.month) return;
      const diff = curr.ttr - prev.ttr;
      res.push({child: c, diff, currTtr: curr.ttr, prevTtr: prev.ttr});
    });
    if (!res.length) return null;
    const maxDiff = Math.max(...res.map(r => r.diff));
    if (maxDiff <= 0) return null;
    return res.filter(r => r.diff === maxDiff);
  };
  const sdmAllEntryMonths = [...new Set(sdmAllMs)].sort();
  const sdmHistoricMonths = []; // [{period:'YYYY-MM', winners:[{child,diff,...}]}]
  if (sdmAllEntryMonths.length >= 2) {
    const [fy,fm] = sdmAllEntryMonths[0].split('-').map(Number);
    let sy=fy, sm=fm;
    const [ly,lm] = (sdmLatestM||sdmAllEntryMonths[sdmAllEntryMonths.length-1]).split('-').map(Number);
    while (sy<ly || (sy===ly && sm<lm)) {
      const startYM=`${sy}-${String(sm).padStart(2,'0')}`;
      const endD=new Date(sy,sm,1);
      const endYM=`${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}`;
      const winners=sdmCalcWinners(endYM, startYM);
      if (winners) sdmHistoricMonths.push({period:startYM, winners});
      sm++; if (sm>12){sm=1;sy++;}
    }
  }
  const sdmLatestYear = sdmLatestM ? Number(sdmLatestM.slice(0,4)) : new Date().getFullYear();
  const sdmHistoricYears = []; // [{period:'YYYY', winners:[...]}]
  const sdmYears = [...new Set(sdmAllMs.map(m=>m.slice(0,4)))].sort();
  for (let i=1;i<sdmYears.length;i++) {
    const cy=sdmYears[i], py=sdmYears[i-1];
    const winners=sdmCalcWinners(`${cy}-01`, `${py}-01`);
    if (winners) sdmHistoricYears.push({period:py, winners});
  }
  const sdmCurrentMonthWinners = sdmLatestM && sdmPrevM ? sdmCalcWinners(sdmLatestM, sdmPrevM) : null;
  const sdmCurrentMonthLabel = sdmPrevM;
  const sdmCurrentYearWinners = sdmCalcWinners(`${sdmLatestYear}-01`, `${sdmLatestYear-1}-01`);
  const sdmCurrentYearLabel = String(sdmLatestYear - 1);
  // Build per-child wins map from the same historicMonths/Years data
  const spielerDesMonatsWins = {};
  sdmHistoricMonths.forEach(({period, winners}) => {
    winners.forEach(({child}) => {
      if (!spielerDesMonatsWins[child.id]) spielerDesMonatsWins[child.id] = [];
      spielerDesMonatsWins[child.id].push({period, type:'month'});
    });
  });
  sdmHistoricYears.forEach(({period, winners}) => {
    winners.forEach(({child}) => {
      if (!spielerDesMonatsWins[child.id]) spielerDesMonatsWins[child.id] = [];
      spielerDesMonatsWins[child.id].push({period, type:'year'});
    });
  });

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

  const fmtYM = ym => { const [y,m]=ym.split('-'); return `${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][Number(m)-1]} '${y.slice(2)}`; };

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

  const cancelSession = (session) => {
    // Archive as cancelled — no attendance data, not counted in stats
    const archivedAt = new Date().toISOString();
    saveArchivedSessions({ ...archivedSessions, [session.id]: { ...session, archivedAt, cancelled: true } });
    // Remove from active sessions
    const u = { ...sessions }; delete u[session.id]; saveSessions(u);
    // Remove this date from all subgroups' trainingDates (so it never counts)
    const updatedSubgroups = { ...subgroups };
    (session.subgroupIds||[]).forEach(sid => {
      if (updatedSubgroups[sid]) {
        updatedSubgroups[sid] = { ...updatedSubgroups[sid], trainingDates: (updatedSubgroups[sid].trainingDates||[]).filter(d=>d!==session.date) };
      }
    });
    saveSubgroups(updatedSubgroups);
    // Remove any attendance entries already set for this date
    const updatedChildren = { ...children };
    Object.keys(updatedChildren).forEach(id => {
      const att = updatedChildren[id].attendance||{};
      if (att[session.date] !== undefined) {
        const newAtt = { ...att }; delete newAtt[session.date];
        updatedChildren[id] = { ...updatedChildren[id], attendance: newAtt };
      }
    });
    saveChildren(updatedChildren);
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
  const linkChildrenToUser = async (uid, childIds) => {
    const cur = allUsersRef.current;
    const profile = cur[uid]||{};
    const primary = childIds[0]||null;
    const updatedProfile = {...profile, linkedChildIds: childIds, linkedChildId: primary};
    const updated = {...cur, [uid]: updatedProfile};
    allUsersRef.current = updated;
    setAllUsers(updated);
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users',uid), updatedProfile);
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
  const beendeNachwuchskarriere = (childId) => {
    const updated = {...children, [childId]: {...children[childId], nachwuchsKarriereBeendet: true, karriereBeendetAm: TODAY}};
    saveChildren(updated);
  };
  const reaktiviereNachwuchskarriere = (childId) => {
    const c = {...children[childId]};
    delete c.nachwuchsKarriereBeendet;
    delete c.karriereBeendetAm;
    saveChildren({...children, [childId]: c});
  };
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
              <p style={{margin:'0 0 12px',color:'rgba(255,255,255,0.7)',fontSize:'14px',lineHeight:'1.5'}}>
                Wir haben einen Reset-Link an <strong style={{color:'white'}}>{resetEmail}</strong> gesendet.
              </p>
              <div style={{background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.35)',borderRadius:'12px',padding:'14px',marginBottom:'24px',textAlign:'left'}}>
                <p style={{margin:'0 0 6px',color:'#fbbf24',fontSize:'13px',fontWeight:'700'}}>⚠️ Wichtig: Spam-Ordner prüfen!</p>
                <p style={{margin:0,color:'rgba(255,255,255,0.6)',fontSize:'13px',lineHeight:'1.5'}}>
                  Die E-Mail landet häufig im <strong style={{color:'white'}}>Spam- oder Junk-Ordner</strong> — bitte dort nachschauen falls sie nicht im Posteingang erscheint. Der Link ist <strong style={{color:'white'}}>1 Stunde gültig</strong>.
                </p>
              </div>
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
            <div style={{position:'relative'}}>
              <input type={showLoginPassword?'text':'password'} placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
                style={{padding:'12px 44px 12px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px',color:'white',fontSize:'15px',outline:'none',width:'100%',boxSizing:'border-box'}}/>
              <button type="button" onClick={()=>setShowLoginPassword(v=>!v)}
                style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',fontSize:'18px',lineHeight:1,padding:'2px'}}>
                {showLoginPassword?'🙈':'👁️'}
              </button>
            </div>
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
  if (showRolePicker && userRole !== 'aktiver') {
    const selectableRoles = (userProfile?.roles || [userRole]).filter(r => r !== 'pending');
    const roleAccents = {
      admin:      {icon:'🛡️', accent:'rgba(196,181,253,0.9)', accentBg:'rgba(196,181,253,0.1)', accentBorder:'rgba(196,181,253,0.3)', desc:'Vollzugriff auf alle Bereiche'},
      trainer:    {icon:'🏓', accent:'rgba(134,239,172,0.9)', accentBg:'rgba(134,239,172,0.1)', accentBorder:'rgba(134,239,172,0.3)', desc:'Trainingsplanung, Gruppen & Turniere'},
      eltern:     {icon:'👨‍👩‍👧', accent:'rgba(253,230,138,0.9)', accentBg:'rgba(253,230,138,0.08)', accentBorder:'rgba(253,230,138,0.25)', desc:'Übersicht & An-/Abmeldung für dein Kind'},
      jugendlich: {icon:'🧒', accent:'rgba(110,231,183,0.9)', accentBg:'rgba(110,231,183,0.08)', accentBorder:'rgba(110,231,183,0.25)', desc:'Eigene Übersicht, Turniere & Errungenschaften'},
      aktiver:    {icon:'🏓', accent:'rgba(103,232,249,0.9)', accentBg:'rgba(8,145,178,0.08)',   accentBorder:'rgba(8,145,178,0.3)',   desc:'Aktiven-Portal & Gegnerlogbuch'},
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
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
            <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
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
          </Modal>
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
            {canEdit()&&<button onClick={()=>navTo('rangliste')} style={s.btn('#f59e0b')}>📊 Rangliste</button>}
            {canEdit()&&<button onClick={()=>navTo('achievements')} style={s.btn('#7c3aed')}>🏅 Errungenschaften</button>}
            {canEdit()&&<button onClick={()=>navTo('mannschaften')} style={s.btn('#0f766e')}>🏓 Mannschaften</button>}
            {canEdit()&&(()=>{
              const unreadCount = getTrainerUnreadCount();
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
      <Modal>
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
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
      </Modal>
    );
  };

  // ── TRAININGSPLAN ────────────────────────────────────────────
  if (view==='trainingsplan') {
    const upcoming=getAllUpcomingSessions().filter(s=>canAccessSession(s));
    const allChildrenList=Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
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
              {Object.values(recurringTemplates).sort((a,b)=>{
                const da=(a.dayOfWeek+6)%7, db=(b.dayOfWeek+6)%7; // Mo=0..So=6
                return da-db || (a.time||'').localeCompare(b.time||'');
              }).map(tmpl => {
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
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
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
          </Modal>
        )}

        {/* Passwort-Bestätigungs-Dialog */}
        {resetDialog&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
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
          </Modal>
        )}

        {/* ── Nutzerverwaltung ── */}
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:'#7c3aed',display:'flex',alignItems:'center',gap:'8px'}}><Users size={20}/> Nutzerverwaltung</h2>

          {/* Neue Registrierungen */}
          {(()=>{
            const pending = Object.values(allUsers).filter(u=>u.role==='pending');
            if(pending.length===0) return (
              <div style={{padding:'10px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',marginBottom:'16px'}}>
                <p style={{margin:0,fontSize:'13px',color:'#16a34a',fontWeight:'600'}}>✅ Keine ausstehenden Registrierungen</p>
              </div>
            );
            return (
              <div style={{marginBottom:'20px'}}>
                <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#dc2626',textTransform:'uppercase',letterSpacing:'0.5px'}}>⏳ Neue Registrierungen ({pending.length})</p>
                <div style={{display:'grid',gap:'8px'}}>
                  {pending.map(u=>(
                    <div key={u.uid} style={{padding:'14px 16px',background:'#fff5f5',borderRadius:'10px',border:'2px solid #fca5a5'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'10px',flexWrap:'wrap',marginBottom:'10px'}}>
                        <div>
                          <p style={{margin:'0 0 2px',fontWeight:'700',color:'#333',fontSize:'15px'}}>{u.name||u.email}</p>
                          <p style={{margin:0,fontSize:'12px',color:'#999'}}>{u.email}</p>
                          {u.isParent&&<span style={{fontSize:'11px',background:'#dbeafe',color:'#1d4ed8',padding:'2px 8px',borderRadius:'10px',fontWeight:'700',display:'inline-block',marginTop:'4px'}}>👨‍👧 Elternteil</span>}
                          {u.isParent===false&&<span style={{fontSize:'11px',background:'#fef9c3',color:'#92400e',padding:'2px 8px',borderRadius:'10px',fontWeight:'700',display:'inline-block',marginTop:'4px'}}>🧒 Kein Elternteil</span>}
                        </div>
                        <button onClick={()=>{
                          const sel=pendingRoleSelections[u.uid];
                          const assigned=sel&&sel.length>0?sel:(u.roles||[u.role]).filter(r=>r!=='pending');
                          saveUserRoles(u.uid,assigned.length>0?assigned:['eltern']);
                          // Spezialbereiche anwenden
                          const sa=pendingSpecialAccess[u.uid]||{};
                          const newSettings={...appSettings};
                          ['pfandTrainers','rompelTrainers','pinnwandUsers'].forEach(k=>{
                            if(sa[k]){const cur=newSettings[k]||[];if(!cur.includes(u.uid))newSettings[k]=[...cur,u.uid];}
                          });
                          saveAppSettings(newSettings);
                          setPendingRoleSelections(prev=>{const n={...prev};delete n[u.uid];return n;});
                          setPendingSpecialAccess(prev=>{const n={...prev};delete n[u.uid];return n;});
                        }} style={{padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(22,163,74,0.3)'}}>
                          ✓ Freischalten
                        </button>
                      </div>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontSize:'12px',color:'#555',fontWeight:'600'}}>Rolle:</span>
                        {Object.entries(ROLE_CONFIG).filter(([k])=>k!=='pending').map(([key,cfg])=>{
                          const base=pendingRoleSelections[u.uid]??(u.roles||[u.role]).filter(r=>r!=='pending');
                          const active=base.includes(key);
                          return <button key={key} onClick={()=>{
                            const next=active?base.filter(r=>r!==key):[...base,key];
                            setPendingRoleSelections(p=>({...p,[u.uid]:next.length>0?next:base}));
                          }} style={{padding:'3px 9px',borderRadius:'20px',border:`2px solid ${cfg.color}`,background:active?cfg.color:cfg.bg,color:active?'white':cfg.color,cursor:'pointer',fontWeight:'600',fontSize:'11px'}}>{cfg.label}</button>;
                        })}
                      </div>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center',marginTop:'6px'}}>
                        <span style={{fontSize:'12px',color:'#555',fontWeight:'600'}}>Spezialbereiche:</span>
                        {[{k:'pfandTrainers',l:'♻️ Pfandkasse'},{k:'rompelTrainers',l:'🖼️ Rompel'},{k:'pinnwandUsers',l:'📋 Pinnwand'}].map(({k,l})=>{
                          const on=(pendingSpecialAccess[u.uid]||{})[k];
                          return <button key={k} onClick={()=>setPendingSpecialAccess(p=>({...p,[u.uid]:{...(p[u.uid]||{}),[k]:!on}}))}
                            style={{padding:'3px 9px',borderRadius:'20px',border:`2px solid ${on?'#16a34a':'#d1d5db'}`,background:on?'#dcfce7':'#f9fafb',color:on?'#16a34a':'#6b7280',cursor:'pointer',fontWeight:'600',fontSize:'11px'}}>{l}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Bestehende Nutzer — klappbare Liste */}
          {(()=>{
            // Eigenen Account einmischen falls nicht in ttc/users
            const usersMap = user && !allUsers[user.uid] && userProfile
              ? {...allUsers, [user.uid]: {...userProfile, uid: user.uid}}
              : allUsers;
            const active = Object.values(usersMap).filter(u=>u.role!=='pending').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
            if(active.length===0) return null;
            return (
              <div>
                <button onClick={()=>setAdminUsersListOpen(o=>!o)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f8f9fa',border:'1px solid #e5e7eb',borderRadius:'10px',cursor:'pointer',marginBottom: adminUsersListOpen?'10px':'0'}}>
                  <span style={{fontSize:'11px',fontWeight:'800',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.5px'}}>Nutzer ({active.length})</span>
                  <span style={{fontSize:'13px',color:'#9ca3af'}}>{adminUsersListOpen ? '▲' : '▼'}</span>
                </button>
                {adminUsersListOpen && <div style={{display:'grid',gap:'6px'}}>
                  {active.map(u=>{
                    const isOpen = expandedUser===u.uid;
                    const rc=ROLE_CONFIG[u.role]||{};
                    const userRoles=u.roles&&u.roles.length>0?u.roles:[u.role];
                    const linkedChildIds=(u.linkedChildIds?.length>0?u.linkedChildIds:(u.linkedChildId?[u.linkedChildId]:[]));
                    const linkedChild=linkedChildIds.length>0?children[linkedChildIds[0]]:null;
                    const roleLabels=userRoles.filter(r=>r!=='pending').map(r=>ROLE_CONFIG[r]?.label||r).join(', ');
                    return (
                      <div key={u.uid} style={{borderRadius:'10px',border:'1px solid #e5e7eb',overflow:'hidden'}}>
                        {/* Kompakte Zeile */}
                        <button onClick={()=>setExpandedUser(isOpen?null:u.uid)}
                          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f8f9fa',border:'none',cursor:'pointer',gap:'10px',textAlign:'left'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <span style={{fontWeight:'700',color:'#333',fontSize:'14px'}}>{u.name||u.email}</span>
                            <span style={{marginLeft:'8px',fontSize:'12px',color:'#9ca3af'}}>{roleLabels}</span>
                            {linkedChildIds.length>0&&<span style={{marginLeft:'8px',fontSize:'12px',color:'#16a34a',fontWeight:'600'}}>· {linkedChildIds.map(id=>children[id]?.name).filter(Boolean).join(', ')}</span>}
                            {u.linkedPlayerId&&aktiveSpieler[u.linkedPlayerId]&&<span style={{marginLeft:'8px',fontSize:'12px',color:'#0891b2',fontWeight:'600'}}>⚡ {aktiveSpieler[u.linkedPlayerId].name}</span>}
                          </div>
                          <span style={{fontSize:'14px',color:'#9ca3af',transform:isOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.15s',flexShrink:0}}>▾</span>
                        </button>

                        {/* Aufgeklappte Bearbeitung */}
                        {isOpen&&(
                          <div style={{padding:'14px 16px',borderTop:'1px solid #e5e7eb',background:'white'}}>
                            <p style={{margin:'0 0 2px',fontWeight:'700',color:'#333'}}>{u.name||u.email}</p>
                            <p style={{margin:'0 0 12px',fontSize:'12px',color:'#999'}}>{u.email}</p>

                            {/* Rollen */}
                            <div style={{marginBottom:'10px'}}>
                              <span style={{fontSize:'12px',color:'#555',fontWeight:'600',display:'block',marginBottom:'6px'}}>Rollen:</span>
                              <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                                {Object.entries(ROLE_CONFIG).filter(([k])=>k!=='pending').map(([key,cfg])=>{
                                  const cur=userRoles.filter(r=>r!=='pending');
                                  const active=cur.includes(key);
                                  return <button key={key} onClick={()=>{
                                    let next;
                                    if(active){next=cur.filter(r=>r!==key);if(next.length===0)return;}
                                    else next=[...cur,key];
                                    if(key==='admin'&&!active){setAdminRoleDialog({uid:u.uid,newRoles:next});setAdminRolePw('');setAdminRoleError('');}
                                    else saveUserRoles(u.uid,next);
                                  }} style={{padding:'4px 10px',borderRadius:'20px',border:`2px solid ${cfg.color}`,background:active?cfg.color:cfg.bg,color:active?'white':cfg.color,cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                                    {key==='admin'&&!active?'🔒 ':''}{cfg.label}
                                  </button>;
                                })}
                              </div>
                            </div>

                            {/* Kinder zuordnen (Dropdown + Chips) */}
                            {userRoles.some(r=>['eltern','jugendlich'].includes(r))&&(()=>{
                              const latestProfile=allUsers[u.uid]||u;
                              const curIds=(latestProfile.linkedChildIds?.length>0?latestProfile.linkedChildIds:(latestProfile.linkedChildId?[latestProfile.linkedChildId]:[]));
                              const unassigned=allChildrenList.filter(c=>!curIds.includes(c.id));
                              return (
                                <div style={{marginBottom:'10px'}}>
                                  <span style={{fontSize:'12px',color:'#555',fontWeight:'600',display:'block',marginBottom:'6px'}}>Kinder zuordnen:</span>
                                  {curIds.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginBottom:'6px'}}>
                                    {curIds.map(id=>children[id]&&(
                                      <span key={id} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 8px',background:'#dcfce7',border:'1px solid #16a34a',borderRadius:'20px',fontSize:'12px',fontWeight:'600',color:'#15803d'}}>
                                        {children[id].name}
                                        <button onClick={()=>{const fresh=allUsersRef.current[u.uid]||u;const freshIds=fresh.linkedChildIds?.length>0?fresh.linkedChildIds:(fresh.linkedChildId?[fresh.linkedChildId]:[]);linkChildrenToUser(u.uid,freshIds.filter(x=>x!==id));}} style={{background:'none',border:'none',cursor:'pointer',color:'#15803d',padding:'0 0 0 2px',lineHeight:1,fontSize:'15px',fontWeight:'700'}}>×</button>
                                      </span>
                                    ))}
                                  </div>}
                                  {unassigned.length>0&&<select defaultValue="" onChange={e=>{if(!e.target.value)return;const fresh=allUsersRef.current[u.uid]||u;const freshIds=fresh.linkedChildIds?.length>0?fresh.linkedChildIds:(fresh.linkedChildId?[fresh.linkedChildId]:[]);if(!freshIds.includes(e.target.value))linkChildrenToUser(u.uid,[...freshIds,e.target.value]);e.target.value='';}} style={{padding:'6px 10px',border:'1px solid #16a34a',borderRadius:'8px',fontSize:'13px',cursor:'pointer',color:'#15803d',background:'white',width:'100%'}}>
                                    <option value="">+ Kind hinzufügen…</option>
                                    {unassigned.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>}
                                  {curIds.length===0&&unassigned.length===0&&<p style={{fontSize:'12px',color:'#9ca3af',margin:0}}>Keine Kinder vorhanden.</p>}
                                </div>
                              );
                            })()}

                            {/* Spieler zuordnen (Aktiver / Admin) */}
                            {userRoles.some(r=>['aktiver','admin'].includes(r))&&(()=>{
                              const aktivList=Object.values(aktiveSpieler).sort((a,b)=>a.name.localeCompare(b.name,'de'));
                              const jugendList=Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
                              const curPlayer=allUsers[u.uid]?.linkedPlayerId||'';
                              return (
                                <div style={{marginBottom:'10px'}}>
                                  <span style={{fontSize:'12px',color:'#555',fontWeight:'600',display:'block',marginBottom:'6px'}}>⚡ Spieler zuordnen:</span>
                                  <select value={curPlayer} onChange={e=>linkPlayerToUser(u.uid,e.target.value||null)} style={{padding:'6px 10px',border:'1px solid #0891b2',borderRadius:'8px',fontSize:'13px',cursor:'pointer',color:'#0c4a6e',background:'white',width:'100%'}}>
                                    <option value="">– kein Spieler –</option>
                                    {aktivList.length>0&&<optgroup label="Aktive">
                                      {aktivList.map(sp=><option key={sp.id} value={sp.id}>{sp.name}{sp.ttr?` (TTR ${sp.ttr})`:''}</option>)}
                                    </optgroup>}
                                    {jugendList.length>0&&<optgroup label="Nachwuchs">
                                      {jugendList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>}
                                  </select>
                                </div>
                              );
                            })()}

                            {/* Gruppen (Trainer) */}
                            {userRoles.includes('trainer')&&(
                              <div style={{marginBottom:'10px'}}>
                                <span style={{fontSize:'12px',color:'#555',fontWeight:'600',display:'block',marginBottom:'6px'}}>Gruppen:</span>
                                <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                                  {FIXED_GROUPS.map(g=>{
                                    const assigned=(u.groupIds||[]).includes(g.id);
                                    return <button key={g.id} onClick={()=>{
                                      const cur=u.groupIds||[];
                                      saveUserGroupIds(u.uid,assigned?cur.filter(x=>x!==g.id):[...cur,g.id]);
                                    }} style={{padding:'3px 10px',borderRadius:'20px',border:`2px solid ${g.color}`,background:assigned?g.color:'white',color:assigned?'white':g.color,cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                                      {g.emoji} {g.name}
                                    </button>;
                                  })}
                                  {(u.groupIds||[]).length===0&&<span style={{fontSize:'11px',color:'#dc2626',fontStyle:'italic'}}>⚠️ Keine Gruppe</span>}
                                </div>
                              </div>
                            )}

                            {/* Aktionen */}
                            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                              <button onClick={()=>{if(window.confirm(`"${u.name||u.email}" zurück auf Wartend setzen?`))saveUserRoles(u.uid,['pending']);}}
                                style={{padding:'4px 10px',background:'#fef3c7',border:'1px solid #d97706',borderRadius:'6px',cursor:'pointer',color:'#92400e',fontSize:'11px',fontWeight:'600'}}>
                                ⏳ Auf Wartend setzen
                              </button>
                              <button onClick={async()=>{
                                if(!window.confirm(`Account von "${u.name||u.email}" wirklich löschen?`))return;
                                const updated={...allUsers};delete updated[u.uid];
                                await setDoc(doc(db,'ttc','users'),updated);setAllUsers(updated);setExpandedUser(null);
                              }} style={{padding:'4px 10px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:'6px',cursor:'pointer',color:'#dc2626',fontSize:'11px',fontWeight:'600'}}>
                                🗑️ Löschen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })()}
          {Object.keys(allUsers).length===0&&<p style={{color:'#999',textAlign:'center',padding:'20px'}}>Noch keine Nutzer.</p>}
        </div>

        {/* ── Datenlöschen ── */}
        {(()=>{
          const cats = [
            {id:'attendance',      label:'Anwesenheitsdaten',          icon:'📋', needsPw:true},
            {id:'sessions',        label:'Trainingseinheiten (aktiv)',  icon:'🏋️'},
            {id:'tournaments',     label:'Turniere (aktiv)',            icon:'🏆'},
            {id:'practiceT',       label:'Übungswettkämpfe (aktiv)',   icon:'🎮'},
            {id:'messages',        label:'Trainer-Nachrichten',         icon:'💬'},
            {id:'archSessions',    label:'Archiv Training',             icon:'📦'},
            {id:'archTourneys',    label:'Archiv Turniere',             icon:'📦'},
            {id:'archPT',          label:'Archiv Übungswettkämpfe',    icon:'📦'},
            {id:'allAchievements', label:'Alle Errungenschaften',       icon:'🏅'},
            {id:'rlAchievements',  label:'Ranglisten-Errungenschaften', icon:'📊'},
          ];
          const handleDelete = () => {
            const cat = cats.find(c=>c.id===dangerSelected);
            if(!cat) return;
            if(!window.confirm(`"${cat.label}" unwiderruflich löschen?\n\nFortfahren?`)) return;
            if(cat.needsPw){ setResetDialog(true); return; }
            if(cat.id==='sessions')     saveSessions({});
            if(cat.id==='tournaments')  saveTournaments({});
            if(cat.id==='practiceT')    savePracticeTournaments({});
            if(cat.id==='messages'){const u={};Object.values(notifications).forEach(n=>{if(n.type!=='trainer_message')u[n.id]=n;});saveNotifications(u);}
            if(cat.id==='archSessions')  saveArchivedSessions({});
            if(cat.id==='archTourneys')  saveArchivedTournaments({});
            if(cat.id==='archPT')        saveArchivedPracticeTournaments({});
            if(cat.id==='rlAchievements') saveRanglisteAch({});
            if(cat.id==='allAchievements'){
              saveRanglisteAch({});
              const resetFields=['einzel1','einzel2','einzel3','doppel1','doppel2','doppel3','team','spielerDesMonats','ttrUnlocked'];
              const updatedChildren={...children};
              Object.keys(updatedChildren).forEach(id=>{
                const ach=updatedChildren[id].achievements||{};const blank={};
                resetFields.forEach(f=>{blank[f]=f==='ttrUnlocked'?[]:0;});
                updatedChildren[id]={...updatedChildren[id],achievements:{...ach,...blank}};
              });
              setChildren(updatedChildren);setDoc(doc(db,'ttc','children'),updatedChildren);
            }
            setDangerSelected('');
          };
          return (
            <div style={{...s.card,border:'1px solid #fca5a5',padding:'14px 18px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <span style={{fontWeight:'800',color:'#dc2626',fontSize:'14px',whiteSpace:'nowrap'}}>🗑️ Datenlöschen</span>
              <select value={dangerSelected} onChange={e=>setDangerSelected(e.target.value)}
                style={{flex:1,minWidth:'180px',padding:'7px 10px',border:'1px solid #fca5a5',borderRadius:'8px',fontSize:'13px',background:'white',color:dangerSelected?'#1f2937':'#9ca3af',cursor:'pointer'}}>
                <option value=''>-- Bereich auswählen --</option>
                {cats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button onClick={handleDelete} disabled={!dangerSelected}
                style={{padding:'8px 16px',background:dangerSelected?'#dc2626':'#e5e7eb',color:dangerSelected?'white':'#9ca3af',border:'none',borderRadius:'8px',cursor:dangerSelected?'pointer':'not-allowed',fontWeight:'700',fontSize:'13px',whiteSpace:'nowrap'}}>
                Löschen
              </button>
            </div>
          );
        })()}

          {/* Spezialbereiche Zugang */}
          {[
            {key:'pfandTrainers',   icon:'♻️',  label:'Pfandkasse',    color:'#16a34a', accent:'#86efac'},
            {key:'rompelTrainers',  icon:null,  label:'Rompel Bereich',color:'#be185d', accent:'#fda4af'},
            {key:'pinnwandUsers',   icon:'📋',  label:'Pinnwand',      color:'#b45309', accent:'#fde68a'},
          ].map(({key,icon,label,color,accent})=>{
            const allRegistered = Object.values(allUsers).filter(u=>u.role!=='pending').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
            const currentList = appSettings[key] || [];
            const add = uid => { if(!currentList.includes(uid)) saveAppSettings({...appSettings,[key]:[...currentList,uid]}); };
            const remove = uid => saveAppSettings({...appSettings,[key]:currentList.filter(x=>x!==uid)});
            const available = allRegistered.filter(u=>!currentList.includes(u.uid));
            return (
              <div key={key} style={{...s.card,marginTop:'16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                  {key==='rompelTrainers'
                    ? <img src="/rompel.jpg" alt="" style={{width:'28px',height:'28px',borderRadius:'50%',objectFit:'cover',objectPosition:'center top',border:`2px solid ${accent}`}}/>
                    : <span style={{fontSize:'22px'}}>{icon}</span>}
                  <span style={{fontWeight:'800',color,fontSize:'14px'}}>{label} — Zugang</span>
                </div>
                <p style={{margin:'0 0 10px',fontSize:'12px',color:'#6b7280'}}>Admins haben immer Zugang. Wähle Nutzer aus:</p>
                {/* Dropdown */}
                <select defaultValue="" onChange={e=>{if(e.target.value){add(e.target.value);e.target.value='';}}}
                  style={{width:'100%',padding:'8px 10px',border:`1px solid ${accent}`,borderRadius:'8px',fontSize:'13px',background:'white',color:'#374151',cursor:'pointer',marginBottom:'10px'}}>
                  <option value="">+ Nutzer hinzufügen…</option>
                  {available.map(u=><option key={u.uid} value={u.uid}>{u.name||u.email}</option>)}
                </select>
                {/* Tag-Liste der freigeschalteten Nutzer */}
                {currentList.length===0
                  ? <p style={{margin:0,fontSize:'12px',color:'#9ca3af',fontStyle:'italic'}}>Noch niemand freigeschaltet.</p>
                  : <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {currentList.map(uid=>{
                      const u=allUsers[uid];
                      return (
                        <span key={uid} style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px 3px 12px',borderRadius:'20px',background:`rgba(${key==='pfandTrainers'?'134,239,172':key==='rompelTrainers'?'253,164,175':'253,230,138'},0.15)`,border:`1px solid ${accent}`,fontSize:'12px',fontWeight:'700',color}}>
                          {u?.name||u?.email||uid}
                          <button onClick={()=>remove(uid)} style={{background:'none',border:'none',cursor:'pointer',color,padding:'0',lineHeight:1,fontSize:'14px',fontWeight:'700'}}>×</button>
                        </span>
                      );
                    })}
                  </div>
                }
              </div>
            );
          })}

        </div>
      </div>
    );
  }

  // ── MEINE GRUPPEN (Trainer/Admin) ─────────────────────────────────────
  if (view==='meingruppen' && canEdit()) {
    const groups = FIXED_GROUPS.filter(g=>canAccessGroup(g.id));
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr" style={{background:'rgba(2,26,10,0.97)',borderBottom:'1px solid rgba(110,231,183,0.15)',padding:'18px 22px 14px',display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>navTo('home')} style={{background:'rgba(110,231,183,0.1)',border:'1px solid rgba(110,231,183,0.25)',borderRadius:'12px',padding:'8px 14px',color:'#6ee7b7',cursor:'pointer',fontSize:'14px',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}><ArrowLeft size={18}/>Zurück</button>
          <div style={{flex:1}}><h2 style={{margin:0,fontSize:'20px',fontWeight:'800',color:'white'}}>👥 Meine Gruppen</h2></div>
        </div>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:'28px 16px'}}>
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
    const unreadCount = getTrainerUnreadCount();
    const hour = new Date().getHours();
    const greeting = hour<12?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
    const dateLabel = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    const QL_STYLE = (bg,border) => ({
      position:'relative',padding:'15px 8px 13px',background:bg,border:'1px solid '+border,
      borderRadius:'16px',cursor:'pointer',display:'flex',flexDirection:'column',
      alignItems:'center',gap:'8px',transition:'transform 0.12s',textAlign:'center'
    });
    const quickCategories = [
      {
        label: 'Training',
        color: 'rgba(134,239,172,0.45)',
        links: [
          {label:'Trainingsplan',    icon:'📅', color:'#86efac', bg:'rgba(134,239,172,0.1)',  border:'rgba(134,239,172,0.25)', action:()=>navTo('trainingsplan')},
          {label:'Übungswettkämpfe',icon:'🎮', color:'#c4b5fd', bg:'rgba(196,181,253,0.1)',  border:'rgba(196,181,253,0.25)', action:()=>navTo('practiceTournaments')},
          {label:'Meine Gruppen',    icon:'👥', color:'#6ee7b7', bg:'rgba(110,231,183,0.1)',  border:'rgba(110,231,183,0.25)', action:()=>navTo('meingruppen')},
        ],
      },
      {
        label: 'Wettkampf',
        color: 'rgba(253,230,138,0.45)',
        links: [
          {label:'Errungenschaften', icon:'🏅', color:'#d9f99d', bg:'rgba(217,249,157,0.1)',  border:'rgba(217,249,157,0.25)', action:()=>navTo('achievements')},
          {label:'Rangliste',        icon:'📊', color:'#fcd34d', bg:'rgba(252,211,77,0.1)',   border:'rgba(252,211,77,0.25)',  action:()=>navTo('rangliste')},
          {label:'Mannschaften',     icon:'🏓', color:'#6ee7b7', bg:'rgba(110,231,183,0.1)',  border:'rgba(110,231,183,0.25)', action:()=>navTo('mannschaften')},
          {label:'Turniere',         icon:'🏆', color:'#fde68a', bg:'rgba(253,230,138,0.1)',  border:'rgba(253,230,138,0.25)', action:()=>navTo('turniere')},
          {label:'Gegnerlogbuch',    icon:'🎯', color:'#67e8f9', bg:'rgba(8,145,178,0.08)',   border:'rgba(8,145,178,0.25)',   action:()=>navTo('gegnerlogbuch')},
          {label:'TTR Werte',        icon:'📈', color:'#fbbf24', bg:'rgba(251,191,36,0.08)',  border:'rgba(251,191,36,0.25)',  action:()=>navTo('ttrWerte')},
        ],
      },
      {
        label: 'Sonstiges',
        color: 'rgba(226,232,240,0.35)',
        links: [
          {label:'Archiv',           icon:'📦', color:'#e2e8f0', bg:'rgba(226,232,240,0.08)', border:'rgba(226,232,240,0.2)',  action:()=>navTo('archiv')},
          {label:'Nachrichten',      icon:'💬', color:'#bbf7d0', bg:'rgba(187,247,208,0.1)',  border:'rgba(187,247,208,0.25)', action:()=>navTo('notifications'), badge: unreadCount},
          {label:'Materialverwaltung',icon:'🏓', color:'#fb923c', bg:'rgba(251,146,60,0.08)', border:'rgba(251,146,60,0.25)',  action:()=>navTo('materialverwaltung')},
          ...(canAccessPinnwand()?[{label:'Pinnwand',  icon:'📋', color:'#fde68a', bg:'rgba(253,230,138,0.08)', border:'rgba(253,230,138,0.2)',  action:()=>navTo('wettenZitate'), badge: wettenZitate.filter(e=>e.dueDate&&e.dueDate<=TODAY&&!e.dueSeen).length||0}]:[]),
          ...(canEdit()?[
            {label:'Trikotgrößen', icon:'👕', color:'#93c5fd', bg:'rgba(147,197,253,0.08)', border:'rgba(147,197,253,0.2)', action:()=>navTo('trikotgroessen')},
          ]:[]),
          ...(canAccessRompel()?[
            {label:'Rompel Bereich', icon:{type:'img',src:'/rompel.jpg'}, color:'#fda4af', bg:'rgba(253,164,175,0.08)', border:'rgba(253,164,175,0.25)', action:()=>navTo('rompel')},
          ]:[]),
          ...(canAccessPfand()?[
            {label:'Pfandkasse', icon:'♻️', color:'#86efac', bg:'rgba(134,239,172,0.08)', border:'rgba(134,239,172,0.2)', action:()=>navTo('pfandkasse')},
          ]:[]),
          ...(userRole==='admin'?[
            {label:'Trainingsmatches',icon:'⚔️', color:'#f9a8d4', bg:'rgba(244,114,182,0.08)', border:'rgba(244,114,182,0.25)', action:()=>navTo('trainingsmatches')},
            {label:'Admin',          icon:'🛡️', color:'#c4b5fd', bg:'rgba(196,181,253,0.1)', border:'rgba(196,181,253,0.25)', action:()=>navTo('admin')},
          ]:[]),
        ],
      },
    ];
    const groups = FIXED_GROUPS.filter(g=>canAccessGroup(g.id));

    const inputStyle = {padding:'10px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(134,239,172,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',width:'100%',boxSizing:'border-box'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        {archiveTournDialog&&<ArchiveTournDialog tournament={archiveTournDialog} onClose={()=>setArchiveTournDialog(null)} onConfirm={confirmArchiveTournament}/>}

        {/* Profil-Modal */}
        {showProfile&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
            <div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
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
          </Modal>
        )}

        {/* Rollenwechsel-Modal */}
        {showRolePicker&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
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
          </Modal>
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
                    const allKids2=(session.subgroupIds||[]).flatMap(sid=>getChildrenForSubgroup(sid)).filter(c=>!c.nachwuchsKarriereBeendet);
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
          {quickCategories.map(cat=>(
            <div key={cat.label} style={{marginBottom:'24px'}}>
              <p style={{color:cat.color,fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 10px'}}>⬡ {cat.label}</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
                {cat.links.map((ql,i)=>(
                  <button key={i} onClick={ql.action} style={QL_STYLE(ql.bg,ql.border)}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                    {ql.icon&&typeof ql.icon==='object'&&ql.icon.type==='img'
                      ? <img src={ql.icon.src} alt="" style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',objectPosition:'center top',border:'2px solid rgba(253,164,175,0.4)'}}/>
                      : <span style={{fontSize:'24px',lineHeight:1}}>{ql.icon}</span>}
                    <span style={{fontSize:'11px',fontWeight:'700',color:ql.color,lineHeight:'1.3'}}>{ql.label}</span>
                    {(ql.badge>0||ql.badge==='!')&&<span style={{position:'absolute',top:'8px',right:'8px',background:'#dc2626',color:'white',borderRadius:'50%',width:'18px',height:'18px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center'}}>{ql.badge==='!'?'!':ql.badge>9?'9+':ql.badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── 3. Meine Gruppen (via navTo meingruppen) ─────────── */}

        </div>
      </div>
    );
  }



  // ── AKTIVER DASHBOARD ────────────────────────────────────────────────────
  if (userRole === 'aktiver' && !['gegnerlogbuch','ttcnews','trainingsmatches','wettenZitate'].includes(view)) {
    const dateLabel = new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    const greeting = new Date().getHours()<12?'Guten Morgen':new Date().getHours()<18?'Hallo':'Guten Abend';

    const submitGegner = () => {
      if (!gegnerForm.verein.trim() || !gegnerForm.date) return;
      const entry = {
        id: 'gl_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        date: gegnerForm.date,
        verein: gegnerForm.verein.trim(),
        gegner: gegnerForm.gegner.trim(),
        taktik: gegnerForm.taktik.trim(),
        createdBy: userProfile?.name || user?.email || 'Unbekannt',
        createdAt: new Date().toISOString(),
      };
      if (gegnerEditId) {
        saveGegnerLogbuch(gegnerLogbuch.map(e=>e.id===gegnerEditId?{...e,...entry,id:gegnerEditId}:e));
        setGegnerEditId(null);
      } else {
        saveGegnerLogbuch([entry, ...gegnerLogbuch]);
      }
      setGegnerForm({date:'',verein:'',gegner:'',taktik:''});
      setGegnerAdding(false);
    };

    const deleteGegner = id => { if(!window.confirm('Eintrag löschen?'))return; saveGegnerLogbuch(gegnerLogbuch.filter(e=>e.id!==id)); };

    const accentColor = '#0891b2';
    const accentMid   = 'rgba(8,145,178,0.55)';
    const accentBg    = 'rgba(8,145,178,0.08)';
    const accentBorder= 'rgba(8,145,178,0.2)';
    const CARD = {background:'rgba(255,255,255,0.04)',border:`1px solid ${accentBorder}`,borderRadius:'18px',padding:'20px',marginBottom:'20px'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0c1a2e 0%,#0e2a3a 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>

        {/* Rollenwechsel-Modal */}
        {showRolePicker&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
            <div style={{background:'#071520',border:`1px solid ${accentBorder}`,borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
              <p style={{margin:'0 0 20px',color:'rgba(255,255,255,0.4)',fontSize:'14px',textAlign:'center',fontWeight:'500'}}>Mit welcher Rolle möchtest du fortfahren?</p>
              <div style={{display:'grid',gap:'10px'}}>
                {(userProfile?.roles||[userRole]).filter(r=>r!=='pending').map(role=>{
                  const ra={admin:{icon:'🛡️',accent:'rgba(196,181,253,0.9)',accentBg:'rgba(196,181,253,0.1)',accentBorder:'rgba(196,181,253,0.3)',desc:'Vollzugriff auf alle Bereiche'},trainer:{icon:'🏓',accent:'rgba(134,239,172,0.9)',accentBg:'rgba(134,239,172,0.1)',accentBorder:'rgba(134,239,172,0.3)',desc:'Trainingsplanung, Gruppen & Turniere'},eltern:{icon:'👨‍👩‍👧',accent:'rgba(253,230,138,0.9)',accentBg:'rgba(253,230,138,0.08)',accentBorder:'rgba(253,230,138,0.25)',desc:'Übersicht & An-/Abmeldung für dein Kind'},jugendlich:{icon:'🧒',accent:'rgba(110,231,183,0.9)',accentBg:'rgba(110,231,183,0.08)',accentBorder:'rgba(110,231,183,0.25)',desc:'Eigene Übersicht, Turniere & Errungenschaften'},aktiver:{icon:'🏓',accent:'rgba(103,232,249,0.9)',accentBg:'rgba(8,145,178,0.08)',accentBorder:'rgba(8,145,178,0.3)',desc:'Aktiven-Portal & Gegnerlogbuch'}}[role]||{icon:'👤',accent:'rgba(255,255,255,0.7)',accentBg:'rgba(255,255,255,0.05)',accentBorder:'rgba(255,255,255,0.15)',desc:''};
                  return (
                    <button key={role} onClick={()=>{setUserRole(role);setShowRolePicker(false);navTo('home');}}
                      style={{padding:'16px 18px',background:ra.accentBg,border:`1px solid ${ra.accentBorder}`,borderRadius:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',width:'100%'}}>
                      <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'rgba(0,0,0,0.2)',border:`1px solid ${ra.accentBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{ra.icon}</div>
                      <div style={{flex:1}}>
                        <p style={{margin:'0 0 2px',fontWeight:'800',fontSize:'15px',color:ra.accent}}>{ROLE_CONFIG[role]?.label||role}</p>
                        <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>{ra.desc}</p>
                      </div>
                      <span style={{color:ra.accentBorder,fontSize:'18px'}}>›</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setShowRolePicker(false)} style={{marginTop:'14px',width:'100%',padding:'10px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
            </div>
          </div>
          </Modal>
        )}

        {/* Profil-Modal */}
        {showProfile&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
            <div style={{background:'#071520',border:'1px solid rgba(8,145,178,0.2)',borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
              <h3 style={{margin:'0 0 2px',color:'white',fontSize:'20px',fontWeight:'800'}}>Mein Profil</h3>
              <p style={{margin:'0 0 22px',color:'rgba(255,255,255,0.35)',fontSize:'13px'}}>{user?.email}</p>
              <h4 style={{margin:'0 0 10px',color:accentColor,fontSize:'13px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Passwort ändern</h4>
              {pwSuccess&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(8,145,178,0.12)',border:'1px solid rgba(8,145,178,0.25)',borderRadius:'10px',fontSize:'13px',color:'#67e8f9',fontWeight:'600'}}>✅ Passwort geändert!</div>}
              {pwError&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',fontSize:'13px',color:'#fca5a5'}}>{pwError}</div>}
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px'}}>
                <input type="password" placeholder="Aktuelles Passwort" value={pwCurrent} onChange={e=>setPwCurrent(e.target.value)} style={inputStyle}/>
                <input type="password" placeholder="Neues Passwort (min. 6 Zeichen)" value={pwNew} onChange={e=>setPwNew(e.target.value)} style={inputStyle}/>
                <input type="password" placeholder="Neues Passwort bestätigen" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} style={inputStyle}/>
                <button onClick={handleChangePassword} style={{padding:'11px',background:`linear-gradient(135deg,${accentColor},#0e7490)`,color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>Passwort ändern</button>
              </div>
              <button onClick={()=>{setShowProfile(false);setPwError('');setPwSuccess(false);setPwCurrent('');setPwNew('');setPwConfirm('');}}
                style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>Schließen</button>
            </div>
          </div>
          </Modal>
        )}

        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 20px 60px'}}>

          {/* Top-Bar */}
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${accentBorder}`,padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 22px':'0 -24px 28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <img src="/logo.png" alt="TTC Logo" style={{width:'55px',height:'55px',objectFit:'contain',borderRadius:'12px',flexShrink:0,filter:'drop-shadow(0 3px 12px rgba(0,0,0,0.5))'}}/>
              <div>
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß Staffel</p>
                <p style={{margin:0,color:accentMid,fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Aktiven-Portal</p>
              </div>
            </div>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              {(()=>{const sel=(userProfile?.roles||[userRole]).filter(r=>r!=='pending');return sel.length>1?<button onClick={()=>setShowRolePicker(true)} style={{padding:'8px',background:accentBg,border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'#67e8f9',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'👤':'👤 Rolle'}</button>:null;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:isMobile?'16px':'12px',fontWeight:'600',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'⚙️':'⚙️ Profil'}</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🚪':'Abmelden'}</button>
            </div>
          </div>

          {/* Greeting */}
          {(()=>{
            const linkedSp = userProfile?.linkedPlayerId ? aktiveSpieler[userProfile.linkedPlayerId] : null;
            const linkedId = userProfile?.linkedPlayerId;
            const hist = linkedId ? (ttrHistory[linkedId]?.entries||[]).slice().sort((a,b)=>a.month.localeCompare(b.month)) : [];
            const lastTtr = hist[hist.length-1];
            return (
              <div style={{marginBottom:'28px'}}>
                <p style={{margin:'0 0 6px',color:accentMid,fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase'}}>{dateLabel}</p>
                <h1 style={{margin:0,color:'white',fontSize:isMobile?'26px':'32px',fontWeight:'800',letterSpacing:'-1px',lineHeight:1.1}}>
                  {greeting}, <span style={{color:'#67e8f9'}}>{(userProfile?.name||'').split(' ')[0]||'Spieler'}</span> 👋
                </h1>
                {lastTtr&&<p style={{margin:'6px 0 0',fontSize:'14px',color:'rgba(255,255,255,0.45)',fontWeight:'500'}}>
                  Dein TTR: <span style={{color:'#38bdf8',fontWeight:'800'}}>{lastTtr.ttr}</span>
                  <span style={{color:'rgba(255,255,255,0.25)',fontSize:'12px',marginLeft:'6px'}}>({lastTtr.month})</span>
                </p>}
              </div>
            );
          })()}

          {/* ── Hub-Kacheln ── */}
          <span style={{display:'block',fontSize:'10px',fontWeight:'800',color:accentMid,textTransform:'uppercase',letterSpacing:'2px',marginBottom:'10px'}}>Bereiche</span>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'12px',marginBottom:'0'}}>
            {[
              {label:'Gegnerlogbuch', icon:'🎯', desc:`${gegnerLogbuch.length} ${gegnerLogbuch.length===1?'Eintrag':'Einträge'} · Taktiken & Hinweise`, color:'#67e8f9', bg:'rgba(8,145,178,0.08)', border:'rgba(8,145,178,0.2)', action:()=>navTo('gegnerlogbuch')},
              {label:'TTC News',        icon:'📰', desc:'Aktuelle Vereinsnachrichten',             color:'#86efac', bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.2)',  action:()=>{navTo('ttcnews');fetchTtcNews();}},
              {label:'Trainingsmatches',icon:'⚔️', desc:'Duelle & Allzeittabelle',                  color:'#f9a8d4', bg:'rgba(244,114,182,0.08)', border:'rgba(244,114,182,0.2)', action:()=>navTo('trainingsmatches')},
              ...(canAccessPinnwand()?[{label:'Pinnwand', icon:'📋', desc:'Wetten, Zitate & Lessons Learned', color:'#fde68a', bg:'rgba(253,230,138,0.07)', border:'rgba(253,230,138,0.2)', action:()=>navTo('wettenZitate'), badge: wettenZitate.filter(e=>e.dueDate&&e.dueDate<=TODAY&&!e.dueSeen).length||0}]:[]),
              {label:'MyTischtennis', icon:'🏓', desc:'Vereinsübersicht auf MyTischtennis',                                                                  color:'#fcd34d', bg:'rgba(251,191,36,0.07)', border:'rgba(251,191,36,0.2)',  action:()=>(()=>{const a=document.createElement('a');a.href='https://www.mytischtennis.de/click-tt/HeTTV/25--26/verein/33066/TTC_G.-W._Staffel_1953';a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();document.body.removeChild(a);})()},
            ].map(t=>(
              <button key={t.label} onClick={t.action}
                style={{position:'relative',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'18px',padding:'22px 20px',cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:'8px',transition:'transform 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                {t.badge>0&&<span style={{position:'absolute',top:'10px',right:'10px',background:'#dc2626',color:'white',borderRadius:'50%',width:'20px',height:'20px',fontSize:'11px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center'}}>{t.badge>9?'9+':t.badge}</span>}
                <span style={{fontSize:'32px'}}>{t.icon}</span>
                <p style={{margin:0,fontWeight:'800',fontSize:'17px',color:t.color}}>{t.label}</p>
                <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)',lineHeight:'1.5'}}>{t.desc}</p>
              </button>
            ))}
          </div>


        </div>
      </div>
    );
  }

  if (['eltern','jugendlich'].includes(userRole) && view === 'home') {
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

    // ── Sub-View: eigene Seite mit Trainer-ähnlichem Header ──
    const subViewMeta = {
      benachrichtigungen: { label:'Benachrichtigungen', icon:'🔔', color:'#c4b5fd', colorFaint:'rgba(167,139,250,0.5)', border:'rgba(167,139,250,0.15)', bg:'linear-gradient(170deg,#0d0a1f 0%,#150d2e 45%,#0a0818 100%)', hdrBg:'rgba(13,10,31,0.97)' },
      trainingsverlauf:   { label:'Trainingsverlauf',   icon:'📋', color:'#67e8f9', colorFaint:'rgba(103,232,249,0.5)', border:'rgba(103,232,249,0.15)', bg:'linear-gradient(170deg,#051a20 0%,#082d38 45%,#041520 100%)', hdrBg:'rgba(5,26,32,0.97)'  },
      mannschaft:         { label:'Mannschaft',          icon:'🏓', color:'#2dd4bf', colorFaint:'rgba(45,212,191,0.5)',  border:'rgba(45,212,191,0.15)',  bg:'linear-gradient(170deg,#041a1a 0%,#072d2a 45%,#041816 100%)', hdrBg:'rgba(4,26,26,0.97)'  },
      turniere:           { label:'Turniere',            icon:'🏆', color:'#fde68a', colorFaint:'rgba(253,230,138,0.5)', border:'rgba(253,230,138,0.15)', bg:'linear-gradient(170deg,#1a1500 0%,#2d2200 45%,#1a1200 100%)', hdrBg:'rgba(26,21,0,0.97)'  },
      rangliste:          { label:'Rangliste',           icon:'📊', color:'#fbbf24', colorFaint:'rgba(251,191,36,0.5)',  border:'rgba(251,191,36,0.15)',  bg:'linear-gradient(170deg,#1a1200 0%,#2d1e00 45%,#1a1000 100%)', hdrBg:'rgba(26,18,0,0.97)'  },
      errungenschaften:   { label:'Errungenschaften',    icon:'🏅', color:'#86efac', colorFaint:'rgba(134,239,172,0.5)', border:'rgba(134,239,172,0.15)', bg:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)', hdrBg:'rgba(2,26,10,0.97)'  },
    };

    if (elternSubView && subViewMeta[elternSubView]) {
      const meta = subViewMeta[elternSubView];
      const renderSubContent = () => {
        if (elternSubView === 'benachrichtigungen') {
          if (!myChild) return null;
          const { active, trashed } = getCleanedNotifications(myChild.id);
          const showTrash = notifTab === 'trash';
          const items = showTrash ? trashed : active;
          return (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginBottom:'16px',gap:'8px',flexWrap:'wrap'}}>
                <button onClick={()=>setNotifTab('inbox')} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:notifTab==='inbox'?'#16a34a':'rgba(255,255,255,0.07)',color:notifTab==='inbox'?'white':'rgba(255,255,255,0.5)'}}>Posteingang {active.length>0&&`(${active.length})`}</button>
                <button onClick={()=>setNotifTab('trash')} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:notifTab==='trash'?'#374151':'rgba(255,255,255,0.07)',color:notifTab==='trash'?'white':'rgba(255,255,255,0.5)'}}>🗑️ Papierkorb {trashed.length>0&&`(${trashed.length})`}</button>
                <button onClick={()=>setShowParentCompose(v=>!v)} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',background:showParentCompose?'#7c3aed':'rgba(255,255,255,0.07)',color:showParentCompose?'white':'rgba(255,255,255,0.5)'}}>✉️ Schreiben</button>
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
                ? <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}><p style={{color:'rgba(255,255,255,0.2)',margin:0}}>{showTrash?'Papierkorb ist leer.':'Keine Nachrichten.'}</p></div>
                : <div style={{display:'grid',gap:'8px'}}>
                    {items.map(n=>{
                      const typeColors={achievement:{bg:'rgba(74,222,128,0.08)',border:'rgba(74,222,128,0.25)',icon:'🏅'},tournament_reminder:{bg:'rgba(253,230,138,0.08)',border:'rgba(253,230,138,0.25)',icon:'🏆'},training_reminder:{bg:'rgba(96,165,250,0.08)',border:'rgba(96,165,250,0.25)',icon:'📅'},unexcused_absences:{bg:'rgba(248,113,113,0.08)',border:'rgba(248,113,113,0.25)',icon:'❗'},trainer_message:{bg:'rgba(196,181,253,0.08)',border:'rgba(196,181,253,0.25)',icon:'💬'}};
                      const cfg2=typeColors[n.type]||{bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.1)',icon:'🔔'};
                      const dateStr=new Date(n.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                      return (
                        <div key={n.id} style={{background:cfg2.bg,border:`1px solid ${cfg2.border}`,borderRadius:'12px',padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:'10px'}}>
                          <span style={{fontSize:'20px',flexShrink:0,marginTop:'1px'}}>{cfg2.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:'0 0 3px',fontWeight:'700',fontSize:'14px',color:'white'}}>{n.title}</p>
                            <p style={{margin:'0 0 5px',fontSize:'13px',color:'rgba(255,255,255,0.55)',lineHeight:'1.4'}}>{n.message}</p>
                            <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>{dateStr}</p>
                          </div>
                          {showTrash
                            ?<div style={{display:'flex',gap:'4px',flexShrink:0}}>
                                <button onClick={()=>restoreNotification(n.id)} style={{padding:'5px 9px',background:'rgba(74,222,128,0.12)',border:'none',borderRadius:'8px',cursor:'pointer',color:'#4ade80',fontSize:'13px',fontWeight:'700'}}>↩</button>
                                <button onClick={()=>deleteNotificationPermanently(n.id)} style={{padding:'5px',background:'rgba(220,38,38,0.12)',border:'none',borderRadius:'8px',cursor:'pointer',color:'#f87171'}}><Trash2 size={14}/></button>
                              </div>
                            :<button onClick={()=>trashNotification(n.id)} style={{padding:'5px',background:'rgba(255,255,255,0.06)',border:'none',borderRadius:'8px',cursor:'pointer',color:'rgba(255,255,255,0.3)',flexShrink:0}}><X size={16}/></button>
                          }
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          );
        }
        if (elternSubView === 'trainingsverlauf') {
          if (!myChild) return null;
          return (
            <>
              <h3 style={{margin:'0 0 12px',color:'white',fontWeight:'800',fontSize:'16px'}}>📋 Verlauf ({dates.length} Einträge)</h3>
              <div style={{display:'grid',gap:'8px',marginBottom:'24px'}}>
                {dates.length===0
                  ? <div style={{...DARK_CARD,textAlign:'center',padding:'32px'}}><p style={{color:'rgba(255,255,255,0.2)',margin:0}}>Noch keine Trainings erfasst.</p></div>
                  : dates.map(date=>{
                    const status=(myChild.attendance||{})[date];
                    const cfg=STATUS_CONFIG[status];
                    const sess2=dateToSession[date];
                    const grpNames=[...new Set((sess2?.subgroupIds||[]).map(sid=>{const sg=subgroups[sid];const fg=sg?FIXED_GROUPS.find(g=>g.id===sg.groupId):null;return fg?`${fg.emoji} ${fg.name}`:null;}).filter(Boolean))];
                    const statusBg=status==='present'?'rgba(74,222,128,0.08)':status==='absent_excused'?'rgba(148,163,184,0.07)':status==='absent_unexcused'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.03)';
                    const statusBorder=status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.18)':status==='absent_unexcused'?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.07)';
                    return (
                      <div key={date} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:statusBg,borderRadius:'10px',border:`1px solid ${statusBorder}`,gap:'8px',flexWrap:'wrap'}}>
                        <div>
                          <span style={{fontSize:'14px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>{new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</span>
                          {grpNames.length>0&&<span style={{display:'block',fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'1px'}}>📂 {grpNames.join(', ')}</span>}
                        </div>
                        <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                          <span style={{fontSize:'13px',fontWeight:'700',color:cfg?.color||'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.06)',padding:'4px 12px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.1)'}}>{cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}</span>
                          {status==='absent_unexcused'&&<button onClick={()=>excuseMyChild(date)} style={{padding:'6px 12px',background:'rgba(148,163,184,0.12)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'8px',cursor:'pointer',color:'#94a3b8',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px'}}><Clock size={13}/> Entschuldigen</button>}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          );
        }
        if (elternSubView === 'mannschaft') {
          const myTeam=Object.values(teams).find(t=>(t.childIds||[]).includes(myChild?.id));
          if (!myChild||!myTeam) return <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}><p style={{color:'rgba(255,255,255,0.3)',margin:0}}>Keine Mannschaft zugewiesen.</p></div>;
          const ld=myTeam.leagueData||{};
          const colSt=(i)=>({padding:'8px 10px',fontSize:'12px',color:i===0?'white':'rgba(255,255,255,0.7)',fontWeight:i<2?'700':'400',textAlign:i>1?'center':'left',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.05)'});
          const hSt=(i)=>({...colSt(i),color:'rgba(255,255,255,0.35)',fontWeight:'700',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.1)'});
          const spSt=(i)=>({padding:'8px 10px',fontSize:'12px',color:i===3?'#86efac':'rgba(255,255,255,0.7)',fontWeight:i===3?'700':'400',textAlign:i===3?'center':'left',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.05)'});
          const spH=(i)=>({...spSt(i),color:'rgba(255,255,255,0.35)',fontWeight:'700',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.1)'});
          const fetchedStr=ld.fetchedAt?new Date(ld.fetchedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
          return (
            <>
              <div style={{...DARK_CARD_TEAL,marginBottom:'20px'}}>
                <p style={{margin:'0 0 4px',fontWeight:'800',color:'white',fontSize:'18px'}}>🏓 {myTeam.name}</p>
                {myTeam.liga&&<p style={{margin:0,fontSize:'14px',color:'rgba(45,212,191,0.7)',fontWeight:'600'}}>{myTeam.liga}</p>}
              </div>
              {(myTeam.childIds||[]).length>0&&(
                <div style={{...DARK_CARD,marginBottom:'20px'}}>
                  <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Mannschaftskollegen</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {(myTeam.childIds||[]).map(id=>{const c2=children[id];return c2?<span key={id} style={{fontSize:'12px',background:'rgba(45,212,191,0.15)',border:'1px solid rgba(45,212,191,0.3)',color:'#2dd4bf',borderRadius:'20px',padding:'3px 10px',fontWeight:'600'}}>{c2.name}</span>:null;})}
                  </div>
                </div>
              )}
              {ld.table&&(
                <div style={{...DARK_CARD,marginBottom:'20px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                    <p style={{margin:0,fontSize:'12px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Tabelle</p>
                    {fetchedStr&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>Stand: {fetchedStr}</span>}
                  </div>
                  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'8px',background:'rgba(0,0,0,0.2)'}}>
                    <table style={{borderCollapse:'collapse',minWidth:'420px'}}>
                      {ld.table.headers?.length>0&&<thead><tr>{ld.table.headers.map((h,i)=><th key={i} style={hSt(i)}>{h}</th>)}</tr></thead>}
                      <tbody>{(ld.table.rows||[]).map((row,ri)=>{const cells=row.c||row;return<tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,0.02)'}}>{cells.map((cell,ci)=><td key={ci} style={colSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {ld.schedule&&(
                <div style={{...DARK_CARD,marginBottom:'20px'}}>
                  <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielplan</p>
                  <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'8px',background:'rgba(0,0,0,0.2)'}}>
                    <table style={{borderCollapse:'collapse',minWidth:'520px'}}>
                      {ld.schedule.headers?.length>0&&<thead><tr>{ld.schedule.headers.map((h,i)=><th key={i} style={spH(i)}>{h}</th>)}</tr></thead>}
                      <tbody>{(ld.schedule.rows||[]).map((row,ri)=>{const cells=row.c||row;return<tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,0.02)'}}>{cells.map((cell,ci)=><td key={ci} style={spSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {!ld.table&&!ld.schedule&&<p style={{color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'20px',margin:0}}>Noch keine Liga-Daten geladen.</p>}
            </>
          );
        }
        if (elternSubView === 'turniere') {
          const myTournaments=getMyUpcomingTournaments();
          return (
            <>
              {myTournaments.length===0
                ? <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}><p style={{color:'rgba(255,255,255,0.2)',margin:0}}>Kein Turnier in den nächsten 3 Monaten.</p></div>
                : <div style={{display:'grid',gap:'12px'}}>
                  {myTournaments.map(t=>{
                    const childId=myChild?.id;
                    const myResponse=(t.responses||{})[childId];
                    const myKonkurrenzen=(t.konkurrenzen||[]).filter(k=>(k.participantIds||[]).includes(childId));
                    const borderCol=myResponse==='coming'?'rgba(74,222,128,0.4)':myResponse==='missing'?'rgba(248,113,113,0.4)':'rgba(253,230,138,0.25)';
                    const bgCol=myResponse==='coming'?'rgba(74,222,128,0.07)':myResponse==='missing'?'rgba(248,113,113,0.07)':'rgba(253,230,138,0.04)';
                    return (
                      <div key={t.id} style={{borderRadius:'14px',border:`2px solid ${borderCol}`,background:bgCol,overflow:'hidden'}}>
                        <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(253,230,138,0.1)'}}>
                          <p style={{margin:'0 0 3px',fontWeight:'800',color:'#fde68a',fontSize:'16px'}}>🏆 {t.name}</p>
                          <p style={{margin:'0 0 3px',fontSize:'14px',color:'rgba(255,255,255,0.6)',fontWeight:'600'}}>{(()=>{const from=t.dateFrom||t.date||'';const to=t.dateTo||from;if(!from)return'';const f=new Date(from+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});if(to===from)return f;return`${f} – ${new Date(to+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}`;})()}</p>
                          {t.location&&<p style={{margin:0,fontSize:'13px',color:'rgba(253,230,138,0.5)'}}>📍 {t.location}</p>}
                        </div>
                        {myKonkurrenzen.length>0&&<div style={{padding:'10px 16px',borderBottom:'1px solid rgba(253,230,138,0.1)',display:'grid',gap:'6px'}}>{myKonkurrenzen.map(konk=>{const dep=konk.departureTimes?.[childId];return(<div key={konk.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'rgba(253,230,138,0.07)',borderRadius:'8px'}}><span style={{fontWeight:'700',color:'#fde68a',fontSize:'14px'}}>{konk.name||'Konkurrenz'}</span><div style={{display:'flex',gap:'12px',alignItems:'center'}}><span style={{fontSize:'13px',color:'rgba(253,230,138,0.6)',display:'inline-flex',alignItems:'center',gap:'3px'}}><Clock size={12}/> {konk.time} Uhr</span>{dep&&<span style={{fontSize:'13px',color:'#fde68a',fontWeight:'700',display:'inline-flex',alignItems:'center',gap:'3px'}}>🚗 {dep} Uhr</span>}</div></div>);})}</div>}
                        <div style={{padding:'12px 16px',display:'flex',gap:'8px'}}>
                          <button onClick={()=>respondToTournament(t.id,'coming')} style={{flex:1,padding:'10px',border:'2px solid #16a34a',background:myResponse==='coming'?'#16a34a':'transparent',color:myResponse==='coming'?'white':'#4ade80',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><Check size={18}/> Ich bin dabei</button>
                          <button onClick={()=>respondToTournament(t.id,'missing')} style={{flex:1,padding:'10px',border:'2px solid #dc2626',background:myResponse==='missing'?'#dc2626':'transparent',color:myResponse==='missing'?'white':'#f87171',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><X size={18}/> Ich fehle</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </>
          );
        }
        if (elternSubView === 'rangliste') {
          return (
            <>
              {rangliste.length===0
                ? <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}><p style={{color:'rgba(255,255,255,0.3)',margin:0}}>Noch keine Ranglisten-Daten vorhanden.</p></div>
                : <RanglisteTile rangliste={rangliste} myChildId={myChild?.id} children={children} subgroups={subgroups} alwaysOpen={true}/>
              }
            </>
          );
        }
        if (elternSubView === 'errungenschaften') {
          if (!myChild||grp?.id!=='jugend') return <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}><p style={{color:'rgba(255,255,255,0.3)',margin:0}}>Nicht verfügbar.</p></div>;
          const ach=getAchievements(myChild.id);
          const ttrUnlocked=ach.ttrUnlocked||[];
          const currentMonth=new Date().toISOString().slice(0,7);
          const currentLevel=getMonthlyAttendanceLevel(myChild.id,currentMonth);
          const cumul=getAttendanceCumulatives(myChild.id);
          const monthName=new Date().toLocaleDateString('de-DE',{month:'long',year:'numeric'});
          const totalTrainings=getTotalTrainingsAttended(myChild.id);
          const streak=getLongestStreak(myChild.id);
          const tournParts=getTournamentParticipations(myChild.id);
          const openCount=(icon,title,desc,count)=>setAchievementPopup({icon,title,desc,count});

          // ── Neue Design-Komponenten ──
          const SH=({icon,title,mt=true})=>(
            <div style={{display:'flex',alignItems:'center',gap:'8px',margin:`${mt?'24px':0} 0 10px`}}>
              <div style={{height:'1px',width:'16px',background:'rgba(255,255,255,0.12)'}}/>
              <span style={{fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'1.5px',whiteSpace:'nowrap'}}>{icon} {title}</span>
              <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.06)'}}/>
            </div>
          );

          // Vollbreite Zeilen-Karte
          const AC=({icon,title,sub,note,has,onClick,accent='#fbbf24',acBg='rgba(251,191,36,0.08)',acBorder='rgba(251,191,36,0.22)'})=>(
            <button onClick={onClick} style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'14px',border:`1.5px solid ${has?acBorder:'rgba(255,255,255,0.06)'}`,background:has?acBg:'rgba(255,255,255,0.025)',cursor:'pointer',textAlign:'left',transition:'all 0.12s',marginBottom:'6px'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateX(2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';}}>
              <div style={{width:'42px',height:'42px',borderRadius:'11px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',background:has?`${acBg.replace('0.08','0.15')}`:'rgba(255,255,255,0.05)',border:`1px solid ${has?acBorder:'rgba(255,255,255,0.08)'}`}}>
                {has?icon:'🔒'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:'0 0 1px',fontWeight:'800',fontSize:'14px',color:has?'white':'rgba(255,255,255,0.3)',lineHeight:'1.2'}}>{title}</p>
                {sub&&<p style={{margin:0,fontSize:'12px',color:has?accent:'rgba(255,255,255,0.2)',fontWeight:'600'}}>{sub}</p>}
                {note&&!has&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.18)'}}>{note}</p>}
              </div>
              {has&&<span style={{fontSize:'18px',flexShrink:0,color:accent}}>✓</span>}
              {!has&&<span style={{fontSize:'13px',flexShrink:0,color:'rgba(255,255,255,0.15)'}}>🔒</span>}
            </button>
          );

          // Kompakte Chips-Reihe (für TTR, Rangliste-Tiers etc.)
          const ChipRow=({children})=><div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>{children}</div>;

          return (
            <div>
              {/* ── TTR Meilensteine ── */}
              <SH icon="🏓" title="TTR Meilensteine" mt={false}/>
              <ChipRow>
                {TTR_MILESTONES.map((val)=>{const unlocked=ttrUnlocked.includes(val);return(
                  <button key={val} onClick={()=>setAchievementPopup({icon:unlocked?'🏓':'🔒',title:`${val} TTR`,desc:unlocked?ACHIEVEMENT_DESCRIPTIONS.ttr(val):`Noch nicht erreicht. Erreiche ${val} TTR-Punkte!`})}
                    style={{padding:'7px 12px',borderRadius:'10px',border:`1.5px solid ${unlocked?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.08)'}`,background:unlocked?'rgba(74,222,128,0.1)':'rgba(255,255,255,0.03)',color:unlocked?'#4ade80':'rgba(255,255,255,0.22)',fontWeight:'800',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',transition:'transform 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                    {unlocked&&<span>🏓</span>}{val}
                  </button>
                );})}
              </ChipRow>

              {/* ── Trainings-Meilensteine ── */}
              <SH icon="🏋️" title="Trainings-Meilensteine"/>
              {[10,25,50,100,200,500,1000].map(m=>{const has=totalTrainings>=m;return<AC key={m} icon="🏋️" title={`${m} Trainings absolviert`} sub={has?`Erreicht! (${totalTrainings} gesamt)`:`${totalTrainings} von ${m}`} has={has} accent="#4ade80" acBg="rgba(74,222,128,0.07)" acBorder="rgba(74,222,128,0.2)" onClick={()=>setAchievementPopup({icon:'🏋️',title:`${m} Trainings`,desc:`Du hast insgesamt ${m} Trainingseinheiten absolviert! Aktuell: ${totalTrainings} Trainings.`})}/>;} )}
              {[5,10,20,30,50].map(m=>{const has=streak>=m;return<AC key={`str${m}`} icon="🔥" title={`${m}er Trainingsserie`} sub={has?`Erreicht! (Längste Serie: ${streak})`:`Längste Serie: ${streak}/${m}`} has={has} accent="#fb923c" acBg="rgba(251,146,60,0.07)" acBorder="rgba(251,146,60,0.22)" onClick={()=>setAchievementPopup({icon:'🔥',title:`${m}er Trainingsserie`,desc:`${m} Trainingseinheiten in Folge ohne Fehlzeit! Deine längste Serie: ${streak} Einheiten.`})}/>;} )}

              {/* ── Turnier-Teilnahmen ── */}
              <SH icon="🏆" title="Turnier-Teilnahmen"/>
              {[1,5,10,20].map(m=>{const has=tournParts>=m;return<AC key={m} icon="🏆" title={`${m} Turnier${m>1?'e':''} teilgenommen`} sub={has?'Erreicht!':`${tournParts} von ${m}`} has={has} accent="#fde68a" acBg="rgba(253,230,138,0.07)" acBorder="rgba(253,230,138,0.22)" onClick={()=>setAchievementPopup({icon:'🏆',title:`${m} Turnier${m>1?'e':''}`,desc:`Du hast an ${m} Turnier${m>1?'en':''} teilgenommen! Bisher: ${tournParts}.`})}/>;} )}

              {/* ── Turnierergebnisse (Einzel & Doppel zusammen) ── */}
              <SH icon="🎖️" title="Turnierergebnisse"/>
              <div style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',overflow:'hidden',marginBottom:'6px'}}>
                <div style={{padding:'7px 14px',background:'rgba(253,230,138,0.05)',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:'10px',fontWeight:'800',color:'rgba(253,230,138,0.5)',letterSpacing:'1.5px'}}>EINZEL</div>
                <div style={{padding:'6px 8px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  {[{icon:'🥇',title:'1. Platz Einzel',field:'einzel1',desc:ACHIEVEMENT_DESCRIPTIONS.einzel1},{icon:'🥈',title:'2. Platz Einzel',field:'einzel2',desc:ACHIEVEMENT_DESCRIPTIONS.einzel2},{icon:'🥉',title:'3. Platz Einzel',field:'einzel3',desc:ACHIEVEMENT_DESCRIPTIONS.einzel3}].map(({icon,title,field,desc})=>{const count=ach[field]||0;return<AC key={field} icon={icon} title={title} sub={count>0?`${count}× erreicht`:undefined} note="Noch kein Podestplatz im Einzel" has={count>0} accent="#fde68a" acBg="rgba(253,230,138,0.07)" acBorder="rgba(253,230,138,0.22)" onClick={()=>openCount(icon,title,desc,count)}/>;} )}
                </div>
                <div style={{padding:'7px 14px',background:'rgba(103,232,249,0.04)',borderTop:'1px solid rgba(255,255,255,0.06)',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:'10px',fontWeight:'800',color:'rgba(103,232,249,0.5)',letterSpacing:'1.5px'}}>DOPPEL</div>
                <div style={{padding:'6px 8px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  {[{icon:'🥇',title:'1. Platz Doppel',field:'doppel1',desc:ACHIEVEMENT_DESCRIPTIONS.doppel1},{icon:'🥈',title:'2. Platz Doppel',field:'doppel2',desc:ACHIEVEMENT_DESCRIPTIONS.doppel2},{icon:'🥉',title:'3. Platz Doppel',field:'doppel3',desc:ACHIEVEMENT_DESCRIPTIONS.doppel3}].map(({icon,title,field,desc})=>{const count=ach[field]||0;return<AC key={field} icon={icon} title={title} sub={count>0?`${count}× erreicht`:undefined} note="Noch kein Podestplatz im Doppel" has={count>0} accent="#67e8f9" acBg="rgba(103,232,249,0.07)" acBorder="rgba(103,232,249,0.22)" onClick={()=>openCount(icon,title,desc,count)}/>;} )}
                </div>
              </div>

              {/* ── Mannschaftsmeisterschaft ── */}
              <SH icon="🏆" title="Mannschaftsmeisterschaft"/>
              {(()=>{const count=ach['team']||0;return<AC icon='🏆' title='Mannschaftsmeisterschaft' sub={count>0?`${count}× Meister!`:undefined} note="Gewinne eine Meisterschaft mit deiner Mannschaft" has={count>0} accent="#fbbf24" acBg="rgba(251,191,36,0.08)" acBorder="rgba(251,191,36,0.25)" onClick={()=>openCount('🏆','Meisterschaft',ACHIEVEMENT_DESCRIPTIONS.team,count)}/>;})()}

              {/* ── Spieler des Monats / Jahres ── */}
              <SH icon="⭐" title="Spieler des Monats / Jahres"/>
              {(spielerDesMonatsWins[myChild.id]||[]).length>0
                ? (spielerDesMonatsWins[myChild.id]||[]).map(w=>{
                    const isYear=w.type==='year';
                    const lbl=isYear?`Spieler des Jahres ${w.period}`:`Spieler des Monats ${fmtYM(w.period)}`;
                    return<AC key={`${w.type}-${w.period}`} icon={isYear?'👑':'⭐'} title={lbl} sub="Ausgezeichnet!" has={true} accent="#fcd34d" acBg="rgba(252,211,77,0.07)" acBorder="rgba(252,211,77,0.3)" onClick={()=>openCount(isYear?'👑':'⭐',lbl,isYear?`Spieler des Jahres ${w.period}!`:`Spieler des Monats ${fmtYM(w.period)}!`,1)}/>;
                  })
                : <AC icon='⭐' title='Spieler des Monats' note="Erziele die größte TTR-Verbesserung im Monat" has={false} onClick={()=>openCount('⭐','Spieler des Monats','Werde Spieler des Monats mit der größten TTR-Verbesserung im Monat!',0)}/>
              }

              {/* ── Anwesenheit aktueller Monat ── */}
              <SH icon="📆" title={`Anwesenheit ${monthName}`}/>
              {(()=>{const attCfgMap={gold:{icon:'🥇',color:'#fde68a',acBg:'rgba(253,230,138,0.08)',acBorder:'rgba(253,230,138,0.3)',label:'Gold (100% Anwesenheit)',accent:'#fde68a'},silver:{icon:'🥈',color:'rgba(255,255,255,0.7)',acBg:'rgba(255,255,255,0.06)',acBorder:'rgba(255,255,255,0.2)',label:'Silber (≥ 90%)',accent:'rgba(255,255,255,0.6)'},bronze:{icon:'🥉',color:'#fb923c',acBg:'rgba(251,146,60,0.07)',acBorder:'rgba(251,146,60,0.25)',label:'Bronze (≥ 80%)',accent:'#fb923c'}};const cfg3=currentLevel?attCfgMap[currentLevel]:null;return<AC icon={cfg3?cfg3.icon:'📅'} title={monthName} sub={cfg3?cfg3.label:undefined} note="Mind. 80% Anwesenheit für Bronze" has={!!cfg3} accent={cfg3?.accent||'#fbbf24'} acBg={cfg3?.acBg||'rgba(251,191,36,0.07)'} acBorder={cfg3?.acBorder||'rgba(251,191,36,0.2)'} onClick={()=>setAchievementPopup({icon:cfg3?cfg3.icon:'📅',title:monthName,desc:cfg3?cfg3.label:'Noch nicht genug Trainings besucht (mind. 80% für Bronze).'})}/>;})()}

              {/* ── Anwesenheits-Monate Gesamt ── */}
              <SH icon="📊" title="Anwesenheits-Monate (Gesamt)"/>
              {[{icon:'🥇',title:'Gold-Monate',count:cumul.gold,accent:'#fde68a',acBg:'rgba(253,230,138,0.07)',acBorder:'rgba(253,230,138,0.22)',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceGold},{icon:'🥈',title:'Silber-Monate',count:cumul.silver,accent:'rgba(255,255,255,0.6)',acBg:'rgba(255,255,255,0.06)',acBorder:'rgba(255,255,255,0.18)',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceSilver},{icon:'🥉',title:'Bronze-Monate',count:cumul.bronze,accent:'#fb923c',acBg:'rgba(251,146,60,0.07)',acBorder:'rgba(251,146,60,0.22)',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceBronze}].map(({icon,title,count,accent,acBg,acBorder,desc})=>(<AC key={title} icon={icon} title={title} sub={count>0?`${count}× ${title.split('-')[0].toLowerCase()} Monat${count!==1?'e':''}`:undefined} note="Noch kein Monat mit diesem Rang" has={count>0} accent={accent} acBg={acBg} acBorder={acBorder} onClick={()=>openCount(icon,title,desc,count)}/>))}

              {/* ── Rangliste ── */}
              {rangliste.length>0&&rangliste.includes(myChild.id)&&(()=>{
                const rAch=getRanglisteAch(myChild.id);const myRank=rangliste.indexOf(myChild.id)+1;
                return(
                  <>
                    <SH icon="📊" title="Rangliste – Erstmals erreicht"/>
                    {RANK_TIERS.map(t=>{const has=!!rAch.reached?.[t.key];const date=rAch.reached?.[t.key];return(
                      <AC key={t.key} icon={t.icon} title={t.label} sub={has&&date?`Erstmals am ${new Date(date).toLocaleDateString('de-DE')} erreicht`:undefined} note={`Noch nicht erreicht. Aktuell: Platz #${myRank}`} has={has} accent="#4ade80" acBg="rgba(74,222,128,0.07)" acBorder="rgba(74,222,128,0.2)" onClick={()=>setAchievementPopup({icon:has?t.icon:'🔒',title:t.label,desc:has?`Erstmals am ${new Date(date).toLocaleDateString('de-DE')} erreicht!`:`Noch nicht erreicht. Aktuell: Platz #${myRank}`})}/>
                    );})}
                    <SH icon="📅" title="Rangliste – Wochen im Tier"/>
                    {RANK_TIERS.map(t=>{const wk=rAch.weeks?.[t.key]?.count||0;return(
                      <AC key={t.key} icon={t.icon} title={t.label} sub={wk>0?`${wk} Woche${wk!==1?'n':''} in diesem Tier`:undefined} note="Noch keine Wochen in diesem Tier" has={wk>0} accent="#4ade80" acBg="rgba(74,222,128,0.07)" acBorder="rgba(74,222,128,0.2)" onClick={()=>setAchievementPopup({icon:t.icon,title:`Wochen ${t.label}`,desc:`Du hast insgesamt ${wk} Woche${wk!==1?'n':''} in der ${t.label} verbracht.`,count:wk})}/>
                    );})}

                  </>
                );
              })()}
            </div>
          );
        }
        return null;
      };

      return (
        <div className="ttc-view-enter" key={`${viewKey}-sub-${elternSubView}`} style={{minHeight:'100vh',background:meta.bg,fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
          <AchievementPopup data={achievementPopup} onClose={()=>setAchievementPopup(null)}/>
          {ptDetailModal&&(()=>{
            const mpt=ptDetailModal;const mPlayers=mpt.players||[];const mMatches=mpt.matches||[];const isArchived=!!mpt.archivedAt;
            const placeEmojiM=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            const mStats=mPlayers.map((_,i)=>({idx:i,wins:0,losses:0,setsWon:0,setsLost:0}));
            mMatches.forEach(m=>{if(!m.result)return;const{sets1,sets2}=m.result;mStats[m.p1Idx].setsWon+=sets1;mStats[m.p1Idx].setsLost+=sets2;mStats[m.p2Idx].setsWon+=sets2;mStats[m.p2Idx].setsLost+=sets1;if(sets1>sets2){mStats[m.p1Idx].wins++;mStats[m.p2Idx].losses++;}else{mStats[m.p2Idx].wins++;mStats[m.p1Idx].losses++;}});
            const mStandings=(mpt.finalStandings||(()=>[...mStats].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)).map((s,place)=>({place:place+1,childId:mPlayers[s.idx]?.childId,name:mPlayers[s.idx]?.name||'?',wins:s.wins,losses:s.losses,setsWon:s.setsWon,setsLost:s.setsLost})))());
            const numRoundsM=mPlayers.length%2===0?mPlayers.length-1:mPlayers.length;
            const roundsM=Array.from({length:numRoundsM},(_,i)=>i+1);
            return(<div onClick={()=>setPtDetailModal(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}><div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(170deg,#021a0a 0%,#042d12 100%)',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',padding:'20px 16px 36px',border:'1px solid rgba(167,139,250,0.2)',borderBottom:'none'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}><span style={{fontWeight:'800',color:'white',fontSize:'17px'}}>{mPlayers.length}er Gruppe</span><button onClick={()=>setPtDetailModal(null)} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.08)',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div><div style={{display:'grid',gap:'4px',marginBottom:'20px'}}>{mStandings.map(s=>(<div key={s.childId||s.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:'10px'}}><span style={{fontSize:'18px',flexShrink:0}}>{placeEmojiM[s.place-1]||(s.place+'.')}</span><div><p style={{margin:0,fontWeight:'800',color:'white',fontSize:'13px'}}>{s.name}</p><p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{s.wins}S {s.losses}N</p></div></div>))}</div></div></div>);
          })()}
          {/* ── Top-Bar (volle Breite, farbig sticky) ── */}
          <div className="ttc-sticky-hdr" style={{background:meta.hdrBg,borderBottom:`1px solid ${meta.border}`,padding:isMobile?'12px 16px':'16px 28px',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setElternSubView(null)} style={{width:'36px',height:'36px',borderRadius:'10px',background:`rgba(255,255,255,0.08)`,border:`1px solid ${meta.border}`,color:meta.color,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'18px',letterSpacing:'-0.3px'}}>{meta.icon} {meta.label}</h2>
              <p style={{margin:0,color:meta.colorFaint,fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{myChild?.name||''} · {userRole==='eltern'?'Eltern-Portal':'Jugend-Portal'}</p>
            </div>
            <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px',background:'rgba(255,255,255,0.06)',border:`1px solid ${meta.border}`,borderRadius:'10px',color:'rgba(255,255,255,0.5)',fontSize:isMobile?'16px':'12px',fontWeight:'600',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'⚙️':'⚙️ Profil'}</button>
            <button onClick={()=>signOut(auth)} style={{padding:'8px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🚪':'Abmelden'}</button>
          </div>
          <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'20px 14px 40px':'24px 24px 60px'}}>
            {renderSubContent()}
          </div>
          {/* Profil-Modal */}
          {showProfile&&(<Modal><div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}><div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}><h3 style={{margin:'0 0 2px',color:'white',fontSize:'20px',fontWeight:'800'}}>Mein Profil</h3><p style={{margin:'0 0 22px',color:'rgba(255,255,255,0.35)',fontSize:'13px'}}>{user?.email}</p><h4 style={{margin:'0 0 10px',color:'#4ade80',fontSize:'13px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px'}}>Passwort ändern</h4>{pwSuccess&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'10px',fontSize:'13px',color:'#4ade80',fontWeight:'600'}}>✅ Passwort erfolgreich geändert!</div>}{pwError&&<div style={{marginBottom:'12px',padding:'10px 14px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',fontSize:'13px',color:'#fca5a5'}}>{pwError}</div>}<div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px'}}><input type="password" placeholder="Aktuelles Passwort" value={pwCurrent} onChange={e=>setPwCurrent(e.target.value)} style={inputStyle}/><input type="password" placeholder="Neues Passwort (min. 6 Zeichen)" value={pwNew} onChange={e=>setPwNew(e.target.value)} style={inputStyle}/><input type="password" placeholder="Neues Passwort bestätigen" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleChangePassword()} style={inputStyle}/><button onClick={handleChangePassword} style={{padding:'11px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>Passwort ändern</button></div><button onClick={()=>{setShowProfile(false);setPwError('');setPwSuccess(false);setPwCurrent('');setPwNew('');setPwConfirm('');}} style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>Schließen</button></div></div></Modal>)}
        </div>
      );
    }

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <AchievementPopup data={achievementPopup} onClose={()=>setAchievementPopup(null)}/>

        {/* Profil-Modal */}
        {showProfile&&(
          <Modal>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
            <div style={{background:'#0a2210',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'20px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.7)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
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
          </Modal>
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
              {(()=>{const ids=getMyLinkedChildIds();if(ids.length<2)return null;const cur=activeChildId&&ids.includes(activeChildId)?activeChildId:ids[0];const curName=children[cur]?.name?.split(' ')[0]||'Kind';return <button onClick={()=>{const idx=ids.indexOf(cur);setActiveChildId(ids[(idx+1)%ids.length]);}} style={{padding:'8px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#86efac',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🔄':`🔄 ${curName}`}</button>;})()}
              <button onClick={()=>{setShowProfile(true);setPwSuccess(false);}} style={{padding:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.6)',fontSize:isMobile?'16px':'12px',fontWeight:'600',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'⚙️':'⚙️ Profil'}</button>
              <button onClick={()=>signOut(auth)} style={{padding:'8px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'10px',color:'#fca5a5',fontSize:isMobile?'16px':'12px',fontWeight:'700',cursor:'pointer',minWidth:'36px',textAlign:'center'}}>{isMobile?'🚪':'Abmelden'}</button>
            </div>
          </div>

          {/* ── Greeting (kompakt) ── */}
          <div style={{marginBottom:'16px',display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
            <h1 style={{margin:0,color:'white',fontSize:'18px',fontWeight:'800',letterSpacing:'-0.4px'}}>
              {greeting}, <span style={{color:'#4ade80'}}>{myChild?myChild.name.split(' ')[0]:(userProfile?.name||'').split(' ')[0]||'Hallo'}</span> 👋
            </h1>
            <span style={{color:'rgba(74,222,128,0.4)',fontSize:'11px',fontWeight:'600'}}>{dateLabel}</span>
          </div>

          {/* ── Back-Button wenn Sub-View aktiv ── */}
          {elternSubView && (
            <button onClick={()=>setElternSubView(null)}
              style={{display:'flex',alignItems:'center',gap:'8px',background:'none',border:'none',color:'rgba(74,222,128,0.7)',cursor:'pointer',fontSize:'14px',fontWeight:'700',padding:'0 0 20px',marginTop:'-8px'}}>
              <ArrowLeft size={16}/> Zurück zur Übersicht
            </button>
          )}

          {/* ── Kind-Info (kompakt) ── */}
          {myChild && !elternSubView && (
            <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'14px',padding:'11px 14px',marginBottom:'16px'}}>
              {/* Zeile 1: Name + Gruppe + TTR */}
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                <span style={{fontWeight:'800',fontSize:'15px',color:grp?.color||'#4ade80'}}>{myChild.name}</span>
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>{grp?.emoji} {sub?.name}</span>
                <div style={{flex:1}}/>
                {(()=>{const hist=ttrHistory[myChild.id]?.entries;if(!hist||hist.length===0)return null;
                  const last=hist[hist.length-1];const prev=hist.length>1?hist[hist.length-2]:null;
                  const diff=prev?last.ttr-prev.ttr:null;
                  return(
                  <div style={{display:'flex',alignItems:'baseline',gap:'5px'}}>
                    <span style={{fontSize:'10px',fontWeight:'700',color:'rgba(251,191,36,0.5)',flexShrink:0}}>Stand {last.month}:</span>
                    <span style={{fontSize:'15px',fontWeight:'900',color:'#fbbf24'}}>{last.ttr}</span>
                    {diff!==null&&<span style={{fontSize:'11px',fontWeight:'700',color:diff>=0?'#4ade80':'#f87171'}}>{diff>=0?'+':''}{diff}</span>}
                  </div>
                );})()}
              </div>
              {/* Zeile 2: Anwesenheitsbalken + Zahlen */}
              {stats && (
                <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'10px',fontWeight:'700',color:'rgba(74,222,128,0.45)',textTransform:'uppercase',letterSpacing:'0.8px',flexShrink:0}}>Anwesenheit</span>
                  <div style={{flex:1,background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'5px',overflow:'hidden'}}>
                    <div style={{width:`${stats.percent}%`,height:'100%',background:stats.percent>=80?'linear-gradient(90deg,#16a34a,#4ade80)':stats.percent>=60?'linear-gradient(90deg,#d97706,#fde68a)':'linear-gradient(90deg,#dc2626,#f87171)',borderRadius:'99px'}}/>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:'800',color:stats.percent>=80?'#4ade80':stats.percent>=60?'#fde68a':'#f87171',flexShrink:0}}>{stats.percent}%</span>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',flexShrink:0}}>({stats.present}/{stats.total})</span>
                </div>
              )}
            </div>
          )}

          {/* ── Kommende Trainings (prominenteste Kachel) ── */}
          {myChild && !elternSubView && mySessions.length > 0 && (
            <div style={{background:'rgba(74,222,128,0.05)',border:'1.5px solid rgba(74,222,128,0.22)',borderRadius:'16px',marginBottom:'20px',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(74,222,128,0.12)',display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'16px'}}>📅</span>
                <span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>Kommende Trainings</span>
                <span style={{marginLeft:'auto',fontSize:'11px',color:'rgba(74,222,128,0.5)',fontWeight:'600'}}>{mySessions.length} Termin{mySessions.length>1?'e':''}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'1px'}}>
                {mySessions.map((session,si)=>{
                  const childId=myChild.id;
                  const myResponseRaw=(session.responses||{})[childId];
                  const myResponse=typeof myResponseRaw==='object'?myResponseRaw?.status:myResponseRaw;
                  const sessSubIds=session.subgroupIds||[];
                  const sessGrpNames=[...new Set(sessSubIds.map(sid=>{const sg=subgroups[sid];const fg=sg?FIXED_GROUPS.find(g=>g.id===sg.groupId):null;return fg?`${fg.emoji} ${fg.name}`:null;}).filter(Boolean))];
                  const isComing=myResponse==='coming'; const isMissing=myResponse==='missing';
                  const todayStr=new Date().toISOString().split('T')[0];
                  const isToday=session.date===todayStr;
                  return (
                    <div key={session.id} style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:isMissing?'rgba(248,113,113,0.06)':isComing?'rgba(74,222,128,0.04)':'transparent',borderTop:si>0?'1px solid rgba(255,255,255,0.05)':'none'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'3px'}}>
                          <span style={{fontWeight:'800',color:'white',fontSize:'15px'}}>{new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'})}</span>
                          <span style={{fontWeight:'700',color:'rgba(74,222,128,0.8)',fontSize:'14px'}}>{session.time} Uhr</span>
                          {isToday&&<span style={{fontSize:'10px',background:'rgba(74,222,128,0.2)',color:'#4ade80',padding:'2px 8px',borderRadius:'20px',fontWeight:'800'}}>Heute</span>}
                        </div>
                        {session.trainer&&<p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>👤 {session.trainer}</p>}
                      </div>
                      <button onClick={()=>respondToSession(session.id,'missing')}
                        style={{flexShrink:0,padding:'12px 20px',border:`2px solid ${isMissing?'#dc2626':'rgba(248,113,113,0.5)'}`,background:isMissing?'#dc2626':'rgba(220,38,38,0.08)',color:isMissing?'white':'#f87171',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'15px',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'6px'}}>
                        <X size={16}/> {isMissing?'Abgemeldet':'Ich fehle'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Menükacheln (Trainer-Stil) ── */}
          {myChild && !elternSubView && (()=>{
            const { active } = getCleanedNotifications(myChild.id);
            const myTournaments = getMyUpcomingTournaments();
            const myTeam = Object.values(teams).find(t=>(t.childIds||[]).includes(myChild.id));
            const isJugend = grp?.id === 'jugend';
            const QL = (bg,border) => ({position:'relative',padding:'15px 8px 13px',background:bg,border:'1px solid '+border,borderRadius:'16px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',transition:'transform 0.12s',textAlign:'center'});
            const menuCats = [
              {
                label:'Training', color:'rgba(103,232,249,0.45)',
                links:[
                  {label:'Trainingsverlauf', icon:'📋', color:'#67e8f9', bg:'rgba(103,232,249,0.1)', border:'rgba(103,232,249,0.25)', action:()=>setElternSubView('trainingsverlauf')},
                  ...(isJugend ? [{label:'Rangliste', icon:'📊', color:'#fbbf24', bg:'rgba(251,191,36,0.1)', border:'rgba(251,191,36,0.25)', action:()=>setElternSubView('rangliste')}] : []),
                  {label:'Nachrichten', icon:'🔔', color:'#a78bfa', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.25)', action:()=>setElternSubView('benachrichtigungen'), badge: active.length>0?active.length:0},
                ],
              },
              {
                label:'Wettkampf', color:'rgba(253,230,138,0.45)',
                links:[
                  {label:'Meine Mannschaft', icon:'🏓', color:'#2dd4bf', bg:'rgba(45,212,191,0.1)',  border:'rgba(45,212,191,0.25)',  action:()=>setElternSubView('mannschaft')},
                  {label:'MyTischtennis',    icon:'🌐', color:'#fcd34d', bg:'rgba(252,211,77,0.1)',   border:'rgba(252,211,77,0.25)',   action:()=>{const a=document.createElement('a');a.href='https://www.mytischtennis.de/click-tt/HeTTV/25--26/verein/33066/TTC_G.-W._Staffel_1953';a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();document.body.removeChild(a);}},
                  {label:'Turniere',         icon:'🏆', color:'#fde68a', bg:'rgba(253,230,138,0.1)', border:'rgba(253,230,138,0.25)', action:()=>setElternSubView('turniere'), badge: myTournaments.length>0?myTournaments.length:0},
                  ...(isJugend ? [{label:'Errungenschaften', icon:'🏅', color:'#86efac', bg:'rgba(134,239,172,0.1)', border:'rgba(134,239,172,0.25)', action:()=>setElternSubView('errungenschaften')}] : []),
                ],
              },
              {
                label:'Sonstiges', color:'rgba(226,232,240,0.35)',
                links:[
                  {label:'TTC News', icon:'📰', color:'#86efac', bg:'rgba(134,239,172,0.1)', border:'rgba(134,239,172,0.25)', action:()=>{navTo('ttcnews');fetchTtcNews();}},
                ],
              },
            ];
            return (
              <div style={{marginBottom:'28px'}}>
                {menuCats.map(cat=>(
                  <div key={cat.label} style={{marginBottom:'18px'}}>
                    <p style={{color:cat.color,fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 10px'}}>⬡ {cat.label}</p>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
                      {cat.links.map((ql,i)=>(
                        <button key={i} onClick={ql.action} style={QL(ql.bg,ql.border)}
                          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                          <span style={{fontSize:'24px',lineHeight:1}}>{ql.icon}</span>
                          <span style={{fontSize:'11px',fontWeight:'700',color:ql.color,lineHeight:'1.3'}}>{ql.label}</span>
                          {ql.badge>0&&<span style={{position:'absolute',top:'8px',right:'8px',background:'#dc2626',color:'white',borderRadius:'50%',width:'18px',height:'18px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center'}}>{ql.badge>9?'9+':ql.badge}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Benachrichtigungen ── */}
          {myChild && elternSubView==='benachrichtigungen' && (()=>{
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

              {/* ── Kommende Trainings (sub: trainingsverlauf zeigt beides) ── */}
              {elternSubView==='trainingsverlauf' && <span style={SECTION_LABEL()}>Kommende Trainings</span>}
              {elternSubView==='trainingsverlauf' && (
              <div style={{...DARK_CARD,marginBottom:'28px',border:'1px solid rgba(74,222,128,0.18)'}}>
                <h3 style={{margin:'0 0 16px',color:'#4ade80',display:'flex',alignItems:'center',gap:'8px',fontWeight:'800',fontSize:'16px'}}><Calendar size={18}/> Trainings diese Woche</h3>
                {mySessions.length===0
                  ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:'13px',margin:0,textAlign:'center',padding:'20px 0'}}>Kein Training in den nächsten 7 Tagen.</p>
                  : <div style={{display:'grid',gap:'10px'}}>
                    {mySessions.map(session=>{
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
              )}

              {/* ── Trainings-Verlauf ── */}
              {elternSubView==='trainingsverlauf' && <span style={SECTION_LABEL()}>Verlauf</span>}
              {elternSubView==='trainingsverlauf' && (
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
              )}

              {/* ── Mannschaft & Liga ── */}
              {elternSubView==='mannschaft' && (()=>{
                const myTeam = Object.values(teams).find(t=>(t.childIds||[]).includes(myChild.id));
                if (!myTeam) return null;
                const ld = myTeam.leagueData || {};
                const colSt = (i) => ({padding:'8px 10px',fontSize:'12px',color:i===0?'white':'rgba(255,255,255,0.7)',fontWeight:i<2?'700':'400',textAlign:i>1?'center':'left',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.05)'});
                const hSt  = (i) => ({...colSt(i),color:'rgba(255,255,255,0.35)',fontWeight:'700',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.1)'});
                const spSt = (i) => ({padding:'8px 10px',fontSize:'12px',color:i===3?'#86efac':'rgba(255,255,255,0.7)',fontWeight:i===3?'700':'400',textAlign:i===3?'center':'left',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.05)'});
                const spH  = (i) => ({...spSt(i),color:'rgba(255,255,255,0.35)',fontWeight:'700',fontSize:'10px',textTransform:'uppercase',letterSpacing:'0.5px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.1)'});
                const fetchedStr = ld.fetchedAt ? new Date(ld.fetchedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
                return (
                  <>
                    <span style={SECTION_LABEL('rgba(20,184,166,0.5)')}>Mannschaft</span>
                    <div style={{...DARK_CARD_TEAL,marginBottom:'28px',padding:0,overflow:'hidden'}}>
                      {/* Kachel-Header — immer sichtbar */}
                      <button onClick={()=>setShowMyTeam(v=>!v)}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'none',border:'none',cursor:'pointer',padding:'16px',gap:'12px'}}>
                        <div style={{textAlign:'left',minWidth:0}}>
                          <span style={{fontSize:'10px',fontWeight:'800',color:'rgba(45,212,191,0.6)',textTransform:'uppercase',letterSpacing:'1.5px',display:'block',marginBottom:'4px'}}>Meine Mannschaft</span>
                          <div style={{display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{fontWeight:'800',color:'white',fontSize:'16px'}}>🏓 {myTeam.name}</span>
                            {myTeam.liga&&<span style={{fontSize:'13px',color:'rgba(45,212,191,0.7)',fontWeight:'600'}}>{myTeam.liga}</span>}
                          </div>
                        </div>
                        <span style={{fontSize:'20px',color:'rgba(45,212,191,0.6)',transform:showMyTeam?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0}}>▾</span>
                      </button>

                      {/* Ausgeklappter Inhalt */}
                      {showMyTeam&&(
                        <div style={{borderTop:'1px solid rgba(45,212,191,0.2)',padding:'16px'}}>
                          {/* Mannschaftskollegen */}
                          {(myTeam.childIds||[]).length>0&&(
                            <div style={{marginBottom:'16px'}}>
                              <p style={{margin:'0 0 8px',fontSize:'11px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Mannschaftskollegen</p>
                              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                                {(myTeam.childIds||[]).map(id=>{
                                  const c2=children[id];
                                  return c2?<span key={id} style={{fontSize:'12px',background:'rgba(45,212,191,0.15)',border:'1px solid rgba(45,212,191,0.3)',color:'#2dd4bf',borderRadius:'20px',padding:'3px 10px',fontWeight:'600'}}>{c2.name}</span>:null;
                                })}
                              </div>
                            </div>
                          )}
                          {/* Liga-Tabelle */}
                          {ld.table&&(
                            <div style={{marginBottom:'12px'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px',flexWrap:'wrap',gap:'4px'}}>
                                <p style={{margin:0,fontSize:'11px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Tabelle</p>
                                {fetchedStr&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>Stand: {fetchedStr}</span>}
                              </div>
                              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'8px',background:'rgba(0,0,0,0.2)'}}>
                                <table style={{borderCollapse:'collapse',minWidth:'420px'}}>
                                  {ld.table.headers?.length>0&&<thead><tr>{ld.table.headers.map((h,i)=><th key={i} style={hSt(i)}>{h}</th>)}</tr></thead>}
                                  <tbody>{(ld.table.rows||[]).map((row,ri)=>{const cells=row.c||row;return<tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,0.02)'}}>{cells.map((cell,ci)=><td key={ci} style={colSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* Spielplan */}
                          {ld.schedule&&(
                            <div>
                              <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'800',color:'rgba(45,212,191,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielplan</p>
                              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'8px',background:'rgba(0,0,0,0.2)'}}>
                                <table style={{borderCollapse:'collapse',minWidth:'520px'}}>
                                  {ld.schedule.headers?.length>0&&<thead><tr>{ld.schedule.headers.map((h,i)=><th key={i} style={spH(i)}>{h}</th>)}</tr></thead>}
                                  <tbody>{(ld.schedule.rows||[]).map((row,ri)=>{const cells=row.c||row;return<tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,0.02)'}}>{cells.map((cell,ci)=><td key={ci} style={spSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {!ld.table&&!ld.schedule&&<p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'8px 0'}}>Noch keine Liga-Daten geladen.</p>}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* ── Kommende Turniere ── */}
              {elternSubView==='turniere' && (()=>{
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
        {myChild&&elternSubView==='trainingsverlauf'&&(()=>{
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
              {/* ── Rangliste Tile (nur Jugend) ── */}
              {elternSubView==='rangliste' && grp?.id === 'jugend' && rangliste.length > 0 && (
                <>
                  <span style={SECTION_LABEL('rgba(251,191,36,0.5)')}>Rangliste</span>
                  <RanglisteTile rangliste={rangliste} myChildId={myChild.id} children={children} subgroups={subgroups} />
                </>
              )}
              {elternSubView==='rangliste' && grp?.id === 'jugend' && rangliste.length === 0 && (
                <div style={{...DARK_CARD,textAlign:'center',padding:'40px'}}>
                  <p style={{color:'rgba(255,255,255,0.3)',margin:0}}>Noch keine Ranglisten-Daten vorhanden.</p>
                </div>
              )}
              {/* ── Errungenschaften (nur Jugend) ── */}
              {elternSubView==='errungenschaften' && grp?.id === 'jugend' && (()=>{
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
                        {(()=>{const count=ach['team']||0;return <Tile icon='🏆' label='Meisterschaft' sub={count>0?`×${count}`:undefined} has={count>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openCount('🏆','Meisterschaft',ACHIEVEMENT_DESCRIPTIONS.team,count)}/>;})()}
                        {(spielerDesMonatsWins[myChild.id]||[]).length>0
                          ? (spielerDesMonatsWins[myChild.id]||[]).map(w=>{
                              const isYear=w.type==='year';
                              const lbl=isYear?`Sp. d. J. ${w.period}`:`Sp. d. M. ${fmtYM(w.period)}`;
                              return <Tile key={`${w.type}-${w.period}`} icon={isYear?'🏆':'⭐'} label={lbl} has={true}
                                activeBg="rgba(252,211,77,0.08)" activeBorder="rgba(252,211,77,0.4)" activeTextColor="#fcd34d"
                                onClick={()=>openCount(isYear?'🏆':'⭐',lbl,isYear?`Spieler des Jahres ${w.period}! Größte TTR-Verbesserung im Jahr.`:`Spieler des Monats ${fmtYM(w.period)}! Größte TTR-Verbesserung des Monats.`,1)}/>;
                            })
                          : <Tile icon='⭐' label='Spieler d. M.' has={false} onClick={()=>openCount('⭐','Spieler des Monats','Werde Spieler des Monats mit der größten TTR-Verbesserung im Monat!',0)}/>
                        }
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

                      {/* ── Ranglisten-Errungenschaften ── */}
                      {rangliste.length > 0 && rangliste.includes(myChild.id) && (()=>{
                        const rAch = getRanglisteAch(myChild.id);
                        const myRank = rangliste.indexOf(myChild.id)+1;
                        return (
                          <>
                          <Sec title="📊 Rangliste – Erstmals erreicht">
                            {RANK_TIERS.map(t=>{
                              const has = !!rAch.reached?.[t.key];
                              const date = rAch.reached?.[t.key];
                              return (
                                <Tile key={t.key} icon={t.icon} iconGray="⬜" label={t.label}
                                  sub={has&&date ? new Date(date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : undefined}
                                  has={has}
                                  activeBg="rgba(252,211,77,0.12)" activeBorder="rgba(252,211,77,0.35)" activeTextColor="#fcd34d"
                                  onClick={()=>setAchievementPopup({icon:has?t.icon:'🔒', title:t.label, desc:has?`Du hast ${t.label} in der TTC Rangliste erstmals am ${new Date(date).toLocaleDateString('de-DE')} erreicht!`:`Noch nicht erreicht. Aktuell: Platz #${myRank}`})}/>
                              );
                            })}
                          </Sec>
                          <Sec title="📅 Rangliste – Wochen im Tier" mb={false}>
                            {RANK_TIERS.map(t=>{
                              const wk = rAch.weeks?.[t.key]?.count||0;
                              return (
                                <Tile key={t.key} icon={t.icon} iconGray="⬜" label={t.label} sub={wk>0?`${wk}W`:undefined}
                                  has={wk>0}
                                  activeBg="rgba(252,211,77,0.08)" activeBorder="rgba(252,211,77,0.25)" activeTextColor="#fcd34d"
                                  onClick={()=>setAchievementPopup({icon:t.icon, title:`Wochen ${t.label}`, desc:`Du hast insgesamt ${wk} Woche${wk!==1?'n':''} in der ${t.label} der TTC Rangliste verbracht.`, count:wk})}/>
                              );
                            })}
                          </Sec>
                          </>
                        );
                      })()}

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
    const activeKids=kids.filter(c=>!c.nachwuchsKarriereBeendet);
    const retiredKids=kids.filter(c=>c.nachwuchsKarriereBeendet);
    const allSubs=Object.values(subgroups);
    const totalPresent=activeKids.reduce((sum,c)=>sum+getAttendanceStats(c.id,sub.id).present,0);
    const totalSessions=(sub.trainingDates||[]).length;
    const avgPct=activeKids.length>0&&totalSessions>0?Math.round((totalPresent/(activeKids.length*totalSessions))*100):0;

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
            {activeKids.length===0 && retiredKids.length===0
              ? <div style={{textAlign:'center',padding:'48px 20px',color:'rgba(255,255,255,0.2)',fontSize:'15px'}}>Noch keine Kinder. Oben hinzufügen!</div>
              : activeKids.map(child=>{
                const stats=getAttendanceStats(child.id,sub.id);
                const pct=stats.percent;
                const childTtr=ttrHistory[child.id]?.entries;
                const lastTtr=childTtr&&childTtr.length>0?childTtr[childTtr.length-1]:null;
                const prevTtr=childTtr&&childTtr.length>1?childTtr[childTtr.length-2]:null;
                const ttrDiff=lastTtr&&prevTtr?lastTtr.ttr-prevTtr.ttr:null;
                return (
                  <div key={child.id}
                    style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:'14px',transition:'all 0.12s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(74,222,128,0.07)';e.currentTarget.style.borderColor='rgba(74,222,128,0.22)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(74,222,128,0.1)';}}>
                    <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>{setActiveChild(child);navTo('childHistory');}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'7px'}}>
                        <p style={{margin:0,fontWeight:'700',color:'white',fontSize:'15px'}}>{child.name}</p>
                        {child.nachwuchsKarriereBeendet && <span style={{fontSize:'10px',fontWeight:'800',color:'rgba(148,163,184,0.6)',background:'rgba(148,163,184,0.1)',border:'1px solid rgba(148,163,184,0.2)',borderRadius:'5px',padding:'1px 6px'}}>🏁 Karriere beendet</span>}
                        {lastTtr&&<span style={{fontSize:'11px',fontWeight:'800',color:'#fbbf24',background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:'6px',padding:'1px 6px'}}>
                          TTR {lastTtr.ttr}{ttrDiff!==null&&<span style={{color:ttrDiff>=0?'#4ade80':'#f87171',marginLeft:'3px'}}>{ttrDiff>=0?'+':''}{ttrDiff}</span>}
                        </span>}
                      </div>
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
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                      {lastTtr&&<button onClick={e=>{e.stopPropagation();setTtrVerlaufChild(child);navTo('ttrVerlauf');}}
                        style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.25)',color:'#fbbf24',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px'}}
                        title="TTR-Verlauf">📈</button>}
                      <ChevronRight size={16} color="rgba(74,222,128,0.3)" style={{cursor:'pointer'}} onClick={()=>{setActiveChild(child);navTo('childHistory');}}/>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Ehemalige (Karriere beendet) */}
          {retiredKids.length>0&&(
            <div style={{marginTop:'24px'}}>
              <details>
                <summary style={{cursor:'pointer',fontSize:'12px',fontWeight:'700',color:'rgba(148,163,184,0.5)',padding:'8px 0',listStyle:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                  <span>🏁 Ehemalige ({retiredKids.length})</span>
                </summary>
                <div style={{display:'grid',gap:'6px',marginTop:'8px'}}>
                  {retiredKids.map(child=>(
                    <div key={child.id} onClick={()=>{setActiveChild(child);navTo('childHistory');}}
                      style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:'rgba(148,163,184,0.04)',border:'1px solid rgba(148,163,184,0.1)',borderRadius:'12px',cursor:'pointer',opacity:0.7}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <p style={{margin:0,fontWeight:'600',color:'rgba(255,255,255,0.5)',fontSize:'14px'}}>{child.name}</p>
                          <span style={{fontSize:'10px',fontWeight:'800',color:'rgba(148,163,184,0.6)',background:'rgba(148,163,184,0.1)',border:'1px solid rgba(148,163,184,0.2)',borderRadius:'5px',padding:'1px 6px'}}>🏁 Karriere beendet</span>
                        </div>
                        {child.karriereBeendetAm&&<p style={{margin:'3px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>Beendet am {new Date(child.karriereBeendetAm+'T12:00:00').toLocaleDateString('de-DE')}</p>}
                      </div>
                      <ChevronRight size={14} color="rgba(148,163,184,0.2)"/>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SESSION ANWESENHEIT ──────────────────────────────────────
  if (view==='sessionAttendance') {
    const session = sessions[activeSession?.id] || activeSession;
    const sessionSubs = (session?.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
    const subgroupKids = sessionSubs.flatMap(sub => getChildrenForSubgroup(sub.id)).filter(c=>!c.nachwuchsKarriereBeendet);
    // Extra individual players not already in a subgroup
    const extraPlayers = (session?.extraPlayerIds||[])
      .map(id=>children[id]).filter(Boolean)
      .filter(ep=>!ep.nachwuchsKarriereBeendet)
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

          {/* Training fällt aus */}
          {canEdit()&&(
            <button onClick={()=>{
              if(window.confirm('Training als ausgefallen markieren?\n\nDas Training wird archiviert, keine Anwesenheitsdaten werden erfasst und es zählt nicht in Statistiken oder Errungenschaften.')) {
                cancelSession(session);
                navTo('home');
              }
            }} style={{width:'100%',padding:'13px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',cursor:'pointer',color:'#f87171',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'10px'}}>
              ✕ Training fällt aus
            </button>
          )}

          {/* Archiv-Button */}
          {canEdit()&&(()=>{
            const archivable = isSessionArchivable(session);
            return archivable ? (
              <button onClick={()=>{if(window.confirm('Dieses Training archivieren? Es verschwindet aus der Übersicht, die Anwesenheitsdaten bleiben erhalten.')) { archiveSession(session); navTo('home'); }}}
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
    const currentDates=(sub?.trainingDates||[]);
    // Also show historical attendance entries from previous subgroups (dates not in current subgroup)
    const historicalDates=Object.keys(child.attendance||{}).filter(d=>!currentDates.includes(d));
    const dates=[...new Set([...currentDates,...historicalDates])].sort().reverse();
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

    const deleteTrainingDate = (date) => {
      const isHist = !currentDates.includes(date);
      const label = new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
      const msg = isHist
        ? `Historischen Eintrag vom ${label} löschen?\n\nNur der Anwesenheitseintrag dieses Kindes wird entfernt (Termin gehörte zu einer früheren Gruppe).`
        : `Trainingseinheit vom ${label} löschen?\n\nDas Datum wird aus der Gruppe entfernt und der Anwesenheitseintrag dieses Kindes wird gelöscht.`;
      if (!window.confirm(msg)) return;
      // Only remove from current subgroup's trainingDates if it's a current date
      if (!isHist) {
        const sub2 = subgroups[child.subgroupId];
        if (sub2) {
          const newDates = (sub2.trainingDates||[]).filter(d=>d!==date);
          saveSubgroups({...subgroups,[child.subgroupId]:{...sub2,trainingDates:newDates}});
        }
      }
      // Remove attendance entry for this date from child
      const att={...(child.attendance||{})};
      delete att[date];
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
              {canEdit()&&editingChildName===child.id ? (
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <input
                    autoFocus
                    value={editingChildNameVal}
                    onChange={e=>setEditingChildNameVal(e.target.value)}
                    onKeyDown={e=>{
                      if(e.key==='Enter'&&editingChildNameVal.trim()){
                        saveChildren({...children,[child.id]:{...child,name:editingChildNameVal.trim()}});
                        setEditingChildName(null);
                      }
                      if(e.key==='Escape') setEditingChildName(null);
                    }}
                    style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(74,222,128,0.5)',borderRadius:'8px',color:'white',fontSize:'18px',fontWeight:'800',padding:'2px 10px',outline:'none',width:'200px'}}
                  />
                  <button onClick={()=>{
                    if(editingChildNameVal.trim()) saveChildren({...children,[child.id]:{...child,name:editingChildNameVal.trim()}});
                    setEditingChildName(null);
                  }} style={{background:'rgba(74,222,128,0.2)',border:'1px solid rgba(74,222,128,0.4)',borderRadius:'6px',color:'#4ade80',cursor:'pointer',padding:'3px 8px',fontSize:'13px',fontWeight:'700'}}>✓</button>
                  <button onClick={()=>setEditingChildName(null)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'6px',color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'3px 8px',fontSize:'13px'}}>✕</button>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px',letterSpacing:'-0.3px'}}>{child.name}</h2>
                  {canEdit()&&(
                    <button onClick={()=>{setEditingChildName(child.id);setEditingChildNameVal(child.name);}}
                      title="Name bearbeiten"
                      style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',padding:'2px',display:'flex',alignItems:'center',lineHeight:1}}>
                      <Pencil size={14}/>
                    </button>
                  )}
                </div>
              )}
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
                  {(()=>{const c=ach['team']||0;return <SmTile2 icon='🏆' label='Meister' sub2={c>0?`×${c}`:undefined} has={c>0} activeBg="rgba(253,230,138,0.1)" activeBorder="rgba(253,230,138,0.3)" activeTextColor="#fde68a" onClick={()=>openP('🏆','Meisterschaft',ACHIEVEMENT_DESCRIPTIONS.team,c)}/>;})()}
                  {(spielerDesMonatsWins[child.id]||[]).length>0
                    ? (spielerDesMonatsWins[child.id]||[]).map(w=>{
                        const isYear=w.type==='year';
                        const lbl=isYear?`J. ${w.period}`:`${fmtYM(w.period)}`;
                        return <SmTile2 key={`${w.type}-${w.period}`} icon={isYear?'🏆':'⭐'} label={lbl} has={true}
                          activeBg="rgba(252,211,77,0.08)" activeBorder="rgba(252,211,77,0.4)" activeTextColor="#fcd34d"
                          onClick={()=>openP(isYear?'🏆':'⭐',isYear?`Sp.d.J. ${w.period}`:`Sp.d.M. ${fmtYM(w.period)}`,isYear?`Spieler des Jahres ${w.period}!`:`Spieler des Monats ${fmtYM(w.period)}!`,1)}/>;
                      })
                    : <SmTile2 icon='⭐' label='Sp.d.M.' has={false} onClick={()=>openP('⭐','Spieler des Monats','Spieler des Monats',0)}/>
                  }
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
                const isHistorical=!currentDates.includes(date);
                const rowBg=status==='present'?'rgba(74,222,128,0.07)':status==='absent_excused'?'rgba(148,163,184,0.06)':status==='absent_unexcused'?'rgba(239,68,68,0.07)':'rgba(255,255,255,0.025)';
                const rowBorder=isHistorical?'rgba(96,165,250,0.2)':status==='present'?'rgba(74,222,128,0.18)':status==='absent_excused'?'rgba(148,163,184,0.15)':status==='absent_unexcused'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)';
                return (
                  <div key={date} style={{padding:'11px 14px',background:isHistorical?'rgba(96,165,250,0.04)':rowBg,borderRadius:'10px',border:`1px solid ${rowBorder}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <p style={{margin:'0 0 3px',fontSize:'13px',color:'rgba(255,255,255,0.7)',fontWeight:'600'}}>
                          {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                        </p>
                        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                          {isHistorical&&<span style={{fontSize:'10px',fontWeight:'700',color:'#93c5fd',background:'rgba(96,165,250,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(96,165,250,0.2)'}}>Frühere Gruppe</span>}
                          {parentExcused&&<span style={{fontSize:'10px',fontWeight:'700',color:'#94a3b8',background:'rgba(148,163,184,0.1)',padding:'1px 7px',borderRadius:'10px',border:'1px solid rgba(148,163,184,0.2)'}}>{responseBy==='self'?'Selbst abgemeldet':'Eltern abgemeldet'}</span>}
                        </div>
                      </div>
                      {canEdit() ? (
                        <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                          <button onClick={()=>setChildStatus(date,'present')} style={{width:'34px',height:'34px',border:`2px solid ${status==='present'?'#16a34a':'rgba(74,222,128,0.2)'}`,background:status==='present'?'#16a34a':'rgba(74,222,128,0.06)',color:status==='present'?'white':'#4ade80',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Check size={16}/></button>
                          <button onClick={()=>setChildStatus(date,'absent_unexcused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_unexcused'?'#ef4444':'rgba(239,68,68,0.2)'}`,background:status==='absent_unexcused'?'rgba(220,38,38,0.75)':'rgba(239,68,68,0.06)',color:status==='absent_unexcused'?'white':'#f87171',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>–</button>
                          <button onClick={()=>setChildStatus(date,'absent_excused')} style={{width:'34px',height:'34px',border:`2px solid ${status==='absent_excused'?'#64748b':'rgba(148,163,184,0.2)'}`,background:status==='absent_excused'?'rgba(71,85,105,0.8)':'rgba(148,163,184,0.05)',color:status==='absent_excused'?'white':'#94a3b8',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Clock size={15}/></button>
                          <div style={{width:'1px',height:'22px',background:'rgba(255,255,255,0.08)',margin:'0 2px'}}/>
                          <button onClick={()=>deleteTrainingDate(date)} title="Einheit löschen" style={{width:'30px',height:'30px',border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.07)',color:'#f87171',borderRadius:'7px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:0.7}}><Trash2 size={13}/></button>
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
                              const hcM=m.handicap;
                              return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                <div style={{flex:1,textAlign:'right'}}>
                                  <span style={{fontSize:'12px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets1>res.sets2?'700':'400'}}>{p1?.name||'?'}</span>
                                  {hcM?.beneficiary===m.p1Idx&&<span style={{display:'block',fontSize:'10px',color:'#fde68a',fontWeight:'800'}}>+{hcM.points}P Vorgabe</span>}
                                </div>
                                <div style={{textAlign:'center',flexShrink:0}}>
                                  <span style={{display:'block',fontSize:'13px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.2)',minWidth:'34px'}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
                                  {hcM&&<span style={{fontSize:'9px',color:'rgba(253,230,138,0.5)',fontWeight:'700'}}>HCP {hcM.points}P</span>}
                                </div>
                                <div style={{flex:1}}>
                                  <span style={{fontSize:'12px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.45)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                                  {hcM?.beneficiary===m.p2Idx&&<span style={{display:'block',fontSize:'10px',color:'#fde68a',fontWeight:'800'}}>+{hcM.points}P Vorgabe</span>}
                                </div>
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

          {/* Nachwuchskarriere */}
          {canEdit() && (
            <div style={{marginTop:'40px',paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
              {child.nachwuchsKarriereBeendet ? (
                <div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'rgba(148,163,184,0.1)',border:'1px solid rgba(148,163,184,0.25)',borderRadius:'10px',marginBottom:'12px'}}>
                    <span style={{fontSize:'13px',fontWeight:'800',color:'rgba(148,163,184,0.7)'}}>🏁 Karriere beendet am {new Date(child.karriereBeendetAm+'T12:00:00').toLocaleDateString('de-DE')}</span>
                  </div>
                  {userRole==='admin' && (
                    <div>
                      <button onClick={()=>{if(window.confirm(`Nachwuchskarriere von ${child.name} reaktivieren?\n\nDas Kind erscheint wieder in allen aktiven Listen.`)) reaktiviereNachwuchskarriere(child.id);}}
                        style={{padding:'8px 16px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',color:'#4ade80',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>
                        ↩ Nachwuchskarriere reaktivieren
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={()=>setKarriereConfirmChild(child.id)}
                  style={{padding:'7px 14px',background:'none',border:'1px solid rgba(148,163,184,0.2)',borderRadius:'8px',color:'rgba(148,163,184,0.4)',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
                  🏁 Nachwuchskarriere beenden
                </button>
              )}
            </div>
          )}
        </div>

      {karriereConfirmChild && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px'}}>
          <div style={{background:'#1a1a2e',border:'1.5px solid rgba(148,163,184,0.2)',borderRadius:'20px',padding:'28px 24px',maxWidth:'380px',width:'100%',textAlign:'center'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>🏁</div>
            <h3 style={{margin:'0 0 12px',color:'white',fontSize:'18px',fontWeight:'800'}}>Nachwuchskarriere beenden</h3>
            <p style={{margin:'0 0 20px',color:'rgba(255,255,255,0.5)',fontSize:'13px',lineHeight:'1.6'}}>
              Diese Aktion friert alle Daten von <strong style={{color:'white'}}>{children[karriereConfirmChild]?.name}</strong> ein. Das Kind wird aus aktiven Listen entfernt, bleibt aber dauerhaft in der Datenbank gespeichert.<br/><br/>
              <span style={{color:'#f87171',fontWeight:'700'}}>Diese Aktion kann nur von einem Admin rückgängig gemacht werden.</span>
            </p>
            <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
              <button onClick={()=>setKarriereConfirmChild(null)}
                style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'rgba(255,255,255,0.6)',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                Abbrechen
              </button>
              <button onClick={()=>{beendeNachwuchskarriere(karriereConfirmChild);setKarriereConfirmChild(null);}}
                style={{flex:1,padding:'12px',background:'rgba(148,163,184,0.15)',border:'1.5px solid rgba(148,163,184,0.35)',borderRadius:'12px',color:'#94a3b8',fontSize:'14px',fontWeight:'800',cursor:'pointer'}}>
                Ja, beenden
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }


  // ── RANGLISTE VIEW (Trainer/Admin) ──────────────────────────────────────
  if (view === 'rangliste' && canEdit()) {
    const jugendChildren = Object.values(children)
      .filter(c => subgroups[c.subgroupId]?.groupId === 'jugend' && !c.nachwuchsKarriereBeendet)
      .sort((a,b) => a.name.localeCompare(b.name,'de'));
    const jugendSubs = Object.values(subgroups).filter(sg => sg.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));

    // Kinder die noch nicht in der Rangliste sind
    const inRangliste = new Set(rangliste);
    const notInRangliste = jugendChildren.filter(c => !inRangliste.has(c.id));

    const moveUp = (idx) => {
      if (idx === 0) return;
      const next = [...rangliste];
      [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
      saveRangliste(next);
    };
    const moveDown = (idx) => {
      if (idx === rangliste.length-1) return;
      const next = [...rangliste];
      [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
      saveRangliste(next);
    };
    const removeFromRangliste = (childId) => saveRangliste(rangliste.filter(id => id !== childId));
    const addChild = (childId) => { if (!childId || inRangliste.has(childId)) return; saveRangliste([...rangliste, childId]); };
    const addSubgroup = (subId) => {
      const toAdd = jugendChildren.filter(c => c.subgroupId === subId && !inRangliste.has(c.id)).map(c=>c.id);
      if (toAdd.length === 0) return;
      saveRangliste([...rangliste, ...toAdd]);
    };
    const addAll = () => {
      const toAdd = jugendChildren.filter(c => !inRangliste.has(c.id)).map(c=>c.id);
      if (toAdd.length === 0) return;
      saveRangliste([...rangliste, ...toAdd]);
    };

    // ── Ranglistenspiele helpers ──────────────────────────────
    const activeSpiele = ranglistenspiele.active || [];
    const updateSpielField = (spielId, field, val) => {
      const updated = activeSpiele.map(s => s.id===spielId ? {...s,[field]:val} : s);
      saveRanglistenspiele({ ...ranglistenspiele, active: updated });
    };
    const deleteSpiel = (spielId) => saveRanglistenspiele({ ...ranglistenspiele, active: activeSpiele.filter(s=>s.id!==spielId) });
    const startNeuesSpiel = () => {
      if (!newSpielForm.challengerId || !newSpielForm.defenderId) return;
      const chalIdx = rangliste.indexOf(newSpielForm.challengerId);
      const defIdx  = rangliste.indexOf(newSpielForm.defenderId);
      if (chalIdx === -1 || defIdx === -1 || chalIdx <= defIdx) return;
      const spiel = { id: 'spiel_'+Date.now(), challengerId: newSpielForm.challengerId, defenderId: newSpielForm.defenderId, sets1: null, sets2: null, winSets: 3, date: new Date().toISOString().slice(0,10) };
      saveRanglistenspiele({ ...ranglistenspiele, active: [...activeSpiele, spiel] });
      setNewSpielForm({ open: false, challengerId: '', defenderId: '' });
    };

    // Selection mode helpers
    const handleRangSelect = (childId) => {
      if (rangSelection.includes(childId)) {
        setRangSelection(rangSelection.filter(id => id !== childId));
        return;
      }
      if (rangSelection.length === 0) {
        setRangSelection([childId]);
        return;
      }
      // Second selection → auto-create game
      const first = rangSelection[0];
      const firstIdx = rangliste.indexOf(first);
      const secondIdx = rangliste.indexOf(childId);
      if (firstIdx === secondIdx) return;
      // lower rank number = higher position, challenger must be lower-ranked (higher index)
      const challengerId = firstIdx > secondIdx ? first : childId;
      const defenderId   = firstIdx > secondIdx ? childId : first;
      const spiel = { id: 'spiel_'+Date.now(), challengerId, defenderId, sets1: null, sets2: null, winSets: 3, date: new Date().toISOString().slice(0,10) };
      saveRanglistenspiele({ ...ranglistenspiele, active: [...activeSpiele, spiel] });
      setRangSelection([]);
    };

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#78350f 0%,#d97706 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#d97706')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📊 Rangliste Jugend</h1>
          <button onClick={()=>{setArchiveTab('rangliste');navTo('archiv');}} style={{...s.btn('#92400e'),fontSize:'12px'}}>🏅 Archiv</button>
        </div>
        {rangSelectionMode && (
          <div style={{background:'#9a3412',padding:'8px 16px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap',borderBottom:'1px solid rgba(251,146,60,0.3)'}}>
            <span style={{fontSize:'13px',fontWeight:'700',color:'#fed7aa',flexShrink:0}}>⚔️ Spielmodus:</span>
            {rangSelection.length === 0
              ? <span style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',flex:1}}>Wähle 1. Spieler…</span>
              : <span style={{fontSize:'13px',color:'white',flex:1,fontWeight:'600'}}>
                  <span style={{background:'rgba(251,146,60,0.35)',padding:'2px 8px',borderRadius:'6px',marginRight:'6px'}}>{children[rangSelection[0]]?.name}</span>
                  vs <span style={{color:'rgba(255,255,255,0.5)',marginLeft:'6px'}}>Wähle 2. Spieler…</span>
                </span>
            }
            <button onClick={()=>{ setRangSelectionMode(false); setRangSelection([]); }}
              style={{padding:'5px 12px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.12)',color:'white',cursor:'pointer',fontSize:'12px',fontWeight:'700',flexShrink:0}}>
              Modus beenden
            </button>
          </div>
        )}
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

          {/* ── Top action row ────────────────────────────────── */}
          <div style={{display:'flex',gap:'10px',marginBottom:'20px',alignItems:'stretch'}}>
            <button
              onClick={()=>{ if(!rangSelectionMode){ setRangSelectionMode(true); setRangSelection([]); } }}
              style={{flex:1,padding:'14px 16px',borderRadius:'14px',border:`2px solid ${rangSelectionMode?'#fb923c':'rgba(251,146,60,0.5)'}`,background:rangSelectionMode?'rgba(251,146,60,0.15)':'rgba(255,255,255,0.08)',color:rangSelectionMode?'#fb923c':'rgba(255,255,255,0.9)',cursor:rangSelectionMode?'default':'pointer',fontWeight:'800',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',transition:'all 0.15s'}}>
              ⚔️ Ranglistenspiel starten
            </button>
            <button
              onClick={()=>setRangAddOpen(v=>!v)}
              style={{padding:'14px 16px',borderRadius:'14px',border:'2px solid rgba(252,211,77,0.4)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.15s'}}>
              {rangAddOpen ? '✕' : '+ Spieler'}
            </button>
          </div>

          {/* ── Spieler hinzufügen (collapsible) ─────────────── */}
          {rangAddOpen && (
            <div style={{...s.card,border:'2px solid #fcd34d',marginBottom:'20px'}}>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom: notInRangliste.length>0 ? '12px' : '0'}}>
                <button onClick={addAll} disabled={notInRangliste.length===0}
                  style={{...s.btn('#d97706'),opacity:notInRangliste.length===0?0.4:1,fontSize:'13px'}}>
                  + Alle ({notInRangliste.length})
                </button>
                {jugendSubs.map(sub=>{
                  const cnt = jugendChildren.filter(c=>c.subgroupId===sub.id&&!inRangliste.has(c.id)).length;
                  return (
                    <button key={sub.id} onClick={()=>addSubgroup(sub.id)} disabled={cnt===0}
                      style={{...s.btn('#b45309'),opacity:cnt===0?0.4:1,fontSize:'13px'}}>
                      + {sub.name} ({cnt})
                    </button>
                  );
                })}
              </div>
              {notInRangliste.length > 0 && (
                <select defaultValue="" onChange={e=>{addChild(e.target.value);e.target.value='';}}
                  style={{width:'100%',padding:'10px 12px',border:'1px solid #fcd34d',borderRadius:'8px',fontSize:'14px',color:'#333',background:'white',cursor:'pointer'}}>
                  <option value="">+ Einzelnen Spieler hinzufügen…</option>
                  {notInRangliste.map(c=>{
                    const sub = subgroups[c.subgroupId];
                    return <option key={c.id} value={c.id}>{c.name}{sub?` – ${sub.name}`:''}</option>;
                  })}
                </select>
              )}
              {notInRangliste.length === 0 && <p style={{margin:0,color:'#92400e',fontSize:'13px',fontWeight:'600'}}>✓ Alle Jugendspieler sind in der Rangliste.</p>}
            </div>
          )}


          {/* ── Laufende Ranglistenspiele ─────────────────────── */}
          {activeSpiele.length > 0 && (
            <div style={{...s.card,border:'2px solid #fb923c',marginBottom:'20px'}}>
              <h2 style={{margin:'0 0 14px',color:'#9a3412',fontSize:'16px',fontWeight:'800'}}>⚔️ Laufende Ranglistenspiele <span style={{background:'#fb923c',color:'white',borderRadius:'10px',padding:'1px 8px',fontSize:'12px',marginLeft:'6px'}}>{activeSpiele.length}</span></h2>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {[...activeSpiele].sort((a,b)=>Math.min(rangliste.indexOf(a.challengerId),rangliste.indexOf(a.defenderId))-Math.min(rangliste.indexOf(b.challengerId),rangliste.indexOf(b.defenderId))).map(spiel => {
                  const chal = children[spiel.challengerId];
                  const def  = children[spiel.defenderId];
                  const chalIdx = rangliste.indexOf(spiel.challengerId);
                  const defIdx  = rangliste.indexOf(spiel.defenderId);
                  const winSets = spiel.winSets || 3;
                  const sets1 = spiel.sets1;
                  const sets2 = spiel.sets2;
                  const hasScores = sets1 !== null && sets2 !== null;
                  const canFinalize = hasScores && sets1 !== sets2 && (sets1 === winSets || sets2 === winSets);
                  const rnkBtn = (active, color) => ({width:'32px',height:'32px',borderRadius:'8px',border:`2px solid ${active?color:'#e5e7eb'}`,background:active?`rgba(${color==='#ea580c'?'234,88,12':'29,78,216'},0.1)`:'#f9fafb',color:active?color:'#9ca3af',cursor:'pointer',fontWeight:'900',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.1s'});
                  return (
                    <div key={spiel.id} style={{border:`1px solid ${canFinalize?'#86efac':'#fed7aa'}`,borderRadius:'12px',overflow:'hidden',background:'#fff7ed'}}>
                      {/* Kompakte Kopfzeile */}
                      <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 10px'}}>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#92400e',flexShrink:0}}>#{defIdx+1}</span>
                        <span style={{fontSize:'13px',fontWeight:'800',color:'#1f2937',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{def?.name||'?'}</span>
                        <span style={{fontSize:'12px',color:'#9ca3af',fontWeight:'700',flexShrink:0}}>vs</span>
                        <span style={{fontSize:'13px',fontWeight:'800',color:'#1f2937',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{chal?.name||'?'}</span>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#ea580c',flexShrink:0}}>#{chalIdx+1}</span>
                        <button onClick={()=>deleteSpiel(spiel.id)} style={{width:'22px',height:'22px',borderRadius:'5px',background:'#fee2e2',border:'none',cursor:'pointer',color:'#dc2626',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:'2px'}}>✕</button>
                      </div>
                      {/* Satzeingabe */}
                      <div style={{padding:'6px 10px 8px',borderTop:'1px solid #fed7aa',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                          {Array.from({length:winSets+1},(_,n)=>(
                            <button key={n} onClick={()=>updateSpielField(spiel.id,'sets2',n)} style={rnkBtn(sets2===n,'#1d4ed8')}>{n}</button>
                          ))}
                        </div>
                        <span style={{fontWeight:'900',color:'#d1d5db',fontSize:'16px'}}>:</span>
                        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                          {Array.from({length:winSets+1},(_,n)=>(
                            <button key={n} onClick={()=>updateSpielField(spiel.id,'sets1',n)} style={rnkBtn(sets1===n,'#ea580c')}>{n}</button>
                          ))}
                        </div>
                        <button onClick={()=>finalizeRanglistenspiel(spiel)} disabled={!canFinalize}
                          style={{marginLeft:'auto',padding:'5px 12px',borderRadius:'8px',border:'none',background:canFinalize?'#16a34a':'#e5e7eb',color:canFinalize?'white':'#9ca3af',cursor:canFinalize?'pointer':'not-allowed',fontWeight:'700',fontSize:'12px',flexShrink:0,whiteSpace:'nowrap'}}>
                          {canFinalize ? '✓ Abschließen' : 'Ergebnis eingeben'}
                        </button>
                      </div>
                      {canFinalize && (
                        <div style={{padding:'4px 10px 8px',fontSize:'12px',fontWeight:'700',color:sets1>sets2?'#166534':'#1d4ed8',textAlign:'center'}}>
                          {sets1>sets2?`🎉 ${chal?.name} → Platz #${defIdx+1}`:`✅ ${def?.name} verteidigt #${defIdx+1}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Aktuelle Rangliste ─────────────────────────────── */}
          <div style={{...s.card,marginBottom:'20px'}}>
            <h2 style={{margin:'0 0 16px',color:'#92400e',fontSize:'16px',fontWeight:'800'}}>
              {rangSelectionMode ? '👇 Spieler auswählen' : 'Aktuelle Rangliste'} <span style={{color:'#9ca3af',fontWeight:'600',fontSize:'14px'}}>({rangliste.length} Spieler)</span>
            </h2>
            {rangliste.length === 0 ? (
              <p style={{color:'#9ca3af',textAlign:'center',padding:'40px 0',fontSize:'14px'}}>Noch keine Spieler. Tippe "+ Spieler" oben.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {rangliste.map((childId, idx) => {
                  const child = children[childId];
                  if (!child) return null;
                  const sub = subgroups[child.subgroupId];
                  const grp = FIXED_GROUPS.find(g=>g.id===sub?.groupId);
                  const medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':null;
                  const hasActiveSpiel = activeSpiele.some(s=>s.challengerId===childId||s.defenderId===childId);
                  const isSelected = rangSelection.includes(childId);
                  const selectable = rangSelectionMode && !hasActiveSpiel;
                  const rowBg = isSelected ? 'rgba(251,146,60,0.15)' : idx<3 ? '#fffbeb' : '#f9fafb';
                  const rowBorder = isSelected ? '#fb923c' : hasActiveSpiel ? '#fb923c' : idx<3 ? '#fcd34d' : '#e5e7eb';
                  return (
                    <div key={childId}
                      onClick={selectable ? ()=>handleRangSelect(childId) : undefined}
                      style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'10px',background:rowBg,border:`2px solid ${rowBorder}`,transition:'all 0.1s',cursor:selectable?'pointer':'default',opacity:rangSelectionMode&&hasActiveSpiel?0.45:1}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:isSelected?'#fb923c':idx===0?'#fbbf24':idx===1?'#d1d5db':idx===2?'#d97706':'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:'900',fontSize:medal&&!isSelected?'20px':'14px',color:isSelected?'white':idx<3?'white':'#6b7280'}}>
                        {isSelected ? '✓' : medal || (idx+1)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontWeight:'700',color:'#1f2937',fontSize:'15px'}}>{child.name}</p>
                        {sub&&<p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>{grp?.emoji} {sub.name}</p>}
                      </div>
                      {hasActiveSpiel&&<span style={{fontSize:'11px',background:'#fff7ed',color:'#ea580c',border:'1px solid #fb923c',borderRadius:'8px',padding:'2px 7px',fontWeight:'700',flexShrink:0}}>⚔️ aktiv</span>}
                      {!rangSelectionMode && (
                        <div style={{display:'flex',gap:'4px',alignItems:'center',flexShrink:0}}>
                          <button onClick={()=>moveUp(idx)} disabled={idx===0}
                            style={{width:'28px',height:'28px',borderRadius:'6px',background:idx===0?'#f3f4f6':'#e0f2fe',border:'none',cursor:idx===0?'not-allowed':'pointer',color:idx===0?'#d1d5db':'#0369a1',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'900'}}>▲</button>
                          <button onClick={()=>moveDown(idx)} disabled={idx===rangliste.length-1}
                            style={{width:'28px',height:'28px',borderRadius:'6px',background:idx===rangliste.length-1?'#f3f4f6':'#e0f2fe',border:'none',cursor:idx===rangliste.length-1?'not-allowed':'pointer',color:idx===rangliste.length-1?'#d1d5db':'#0369a1',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'900'}}>▼</button>
                          <button onClick={()=>removeFromRangliste(childId)}
                            style={{width:'28px',height:'28px',borderRadius:'6px',background:'#fee2e2',border:'none',cursor:'pointer',color:'#dc2626',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Abgeschlossene Ranglistenspiele ───────────────── */}
          {ranglistenspiele.archived.length > 0 && (
            <div style={s.card}>
              <h2 style={{margin:'0 0 14px',color:'#92400e',fontSize:'16px',fontWeight:'800'}}>📋 Abgeschlossene Spiele</h2>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {ranglistenspiele.archived.slice(0,10).map(spiel=>{
                  const chal = children[spiel.challengerId];
                  const def  = children[spiel.defenderId];
                  const won = spiel.result==='challenger';
                  const score = `${spiel.sets1??spiel.challengerScore??'?'}:${spiel.sets2??spiel.defenderScore??'?'}`;
                  return (
                    <div key={spiel.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'10px',background:'#f9fafb',border:'1px solid #e5e7eb'}}>
                      <span style={{fontSize:'18px',flexShrink:0}}>{won?'🎉':'✅'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontSize:'14px',fontWeight:'700',color:'#1f2937'}}>{chal?.name||'?'} {score} {def?.name||'?'}</p>
                        <p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>{won?`${chal?.name} rückte vor`:`${def?.name} verteidigte`} · {spiel.date||spiel.closedAt?.slice(0,10)||''}</p>
                      </div>
                    </div>
                  );
                })}
                {ranglistenspiele.archived.length > 10 && (
                  <button onClick={()=>{setArchiveTab('rangliste');navTo('archiv');}} style={{...s.btn('#d97706'),width:'100%',fontSize:'13px'}}>
                    Alle {ranglistenspiele.archived.length} Spiele im Archiv ansehen →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RANGLISTE VIEW (Eltern/Jugendlich) ───────────────────────────────────
  if (view === 'rangliste' && !canEdit()) {
    const myChild = getMyChild();
    const myPos = myChild ? rangliste.indexOf(myChild.id) : -1;
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px',borderBottom:'1px solid rgba(74,222,128,0.08)'}}>
            <button onClick={()=>navTo('home')} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowLeft size={18}/>
            </button>
            <div style={{flex:1}}>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:'20px'}}>📊 Rangliste Jugend</h2>
              {myPos>=0&&<p style={{margin:0,color:'rgba(252,211,77,0.6)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Dein Platz: #{myPos+1}</p>}
            </div>
          </div>
          {rangliste.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.3)'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>📊</div>
              <p style={{fontSize:'15px',fontWeight:'700',margin:'0 0 6px'}}>Noch keine Rangliste vorhanden</p>
              <p style={{fontSize:'13px',margin:0}}>Der Trainer pflegt die Rangliste demnächst ein.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {rangliste.map((childId, idx) => {
                const child = children[childId];
                if (!child) return null;
                const sub = subgroups[child.subgroupId];
                const isMe = myChild?.id === childId;
                const medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':null;
                return (
                  <div key={childId} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'14px',background:isMe?'rgba(252,211,77,0.12)':'rgba(255,255,255,0.04)',border:`1px solid ${isMe?'rgba(252,211,77,0.4)':'rgba(255,255,255,0.07)'}`,boxShadow:isMe?'0 0 0 2px rgba(252,211,77,0.2)':'none'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:idx===0?'#fbbf24':idx===1?'rgba(209,213,219,0.5)':idx===2?'rgba(217,119,6,0.5)':'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:'900',fontSize:medal?'20px':'14px',color:'white'}}>
                      {medal || (idx+1)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontWeight:isMe?'800':'600',color:isMe?'#fcd34d':'white',fontSize:'15px'}}>{child.name}{isMe&&<span style={{fontSize:'11px',fontWeight:'700',color:'#fcd34d',marginLeft:'8px',background:'rgba(252,211,77,0.15)',padding:'1px 8px',borderRadius:'10px',border:'1px solid rgba(252,211,77,0.3)'}}>Du</span>}</p>
                      {sub&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{sub.name}</p>}
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

    const filteredKids = achSearch.trim()
      ? kidsWithSub.filter(c => c.name.toLowerCase().includes(achSearch.toLowerCase()))
      : kidsWithSub;

    const AchCounter = ({label, val, onInc, onDec}) => (
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        {label&&<span style={{fontSize:'12px',color:'#555',minWidth:'90px'}}>{label}</span>}
        <button onClick={onDec} style={{width:'26px',height:'26px',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'6px',background:'rgba(255,255,255,0.08)',cursor:'pointer',fontWeight:'800',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.6)'}}>−</button>
        <span style={{minWidth:'22px',textAlign:'center',fontWeight:'800',fontSize:'14px',color:'white'}}>{val||0}</span>
        <button onClick={onInc} style={{width:'26px',height:'26px',border:'1px solid rgba(74,222,128,0.3)',borderRadius:'6px',background:'rgba(74,222,128,0.12)',cursor:'pointer',fontWeight:'800',fontSize:'15px',color:'#4ade80',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    );

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🏅 Errungenschaften verwalten</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>

          {/* ── Suche ── */}
          <div style={{position:'relative',marginBottom:'16px'}}>
            <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',pointerEvents:'none'}}>🔍</span>
            <input
              value={achSearch} onChange={e=>setAchSearch(e.target.value)}
              placeholder="Kind suchen…"
              style={{width:'100%',boxSizing:'border-box',padding:'11px 12px 11px 38px',borderRadius:'12px',border:'1.5px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.1)',color:'white',fontSize:'14px',fontWeight:'600',outline:'none'}}
            />
            {achSearch&&<button onClick={()=>setAchSearch('')} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:'18px',cursor:'pointer',lineHeight:1}}>×</button>}
          </div>

          {/* ── Ranglisten-Errungenschaften Admin-Panel ──────────── */}
          <RlAchPanel
            rangliste={rangliste}
            ranglisteAch={ranglisteAch}
            children={children}
            kidsWithSub={kidsWithSub}
            saveRanglisteAch={saveRanglisteAch}
            rlAchEditChild={rlAchEditChild}
            setRlAchEditChild={setRlAchEditChild}
          />

          {filteredKids.length===0
            ? <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>{achSearch?'Kein Kind gefunden.':'Keine Kinder vorhanden.'}</div>
            : <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {filteredKids.map(child=>{
                const sg = subgroups[child.subgroupId];
                const ach = getAchievements(child.id);
                const ttrUnlocked = ach.ttrUnlocked || [];
                const isOpen = achExpandedChild === child.id;

                // Gesamtzahl erreichter Errungenschaften berechnen
                const ttrCount = ttrUnlocked.length;
                const tournCount = (ach.einzel1||0)+(ach.einzel2||0)+(ach.einzel3||0)+(ach.doppel1||0)+(ach.doppel2||0)+(ach.doppel3||0);
                const teamCount = ach.team||0;
                const sdmCount = (spielerDesMonatsWins[child.id]||[]).length;
                const rAch = getRanglisteAch(child.id);
                const rlCount = RANK_TIERS.filter(t=>!!rAch.reached?.[t.key]).length;
                const totalAch = ttrCount + tournCount + teamCount + sdmCount + rlCount;

                const ACH_LABELS = {
                  einzel1:'🥇 1. Platz Einzel', einzel2:'🥈 2. Platz Einzel', einzel3:'🥉 3. Platz Einzel',
                  doppel1:'🥇 1. Platz Doppel', doppel2:'🥈 2. Platz Doppel', doppel3:'🥉 3. Platz Doppel',
                  team:'🏆 Mannschaftsmeister',
                };
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
                  createNotification(child.id, 'achievement', label,
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

                const ttrEntries = ttrHistory[child.id]?.entries || [];
                const personalMax = ttrEntries.length ? Math.max(...ttrEntries.map(e=>Number(e.ttr)||0)) : null;

                // Sektionstitel-Stil
                const SecLbl = ({children:ch})=><p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'1.2px'}}>{ch}</p>;

                return (
                  <div key={child.id} style={{borderRadius:'14px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)'}}>
                    {/* ── Kopfzeile (immer sichtbar) ── */}
                    <button onClick={()=>setAchExpandedChild(isOpen?null:child.id)}
                      style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left'}}>
                      <div style={{width:'38px',height:'38px',borderRadius:'50%',background:sg?.color||'#4ade80',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'15px',flexShrink:0}}>
                        {child.name[0]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:'0 0 2px',fontWeight:'800',fontSize:'15px',color:'white'}}>{child.name}</p>
                        <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>{sg?.name||'–'}</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
                        <div style={{textAlign:'right'}}>
                          <span style={{display:'inline-block',padding:'4px 12px',borderRadius:'20px',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',color:'#4ade80',fontWeight:'800',fontSize:'13px'}}>
                            🏅 {totalAch}
                          </span>
                        </div>
                        <span style={{fontSize:'16px',color:'rgba(255,255,255,0.3)',transform:isOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>▾</span>
                      </div>
                    </button>

                    {/* ── Ausgeklappter Bereich ── */}
                    {isOpen && (
                      <div style={{padding:'0 16px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:'16px'}}>

                        {/* TTR */}
                        <div style={{paddingTop:'14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',flexWrap:'wrap'}}>
                            <SecLbl>🏓 TTR Meilensteine</SecLbl>
                            {personalMax!==null
                              ? <span style={{fontSize:'10px',fontWeight:'700',color:'#fbbf24',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:'6px',padding:'1px 7px'}}>⚡ Auto · Bestwert {personalMax}</span>
                              : <span style={{fontSize:'10px',fontWeight:'600',color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.06)',borderRadius:'6px',padding:'1px 7px'}}>manuell</span>}
                          </div>
                          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                            {TTR_MILESTONES.map(val=>{
                              const unlocked = ttrUnlocked.includes(val);
                              const auto = personalMax!==null && val<=personalMax;
                              const manualOverride = unlocked && !auto;
                              return (
                                <div key={val} style={{position:'relative'}}>
                                  <button onClick={()=>toggleTTR(val)}
                                    title={auto?`Automatisch (Bestwert ${personalMax})`:manualOverride?'Manuell vergeben – klicken zum Entfernen':'Manuell vergeben'}
                                    style={{padding:'6px 11px',borderRadius:'9px',
                                      border:`1.5px solid ${manualOverride?'rgba(251,146,60,0.6)':unlocked?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.1)'}`,
                                      background:manualOverride?'rgba(251,146,60,0.14)':unlocked?'rgba(74,222,128,0.12)':'rgba(255,255,255,0.04)',
                                      color:manualOverride?'#fb923c':unlocked?'#4ade80':'rgba(255,255,255,0.25)',
                                      fontWeight:'800',fontSize:'12px',cursor:'pointer',transition:'all 0.12s'}}>
                                    {auto&&unlocked?'⚡ ':manualOverride?'✏️ ':''}{val}
                                  </button>
                                  {manualOverride&&<span style={{position:'absolute',top:'-6px',right:'-4px',background:'#fb923c',color:'white',fontSize:'8px',fontWeight:'800',borderRadius:'4px',padding:'1px 3px',lineHeight:'1.2',pointerEvents:'none'}}>M</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Turnierergebnisse */}
                        <div>
                          <SecLbl>🎖️ Turnierergebnisse</SecLbl>
                          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',overflow:'hidden'}}>
                            <div style={{padding:'6px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:'10px',fontWeight:'800',color:'rgba(253,230,138,0.4)',letterSpacing:'1.2px'}}>EINZEL</div>
                            <div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:'4px'}}>
                              {[{label:'🥇 1. Platz',field:'einzel1'},{label:'🥈 2. Platz',field:'einzel2'},{label:'🥉 3. Platz',field:'einzel3'}].map(({label,field})=>{const v=ach[field]||0;return(
                                <div key={field} style={{display:'flex',alignItems:'center',gap:'10px',padding:'4px 6px',borderRadius:'8px',background:v>0?'rgba(251,146,60,0.08)':'transparent',border:v>0?'1px solid rgba(251,146,60,0.25)':'1px solid transparent'}}>
                                  <span style={{flex:1,fontSize:'13px',color:v>0?'#fb923c':'rgba(255,255,255,0.3)',fontWeight:'700'}}>{label}</span>
                                  {v>0&&<span style={{fontSize:'9px',fontWeight:'800',color:'#fb923c',background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.3)',borderRadius:'4px',padding:'1px 5px'}}>MANUELL</span>}
                                  <AchCounter label="" val={v} onInc={()=>incField(field)} onDec={()=>decField(field)}/>
                                </div>
                              );})}
                            </div>
                            <div style={{padding:'6px 12px',borderTop:'1px solid rgba(255,255,255,0.06)',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:'10px',fontWeight:'800',color:'rgba(103,232,249,0.4)',letterSpacing:'1.2px'}}>DOPPEL</div>
                            <div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:'4px'}}>
                              {[{label:'🥇 1. Platz',field:'doppel1'},{label:'🥈 2. Platz',field:'doppel2'},{label:'🥉 3. Platz',field:'doppel3'}].map(({label,field})=>{const v=ach[field]||0;return(
                                <div key={field} style={{display:'flex',alignItems:'center',gap:'10px',padding:'4px 6px',borderRadius:'8px',background:v>0?'rgba(251,146,60,0.08)':'transparent',border:v>0?'1px solid rgba(251,146,60,0.25)':'1px solid transparent'}}>
                                  <span style={{flex:1,fontSize:'13px',color:v>0?'#fb923c':'rgba(255,255,255,0.3)',fontWeight:'700'}}>{label}</span>
                                  {v>0&&<span style={{fontSize:'9px',fontWeight:'800',color:'#fb923c',background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.3)',borderRadius:'4px',padding:'1px 5px'}}>MANUELL</span>}
                                  <AchCounter label="" val={v} onInc={()=>incField(field)} onDec={()=>decField(field)}/>
                                </div>
                              );})}
                            </div>
                          </div>
                        </div>

                        {/* Mannschaft + SdM */}
                        <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                          <div style={{flex:1,minWidth:'140px'}}>
                            <SecLbl>🏆 Mannschaft</SecLbl>
                            <div style={{display:'flex',alignItems:'center',gap:'10px',background:teamCount>0?'rgba(251,146,60,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${teamCount>0?'rgba(251,146,60,0.25)':'rgba(255,255,255,0.07)'}`,borderRadius:'10px',padding:'8px 12px'}}>
                              <span style={{flex:1,fontSize:'13px',color:teamCount>0?'#fb923c':'rgba(255,255,255,0.3)',fontWeight:'700'}}>🏆 Meisterschaft</span>
                              {teamCount>0&&<span style={{fontSize:'9px',fontWeight:'800',color:'#fb923c',background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.3)',borderRadius:'4px',padding:'1px 5px'}}>MANUELL</span>}
                              <AchCounter label="" val={ach.team} onInc={()=>incField('team')} onDec={()=>decField('team')}/>
                            </div>
                          </div>
                          <div style={{flex:1,minWidth:'140px'}}>
                            <SecLbl>⭐ Spieler des Monats</SecLbl>
                            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 12px'}}>
                              {sdmCount>0
                                ? <p style={{margin:0,fontSize:'12px',color:'#fcd34d',fontWeight:'700',lineHeight:'1.5'}}>{(spielerDesMonatsWins[child.id]||[]).map(w=>w.type==='year'?`👑 J.${w.period}`:`⭐ ${fmtYM(w.period)}`).join(' · ')}</p>
                                : <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.25)'}}>– noch keine –</p>}
                            </div>
                          </div>
                        </div>

                        {/* Rangliste */}
                        {rangliste.includes(child.id) && (()=>{
                          const rank = rangliste.indexOf(child.id)+1;
                          return (
                            <div>
                              <SecLbl>📊 Rangliste (Rang #{rank})</SecLbl>
                              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                                {RANK_TIERS.map(t=>{
                                  const has = !!rAch.reached?.[t.key];
                                  const wk = rAch.weeks?.[t.key]?.count||0;
                                  const frozen = rAch.weeks?.[t.key]?.frozen;
                                  return (
                                    <div key={t.key} style={{padding:'6px 10px',borderRadius:'10px',border:`1.5px solid ${has?'rgba(74,222,128,0.35)':'rgba(255,255,255,0.07)'}`,background:has?'rgba(74,222,128,0.08)':'rgba(255,255,255,0.02)',textAlign:'center',minWidth:'58px'}}>
                                      <div style={{fontSize:'16px'}}>{has?t.icon:'🔒'}</div>
                                      <div style={{fontSize:'10px',fontWeight:'800',color:has?'#4ade80':'rgba(255,255,255,0.2)',marginTop:'2px'}}>{t.label}</div>
                                      <div style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>{wk}W{frozen?' ❄️':''}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
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

    // Registrierungs-Benachrichtigungen für Admin/Trainer
    const regNotifs = Object.values(notifications).filter(n => {
      if (n.type !== 'new_registration') return false;
      const tdb = typeof n.trainerDeletedBy === 'object' && n.trainerDeletedBy ? n.trainerDeletedBy : {};
      return !tdb[uid];
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));

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
              <button onClick={()=>setNotifTrainerTab('registrations')} style={{position:'relative',padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='registrations'?'#dc2626':'#f3f4f6',color:notifTrainerTab==='registrations'?'white':'#555'}}>
                🆕 Registrierungen
                {regNotifs.length>0&&<span style={{position:'absolute',top:'-5px',right:'-5px',background:'#dc2626',color:'white',borderRadius:'50%',width:'16px',height:'16px',fontSize:'10px',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white'}}>{regNotifs.length>9?'9+':regNotifs.length}</span>}
              </button>
              <button onClick={()=>setNotifTrainerTab('inbox')} style={{padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='inbox'?'#7c3aed':'#f3f4f6',color:notifTrainerTab==='inbox'?'white':'#555'}}>✉️ Von Eltern {parentMessages.length>0&&`(${parentMessages.length})`}</button>
              <button onClick={()=>setNotifTrainerTab('trash')} style={{padding:'4px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',background:notifTrainerTab==='trash'?'#374151':'#f3f4f6',color:notifTrainerTab==='trash'?'white':'#555'}}>🗑️ Papierkorb {trashedBatches.length>0&&`(${trashedBatches.length})`}</button>
            </div>
          </div>
          {notifTrainerTab === 'registrations'
            ? regNotifs.length === 0
              ? <p style={{color:'#9ca3af',textAlign:'center',padding:'20px',margin:0}}>Keine neuen Registrierungen.</p>
              : <div style={{display:'grid',gap:'10px'}}>
                  {regNotifs.map(n => {
                    const dateStr = new Date(n.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
                    const isTrashedReg = typeof n.trainerTrashedAt === 'object' && n.trainerTrashedAt && n.trainerTrashedAt[uid];
                    return (
                      <div key={n.id} style={{border:'1px solid #fecaca',borderRadius:'10px',padding:'12px 14px',background:'#fff5f5'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                          <span style={{fontSize:'22px',flexShrink:0}}>🆕</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                              <p style={{margin:0,fontWeight:'700',fontSize:'14px',color:'#1f2937'}}>{n.fromName}</p>
                              <span style={{fontSize:'11px',background:'#fee2e2',color:'#dc2626',padding:'1px 7px',borderRadius:'10px',fontWeight:'700'}}>Wartet auf Freischaltung</span>
                              <span style={{fontSize:'11px',background:'#f3f4f6',color:'#6b7280',padding:'1px 7px',borderRadius:'10px',fontWeight:'600'}}>{n.userType}</span>
                            </div>
                            <p style={{margin:'0 0 2px',fontSize:'13px',color:'#374151'}}>{n.fromEmail}</p>
                            <p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>{dateStr} Uhr</p>
                          </div>
                          <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                            <button onClick={()=>navTo('admin')} title="Zur Nutzerverwaltung" style={{padding:'5px 10px',background:'#dc2626',border:'none',borderRadius:'8px',cursor:'pointer',color:'white',fontSize:'12px',fontWeight:'700'}}>Freischalten →</button>
                            <button onClick={()=>{
                              const tdb = typeof n.trainerDeletedBy==='object'&&n.trainerDeletedBy?{...n.trainerDeletedBy}:{};
                              saveNotifications({...notifications,[n.id]:{...n,trainerDeletedBy:{...tdb,[uid]:true}}});
                            }} title="Entfernen" style={{padding:'5px',background:'rgba(0,0,0,0.06)',border:'none',borderRadius:'8px',cursor:'pointer',color:'#6b7280'}}><X size={15}/></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
          : notifTrainerTab === 'inbox'
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

  // ── MANNSCHAFTEN & LIGEN VIEW (Trainer/Admin) ───────────────────────────
  if (view === 'mannschaften' && canEdit()) {
    const myTeams = Object.values(teams).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const isMyTeam = (t) => (t.trainerUids||[]).includes(user?.uid);

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f4c3a 0%,#134e4a 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#0f766e')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>⚽ Mannschaften {'&'} Ligen</h1>
          <button onClick={()=>{setAddingTeam(v=>!v);setEditingTeam(null);}} style={{...s.btn(addingTeam?'#6b7280':'#0f766e')}}>
            {addingTeam?'✕ Abbrechen':'➕ Mannschaft'}
          </button>
        </div>

        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          {/* ── Team-Formular (neu anlegen / bearbeiten) ── */}
          {(addingTeam || editingTeam) && (()=>{
            const isEdit = !!editingTeam;
            const allTrainers = Object.entries(allUsers||{}).map(([uid,p])=>({...p,uid})).filter(p=>p.role==='trainer'||p.role==='admin');
            const allKids = Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
            const saveTeam = () => {
              if (!teamForm.name.trim()) { alert('Name ist ein Pflichtfeld!'); return; }
              const id = isEdit ? editingTeam : 'team_'+Date.now();
              const existing = isEdit ? (teams[editingTeam]||{}) : {};
              saveTeams({...teams,[id]:{...existing,...teamForm,id}});
              setAddingTeam(false); setEditingTeam(null);
              setTeamForm({name:'',liga:'',tableUrl:'',scheduleUrl:'',trainerUids:[],childIds:[]});
            };
            const toggleArr = (key,val) => setTeamForm(f=>{
              const arr=f[key]||[];
              return {...f,[key]:arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]};
            });
            return (
              <div style={{background:'white',borderRadius:'14px',padding:'20px',marginBottom:'20px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)'}}>
                <h3 style={{margin:'0 0 16px',color:'#0f766e',fontSize:'16px'}}>{isEdit?'✏️ Mannschaft bearbeiten':'➕ Neue Mannschaft'}</h3>
                <div style={{display:'grid',gap:'12px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      <label style={s.label}>Name *</label>
                      <input value={teamForm.name} onChange={e=>setTeamForm(f=>({...f,name:e.target.value}))}
                        placeholder="z.B. 1. Herren" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                    </div>
                    <div>
                      <label style={s.label}>Liga</label>
                      <input value={teamForm.liga} onChange={e=>setTeamForm(f=>({...f,liga:e.target.value}))}
                        placeholder="z.B. Kreisliga A" style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Tabellen-URL (mytischtennis)</label>
                    <input value={teamForm.tableUrl} onChange={e=>setTeamForm(f=>({...f,tableUrl:e.target.value}))}
                      placeholder="https://www.mytischtennis.de/click-tt/..." style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={s.label}>Spielplan-URL (mytischtennis)</label>
                    <input value={teamForm.scheduleUrl} onChange={e=>setTeamForm(f=>({...f,scheduleUrl:e.target.value}))}
                      placeholder="https://www.mytischtennis.de/click-tt/..." style={{...s.input,flex:'none',width:'100%',boxSizing:'border-box'}}/>
                  </div>
                  {allTrainers.length>0&&<div>
                    <label style={s.label}>Trainer</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                      {allTrainers.map(p=>{
                        const sel=(teamForm.trainerUids||[]).includes(p.uid);
                        return <button key={p.uid} type="button" onClick={()=>toggleArr('trainerUids',p.uid)}
                          style={{padding:'5px 12px',borderRadius:'20px',border:`2px solid ${sel?'#0f766e':'#e5e7eb'}`,background:sel?'#ccfbf1':'#f9fafb',color:sel?'#0f766e':'#6b7280',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                          {p.name||p.email}
                        </button>;
                      })}
                    </div>
                  </div>}
                  {allKids.length>0&&<div>
                    <label style={s.label}>Spieler</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                      {allKids.map(c=>{
                        const sel=(teamForm.childIds||[]).includes(c.id);
                        return <button key={c.id} type="button" onClick={()=>toggleArr('childIds',c.id)}
                          style={{padding:'5px 12px',borderRadius:'20px',border:`2px solid ${sel?'#0f766e':'#e5e7eb'}`,background:sel?'#ccfbf1':'#f9fafb',color:sel?'#0f766e':'#6b7280',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                          {c.name}
                        </button>;
                      })}
                    </div>
                  </div>}
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={saveTeam} style={{...s.btn('#0f766e'),flex:1,justifyContent:'center'}}>💾 Speichern</button>
                    <button onClick={()=>{setAddingTeam(false);setEditingTeam(null);setTeamForm({name:'',liga:'',tableUrl:'',scheduleUrl:'',trainerUids:[],childIds:[]});}}
                      style={{...s.btn('#6b7280'),flex:1,justifyContent:'center'}}>✕ Abbrechen</button>
                    {isEdit&&<button onClick={()=>{if(!window.confirm('Mannschaft wirklich löschen?'))return;const u={...teams};delete u[editingTeam];saveTeams(u);setEditingTeam(null);setTeamForm({name:'',liga:'',tableUrl:'',scheduleUrl:'',trainerUids:[],childIds:[]});}}
                      style={{...s.btn('#dc2626'),padding:'8px 14px'}}>🗑️</button>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Keine Mannschaften ── */}
          {myTeams.length===0&&!addingTeam&&(
            <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'40px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>
              {userRole==='admin'?'Noch keine Mannschaften angelegt. Klicke oben auf "➕ Mannschaft".':'Du bist keiner Mannschaft als Trainer zugewiesen.'}
            </div>
          )}

          {/* ── Mannschafts-Kacheln ── */}
          {myTeams.map(team=>{
            const isOpen = !!teamExpanded[team.id];
            const isFetching = !!teamFetching[team.id];
            const isMine = isMyTeam(team);
            const ld = team.leagueData||{};
            const colSt=(i)=>({padding:'6px 10px',fontSize:'12px',whiteSpace:'nowrap',textAlign:i===0?'center':i<=2?'left':'right',color:i===0?'#0f766e':'#374151',fontWeight:i===0?'800':'400',borderRight:'1px solid #e5e7eb',minWidth:i===0?'32px':i<=2?'130px':'55px'});
            const hSt=(i)=>({...colSt(i),background:'#f0fdfa',fontWeight:'700',color:'#0f766e',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.3px'});
            const spSt=(i)=>({padding:'6px 10px',fontSize:'12px',whiteSpace:'nowrap',textAlign:'left',color:'#374151',borderRight:'1px solid #e5e7eb',minWidth:i===0?'160px':i<=2?'140px':'60px'});
            const spH=(i)=>({...spSt(i),background:'#f0fdfa',fontWeight:'700',color:'#0f766e',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.3px'});
            const fetchedStr = ld.fetchedAt ? new Date(ld.fetchedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date(ld.fetchedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '';
            return (
              <div key={team.id} style={{background: isMine?'rgba(110,231,183,0.12)':'rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden',border:`1px solid ${isMine?'rgba(110,231,183,0.45)':'rgba(255,255,255,0.15)'}`}}>
                {/* Collapsed header */}
                <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}} onClick={()=>setTeamExpanded(e=>({...e,[team.id]:!e[team.id]}))}>
                  <span style={{fontSize:'20px'}}>{isOpen?'🔽':'▶️'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <p style={{margin:0,fontWeight:'800',fontSize:'15px',color:'white'}}>{team.name}</p>
                      {isMine&&<span style={{fontSize:'11px',fontWeight:'700',background:'rgba(110,231,183,0.25)',color:'#6ee7b7',padding:'2px 8px',borderRadius:'20px',border:'1px solid rgba(110,231,183,0.4)'}}>Meine Mannschaft</span>}
                    </div>
                    <p style={{margin:'2px 0 0',fontSize:'12px',color:'rgba(255,255,255,0.6)'}}>{team.liga||'Keine Liga'} · {(team.childIds||[]).length} Spieler</p>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    {(team.tableUrl||team.scheduleUrl)&&(
                      <button disabled={isFetching} onClick={()=>fetchTeamLeague(team.id)}
                        style={{...s.btn('#0f766e'),padding:'6px 10px',fontSize:'12px',opacity:isFetching?0.6:1}}>
                        {isFetching?'⏳':'🔄'} Daten
                      </button>
                    )}
                    <button onClick={()=>{
                      const t=teams[team.id];
                      setTeamForm({name:t.name||'',liga:t.liga||'',tableUrl:t.tableUrl||'',scheduleUrl:t.scheduleUrl||'',trainerUids:t.trainerUids||[],childIds:t.childIds||[]});
                      setEditingTeam(team.id); setAddingTeam(false);
                    }} style={{...s.btn('#6b7280'),padding:'6px 10px',fontSize:'12px'}}>✏️</button>
                  </div>
                </div>

                {/* Expanded body */}
                {isOpen&&(
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.1)',padding:'16px',background:'rgba(0,0,0,0.15)'}}>

                    {/* Aufstellung */}
                    {(team.childIds||[]).length>0&&(
                      <div style={{marginBottom:'16px'}}>
                        <p style={{margin:'0 0 8px',fontSize:'11px',fontWeight:'800',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Aufstellung</p>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                          {(team.childIds||[]).map(id=>{
                            const c=children[id];
                            return c?<span key={id} style={{padding:'4px 10px',background:'rgba(255,255,255,0.15)',borderRadius:'20px',fontSize:'13px',color:'white',fontWeight:'600'}}>{c.name}</span>:null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Liga-Daten */}
                    {ld.table&&(
                      <div style={{marginBottom:'16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',flexWrap:'wrap'}}>
                          <p style={{margin:0,fontSize:'11px',fontWeight:'800',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Tabelle</p>
                          {fetchedStr&&<span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>Stand: {fetchedStr}</span>}
                        </div>
                        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'10px',background:'white'}}>
                          <table style={{borderCollapse:'collapse',width:'100%',minWidth:'400px'}}>
                            <thead><tr>{(ld.table.headers||[]).map((h,i)=><th key={i} style={hSt(i)}>{h}</th>)}</tr></thead>
                            <tbody>{(ld.table.rows||[]).map((row,ri)=>{const cols=row.c||row;return <tr key={ri} style={{borderBottom:'1px solid #f3f4f6',background:ri%2===0?'white':'#fafafa'}}>{cols.map((cell,ci)=><td key={ci} style={colSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {ld.schedule&&(
                      <div style={{marginBottom:'16px'}}>
                        <p style={{margin:'0 0 8px',fontSize:'11px',fontWeight:'800',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielplan</p>
                        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch',borderRadius:'10px',background:'white'}}>
                          <table style={{borderCollapse:'collapse',width:'100%',minWidth:'500px'}}>
                            <thead><tr>{(ld.schedule.headers||[]).map((h,i)=><th key={i} style={spH(i)}>{h}</th>)}</tr></thead>
                            <tbody>{(ld.schedule.rows||[]).map((row,ri)=>{const cols=row.c||row;return <tr key={ri} style={{borderBottom:'1px solid #f3f4f6',background:ri%2===0?'white':'#fafafa'}}>{cols.map((cell,ci)=><td key={ci} style={spSt(ci)}>{cell}</td>)}</tr>;})}</tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {!ld.table&&!ld.schedule&&(team.tableUrl||team.scheduleUrl)&&(
                      <div style={{marginBottom:'16px',padding:'12px',background:'rgba(255,255,255,0.07)',borderRadius:'10px',textAlign:'center',color:'rgba(255,255,255,0.5)',fontSize:'13px'}}>
                        Noch keine Daten geladen. Klicke auf "🔄 Daten".
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── KO Runde Helpers ──────────────────────────────────────────────────────
  const buildKoBracketGraph = (B, doubleElim=true) => {
    const wbM=[], lbM=[];
    for(let i=0;i<B/2;i++) wbM.push({id:`wb_1_${i}`,bracket:'W',round:1,slot:i,p1Src:{t:'slot',s:2*i},p2Src:{t:'slot',s:2*i+1}});
    let prevWB=wbM.slice(), wbRnd=1;
    while(prevWB.length>1){ wbRnd++; const next=[];
      for(let i=0;i<prevWB.length;i+=2){ const m={id:`wb_${wbRnd}_${Math.floor(i/2)}`,bracket:'W',round:wbRnd,slot:Math.floor(i/2),p1Src:{t:'win',id:prevWB[i].id},p2Src:{t:'win',id:prevWB[i+1].id}}; wbM.push(m); next.push(m); }
      prevWB=next; }
    const wbFinal=prevWB[0];
    const wbR1=wbM.filter(m=>m.round===1); let prevLB=[], lbRnd=0;
    if(!doubleElim) return {wbMatches:wbM,lbMatches:[],grandFinal:wbFinal,wbFinal,lbFinal:null};
    if(wbR1.length>1){
      lbRnd=1;
      for(let i=0;i<Math.floor(wbR1.length/2);i++){ const m={id:`lb_1_${i}`,bracket:'L',round:1,slot:i,p1Src:{t:'lose',id:wbR1[i].id},p2Src:{t:'lose',id:wbR1[wbR1.length-1-i].id}}; lbM.push(m); prevLB.push(m); }
      let wbDrop=2;
      while(wbDrop<=wbRnd){
        const droppers=wbM.filter(m=>m.round===wbDrop&&m.id!==wbFinal.id);
        if(droppers.length>0){
          lbRnd++; const dropIn=[]; const n=Math.max(prevLB.length,droppers.length);
          for(let i=0;i<n;i++){ const m={id:`lb_${lbRnd}_${i}`,bracket:'L',round:lbRnd,slot:i,p1Src:prevLB[i]?{t:'win',id:prevLB[i].id}:{t:'bye'},p2Src:droppers[i]?{t:'lose',id:droppers[i].id}:{t:'bye'}}; lbM.push(m); dropIn.push(m); }
          prevLB=dropIn; wbDrop++;
          if(prevLB.length>1){ lbRnd++; const cons=[];
            for(let i=0;i<prevLB.length;i+=2){ const m={id:`lb_${lbRnd}_${Math.floor(i/2)}`,bracket:'L',round:lbRnd,slot:Math.floor(i/2),p1Src:{t:'win',id:prevLB[i].id},p2Src:{t:'win',id:prevLB[i+1].id}}; lbM.push(m); cons.push(m); }
            prevLB=cons; }
        } else { wbDrop++; }
      }
      lbRnd++;
      const lbFinal={id:`lb_${lbRnd}_0`,bracket:'L',round:lbRnd,slot:0,p1Src:{t:'win',id:prevLB[0].id},p2Src:{t:'lose',id:wbFinal.id}};
      lbM.push(lbFinal);
      const grandFinal={id:'gf',bracket:'F',round:1,slot:0,p1Src:{t:'win',id:wbFinal.id},p2Src:{t:'win',id:lbFinal.id}};
      return {wbMatches:wbM,lbMatches:lbM,grandFinal,wbFinal,lbFinal};
    }
    return {wbMatches:wbM,lbMatches:[],grandFinal:wbFinal,wbFinal,lbFinal:null};
  };
  const resolveKoBracket = (pt) => {
    const B=pt.bracketSize, pSlots=pt.playerSlots||[], mRes=pt.matchResults||{};
    const graph=buildKoBracketGraph(B, pt.doubleElim||false);
    const allM=[...graph.wbMatches,...graph.lbMatches,...(graph.grandFinal?[graph.grandFinal]:[])];
    const byId=Object.fromEntries(allM.map(m=>[m.id,m]));
    const cache={};
    const getP=(mid)=>{
      if(cache[mid]) return cache[mid];
      const m=byId[mid]; if(!m) return {p1:undefined,p2:undefined};
      const res=(src)=>{
        if(src.t==='slot') return pSlots[src.s]??null;
        if(src.t==='bye') return null;
        const {p1,p2}=getP(src.id); const r=mRes[src.id];
        if(p1===null&&p2===null) return null;
        if(p1===null) return src.t==='win'?p2:null;
        if(p2===null) return src.t==='win'?p1:null;
        if(p1===undefined||p2===undefined) return undefined;
        if(!r) return undefined;
        return src.t==='win'?(r.sets1>r.sets2?p1:p2):(r.sets1>r.sets2?p2:p1);
      };
      const rv={...m,p1:res(m.p1Src),p2:res(m.p2Src),result:mRes[mid]||null};
      cache[mid]=rv; return rv;
    };
    allM.forEach(m=>getP(m.id));
    allM.forEach(m=>{ const r=cache[m.id];
      if(pt.settings?.handicap&&r.p1!=null&&r.p1!==undefined&&r.p2!=null&&r.p2!==undefined){
        const t1=pt.players[r.p1]?.maxTTR||0,t2=pt.players[r.p2]?.maxTTR||0,diff=t1-t2;
        const raw=Math.floor(Math.abs(diff)/(pt.settings.handicapPerTTR||pt.settings.handicapPer100?100/pt.settings.handicapPer100:60));
        const pts=Math.min(raw,pt.settings.handicapMax||6);
        if(pts>0) cache[m.id].handicap={b:diff>0?'p2':'p1',pts};
      }
    });
    return {resolved:cache,graph};
  };

  // ── ÜBUNGSWETTKÄMPFE (Liste + Erstellen) ─────────────────────
  if (view === 'practiceTournaments') {
    const jugendSubs = Object.values(subgroups).filter(sg => sg.groupId === 'jugend');
    const allPTList = Object.values(practiceTournaments).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const maxPlayers = ptCreateForm.type==='team' ? (ptCreateForm.teamSize*2) : (ptCreateForm.groupSize || 4);

    const getSeededPlayers = (ids) => ids
      .map(id => {
        const ach = getAchievements(id);
        const ttrUnlocked = ach.ttrUnlocked || [];
        const maxTTR = ttrUnlocked.length > 0 ? Math.max(...ttrUnlocked) : 0;
        const achScore = (ach.einzel1||0)*3+(ach.einzel2||0)*2+(ach.einzel3||0) +
          (ach.doppel1||0)*3+(ach.doppel2||0)*2+(ach.doppel3||0) +
          (ach.team||0)*2+(spielerDesMonatsWins[id]?.length||0)+ttrUnlocked.length;
        return { childId:id, name:children[id]?.name||'?', subgroupId:children[id]?.subgroupId, maxTTR, achScore };
      })
      .sort((a,b) => b.maxTTR!==a.maxTTR ? b.maxTTR-a.maxTTR : b.achScore!==a.achScore ? b.achScore-a.achScore : a.name.localeCompare(b.name,'de'));

    const jugendChildren = Object.values(children).filter(c => subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const filteredChildren = ptSubgroupFilter==='all' ? jugendChildren : jugendChildren.filter(c=>c.subgroupId===ptSubgroupFilter);

    // Unified seeded list: Jugend + Aktive + Manual
    const getLiveTTR = (id) => {
      const entries = ttrHistory[id]?.entries || [];
      if (!entries.length) return 0;
      return [...entries].sort((a,b)=>b.month.localeCompare(a.month))[0]?.ttr || 0;
    };

    const getAllSeeded = () => {
      const jSeeded = ptSelectedChildren.map(id => {
        const maxTTR = getLiveTTR(id);
        const ach = getAchievements(id);
        const achScore = (ach.einzel1||0)*3+(ach.einzel2||0)*2+(ach.einzel3||0)+
          (ach.doppel1||0)*3+(ach.doppel2||0)*2+(ach.doppel3||0)+
          (ach.team||0)*2+(spielerDesMonatsWins[id]?.length||0);
        return {childId:id, name:children[id]?.name||'?', subgroupId:children[id]?.subgroupId, maxTTR, achScore};
      });
      const aSeeded = ptSelectedAktive.map(id => {
        const p = aktiveSpieler[id];
        return {childId:`aktiv_${id}`, name:p?.name||'?', subgroupId:null, maxTTR:p?.ttr||0, achScore:0};
      });
      const mSeeded = ptManualPlayers.map(p => ({
        childId:p.id, name:p.verein?`${p.name} (${p.verein})`:p.name, subgroupId:null, maxTTR:0, achScore:0, isManual:true
      }));
      return [...jSeeded, ...aSeeded, ...mSeeded]
        .sort((a,b)=>b.maxTTR!==a.maxTTR?b.maxTTR-a.maxTTR:b.achScore!==a.achScore?b.achScore-a.achScore:a.name.localeCompare(b.name,'de'));
    };
    const seededPreview = getAllSeeded();

    const resetPtPlayerState = () => {
      setPtSelectedChildren([]); setPtSubgroupFilter('all');
      setPtSelectedAktive([]); setPtManualPlayers([]); setPtPlayerSearch(''); setPtShowManualForm(false);
      setPtTeamOrderA([]); setPtTeamOrderB([]); setPtTeamNameA('Mannschaft A'); setPtTeamNameB('Mannschaft B');
    };

    const generateTeamMatches = (teamSize, teamSystem) => {
      if (teamSize === 2) {
        if (teamSystem === 'korbylonCup') {
          return [
            {kind:'einzel', aPos:[0], bPos:[1], label:'Einzel (Kreuz) — A1 vs B2'},
            {kind:'doppel', aPos:[0,1], bPos:[0,1], label:'Doppel'},
            {kind:'einzel', aPos:[0], bPos:[0], label:'Einzel — A1 vs B1'},
            {kind:'einzel', aPos:[1], bPos:[1], label:'Einzel — A2 vs B2'},
          ];
        }
        return [
          {kind:'einzel', aPos:[0], bPos:[0], label:'Einzel — Nr.1 vs Nr.1'},
          {kind:'einzel', aPos:[1], bPos:[1], label:'Einzel — Nr.2 vs Nr.2'},
          {kind:'doppel', aPos:[0,1], bPos:[0,1], label:'Doppel'},
        ];
      }
      return [];
    };

    const startTeamTournament = () => {
      const poolMap = {}; seededPreview.forEach(p=>{poolMap[p.childId]=p;});
      const teamA = ptTeamOrderA.map(k=>poolMap[k]).filter(Boolean);
      const teamB = ptTeamOrderB.map(k=>poolMap[k]).filter(Boolean);
      const id = 'pt_' + Date.now();
      const matches = generateTeamMatches(ptCreateForm.teamSize, ptCreateForm.teamSystem).map((m,i)=>({...m, idx:i, result:null}));
      const newPT = {
        id, type:'team',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || user?.email || 'Trainer',
        settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderCustom?ptCreateForm.deciderLength:ptCreateForm.setLength, trackSetScores:ptCreateForm.trackSetScores },
        teamSize: ptCreateForm.teamSize,
        teamSystem: ptCreateForm.teamSystem,
        teamA: {name: ptTeamNameA.trim()||'Mannschaft A', players: teamA},
        teamB: {name: ptTeamNameB.trim()||'Mannschaft B', players: teamB},
        matches,
        status: 'active',
      };
      savePracticeTournaments({...practiceTournaments, [id]: newPT});
      setActivePracticeId(id);
      setPtCreating(false); setPtCreateStep(1); resetPtPlayerState();
      navTo('practiceTournamentDetail');
    };

    const startKoTournament = () => {
      const seeded = getAllSeeded();
      const N = seeded.length;
      const B = Math.pow(2, Math.ceil(Math.log2(Math.max(N, 2))));
      const getSlots = (size) => { if(size===1) return [0]; const prev=getSlots(size/2); const result=new Array(size); for(let i=0;i<size/2;i++){result[2*i]=prev[i];result[2*i+1]=size-1-prev[i];} return result; };
      const seeds = getSlots(B);
      const playerSlots = seeds.map(s => s < N ? s : null);
      const id = 'pt_' + Date.now();
      const newPT = {
        id, type:'ko_runde',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || user?.email || 'Trainer',
        settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderCustom?ptCreateForm.deciderLength:ptCreateForm.setLength, trackSetScores:ptCreateForm.trackSetScores, handicap:ptCreateForm.handicap, handicapPerTTR:ptCreateForm.handicapPerTTR||60, handicapMax:ptCreateForm.handicapMax },
        players: seeded.map((p,i) => ({...p, seed:i+1})),
        bracketSize: B,
        playerSlots,
        doubleElim: ptCreateForm.doubleElim||false,
        matchResults: {},
        status: 'active',
      };
      savePracticeTournaments({...practiceTournaments, [id]: newPT});
      setActivePracticeId(id);
      setPtCreating(false); setPtCreateStep(1); resetPtPlayerState();
      navTo('practiceTournamentDetail');
    };

    const startTournament = () => {
      if (ptCreateForm.type === 'ko_runde') { startKoTournament(); return; }
      if (ptCreateForm.type === 'team') { startTeamTournament(); return; }
      const seeded = getAllSeeded();
      const id = 'pt_' + Date.now();
      const newPT = {
        id, type:'4er_gruppe',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || user?.email || 'Trainer',
        settings: { winSets:ptCreateForm.winSets, setLength:ptCreateForm.setLength, deciderLength:ptCreateForm.deciderCustom?ptCreateForm.deciderLength:ptCreateForm.setLength, trackSetScores:ptCreateForm.trackSetScores, handicap:ptCreateForm.handicap, handicapPerTTR:ptCreateForm.handicapPerTTR||60, handicapMax:ptCreateForm.handicapMax },
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
              if (p1 !== -1 && p2 !== -1) {
                let handicap = null;
                if (ptCreateForm.handicap) {
                  const ttr1 = seeded[p1]?.maxTTR||0, ttr2 = seeded[p2]?.maxTTR||0;
                  const diff = ttr1 - ttr2;
                  const raw = Math.floor(Math.abs(diff) / (ptCreateForm.handicapPerTTR||60));
                  const pts = Math.min(raw, ptCreateForm.handicapMax);
                  if (pts > 0) handicap = diff > 0 ? {beneficiary: p2, points: pts} : {beneficiary: p1, points: pts};
                }
                allMatches.push({round:r+1, p1Idx:p1, p2Idx:p2, result:null, ...(handicap?{handicap}:{})});
              }
            }
            rotating.unshift(rotating.pop());
          }
          return allMatches;
        })(),
        status:'active',
      };
      savePracticeTournaments({...practiceTournaments, [id]: newPT});
      setActivePracticeId(id);
      setPtCreating(false); setPtCreateStep(1); resetPtPlayerState();
      navTo('practiceTournamentDetail');
    };

    const DIN = {background:'white',border:'1px solid #c4b5fd',borderRadius:'10px',color:'#1f2937',fontSize:'14px',outline:'none'};
    const ptBtn = (active) => ({flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${active?'#7c3aed':'#e5e7eb'}`,background:active?'rgba(124,58,237,0.1)':'#f9fafb',color:active?'#7c3aed':'#6b7280',cursor:'pointer',fontWeight:'800',fontSize:'15px',transition:'all 0.12s'});
    const smBtn = (active) => ({width:'34px',height:'34px',borderRadius:'8px',background:active?'rgba(124,58,237,0.1)':'#f9fafb',border:`2px solid ${active?'#7c3aed':'#e5e7eb'}`,color:active?'#7c3aed':'#6b7280',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'});

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#4a1d96 0%,#7c3aed 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {/* Header */}
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🎮 Übungswettkämpfe</h1>
          {!ptCreating && (<div style={{display:'flex',gap:'8px',flexShrink:0}}>
            <button onClick={()=>{setArchiveTab('practiceTournaments');navTo('archiv');}} style={s.btn('#6d28d9')}>
              <Archive size={14}/> Archiv
            </button>
            <button onClick={()=>{setPtCreating(true);setPtCreateStep(1);resetPtPlayerState();setPtCreateForm({type:'4er_gruppe',winSets:2,groupSize:4,setLength:11,deciderLength:7,trackSetScores:false,deciderCustom:false,handicap:false,handicapPerTTR:60,handicapMax:6,doubleElim:false,teamSize:2,teamSystem:'kingsCup'});}} style={s.btn('#16a34a')}>
              <Plus size={15}/> Neuer Wettkampf
            </button>
          </div>)}
        </div>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>


          {/* ── Erstellungs-Wizard ─────────────────────────────── */}
          {ptCreating && (
            <div style={{...s.card,border:'2px solid #c4b5fd'}}>

              {/* Step-Indicator */}
              <div style={{display:'flex',gap:'12px',marginBottom:'22px',alignItems:'center'}}>
                {[{n:1,l:'Einstellungen'},{n:2,l:'Spieler'}].map(({n,l})=>(
                  <div key={n} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:ptCreateStep>=n?'#7c3aed':'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:'white'}}>{n}</div>
                    <span style={{fontSize:'12px',color:ptCreateStep>=n?'#7c3aed':'#9ca3af',fontWeight:'600'}}>{l}</span>
                    {n<2&&<span style={{color:'#d1d5db',marginLeft:'4px'}}>›</span>}
                  </div>
                ))}
                <button onClick={()=>{setPtCreating(false);setPtCreateStep(1);resetPtPlayerState();}} style={{marginLeft:'auto',padding:'4px 10px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:'8px',color:'#6b7280',cursor:'pointer',fontSize:'12px'}}>✕</button>
              </div>

              {/* Step 1: Typ + Einstellungen */}
              {ptCreateStep===1 && (
                <>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Wettkampftyp</p>
                  <div style={{display:'flex',gap:'8px',marginBottom:'22px'}}>
                    {[{v:'4er_gruppe',icon:'🎯',label:'Rundenturnier',desc:'Jeder gegen jeden'},{v:'ko_runde',icon:'🏆',label:'KO Runde',desc:'Turnierbaum · Double Elimination'},{v:'team',icon:'🤝',label:'Mannschaftsspiel',desc:'Team gegen Team'}].map(opt=>(
                      <button key={opt.v} onClick={()=>setPtCreateForm(f=>({...f,type:opt.v}))}
                        style={{flex:1,padding:'12px 10px',border:`2px solid ${ptCreateForm.type===opt.v?'#7c3aed':'#e5e7eb'}`,borderRadius:'12px',background:ptCreateForm.type===opt.v?'rgba(124,58,237,0.08)':'#f9fafb',cursor:'pointer',textAlign:'left',transition:'all 0.1s'}}>
                        <div style={{fontSize:'20px',marginBottom:'3px'}}>{opt.icon}</div>
                        <div style={{fontWeight:'800',color:ptCreateForm.type===opt.v?'#7c3aed':'#1f2937',fontSize:'13px'}}>{opt.label}</div>
                        <div style={{fontSize:'10px',color:'#9ca3af',marginTop:'1px'}}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {ptCreateForm.type!=='ko_runde'&&ptCreateForm.type!=='team'&&<>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Gruppengröße</p>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'22px'}}>
                    {Array.from({length:28},(_,i)=>i+3).map(n=>(
                      <button key={n} onClick={()=>setPtCreateForm(f=>({...f,groupSize:n}))}
                        style={{...ptBtn(ptCreateForm.groupSize===n),flex:'none',width:'42px',fontSize:'15px'}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  </>}
                  {ptCreateForm.type==='team'&&<>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Mannschaftsgröße</p>
                  <div style={{display:'flex',gap:'6px',marginBottom:'18px'}}>
                    {[2,3,4,6].map(n=>{
                      const enabled = n===2;
                      return (
                        <button key={n} disabled={!enabled} onClick={()=>enabled&&setPtCreateForm(f=>({...f,teamSize:n}))}
                          style={{...ptBtn(ptCreateForm.teamSize===n&&enabled),flex:'none',width:'62px',fontSize:'14px',opacity:enabled?1:0.4,cursor:enabled?'pointer':'not-allowed',position:'relative'}}>
                          {n}er{!enabled&&<div style={{fontSize:'8px',fontWeight:'700',marginTop:'2px'}}>bald</div>}
                        </button>
                      );
                    })}
                  </div>
                  {ptCreateForm.teamSize===2&&<>
                  <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielsystem</p>
                  <div style={{display:'flex',gap:'8px',marginBottom:'22px'}}>
                    {[
                      {v:'kingsCup',label:'Kings Cup',desc:'2 Einzel (1v1, 2v2) + Doppel'},
                      {v:'korbylonCup',label:'Korbylon Cup',desc:'Kreuz-Einzel + Doppel + 2 Einzel'},
                    ].map(opt=>(
                      <button key={opt.v} onClick={()=>setPtCreateForm(f=>({...f,teamSystem:opt.v}))}
                        style={{flex:1,padding:'12px 10px',border:`2px solid ${ptCreateForm.teamSystem===opt.v?'#7c3aed':'#e5e7eb'}`,borderRadius:'12px',background:ptCreateForm.teamSystem===opt.v?'rgba(124,58,237,0.08)':'#f9fafb',cursor:'pointer',textAlign:'left'}}>
                        <div style={{fontWeight:'800',color:ptCreateForm.teamSystem===opt.v?'#7c3aed':'#1f2937',fontSize:'13px'}}>{opt.label}</div>
                        <div style={{fontSize:'10px',color:'#9ca3af',marginTop:'1px'}}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  </>}
                  </>}
                  {ptCreateForm.type==='ko_runde'&&(
                    <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'20px',padding:'12px 14px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'12px'}}>
                      <button onClick={()=>setPtCreateForm(f=>({...f,doubleElim:!f.doubleElim}))}
                        style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${ptCreateForm.doubleElim?'#7c3aed':'#d1d5db'}`,background:ptCreateForm.doubleElim?'rgba(124,58,237,0.1)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                        {ptCreateForm.doubleElim&&<span style={{fontSize:'14px',color:'#7c3aed',lineHeight:1}}>✓</span>}
                      </button>
                      <div style={{flex:1,cursor:'pointer'}} onClick={()=>setPtCreateForm(f=>({...f,doubleElim:!f.doubleElim}))}>
                        <p style={{margin:'0 0 2px',fontSize:'13px',fontWeight:'700',color:ptCreateForm.doubleElim?'#7c3aed':'#555'}}>Double Elimination</p>
                        <p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>{ptCreateForm.doubleElim?'Verlierer spielen im Verlierer-Bracket weiter, bis nur noch einer übrig ist':'Einfaches KO – wer verliert scheidet aus'}</p>
                      </div>
                    </div>
                  )}

                  <p style={{margin:'0 0 14px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spielmodus</p>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px',marginBottom:'22px'}}>

                    {/* Gewinnsätze */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'#555',fontWeight:'700'}}>Gewinnsätze</p>
                      <div style={{display:'flex',gap:'6px'}}>
                        {[1,2,3].map(n=>(
                          <button key={n} onClick={()=>setPtCreateForm(f=>({...f,winSets:n}))} style={ptBtn(ptCreateForm.winSets===n)}>{n}</button>
                        ))}
                      </div>
                    </div>

                    {/* Ergebniserfassung */}
                    <div>
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'#555',fontWeight:'700'}}>Ergebniserfassung</p>
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
                      <p style={{margin:'0 0 8px',fontSize:'12px',color:'#555',fontWeight:'700'}}>Satzlänge</p>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.max(5,f.setLength-1)}))} style={smBtn(false)}>−</button>
                        <span style={{fontSize:'22px',fontWeight:'900',color:'#1f2937',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.setLength}</span>
                        <button onClick={()=>setPtCreateForm(f=>({...f,setLength:Math.min(21,f.setLength+1)}))} style={smBtn(false)}>+</button>
                        <span style={{fontSize:'12px',color:'#9ca3af'}}>Punkte</span>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Entscheidungssatz — Checkbox + bedingte Länge */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'20px',padding:'12px 14px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'12px'}}>
                    <button onClick={()=>setPtCreateForm(f=>({...f,deciderCustom:!f.deciderCustom}))}
                      style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${ptCreateForm.deciderCustom?'#d97706':'#d1d5db'}`,background:ptCreateForm.deciderCustom?'rgba(217,119,6,0.1)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                      {ptCreateForm.deciderCustom&&<span style={{fontSize:'14px',color:'#d97706',lineHeight:1}}>✓</span>}
                    </button>
                    <div style={{flex:1}}>
                      <p style={{margin:'0 0 2px',fontSize:'13px',fontWeight:'700',color:ptCreateForm.deciderCustom?'#d97706':'#555',cursor:'pointer'}} onClick={()=>setPtCreateForm(f=>({...f,deciderCustom:!f.deciderCustom}))}>
                        Abweichende Entscheidungssatzlänge
                      </p>
                      <p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>
                        {ptCreateForm.deciderCustom?'Eigene Punktzahl für den Entscheidungssatz festlegen':'Entscheidungssatz hat dieselbe Länge wie normale Sätze'}
                      </p>
                      {ptCreateForm.deciderCustom&&(
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'10px'}}>
                          <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.max(5,f.deciderLength-1)}))} style={smBtn(false)}>−</button>
                          <span style={{fontSize:'22px',fontWeight:'900',color:'#d97706',minWidth:'32px',textAlign:'center'}}>{ptCreateForm.deciderLength}</span>
                          <button onClick={()=>setPtCreateForm(f=>({...f,deciderLength:Math.min(21,f.deciderLength+1)}))} style={smBtn(false)}>+</button>
                          <span style={{fontSize:'12px',color:'#9ca3af'}}>Punkte</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vorgabe */}
                  {ptCreateForm.type!=='team'&&<div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'20px',padding:'12px 14px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'12px'}}>
                    <button onClick={()=>setPtCreateForm(f=>({...f,handicap:!f.handicap}))}
                      style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${ptCreateForm.handicap?'#7c3aed':'#d1d5db'}`,background:ptCreateForm.handicap?'rgba(124,58,237,0.1)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px'}}>
                      {ptCreateForm.handicap&&<span style={{fontSize:'14px',color:'#7c3aed',lineHeight:1}}>✓</span>}
                    </button>
                    <div style={{flex:1}}>
                      <p style={{margin:'0 0 2px',fontSize:'13px',fontWeight:'700',color:ptCreateForm.handicap?'#7c3aed':'#555',cursor:'pointer'}} onClick={()=>setPtCreateForm(f=>({...f,handicap:!f.handicap}))}>
                        Vorgabe (Handicap)
                      </p>
                      <p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>
                        {ptCreateForm.handicap?'TTR-Differenz wird in Vorgabepunkte umgerechnet':'Schwächere Spieler erhalten Punkte basierend auf TTR-Unterschied'}
                      </p>
                      {ptCreateForm.handicap&&(
                        <div style={{marginTop:'10px'}}>
                          <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'#555'}}>Pro wie viele TTR Differenz = 1 Punkt Vorgabe:</p>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                            <button onClick={()=>setPtCreateForm(f=>({...f,handicapPerTTR:Math.max(10,f.handicapPerTTR-10)}))} style={smBtn(false)}>−</button>
                            <span style={{fontSize:'22px',fontWeight:'900',color:'#7c3aed',minWidth:'48px',textAlign:'center'}}>{ptCreateForm.handicapPerTTR}</span>
                            <button onClick={()=>setPtCreateForm(f=>({...f,handicapPerTTR:f.handicapPerTTR+10}))} style={smBtn(false)}>+</button>
                            <span style={{fontSize:'12px',color:'#9ca3af'}}>TTR</span>
                          </div>
                          <p style={{margin:'0 0 10px',fontSize:'11px',color:'#9ca3af'}}>
                            Beispiel: TTR-Differenz 240 → {Math.min(Math.floor(240/ptCreateForm.handicapPerTTR), ptCreateForm.handicapMax)} Vorgabepunkte
                          </p>
                          <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'#555'}}>Maximale Vorgabe: <span style={{color:'#7c3aed',fontWeight:'900'}}>{ptCreateForm.handicapMax} Punkte</span></p>
                          <input type="range" min="1" max="20" step="1" value={ptCreateForm.handicapMax}
                            onChange={e=>setPtCreateForm(f=>({...f,handicapMax:Number(e.target.value)}))}
                            style={{width:'100%',accentColor:'#7c3aed',height:'6px',cursor:'pointer'}}/>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#9ca3af',marginTop:'2px'}}>
                            <span>1</span><span>10</span><span>20</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>}

                  <button onClick={()=>setPtCreateStep(2)}
                    style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'15px'}}>
                    Weiter → Spieler auswählen
                  </button>
                </>
              )}

              {/* Step 2: Spieler */}
              {ptCreateStep===2 && (()=>{
                const isKo = ptCreateForm.type==='ko_runde';
                const isTeam = ptCreateForm.type==='team';
                const allSeeded = seededPreview; // already computed via getAllSeeded()
                const totalSelected = allSeeded.length;
                const teamsComplete = ptTeamOrderA.length===ptCreateForm.teamSize && ptTeamOrderB.length===ptCreateForm.teamSize;
                const canStart = isKo ? totalSelected>=3 : isTeam ? (totalSelected===maxPlayers && teamsComplete) : totalSelected===maxPlayers;

                const searchLower = ptPlayerSearch.toLowerCase().trim();
                const aktiveList = Object.values(aktiveSpieler).sort((a,b)=>(a.name||'').localeCompare(b.name||'','de'));
                const filtJugend = searchLower ? filteredChildren.filter(c=>c.name.toLowerCase().includes(searchLower)) : filteredChildren;
                const filtAktive = searchLower ? aktiveList.filter(p=>(p.name||'').toLowerCase().includes(searchLower)) : aktiveList;

                const SecHdr = ({label,right}) => (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 2px 5px'}}>
                    <span style={{fontSize:'10px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'1px'}}>{label}</span>
                    {right&&<span style={{fontSize:'10px',color:'#9ca3af'}}>{right}</span>}
                  </div>
                );

                const PlayerRow = ({id, name, sub, ttr, selected, onToggle, badgeLabel}) => {
                  const disabled = !selected && !isKo && totalSelected>=maxPlayers;
                  return (
                    <div onClick={()=>{if(disabled)return;onToggle();}}
                      style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'10px',border:`1.5px solid ${selected?'#7c3aed':'#e5e7eb'}`,background:selected?'rgba(124,58,237,0.06)':'#f9fafb',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1,transition:'all 0.1s'}}>
                      <div style={{width:'20px',height:'20px',borderRadius:'5px',border:`2px solid ${selected?'#7c3aed':'#d1d5db'}`,background:selected?'#7c3aed':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {selected&&<Check size={12} color="white"/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontWeight:'700',color:'#1f2937',fontSize:'13px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</p>
                        {sub&&<p style={{margin:0,fontSize:'11px',color:'#9ca3af'}}>{sub}</p>}
                      </div>
                      {badgeLabel&&<span style={{fontSize:'10px',fontWeight:'800',color:'#d97706',background:'rgba(217,119,6,0.08)',border:'1px solid rgba(217,119,6,0.2)',padding:'2px 7px',borderRadius:'8px',flexShrink:0}}>{badgeLabel}</span>}
                      {ttr&&<span style={{fontSize:'11px',fontWeight:'800',color:'#7c3aed',background:'rgba(124,58,237,0.1)',padding:'2px 7px',borderRadius:'8px',flexShrink:0}}>TTR {ttr}</span>}
                    </div>
                  );
                };

                const addManual = () => {
                  if(!ptManualForm.name.trim()) return;
                  setPtManualPlayers(prev=>[...prev,{id:'manual_'+Date.now(),name:ptManualForm.name.trim(),verein:ptManualForm.verein.trim()}]);
                  setPtManualForm({name:'',verein:''});
                  setPtShowManualForm(false);
                };

                return (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                    <button onClick={()=>setPtCreateStep(1)} style={{padding:'6px 12px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:'8px',color:'#6b7280',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>← Zurück</button>
                    <h3 style={{margin:0,color:'#7c3aed',fontSize:'15px',fontWeight:'800'}}>Spieler ({totalSelected}{isKo?' (min. 3)':'/'+maxPlayers})</h3>
                  </div>

                  {/* Suche */}
                  <input type="text" placeholder="🔍 Spieler suchen…" value={ptPlayerSearch} onChange={e=>setPtPlayerSearch(e.target.value)}
                    style={{width:'100%',boxSizing:'border-box',padding:'8px 12px',borderRadius:'10px',border:'1px solid #e5e7eb',background:'#f9fafb',fontSize:'13px',outline:'none',marginBottom:'4px'}}/>

                  {/* ── Filter-Leiste: Alle · Jugendgruppen · Erwachsene ── */}
                  {!searchLower&&(
                    <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
                      {[{id:'all',name:'Alle'}, ...jugendSubs, {id:'erwachsene',name:'Erwachsene'}].map(sg=>(
                        <button key={sg.id} onClick={()=>setPtSubgroupFilter(sg.id)}
                          style={{padding:'4px 10px',borderRadius:'16px',border:`2px solid ${ptSubgroupFilter===sg.id?'#7c3aed':'#e5e7eb'}`,background:ptSubgroupFilter===sg.id?'rgba(124,58,237,0.1)':'white',color:ptSubgroupFilter===sg.id?'#7c3aed':'#6b7280',cursor:'pointer',fontSize:'11px',fontWeight:'700'}}>
                          {sg.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Kombinierte Spielerliste ── */}
                  {(()=>{
                    const showJugend = ptSubgroupFilter!=='erwachsene' || searchLower;
                    const showAktive = ptSubgroupFilter==='all'||ptSubgroupFilter==='erwachsene'||searchLower;
                    const jugendRows = showJugend ? filtJugend.map(c=>{
                      const ttr = getLiveTTR(c.id);
                      return <PlayerRow key={c.id} id={c.id} name={c.name} sub={subgroups[c.subgroupId]?.name} ttr={ttr||null}
                        selected={ptSelectedChildren.includes(c.id)}
                        onToggle={()=>setPtSelectedChildren(prev=>prev.includes(c.id)?prev.filter(x=>x!==c.id):[...prev,c.id])}/>;
                    }) : [];
                    const aktiveRows = showAktive ? filtAktive.map(p=>{
                      const pid=p.id||p.spielernr;
                      return <PlayerRow key={pid} id={pid} name={p.name} sub="Aktive" ttr={p.ttr||null}
                        selected={ptSelectedAktive.includes(pid)}
                        onToggle={()=>setPtSelectedAktive(prev=>prev.includes(pid)?prev.filter(x=>x!==pid):[...prev,pid])}/>;
                    }) : [];
                    const combined = [...jugendRows, ...aktiveRows];
                    return (
                      <div style={{display:'grid',gap:'5px',marginBottom:'4px',maxHeight:'300px',overflowY:'auto',paddingRight:'4px'}}>
                        {combined.length===0
                          ? <p style={{color:'#9ca3af',textAlign:'center',padding:'16px 0',fontSize:'13px'}}>Keine Spieler gefunden.</p>
                          : combined}
                      </div>
                    );
                  })()}

                  {/* ── Manuell hinzugefügte ── */}
                  {ptManualPlayers.length>0&&(
                    <div style={{display:'grid',gap:'5px',marginBottom:'4px'}}>
                      <SecHdr label="Manuell" right={`${ptManualPlayers.length}`}/>
                      {ptManualPlayers.map(p=>(
                        <div key={p.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'10px',border:'1.5px solid #7c3aed',background:'rgba(124,58,237,0.06)'}}>
                          <Check size={14} color="#7c3aed"/>
                          <span style={{flex:1,fontWeight:'700',color:'#1f2937',fontSize:'13px'}}>{p.name}{p.verein&&<span style={{color:'#9ca3af',fontWeight:'400'}}> · {p.verein}</span>}</span>
                          <span style={{fontSize:'10px',fontWeight:'800',color:'#d97706',background:'rgba(217,119,6,0.08)',border:'1px solid rgba(217,119,6,0.2)',padding:'2px 7px',borderRadius:'8px'}}>Gast</span>
                          <button onClick={()=>setPtManualPlayers(prev=>prev.filter(x=>x.id!==p.id))}
                            style={{width:'22px',height:'22px',borderRadius:'6px',background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <X size={11}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manuell hinzufügen */}
                  {!ptShowManualForm
                    ? <button onClick={()=>setPtShowManualForm(true)}
                        style={{width:'100%',padding:'9px',marginTop:'8px',background:'#f9fafb',border:'2px dashed #e5e7eb',borderRadius:'10px',color:'#9ca3af',cursor:'pointer',fontSize:'13px',fontWeight:'700'}}>
                        + Spieler manuell hinzufügen
                      </button>
                    : <div style={{marginTop:'8px',padding:'12px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'10px'}}>
                        <p style={{margin:'0 0 8px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spieler manuell hinzufügen</p>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>
                          <input type="text" placeholder="Name (Pflichtfeld)" value={ptManualForm.name} onChange={e=>setPtManualForm(f=>({...f,name:e.target.value}))}
                            style={{flex:'1 1 150px',padding:'8px 10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'13px',outline:'none'}}/>
                          <input type="text" placeholder="Verein (optional)" value={ptManualForm.verein} onChange={e=>setPtManualForm(f=>({...f,verein:e.target.value}))}
                            style={{flex:'1 1 130px',padding:'8px 10px',borderRadius:'8px',border:'1px solid #d1d5db',fontSize:'13px',outline:'none'}}/>
                        </div>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button onClick={addManual} disabled={!ptManualForm.name.trim()}
                            style={{flex:1,padding:'8px',background:ptManualForm.name.trim()?'rgba(124,58,237,0.1)':'#f3f4f6',border:`1px solid ${ptManualForm.name.trim()?'#c4b5fd':'#e5e7eb'}`,borderRadius:'8px',color:ptManualForm.name.trim()?'#7c3aed':'#9ca3af',cursor:ptManualForm.name.trim()?'pointer':'not-allowed',fontWeight:'700',fontSize:'13px'}}>
                            Hinzufügen
                          </button>
                          <button onClick={()=>{setPtShowManualForm(false);setPtManualForm({name:'',verein:''});}}
                            style={{padding:'8px 14px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:'8px',color:'#6b7280',cursor:'pointer',fontSize:'13px'}}>
                            Abbrechen
                          </button>
                        </div>
                      </div>
                  }

                  {/* Team-Zuordnung */}
                  {isTeam && allSeeded.length>0 && (()=>{
                    const teamSize = ptCreateForm.teamSize;
                    const assigned = new Set([...ptTeamOrderA, ...ptTeamOrderB]);
                    const unassigned = allSeeded.filter(p=>!assigned.has(p.childId));
                    const TeamCol = ({name,setName,order,setOrder,color,otherOrder}) => (
                      <div style={{flex:1,minWidth:'200px',border:`2px solid ${color}33`,borderRadius:'12px',padding:'10px'}}>
                        <input value={name} onChange={e=>setName(e.target.value)}
                          style={{width:'100%',boxSizing:'border-box',padding:'6px 8px',marginBottom:'8px',border:`1px solid ${color}55`,borderRadius:'8px',fontSize:'13px',fontWeight:'800',color,outline:'none'}}/>
                        {order.length===0
                          ? <p style={{margin:0,fontSize:'11px',color:'#9ca3af',fontStyle:'italic'}}>Noch keine Spieler zugeordnet</p>
                          : <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                            {order.map((key,i)=>{
                              const p = allSeeded.find(x=>x.childId===key);
                              return (
                                <div key={key} style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px',background:'#f9fafb',borderRadius:'8px'}}>
                                  <span style={{fontSize:'11px',fontWeight:'900',color,minWidth:'16px'}}>{i+1}.</span>
                                  <span style={{flex:1,fontSize:'12px',fontWeight:'700',color:'#1f2937',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p?.name||'?'}</span>
                                  <button onClick={()=>setOrder(o=>{const n=[...o];if(i>0){[n[i-1],n[i]]=[n[i],n[i-1]];}return n;})} disabled={i===0}
                                    style={{width:'20px',height:'20px',borderRadius:'5px',background:'#f3f4f6',border:'none',cursor:i===0?'default':'pointer',color:i===0?'#d1d5db':'#6b7280',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>↑</button>
                                  <button onClick={()=>setOrder(o=>{const n=[...o];if(i<n.length-1){[n[i+1],n[i]]=[n[i],n[i+1]];}return n;})} disabled={i===order.length-1}
                                    style={{width:'20px',height:'20px',borderRadius:'5px',background:'#f3f4f6',border:'none',cursor:i===order.length-1?'default':'pointer',color:i===order.length-1?'#d1d5db':'#6b7280',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>↓</button>
                                  <button onClick={()=>setOrder(o=>o.filter(x=>x!==key))}
                                    style={{width:'20px',height:'20px',borderRadius:'5px',background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',cursor:'pointer',color:'#f87171',fontSize:'11px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                                </div>
                              );
                            })}
                          </div>
                        }
                      </div>
                    );
                    return (
                      <div style={{margin:'16px 0'}}>
                        <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.5px'}}>Teams zusammenstellen ({teamSize} pro Team, Reihenfolge = Position)</p>
                        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'12px'}}>
                          <TeamCol name={ptTeamNameA} setName={setPtTeamNameA} order={ptTeamOrderA} setOrder={setPtTeamOrderA} color="#7c3aed"/>
                          <TeamCol name={ptTeamNameB} setName={setPtTeamNameB} order={ptTeamOrderB} setOrder={setPtTeamOrderB} color="#db2777"/>
                        </div>
                        {unassigned.length>0 && (
                          <div>
                            <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'#6b7280'}}>Nicht zugeordnet:</p>
                            <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                              {unassigned.map(p=>(
                                <div key={p.childId} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'8px'}}>
                                  <span style={{flex:1,fontSize:'13px',fontWeight:'700',color:'#1f2937'}}>{p.name}</span>
                                  <button onClick={()=>setPtTeamOrderA(o=>o.length<teamSize?[...o,p.childId]:o)} disabled={ptTeamOrderA.length>=teamSize}
                                    style={{padding:'4px 10px',borderRadius:'7px',border:'1px solid #c4b5fd',background:ptTeamOrderA.length>=teamSize?'#f3f4f6':'rgba(124,58,237,0.08)',color:ptTeamOrderA.length>=teamSize?'#d1d5db':'#7c3aed',cursor:ptTeamOrderA.length>=teamSize?'not-allowed':'pointer',fontWeight:'700',fontSize:'11px'}}>→ A</button>
                                  <button onClick={()=>setPtTeamOrderB(o=>o.length<teamSize?[...o,p.childId]:o)} disabled={ptTeamOrderB.length>=teamSize}
                                    style={{padding:'4px 10px',borderRadius:'7px',border:'1px solid #f9a8d4',background:ptTeamOrderB.length>=teamSize?'#f3f4f6':'rgba(219,39,119,0.08)',color:ptTeamOrderB.length>=teamSize?'#d1d5db':'#db2777',cursor:ptTeamOrderB.length>=teamSize?'not-allowed':'pointer',fontWeight:'700',fontSize:'11px'}}>→ B</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Setzungs-Vorschau */}
                  {!isTeam && allSeeded.length>0&&(
                    <div style={{margin:'12px 0',padding:'12px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'12px'}}>
                      <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'#16a34a',textTransform:'uppercase',letterSpacing:'0.4px'}}>Setzung (nach TTR + Errungenschaften)</p>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                        {allSeeded.map((p,i)=>(
                          <div key={p.childId} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'13px',fontWeight:'900',color:'#16a34a',minWidth:'20px'}}>{i+1}.</span>
                            <span style={{fontSize:'13px',fontWeight:'700',color:'#1f2937'}}>{p.name}</span>
                            {p.isManual&&<span style={{fontSize:'10px',fontWeight:'700',color:'#d97706'}}>Gast</span>}
                            {p.maxTTR>0&&<span style={{fontSize:'11px',color:'#7c3aed',fontWeight:'600'}}>TTR {p.maxTTR}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={startTournament} disabled={!canStart}
                    style={{width:'100%',padding:'14px',background:canStart?'linear-gradient(135deg,#7c3aed,#6d28d9)':'#e5e7eb',color:canStart?'white':'#9ca3af',border:'none',borderRadius:'12px',cursor:canStart?'pointer':'not-allowed',fontWeight:'800',fontSize:'15px',opacity:canStart?1:0.7,transition:'all 0.15s'}}>
                    {canStart
                      ?(isKo?`🏆 KO Turnier starten! (${totalSelected} Spieler)`:isTeam?'🤝 Mannschaftsspiel starten!':'🎮 Wettkampf starten!')
                      :(isKo?`Mind. 3 Spieler auswählen (${totalSelected}/3)`
                        :isTeam?(totalSelected<maxPlayers?`Noch ${maxPlayers-totalSelected} Spieler auswählen`:`Teams noch nicht vollständig (A: ${ptTeamOrderA.length}/${ptCreateForm.teamSize}, B: ${ptTeamOrderB.length}/${ptCreateForm.teamSize})`)
                        :`Noch ${maxPlayers-totalSelected} Spieler auswählen`)}
                  </button>
                </>
                );
              })()}
            </div>
          )}

          {/* ── Auto-Archivierung: abgeschlossene Wettkämpfe älter als 7 Tage ── */}
          {(()=>{
            const sevenDaysAgo = new Date(Date.now()-7*24*60*60*1000).toISOString();
            const toAutoArchive = allPTList.filter(pt=>{
              const done = pt.type==='ko_runde' ? !!(pt.matchResults?.gf) : (pt.matches||[]).every(m=>m.result);
              return done && pt.createdAt < sevenDaysAgo;
            });
            if(toAutoArchive.length>0){
              toAutoArchive.forEach(pt=>{
                const finalStandings2=(()=>{
                  if (pt.type==='team') {
                    const winsA=pt.matches.filter(m=>m.result&&m.result.sets1>m.result.sets2).length;
                    const winsB=pt.matches.filter(m=>m.result&&m.result.sets2>m.result.sets1).length;
                    const needed2=Math.ceil(pt.matches.length/2);
                    const winner=winsA>=needed2?'A':winsB>=needed2?'B':(winsA>winsB?'A':winsB>winsA?'B':null);
                    return [
                      {place: winner==='A'?1:2, childId:'teamA', name: pt.teamA.name, wins:winsA, losses:winsB, setsWon:winsA, setsLost:winsB, ptsWon:0, ptsLost:0},
                      {place: winner==='B'?1:2, childId:'teamB', name: pt.teamB.name, wins:winsB, losses:winsA, setsWon:winsB, setsLost:winsA, ptsWon:0, ptsLost:0},
                    ];
                  }
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
            const isPtDone = (pt) => pt.type==='ko_runde' ? !!(pt.matchResults?.gf) : (pt.matches||[]).every(m=>m.result);
            const activePTs = allPTList.filter(pt=>!isPtDone(pt));
            const recentDonePTs = allPTList.filter(pt=>{
              const done=isPtDone(pt);
              const sevenDaysAgo2=new Date(Date.now()-7*24*60*60*1000).toISOString();
              return done && pt.createdAt >= sevenDaysAgo2;
            });
            const deletePT = (e, ptId) => {
              e.stopPropagation();
              if(!window.confirm('Wettkampf löschen? Alle Ergebnisse gehen verloren.')) return;
              const upd={...practiceTournaments}; delete upd[ptId]; savePracticeTournaments(upd);
            };
            const PTCard = ({pt, showBadge}) => {
              const isKoPt = pt.type==='ko_runde';
              const isTeamPt = pt.type==='team';
              const done = isKoPt ? Object.keys(pt.matchResults||{}).length : (pt.matches||[]).filter(m=>m.result).length;
              const total = isKoPt ? null : (pt.matches||[]).length;
              const allDone2 = isKoPt ? !!(pt.matchResults?.gf) : done===total;
              return (
                <div style={{position:'relative'}}>
                  <div onClick={()=>{setActivePracticeId(pt.id);setPtMatchEditing(null);setPtMatchDraft(null);navTo('practiceTournamentDetail');}}
                    style={{padding:'14px 16px',background:allDone2?'#f0fdf4':'white',border:`1px solid ${allDone2?'#86efac':'#e5e7eb'}`,borderRadius:'12px',cursor:'pointer',transition:'all 0.12s',boxShadow:'0 2px 4px rgba(0,0,0,0.06)'}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)';}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 4px rgba(0,0,0,0.06)';}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'8px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'16px'}}>{isKoPt?'🏆':isTeamPt?'🤝':'🎯'}</span>
                          <span style={{fontWeight:'800',color:'#1f2937',fontSize:'15px'}}>{isKoPt?`KO Runde · ${pt.players?.length} Spieler`:isTeamPt?`${pt.teamA?.name||'Team A'} vs ${pt.teamB?.name||'Team B'}`:(pt.players?.length||4)+'er Gruppe'}</span>
                          <span style={{fontSize:'10px',fontWeight:'700',color:allDone2?'#16a34a':'#d97706',background:allDone2?'#dcfce7':'#fef9c3',padding:'2px 7px',borderRadius:'10px',border:`1px solid ${allDone2?'#86efac':'#fde68a'}`}}>
                            {allDone2?'✓ Abgeschlossen':'● Laufend'}
                          </span>
                        </div>
                        <p style={{margin:'0 0 6px',fontSize:'11px',color:'#9ca3af'}}>
                          {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.settings.winSets} GS · {pt.settings.setLength}/{pt.settings.deciderLength}
                        </p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                        <span style={{fontSize:'12px',fontWeight:'700',color:'#7c3aed'}}>{done}{total!==null?'/'+total:' Partien'}</span>
                        <button onClick={(e)=>deletePT(e,pt.id)}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:'#fee2e2',border:'1px solid #fca5a5',color:'#dc2626',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
                          title="Wettkampf löschen">
                          <Trash2 size={12}/>
                        </button>
                        <ChevronRight size={15} color="#a78bfa"/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'8px'}}>
                      {isTeamPt
                        ? [...(pt.teamA?.players||[]),...(pt.teamB?.players||[])].map((p,i)=>(
                          <span key={p.childId+i} style={{fontSize:'11px',fontWeight:'700',color:'#6b7280',background:'#f3f4f6',padding:'2px 7px',borderRadius:'7px',border:'1px solid #e5e7eb'}}>{p.name}</span>
                        ))
                        : pt.players.map(p=>(
                          <span key={p.childId} style={{fontSize:'11px',fontWeight:'700',color:'#6b7280',background:'#f3f4f6',padding:'2px 7px',borderRadius:'7px',border:'1px solid #e5e7eb'}}>{p.seed}. {p.name}</span>
                        ))
                      }
                    </div>
                    <div style={{height:'4px',background:'#e5e7eb',borderRadius:'99px',overflow:'hidden'}}>
                      <div style={{width:`${(done/total)*100}%`,height:'100%',background:allDone2?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#7c3aed,#a78bfa)',transition:'width 0.4s ease'}}/>
                    </div>
                  </div>
                </div>
              );
            };

            if(allPTList.length===0&&!ptCreating) return (
              <div style={{...s.card,textAlign:'center',padding:'60px 20px'}}>
                <div style={{fontSize:'52px',marginBottom:'14px'}}>🎮</div>
                <p style={{fontSize:'16px',fontWeight:'700',margin:'0 0 6px',color:'#555'}}>Noch keine Übungswettkämpfe</p>
                <p style={{fontSize:'13px',margin:0,color:'#9ca3af'}}>Klicke oben auf "Neuer Wettkampf".</p>
              </div>
            );

            return (
              <>
                {/* Laufende Wettkämpfe */}
                {activePTs.length>0&&(
                  <div style={{marginBottom:'20px'}}>
                    <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'white',textTransform:'uppercase',letterSpacing:'2px',opacity:0.7}}>Laufend</p>
                    <div style={{display:'grid',gap:'8px'}}>
                      {activePTs.map(pt=><PTCard key={pt.id} pt={pt}/>)}
                    </div>
                  </div>
                )}
                {/* Letzte 7 Tage – abgeschlossen */}
                {recentDonePTs.length>0&&(
                  <div>
                    <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'white',textTransform:'uppercase',letterSpacing:'2px',opacity:0.7}}>Letzte 7 Tage – Abgeschlossen</p>
                    <div style={{display:'grid',gap:'8px'}}>
                      {recentDonePTs.map(pt=><PTCard key={pt.id} pt={pt}/>)}
                    </div>
                    <p style={{margin:'8px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.5)',textAlign:'right'}}>⏱ Werden nach 7 Tagen automatisch archiviert</p>
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

    // ── KO Runde Detail ────────────────────────────────────────────────────
    if (pt.type === 'ko_runde') {
      const {resolved, graph} = resolveKoBracket(pt);
      const {settings, players} = pt;
      const maxSets = settings.winSets * 2 - 1;
      const allM = [...graph.wbMatches, ...graph.lbMatches, ...(graph.grandFinal?[graph.grandFinal]:[])];

      const saveKoResult = (matchId, result) => {
        savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matchResults:{...(pt.matchResults||{}), [matchId]:result}}});
      };
      const deleteKoResult = (matchId) => {
        const upd={...(pt.matchResults||{})}; delete upd[matchId];
        savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matchResults:upd}});
      };
      const initKoDraft = (matchId) => {
        const existing = pt.matchResults?.[matchId];
        if (settings.trackSetScores) {
          setPtMatchDraft({mode:'scores', scores:existing?.scores?.map(s=>({s1:String(s.s1),s2:String(s.s2)}))||[{s1:'',s2:''}]});
        } else {
          setPtMatchDraft({mode:'simple', sets1:existing?.sets1||0, sets2:existing?.sets2||0});
        }
        setPtMatchEditing(matchId);
      };
      const isDraftValidKo = () => {
        if(!ptMatchDraft) return false;
        if(ptMatchDraft.mode==='scores'){
          const valid=ptMatchDraft.scores.filter(r=>r.s1!==''&&r.s2!==''&&Number(r.s1)!==Number(r.s2));
          const s1=valid.filter(r=>Number(r.s1)>Number(r.s2)).length, s2=valid.filter(r=>Number(r.s2)>Number(r.s1)).length;
          return s1===settings.winSets||s2===settings.winSets;
        } else {
          const {sets1,sets2}=ptMatchDraft;
          return (sets1===settings.winSets||sets2===settings.winSets)&&sets1!==sets2;
        }
      };
      const saveKoDraft = () => {
        if(!ptMatchEditing||!ptMatchDraft) return;
        let result;
        if(ptMatchDraft.mode==='scores'){
          const validScores=ptMatchDraft.scores.filter(r=>r.s1!==''&&r.s2!=='').map(r=>({s1:Number(r.s1),s2:Number(r.s2)}));
          result={sets1:validScores.filter(r=>r.s1>r.s2).length, sets2:validScores.filter(r=>r.s2>r.s1).length, scores:validScores};
        } else { result={sets1:ptMatchDraft.sets1,sets2:ptMatchDraft.sets2,scores:[]}; }
        saveKoResult(ptMatchEditing, result);
        setPtMatchEditing(null); setPtMatchDraft(null);
      };

      const archiveKo = () => {
        const gfR = resolved['gf'] || resolved[graph.wbFinal?.id];
        const standings = players.map((p,i)=>({childId:p.childId,name:p.name,seed:p.seed,place:99}));
        if(gfR?.result){
          const winner = gfR.result.sets1>gfR.result.sets2 ? gfR.p1 : gfR.p2;
          const loser  = gfR.result.sets1>gfR.result.sets2 ? gfR.p2 : gfR.p1;
          if(winner!=null) standings[winner].place=1;
          if(loser!=null)  standings[loser].place=2;
        }
        const finalStandings = standings.sort((a,b)=>a.place-b.place).map((s,i)=>({...s,place:s.place===99?i+3:s.place}));
        const archivedPT={...pt,status:'archived',archivedAt:new Date().toISOString(),finalStandings};
        const newActive={...practiceTournaments}; delete newActive[pt.id];
        savePracticeTournaments(newActive);
        saveArchivedPracticeTournaments({...archivedPracticeTournaments,[pt.id]:archivedPT});
        setActivePracticeId(null); navTo('practiceTournaments');
      };
      const deleteKoTournament = () => {
        if(!window.confirm('KO Turnier wirklich löschen?')) return;
        const upd={...practiceTournaments}; delete upd[pt.id];
        savePracticeTournaments(upd); setActivePracticeId(null); navTo('practiceTournaments');
      };

      const inpStyleKo = {background:'rgba(255,255,255,0.09)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'white',fontSize:'20px',fontWeight:'900',textAlign:'center',width:'58px',height:'44px',outline:'none'};
      const hasGF = pt.doubleElim && graph.grandFinal && graph.grandFinal.id !== graph.wbFinal?.id;
      const finalMatchId = hasGF ? 'gf' : graph.wbFinal?.id;
      const gfDone = !!(pt.matchResults?.[finalMatchId]);
      const wbRoundsNums = [...new Set(graph.wbMatches.map(m=>m.round))].sort((a,b)=>a-b);
      const lbRoundsNums = [...new Set(graph.lbMatches.map(m=>m.round))].sort((a,b)=>a-b);
      const wbTotalRounds = wbRoundsNums.length||1;
      const wbRoundLabel = (r) => { const rem=wbTotalRounds-r; if(rem===0) return pt.doubleElim?'WB Finale':'Finale'; if(rem===1)return'Halbfinale'; if(rem===2)return'Viertelfinale'; return`Runde ${r}`; };

      // ── Bracket Tree ───────────────────────────────────────────
      const MH=54, MW=155, CGAP=40, RGAP=8, R1S=MH+RGAP;
      const getX=(r)=>(r-1)*(MW+CGAP);
      const getY=(r,sl)=>{ const sp=Math.pow(2,r-1); return sl*sp*R1S+(sp-1)/2*R1S; };
      const wbR1Count=graph.wbMatches.filter(m=>m.round===1).length;
      const treeH=Math.max(wbR1Count*R1S-RGAP, MH+4);
      const treeW=wbTotalRounds*(MW+CGAP)-CGAP+(hasGF?CGAP+MW:0);

      const BracketTree = () => (
        <div style={{overflowX:'auto',paddingBottom:'4px',marginBottom:'6px'}}>
          <div style={{position:'relative',width:treeW,height:treeH}}>
            {/* WB match boxes */}
            {graph.wbMatches.map(m=>{
              const rm=resolved[m.id]; if(!rm) return null;
              const p1=rm.p1, p2=rm.p2;
              if(p1===null&&p2===null) return null;
              const res=rm.result, p1Won=res&&res.sets1>res.sets2, p2Won=res&&res.sets2>res.sets1;
              const isBye=p1===null||p2===null;
              const isLast=m.round===wbTotalRounds&&!hasGF;
              const pName=(p)=>p===null?'Freilos':p===undefined?'…':players[p]?.name||'?';
              const colBorder=isLast?'rgba(253,230,138,0.3)':res?'rgba(74,222,128,0.3)':'rgba(167,139,250,0.22)';
              const colBg=isLast?'rgba(253,230,138,0.05)':isBye?'rgba(255,255,255,0.01)':'rgba(255,255,255,0.05)';
              return (
                <div key={m.id} style={{position:'absolute',left:getX(m.round),top:getY(m.round,m.slot),width:MW,height:MH,background:colBg,border:`1px solid ${isBye?'rgba(255,255,255,0.05)':colBorder}`,borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column',opacity:isBye?0.35:1}}>
                  {[{p:p1,won:p1Won},{p:p2,won:p2Won}].map((row,ri)=>(
                    <div key={ri} style={{flex:1,display:'flex',alignItems:'center',padding:'0 8px',gap:4,borderBottom:ri===0?'1px solid rgba(255,255,255,0.05)':'none'}}>
                      <span style={{flex:1,fontSize:11,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:row.won?'#4ade80':res&&!row.won?'rgba(255,255,255,0.3)':row.p===undefined?'rgba(255,255,255,0.2)':'white'}}>{pName(row.p)}</span>
                      {res&&<span style={{fontSize:13,fontWeight:900,color:row.won?'#4ade80':'rgba(255,255,255,0.28)',flexShrink:0}}>{ri===0?res.sets1:res.sets2}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
            {/* Grand Final box */}
            {hasGF&&(()=>{
              const rm=resolved['gf']; const res=rm?.result;
              const p1=rm?.p1, p2=rm?.p2, p1Won=res&&res.sets1>res.sets2, p2Won=res&&res.sets2>res.sets1;
              const gfX=wbTotalRounds*(MW+CGAP), gfY=getY(wbTotalRounds,0);
              const pGF=(p,fb)=>p===null?'Freilos':p===undefined?fb:players[p]?.name||'?';
              return (<div style={{position:'absolute',left:gfX,top:gfY,width:MW,height:MH,background:'rgba(253,230,138,0.06)',border:`1px solid ${res?'rgba(253,230,138,0.45)':'rgba(253,230,138,0.28)'}`,borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                {[{p:p1,won:p1Won,fb:'WB Sieger'},{p:p2,won:p2Won,fb:'VB Sieger'}].map((row,ri)=>(
                  <div key={ri} style={{flex:1,display:'flex',alignItems:'center',padding:'0 8px',gap:4,borderBottom:ri===0?'1px solid rgba(253,230,138,0.08)':'none'}}>
                    <span style={{flex:1,fontSize:11,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:row.won?'#fde68a':res&&!row.won?'rgba(255,255,255,0.3)':row.p===undefined?'rgba(253,230,138,0.35)':'white'}}>{pGF(row.p,row.fb)}</span>
                    {res&&<span style={{fontSize:13,fontWeight:900,color:row.won?'#fde68a':'rgba(255,255,255,0.28)',flexShrink:0}}>{ri===0?res.sets1:res.sets2}</span>}
                  </div>
                ))}
              </div>);
            })()}
            {/* Connector SVG */}
            <svg style={{position:'absolute',top:0,left:0,width:treeW,height:treeH,pointerEvents:'none',overflow:'visible'}}>
              {wbRoundsNums.slice(0,-1).map(round=>graph.wbMatches.filter(m=>m.round===round).map(m=>{
                const x1=getX(round)+MW, y1=getY(round,m.slot)+MH/2;
                const ns=Math.floor(m.slot/2), nr=round+1;
                const x2=getX(nr), y2=getY(nr,ns)+MH/2, midX=x1+CGAP/2;
                return <path key={m.id} d={`M${x1},${y1}H${midX}V${y2}H${x2}`} stroke="rgba(167,139,250,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>;
              }))}
              {hasGF&&(()=>{
                const x1=getX(wbTotalRounds)+MW, y1=getY(wbTotalRounds,0)+MH/2;
                const x2=wbTotalRounds*(MW+CGAP);
                return <path d={`M${x1},${y1}H${x2}`} stroke="rgba(253,230,138,0.28)" strokeWidth="1.5" fill="none" strokeDasharray="4,3"/>;
              })()}
            </svg>
          </div>
          {/* Round labels */}
          <div style={{display:'flex',width:treeW,marginTop:'6px'}}>
            {wbRoundsNums.map(r=>(
              <div key={r} style={{width:MW+CGAP,flexShrink:0,textAlign:'center'}}>
                <span style={{fontSize:'10px',fontWeight:'700',color:'rgba(167,139,250,0.4)',textTransform:'uppercase',letterSpacing:'0.8px'}}>{wbRoundLabel(r)}</span>
              </div>
            ))}
            {hasGF&&<div style={{width:MW,flexShrink:0,textAlign:'center'}}><span style={{fontSize:'10px',fontWeight:'700',color:'rgba(253,230,138,0.5)',textTransform:'uppercase',letterSpacing:'0.8px'}}>Finale</span></div>}
          </div>
        </div>
      );

      const KoMatchCard = ({matchId, isFinal=false}) => {
        const rm = resolved[matchId]; if(!rm) return null;
        const p1=rm.p1, p2=rm.p2;
        // Skip pure bye matches
        if(p1===null&&p2===null) return null;
        const p1Name = p1===null?'Freilos':p1===undefined?'Wird ermittelt…':players[p1]?.name||'?';
        const p2Name = p2===null?'Freilos':p2===undefined?'Wird ermittelt…':players[p2]?.name||'?';
        const isEditing = ptMatchEditing===matchId;
        const res = rm.result;
        const p1Won = res&&res.sets1>res.sets2, p2Won = res&&res.sets2>res.sets1;
        const isBye = p1===null||p2===null;
        const canPlay = p1!==null&&p1!==undefined&&p2!==null&&p2!==undefined&&!isBye;
        const borderCol = isEditing?'rgba(167,139,250,0.6)':res?'rgba(74,222,128,0.25)':isBye?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.1)';
        const hcap = rm.handicap;

        return (
          <div style={{background:isFinal?'rgba(253,230,138,0.05)':isBye?'rgba(255,255,255,0.01)':'rgba(255,255,255,0.04)',border:`1.5px solid ${borderCol}`,borderRadius:'14px',overflow:'hidden',opacity:isBye?0.5:1}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px'}}>
              <div style={{flex:1,textAlign:'right',minWidth:0}}>
                <p style={{margin:0,fontWeight:'800',fontSize:'14px',color:p1Won?'#4ade80':res&&!p1Won?'rgba(255,255,255,0.3)':p1===undefined?'rgba(255,255,255,0.25)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p1Name}</p>
                {p1!=null&&p1!==undefined&&<p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>#{players[p1]?.seed}{hcap?.b==='p1'?<span style={{color:'#fde68a',fontWeight:'700'}}> +{hcap.pts}P</span>:null}</p>}
              </div>
              <div style={{minWidth:'60px',textAlign:'center',flexShrink:0}}>
                {isBye?<span style={{fontSize:'11px',color:'rgba(251,191,36,0.6)',fontWeight:'700'}}>Freilos</span>
                  :res?<span style={{fontSize:'19px',fontWeight:'900',color:'white',letterSpacing:'2px'}}>{res.sets1}:{res.sets2}</span>
                  :<span style={{fontSize:'12px',color:'rgba(255,255,255,0.2)',fontWeight:'600'}}>vs</span>}
                {hcap&&!isBye&&<p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(253,230,138,0.6)',fontWeight:'600'}}>{hcap.pts}P Vorgabe</p>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontWeight:'800',fontSize:'14px',color:p2Won?'#4ade80':res&&!p2Won?'rgba(255,255,255,0.3)':p2===undefined?'rgba(255,255,255,0.25)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p2Name}</p>
                {p2!=null&&p2!==undefined&&<p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>#{players[p2]?.seed}{hcap?.b==='p2'?<span style={{color:'#fde68a',fontWeight:'700'}}> +{hcap.pts}P</span>:null}</p>}
              </div>
              {canPlay&&!isEditing&&(
                <button onClick={()=>initKoDraft(matchId)} style={{flexShrink:0,padding:'6px 10px',background:res?'rgba(255,255,255,0.06)':'rgba(167,139,250,0.12)',border:`1px solid ${res?'rgba(255,255,255,0.1)':'rgba(167,139,250,0.3)'}`,borderRadius:'8px',cursor:'pointer',color:res?'rgba(255,255,255,0.45)':'#c4b5fd',fontSize:'12px',fontWeight:'700'}}>
                  {res?'✏️':'Eintragen'}
                </button>
              )}
            </div>
            {!isEditing&&res?.scores?.length>0&&(
              <div style={{padding:'4px 14px 10px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                {res.scores.map((sc,si)=><span key={si} style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700'}}>{si===maxSets-1?'⚡':''}S{si+1}: {sc.s1}:{sc.s2}</span>)}
              </div>
            )}
            {isEditing&&ptMatchDraft&&(
              <div style={{padding:'14px',borderTop:'1px solid rgba(167,139,250,0.15)',background:'rgba(167,139,250,0.05)'}}>
                {ptMatchDraft.mode==='scores'?(
                  <>
                    <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>Satzergebnisse · {settings.setLength}/{settings.deciderLength}</p>
                    <div style={{display:'grid',gap:'7px',marginBottom:'10px'}}>
                      {ptMatchDraft.scores.map((row,si)=>{
                        const isD=si===maxSets-1;
                        return (<div key={si} style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'11px',fontWeight:'700',color:isD?'#fde68a':'rgba(255,255,255,0.3)',minWidth:'68px'}}>{isD?'⚡ Entscheid.':`Satz ${si+1}`}</span>
                          <input type="number" min="0" max="99" value={row.s1} onChange={e=>{const sc=[...ptMatchDraft.scores];sc[si]={...sc[si],s1:e.target.value===''?'':e.target.value};setPtMatchDraft(d=>({...d,scores:sc}));}} style={inpStyleKo} placeholder="0"/>
                          <span style={{color:'rgba(255,255,255,0.3)',fontWeight:'900',fontSize:'18px'}}>:</span>
                          <input type="number" min="0" max="99" value={row.s2} onChange={e=>{const sc=[...ptMatchDraft.scores];sc[si]={...sc[si],s2:e.target.value===''?'':e.target.value};setPtMatchDraft(d=>({...d,scores:sc}));}} style={inpStyleKo} placeholder="0"/>
                          {ptMatchDraft.scores.length>1&&<button onClick={()=>setPtMatchDraft(d=>({...d,scores:d.scores.filter((_,j)=>j!==si)}))} style={{width:'28px',height:'28px',borderRadius:'6px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>}
                        </div>);
                      })}
                      {ptMatchDraft.scores.length<maxSets&&<button onClick={()=>setPtMatchDraft(d=>({...d,scores:[...d.scores,{s1:'',s2:''}]}))} style={{padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(167,139,250,0.3)',borderRadius:'8px',color:'rgba(167,139,250,0.6)',cursor:'pointer',fontSize:'12px',fontWeight:'700'}}>+ Satz</button>}
                    </div>
                  </>
                ):(
                  <>
                    <p style={{margin:'0 0 12px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>Gewonnene Sätze (Best of {settings.winSets*2-1})</p>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px',flexWrap:'wrap'}}>
                      {[{key:'sets1',name:p1Name},{key:'sets2',name:p2Name}].map(side=>(
                        <div key={side.key} style={{flex:1,minWidth:'120px',textAlign:'center'}}>
                          <p style={{margin:'0 0 7px',fontSize:'13px',fontWeight:'800',color:'white'}}>{side.name}</p>
                          <div style={{display:'flex',gap:'5px',justifyContent:'center'}}>
                            {Array.from({length:settings.winSets+1},(_,n)=>(
                              <button key={n} onClick={()=>setPtMatchDraft(d=>({...d,[side.key]:n}))}
                                style={{width:'38px',height:'38px',borderRadius:'9px',border:`2px solid ${ptMatchDraft[side.key]===n?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptMatchDraft[side.key]===n?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.04)',color:ptMatchDraft[side.key]===n?'white':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'900',fontSize:'17px'}}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                  {res&&<button onClick={()=>{deleteKoResult(matchId);setPtMatchEditing(null);setPtMatchDraft(null);}} style={{padding:'8px 10px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'8px',cursor:'pointer',color:'#f87171',fontWeight:'700',fontSize:'12px'}}>🗑️</button>}
                  <button onClick={()=>{setPtMatchEditing(null);setPtMatchDraft(null);}} style={{flex:1,padding:'9px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>Abbrechen</button>
                  <button onClick={saveKoDraft} disabled={!isDraftValidKo()} style={{flex:2,padding:'9px',background:isDraftValidKo()?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(255,255,255,0.06)',border:'none',borderRadius:'8px',color:'white',cursor:isDraftValidKo()?'pointer':'not-allowed',fontWeight:'800',fontSize:'13px',opacity:isDraftValidKo()?1:0.45}}>✓ Speichern</button>
                </div>
              </div>
            )}
          </div>
        );
      };

      return (
        <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
          <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>
            {/* Header */}
            <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(74,222,128,0.08)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 24px':'0 -24px 28px'}}>
              <button onClick={()=>{setPtMatchEditing(null);setPtMatchDraft(null);navTo('practiceTournaments');}} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ArrowLeft size={18}/></button>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:'0 0 1px',color:'rgba(167,139,250,0.5)',fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                  🏆 KO Runde · {settings.winSets} GS · {settings.setLength}/{settings.deciderLength} · {pt.players.length} Spieler · Größe {pt.bracketSize}
                </p>
                <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:isMobile?'14px':'17px',letterSpacing:'-0.2px'}}>
                  {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.createdBy}
                </h2>
              </div>
              <button onClick={deleteKoTournament} style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14}/></button>
            </div>

            {/* Setzung */}
            <div style={{marginBottom:'20px',padding:'12px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(167,139,250,0.12)',borderRadius:'14px'}}>
              <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'2px'}}>Setzung · {pt.bracketSize-pt.players.length} Freilos{pt.bracketSize-pt.players.length!==1?'e':''}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {players.map((p,i)=>(
                  <span key={i} style={{fontSize:'12px',fontWeight:'700',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',color:'#c4b5fd',padding:'3px 10px',borderRadius:'10px'}}>
                    {p.seed}. {p.name}{p.maxTTR>0?` (TTR ${p.maxTTR})`:''}
                  </span>
                ))}
              </div>
            </div>

            {/* Turnierbaum */}
            <div style={{marginBottom:'28px',padding:'16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(167,139,250,0.1)',borderRadius:'16px'}}>
              <p style={{margin:'0 0 14px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>🏆 Turnierbaum</p>
              <BracketTree/>
            </div>

            {/* Spiele */}
            <p style={{margin:'0 0 12px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'2px'}}>Spiele</p>

            {/* Winners Bracket */}
            <div style={{marginBottom:'24px'}}>
              {pt.doubleElim&&<p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(74,222,128,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>🏆 Winners Bracket</p>}
              {wbRoundsNums.map(r=>(
                <div key={r} style={{marginBottom:'12px'}}>
                  <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'700',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'1px'}}>{wbRoundLabel(r)}</p>
                  <div style={{display:'grid',gap:'8px'}}>
                    {graph.wbMatches.filter(m=>m.round===r).map(m=><KoMatchCard key={m.id} matchId={m.id} isFinal={r===wbTotalRounds&&!hasGF}/>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Verlierer Bracket */}
            {graph.lbMatches.length>0&&(
              <div style={{marginBottom:'24px'}}>
                <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(248,113,113,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>📉 Verlierer Bracket</p>
                {lbRoundsNums.map(r=>(
                  <div key={r} style={{marginBottom:'12px'}}>
                    <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'700',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'1px'}}>VB Runde {r}</p>
                    <div style={{display:'grid',gap:'8px'}}>
                      {graph.lbMatches.filter(m=>m.round===r).map(m=><KoMatchCard key={m.id} matchId={m.id}/>)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Großes Finale */}
            {hasGF&&(
              <div style={{marginBottom:'24px'}}>
                <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'rgba(253,230,138,0.6)',textTransform:'uppercase',letterSpacing:'2px'}}>🏟️ Großes Finale</p>
                <KoMatchCard matchId="gf" isFinal={true}/>
              </div>
            )}

            {/* Abschluss */}
            {gfDone&&(
              <div style={{padding:'18px 20px',background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.22)',borderRadius:'16px',textAlign:'center'}}>
                <p style={{margin:'0 0 6px',fontSize:'17px',fontWeight:'900',color:'#4ade80'}}>🏆 KO Turnier abgeschlossen!</p>
                {(()=>{const gfR=resolved[finalMatchId];const wIdx=gfR?.result?.sets1>gfR?.result?.sets2?gfR.p1:gfR?.p2;return wIdx!=null&&<p style={{margin:'0 0 14px',fontSize:'13px',color:'rgba(255,255,255,0.45)'}}>Sieger: <strong style={{color:'#fde68a'}}>{players[wIdx]?.name}</strong></p>;})()}
                <button onClick={archiveKo} style={{padding:'12px 28px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'inline-flex',alignItems:'center',gap:'8px'}}><Archive size={16}/> Archivieren</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Mannschaftsspiel Detail ─────────────────────────────────────────────
    if (pt.type === 'team') {
      const { settings, teamA, teamB, matches } = pt;
      const maxSets = settings.winSets * 2 - 1;
      const teamNames = (m, side) => (side==='a'?m.aPos:m.bPos).map(i=>(side==='a'?teamA:teamB).players[i]?.name||'?').join(' & ');
      const winsA = matches.filter(m=>m.result && m.result.sets1>m.result.sets2).length;
      const winsB = matches.filter(m=>m.result && m.result.sets2>m.result.sets1).length;
      const allDone = matches.every(m=>m.result!==null);
      const needed = Math.ceil(matches.length/2);
      const teamWinner = winsA>=needed ? 'A' : winsB>=needed ? 'B' : (allDone ? (winsA>winsB?'A':winsB>winsA?'B':null) : null);

      const updateMatchResult = (matchIdx, result) => {
        const updMatches = matches.map((m,i) => i===matchIdx ? {...m,result} : m);
        savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matches:updMatches}});
      };
      const deleteResult = (matchIdx) => {
        const updMatches = matches.map((m,i) => i===matchIdx ? {...m,result:null} : m);
        savePracticeTournaments({...practiceTournaments, [pt.id]: {...pt, matches:updMatches}});
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
        setPtMatchEditing(null); setPtMatchDraft(null);
      };
      const archiveTeamTournament = () => {
        const archivedPT = {...pt, status:'archived', archivedAt:new Date().toISOString(), finalStandings:[
          {place: teamWinner==='A'?1:2, childId:'teamA', name: teamA.name, wins:winsA, losses:winsB, setsWon:winsA, setsLost:winsB, ptsWon:0, ptsLost:0},
          {place: teamWinner==='B'?1:2, childId:'teamB', name: teamB.name, wins:winsB, losses:winsA, setsWon:winsB, setsLost:winsA, ptsWon:0, ptsLost:0},
        ]};
        const newActive = {...practiceTournaments}; delete newActive[pt.id];
        savePracticeTournaments(newActive);
        saveArchivedPracticeTournaments({...archivedPracticeTournaments, [pt.id]: archivedPT});
        setActivePracticeId(null); navTo('practiceTournaments');
      };
      const deleteTeamTournament = () => {
        if (!window.confirm('Wettkampf wirklich löschen? Alle Ergebnisse gehen verloren.')) return;
        const newActive = {...practiceTournaments}; delete newActive[pt.id];
        savePracticeTournaments(newActive); setActivePracticeId(null); navTo('practiceTournaments');
      };
      const inpStyle = {background:'rgba(255,255,255,0.09)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'white',fontSize:'20px',fontWeight:'900',textAlign:'center',width:'58px',height:'44px',outline:'none'};
      const systemLabel = pt.teamSystem==='korbylonCup' ? 'Korbylon Cup' : 'Kings Cup';

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
                  🤝 Mannschaftsspiel · {systemLabel} · {settings.winSets} Gewinnsätze
                </p>
                <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:isMobile?'14px':'17px',letterSpacing:'-0.2px'}}>
                  {new Date(pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} · {pt.createdBy}
                </h2>
              </div>
              <button onClick={deleteTeamTournament} style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Trash2 size={14}/>
              </button>
            </div>

            {/* ── Team-Scoreboard ──────────────────────────────── */}
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px',padding:'18px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'16px'}}>
              <div style={{flex:1,textAlign:'right'}}>
                <p style={{margin:'0 0 4px',fontWeight:'900',fontSize:isMobile?'14px':'17px',color:teamWinner==='A'?'#4ade80':'white'}}>{teamA.name}</p>
                <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{teamA.players.map(p=>p.name).join(', ')}</p>
              </div>
              <div style={{textAlign:'center',flexShrink:0,minWidth:'70px'}}>
                <span style={{fontSize:'26px',fontWeight:'900',color:'white'}}>{winsA}:{winsB}</span>
              </div>
              <div style={{flex:1}}>
                <p style={{margin:'0 0 4px',fontWeight:'900',fontSize:isMobile?'14px':'17px',color:teamWinner==='B'?'#4ade80':'white'}}>{teamB.name}</p>
                <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{teamB.players.map(p=>p.name).join(', ')}</p>
              </div>
            </div>

            {/* ── Partien ─────────────────────────────────────────── */}
            <div style={{display:'grid',gap:'8px',marginBottom:'20px'}}>
              {matches.map((match,matchIdx)=>{
                const res=match.result;
                const isEditing=ptMatchEditing===matchIdx;
                const aWon=res&&res.sets1>res.sets2, bWon=res&&res.sets2>res.sets1;
                const nameA=teamNames(match,'a'), nameB=teamNames(match,'b');
                return (
                  <div key={matchIdx} style={{background:'rgba(255,255,255,0.04)',border:`1.5px solid ${isEditing?'rgba(167,139,250,0.45)':res?'rgba(74,222,128,0.18)':'rgba(255,255,255,0.08)'}`,borderRadius:'14px',overflow:'hidden'}}>
                    <div style={{padding:'6px 14px 0'}}>
                      <span style={{fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{match.kind==='doppel'?'🤝 ':'🏓 '}{match.label}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 14px 12px'}}>
                      <div style={{flex:1,textAlign:'right',minWidth:0}}>
                        <p style={{margin:0,fontWeight:'800',fontSize:isMobile?'13px':'15px',color:aWon?'#4ade80':res?'rgba(255,255,255,0.35)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nameA}</p>
                      </div>
                      <div style={{minWidth:'64px',textAlign:'center',flexShrink:0}}>
                        {res ? <span style={{fontSize:'20px',fontWeight:'900',color:'white',letterSpacing:'2px'}}>{res.sets1}:{res.sets2}</span> : <span style={{fontSize:'13px',color:'rgba(255,255,255,0.2)',fontWeight:'600'}}>vs</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontWeight:'800',fontSize:isMobile?'13px':'15px',color:bWon?'#4ade80':res?'rgba(255,255,255,0.35)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nameB}</p>
                      </div>
                      {!isEditing&&(
                        <button onClick={()=>initDraft(matchIdx)}
                          style={{flexShrink:0,padding:'6px 10px',background:res?'rgba(255,255,255,0.06)':'rgba(167,139,250,0.12)',border:`1px solid ${res?'rgba(255,255,255,0.1)':'rgba(167,139,250,0.3)'}`,borderRadius:'8px',cursor:'pointer',color:res?'rgba(255,255,255,0.45)':'#c4b5fd',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>
                          {res?'✏️ Edit':'Eintragen'}
                        </button>
                      )}
                    </div>

                    {!isEditing&&res&&res.scores&&res.scores.length>0&&(
                      <div style={{padding:'0 14px 10px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                        {res.scores.map((sc,si)=>(
                          <span key={si} style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700'}}>{si===maxSets-1?'⚡':''} S{si+1}: {sc.s1}:{sc.s2}</span>
                        ))}
                      </div>
                    )}

                    {isEditing&&ptMatchDraft&&(
                      <div style={{padding:'14px',borderTop:'1px solid rgba(167,139,250,0.15)',background:'rgba(167,139,250,0.05)'}}>
                        {ptMatchDraft.mode==='scores' ? (
                          <>
                            <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>Satzergebnisse · Satzlänge {settings.setLength} · Entscheidungssatz {settings.deciderLength}</p>
                            <div style={{display:'grid',gap:'7px',marginBottom:'10px'}}>
                              {ptMatchDraft.scores.map((row,si)=>{
                                const isDecider = si===maxSets-1;
                                const updateRow = (field,val) => { const sc=[...ptMatchDraft.scores]; sc[si]={...sc[si],[field]:val}; setPtMatchDraft(d=>({...d,scores:sc})); };
                                return (
                                  <div key={si} style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                                    <span style={{fontSize:'11px',fontWeight:'700',color:isDecider?'#fde68a':'rgba(255,255,255,0.3)',minWidth:'68px'}}>{isDecider?'⚡ Entscheid.':` Satz ${si+1}`}</span>
                                    <input type="number" min="0" max="99" value={row.s1} onChange={e=>updateRow('s1',e.target.value===''?'':e.target.value)} style={inpStyle} placeholder="0"/>
                                    <span style={{color:'rgba(255,255,255,0.3)',fontWeight:'900',fontSize:'18px'}}>:</span>
                                    <input type="number" min="0" max="99" value={row.s2} onChange={e=>updateRow('s2',e.target.value===''?'':e.target.value)} style={inpStyle} placeholder="0"/>
                                    {ptMatchDraft.scores.length>1&&(
                                      <button onClick={()=>setPtMatchDraft(d=>({...d,scores:d.scores.filter((_,j)=>j!==si)}))}
                                        style={{width:'28px',height:'28px',borderRadius:'6px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                                    )}
                                  </div>
                                );
                              })}
                              {ptMatchDraft.scores.length<maxSets&&(
                                <button onClick={()=>setPtMatchDraft(d=>({...d,scores:[...d.scores,{s1:'',s2:''}]}))}
                                  style={{padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(167,139,250,0.3)',borderRadius:'8px',color:'rgba(167,139,250,0.6)',cursor:'pointer',fontSize:'12px',fontWeight:'700',marginTop:'2px'}}>+ Satz hinzufügen</button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p style={{margin:'0 0 12px',fontSize:'12px',fontWeight:'700',color:'rgba(167,139,250,0.7)'}}>Gewonnene Sätze (Best of {settings.winSets*2-1})</p>
                            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px',flexWrap:'wrap'}}>
                              <div style={{flex:1,minWidth:'130px',textAlign:'center'}}>
                                <p style={{margin:'0 0 7px',fontSize:'13px',fontWeight:'800',color:'white'}}>{nameA}</p>
                                <div style={{display:'flex',gap:'5px',justifyContent:'center'}}>
                                  {Array.from({length:settings.winSets+1},(_,n)=>(
                                    <button key={n} onClick={()=>setPtMatchDraft(d=>({...d,sets1:n}))}
                                      style={{width:'38px',height:'38px',borderRadius:'9px',border:`2px solid ${ptMatchDraft.sets1===n?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptMatchDraft.sets1===n?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.04)',color:ptMatchDraft.sets1===n?'white':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'900',fontSize:'17px'}}>{n}</button>
                                  ))}
                                </div>
                              </div>
                              <span style={{fontWeight:'900',color:'rgba(255,255,255,0.2)',fontSize:'22px',flexShrink:0}}>:</span>
                              <div style={{flex:1,minWidth:'130px',textAlign:'center'}}>
                                <p style={{margin:'0 0 7px',fontSize:'13px',fontWeight:'800',color:'white'}}>{nameB}</p>
                                <div style={{display:'flex',gap:'5px',justifyContent:'center'}}>
                                  {Array.from({length:settings.winSets+1},(_,n)=>(
                                    <button key={n} onClick={()=>setPtMatchDraft(d=>({...d,sets2:n}))}
                                      style={{width:'38px',height:'38px',borderRadius:'9px',border:`2px solid ${ptMatchDraft.sets2===n?'#a78bfa':'rgba(255,255,255,0.1)'}`,background:ptMatchDraft.sets2===n?'rgba(167,139,250,0.25)':'rgba(255,255,255,0.04)',color:ptMatchDraft.sets2===n?'white':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'900',fontSize:'17px'}}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                          {res&&<button onClick={()=>{deleteResult(matchIdx);setPtMatchEditing(null);setPtMatchDraft(null);}}
                            style={{padding:'9px 14px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'9px',color:'#f87171',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>Löschen</button>}
                          <button onClick={()=>{setPtMatchEditing(null);setPtMatchDraft(null);}}
                            style={{padding:'9px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>Abbrechen</button>
                          <button onClick={saveDraft} disabled={!isDraftValid()}
                            style={{padding:'9px 20px',background:isDraftValid()?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(255,255,255,0.06)',border:'none',borderRadius:'9px',color:isDraftValid()?'white':'rgba(255,255,255,0.3)',cursor:isDraftValid()?'pointer':'not-allowed',fontWeight:'800',fontSize:'13px'}}>Speichern</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Abschluss */}
            {allDone&&(
              <div style={{padding:'18px 20px',background:'rgba(74,222,128,0.07)',border:'1px solid rgba(74,222,128,0.22)',borderRadius:'16px',textAlign:'center'}}>
                <p style={{margin:'0 0 6px',fontSize:'17px',fontWeight:'900',color:'#4ade80'}}>🤝 Mannschaftsspiel abgeschlossen!</p>
                <p style={{margin:'0 0 14px',fontSize:'13px',color:'rgba(255,255,255,0.45)'}}>
                  {teamWinner ? <>Sieger: <strong style={{color:'#fde68a'}}>{teamWinner==='A'?teamA.name:teamB.name}</strong></> : 'Unentschieden'}
                </p>
                <button onClick={archiveTeamTournament} style={{padding:'12px 28px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'inline-flex',alignItems:'center',gap:'8px'}}><Archive size={16}/> Archivieren</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Rundenturnier Detail (existing) ────────────────────────────────────
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
                          <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>#{p1.seed}{match.handicap?.beneficiary===match.p1Idx?<span style={{color:'#fde68a',fontWeight:'700'}}> +{match.handicap.points}P</span>:null}</p>
                        </div>

                        {/* Ergebnis */}
                        <div style={{minWidth:'64px',textAlign:'center',flexShrink:0}}>
                          {res
                            ? <span style={{fontSize:'20px',fontWeight:'900',color:'white',letterSpacing:'2px'}}>{res.sets1}:{res.sets2}</span>
                            : <span style={{fontSize:'13px',color:'rgba(255,255,255,0.2)',fontWeight:'600'}}>vs</span>
                          }
                          {match.handicap&&<p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(253,230,138,0.6)',fontWeight:'600'}}>Vorgabe {match.handicap.points}P</p>}
                        </div>

                        {/* Spieler 2 */}
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontWeight:'800',fontSize:isMobile?'13px':'15px',color:p2Won?'#4ade80':res?'rgba(255,255,255,0.35)':'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p2.name}</p>
                          <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>#{p2.seed}{match.handicap?.beneficiary===match.p2Idx?<span style={{color:'#fde68a',fontWeight:'700'}}> +{match.handicap.points}P</span>:null}</p>
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
            {[['sessions','🏋️ Training'],['tournaments','🏆 Turniere'],['practiceTournaments','🎮 Übungswettkämpfe'],['rangliste','🏅 Ranglisten']].map(([key,label])=>(
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
                    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',flexWrap:'wrap',background:session.cancelled?'#fff5f5':'white',borderRadius:'12px'}}>
                      {/* Date */}
                      <div style={{minWidth:'160px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{fontWeight:'700',fontSize:'14px',color:session.cancelled?'#dc2626':'#1a3a2a'}}>
                            {session.date ? new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}) : '–'}
                          </span>
                          {session.cancelled&&<span style={{fontSize:'11px',fontWeight:'700',background:'#fee2e2',color:'#dc2626',padding:'2px 7px',borderRadius:'20px',border:'1px solid #fca5a5'}}>Ausgefallen</span>}
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
                      {/* Attendance % — ausgefallene nicht anzeigen */}
                      <div style={{textAlign:'right',minWidth:'70px'}}>
                        {session.cancelled
                          ? <span style={{fontSize:'13px',color:'#dc2626',fontWeight:'600'}}>–</span>
                          : <><span style={{fontSize:'15px',fontWeight:'700',color:totalPct>=75?'#16a34a':totalPct>=50?'#d97706':'#dc2626'}}>{totalPct}%</span>
                            <div style={{fontSize:'11px',color:'#888'}}>{totalPresent}/{totalKids} da</div></>
                        }
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
                  const groupSize = pt.type==='team' ? `${pt.teamSize}v${pt.teamSize}` : (pt.players ? pt.players.length : 4);
                  const dateStr = new Date(pt.archivedAt||pt.createdAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
                  return (
                    <div key={pt.id} style={{background:'rgba(167,139,250,0.06)',borderRadius:'14px',border:'1px solid rgba(167,139,250,0.2)',overflow:'hidden'}}>
                      {/* Collapsed header — always visible */}
                      <div onClick={()=>setPtArchiveExpanded(prev=>({...prev,[pt.id]:!prev[pt.id]}))}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(167,139,250,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{fontSize:'13px',color:'rgba(167,139,250,0.5)',flexShrink:0,whiteSpace:'nowrap'}}>{dateStr}</span>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{pt.type==='team'?groupSize:groupSize+'er'}</span>
                        <div style={{flex:1,display:'flex',gap:'5px',flexWrap:'wrap',overflow:'hidden',minWidth:0}}>
                          {fs2.map((s,i)=>(
                            <span key={s.childId} style={{fontSize:'12px',color:i===0?'#fde68a':i===1?'#e2e8f0':i===2?'#fdba74':'rgba(255,255,255,0.4)',fontWeight:i<3?'800':'600',whiteSpace:'nowrap'}}>
                              {i>0&&<span style={{color:'rgba(255,255,255,0.15)',margin:'0 2px'}}>·</span>}{s.name}
                            </span>
                          ))}
                        </div>
                        <span style={{fontSize:'18px',color:'rgba(167,139,250,0.5)',transform:expanded?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',flexShrink:0,lineHeight:1}}>›</span>
                        <button onClick={e=>{e.stopPropagation();if(!window.confirm('Übungswettkampf aus dem Archiv löschen?'))return;const upd={...archivedPracticeTournaments};delete upd[pt.id];saveArchivedPracticeTournaments(upd);}}
                          style={{flexShrink:0,width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <Trash2 size={13}/>
                        </button>
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
                          {pt.type==='team' ? (
                            <>
                              <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Partien</p>
                              <div style={{display:'grid',gap:'3px'}}>
                                {(pt.matches||[]).map((m,mi)=>{
                                  const nameA=(m.aPos||[]).map(i=>pt.teamA?.players?.[i]?.name||'?').join(' & ');
                                  const nameB=(m.bPos||[]).map(i=>pt.teamB?.players?.[i]?.name||'?').join(' & ');
                                  const res=m.result;
                                  return (
                                    <div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                      <div style={{flex:1,textAlign:'right'}}>
                                        <span style={{fontSize:'11px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets1>res.sets2?'700':'400'}}>{nameA}</span>
                                      </div>
                                      <div style={{textAlign:'center',flexShrink:0}}>
                                        <span style={{display:'block',fontSize:'12px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.15)',minWidth:'30px'}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
                                      </div>
                                      <div style={{flex:1}}>
                                        <span style={{fontSize:'11px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{nameB}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (()=>{
                            const ptPlayers=pt.players||[];
                            const ptMatches=pt.matches||[];
                            const numRoundsA=ptPlayers.length%2===0?ptPlayers.length-1:ptPlayers.length;
                            const roundsA=Array.from({length:numRoundsA<0?0:numRoundsA},(_,i)=>i+1);
                            return(<>
                              <p style={{margin:'0 0 6px',fontSize:'10px',fontWeight:'800',color:'rgba(167,139,250,0.45)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Spielplan</p>
                              {roundsA.map(round=>(
                                <div key={round} style={{marginBottom:'8px'}}>
                                  <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'1px'}}>Runde {round}</p>
                                  <div style={{display:'grid',gap:'3px'}}>
                                    {ptMatches.filter(m=>m.round===round).map((m,mi)=>{
                                      const p1=ptPlayers[m.p1Idx];const p2=ptPlayers[m.p2Idx];const res=m.result;
                                      const hc=m.handicap;
                                      const p1Gets=hc&&hc.beneficiary===m.p1Idx;
                                      const p2Gets=hc&&hc.beneficiary===m.p2Idx;
                                      return(<div key={mi} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',background:'rgba(255,255,255,0.03)',borderRadius:'7px'}}>
                                        <div style={{flex:1,textAlign:'right'}}>
                                          <span style={{fontSize:'11px',color:res&&res.sets1>res.sets2?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets1>res.sets2?'700':'400'}}>{p1?.name||'?'}</span>
                                          {p1Gets&&<span style={{display:'block',fontSize:'10px',color:'#fde68a',fontWeight:'800'}}>+{hc.points}P Vorgabe</span>}
                                        </div>
                                        <div style={{textAlign:'center',flexShrink:0}}>
                                          <span style={{display:'block',fontSize:'12px',fontWeight:'800',color:res?'#a78bfa':'rgba(255,255,255,0.15)',minWidth:'30px'}}>{res?`${res.sets1}:${res.sets2}`:'–:–'}</span>
                                          {hc&&<span style={{fontSize:'9px',color:'rgba(253,230,138,0.5)',fontWeight:'700',whiteSpace:'nowrap'}}>HCP {hc.points}P</span>}
                                        </div>
                                        <div style={{flex:1}}>
                                          <span style={{fontSize:'11px',color:res&&res.sets2>res.sets1?'white':'rgba(255,255,255,0.4)',fontWeight:res&&res.sets2>res.sets1?'700':'400'}}>{p2?.name||'?'}</span>
                                          {p2Gets&&<span style={{display:'block',fontSize:'10px',color:'#fde68a',fontWeight:'800'}}>+{hc.points}P Vorgabe</span>}
                                        </div>
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

          {/* ── RANGLISTEN TAB ── */}
          {archiveTab==='rangliste' && (()=>{
            const archived = ranglistenspiele.archived || [];
            return (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {archived.length === 0 && (
                  <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'12px',padding:'30px',textAlign:'center',color:'rgba(255,255,255,0.7)'}}>
                    <div style={{fontSize:'40px',marginBottom:'10px'}}>🏅</div>
                    <p style={{margin:'0 0 4px',fontWeight:'700'}}>Noch keine abgeschlossenen Ranglistenspiele</p>
                    <p style={{margin:0,fontSize:'13px',opacity:0.7}}>Abgeschlossene Spiele erscheinen hier nach dem Abschluss im Rangliste-Menü.</p>
                  </div>
                )}
                {archived.map((spiel,i) => {
                  const chal = children[spiel.challengerId];
                  const def  = children[spiel.defenderId];
                  const won  = spiel.result === 'challenger';
                  const date = spiel.closedAt ? new Date(spiel.closedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : spiel.date;
                  const chalRank = spiel.challengerRank;
                  const defRank  = spiel.defenderRank;
                  return (
                    <div key={spiel.id||i} style={{background:won?'rgba(74,222,128,0.06)':'rgba(147,197,253,0.06)',border:`1px solid ${won?'rgba(74,222,128,0.2)':'rgba(147,197,253,0.2)'}`,borderRadius:'14px',padding:'14px 16px'}}>
                      {/* Top row: icon + description + score */}
                      <div style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'10px'}}>
                        <span style={{fontSize:'24px',flexShrink:0,lineHeight:'1.2'}}>{won?'🎉':'🛡️'}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:'0 0 2px',fontWeight:'800',color:'white',fontSize:'14px',lineHeight:'1.3'}}>
                            {won
                              ? `${chal?.name||'?'} fordert ${def?.name||'?'} heraus & gewinnt`
                              : `${def?.name||'?'} verteidigt gegen ${chal?.name||'?'}`}
                          </p>
                          <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{date}</p>
                        </div>
                        <button onClick={()=>{if(!window.confirm('Ranglistenspiel löschen?'))return;saveRanglistenspiele({...ranglistenspiele,archived:ranglistenspiele.archived.filter((_,j)=>j!==i)});}}
                          style={{width:'30px',height:'30px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Trash2 size={13}/>
                        </button>
                        <div style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'6px 12px',flexShrink:0,textAlign:'center'}}>
                          <span style={{fontWeight:'900',fontSize:'20px',color:won?'#4ade80':'rgba(255,255,255,0.5)'}}>{spiel.sets1??spiel.challengerScore??'?'}</span>
                          <span style={{fontWeight:'700',color:'rgba(255,255,255,0.3)',fontSize:'14px',margin:'0 3px'}}>:</span>
                          <span style={{fontWeight:'900',fontSize:'20px',color:won?'rgba(255,255,255,0.5)':'#93c5fd'}}>{spiel.sets2??spiel.defenderScore??'?'}</span>
                        </div>
                      </div>
                      {/* Badges */}
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'12px',background:'rgba(252,211,77,0.1)',color:'#fcd34d',border:'1px solid rgba(252,211,77,0.25)',borderRadius:'8px',padding:'2px 10px',fontWeight:'700'}}>
                          ⚔️ {chal?.name||'?'}{chalRank?` (Platz #${chalRank})`:''}
                        </span>
                        <span style={{fontSize:'12px',background:'rgba(147,197,253,0.1)',color:'#93c5fd',border:'1px solid rgba(147,197,253,0.25)',borderRadius:'8px',padding:'2px 10px',fontWeight:'700'}}>
                          🛡️ {def?.name||'?'}{defRank?` (Platz #${defRank})`:''}
                        </span>
                        {won && chalRank && defRank && (
                          <span style={{fontSize:'12px',background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'8px',padding:'2px 10px',fontWeight:'700'}}>
                            ↑ Platz #{defRank} → #{defRank}
                          </span>
                        )}
                        {!won && chalRank && defRank && (
                          <span style={{fontSize:'12px',background:'rgba(147,197,253,0.1)',color:'#93c5fd',border:'1px solid rgba(147,197,253,0.25)',borderRadius:'8px',padding:'2px 10px',fontWeight:'700'}}>
                            = Plätze #{defRank} &amp; #{chalRank} unverändert
                          </span>
                        )}
                      </div>
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

  // ── MATERIALVERWALTUNG VIEW ──────────────────────────────────────────────
  if (view === 'materialverwaltung' && canEdit()) {
    const DICKEN_OPTS = ['OX','0,5 mm','1,0 mm','1,5 mm','1,8 mm','2,0 mm','2,1 mm','2,3 mm','max'];
    const missingFields = (mat) => {
      const missing = [];
      if (!mat.vh) missing.push('VH');
      if (!mat.rh) missing.push('RH');
      if (!mat.holz) missing.push('Holz');
      return missing;
    };
    const allChildren = Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>(a.name||'').localeCompare(b.name||'','de'));
    const q = materialSearch.trim().toLowerCase();
    const visChildren = q ? allChildren.filter(c=>(c.name||'').toLowerCase().includes(q)) : allChildren;
    const uniqBelag = (field) => [...new Set(Object.values(materialverwaltung).map(m=>m[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
    const saveMat = (childId, field, val) => saveMaterialverwaltung({...materialverwaltung,[childId]:{...(materialverwaltung[childId]||{}),[field]:val}});
    const fmtDate = (iso) => { if(!iso)return''; try{return new Date(iso).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch{return iso;} };

    // Shared input/select style for dark background
    const fldStyle = {width:'100%',boxSizing:'border-box',padding:'9px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',colorScheme:'dark'};

    // Build compact summary line for collapsed card
    const matSummary = (mat) => {
      const parts = [];
      if(mat.vh){let s=mat.vh;if(mat.vh_dicke)s+=` ${mat.vh_dicke}`;parts.push(`VH: ${s}`);}
      if(mat.rh){let s=mat.rh;if(mat.rh_dicke)s+=` ${mat.rh_dicke}`;parts.push(`RH: ${s}`);}
      if(mat.holz)parts.push(`Holz: ${mat.holz}`);
      return parts.join(' · ');
    };

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#1a0a00 0%,#2d1500 45%,#150800 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#fb923c')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🏓 Materialverwaltung</h1>
          <span style={{fontSize:'12px',color:'rgba(255,255,255,0.25)',fontWeight:'600'}}>{allChildren.length} Kinder</span>
        </div>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Suche */}
          <div style={{marginBottom:'16px',position:'relative'}}>
            <span style={{position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',fontSize:'15px',pointerEvents:'none'}}>🔍</span>
            <input type="text" placeholder="Kind suchen…" value={materialSearch} onChange={e=>setMaterialSearch(e.target.value)}
              style={{...fldStyle,paddingLeft:'38px',border:'1px solid rgba(251,146,60,0.22)'}}/>
            {materialSearch&&<button onClick={()=>setMaterialSearch('')} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'16px',lineHeight:1,padding:0}}>✕</button>}
          </div>

          {visChildren.length===0&&(
            <p style={{color:'rgba(255,255,255,0.35)',textAlign:'center',marginTop:'60px'}}>{q?`Kein Kind gefunden für „${materialSearch}"`:'Keine Kinder vorhanden.'}</p>
          )}

          {/* Accordion-Liste */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {visChildren.map(child=>{
              const mat = materialverwaltung[child.id]||{};
              const hasAny = mat.vh||mat.rh||mat.holz;
              const isOpen = materialExpanded===child.id;
              const missing = missingFields(mat);
              const hasWarn = missing.length > 0;
              const summary = matSummary(mat);
              const borderColor = isOpen ? 'rgba(251,146,60,0.3)' : hasWarn ? 'rgba(251,191,36,0.4)' : hasAny ? 'rgba(251,146,60,0.14)' : 'rgba(255,255,255,0.07)';
              return (
                <div key={child.id} style={{background: hasWarn&&!isOpen ? 'rgba(251,191,36,0.03)' : 'rgba(255,255,255,0.04)', border:`1px solid ${borderColor}`,borderRadius:'14px',overflow:'hidden',transition:'border-color 0.2s'}}>

                  {/* Kopfzeile — immer sichtbar, klickbar */}
                  <button onClick={()=>setMaterialExpanded(isOpen?null:child.id)}
                    style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'13px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                    <span style={{fontSize:'14px',color:'rgba(255,255,255,0.3)',transition:'transform 0.2s',transform:isOpen?'rotate(90deg)':'rotate(0deg)',flexShrink:0}}>▶</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontWeight:'800',fontSize:'14px',color:'white'}}>{child.name}</p>
                      {!isOpen&&(summary
                        ? <p style={{margin:'2px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{summary}</p>
                        : <p style={{margin:'2px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.18)',fontStyle:'italic'}}>kein Material eingetragen</p>
                      )}
                    </div>
                    {hasWarn&&!isOpen&&<span style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 8px',background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.35)',borderRadius:'20px',color:'#fbbf24',fontSize:'11px',fontWeight:'800',flexShrink:0,whiteSpace:'nowrap'}}>⚠️ Fehlt: {missing.join(', ')}</span>}
                    {hasAny&&!isOpen&&!hasWarn&&<span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#fb923c',flexShrink:0}}/>}
                  </button>

                  {/* Ausgeklappter Inhalt */}
                  {isOpen&&(
                    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:'14px'}}>

                      {/* VH */}
                      <div style={{background:'rgba(103,232,249,0.04)',border:'1px solid rgba(103,232,249,0.14)',borderRadius:'12px',padding:'12px 14px'}}>
                        <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'#67e8f9',textTransform:'uppercase',letterSpacing:'1px'}}>🏓 Vorhand</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                          <div>
                            <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Belag</p>
                            <input list={`dl_vh_${child.id}`} value={mat.vh||''}
                              onChange={e=>saveMat(child.id,'vh',e.target.value)}
                              placeholder="z. B. Butterfly Tenergy 05"
                              style={fldStyle}/>
                            <datalist id={`dl_vh_${child.id}`}>{uniqBelag('vh').map(o=><option key={o} value={o}/>)}</datalist>
                          </div>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            <div style={{flex:1,minWidth:'140px'}}>
                              <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Dicke</p>
                              <select className="dark-select" value={mat.vh_dicke||''} onChange={e=>saveMat(child.id,'vh_dicke',e.target.value)} style={{...fldStyle,cursor:'pointer'}}>
                                <option value="">– keine Angabe –</option>
                                {DICKEN_OPTS.map(d=><option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div style={{flex:1,minWidth:'140px'}}>
                              <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Gewechselt am</p>
                              <input type="date" value={mat.vh_datum||''} onChange={e=>saveMat(child.id,'vh_datum',e.target.value)} style={fldStyle}/>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RH */}
                      <div style={{background:'rgba(167,139,250,0.04)',border:'1px solid rgba(167,139,250,0.14)',borderRadius:'12px',padding:'12px 14px'}}>
                        <p style={{margin:'0 0 10px',fontSize:'10px',fontWeight:'800',color:'#a78bfa',textTransform:'uppercase',letterSpacing:'1px'}}>🏓 Rückhand</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                          <div>
                            <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Belag</p>
                            <input list={`dl_rh_${child.id}`} value={mat.rh||''}
                              onChange={e=>saveMat(child.id,'rh',e.target.value)}
                              placeholder="z. B. DHS Hurricane 3"
                              style={fldStyle}/>
                            <datalist id={`dl_rh_${child.id}`}>{uniqBelag('rh').map(o=><option key={o} value={o}/>)}</datalist>
                          </div>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            <div style={{flex:1,minWidth:'140px'}}>
                              <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Dicke</p>
                              <select className="dark-select" value={mat.rh_dicke||''} onChange={e=>saveMat(child.id,'rh_dicke',e.target.value)} style={{...fldStyle,cursor:'pointer'}}>
                                <option value="">– keine Angabe –</option>
                                {DICKEN_OPTS.map(d=><option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div style={{flex:1,minWidth:'140px'}}>
                              <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Gewechselt am</p>
                              <input type="date" value={mat.rh_datum||''} onChange={e=>saveMat(child.id,'rh_datum',e.target.value)} style={fldStyle}/>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Holz */}
                      <div>
                        <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'800',color:'#86efac',textTransform:'uppercase',letterSpacing:'1px'}}>🪵 Holz</p>
                        <input list={`dl_holz_${child.id}`} value={mat.holz||''}
                          onChange={e=>saveMat(child.id,'holz',e.target.value)}
                          placeholder="z. B. Stiga Clipper"
                          style={fldStyle}/>
                        <datalist id={`dl_holz_${child.id}`}>{uniqBelag('holz').map(o=><option key={o} value={o}/>)}</datalist>
                      </div>


                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── TTR VERLAUF VIEW ────────────────────────────────────────────────────
  if (view === 'ttrVerlauf' && ttrVerlaufChild) {
    const child = ttrVerlaufChild;
    const hist = ttrHistory[child.id]?.entries || [];
    const W=340,H=200,PL=48,PR=14,PT=18,PB=38;
    const iW=W-PL-PR,iH=H-PT-PB;
    const ttrs=hist.map(e=>e.ttr);
    const minV=ttrs.length?Math.min(...ttrs)-30:0;
    const maxV=ttrs.length?Math.max(...ttrs)+30:100;
    const xOf=(i)=>PL+(hist.length<2?iW/2:i/(hist.length-1)*iW);
    const yOf=(v)=>PT+iH-(v-minV)/(maxV-minV||1)*iH;
    const pts=hist.map((e,i)=>({x:xOf(i),y:yOf(e.ttr),e}));
    const path=pts.map((p,i)=>(i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
    const area=pts.length?`M${pts[0].x},${H-PB} `+pts.map(p=>`L${p.x},${p.y}`).join(' ')+` L${pts[pts.length-1].x},${H-PB} Z`:'';
    const last=hist[hist.length-1];
    const first=hist[0];
    const totalDiff=last&&first?last.ttr-first.ttr:0;
    const prevEntry=hist.length>1?hist[hist.length-2]:null;
    const lastDiff=last&&prevEntry?last.ttr-prevEntry.ttr:null;
    const backView='ttrWerte';
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#0a0e00 0%,#1a1600 45%,#0a0c00 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div style={{maxWidth:'600px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>
          <div className="ttc-sticky-hdr" style={{display:'flex',alignItems:'center',gap:'14px',borderBottom:'1px solid rgba(251,191,36,0.12)',padding:isMobile?'12px 14px':'18px 24px',margin:isMobile?'0 -14px 28px':'0 -24px 32px'}}>
            <button onClick={()=>navTo(backView)} style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ArrowLeft size={18}/></button>
            <div>
              <p style={{margin:'0 0 1px',color:'rgba(251,191,36,0.5)',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px'}}>📈 TTR-Verlauf</p>
              <h2 style={{margin:0,color:'white',fontWeight:'800',fontSize:isMobile?'16px':'19px'}}>{child.name}</h2>
            </div>
          </div>

          {hist.length===0?(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <p style={{fontSize:'40px',margin:'0 0 12px'}}>📊</p>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:'15px'}}>Noch keine TTR-Daten vorhanden.</p>
              {canEdit()&&<p style={{color:'rgba(255,255,255,0.2)',fontSize:'12px',marginTop:'8px'}}>Über TTR-Import → Admin importieren.</p>}
            </div>
          ):(
            <>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'24px'}}>
                {[
                  {label:'Aktuell',value:last?.ttr,sub:last?.month,color:'#fbbf24',bg:'rgba(251,191,36,0.08)',border:'rgba(251,191,36,0.2)'},
                  {label:'Letzter Monat',value:lastDiff!==null?(lastDiff>=0?'+':'')+lastDiff:'–',color:lastDiff>=0?'#4ade80':'#f87171',bg:lastDiff>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)',border:lastDiff>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'},
                  {label:'Gesamt',value:(totalDiff>=0?'+':'')+totalDiff,sub:first?.month+' bis heute',color:totalDiff>=0?'#4ade80':'#f87171',bg:totalDiff>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)',border:totalDiff>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'},
                ].map(({label,value,sub,color,bg,border})=>(
                  <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:'14px',padding:'14px 10px',textAlign:'center'}}>
                    <p style={{margin:'0 0 2px',fontSize:'22px',fontWeight:'900',color,letterSpacing:'-0.5px'}}>{value}</p>
                    <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.35)',fontWeight:'700',textTransform:'uppercase'}}>{label}</p>
                    {sub&&<p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>{sub}</p>}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(251,191,36,0.1)',borderRadius:'16px',padding:'16px',marginBottom:'24px'}}>
                <p style={{margin:'0 0 12px',fontSize:'12px',color:'rgba(255,255,255,0.35)',fontWeight:'600'}}>{hist.length} Monate · {first?.month} – {last?.month}</p>
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
                  <defs>
                    <linearGradient id="ttrGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.01"/>
                    </linearGradient>
                  </defs>
                  {[0.2,0.4,0.6,0.8,1].map(f=>{
                    const y=PT+iH*f;
                    const v=Math.round(maxV-(maxV-minV)*f);
                    return(<g key={f}>
                      <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <text x={PL-4} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{v}</text>
                    </g>);
                  })}
                  {area&&<path d={area} fill="url(#ttrGrad2)"/>}
                  {path&&<path d={path} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                  {pts.map((p,i)=>{
                    const isLast=i===pts.length-1;
                    const showLabel=hist.length<=10||i===0||isLast||i%Math.ceil(hist.length/6)===0;
                    return(<g key={i}>
                      <circle cx={p.x} cy={p.y} r={isLast?5:3} fill={isLast?'#fbbf24':'rgba(251,191,36,0.6)'} stroke={isLast?'rgba(0,0,0,0.5)':'none'} strokeWidth={isLast?2:0}/>
                      {isLast&&<text x={p.x} y={p.y-10} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">{p.e.ttr}</text>}
                      {showLabel&&<text x={p.x} y={H-PB+14} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">{p.e.month.slice(5)}/{p.e.month.slice(2,4)}</text>}
                    </g>);
                  })}
                </svg>
              </div>

              {/* Tabelle */}
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Monat</span>
                  <span style={{fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>TTR</span>
                </div>
                <div style={{maxHeight:'260px',overflowY:'auto'}}>
                  {[...hist].reverse().map((e,i,arr)=>{
                    const prev=arr[i+1];
                    const d=prev?e.ttr-prev.ttr:null;
                    return(
                    <div key={e.month} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{e.month}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        {d!==null&&<span style={{fontSize:'11px',fontWeight:'700',color:d>=0?'#4ade80':'#f87171'}}>{d>=0?'+':''}{d}</span>}
                        <span style={{fontSize:'14px',fontWeight:'800',color:i===0?'#fbbf24':'white'}}>{e.ttr}</span>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── SPIELER DES MONATS VIEW ─────────────────────────────────────────────
  if (view === 'spielerDesMonats') {
    const fmtMonth = ym => { const [y,m]=ym.split('-'); return `${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][Number(m)-1]} ${y}`; };
    const historicMonths = [...sdmHistoricMonths].reverse();
    const historicYears  = [...sdmHistoricYears].reverse();

    // Stats: wins per player
    const winCounts = {};
    sdmHistoricMonths.forEach(({winners}) => winners.forEach(({child}) => { winCounts[child.id]=(winCounts[child.id]||0)+1; }));
    const winRanking = Object.entries(winCounts).map(([id,count])=>({name:children[id]?.name||'?',count})).sort((a,b)=>b.count-a.count);
    const maxWinCount = winRanking.length ? winRanking[0].count : 1;
    // Top 3 highest single-month TTR gain
    const allGains = [];
    sdmHistoricMonths.forEach(({period,winners}) => winners.forEach(({child,diff})=>allGains.push({name:child.name,diff,period})));
    const top3Gains = allGains.sort((a,b)=>b.diff-a.diff).slice(0,3);

    const WinnerBadge = ({w,large=false}) => (
      <div style={{display:'flex',alignItems:'center',gap:large?'14px':'10px'}}>
        <div style={{width:large?'52px':'36px',height:large?'52px':'36px',borderRadius:'50%',background:'rgba(252,211,77,0.18)',border:`2px solid rgba(252,211,77,${large?'0.6':'0.35'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:large?'26px':'18px',flexShrink:0}}>
          {large?'🥇':'🏅'}
        </div>
        <div>
          <p style={{margin:0,fontWeight:'900',fontSize:large?'19px':'14px',color:'white',letterSpacing:large?'-0.3px':'0'}}>{w.child.name}</p>
          <p style={{margin:'2px 0 0',fontSize:large?'12px':'11px',color:'rgba(255,255,255,0.4)'}}>
            {w.prevTtr} → {w.currTtr} <span style={{color:'#4ade80',fontWeight:'800'}}>+{w.diff}</span>
          </p>
        </div>
      </div>
    );

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#0c0a00 0%,#1a1400 45%,#0c0a00 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('ttrWerte')} style={s.btn('#fcd34d')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>🥇 Spieler des Monats</h1>
        </div>
        <div style={{maxWidth:'680px',margin:'0 auto',padding:isMobile?'16px 14px 48px':'20px 24px 60px',display:'flex',flexDirection:'column',gap:'14px'}}>

          {/* ── Individuelle Zeitraumauswertung ── */}
          {(()=>{
            // Quick-select presets → YYYY-MM strings
            const toYM = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const now = new Date();
            const presets = [
              {label:'Letzte 3 Monate', start: toYM(new Date(now.getFullYear(), now.getMonth()-3, 1)), end: toYM(now)},
              {label:'Letzte 6 Monate', start: toYM(new Date(now.getFullYear(), now.getMonth()-6, 1)), end: toYM(now)},
              {label:'Letztes Jahr',    start: `${now.getFullYear()-1}-01`, end: `${now.getFullYear()-1}-12`},
              {label:'Akt. Kalenderjahr', start: `${now.getFullYear()}-01`, end: toYM(now)},
            ];

            // Date-input value → YYYY-MM (strip day if present)
            const toYMfromInput = v => v ? v.slice(0,7) : '';

            const startYM = sdmCustomStart ? toYMfromInput(sdmCustomStart) : '';
            const endYM   = sdmCustomEnd   ? toYMfromInput(sdmCustomEnd)   : '';

            // Compute results whenever both dates are set
            const results = (startYM && endYM && startYM <= endYM) ? (() => {
              const rows = [];
              let excluded = 0;
              sdmJugendKids.forEach(c => {
                const entries = (ttrHistory[c.id]?.entries || []);
                if (!entries.length) { excluded++; return; }
                const sorted = [...entries].sort((a,b)=>a.month.localeCompare(b.month));
                // Ausschlusskriterium: erster Eintrag muss VOR startYM liegen
                if (sorted[0].month >= startYM) { excluded++; return; }
                const startEntry = sdmGetTtrAt(sorted, startYM);
                const endEntry   = sdmGetTtrAt(sorted, endYM);
                if (!startEntry || !endEntry) { excluded++; return; }
                const diff = endEntry.ttr - startEntry.ttr;
                rows.push({name: c.name, startTtr: startEntry.ttr, endTtr: endEntry.ttr, diff});
              });
              rows.sort((a,b) => b.diff - a.diff);
              return {rows, excluded};
            })() : null;

            const fmtYMlong = ym => { if(!ym) return ''; const [y,m]=ym.split('-'); return `${String(m).padStart(2,'0')}.${y}`; };

            return (
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'18px',overflow:'hidden'}}>
                {/* Header – immer sichtbar */}
                <button onClick={()=>setSdmCustomOpen(v=>!v)}
                  style={{width:'100%',padding:'14px 18px',display:'flex',alignItems:'center',gap:'10px',background:'none',border:'none',color:'white',cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:'18px'}}>📊</span>
                  <span style={{flex:1,fontWeight:'800',fontSize:'14px',color:'rgba(255,255,255,0.85)'}}>Individuelle Zeitraumauswertung</span>
                  <span style={{fontSize:'14px',color:'rgba(255,255,255,0.3)',transform:sdmCustomOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>▼</span>
                </button>

                {sdmCustomOpen && (
                  <div style={{padding:'0 18px 18px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>

                    {/* Schnellauswahl */}
                    <p style={{margin:'14px 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(252,211,77,0.5)',textTransform:'uppercase',letterSpacing:'1px'}}>Schnellauswahl</p>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
                      {presets.map(p=>{
                        const active = sdmCustomStart===p.start && sdmCustomEnd===p.end;
                        return (
                          <button key={p.label} onClick={()=>{setSdmCustomStart(p.start);setSdmCustomEnd(p.end);}}
                            style={{padding:'6px 12px',borderRadius:'20px',border:`1.5px solid ${active?'#fcd34d':'rgba(255,255,255,0.12)'}`,background:active?'rgba(252,211,77,0.12)':'rgba(255,255,255,0.04)',color:active?'#fcd34d':'rgba(255,255,255,0.5)',fontSize:'12px',fontWeight:'700',cursor:'pointer',transition:'all 0.15s'}}>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Freie Auswahl */}
                    <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(252,211,77,0.5)',textTransform:'uppercase',letterSpacing:'1px'}}>Freie Auswahl</p>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px',alignItems:'center'}}>
                      <input type="month" value={sdmCustomStart} onChange={e=>setSdmCustomStart(e.target.value)}
                        style={{flex:'1 1 130px',padding:'8px 10px',borderRadius:'9px',border:'1px solid rgba(252,211,77,0.2)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'13px',outline:'none',colorScheme:'dark'}}/>
                      <span style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',flexShrink:0}}>bis</span>
                      <input type="month" value={sdmCustomEnd} onChange={e=>setSdmCustomEnd(e.target.value)}
                        style={{flex:'1 1 130px',padding:'8px 10px',borderRadius:'9px',border:'1px solid rgba(252,211,77,0.2)',background:'rgba(255,255,255,0.05)',color:'white',fontSize:'13px',outline:'none',colorScheme:'dark'}}/>
                    </div>

                    {/* Ergebnis */}
                    {!startYM || !endYM
                      ? <p style={{color:'rgba(255,255,255,0.25)',fontSize:'13px',textAlign:'center',padding:'12px 0'}}>Zeitraum wählen, um die Auswertung zu sehen.</p>
                      : startYM > endYM
                      ? <p style={{color:'#f87171',fontSize:'13px',textAlign:'center',padding:'8px 0'}}>Startmonat muss vor dem Endmonat liegen.</p>
                      : results && (<>
                          {/* Info-Zeile */}
                          <div style={{padding:'9px 12px',background:'rgba(252,211,77,0.06)',border:'1px solid rgba(252,211,77,0.15)',borderRadius:'10px',marginBottom:'12px',fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>
                            Auswertung: <span style={{color:'rgba(252,211,77,0.8)',fontWeight:'700'}}>{fmtYMlong(startYM)} – {fmtYMlong(endYM)}</span>
                            {' · '}<span style={{color:'#4ade80',fontWeight:'700'}}>{results.rows.length} Spieler gewertet</span>
                            {results.excluded>0&&<span style={{color:'rgba(255,255,255,0.3)'}}> · {results.excluded} ausgeschlossen</span>}
                          </div>

                          {results.rows.length===0
                            ? <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',textAlign:'center',padding:'12px 0'}}>Keine qualifizierten Spieler im gewählten Zeitraum.</p>
                            : <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                                {results.rows.map((r,i)=>(
                                  <div key={r.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'10px',background:i===0?'rgba(252,211,77,0.06)':'rgba(255,255,255,0.02)',border:`1px solid ${i===0?'rgba(252,211,77,0.2)':'rgba(255,255,255,0.05)'}` }}>
                                    <span style={{fontSize:'13px',fontWeight:'900',color:i===0?'#fcd34d':'rgba(255,255,255,0.3)',minWidth:'22px',textAlign:'center'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                                    <span style={{flex:1,fontWeight:'700',fontSize:'13px',color:'white'}}>{r.name}</span>
                                    <span style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',flexShrink:0}}>{r.startTtr} → {r.endTtr}</span>
                                    <span style={{fontSize:'13px',fontWeight:'900',minWidth:'46px',textAlign:'right',flexShrink:0,color:r.diff>0?'#4ade80':r.diff<0?'#f87171':'rgba(255,255,255,0.3)'}}>
                                      {r.diff>0?'+':''}{r.diff}
                                    </span>
                                  </div>
                                ))}
                              </div>
                          }
                        </>)
                    }
                  </div>
                )}
              </div>
            );
          })()}

          {/* Spieler des Monats – große Hauptkachel */}
          <div style={{background:'linear-gradient(135deg,rgba(252,211,77,0.10) 0%,rgba(252,211,77,0.04) 100%)',border:'1.5px solid rgba(252,211,77,0.35)',borderRadius:'20px',padding:'20px 22px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'14px'}}>
              <span style={{fontSize:'9px',fontWeight:'900',color:'rgba(252,211,77,0.55)',textTransform:'uppercase',letterSpacing:'2px'}}>
                {sdmCurrentMonthLabel ? fmtMonth(sdmCurrentMonthLabel) : 'Aktuell'}
              </span>
              <span style={{fontSize:'9px',fontWeight:'900',color:'rgba(252,211,77,0.3)',textTransform:'uppercase',letterSpacing:'2px'}}>· Spieler des Monats</span>
            </div>
            {sdmCurrentMonthWinners ? (
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                {sdmCurrentMonthWinners.map((w,i)=><WinnerBadge key={i} w={w} large/>)}
              </div>
            ) : (
              <p style={{margin:0,fontSize:'14px',color:'rgba(255,255,255,0.3)'}}>Noch keine Daten für diesen Monat.</p>
            )}
          </div>

          {/* Spieler des Jahres – eigene prominente Kachel */}
          <div style={{background:'linear-gradient(135deg,rgba(251,191,36,0.16) 0%,rgba(217,119,6,0.08) 100%)',border:'2px solid rgba(251,191,36,0.5)',borderRadius:'20px',padding:'20px 22px',boxShadow:'0 0 28px rgba(251,191,36,0.08)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
              <span style={{fontSize:'20px'}}>👑</span>
              <div>
                <p style={{margin:0,fontSize:'9px',fontWeight:'900',color:'rgba(251,191,36,0.5)',textTransform:'uppercase',letterSpacing:'2px'}}>Spieler des Jahres</p>
                <p style={{margin:0,fontSize:'20px',fontWeight:'900',color:'#fbbf24',letterSpacing:'-0.5px'}}>{sdmCurrentYearLabel}</p>
              </div>
            </div>
            {sdmCurrentYearWinners ? (
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                {sdmCurrentYearWinners.map((w,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(251,191,36,0.2)',border:'2px solid rgba(251,191,36,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>🏆</div>
                    <div>
                      <p style={{margin:0,fontWeight:'900',fontSize:'17px',color:'#fbbf24',letterSpacing:'-0.2px'}}>{w.child.name}</p>
                      <p style={{margin:'2px 0 0',fontSize:'12px',color:'rgba(251,191,36,0.5)'}}>
                        {w.prevTtr} → {w.currTtr} <span style={{color:'#4ade80',fontWeight:'800'}}>+{w.diff}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{margin:0,fontSize:'14px',color:'rgba(255,255,255,0.3)'}}>Noch keine Daten für dieses Jahr.</p>
            )}
          </div>

          {/* Statistik-Kachel */}
          {(winRanking.length>0||top3Gains.length>0)&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'18px',padding:'18px 20px'}}>
              <p style={{margin:'0 0 16px',fontSize:'10px',fontWeight:'900',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>📊 Statistiken</p>

              {/* Balkendiagramm Monatssieger */}
              {winRanking.length>0&&(
                <div style={{marginBottom:'20px'}}>
                  <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'800',color:'rgba(255,255,255,0.5)'}}>Anzahl Monatssiege</p>
                  <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                    {winRanking.map((p,i)=>(
                      <div key={p.name} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',minWidth:'96px',textAlign:'right',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                        <div style={{flex:1,height:'20px',background:'rgba(255,255,255,0.04)',borderRadius:'6px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${(p.count/maxWinCount)*100}%`,background:i===0?'linear-gradient(90deg,#fbbf24,#f59e0b)':i===1?'linear-gradient(90deg,rgba(251,191,36,0.55),rgba(245,158,11,0.55))':'linear-gradient(90deg,rgba(251,191,36,0.3),rgba(245,158,11,0.3))',borderRadius:'6px',transition:'width 0.3s',display:'flex',alignItems:'center',paddingLeft:'6px'}}>
                            <span style={{fontSize:'10px',fontWeight:'800',color:i===0?'#1a1000':'rgba(255,255,255,0.6)',whiteSpace:'nowrap'}}>{p.count}×</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top 3 Höchste Monatsverbesserung */}
              {top3Gains.length>0&&(
                <div>
                  <p style={{margin:'0 0 10px',fontSize:'12px',fontWeight:'800',color:'rgba(255,255,255,0.5)'}}>Top 3 – Höchste TTR-Verbesserung in einem Monat</p>
                  <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                    {top3Gains.map((g,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:`rgba(74,222,128,${0.06-i*0.015})`,border:`1px solid rgba(74,222,128,${0.2-i*0.05})`,borderRadius:'10px'}}>
                        <span style={{fontSize:'16px'}}>{['🥇','🥈','🥉'][i]}</span>
                        <span style={{flex:1,fontWeight:'700',fontSize:'13px',color:'white'}}>{g.name}</span>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>{fmtMonth(g.period)}</span>
                        <span style={{fontWeight:'900',fontSize:'14px',color:'#4ade80'}}>+{g.diff}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historische Monatsübersicht */}
          {historicMonths.length>0&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',overflow:'hidden'}}>
              <p style={{margin:0,padding:'13px 16px',fontSize:'10px',fontWeight:'900',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>Historische Monatssieger</p>
              <div style={{maxHeight:'320px',overflowY:'auto'}}>
                {historicMonths.map(({period,winners})=>(
                  <div key={period} style={{display:'flex',alignItems:'center',gap:'12px',padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700',minWidth:'56px'}}>{fmtMonth(period)}</span>
                    <div style={{flex:1}}>{winners.map((w,i)=><span key={i} style={{display:'block',fontWeight:'700',color:'white',fontSize:'13px'}}>{w.child.name}</span>)}</div>
                    <span style={{fontSize:'12px',fontWeight:'800',color:'#4ade80'}}>+{winners[0].diff}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historische Jahresübersicht */}
          {historicYears.length>0&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',overflow:'hidden'}}>
              <p style={{margin:0,padding:'13px 16px',fontSize:'10px',fontWeight:'900',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'1.5px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>Historische Jahressieger</p>
              {historicYears.map(({period,winners})=>(
                <div key={period} style={{display:'flex',alignItems:'center',gap:'12px',padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700',minWidth:'40px'}}>{period}</span>
                  <div style={{flex:1}}>{winners.map((w,i)=><span key={i} style={{display:'block',fontWeight:'700',color:'#fbbf24',fontSize:'13px'}}>{w.child.name}</span>)}</div>
                  <span style={{fontSize:'12px',fontWeight:'800',color:'#4ade80'}}>+{winners[0].diff}</span>
                </div>
              ))}
            </div>
          )}

          {sdmHistoricMonths.length===0&&sdmHistoricYears.length===0&&(
            <div style={{textAlign:'center',padding:'48px 20px',color:'rgba(255,255,255,0.25)',fontSize:'14px'}}>
              <p style={{fontSize:'36px',margin:'0 0 12px'}}>📊</p>
              Noch nicht genug TTR-Daten für eine Auswertung.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TTR WERTE VIEW ──────────────────────────────────────────────────────
  if (view === 'ttrWerte' && canEdit()) {
    const accent = '#fbbf24';

    // Aktuellster Importmonat = neuester Monat über alle ttrHistory-Einträge
    const allMonths = Object.values(ttrHistory).flatMap(h=>(h.entries||[]).map(e=>e.month));
    const latestImportMonth = allMonths.length ? allMonths.reduce((a,b)=>a>b?a:b) : null;

    const allChildren = Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const withTtr = allChildren.map(c=>{
      const hist=ttrHistory[c.id]?.entries||[];
      const last=hist.length?hist[hist.length-1]:null;
      const prev=hist.length>1?hist[hist.length-2]:null;
      const diff=last&&prev?last.ttr-prev.ttr:null;
      const total=last&&hist[0]?last.ttr-hist[0].ttr:null;
      const isCurrent = latestImportMonth ? last?.month===latestImportMonth : !!last;
      return{...c,hist,last,prev,diff,total,_type:'jugend',isCurrent};
    }).sort((a,b)=>(b.last?.ttr||0)-(a.last?.ttr||0));

    // Aktive Spieler with TTR history
    const aktiveSpielerList = Object.values(aktiveSpieler).map(sp=>{
      const hist=(ttrHistory[sp.id]?.entries||[]).slice().sort((a,b)=>a.month.localeCompare(b.month));
      const last=hist[hist.length-1]||null;
      const prev=hist[hist.length-2]||null;
      const diff=last&&prev?last.ttr-prev.ttr:null;
      const total=last&&hist[0]?last.ttr-hist[0].ttr:null;
      const isCurrent = latestImportMonth ? last?.month===latestImportMonth : !!last;
      return{...sp,hist,last,prev,diff,total,_type:'aktiv',isCurrent};
    }).filter(sp=>sp.last).sort((a,b)=>(b.last?.ttr||0)-(a.last?.ttr||0));

    const withData=withTtr.filter(c=>c.last&&c.isCurrent);
    const withoutData=withTtr.filter(c=>!c.last);
    const ehemalJugend=withTtr.filter(c=>c.last&&!c.isCurrent);
    const aktiveActive=aktiveSpielerList.filter(sp=>sp.isCurrent);
    const ehemalAktiv=aktiveSpielerList.filter(sp=>!sp.isCurrent);
    const ehemals=[...ehemalJugend,...ehemalAktiv].sort((a,b)=>(b.last?.ttr||0)-(a.last?.ttr||0));

    const allWithData = [...withData, ...aktiveActive].sort((a,b)=>(b.last?.ttr||0)-(a.last?.ttr||0));
    const displayList = ttrFilter==='jugend' ? withData : ttrFilter==='aktive' ? aktiveActive : ttrFilter==='ehemalige' ? ehemals : allWithData;

    const filterTabs = [
      {id:'all', label:`Alle (${allWithData.length})`},
      {id:'jugend', label:`Jugend (${withData.length})`},
      {id:'aktive', label:`Aktive (${aktiveActive.length})`},
      {id:'ehemalige', label:`Ehemalige (${ehemals.length})`},
    ];

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#0a0e00 0%,#1a1600 45%,#0a0c00 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#fbbf24')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📈 TTR Werte</h1>
        </div>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* TTR Import + Spieler des Monats Buttons */}
          <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
            <button onClick={()=>navTo('ttrImport')}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'12px',background:'rgba(110,231,183,0.07)',border:'1px solid rgba(110,231,183,0.2)',borderRadius:'14px',color:'#6ee7b7',cursor:'pointer',fontWeight:'700',fontSize:'14px',transition:'all 0.12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(110,231,183,0.13)';e.currentTarget.style.borderColor='rgba(110,231,183,0.35)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(110,231,183,0.07)';e.currentTarget.style.borderColor='rgba(110,231,183,0.2)';}}>
              <span style={{fontSize:'16px'}}>📥</span> TTR-Import
            </button>
            <button onClick={()=>navTo('spielerDesMonats')}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'12px',background:'rgba(252,211,77,0.07)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:'14px',color:'#fcd34d',cursor:'pointer',fontWeight:'700',fontSize:'14px',transition:'all 0.12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(252,211,77,0.13)';e.currentTarget.style.borderColor='rgba(252,211,77,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(252,211,77,0.07)';e.currentTarget.style.borderColor='rgba(252,211,77,0.2)';}}>
              <span style={{fontSize:'16px'}}>🥇</span> Spieler des Monats
            </button>
          </div>

          <div style={{display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
            {filterTabs.map(tab=>(
              <button key={tab.id} onClick={()=>setTtrFilter(tab.id)}
                style={{padding:'7px 14px',borderRadius:'20px',border:`1px solid ${ttrFilter===tab.id?'rgba(251,191,36,0.5)':'rgba(255,255,255,0.1)'}`,background:ttrFilter===tab.id?'rgba(251,191,36,0.12)':'transparent',color:ttrFilter===tab.id?'#fbbf24':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'700',fontSize:'12px',transition:'all 0.12s'}}>
                {tab.label}
              </button>
            ))}
          </div>

          {displayList.length===0&&(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <p style={{fontSize:'40px',margin:'0 0 12px'}}>📊</p>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:'15px'}}>Noch keine TTR-Daten importiert.</p>
              <button onClick={()=>navTo('ttrImport')} style={{marginTop:'16px',padding:'11px 22px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:'12px',color:'#fbbf24',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>→ TTR-Import öffnen</button>
            </div>
          )}

          {displayList.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'28px'}}>
              {displayList.map((c,rank)=>{
                const barW=c.last?Math.round((c.last.ttr-500)/10):0;
                const isAktiv=c._type==='aktiv';
                const isEhemalig=ttrFilter==='ehemalige';
                const accentCol=isEhemalig?'rgba(255,255,255,0.4)':isAktiv?'#38bdf8':'#fbbf24';
                const rankBg=rank<3?`rgba(${isAktiv?'56,189,248':'251,191,36'},0.15)`:'rgba(255,255,255,0.05)';
                const rankCol=rank<3?(isAktiv?'#38bdf8':'#fbbf24'):'rgba(255,255,255,0.3)';
                return(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:`1px solid ${isEhemalig?'rgba(255,255,255,0.06)':isAktiv?'rgba(56,189,248,0.1)':'rgba(251,191,36,0.1)'}`,borderRadius:'12px',cursor:'pointer',transition:'all 0.12s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=isAktiv?'rgba(56,189,248,0.06)':'rgba(251,191,36,0.06)';e.currentTarget.style.borderColor=isAktiv?'rgba(56,189,248,0.2)':'rgba(251,191,36,0.2)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor=isEhemalig?'rgba(255,255,255,0.06)':isAktiv?'rgba(56,189,248,0.1)':'rgba(251,191,36,0.1)';}}
                  onClick={()=>{setTtrVerlaufChild(c);navTo('ttrVerlauf');}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'8px',background:isEhemalig?'rgba(255,255,255,0.04)':rankBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:'12px',fontWeight:'800',color:isEhemalig?'rgba(255,255,255,0.2)':rankCol}}>{rank+1}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px',flexWrap:'wrap'}}>
                      <span style={{fontWeight:'700',color:'white',fontSize:'14px'}}>{c.name}</span>
                      {!isEhemalig&&c.diff!==null&&(
                        <span style={{display:'inline-flex',alignItems:'center',gap:'2px',fontSize:'11px',fontWeight:'700',color:c.diff>=0?'#4ade80':'#f87171',background:c.diff>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)',borderRadius:'6px',padding:'1px 5px'}}>
                          {c.diff>=0?'+':''}{c.diff}
                          <span style={{fontSize:'9px',fontWeight:'500',color:'rgba(255,255,255,0.3)',marginLeft:'1px'}}>Vormonat</span>
                        </span>
                      )}
                    </div>
                    <div style={{background:'rgba(255,255,255,0.06)',borderRadius:'99px',height:'5px',overflow:'hidden'}}>
                      <div style={{width:`${Math.min(barW,100)}%`,height:'100%',background:`linear-gradient(90deg,#92400e,${accentCol})`,borderRadius:'99px'}}/>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <p style={{margin:0,fontWeight:'900',fontSize:'20px',color:accentCol}}>{c.last?.ttr}</p>
                    {isEhemalig&&c.last?.month&&<p style={{margin:'2px 0 0',fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>zuletzt {c.last.month}</p>}
                  </div>
                </div>
              );})}
            </div>
          )}

          {(ttrFilter==='all'||ttrFilter==='jugend')&&withoutData.length>0&&(
            <div>
              <p style={{margin:'0 0 12px',fontSize:'12px',fontWeight:'700',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Ohne TTR-Daten ({withoutData.length})</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {withoutData.map(c=>(
                  <span key={c.id} style={{fontSize:'12px',color:'rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'4px 10px'}}>{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TTR IMPORT VIEW ─────────────────────────────────────────────────────
  if (view === 'ttrImport' && canEdit()) {
    const accent = '#6ee7b7';

    const parseExcel = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const XLSX = window._XLSX;
          if (!XLSX) { alert('XLSX-Bibliothek nicht geladen. Bitte Seite neu laden.'); return; }
          const wb = XLSX.read(e.target.result, {type:'array'});
          const ws = wb.Sheets['Tabelle1'];
          if (!ws) { alert('Sheet "Tabelle1" nicht gefunden.'); return; }
          const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});

          // Parse header row by reading cells DIRECTLY from the worksheet.
          // This bypasses sheet_to_json's type conversions (which were turning
          // date serials into Date objects/strings inconsistently across builds).
          // Each cell object: .t = type ('n' number, 's'/'str' string, 'd' date),
          // .v = raw value, .w = formatted display text (e.g. "01.12.2025").
          const months = []; // [{col, label:'YYYY-MM'}]
          const excelSerial = n => new Date(Math.round((n - 25569) * 86400 * 1000));
          const wsRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          const colCount = Math.max((raw[0] || []).length, wsRange.e.c + 1);
          // Returns {yr, mo} from a header cell object, or null
          const decodeCell = (cell) => {
            if (!cell) return null;
            // Date type → .v is a Date
            if (cell.t === 'd' && cell.v instanceof Date && !isNaN(cell.v))
              return { yr: cell.v.getFullYear(), mo: cell.v.getMonth() + 1 };
            // Number type → .v is the Excel serial
            if (cell.t === 'n' && typeof cell.v === 'number' && cell.v > 40000 && cell.v < 60000) {
              const d = excelSerial(cell.v);
              return { yr: d.getUTCFullYear(), mo: d.getUTCMonth() + 1 };
            }
            // Fallback: parse the formatted display text or raw string value
            const txt = String(cell.w != null ? cell.w : cell.v || '').trim();
            if (!txt || txt.includes('Differenz') || txt.includes('Jahr')) return null;
            // Pure numeric serial as text e.g. "45230"
            if (/^\d{4,6}$/.test(txt)) {
              const n = Number(txt);
              if (n > 40000 && n < 60000) { const d = excelSerial(n); return { yr: d.getUTCFullYear(), mo: d.getUTCMonth() + 1 }; }
            }
            // "DD.MM.YYYY" — year may be malformed (e.g. "202024") → take last 4 digits
            const m = txt.match(/(\d{1,2})\.(\d{1,2})\.(\d+)/);
            if (m) return { yr: Number(m[3].slice(-4)), mo: Number(m[2]) };
            // "YYYY-MM-DD" or "M/D/YY"
            const iso = txt.match(/(\d{4})-(\d{1,2})-\d{1,2}/);
            if (iso) return { yr: Number(iso[1]), mo: Number(iso[2]) };
            return null;
          };
          let prevLabel = null;
          for (let c = 2; c < colCount; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c });
            const dec = decodeCell(ws[cellRef]);
            if (!dec) continue;
            let { yr, mo } = dec;
            // Year-typo correction: if ~12 months ahead of previous column, drop a year
            if (prevLabel) {
              const [py, pm] = prevLabel.split('-').map(Number);
              const diff = (yr - py) * 12 + (mo - pm);
              if (diff >= 10 && diff <= 14) yr -= 1;
            }
            const label = `${yr}-${String(mo).padStart(2, '0')}`;
            if (/^\d{4}-\d{2}$/.test(label)) {
              months.push({ col: c, label });
              prevLabel = label;
            }
          }

          // Build name→entries map from Excel
          const excelMap = {};
          for (let r = 1; r < raw.length; r++) {
            const row = raw[r];
            const name = (row[0]||'').trim();
            if (!name) continue;
            const entries = [];
            months.forEach(({col, label}) => {
              const v = row[col];
              if (v !== '' && v !== null && v !== undefined && !isNaN(Number(v))) {
                entries.push({month: label, ttr: Number(v)});
              }
            });
            if (entries.length > 0) excelMap[name] = entries;
          }

          // Match against app children (case-insensitive, trim whitespace)
          const norm = s => (s||'').trim().toLowerCase().replace(/\s+/g,' ');
          const toSpielerId = name => 'aktiv_' + name.trim().toLowerCase().replace(/\s+/g,'_');
          const excelNorm = {};
          Object.entries(excelMap).forEach(([k,v]) => { excelNorm[norm(k)] = {excelName:k, entries:v}; });
          const appChildren = Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend');
          const matches = [], unmatched = [];
          const matchedExcelNorms = new Set();
          appChildren.forEach(child => {
            const hit = excelNorm[norm(child.name)];
            if (hit) {
              matches.push({childId: child.id, appName: child.name, excelName: hit.excelName, entries: hit.entries});
              matchedExcelNorms.add(norm(hit.excelName));
            } else {
              unmatched.push(child.name);
            }
          });
          matches.sort((a,b)=>a.appName.localeCompare(b.appName,'de'));
          unmatched.sort((a,b)=>a.localeCompare(b,'de'));
          // Aktive: alle Excel-Einträge die NICHT zu Jugend-Kindern gehören
          const aktivMatches = Object.entries(excelMap)
            .filter(([name]) => !matchedExcelNorms.has(norm(name)))
            .map(([name, entries]) => ({id: toSpielerId(name), name, entries}))
            .sort((a,b)=>a.name.localeCompare(b.name,'de'));
          setTtrImportState({matches, unmatched, aktivMatches, total: Object.keys(excelMap).length, detectedMonths: months.map(m=>m.label)});
          setTtrImportDone(false);
        } catch(err) {
          alert('Fehler beim Lesen der Datei: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const doImport = (overwrite=false) => {
      if (!ttrImportState) return;
      const updated = {...ttrHistory};
      ttrImportState.matches.forEach(({childId, entries}) => {
        if (overwrite) {
          updated[childId] = {entries: [...entries].sort((a,b)=>a.month.localeCompare(b.month))};
        } else {
          const existing = updated[childId]?.entries || [];
          const existingMonths = new Set(existing.map(e=>e.month));
          const merged = [...existing, ...entries.filter(e=>!existingMonths.has(e.month))];
          merged.sort((a,b)=>a.month.localeCompare(b.month));
          updated[childId] = {entries: merged};
        }
      });
      const newAktiveSpieler = {...aktiveSpieler};
      (ttrImportState.aktivMatches||[]).forEach(({id, name, entries}) => {
        if (overwrite) {
          updated[id] = {entries: [...entries].sort((a,b)=>a.month.localeCompare(b.month))};
        } else {
          const existing = updated[id]?.entries || [];
          const existingMonths = new Set(existing.map(e=>e.month));
          const merged = [...existing, ...entries.filter(e=>!existingMonths.has(e.month))];
          merged.sort((a,b)=>a.month.localeCompare(b.month));
          updated[id] = {entries: merged};
        }
        const latestEntry = [...entries].sort((a,b)=>b.month.localeCompare(a.month))[0];
        newAktiveSpieler[id] = {id, name, ttr: latestEntry?.ttr||null, spielernr: newAktiveSpieler[id]?.spielernr||null};
      });
      saveTtrHistory(updated);
      saveAktiveSpieler(newAktiveSpieler);
      setTtrImportDone(true);
    };

    // Load XLSX lib on demand
    if (typeof window !== 'undefined' && !window._XLSX) {
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      s.onload = () => { window._XLSX = window.XLSX; };
      document.head.appendChild(s);
    }

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#6ee7b7')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📈 TTR-Import</h1>
        </div>
        <div style={{maxWidth:'820px',margin:'0 auto',padding:isMobile?'0 14px 40px':'0 24px 60px'}}>

          {/* Info */}
          <div style={{padding:'14px 16px',background:'rgba(110,231,183,0.05)',border:'1px solid rgba(110,231,183,0.15)',borderRadius:'14px',marginBottom:'24px'}}>
            <p style={{margin:'0 0 6px',fontWeight:'700',fontSize:'13px',color:accent}}>So funktioniert der Import</p>
            <p style={{margin:'0 0 4px',fontSize:'12px',color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>1. Excel-Datei „Spieler des Monats.xlsx" auswählen</p>
            <p style={{margin:'0 0 4px',fontSize:'12px',color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>2. App erkennt automatisch alle Kinder die in App <strong style={{color:'rgba(255,255,255,0.7)'}}>und</strong> Excel vorhanden sind</p>
            <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>3. Vorschau prüfen → Importieren</p>
          </div>

          {/* File Picker */}
          {!ttrImportState && (
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px',padding:'40px 24px',background:'rgba(255,255,255,0.03)',border:'2px dashed rgba(110,231,183,0.3)',borderRadius:'16px',cursor:'pointer',textAlign:'center'}}>
              <span style={{fontSize:'40px'}}>📂</span>
              <span style={{fontWeight:'700',fontSize:'15px',color:'white'}}>Excel-Datei auswählen</span>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>Spieler des Monats.xlsx</span>
              <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>{if(e.target.files[0]) parseExcel(e.target.files[0]);}}/>
            </label>
          )}

          {/* Preview */}
          {ttrImportState && !ttrImportDone && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
                <div>
                  <p style={{margin:'0 0 2px',fontWeight:'800',fontSize:'16px',color:'white'}}>
                    {ttrImportState.matches.length} Kinder erkannt
                  </p>
                  <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>
                    von {ttrImportState.total} Excel-Einträgen · Datei neu wählen?
                    <label style={{marginLeft:'6px',color:accent,cursor:'pointer',fontWeight:'700'}}>
                      Andere Datei<input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>{setTtrImportState(null);if(e.target.files[0])setTimeout(()=>parseExcel(e.target.files[0]),50);}}/>
                    </label>
                  </p>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px',alignItems:'flex-end'}}>
                  <button onClick={()=>doImport(false)}
                    style={{padding:'11px 20px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',fontSize:'13px',whiteSpace:'nowrap'}}>
                    ✓ Ergänzen
                  </button>
                  <button onClick={()=>doImport(true)}
                    style={{padding:'8px 20px',background:'rgba(239,68,68,0.15)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'12px',whiteSpace:'nowrap'}}>
                    ↺ Alle ersetzen
                  </button>
                </div>
              </div>

              {/* Diagnose: erkannte Monatsspalten */}
              <div style={{padding:'10px 14px',marginBottom:'16px',background:(ttrImportState.detectedMonths?.length||0)>2?'rgba(110,231,183,0.06)':'rgba(239,68,68,0.08)',border:`1px solid ${(ttrImportState.detectedMonths?.length||0)>2?'rgba(110,231,183,0.15)':'rgba(239,68,68,0.3)'}`,borderRadius:'10px'}}>
                <p style={{margin:'0 0 4px',fontSize:'11px',fontWeight:'700',color:(ttrImportState.detectedMonths?.length||0)>2?accent:'#f87171',textTransform:'uppercase'}}>
                  {ttrImportState.detectedMonths?.length||0} Monatsspalten erkannt
                </p>
                <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.5)',lineHeight:1.5,wordBreak:'break-word'}}>
                  {ttrImportState.detectedMonths?.join(' · ')||'—'}
                </p>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
                {ttrImportState.matches.map(m=>{
                  const first = m.entries[0]?.month;
                  const last  = m.entries[m.entries.length-1]?.month;
                  const lastTtr = m.entries[m.entries.length-1]?.ttr;
                  const firstTtr = m.entries[0]?.ttr;
                  const diff = lastTtr - firstTtr;
                  const nameDiffers = m.appName !== m.excelName;
                  return (
                    <div key={m.childId} style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(110,231,183,0.15)',borderRadius:'12px'}}>
                      <span style={{fontSize:'20px'}}>✅</span>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:'0 0 1px',fontWeight:'800',fontSize:'13px',color:'white'}}>{m.appName}</p>
                        {nameDiffers&&<p style={{margin:'0 0 2px',fontSize:'10px',color:'rgba(251,191,36,0.6)'}}>Excel: „{m.excelName}"</p>}
                        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
                          {m.entries.length} Monate · {first} bis {last}
                        </p>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <p style={{margin:'0 0 1px',fontWeight:'800',fontSize:'14px',color:'white'}}>{lastTtr}</p>
                        <p style={{margin:0,fontSize:'11px',color:diff>=0?'#4ade80':'#f87171',fontWeight:'700'}}>{diff>=0?'+':''}{diff}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {ttrImportState.aktivMatches?.length>0&&(
                <div style={{marginTop:'16px'}}>
                  <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'800',color:'#38bdf8'}}>
                    ⚡ {ttrImportState.aktivMatches.length} Aktive Spieler erkannt:
                  </p>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {ttrImportState.aktivMatches.map(m=>{
                      const latestEntry = [...m.entries].sort((a,b)=>b.month.localeCompare(a.month))[0];
                      return (
                        <div key={m.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:'10px'}}>
                          <span style={{fontSize:'16px'}}>⚡</span>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:0,fontWeight:'700',fontSize:'13px',color:'white'}}>{m.name}</p>
                            <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>{m.entries.length} Monate</p>
                          </div>
                          {latestEntry&&<p style={{margin:0,fontWeight:'800',fontSize:'14px',color:'#38bdf8'}}>{latestEntry.ttr}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ttrImportState.unmatched?.length>0&&(
                <div style={{marginTop:'12px',padding:'14px 16px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:'12px'}}>
                  <p style={{margin:'0 0 8px',fontSize:'12px',fontWeight:'800',color:'#f87171'}}>
                    ⚠️ {ttrImportState.unmatched.length} App-Kinder ohne Excel-Treffer (Name prüfen):
                  </p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {ttrImportState.unmatched.map(n=>(
                      <span key={n} style={{fontSize:'11px',color:'rgba(248,113,113,0.8)',background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:'6px',padding:'2px 8px'}}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Erfolg */}
          {ttrImportDone && (
            <div style={{textAlign:'center',padding:'40px 24px'}}>
              <p style={{fontSize:'48px',margin:'0 0 16px'}}>🎉</p>
              <p style={{margin:'0 0 8px',fontWeight:'800',fontSize:'20px',color:'#4ade80'}}>Import erfolgreich!</p>
              <p style={{margin:'0 0 28px',fontSize:'13px',color:'rgba(255,255,255,0.45)'}}>
                {ttrImportState?.matches.length} Jugend-Kinder · {ttrImportState?.aktivMatches?.length||0} Aktive · TTR-Verlauf gespeichert
              </p>
              <button onClick={()=>{setTtrImportState(null);setTtrImportDone(false);}} style={{padding:'12px 28px',background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.3)',borderRadius:'12px',color:'#4ade80',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>
                Weiterer Import / Manuelle Eingabe ↓
              </button>
            </div>
          )}

          {/* Kinder ohne TTR-Daten */}
          {(()=>{
            const allCh = Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
            const noTtr = allCh.filter(c=>!ttrHistory[c.id]?.entries?.length);
            if(noTtr.length===0) return null;
            return(
            <div style={{marginTop:'32px',padding:'16px',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:'14px'}}>
              <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'800',color:'#fbbf24'}}>
                📋 {noTtr.length} Kinder noch ohne TTR-Daten
              </p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {noTtr.map(c=>(
                  <span key={c.id} style={{fontSize:'12px',color:'rgba(251,191,36,0.7)',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:'8px',padding:'3px 10px'}}>{c.name}</span>
                ))}
              </div>
            </div>
          );})()}

          {/* Manuelle Monatseingabe */}
          {(()=>{
            const allCh = Object.values(children).filter(c=>subgroups[c.subgroupId]?.groupId==='jugend').sort((a,b)=>a.name.localeCompare(b.name,'de'));
            const doManual = () => {
              const ttr = parseInt(ttrManTtr,10);
              if(!ttrManChild||!ttrManMonth||isNaN(ttr)||ttr<100||ttr>3000) return;
              const existing = ttrHistory[ttrManChild]?.entries||[];
              const withoutMonth = existing.filter(e=>e.month!==ttrManMonth);
              const merged = [...withoutMonth, {month:ttrManMonth, ttr}].sort((a,b)=>a.month.localeCompare(b.month));
              saveTtrHistory({...ttrHistory, [ttrManChild]:{entries:merged}});
              setTtrManTtr(''); setTtrManSaved(true); setTimeout(()=>setTtrManSaved(false),2500);
            };
            return(
            <div style={{marginTop:'32px',paddingTop:'28px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <p style={{margin:'0 0 4px',fontSize:'14px',fontWeight:'800',color:'white'}}>✏️ Manuelle Monatseingabe</p>
              <p style={{margin:'0 0 18px',fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>Einzelne TTR-Werte nachträglich eintragen oder korrigieren.</p>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'2fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
                <div>
                  <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>Kind</p>
                  <select value={ttrManChild} onChange={e=>setTtrManChild(e.target.value)} className="dark-select"
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(110,231,183,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none'}}>
                    <option value="">— Kind wählen —</option>
                    {allCh.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>Monat</p>
                  <input type="month" value={ttrManMonth} onChange={e=>setTtrManMonth(e.target.value)}
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(110,231,183,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box',colorScheme:'dark'}}/>
                </div>
                <div>
                  <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>TTR-Wert</p>
                  <input type="number" min="100" max="3000" placeholder="z.B. 1050" value={ttrManTtr} onChange={e=>setTtrManTtr(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&doManual()}
                    style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(110,231,183,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <p style={{margin:'0 0 5px',fontSize:'11px',fontWeight:'700',color:'transparent',textTransform:'uppercase'}}>-</p>
                  <button onClick={doManual} disabled={!ttrManChild||!ttrManMonth||!ttrManTtr}
                    style={{padding:'10px 18px',background:ttrManSaved?'rgba(74,222,128,0.2)':'linear-gradient(135deg,#16a34a,#15803d)',color:ttrManSaved?'#4ade80':'white',border:ttrManSaved?'1px solid rgba(74,222,128,0.4)':'none',borderRadius:'10px',cursor:'pointer',fontWeight:'800',fontSize:'14px',whiteSpace:'nowrap',opacity:!ttrManChild||!ttrManMonth||!ttrManTtr?0.4:1}}>
                    {ttrManSaved?'✓ Gespeichert':'Speichern'}
                  </button>
                </div>
              </div>
              {ttrManChild&&ttrHistory[ttrManChild]?.entries?.length>0&&(
                <div style={{marginTop:'14px',padding:'10px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px'}}>
                  <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Vorhandene Einträge</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>
                    {ttrHistory[ttrManChild].entries.map(e=>(
                      <span key={e.month} style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.05)',borderRadius:'6px',padding:'2px 7px'}}>{e.month}: <strong style={{color:'#fbbf24'}}>{e.ttr}</strong></span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );})()}
        </div>
      </div>
    );
  }

  // ── GEGNERLOGBUCH VIEW (Admin-Direktzugang) ─────────────────────────────
  if (view === 'gegnerlogbuch') {
    const accentColor = '#0891b2';
    const accentBorder= 'rgba(8,145,178,0.2)';
    const accentBg    = 'rgba(8,145,178,0.08)';

    const submitGegnerAdmin = () => {
      if (!gegnerForm.verein.trim() || !gegnerForm.date) return;
      const entry = {
        id: 'gl_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        date: gegnerForm.date,
        verein: gegnerForm.verein.trim(),
        gegner: gegnerForm.gegner.trim(),
        taktik: gegnerForm.taktik.trim(),
        createdBy: userProfile?.name || user?.email || 'Admin',
        createdAt: new Date().toISOString(),
      };
      if (gegnerEditId) {
        saveGegnerLogbuch(gegnerLogbuch.map(e=>e.id===gegnerEditId?{...e,...entry,id:gegnerEditId}:e));
        setGegnerEditId(null);
      } else {
        saveGegnerLogbuch([entry, ...gegnerLogbuch]);
      }
      setGegnerForm({date:'',verein:'',gegner:'',taktik:''});
      setGegnerAdding(false);
    };

    const deleteGegnerAdmin = id => { if(!window.confirm('Eintrag löschen?'))return; saveGegnerLogbuch(gegnerLogbuch.filter(e=>e.id!==id)); };

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0c1a2e 0%,#0e2a3a 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#0891b2')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>🎯 Gegnerlogbuch</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'820px',margin:'0 auto'}}>
          <p style={{margin:'0 0 14px',fontSize:'13px',color:'rgba(255,255,255,0.35)'}}>Kollaborative Taktikdatenbank aller Aktiven · {gegnerLogbuch.length} {gegnerLogbuch.length===1?'Eintrag':'Einträge'}</p>

          {/* Neuer Eintrag Button */}
          {!gegnerAdding&&<button onClick={()=>{setGegnerAdding(true);setGegnerEditId(null);setGegnerForm({date:TODAY,verein:'',gegner:'',taktik:''}); }}
            style={{width:'100%',padding:'12px',background:`linear-gradient(135deg,${accentColor},#0e7490)`,color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',marginBottom:'14px'}}>
            <Plus size={16}/> Neuer Eintrag
          </button>}

          {gegnerAdding&&(
            <div style={{background:accentBg,border:`1px solid ${accentBorder}`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
              <p style={{margin:'0 0 12px',fontSize:'12px',fontWeight:'800',color:accentColor,textTransform:'uppercase',letterSpacing:'0.5px'}}>{gegnerEditId?'Eintrag bearbeiten':'Neuer Eintrag'}</p>
              <div style={{display:'grid',gap:'10px'}}>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Datum</label>
                    <input type="date" value={gegnerForm.date} onChange={e=>setGegnerForm(f=>({...f,date:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Verein des Gegners</label>
                    <input type="text" placeholder="z.B. TTC Musterstadt" value={gegnerForm.verein} onChange={e=>setGegnerForm(f=>({...f,verein:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Name des Gegners</label>
                    <input type="text" placeholder="z.B. Max Mustermann" value={gegnerForm.gegner} onChange={e=>setGegnerForm(f=>({...f,gegner:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                    {!gegnerEditId&&gegnerForm.gegner.trim()&&gegnerLogbuch.some(x=>x.gegner?.toLowerCase()===gegnerForm.gegner.trim().toLowerCase())&&(
                      <p style={{margin:'5px 0 0',fontSize:'11px',color:'#fbbf24',fontWeight:'600'}}>⚠️ Dieser Gegner ist bereits im Logbuch eingetragen.</p>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Taktikhinweise</label>
                  <textarea placeholder="Wie spielt der Gegner? Was hat funktioniert?" value={gegnerForm.taktik} onChange={e=>setGegnerForm(f=>({...f,taktik:e.target.value}))}
                    rows={4} style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}/>
                </div>
                <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                  <button onClick={()=>{setGegnerAdding(false);setGegnerEditId(null);setGegnerForm({date:'',verein:'',gegner:'',taktik:''}); }}
                    style={{padding:'9px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
                  <button onClick={submitGegnerAdmin} disabled={!gegnerForm.verein.trim()||!gegnerForm.date}
                    style={{padding:'9px 20px',background:gegnerForm.verein.trim()&&gegnerForm.date?`linear-gradient(135deg,${accentColor},#0e7490)`:'rgba(255,255,255,0.1)',color:'white',border:'none',borderRadius:'10px',cursor:gegnerForm.verein.trim()&&gegnerForm.date?'pointer':'not-allowed',fontWeight:'700',fontSize:'13px',opacity:gegnerForm.verein.trim()&&gegnerForm.date?1:0.5}}>
                    {gegnerEditId?'Speichern':'Eintrag speichern'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {gegnerLogbuch.length>0&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',opacity:0.4}}>🔍</span>
                <input type="text" placeholder="Nach Spieler suchen..." value={gegnerSearchPlayer} onChange={e=>setGegnerSearchPlayer(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',paddingLeft:'32px',paddingRight:'10px',paddingTop:'9px',paddingBottom:'9px',background:'rgba(255,255,255,0.05)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none'}}/>
              </div>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',opacity:0.4}}>🏓</span>
                <input type="text" placeholder="Nach Verein suchen..." value={gegnerSearchVerein} onChange={e=>setGegnerSearchVerein(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',paddingLeft:'32px',paddingRight:'10px',paddingTop:'9px',paddingBottom:'9px',background:'rgba(255,255,255,0.05)',border:`1px solid ${accentBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none'}}/>
              </div>
            </div>
          )}

          {gegnerLogbuch.length===0&&!gegnerAdding?(
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>📋</div>
              <p style={{margin:0,fontWeight:'600',fontSize:'16px'}}>Noch keine Einträge</p>
              <p style={{margin:'6px 0 0',fontSize:'13px'}}>Füge den ersten Gegner hinzu!</p>
            </div>
          ):(
            <div style={{display:'grid',gap:'6px'}}>
              {[...gegnerLogbuch].sort((a,b)=>(a.gegner||a.verein||'').localeCompare(b.gegner||b.verein||'','de')).filter(e=>e.id!==gegnerEditId&&(!gegnerSearchPlayer||e.gegner?.toLowerCase().includes(gegnerSearchPlayer.toLowerCase()))&&(!gegnerSearchVerein||e.verein?.toLowerCase().includes(gegnerSearchVerein.toLowerCase()))).map(e=>{
                const expandedA = gegnerExpandedId===e.id;
                const dateStrGA = e.date?new Date(e.date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
                const meIdA = userProfile?.name||user?.email;
                return (
                  <div key={e.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${expandedA?accentBorder:'rgba(255,255,255,0.07)'}`,borderRadius:'12px',overflow:'hidden'}}>
                    <button onClick={()=>setGegnerExpandedId(expandedA?null:e.id)}
                      style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',background:'none',border:'none',cursor:'pointer',gap:'10px'}}>
                      <span style={{fontWeight:'700',color:'white',fontSize:'14px',textAlign:'left'}}>{e.gegner||e.verein||'—'}</span>
                      <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',display:'inline-block',transform:expandedA?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>▼</span>
                    </button>
                    {expandedA&&(
                      <div style={{padding:'0 16px 14px'}}>
                        <p style={{margin:'0 0 10px',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>
                          {[e.verein,dateStrGA,e.createdBy].filter(Boolean).join(' · ')}
                        </p>
                        {e.taktik&&(
                          <div style={{background:accentBg,border:`1px solid ${accentBorder}`,borderRadius:'10px',padding:'10px 12px',marginBottom:'10px'}}>
                            <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'800',color:accentColor,textTransform:'uppercase',letterSpacing:'0.5px'}}>Taktikhinweise</p>
                            <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.75)',lineHeight:'1.6',whiteSpace:'pre-wrap'}}>{e.taktik}</p>
                          </div>
                        )}
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          <button onClick={()=>{setGegnerEditId(e.id);setGegnerForm({date:e.date,verein:e.verein,gegner:e.gegner||'',taktik:e.taktik||''});setGegnerAdding(true);setGegnerExpandedId(null);}}
                            style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',borderRadius:'8px',background:accentBg,border:`1px solid ${accentBorder}`,color:'#67e8f9',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
                            <Pencil size={11}/> Bearbeiten
                          </button>
                          <button onClick={()=>deleteGegnerAdmin(e.id)}
                            style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',borderRadius:'8px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
                            <Trash2 size={11}/> Löschen
                          </button>
                          <button onClick={()=>{setGegnerWeitereId(gegnerWeitereId===e.id?null:e.id);setGegnerWeitereText('');}}
                            style={{padding:'6px 12px',borderRadius:'8px',background:accentBg,border:`1px solid ${accentBorder}`,color:'#67e8f9',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
                            + Taktikhinweise
                          </button>
                        </div>
                        {gegnerWeitereId===e.id&&(
                          <div style={{marginTop:'10px'}}>
                            <textarea value={gegnerWeitereText} onChange={ev=>setGegnerWeitereText(ev.target.value)} placeholder="Weitere Taktikhinweise..."
                              style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',border:`1px solid ${accentBorder}`,borderRadius:'8px',padding:'8px 10px',color:'white',fontSize:'13px',resize:'vertical',minHeight:'70px',outline:'none'}}/>
                            <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                              <button onClick={()=>{
                                if(!gegnerWeitereText.trim())return;
                                const note=`\n\n[${meIdA}]: ${gegnerWeitereText.trim()}`;
                                saveGegnerLogbuch(gegnerLogbuch.map(x=>x.id===e.id?{...x,taktik:(x.taktik||'')+note}:x));
                                setGegnerWeitereId(null);setGegnerWeitereText('');
                              }} disabled={!gegnerWeitereText.trim()}
                                style={{flex:1,padding:'6px',borderRadius:'7px',background:accentColor,border:'none',color:'white',fontSize:'12px',fontWeight:'700',cursor:'pointer',opacity:gegnerWeitereText.trim()?1:0.5}}>
                                Speichern
                              </button>
                              <button onClick={()=>{setGegnerWeitereId(null);setGegnerWeitereText('');}}
                                style={{padding:'6px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)',fontSize:'12px',cursor:'pointer'}}>
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TTC NEWS VIEW ─────────────────────────────────────────────────────────
  if (view === 'ttcnews') {
    const isAktiver = userRole === 'aktiver';
    const accentColor = isAktiver ? '#0891b2' : '#4ade80';
    const accentBorder = isAktiver ? 'rgba(8,145,178,0.2)' : 'rgba(74,222,128,0.2)';
    const accentBg = isAktiver ? 'rgba(8,145,178,0.08)' : 'rgba(74,222,128,0.06)';
    const bgGrad = isAktiver ? 'linear-gradient(135deg,#0c1a2e 0%,#0e2a3a 100%)' : 'linear-gradient(135deg,#0a1628 0%,#0d1f12 100%)';
    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:bgGrad,fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>navTo('home')} style={{padding:'8px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'9px',color:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:'600'}}><Home size={15}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>📰 TTC News</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'760px',margin:'0 auto'}}>
          <p style={{margin:'0 0 20px',fontSize:'13px',color:'rgba(255,255,255,0.35)'}}>Aktuelle Beiträge von ttc-staffel.de</p>
          {ttcNewsLoading?(
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.3)'}}>
              <div style={{fontSize:'36px',marginBottom:'12px'}}>⏳</div>
              <p style={{margin:0}}>Nachrichten werden geladen…</p>
            </div>
          ):ttcNews.length===0?(
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
              <div style={{fontSize:'36px',marginBottom:'12px'}}>📭</div>
              <p style={{margin:0,fontWeight:'600'}}>Keine Nachrichten verfügbar</p>
            </div>
          ):(
            <div style={{display:'grid',gap:'14px'}}>
              {ttcNews.map((item,i)=>{
                const pubDate = item.date ? new Date(item.date).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
                return (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                    style={{display:'block',background:'rgba(255,255,255,0.04)',border:`1px solid ${accentBorder}`,borderRadius:'16px',padding:'20px',textDecoration:'none',color:'inherit',transition:'transform 0.15s,border-color 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=accentColor;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor=accentBorder;}}>
                    <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.35)',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>{pubDate}</p>
                    <h3 style={{margin:'0 0 10px',color:'white',fontSize:'16px',fontWeight:'800',lineHeight:'1.3'}}>{item.title}</h3>
                    {item.desc&&<p style={{margin:'0 0 12px',fontSize:'13px',color:'rgba(255,255,255,0.55)',lineHeight:'1.6'}}>{item.desc}{item.desc.length>=200?'…':''}</p>}
                    <span style={{fontSize:'12px',color:accentColor,fontWeight:'700'}}>Weiterlesen →</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TRAININGSMATCHES VIEW ─────────────────────────────────────────────────
  if (view === 'trainingsmatches') {
    const isAdmin = userRole === 'admin';
    const ac = '#f472b6';
    const acBorder = 'rgba(244,114,182,0.2)';
    const acBg = 'rgba(244,114,182,0.07)';
    const linkedPlayer = userProfile?.linkedPlayerId ? aktiveSpieler[userProfile.linkedPlayerId] : null;
    const me = linkedPlayer?.name || userProfile?.name || user?.email || '';

    // ── AUSWAHLSCREEN ───────────────────────────────────────────────────────
    if (!tmMode) {
      return (
        <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a0a1e 0%,#0d0a1f 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
          <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>navTo('home')} style={s.btn('#f472b6')}><Home size={16}/></button>
            <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>⚔️ Trainingsmatches</h1>
          </div>
          <div style={{padding:'40px 20px',maxWidth:'500px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'16px'}}>
            <p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:'13px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1.5px',margin:'0 0 8px'}}>Spielmodus wählen</p>
            <button onClick={()=>setTmMode('single')}
              style={{padding:'28px 20px',background:'rgba(244,114,182,0.08)',border:'2px solid rgba(244,114,182,0.3)',borderRadius:'20px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'20px',transition:'transform 0.12s'}}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
              <span style={{fontSize:'48px',lineHeight:1,flexShrink:0}}>🏓</span>
              <div>
                <p style={{margin:'0 0 4px',fontWeight:'800',color:'white',fontSize:'20px'}}>Einzel</p>
                <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)',lineHeight:'1.4'}}>1 gegen 1 · Allzeittabelle & Verlauf</p>
              </div>
            </button>
            <button onClick={()=>setTmMode('double')}
              style={{padding:'28px 20px',background:'rgba(99,102,241,0.08)',border:'2px solid rgba(99,102,241,0.3)',borderRadius:'20px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'20px',transition:'transform 0.12s'}}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
              <span style={{fontSize:'48px',lineHeight:1,flexShrink:0}}>👥</span>
              <div>
                <p style={{margin:'0 0 4px',fontWeight:'800',color:'#a5b4fc',fontSize:'20px'}}>Doppel</p>
                <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)',lineHeight:'1.4'}}>2 gegen 2 · Paarungstabelle & Spielertabelle</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // ── DOPPEL-VIEW ─────────────────────────────────────────────────────────
    if (tmMode === 'double') {
      const dac = '#818cf8'; // indigo accent
      const dacBorder = 'rgba(129,140,248,0.25)';
      const dacBg = 'rgba(129,140,248,0.07)';
      const saveDoppel = matches => { setTrainingsdoppel(matches); setDoc(doc(db,'ttc','trainingsdoppel'),{matches}); };

      // Spielerliste (alle aktiven + bisherige Doppelspiele-Namen)
      const doppelNames = new Set(trainingsdoppel.flatMap(m=>[m.playerA,m.playerB,m.playerC,m.playerD]).filter(Boolean));
      const aktiveSpielerNames2 = new Set(Object.values(aktiveSpieler).map(sp=>sp.name).filter(Boolean));
      const allPlayers = [...new Set([...aktiveSpielerNames2,...doppelNames])].sort((a,b)=>a.localeCompare(b,'de'));

      const submitDoppel = () => {
        const {playerA,playerB,playerC,playerD,result,date} = tmDoppelForm;
        if (!playerA||!playerB||!playerC||!playerD||!result) return;
        if (new Set([playerA,playerB,playerC,playerD]).size < 4) return; // no duplicates
        const [s1,s2] = result.split(':').map(Number);
        const entry = {
          id:'td_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
          date: date||TODAY,
          playerA, playerB, playerC, playerD,
          score1: s1, score2: s2,
          createdBy: me,
          createdAt: new Date().toISOString(),
        };
        saveDoppel([entry, ...trainingsdoppel]);
        setTmDoppelAdding(false);
        setTmDoppelForm({playerA:'',playerB:'',playerC:'',playerD:'',result:'3:0',date:''});
      };

      // ── Paarungstabelle ──
      const pairingStats = {};
      trainingsdoppel.forEach(m => {
        const t1won = m.score1 > m.score2;
        [[m.playerA,m.playerB,t1won],[m.playerC,m.playerD,!t1won]].forEach(([pX,pY,won]) => {
          const key = [pX,pY].sort().join('|||');
          if (!pairingStats[key]) pairingStats[key] = {name:`${[pX,pY].sort()[0]} & ${[pX,pY].sort()[1]}`,matches:0,wins:0,losses:0};
          pairingStats[key].matches++;
          if (won) pairingStats[key].wins++; else pairingStats[key].losses++;
        });
      });
      const pairingTable = Object.values(pairingStats)
        .map(r=>({...r,winrate:r.matches>0?r.wins/r.matches:0}))
        .sort((a,b)=>b.winrate-a.winrate||b.wins-a.wins);

      // ── Spielertabelle ──
      const playerStats = {};
      trainingsdoppel.forEach(m => {
        const t1won = m.score1 > m.score2;
        [[m.playerA,t1won],[m.playerB,t1won],[m.playerC,!t1won],[m.playerD,!t1won]].forEach(([p,won]) => {
          if (!p) return;
          if (!playerStats[p]) playerStats[p] = {name:p,matches:0,wins:0,losses:0};
          playerStats[p].matches++;
          if (won) playerStats[p].wins++; else playerStats[p].losses++;
        });
      });
      const playerTable = Object.values(playerStats)
        .map(r=>({...r,winrate:r.matches>0?r.wins/r.matches:0}))
        .sort((a,b)=>b.winrate-a.winrate||b.wins-a.wins);

      const resultOptions = ['3:0','3:1','3:2','2:3','1:3','0:3'];
      const PlayerSelect = ({label,field,exclude=[]}) => (
        <div>
          <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase'}}>{label}</label>
          <select value={tmDoppelForm[field]} onChange={e=>setTmDoppelForm(f=>({...f,[field]:e.target.value}))}
            style={{width:'100%',padding:'9px 12px',background:'#1a0a1e',border:`1px solid ${tmDoppelForm[field]?dac:dacBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}>
            <option value="">Spieler wählen…</option>
            {allPlayers.filter(p=>!exclude.includes(p)).map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      );

      const TableGrid = ({data, cols}) => (
        <div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${dacBorder}`,borderRadius:'14px',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:cols,gap:'4px',padding:'8px 14px',borderBottom:`1px solid ${dacBorder}`,fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>
            <span>#</span><span>Name</span><span style={{textAlign:'center'}}>M</span><span style={{textAlign:'center'}}>S</span><span style={{textAlign:'center'}}>N</span><span style={{textAlign:'right'}}>Quote</span>
          </div>
          {data.length===0
            ? <div style={{padding:'24px',textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.2)'}}>Noch keine Daten</div>
            : data.map((row,i)=>(
              <div key={row.name} style={{display:'grid',gridTemplateColumns:cols,gap:'4px',padding:'10px 14px',borderBottom:i<data.length-1?'1px solid rgba(255,255,255,0.04)':'none',alignItems:'center'}}>
                <span style={{fontSize:'12px',fontWeight:'800',color:i===0?'#fbbf24':i===1?'rgba(255,255,255,0.5)':i===2?'#cd7c32':'rgba(255,255,255,0.25)'}}>{i+1}</span>
                <span style={{fontSize:'13px',fontWeight:'700',color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.name}</span>
                <span style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{row.matches}</span>
                <span style={{textAlign:'center',fontSize:'13px',color:'#86efac',fontWeight:'700'}}>{row.wins}</span>
                <span style={{textAlign:'center',fontSize:'13px',color:'#fca5a5'}}>{row.losses}</span>
                <span style={{textAlign:'right',fontSize:'13px',fontWeight:'800',color:dac}}>{Math.round(row.winrate*100)}%</span>
              </div>
            ))
          }
        </div>
      );

      return (
        <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a1e 0%,#0d0a1f 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
          <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
            <button onClick={()=>setTmMode(null)} style={s.btn('#818cf8')}><ArrowLeft size={16}/></button>
            <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>👥 Doppelmatches</h1>
          </div>
          <div style={{padding:'20px',maxWidth:'820px',margin:'0 auto'}}>

            {/* Neues Doppelmatch Button */}
            {!tmDoppelAdding&&<button onClick={()=>setTmDoppelAdding(true)}
              style={{width:'100%',padding:'11px',background:`linear-gradient(135deg,${dac},#6366f1)`,border:'none',borderRadius:'12px',color:'white',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',marginBottom:'20px'}}>
              <Plus size={16}/> Neues Doppelmatch
            </button>}

            {/* Formular */}
            {tmDoppelAdding&&(
              <div style={{background:dacBg,border:`1px solid ${dacBorder}`,borderRadius:'16px',padding:'18px',marginBottom:'20px'}}>
                <p style={{margin:'0 0 14px',fontSize:'12px',fontWeight:'800',color:dac,textTransform:'uppercase',letterSpacing:'0.5px'}}>Neues Doppelmatch</p>
                <div style={{display:'grid',gap:'10px'}}>
                  <p style={{margin:0,fontSize:'12px',fontWeight:'700',color:'rgba(255,255,255,0.5)'}}>🔵 Team 1</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <PlayerSelect label="Spieler A" field="playerA" exclude={[tmDoppelForm.playerB,tmDoppelForm.playerC,tmDoppelForm.playerD].filter(Boolean)}/>
                    <PlayerSelect label="Spieler B" field="playerB" exclude={[tmDoppelForm.playerA,tmDoppelForm.playerC,tmDoppelForm.playerD].filter(Boolean)}/>
                  </div>
                  <p style={{margin:0,fontSize:'12px',fontWeight:'700',color:'rgba(255,255,255,0.5)'}}>🔴 Team 2</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <PlayerSelect label="Spieler C" field="playerC" exclude={[tmDoppelForm.playerA,tmDoppelForm.playerB,tmDoppelForm.playerD].filter(Boolean)}/>
                    <PlayerSelect label="Spieler D" field="playerD" exclude={[tmDoppelForm.playerA,tmDoppelForm.playerB,tmDoppelForm.playerC].filter(Boolean)}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div>
                      <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase'}}>Ergebnis (Sätze)</label>
                      <select value={tmDoppelForm.result} onChange={e=>setTmDoppelForm(f=>({...f,result:e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',background:'#1a0a1e',border:`1px solid ${dacBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}>
                        {resultOptions.map(r=>{const[a,b]=r.split(':');return<option key={r} value={r}>Team 1 {a}:{b} Team 2</option>;})}
                      </select>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase'}}>Datum</label>
                      <input type="date" value={tmDoppelForm.date||TODAY} onChange={e=>setTmDoppelForm(f=>({...f,date:e.target.value}))}
                        style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${dacBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                    <button onClick={()=>{setTmDoppelAdding(false);setTmDoppelForm({playerA:'',playerB:'',playerC:'',playerD:'',result:'3:0',date:''});}}
                      style={{padding:'9px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
                    <button onClick={submitDoppel}
                      disabled={!tmDoppelForm.playerA||!tmDoppelForm.playerB||!tmDoppelForm.playerC||!tmDoppelForm.playerD||new Set([tmDoppelForm.playerA,tmDoppelForm.playerB,tmDoppelForm.playerC,tmDoppelForm.playerD]).size<4}
                      style={{padding:'9px 20px',background:`linear-gradient(135deg,${dac},#6366f1)`,color:'white',border:'none',borderRadius:'10px',fontWeight:'700',fontSize:'13px',cursor:'pointer',opacity:(!tmDoppelForm.playerA||!tmDoppelForm.playerB||!tmDoppelForm.playerC||!tmDoppelForm.playerD)?0.4:1}}>
                      Match speichern
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paarungstabelle */}
            <div style={{marginBottom:'24px'}}>
              <h2 style={{margin:'0 0 12px',fontSize:'16px',fontWeight:'800',color:'white'}}>🤝 Beste Doppel (Paarungen)</h2>
              <TableGrid data={pairingTable} cols="28px 1fr 50px 50px 50px 56px"/>
            </div>

            {/* Spielertabelle */}
            <div style={{marginBottom:'24px'}}>
              <h2 style={{margin:'0 0 12px',fontSize:'16px',fontWeight:'800',color:'white'}}>🏆 Beste Doppelspieler</h2>
              <TableGrid data={playerTable} cols="28px 1fr 50px 50px 50px 56px"/>
            </div>

            {/* Verlauf */}
            <h2 style={{margin:'0 0 12px',fontSize:'16px',fontWeight:'800',color:'white'}}>📋 Abgeschlossene Doppelmatches</h2>
            {trainingsdoppel.length===0
              ? <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Noch keine Doppelmatches</div>
              : <div style={{display:'grid',gap:'8px'}}>
                  {trainingsdoppel.map(m=>{
                    const d=m.date?new Date(m.date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
                    const t1won=m.score1>m.score2;
                    const isEditing=tmDoppelEditId===m.id;
                    if(isEditing) return (
                      <div key={m.id} style={{background:dacBg,border:`1px solid ${dacBorder}`,borderRadius:'12px',padding:'12px 14px'}}>
                        <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:dac,textTransform:'uppercase'}}>Match bearbeiten</p>
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                          <select defaultValue={`${m.score1}:${m.score2}`} id={`dscore-${m.id}`}
                            style={{padding:'8px 10px',background:'#1a0a1e',border:`1px solid ${dacBorder}`,borderRadius:'8px',color:'white',fontSize:'14px'}}>
                            {resultOptions.map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                          <input type="date" defaultValue={m.date||''} id={`ddate-${m.id}`}
                            style={{padding:'8px 10px',background:'rgba(255,255,255,0.07)',border:`1px solid ${dacBorder}`,borderRadius:'8px',color:'white',fontSize:'13px'}}/>
                          <button onClick={()=>{
                            const se=document.getElementById(`dscore-${m.id}`);
                            const de=document.getElementById(`ddate-${m.id}`);
                            const[ns1,ns2]=(se?.value||`${m.score1}:${m.score2}`).split(':').map(Number);
                            saveDoppel(trainingsdoppel.map(x=>x.id===m.id?{...x,score1:ns1,score2:ns2,date:de?.value||m.date}:x));
                            setTmDoppelEditId(null);
                          }} style={{padding:'8px 14px',background:`linear-gradient(135deg,${dac},#6366f1)`,border:'none',borderRadius:'8px',color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>Speichern</button>
                          <button onClick={()=>setTmDoppelEditId(null)} style={{padding:'8px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Abbrechen</button>
                        </div>
                      </div>
                    );
                    return (
                      <div key={m.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${dacBorder}`,borderRadius:'12px',padding:'12px 14px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
                            <span style={{fontWeight:'700',color:t1won?'#86efac':'rgba(255,255,255,0.6)',fontSize:'13px'}}>{m.playerA} & {m.playerB}</span>
                            <span style={{fontWeight:'900',fontSize:'15px',color:'white'}}>{m.score1}:{m.score2}</span>
                            <span style={{fontWeight:'700',color:!t1won?'#86efac':'rgba(255,255,255,0.6)',fontSize:'13px'}}>{m.playerC} & {m.playerD}</span>
                          </div>
                          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{d}</div>
                        </div>
                        {isAdmin&&<button onClick={()=>setTmDoppelEditId(m.id)}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:dacBg,border:`1px solid ${dacBorder}`,color:dac,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Pencil size={12}/></button>}
                        {isAdmin&&<button onClick={()=>{if(!window.confirm('Match löschen?'))return;saveDoppel(trainingsdoppel.filter(x=>x.id!==m.id));}}
                          style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Trash2 size={12}/></button>}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </div>
      );
    }

    // Player list: alle aktiven Spieler (aus aktiveSpieler DB) + Match-Namen
    const aktiveSpielerNames = new Set(Object.values(aktiveSpieler).map(sp=>sp.name).filter(Boolean));
    const matchNames = new Set(trainingsmatches.flatMap(m=>[m.player1,m.player2]).filter(Boolean));
    const registeredPlayers = [...new Set([...aktiveSpielerNames,...matchNames])]
      .filter(name=>name!==me)
      .sort((a,b)=>a.localeCompare(b,'de'));

    const tmSuggestions = tmSearch.trim().length>0
      ? registeredPlayers.filter(p=>p.toLowerCase().includes(tmSearch.toLowerCase()))
      : registeredPlayers;

    const saveMatches = matches => { setTrainingsmatches(matches); setDoc(doc(db,'ttc','trainingsmatches'),{matches}); };

    const submitMatch = () => {
      const opponent = tmForm.useCustom ? tmForm.opponentCustom.trim() : (tmForm.opponent || tmSearch.trim());
      const p1 = tmForm.otherMatch ? (tmForm.player1 || tmSearch2.trim()) : me;
      if (!opponent || !p1 || !tmForm.result) return;
      const [s1,s2] = tmForm.result.split(':').map(Number);
      const entry = {
        id:'tm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        date: tmForm.date || TODAY,
        player1: p1,
        player2: opponent,
        score1: s1,
        score2: s2,
        vorgabe: tmForm.vorgabe && tmForm.vorgabePlayer ? {player: tmForm.vorgabePlayer, points: tmForm.vorgabePoints} : null,
        createdBy: me,
        createdAt: new Date().toISOString(),
      };
      saveMatches([entry, ...trainingsmatches]);
      setTmAdding(false);
      setTmSearch(''); setTmSearch2('');
      setTmForm({opponent:'',opponentCustom:'',useCustom:false,player1:'',result:'3:0',vorgabe:false,vorgabePlayer:'',vorgabePoints:1,date:'',otherMatch:false});
    };

    // Build allzeit table (Vorgabe-Matches ausgeschlossen)
    const stats = {};
    trainingsmatches.filter(m=>!m.vorgabe).forEach(m => {
      [m.player1, m.player2].forEach((p,i) => {
        if (!stats[p]) stats[p] = {name:p, matches:0, wins:0, losses:0};
        stats[p].matches++;
        const won = i===0 ? m.score1>m.score2 : m.score2>m.score1;
        if (won) stats[p].wins++; else stats[p].losses++;
      });
    });
    const tableData = Object.values(stats).map(s=>({...s, winrate:s.matches>0?s.wins/s.matches:0}))
      .sort((a,b) => tmSort==='matches' ? b.matches-a.matches : tmSort==='wins' ? b.wins-a.wins : b.winrate-a.winrate);

    const resultOptions = ['3:0','3:1','3:2','2:3','1:3','0:3'];
    const vorgabeTarget = tmForm.useCustom ? (tmForm.opponentCustom.trim()||'Gegner') : (tmForm.opponent||'Gegner');

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a0a1e 0%,#0d0a1f 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setTmMode(null)} style={s.btn('#f472b6')}><ArrowLeft size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>🏓 Einzel-Matches</h1>
          {linkedPlayer&&<span style={{fontSize:'12px',color:'#f9a8d4',fontWeight:'600'}}>⚡ {linkedPlayer.name}</span>}
        </div>

        <div style={{padding:'20px',maxWidth:'820px',margin:'0 auto'}}>
          {!tmAdding&&<button onClick={()=>setTmAdding(true)}
            style={{width:'100%',padding:'11px',background:`linear-gradient(135deg,${ac},#db2777)`,border:'none',borderRadius:'12px',color:'white',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',marginBottom:'20px'}}>
            <Plus size={16}/> Neues Match
          </button>}

          {/* Neues Match Formular */}
          {tmAdding&&(
            <div style={{background:acBg,border:`1px solid ${acBorder}`,borderRadius:'16px',padding:'18px',marginBottom:'20px'}}>
              <p style={{margin:'0 0 14px',fontSize:'12px',fontWeight:'800',color:ac,textTransform:'uppercase',letterSpacing:'0.5px'}}>Neues Trainingsmatch</p>
              <div style={{display:'grid',gap:'12px'}}>
                {/* Toggle: Fremdes Match */}
                <button onClick={()=>setTmForm(f=>({...f,otherMatch:!f.otherMatch,player1:''}))}
                  style={{display:'flex',alignItems:'center',gap:'8px',background:'none',border:'none',cursor:'pointer',padding:0,color:tmForm.otherMatch?ac:'rgba(255,255,255,0.4)',fontSize:'13px',fontWeight:'700',justifyContent:'flex-start'}}>
                  <span style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${tmForm.otherMatch?ac:'rgba(255,255,255,0.2)'}`,background:tmForm.otherMatch?ac:'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',flexShrink:0}}>{tmForm.otherMatch?'✓':''}</span>
                  Fremdes Match (zwei andere Spieler)
                </button>

                {/* Spieler 1 – nur bei fremdem Match */}
                {tmForm.otherMatch&&(()=>{
                  const sugg2 = tmSearch2.trim().length>0
                    ? registeredPlayers.filter(p=>p.toLowerCase().includes(tmSearch2.toLowerCase()))
                    : registeredPlayers;
                  return (
                  <div style={{position:'relative'}}>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'6px',textTransform:'uppercase'}}>Spieler 1</label>
                    <input type="text"
                      placeholder="Name suchen…"
                      value={tmForm.player1 || tmSearch2}
                      onChange={e=>{setTmSearch2(e.target.value);setTmForm(f=>({...f,player1:''}));}}
                      onFocus={()=>setTmSearchFocus2(true)}
                      onBlur={()=>setTimeout(()=>setTmSearchFocus2(false),150)}
                      style={{width:'100%',padding:'10px 12px',background:'#1a0a1e',border:`1px solid ${tmForm.player1?ac:acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
                    />
                    {tmForm.player1&&<span style={{position:'absolute',right:'10px',top:'34px',fontSize:'12px',color:'rgba(255,255,255,0.3)',cursor:'pointer'}}
                      onMouseDown={()=>{setTmForm(f=>({...f,player1:''}));setTmSearch2('');}}>×</span>}
                    {tmSearchFocus2&&(
                      <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'10px',marginTop:'4px',maxHeight:'180px',overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
                        {sugg2.length===0&&<div style={{padding:'10px 12px',fontSize:'13px',color:'rgba(255,255,255,0.3)'}}>Kein Spieler gefunden</div>}
                        {sugg2.map(p=>(
                          <div key={p} onMouseDown={()=>{setTmForm(f=>({...f,player1:p}));setTmSearch2('');setTmSearchFocus2(false);}}
                            style={{padding:'10px 12px',fontSize:'14px',color:'white',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(244,114,182,0.1)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Gegner Suchfeld */}
                <div style={{position:'relative'}}>
                  <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'6px',textTransform:'uppercase'}}>{tmForm.otherMatch?'Spieler 2':'Gegner'}</label>
                  <input type="text"
                    placeholder="Name suchen…"
                    value={tmForm.opponent || tmSearch}
                    onChange={e=>{
                      setTmSearch(e.target.value);
                      setTmForm(f=>({...f,opponent:'',useCustom:false}));
                    }}
                    onFocus={()=>setTmSearchFocus(true)}
                    onBlur={()=>setTimeout(()=>setTmSearchFocus(false),150)}
                    style={{width:'100%',padding:'10px 12px',background:'#1a0a1e',border:`1px solid ${tmForm.opponent?ac:acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
                  />
                  {tmForm.opponent&&<span style={{position:'absolute',right:'10px',top:'34px',fontSize:'12px',color:'rgba(255,255,255,0.3)',cursor:'pointer'}}
                    onMouseDown={()=>{setTmForm(f=>({...f,opponent:'',useCustom:false}));setTmSearch('');}}>×</span>}
                  {tmSearchFocus&&(
                    <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'10px',marginTop:'4px',maxHeight:'200px',overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
                      {tmSuggestions.length===0&&<div style={{padding:'10px 12px',fontSize:'13px',color:'rgba(255,255,255,0.3)'}}>Kein Spieler gefunden</div>}
                      {tmSuggestions.map(p=>(
                        <div key={p} onMouseDown={()=>{setTmForm(f=>({...f,opponent:p,useCustom:false}));setTmSearch('');setTmSearchFocus(false);}}
                          style={{padding:'10px 12px',fontSize:'14px',color:'white',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(244,114,182,0.1)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          {p}
                        </div>
                      ))}
                      <div onMouseDown={()=>{setTmForm(f=>({...f,opponent:'',useCustom:true}));setTmSearchFocus(false);}}
                        style={{padding:'10px 12px',fontSize:'13px',color:'rgba(244,114,182,0.7)',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(244,114,182,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        ✏️ Manuell eingeben…
                      </div>
                    </div>
                  )}
                  {tmForm.useCustom&&(
                    <input type="text" placeholder="Name des Gegners" value={tmForm.opponentCustom} onChange={e=>setTmForm(f=>({...f,opponentCustom:e.target.value}))}
                      style={{width:'100%',marginTop:'8px',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                  )}
                </div>

                {/* Ergebnis + Datum */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'6px',textTransform:'uppercase'}}>Ergebnis (Sätze)</label>
                    <select value={tmForm.result} onChange={e=>setTmForm(f=>({...f,result:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}>
                      {resultOptions.map(r=>{const [a,b]=r.split(':');const p1n=(tmForm.otherMatch?(tmForm.player1||tmSearch2||'Spieler 1'):me).split(' ')[0]||'S1';const p2n=(tmForm.useCustom?tmForm.opponentCustom:tmForm.opponent||'Spieler 2').split(' ')[0]||'S2';return <option key={r} value={r}>{p1n} {a}:{b} {p2n}</option>;})}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'6px',textTransform:'uppercase'}}>Datum</label>
                    <input type="date" value={tmForm.date||TODAY} onChange={e=>setTmForm(f=>({...f,date:e.target.value}))}
                      style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.07)',border:`1px solid ${acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                </div>

                {/* Vorgabe */}
                <div>
                  <button onClick={()=>setTmForm(f=>({...f,vorgabe:!f.vorgabe,vorgabePlayer:!f.vorgabe?vorgabeTarget:''}))}
                    style={{display:'flex',alignItems:'center',gap:'8px',background:'none',border:'none',cursor:'pointer',padding:0,color:tmForm.vorgabe?ac:'rgba(255,255,255,0.4)',fontSize:'13px',fontWeight:'700'}}>
                    <span style={{width:'18px',height:'18px',borderRadius:'4px',border:`2px solid ${tmForm.vorgabe?ac:'rgba(255,255,255,0.2)'}`,background:tmForm.vorgabe?ac:'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',flexShrink:0}}>{tmForm.vorgabe?'✓':''}</span>
                    Match mit Vorgabe
                  </button>
                  {tmForm.vorgabe&&(
                    <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'10px',marginTop:'10px',alignItems:'end'}}>
                      <div>
                        <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase'}}>Wer bekommt Vorgabe?</label>
                        <select value={tmForm.vorgabePlayer} onChange={e=>setTmForm(f=>({...f,vorgabePlayer:e.target.value}))}
                          style={{width:'100%',padding:'9px 12px',background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'9px',color:'white',fontSize:'13px',outline:'none',boxSizing:'border-box'}}>
                          <option value={tmForm.otherMatch?(tmForm.player1||tmSearch2||me):me}>{(tmForm.otherMatch?(tmForm.player1||tmSearch2||me):me).split(' ')[0]||'S1'}</option>
                          <option value={vorgabeTarget}>{vorgabeTarget.split(' ')[0]||'S2'}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:'11px',fontWeight:'700',color:'rgba(255,255,255,0.5)',marginBottom:'5px',textTransform:'uppercase'}}>Punkte</label>
                        <select value={tmForm.vorgabePoints} onChange={e=>setTmForm(f=>({...f,vorgabePoints:Number(e.target.value)}))}
                          style={{padding:'9px 12px',background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'9px',color:'white',fontSize:'13px',outline:'none'}}>
                          {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                  <button onClick={()=>{setTmAdding(false);setTmSearch('');setTmSearch2('');}}
                    style={{padding:'9px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
                  <button onClick={submitMatch} disabled={!(tmForm.useCustom?tmForm.opponentCustom.trim():tmForm.opponent)||(tmForm.otherMatch&&!(tmForm.player1||tmSearch2.trim()))}
                    style={{padding:'9px 20px',background:(tmForm.useCustom?tmForm.opponentCustom.trim():tmForm.opponent)?`linear-gradient(135deg,${ac},#db2777)`:'rgba(255,255,255,0.1)',color:'white',border:'none',borderRadius:'10px',cursor:(tmForm.useCustom?tmForm.opponentCustom.trim():tmForm.opponent)?'pointer':'not-allowed',fontWeight:'700',fontSize:'13px',opacity:(tmForm.useCustom?tmForm.opponentCustom.trim():tmForm.opponent)?1:0.5}}>
                    Match speichern
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Allzeittabelle */}
          <div style={{marginBottom:'28px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
              <h2 style={{margin:0,fontSize:'16px',fontWeight:'800',color:'white'}}>🏆 Allzeittabelle</h2>
              <div style={{display:'flex',gap:'6px'}}>
                {[{key:'winrate',label:'Siegquote'},{key:'wins',label:'Siege'},{key:'matches',label:'Matches'}].map(s=>(
                  <button key={s.key} onClick={()=>setTmSort(s.key)}
                    style={{padding:'5px 10px',borderRadius:'7px',border:`1px solid ${tmSort===s.key?acBorder:'rgba(255,255,255,0.1)'}`,background:tmSort===s.key?acBg:'rgba(255,255,255,0.04)',color:tmSort===s.key?ac:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'11px',fontWeight:'700'}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {tableData.length===0?(
              <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Noch keine Matches gespielt</div>
            ):(
              <div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${acBorder}`,borderRadius:'14px',overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'28px 1fr 50px 50px 50px 56px',gap:'4px',padding:'8px 14px',borderBottom:`1px solid ${acBorder}`,fontSize:'10px',fontWeight:'800',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>
                  <span>#</span><span>Spieler</span><span style={{textAlign:'center'}}>M</span><span style={{textAlign:'center'}}>S</span><span style={{textAlign:'center'}}>N</span><span style={{textAlign:'right'}}>Quote</span>
                </div>
                {tableData.map((row,i)=>{
                  const isMe=row.name===me;
                  return (
                  <div key={row.name} style={{display:'grid',gridTemplateColumns:'28px 1fr 50px 50px 50px 56px',gap:'4px',padding:'10px 14px',borderBottom:i<tableData.length-1?'1px solid rgba(255,255,255,0.04)':'none',alignItems:'center',background:isMe?'rgba(244,114,182,0.07)':'transparent'}}>
                    <span style={{fontSize:'12px',fontWeight:'800',color:i===0?'#fbbf24':i===1?'rgba(255,255,255,0.5)':i===2?'#cd7c32':'rgba(255,255,255,0.25)'}}>{i+1}</span>
                    <span style={{fontSize:'14px',fontWeight:'700',color:isMe?ac:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.name}{isMe&&<span style={{fontSize:'10px',marginLeft:'5px',opacity:0.6}}>» ich</span>}</span>
                    <span style={{textAlign:'center',fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{row.matches}</span>
                    <span style={{textAlign:'center',fontSize:'13px',color:'#86efac',fontWeight:'700'}}>{row.wins}</span>
                    <span style={{textAlign:'center',fontSize:'13px',color:'#fca5a5'}}>{row.losses}</span>
                    <span style={{textAlign:'right',fontSize:'13px',fontWeight:'800',color:ac}}>{Math.round(row.winrate*100)}%</span>
                  </div>
                );})}
              </div>
            )}
          </div>

          {/* Match-Verlauf */}
          <h2 style={{margin:'0 0 12px',fontSize:'16px',fontWeight:'800',color:'white'}}>📋 Vergangene Matches</h2>
          {trainingsmatches.length===0?(
            <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.2)',fontSize:'13px'}}>Noch keine Matches</div>
          ):(
            <div style={{display:'grid',gap:'8px'}}>
              {trainingsmatches.map(m=>{
                const d = m.date?new Date(m.date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
                const p1wins = m.score1>m.score2;
                const mDate = m.date ? new Date(m.date+'T23:59:59') : null;
                const deadline = mDate ? new Date(mDate.getTime()+3*24*60*60*1000) : null;
                const withinDeadline = deadline ? new Date() <= deadline : false;
                const isMyMatch = m.player1===me||m.player2===me;
                const canEdit = isAdmin || (isMyMatch && withinDeadline);
                const isEditing = tmEditId===m.id;
                if (isEditing) {
                  const [es1,es2] = [m.score1,m.score2];
                  return (
                    <div key={m.id} style={{background:'rgba(244,114,182,0.07)',border:`1px solid ${acBorder}`,borderRadius:'12px',padding:'12px 14px'}}>
                      <p style={{margin:'0 0 10px',fontSize:'11px',fontWeight:'800',color:ac,textTransform:'uppercase'}}>Match bearbeiten</p>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center',marginBottom:'8px'}}>
                        <span style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',fontWeight:'600'}}>{m.player1} vs {m.player2}</span>
                      </div>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <select defaultValue={`${m.score1}:${m.score2}`} id={`score-${m.id}`}
                          style={{padding:'8px 10px',background:'#1a0a1e',border:`1px solid ${acBorder}`,borderRadius:'8px',color:'white',fontSize:'14px'}}>
                          {resultOptions.map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                        <input type="date" defaultValue={m.date||''} id={`date-${m.id}`}
                          style={{padding:'8px 10px',background:'rgba(255,255,255,0.07)',border:`1px solid ${acBorder}`,borderRadius:'8px',color:'white',fontSize:'13px'}}/>
                        <button onClick={()=>{
                          const scoreEl=document.getElementById(`score-${m.id}`);
                          const dateEl=document.getElementById(`date-${m.id}`);
                          const [ns1,ns2]=(scoreEl?.value||`${m.score1}:${m.score2}`).split(':').map(Number);
                          saveMatches(trainingsmatches.map(x=>x.id===m.id?{...x,score1:ns1,score2:ns2,date:dateEl?.value||m.date}:x));
                          setTmEditId(null);
                        }} style={{padding:'8px 14px',background:`linear-gradient(135deg,${ac},#db2777)`,border:'none',borderRadius:'8px',color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>
                          Speichern
                        </button>
                        <button onClick={()=>setTmEditId(null)} style={{padding:'8px 12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  );
                }
                const myWin = isMyMatch&&((m.player1===me&&p1wins)||(m.player2===me&&!p1wins));
                return (
                  <div key={m.id} style={{background:isMyMatch?(myWin?'rgba(74,222,128,0.05)':'rgba(248,113,113,0.05)'):'rgba(255,255,255,0.03)',border:`2px solid ${isMyMatch?(myWin?'rgba(74,222,128,0.35)':'rgba(248,113,113,0.35)'):acBorder}`,borderRadius:'12px',padding:'12px 14px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                        <span style={{fontWeight:'700',color:m.player1===me?'#f9a8d4':p1wins?'#86efac':'rgba(255,255,255,0.6)',fontSize:'14px'}}>{m.player1}</span>
                        <span style={{fontWeight:'900',fontSize:'16px',color:'white'}}>{m.score1}:{m.score2}</span>
                        <span style={{fontWeight:'700',color:m.player2===me?'#f9a8d4':!p1wins?'#86efac':'rgba(255,255,255,0.6)',fontSize:'14px'}}>{m.player2}</span>
                      </div>
                      <div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginTop:'3px'}}>
                        {d}{m.vorgabe?` · Vorgabe: ${m.vorgabe.player.split(' ')[0]} +${m.vorgabe.points}Pkt`:''}
                      </div>
                    </div>
                    {canEdit&&<button onClick={()=>setTmEditId(m.id)}
                      style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(244,114,182,0.1)',border:'1px solid rgba(244,114,182,0.2)',color:ac,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Pencil size={12}/>
                    </button>}
                    {isAdmin&&<button onClick={()=>{if(!window.confirm('Match löschen?'))return;saveMatches(trainingsmatches.filter(x=>x.id!==m.id));}}
                      style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Trash2 size={12}/>
                    </button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── WETTEN & ZITATE ─────────────────────────────────────────────────────
  if (view === 'wettenZitate' && canAccessPinnwand()) {
    const ac = '#fbbf24';
    const acBorder = 'rgba(251,191,36,0.25)';
    const acBg = 'rgba(251,191,36,0.07)';
    const saveWZ = entries => { setWettenZitate(entries); setDoc(doc(db,'ttc','wettenZitate'),{entries}); };
    const authorName = userProfile?.name || user?.email || 'Unbekannt';
    const canEditEntry = (entry) => userRole==='admin' || entry.createdBy===authorName;

    const submitWZ = () => {
      if (!wzForm.text.trim()) return;
      const validOptions = wzForm.type==='wette' ? wzForm.options.map(o=>o.trim()).filter(Boolean) : [];
      if (wzForm.type==='wette' && validOptions.length < 2) return;
      const entry = {
        id:'wz_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        type: wzForm.type,
        text: wzForm.text.trim(),
        createdBy: authorName,
        date: wzForm.date || TODAY,
        createdAt: new Date().toISOString(),
        ...(wzForm.dueDate ? {dueDate: wzForm.dueDate} : {}),
        ...(validOptions.length ? {options: validOptions, bets: {}} : {}),
      };
      saveWZ([entry, ...wettenZitate]);
      setWzAdding(false);
      setWzForm({type:'zitat',text:'',date:'',dueDate:'',options:['','']});
    };

    const daysDiff = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

    const canPlaceNewBet = (entry) => {
      const agedays = daysDiff(entry.createdAt || entry.date+'T00:00:00', new Date().toISOString());
      if (agedays >= 28) return false;
      if (entry.dueDate) {
        const betPeriod = daysDiff(entry.createdAt || entry.date+'T00:00:00', entry.dueDate+'T23:59:59');
        const daysLeft  = daysDiff(new Date().toISOString(), entry.dueDate+'T23:59:59');
        if (betPeriod >= 21) { if (daysLeft <= 21) return false; }
        else                  { if (daysLeft <= 2)  return false; }
      }
      return true;
    };

    const canChangeBet = (entry) => {
      const ts = entry.betTimestamps?.[authorName];
      if (!ts) return true;
      return (Date.now() - new Date(ts).getTime()) < 86400000;
    };

    const placeBet = (entryId, optionIdx) => {
      const entry = wettenZitate.find(e=>e.id===entryId);
      if (!entry) return;
      const hadBet = (entry.bets||{})[authorName] !== undefined;
      if (hadBet && !canChangeBet(entry)) return;
      if (!hadBet && !canPlaceNewBet(entry)) return;
      const bets = {...(entry.bets||{})};
      const betTimestamps = {...(entry.betTimestamps||{})};
      if (bets[authorName] === optionIdx) {
        delete bets[authorName];
        delete betTimestamps[authorName];
      } else {
        bets[authorName] = optionIdx;
        betTimestamps[authorName] = new Date().toISOString();
      }
      saveWZ(wettenZitate.map(e=>e.id===entryId?{...e,bets,betTimestamps}:e));
    };

    const saveEdit = (id) => {
      if (!wzEditText.trim()) return;
      saveWZ(wettenZitate.map(e=>e.id===id?{...e,text:wzEditText.trim(),edited:true}:e));
      setWzEditId(null);
    };

    const typeCfg = {
      zitat:           {label:'Zitat',           icon:'💬', color:'#67e8f9', bg:'rgba(103,232,249,0.1)', border:'rgba(103,232,249,0.3)'},
      wette:           {label:'Wette',           icon:'🎰', color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.3)'},
      lessons_learned: {label:'Lessons Learned', icon:'📚', color:'#86efac', bg:'rgba(134,239,172,0.1)', border:'rgba(134,239,172,0.3)'},
    };
    const wzDueCount = wettenZitate.filter(e => e.dueDate && e.dueDate <= TODAY && !e.dueSeen).length;

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a1000 0%,#0d0a00 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#fbbf24')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>📋 Pinnwand</h1>
          <span style={{fontSize:'12px',color:'rgba(251,191,36,0.6)',fontWeight:'600'}}>{wettenZitate.length} Einträge</span>
        </div>

        <div style={{padding:'20px',maxWidth:'820px',margin:'0 auto'}}>

          {/* Neuer Eintrag Button */}
          {!wzAdding && (
            <button onClick={()=>setWzAdding(true)}
              style={{width:'100%',padding:'11px',background:`linear-gradient(135deg,${ac},#d97706)`,border:'none',borderRadius:'12px',color:'white',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',marginBottom:'12px'}}>
              <Plus size={16}/> Neuer Eintrag
            </button>
          )}

          {/* Suche + Filter */}
          <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
            <input
              value={wzSearch} onChange={e=>setWzSearch(e.target.value)}
              placeholder="Suche…"
              style={{width:'100%',padding:'9px 14px',background:'rgba(255,255,255,0.06)',border:`1px solid ${acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
            />
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {[['alle','Alle'],['zitat','💬 Zitate'],['wette','🎰 Wetten'],['lessons_learned','📚 Lessons']].map(([key,lbl])=>(
                <button key={key} onClick={()=>setWzFilter(key)}
                  style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${wzFilter===key?ac:'rgba(255,255,255,0.15)'}`,background:wzFilter===key?'rgba(251,191,36,0.15)':'rgba(255,255,255,0.04)',color:wzFilter===key?ac:'rgba(255,255,255,0.45)',fontWeight:'700',fontSize:'12px',cursor:'pointer'}}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Formular */}
          {wzAdding && (
            <div style={{background:acBg,border:`1px solid ${acBorder}`,borderRadius:'16px',padding:'18px',marginBottom:'20px'}}>
              {/* Typ-Auswahl */}
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                {Object.entries(typeCfg).map(([key,cfg])=>(
                  <button key={key} onClick={()=>setWzForm(f=>({...f,type:key}))}
                    style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${wzForm.type===key?cfg.border:'rgba(255,255,255,0.1)'}`,background:wzForm.type===key?cfg.bg:'rgba(255,255,255,0.04)',color:wzForm.type===key?cfg.color:'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:'800',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
              {/* Text */}
              <textarea
                value={wzForm.text}
                onChange={e=>setWzForm(f=>({...f,text:e.target.value}))}
                placeholder={wzForm.type==='zitat'?'"Das war das beste Match meines Lebens…" – Wer hat das gesagt?':wzForm.type==='lessons_learned'?'Was haben wir gelernt?':'Beschreibe die Wette…'}
                rows={4}
                style={{width:'100%',padding:'12px',background:'rgba(0,0,0,0.3)',border:`1px solid ${acBorder}`,borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit',lineHeight:'1.5'}}
              />
              {/* Wett-Optionen */}
              {wzForm.type==='wette' && (
                <div style={{marginTop:'12px',padding:'12px',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:'10px'}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'rgba(251,191,36,0.7)',display:'block',marginBottom:'8px'}}>🎯 Wett-Optionen (min. 2)</span>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {wzForm.options.map((opt,i)=>(
                      <div key={i} style={{display:'flex',gap:'6px',alignItems:'center'}}>
                        <input value={opt} onChange={e=>{const o=[...wzForm.options];o[i]=e.target.value;setWzForm(f=>({...f,options:o}));}}
                          placeholder={`Option ${i+1}…`}
                          style={{flex:1,padding:'7px 10px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'8px',color:'white',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                        {wzForm.options.length>2&&(
                          <button onClick={()=>setWzForm(f=>({...f,options:f.options.filter((_,j)=>j!==i)}))}
                            style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {wzForm.options.length < 6 && (
                    <button onClick={()=>setWzForm(f=>({...f,options:[...f.options,'']}))}
                      style={{marginTop:'8px',padding:'5px 12px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'8px',color:'#fbbf24',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>+ Option hinzufügen</button>
                  )}
                </div>
              )}
              <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'10px',flexWrap:'wrap'}}>
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',flexShrink:0}}>Von: {authorName}</span>
                <input type="date" value={wzForm.date} onChange={e=>setWzForm(f=>({...f,date:e.target.value}))} max={TODAY}
                  style={{padding:'5px 10px',borderRadius:'8px',border:`1px solid ${acBorder}`,background:'rgba(0,0,0,0.3)',color:'white',fontSize:'12px',outline:'none',fontFamily:'inherit'}}/>
                {!wzForm.date&&<span style={{fontSize:'11px',color:'rgba(255,255,255,0.2)'}}>Kein Datum = heute</span>}
                <input type="date" value={wzForm.dueDate} onChange={e=>setWzForm(f=>({...f,dueDate:e.target.value}))} min={TODAY}
                  style={{padding:'5px 10px',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.4)',background:'rgba(0,0,0,0.3)',color:wzForm.dueDate?'#fca5a5':'rgba(255,255,255,0.3)',fontSize:'12px',outline:'none',fontFamily:'inherit'}}/>
                {!wzForm.dueDate&&<span style={{fontSize:'11px',color:'rgba(255,255,255,0.2)'}}>Fälligkeitsdatum (optional)</span>}
              </div>
              <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'10px'}}>
                <button onClick={()=>{setWzAdding(false);setWzForm({type:'zitat',text:'',date:'',dueDate:'',options:['','']});}}
                  style={{padding:'9px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
                {(() => { const ok = wzForm.text.trim() && (wzForm.type!=='wette'||wzForm.options.filter(o=>o.trim()).length>=2); return (
                <button onClick={submitWZ} disabled={!ok}
                  style={{padding:'9px 20px',background:ok?`linear-gradient(135deg,${ac},#d97706)`:'rgba(255,255,255,0.1)',color:'white',border:'none',borderRadius:'10px',cursor:ok?'pointer':'not-allowed',fontWeight:'700',fontSize:'13px',opacity:ok?1:0.5}}>
                  Speichern
                </button>
                ); })()}
              </div>
            </div>
          )}

          {/* Eintrags-Liste */}
          {wettenZitate.length === 0 && !wzAdding ? (
            <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)',fontSize:'14px'}}>Noch keine Einträge. Lege den ersten an!</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {wettenZitate.filter(entry=>{
                if (wzFilter !== 'alle' && entry.type !== wzFilter) return false;
                if (wzSearch.trim()) {
                  const q = wzSearch.trim().toLowerCase();
                  return entry.text?.toLowerCase().includes(q) || entry.createdBy?.toLowerCase().includes(q);
                }
                return true;
              }).map(entry=>{
                const cfg = typeCfg[entry.type] || typeCfg.zitat;
                const dateStr = entry.date ? new Date(entry.date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
                const dueDateStr = entry.dueDate ? new Date(entry.dueDate+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
                const isDue = entry.dueDate && entry.dueDate <= TODAY && !entry.dueSeen;
                const isEditing = wzEditId === entry.id;
                return (
                  <div key={entry.id} style={{background: isDue ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',border:`1px solid ${isDue ? 'rgba(239,68,68,0.4)' : acBorder}`,borderRadius:'14px',overflow:'hidden'}}>
                    {/* Kopfzeile */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <span style={{fontSize:'11px',fontWeight:'800',color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:'6px',padding:'2px 8px',flexShrink:0}}>{cfg.icon} {cfg.label}</span>
                      <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',flex:1}}>{entry.createdBy}</span>
                      {entry.dueDate && (
                        <span
                          onClick={isDue ? ()=>saveWZ(wettenZitate.map(e=>e.id===entry.id?{...e,dueSeen:true}:e)) : undefined}
                          style={{fontSize:'11px',fontWeight:'700',color:isDue?'#fca5a5':'rgba(255,255,255,0.3)',background:isDue?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${isDue?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:'6px',padding:'2px 8px',cursor:isDue?'pointer':'default',flexShrink:0}}>
                          {isDue ? '⚠️ ' : '📅 '}fällig {dueDateStr}
                        </span>
                      )}
                      <span style={{fontSize:'11px',color:'rgba(255,255,255,0.2)'}}>{dateStr}</span>
                      {entry.edited&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>bearbeitet</span>}
                      {canEditEntry(entry) && !isEditing && (
                        <div style={{display:'flex',gap:'4px',marginLeft:'4px'}}>
                          {entry.type==='wette' && !entry.options?.length && wzAddOptionsId!==entry.id && (
                            <button onClick={()=>{setWzAddOptionsId(entry.id);setWzAddOptions(['','']);}}
                              style={{padding:'3px 8px',borderRadius:'7px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',color:ac,cursor:'pointer',fontSize:'11px',fontWeight:'700',flexShrink:0}}>+ Optionen</button>
                          )}
                          <button onClick={()=>{setWzEditId(entry.id);setWzEditText(entry.text);}}
                            style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',color:ac,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Pencil size={12}/></button>
                          <button onClick={()=>{if(!window.confirm('Eintrag löschen?'))return;saveWZ(wettenZitate.filter(e=>e.id!==entry.id));}}
                            style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Trash2 size={12}/></button>
                        </div>
                      )}
                    </div>
                    {/* Text */}
                    {isEditing ? (
                      <div style={{padding:'12px 14px'}}>
                        <textarea value={wzEditText} onChange={e=>setWzEditText(e.target.value)} rows={4}
                          style={{width:'100%',padding:'10px',background:'rgba(0,0,0,0.3)',border:`1px solid ${acBorder}`,borderRadius:'8px',color:'white',fontSize:'14px',outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit',lineHeight:'1.5'}}/>
                        <div style={{display:'flex',gap:'8px',marginTop:'8px',justifyContent:'flex-end'}}>
                          <button onClick={()=>setWzEditId(null)} style={{padding:'7px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>Abbrechen</button>
                          <button onClick={()=>saveEdit(entry.id)} style={{padding:'7px 16px',background:`linear-gradient(135deg,${ac},#d97706)`,border:'none',borderRadius:'8px',color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>Speichern</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{margin:0,padding:'12px 14px 10px',fontSize:'14px',color:'rgba(255,255,255,0.85)',lineHeight:'1.6',whiteSpace:'pre-wrap'}}>{entry.text}</p>
                        {wzAddOptionsId===entry.id && (
                          <div style={{margin:'0 14px 14px',padding:'12px',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'10px'}}>
                            <span style={{fontSize:'12px',fontWeight:'700',color:'rgba(251,191,36,0.7)',display:'block',marginBottom:'8px'}}>🎯 Optionen hinzufügen (min. 2)</span>
                            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                              {wzAddOptions.map((opt,i)=>(
                                <div key={i} style={{display:'flex',gap:'6px',alignItems:'center'}}>
                                  <input value={opt} onChange={e=>{const o=[...wzAddOptions];o[i]=e.target.value;setWzAddOptions(o);}}
                                    placeholder={`Option ${i+1}…`}
                                    style={{flex:1,padding:'7px 10px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'8px',color:'white',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                                  {wzAddOptions.length>2&&(
                                    <button onClick={()=>setWzAddOptions(wzAddOptions.filter((_,j)=>j!==i))}
                                      style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {wzAddOptions.length<6&&(
                              <button onClick={()=>setWzAddOptions([...wzAddOptions,''])}
                                style={{marginTop:'8px',padding:'5px 12px',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'8px',color:'#fbbf24',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>+ Option</button>
                            )}
                            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'10px'}}>
                              <button onClick={()=>setWzAddOptionsId(null)}
                                style={{padding:'6px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Abbrechen</button>
                              <button
                                disabled={wzAddOptions.filter(o=>o.trim()).length<2}
                                onClick={()=>{
                                  const validOpts=wzAddOptions.map(o=>o.trim()).filter(Boolean);
                                  saveWZ(wettenZitate.map(e=>e.id===entry.id?{...e,options:validOpts,bets:{}}:e));
                                  setWzAddOptionsId(null);
                                }}
                                style={{padding:'6px 16px',background:wzAddOptions.filter(o=>o.trim()).length>=2?`linear-gradient(135deg,${ac},#d97706)`:'rgba(255,255,255,0.1)',border:'none',borderRadius:'8px',color:'white',fontWeight:'700',fontSize:'12px',cursor:wzAddOptions.filter(o=>o.trim()).length>=2?'pointer':'not-allowed',opacity:wzAddOptions.filter(o=>o.trim()).length>=2?1:0.5}}>Speichern</button>
                            </div>
                          </div>
                        )}
                        {entry.options?.length>0 && (() => {
                          const bets = entry.bets || {};
                          const myBet = bets[authorName];
                          const hasBet = myBet !== undefined;
                          const totalVotes = Object.keys(bets).length;
                          const isExpanded = wzExpandedBets.has(entry.id);
                          const toggleExpand = () => setWzExpandedBets(prev => { const s=new Set(prev); s.has(entry.id)?s.delete(entry.id):s.add(entry.id); return s; });
                          const betOpen = canPlaceNewBet(entry);
                          const changeOpen = hasBet && canChangeBet(entry);
                          const canAct = (!hasBet && betOpen) || (hasBet && changeOpen);

                          // Compact summary when voted and collapsed
                          if (hasBet && !isExpanded) {
                            const myOptLabel = entry.options[myBet];
                            return (
                              <div style={{padding:'0 14px 12px'}}>
                                <button onClick={toggleExpand}
                                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:'9px',cursor:'pointer',gap:'8px'}}>
                                  <span style={{fontSize:'13px',fontWeight:'700',color:'#fbbf24'}}>✓ {myOptLabel}</span>
                                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                                    <span style={{fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{totalVotes} {totalVotes===1?'Stimme':'Stimmen'}</span>
                                    {changeOpen && <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>änderbar</span>}
                                    <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>▾ Details</span>
                                  </div>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:'7px'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'2px'}}>
                                <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',fontWeight:'700'}}>
                                  🗳️ {betOpen ? 'Abstimmen' : 'Geschlossen'} · {totalVotes} {totalVotes===1?'Stimme':'Stimmen'}
                                  {!betOpen && <span style={{marginLeft:'6px',color:'rgba(239,68,68,0.6)'}}>🔒</span>}
                                </span>
                                {hasBet && <button onClick={toggleExpand} style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',background:'none',border:'none',cursor:'pointer',padding:'0'}}>▴ Einklappen</button>}
                              </div>
                              {!betOpen && !hasBet && <span style={{fontSize:'11px',color:'rgba(239,68,68,0.5)',marginBottom:'2px'}}>Wettzeitraum abgelaufen – keine neue Wette möglich.</span>}
                              {hasBet && !changeOpen && <span style={{fontSize:'11px',color:'rgba(239,68,68,0.5)',marginBottom:'2px'}}>Wette abgegeben – Änderungsfenster (24h) abgelaufen.</span>}
                              {entry.options.map((opt,i)=>{
                                const count = Object.values(bets).filter(v=>v===i).length;
                                const pct = totalVotes>0 ? Math.round(count/totalVotes*100) : 0;
                                const isMine = myBet===i;
                                const voters = Object.entries(bets).filter(([,v])=>v===i).map(([n])=>n);
                                return (
                                  <button key={i} onClick={()=>canAct&&placeBet(entry.id,i)}
                                    style={{position:'relative',padding:'9px 12px',borderRadius:'9px',border:`2px solid ${isMine?'#fbbf24':'rgba(255,255,255,0.1)'}`,background:isMine?'rgba(251,191,36,0.12)':'rgba(255,255,255,0.04)',cursor:canAct?'pointer':'default',textAlign:'left',overflow:'hidden',opacity:canAct||isMine?1:0.6}}>
                                    <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${pct}%`,background:isMine?'rgba(251,191,36,0.12)':'rgba(255,255,255,0.05)',borderRadius:'7px',transition:'width 0.3s'}}/>
                                    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                                      <span style={{fontSize:'13px',fontWeight:isMine?'800':'600',color:isMine?'#fbbf24':'rgba(255,255,255,0.8)'}}>{isMine?'✓ ':''}{opt}</span>
                                      <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                                        {voters.length>0&&<span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{voters.join(', ')}</span>}
                                        <span style={{fontSize:'12px',fontWeight:'700',color:isMine?'#fbbf24':'rgba(255,255,255,0.4)'}}>{count} ({pct}%)</span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
              {wettenZitate.filter(entry=>{
                if (wzFilter!=='alle'&&entry.type!==wzFilter) return false;
                if (wzSearch.trim()){const q=wzSearch.trim().toLowerCase();return entry.text?.toLowerCase().includes(q)||entry.createdBy?.toLowerCase().includes(q);}
                return true;
              }).length===0 && <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.2)',fontSize:'14px'}}>Keine Einträge gefunden.</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TRIKOTGRÖSSEN ───────────────────────────────────────────────────────
  if (view === 'trikotgroessen' && canEdit()) {
    const GROESSEN_HERREN = ['XXXS','XXS','XS','S','M','L','XL','XXL','XXXL'];
    const GROESSEN_DAMEN  = ['XXS','XS','S','M','L','XL','XXL'];
    const ANZAHLEN = [1,2,3];

    const saveTrikot = (id, field, val) => {
      setTrikotDaten(prev => ({...prev, [id]: {...(prev[id]||{}), [field]: val}}));
      updateDoc(doc(db,'ttc','trikotDaten'), { [`${id}.${field}`]: val === null ? deleteField() : val })
        .catch(() => setDoc(doc(db,'ttc','trikotDaten'), {[id]: {[field]: val === null ? null : val}}, {merge: true}));
    };

    const deleteTrikotSpieler = (id) => {
      if (!window.confirm('Spieler aus der Trikotliste entfernen?')) return;
      setTrikotDaten(prev => { const u = {...prev}; delete u[id]; return u; });
      updateDoc(doc(db,'ttc','trikotDaten'), { [id]: deleteField(), '__removed__': arrayUnion(id) })
        .catch(() => {});
    };

    const removedIds = new Set(trikotDaten['__removed__']||[]);

    // Alle Jugendkinder (auch ohne TTR)
    const jugendSpieler = Object.values(children)
      .filter(c => !c.nachwuchsKarriereBeendet && !removedIds.has(c.id))
      .map(c => ({id: c.id, name: c.name, typ: 'jugend'}))
      .sort((a,b)=>a.name.localeCompare(b.name,'de'));

    // Alle Aktive (auch ohne TTR)
    const aktiveSpielerList = Object.values(aktiveSpieler)
      .filter(p => !removedIds.has(p.id||p.spielernr))
      .map(p => ({id: p.id||p.spielernr, name: p.name, typ: 'aktiv'}))
      .sort((a,b)=>a.name.localeCompare(b.name,'de'));

    const alleUngefiltert = trikotFilter==='jugend' ? jugendSpieler
      : trikotFilter==='aktiv' ? aktiveSpielerList
      : [...jugendSpieler, ...aktiveSpielerList];

    const alleSpieler = trikotSearch.trim()
      ? alleUngefiltert.filter(p=>p.name.toLowerCase().includes(trikotSearch.toLowerCase()))
      : alleUngefiltert;

    const isComplete = (id) => {
      const d = trikotDaten[id];
      const unterseiteOk = d?.unterseite === 'Keine' || (d?.unterseite && d?.anzahlUnterseite && d?.groesseUnterseite);
      return d?.groesse && d?.schnitt && d?.anzahlTrikot && unterseiteOk;
    };

    const erfasst = alleUngefiltert.filter(p => isComplete(p.id)).length;

    const exportExcel = () => {
      const esc = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const th = v => `<th style="background:#1d4ed8;color:white;font-weight:bold;padding:6px 10px;border:1px solid #93c5fd">${esc(v)}</th>`;
      const td = v => `<td style="padding:5px 10px;border:1px solid #cbd5e1">${esc(v)}</td>`;
      const header = ['Name','Typ','Trikotgröße','Trikotschnitt','Anzahl Trikots','Unterseite','Größe Unterseite','Anzahl Unterseite'];
      const rows = alleUngefiltert.map(p => {
        const d = trikotDaten[p.id]||{};
        return [p.name, p.typ==='jugend'?'Jugend':'Aktiv', d.groesse||'–', d.schnitt||'–', d.anzahlTrikot||'–', d.unterseite||'–', d.unterseite==='Keine'?'–':(d.groesseUnterseite||'–'), d.unterseite==='Keine'?'–':(d.anzahlUnterseite||'–')];
      });
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Trikotgrößen</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px"><thead><tr>${header.map(th).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(td).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob(['﻿'+html], {type:'application/vnd.ms-excel;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='trikotgroessen.xls'; a.click();
      URL.revokeObjectURL(url);
    };

    const FBtn = ({val, current, onSet}) => (
      <button translate="no" onClick={()=>onSet(current===val?null:val)}
        style={{padding:'5px 12px',borderRadius:'7px',border:`1.5px solid ${current===val?'rgba(147,197,253,0.5)':'rgba(255,255,255,0.1)'}`,background:current===val?'rgba(147,197,253,0.15)':'rgba(255,255,255,0.03)',color:current===val?'#93c5fd':'rgba(255,255,255,0.4)',fontWeight:'700',fontSize:'12px',cursor:'pointer',transition:'all 0.1s',whiteSpace:'nowrap'}}>
        {val}
      </button>
    );

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1628 0%,#0d1f3c 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#93c5fd')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1}}>👕 Trikotgrößen</h1>
          <button onClick={exportExcel} style={{padding:'7px 14px',background:'rgba(147,197,253,0.12)',border:'1px solid rgba(147,197,253,0.25)',borderRadius:'10px',color:'#93c5fd',fontSize:'12px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
            <Download size={13}/> Excel
          </button>
        </div>

        <div style={{padding:'16px 20px',maxWidth:'900px',margin:'0 auto'}}>

          {/* Filter */}
          <div style={{display:'flex',gap:'6px',marginBottom:'12px'}}>
            {[{k:'alle',l:'Alle'},{k:'jugend',l:'Jugend'},{k:'aktiv',l:'Aktive'}].map(({k,l})=>(
              <button key={k} onClick={()=>setTrikotFilter(k)}
                style={{padding:'7px 16px',borderRadius:'9px',border:`1.5px solid ${trikotFilter===k?'rgba(147,197,253,0.5)':'rgba(255,255,255,0.1)'}`,background:trikotFilter===k?'rgba(147,197,253,0.12)':'rgba(255,255,255,0.04)',color:trikotFilter===k?'#93c5fd':'rgba(255,255,255,0.4)',fontWeight:'800',fontSize:'13px',cursor:'pointer'}}>
                {l}
              </button>
            ))}
          </div>

          {/* Suche */}
          <div style={{position:'relative',marginBottom:'12px'}}>
            <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'15px',pointerEvents:'none'}}>🔍</span>
            <input value={trikotSearch} onChange={e=>setTrikotSearch(e.target.value)} placeholder="Spieler suchen…"
              style={{width:'100%',boxSizing:'border-box',padding:'9px 12px 9px 36px',borderRadius:'10px',border:'1.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'white',fontSize:'14px',outline:'none'}}/>
            {trikotSearch&&<button onClick={()=>setTrikotSearch('')} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'18px',cursor:'pointer',lineHeight:1}}>×</button>}
          </div>

          {/* Fortschritt */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:'rgba(147,197,253,0.05)',border:'1px solid rgba(147,197,253,0.12)',borderRadius:'12px',marginBottom:'14px'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',fontWeight:'600'}}>Erfasst</span>
                <span style={{fontSize:'12px',fontWeight:'800',color:erfasst===alleUngefiltert.length&&alleUngefiltert.length>0?'#4ade80':'#93c5fd'}}>{erfasst} / {alleUngefiltert.length}</span>
              </div>
              <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'99px',height:'6px',overflow:'hidden'}}>
                <div style={{width:alleUngefiltert.length>0?`${Math.round(erfasst/alleUngefiltert.length*100)}%`:'0%',height:'100%',background:erfasst===alleUngefiltert.length&&alleUngefiltert.length>0?'linear-gradient(90deg,#16a34a,#4ade80)':'linear-gradient(90deg,#1d4ed8,#93c5fd)',borderRadius:'99px',transition:'width 0.4s'}}/>
              </div>
            </div>
          </div>

          {/* Spielerliste */}
          <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
            {alleSpieler.length===0 && (
              <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.25)',fontSize:'14px'}}>Keine Spieler gefunden.</div>
            )}
            {alleSpieler.map(spieler => {
              const d = trikotDaten[spieler.id] || {};
              const complete = isComplete(spieler.id);
              const isOpen = trikotExpanded === spieler.id;
              return (
                <div key={spieler.id} style={{borderRadius:'11px',overflow:'hidden',border:`1px solid ${complete?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.07)'}`,background:complete?'rgba(74,222,128,0.04)':'rgba(255,255,255,0.025)'}}>
                  {/* Kompakte Zeile */}
                  <div style={{display:'flex',alignItems:'center',padding:'9px 12px',gap:'10px'}}>
                    <span style={{fontSize:complete?'16px':'14px',flexShrink:0}}>{complete?'✅':'❌'}</span>
                    <span style={{flex:1,fontWeight:'700',fontSize:'14px',color:'white'}}>{spieler.name}</span>
                    <span style={{fontSize:'10px',fontWeight:'700',color:spieler.typ==='jugend'?'rgba(74,222,128,0.4)':'rgba(147,197,253,0.4)',textTransform:'uppercase',letterSpacing:'0.5px',flexShrink:0}}>{spieler.typ==='jugend'?'J':'A'}</span>
                    {userRole==='admin' && (
                      <button onClick={e=>{e.stopPropagation();deleteTrikotSpieler(spieler.id);}}
                        style={{width:'24px',height:'24px',borderRadius:'6px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Trash2 size={11}/>
                      </button>
                    )}
                    <button onClick={()=>setTrikotExpanded(isOpen?null:spieler.id)}
                      style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(147,197,253,0.08)',border:'1px solid rgba(147,197,253,0.15)',color:'#93c5fd',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transform:isOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>
                      <ChevronRight size={14} style={{transform:'rotate(90deg)'}}/>
                    </button>
                  </div>

                  {/* Ausgeklappte Felder */}
                  {isOpen && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'12px',display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'10px'}}>
                      {/* Trikot */}
                      <div>
                        <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(147,197,253,0.5)',textTransform:'uppercase',letterSpacing:'1px'}}>Trikot</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',minWidth:'50px'}}>Größe</span>
                            <select value={d.groesse||''} onChange={e=>saveTrikot(spieler.id,'groesse',e.target.value)}
                              style={{flex:1,padding:'5px 8px',borderRadius:'7px',border:'1px solid rgba(147,197,253,0.2)',background:'rgba(15,30,60,0.8)',color:'white',fontSize:'13px',fontWeight:'700',outline:'none'}}>
                              <option value="" style={{color:'#94a3b8'}}>— wählen —</option>
                              {(d.schnitt==='Damen'?GROESSEN_DAMEN:GROESSEN_HERREN).map(g=><option key={g} value={g} style={{color:'white',background:'#1e3a5f'}}>{g}</option>)}
                            </select>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',minWidth:'50px'}}>Schnitt</span>
                            <div style={{display:'flex',gap:'5px'}}>
                              <FBtn val="Damen" current={d.schnitt} onSet={v=>saveTrikot(spieler.id,'schnitt',v)}/>
                              <FBtn val="Herren" current={d.schnitt} onSet={v=>saveTrikot(spieler.id,'schnitt',v)}/>
                            </div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',minWidth:'50px'}}>Anzahl</span>
                            <div style={{display:'flex',gap:'5px'}}>
                              {ANZAHLEN.map(n=><FBtn key={n} val={n} current={d.anzahlTrikot} onSet={v=>saveTrikot(spieler.id,'anzahlTrikot',v)}/>)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Unterseite */}
                      <div>
                        <p style={{margin:'0 0 8px',fontSize:'10px',fontWeight:'800',color:'rgba(147,197,253,0.5)',textTransform:'uppercase',letterSpacing:'1px'}}>{d.unterseite==='Hose'?'Hose':d.unterseite==='Rock'?'Rock':'Unterseite'}</p>
                        <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                            <FBtn val="Hose" current={d.unterseite} onSet={v=>saveTrikot(spieler.id,'unterseite',v)}/>
                            <FBtn val="Rock" current={d.unterseite} onSet={v=>saveTrikot(spieler.id,'unterseite',v)}/>
                            <FBtn val="Keine" current={d.unterseite} onSet={v=>{
                              setTrikotDaten(prev => ({...prev, [spieler.id]: {...(prev[spieler.id]||{}), unterseite: v, anzahlUnterseite: null, groesseUnterseite: null}}));
                              updateDoc(doc(db,'ttc','trikotDaten'), {
                                [`${spieler.id}.unterseite`]: v,
                                [`${spieler.id}.anzahlUnterseite`]: deleteField(),
                                [`${spieler.id}.groesseUnterseite`]: deleteField(),
                              }).catch(()=>{});
                            }}/>
                          </div>
                          {d.unterseite && d.unterseite !== 'Keine' && (<>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',minWidth:'50px'}}>Größe</span>
                              <select value={d.groesseUnterseite||''} onChange={e=>saveTrikot(spieler.id,'groesseUnterseite',e.target.value)}
                                style={{flex:1,padding:'5px 8px',borderRadius:'7px',border:'1px solid rgba(147,197,253,0.2)',background:'rgba(15,30,60,0.8)',color:'white',fontSize:'13px',fontWeight:'700',outline:'none'}}>
                                <option value="" style={{color:'#94a3b8'}}>— wählen —</option>
                                {(d.schnitt==='Damen'?GROESSEN_DAMEN:GROESSEN_HERREN).map(g=><option key={g} value={g} style={{color:'white',background:'#1e3a5f'}}>{g}</option>)}
                              </select>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',minWidth:'50px'}}>Anzahl</span>
                              <div style={{display:'flex',gap:'5px'}}>
                                {ANZAHLEN.map(n=><FBtn key={n} val={n} current={d.anzahlUnterseite} onSet={v=>saveTrikot(spieler.id,'anzahlUnterseite',v)}/>)}
                              </div>
                            </div>
                          </>)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    );
  }

  // ── ROMPEL BEREICH ──────────────────────────────────────────────────────
  if (view === 'rompel' && canAccessRompel()) {
    const accent = '#fda4af';
    const hours = rompelData.hours || [];
    const expenses = rompelData.expenses || [];
    const totalGuthaben = hours.reduce((s, h) => s + (Number(h.hours) || 0) * 7.5, 0);
    const totalAusgaben = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const saldo = totalGuthaben - totalAusgaben;

    const addHours = () => {
      const h = Number(rompelHoursForm.hours);
      if (!h || h <= 0) return;
      const entry = {id:'h_'+Date.now(), date: rompelHoursForm.date, hours: h, desc: rompelHoursForm.desc.trim()};
      const updated = {...rompelData, hours: [...hours, entry].sort((a,b)=>a.date.localeCompare(b.date))};
      saveRompelData(updated);
      setRompelHoursForm(f=>({...f, hours:'', desc:''}));
    };
    const deleteHours = id => saveRompelData({...rompelData, hours: hours.filter(h=>h.id!==id)});
    const addExpense = () => {
      const a = Number(rompelExpForm.amount);
      if (!a || a <= 0) return;
      const entry = {id:'e_'+Date.now(), date: rompelExpForm.date, amount: a, desc: rompelExpForm.desc.trim()};
      const updated = {...rompelData, expenses: [...expenses, entry].sort((a,b)=>a.date.localeCompare(b.date))};
      saveRompelData(updated);
      setRompelExpForm(f=>({...f, amount:'', desc:''}));
    };
    const deleteExpense = id => saveRompelData({...rompelData, expenses: expenses.filter(e=>e.id!==id)});

    const cardStyle = {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(253,164,175,0.12)',borderRadius:'16px',padding:'18px',marginBottom:'16px'};
    const inputS = {padding:'10px 13px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(253,164,175,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',flex:1,minWidth:0};
    const btnS = (bg,col)=>({padding:'10px 18px',background:bg,border:'none',borderRadius:'10px',color:col||'white',cursor:'pointer',fontWeight:'700',fontSize:'14px',whiteSpace:'nowrap'});

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#1a0812 0%,#2d0820 45%,#150610 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn('#fda4af')}><Home size={16}/></button>
          <img src="/rompel.jpg" alt="Rompel" style={{width:'32px',height:'32px',borderRadius:'50%',objectFit:'cover',objectPosition:'center top',border:`2px solid ${accent}`,flexShrink:0}}/>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>Rompel Bereich</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'700px',margin:'0 auto'}}>

          {/* Saldo-Übersicht */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'24px'}}>
            {[
              {label:'Trainingsguthaben',value:`${totalGuthaben.toFixed(2)} €`,color:'#4ade80'},
              {label:'Offene Kosten',    value:`${totalAusgaben.toFixed(2)} €`,color:'#f87171'},
              {label:'Saldo',            value:`${saldo>=0?'+':''}${saldo.toFixed(2)} €`,color:saldo>=0?'#4ade80':'#f87171',big:true},
            ].map(({label,value,color,big})=>(
              <div key={label} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${color}33`,borderRadius:'14px',padding:'14px',textAlign:'center'}}>
                <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',color:'rgba(255,255,255,0.4)'}}>{label}</p>
                <p style={{margin:0,fontSize:big?'22px':'18px',fontWeight:'800',color}}>{value}</p>
              </div>
            ))}
          </div>

          {/* Trainingsstunden */}
          <div style={cardStyle}>
            <h3 style={{margin:'0 0 14px',color:accent,fontSize:'15px',fontWeight:'800'}}>🕐 Trainingsstunden</h3>
            <p style={{margin:'0 0 12px',fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>1 Stunde = 7,50 € · Gesamtguthaben: <strong style={{color:'#4ade80'}}>{totalGuthaben.toFixed(2)} €</strong></p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
              <input type="date" value={rompelHoursForm.date} onChange={e=>setRompelHoursForm(f=>({...f,date:e.target.value}))} style={{...inputS,flex:'0 0 140px'}}/>
              <input type="number" placeholder="Stunden" min="0.5" step="0.5" value={rompelHoursForm.hours} onChange={e=>setRompelHoursForm(f=>({...f,hours:e.target.value}))} style={{...inputS,flex:'0 0 100px'}}/>
              <input type="text" placeholder="Beschreibung (optional)" value={rompelHoursForm.desc} onChange={e=>setRompelHoursForm(f=>({...f,desc:e.target.value}))} style={inputS}/>
              <button onClick={addHours} style={btnS('rgba(74,222,128,0.15)')}>+ Hinzufügen</button>
            </div>
            {hours.length === 0 ? (
              <p style={{color:'rgba(255,255,255,0.25)',fontSize:'13px',textAlign:'center',padding:'12px'}}>Noch keine Stunden eingetragen.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {[...hours].reverse().map(h=>(
                  <div key={h.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 13px',background:'rgba(74,222,128,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:'10px'}}>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',flexShrink:0}}>{h.date}</span>
                    <span style={{fontWeight:'700',color:'#4ade80',flexShrink:0}}>{h.hours}h = {(h.hours*7.5).toFixed(2)} €</span>
                    <span style={{flex:1,fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{h.desc}</span>
                    <button onClick={()=>deleteHours(h.id)} style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ausgaben / Schulden */}
          <div style={cardStyle}>
            <h3 style={{margin:'0 0 14px',color:'#f87171',fontSize:'15px',fontWeight:'800'}}>💸 Offene Kosten / Schulden</h3>
            <p style={{margin:'0 0 12px',fontSize:'12px',color:'rgba(255,255,255,0.4)'}}>Gesamtschulden: <strong style={{color:'#f87171'}}>{totalAusgaben.toFixed(2)} €</strong></p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
              <input type="date" value={rompelExpForm.date} onChange={e=>setRompelExpForm(f=>({...f,date:e.target.value}))} style={{...inputS,flex:'0 0 140px'}}/>
              <input type="number" placeholder="Betrag €" min="0.01" step="0.01" value={rompelExpForm.amount} onChange={e=>setRompelExpForm(f=>({...f,amount:e.target.value}))} style={{...inputS,flex:'0 0 110px'}}/>
              <input type="text" placeholder="Beschreibung" value={rompelExpForm.desc} onChange={e=>setRompelExpForm(f=>({...f,desc:e.target.value}))} style={inputS}/>
              <button onClick={addExpense} style={btnS('rgba(248,113,113,0.15)')}>+ Hinzufügen</button>
            </div>
            {expenses.length === 0 ? (
              <p style={{color:'rgba(255,255,255,0.25)',fontSize:'13px',textAlign:'center',padding:'12px'}}>Keine offenen Kosten.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {[...expenses].reverse().map(e=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 13px',background:'rgba(248,113,113,0.04)',border:'1px solid rgba(248,113,113,0.1)',borderRadius:'10px'}}>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',flexShrink:0}}>{e.date}</span>
                    <span style={{fontWeight:'700',color:'#f87171',flexShrink:0}}>{Number(e.amount).toFixed(2)} €</span>
                    <span style={{flex:1,fontSize:'13px',color:'rgba(255,255,255,0.6)'}}>{e.desc}</span>
                    <button onClick={()=>deleteExpense(e.id)} style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── PFANDKASSE ──────────────────────────────────────────────────────────
  if (view === 'pfandkasse' && canAccessPfand()) {
    const accent = '#86efac';
    const entries = (pfandDaten.entries || []).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
    const totalEinnahmen = entries.filter(e=>e.type==='einnahme').reduce((s,e)=>s+(Number(e.amount)||0),0);
    const totalAusgaben  = entries.filter(e=>e.type==='ausgabe').reduce((s,e)=>s+(Number(e.amount)||0),0);
    const kassenstand    = totalEinnahmen - totalAusgaben;

    const isEditing = pfandEditId !== null;
    const editEntry = isEditing ? entries.find(e=>e.id===pfandEditId) : null;

    const resetForm = () => { setPfandForm({type:'einnahme',date:TODAY,amount:'',desc:''}); setPfandEditId(null); };

    const saveEntry = () => {
      const a = Number(pfandForm.amount);
      if (!a || a <= 0) return;
      if (pfandForm.type === 'ausgabe' && !pfandForm.desc.trim()) return;
      if (isEditing) {
        const updated = {...pfandDaten, entries: (pfandDaten.entries||[]).map(e=>e.id===pfandEditId?{...e,...pfandForm,amount:a}:e)};
        savePfandDaten(updated);
      } else {
        const entry = {id:'p_'+Date.now(), ...pfandForm, amount:a, createdBy: user?.uid||''};
        const updated = {...pfandDaten, entries:[...(pfandDaten.entries||[]),entry]};
        savePfandDaten(updated);
      }
      resetForm();
    };

    const deleteEntry = id => {
      if (!window.confirm('Eintrag löschen?')) return;
      savePfandDaten({...pfandDaten, entries:(pfandDaten.entries||[]).filter(e=>e.id!==id)});
    };

    const canModify = e => userRole==='admin' || e.createdBy===user?.uid;

    const inputS = {padding:'10px 13px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(134,239,172,0.2)',borderRadius:'10px',color:'white',fontSize:'14px',outline:'none',flex:1,minWidth:0};
    const cardS  = {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(134,239,172,0.1)',borderRadius:'16px',padding:'18px',marginBottom:'16px'};

    return (
      <div className="ttc-view-enter" key={viewKey} style={{minHeight:'100vh',background:'linear-gradient(170deg,#011a0a 0%,#02280e 45%,#010e05 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:'white'}}>
        <div className="ttc-sticky-hdr-light" style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>navTo('home')} style={s.btn(accent)}><Home size={16}/></button>
          <span style={{fontSize:'26px'}}>♻️</span>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>Pfandkasse</h1>
        </div>
        <div style={{padding:'20px',maxWidth:'700px',margin:'0 auto'}}>

          {/* Kassenstand-Übersicht */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'24px'}}>
            {[
              {label:'Gesamteinnahmen', value:`${totalEinnahmen.toFixed(2)} €`, color:'#4ade80'},
              {label:'Gesamtausgaben',  value:`${totalAusgaben.toFixed(2)} €`,  color:'#f87171'},
              {label:'Kassenstand',     value:`${kassenstand>=0?'+':''}${kassenstand.toFixed(2)} €`, color:kassenstand>=0?'#4ade80':'#f87171', big:true},
            ].map(({label,value,color,big})=>(
              <div key={label} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${color}33`,borderRadius:'14px',padding:'14px',textAlign:'center'}}>
                <p style={{margin:'0 0 4px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',color:'rgba(255,255,255,0.4)'}}>{label}</p>
                <p style={{margin:0,fontSize:big?'22px':'18px',fontWeight:'800',color}}>{value}</p>
              </div>
            ))}
          </div>

          {/* Neuer Eintrag */}
          <div style={cardS}>
            <h3 style={{margin:'0 0 14px',color:accent,fontSize:'15px',fontWeight:'800'}}>{isEditing?'✏️ Eintrag bearbeiten':'+ Neuer Eintrag'}</h3>

            {/* Typ-Auswahl */}
            <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
              {['einnahme','ausgabe'].map(t=>(
                <button key={t} onClick={()=>setPfandForm(f=>({...f,type:t}))}
                  style={{flex:1,padding:'9px',borderRadius:'10px',border:`1.5px solid ${pfandForm.type===t?(t==='einnahme'?'#4ade80':'#f87171'):'rgba(255,255,255,0.1)'}`,background:pfandForm.type===t?(t==='einnahme'?'rgba(74,222,128,0.12)':'rgba(248,113,113,0.12)'):'rgba(255,255,255,0.03)',color:pfandForm.type===t?(t==='einnahme'?'#4ade80':'#f87171'):'rgba(255,255,255,0.4)',fontWeight:'800',fontSize:'13px',cursor:'pointer',transition:'all 0.15s'}}>
                  {t==='einnahme'?'📥 Einnahme':'📤 Ausgabe'}
                </button>
              ))}
            </div>

            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'10px'}}>
              <input type="date" value={pfandForm.date} onChange={e=>setPfandForm(f=>({...f,date:e.target.value}))} style={{...inputS,flex:'0 0 140px'}}/>
              <input type="number" placeholder="Betrag €" min="0.01" step="0.01" value={pfandForm.amount} onChange={e=>setPfandForm(f=>({...f,amount:e.target.value}))} style={{...inputS,flex:'0 0 110px'}}/>
              <input type="text"
                placeholder={pfandForm.type==='ausgabe'?'Wofür? (Pflichtfeld)':'Anmerkung (optional)'}
                value={pfandForm.desc}
                onChange={e=>setPfandForm(f=>({...f,desc:e.target.value}))}
                style={inputS}/>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={saveEntry}
                disabled={!pfandForm.amount||(pfandForm.type==='ausgabe'&&!pfandForm.desc.trim())}
                style={{flex:1,padding:'11px',background:pfandForm.type==='einnahme'?'rgba(74,222,128,0.15)':'rgba(248,113,113,0.15)',border:`1px solid ${pfandForm.type==='einnahme'?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}`,borderRadius:'10px',color:pfandForm.type==='einnahme'?'#4ade80':'#f87171',fontWeight:'800',fontSize:'14px',cursor:'pointer',opacity:(!pfandForm.amount||(pfandForm.type==='ausgabe'&&!pfandForm.desc.trim()))?0.4:1}}>
                {isEditing?'Speichern':'Eintrag hinzufügen'}
              </button>
              {isEditing && <button onClick={resetForm} style={{padding:'11px 16px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'rgba(255,255,255,0.5)',fontWeight:'700',fontSize:'14px',cursor:'pointer'}}>Abbrechen</button>}
            </div>
          </div>

          {/* Eintrags-Liste */}
          <div style={cardS}>
            <h3 style={{margin:'0 0 14px',color:'rgba(255,255,255,0.6)',fontSize:'15px',fontWeight:'800'}}>📋 Alle Einträge</h3>
            {entries.length===0
              ? <p style={{color:'rgba(255,255,255,0.25)',fontSize:'13px',textAlign:'center',padding:'20px'}}>Noch keine Einträge vorhanden.</p>
              : <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                {entries.map(e=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 13px',background:e.type==='einnahme'?'rgba(74,222,128,0.04)':'rgba(248,113,113,0.04)',border:`1px solid ${e.type==='einnahme'?'rgba(74,222,128,0.12)':'rgba(248,113,113,0.12)'}`,borderRadius:'11px'}}>
                    <span style={{fontSize:'10px',fontWeight:'800',padding:'3px 7px',borderRadius:'6px',background:e.type==='einnahme'?'rgba(74,222,128,0.15)':'rgba(248,113,113,0.15)',color:e.type==='einnahme'?'#4ade80':'#f87171',flexShrink:0,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                      {e.type==='einnahme'?'Einnahme':'Ausgabe'}
                    </span>
                    <span style={{fontWeight:'800',fontSize:'15px',color:e.type==='einnahme'?'#4ade80':'#f87171',flexShrink:0}}>{Number(e.amount).toFixed(2)} €</span>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.35)',flexShrink:0}}>{e.date}</span>
                    <span style={{flex:1,fontSize:'13px',color:'rgba(255,255,255,0.55)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.desc||''}</span>
                    {canModify(e) && (<>
                      <button onClick={()=>{setPfandEditId(e.id);setPfandForm({type:e.type,date:e.date,amount:String(e.amount),desc:e.desc||''});window.scrollTo({top:0,behavior:'smooth'});}}
                        style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(147,197,253,0.08)',border:'1px solid rgba(147,197,253,0.15)',color:'#93c5fd',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Pencil size={11}/>
                      </button>
                      <button onClick={()=>deleteEntry(e.id)}
                        style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Trash2 size={11}/>
                      </button>
                    </>)}
                  </div>
                ))}
              </div>
            }
          </div>

        </div>
      </div>
    );
  }
}
