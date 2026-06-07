import React, { useState, useEffect } from 'react';
// Font: Inter via Google Fonts (injected at runtime for no build-step dependency)
if (typeof document !== 'undefined' && !document.getElementById('inter-font')) {
  const l = document.createElement('link');
  l.id = 'inter-font'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(l);
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
  absent_unexcused: { label: 'Fehlt unentschuldigt', color: '#6b7280', bg: '#f3f4f6', symbol: '–' },
  absent_excused:   { label: 'Fehlt entschuldigt',   color: '#d97706', bg: '#fef3c7', symbol: '~' },
};

const ROLE_CONFIG = {
  pending:    { label: 'Wartend',      color: '#dc2626', bg: '#fee2e2' },
  admin:      { label: 'Admin',        color: '#7c3aed', bg: '#ede9fe' },
  trainer:    { label: 'Trainer',      color: '#358941', bg: '#dcfce7' },
  eltern:     { label: 'Eltern',       color: '#2563eb', bg: '#dbeafe' },
  jugendlich: { label: 'Jugendliche',  color: '#d97706', bg: '#fef3c7' },
};

const WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

const emptySession = { subgroupIds: [], date: new Date().toISOString().split('T')[0], time: '17:00', trainer: '', info: '', repeat: false, repeatWeeks: 8 };

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
  const [activeGroup, setActiveGroup]       = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [activeChild, setActiveChild]       = useState(null);
  const [activeSession, setActiveSession]   = useState(null);

  const [trainingDate, setTrainingDate]         = useState(new Date().toISOString().split('T')[0]);
  const [newSubgroupName, setNewSubgroupName]   = useState('');
  const [newChildName, setNewChildName]         = useState('');
  const [moveChildId, setMoveChildId]           = useState(null);
  const [newSession, setNewSession]             = useState(emptySession);
  const [editingSession, setEditingSession]     = useState(null); // session being edited
  const [editForm, setEditForm]                 = useState({});
  const [deleteDialog, setDeleteDialog]         = useState(null);
  const [resetDialog, setResetDialog]           = useState(false);
  const [resetPassword, setResetPassword]       = useState('');
  const [resetError, setResetError]             = useState('');
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

  // ── Auth ─────────────────────────────────────────────────────
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
      onSnapshot(doc(db,'ttc','tournaments'),        s => setTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedSessions'),   s => setArchivedSessions(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','archivedTournaments'),s => setArchivedTournaments(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','notifications'),      s => setNotifications(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','teams'),              s => setTeams(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','matchdays'),          s => setMatchdays(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','appSettings'),        s => setAppSettings(s.exists()?{mannschaftEnabled:true,...s.data()}:{mannschaftEnabled:true})),
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
  const saveTournaments        = u => { setTournaments(u);        setDoc(doc(db,'ttc','tournaments'),        u); };
  const saveArchivedSessions   = u => { setArchivedSessions(u);   setDoc(doc(db,'ttc','archivedSessions'),   u); };
  const saveArchivedTournaments= u => { setArchivedTournaments(u);setDoc(doc(db,'ttc','archivedTournaments'),u); };
  const saveNotifications      = u => { setNotifications(u);      setDoc(doc(db,'ttc','notifications'),      u); };
  const saveTeams              = u => { setTeams(u);              setDoc(doc(db,'ttc','teams'),              u); };
  const saveMatchdays          = u => { setMatchdays(u);          setDoc(doc(db,'ttc','matchdays'),          u); };
  const saveAppSettings        = u => { setAppSettings(u);        setDoc(doc(db,'ttc','appSettings'),        u); };

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

  const getAllUpcomingSessions = () => {
    const cutoff = getSevenDaysAgo();
    return Object.values(sessions).filter(s=>s.date>=cutoff).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  };

  // Prüfen ob Eltern/Jugendliche das Kind für ein Datum abgemeldet/angemeldet haben
  const getParentResponse = (childId, date) => {
    const matching = Object.values(sessions).filter(s => s.date===date && (s.subgroupIds||[]).some(sid => children[childId]?.subgroupId===sid));
    for (const s of matching) {
      const r = (s.responses||{})[childId];
      if (r) return r; // 'coming' oder 'missing'
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

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) { setError('Bitte zuerst deine E-Mail eingeben!'); return; }
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      setError('');
      alert(`✅ Passwort-Reset E-Mail wurde an ${loginEmail} gesendet! Bitte prüfe dein Postfach.`);
    } catch {
      setError('E-Mail nicht gefunden. Bitte prüfe die Adresse.');
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

  // ── Training anlegen ─────────────────────────────────────────
  const createSession = () => {
    const { subgroupIds, date, time, trainer, info, repeat, repeatWeeks } = newSession;
    if (!date || !time || subgroupIds.length===0) { alert('Bitte mindestens eine Untergruppe auswählen!'); return; }
    const updated = { ...sessions };
    const repeatId = repeat ? 'repeat_' + Date.now() : null;
    if (repeat) {
      for (let i=0; i<repeatWeeks; i++) {
        const d = new Date(date+'T12:00:00');
        d.setDate(d.getDate()+i*7);
        const dateStr = d.toISOString().split('T')[0];
        const id = 'session_'+Date.now()+'_'+i;
        updated[id] = { id, subgroupIds, date:dateStr, time, trainer, info, repeatId, responses:{} };
      }
    } else {
      const id = 'session_'+Date.now();
      updated[id] = { id, subgroupIds, date, time, trainer, info, repeatId:null, responses:{} };
    }
    saveSessions(updated);
    setNewSession(emptySession);
  };

  const deleteSession = (id) => {
    if (!window.confirm('Diese Trainingseinheit löschen?')) return;
    const u={...sessions}; delete u[id]; saveSessions(u);
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
    const cur = (session.responses||{})[childId];
    const updated = { ...sessions, [sessionId]: { ...session, responses: { ...(session.responses||{}), [childId]: cur===response?null:response } } };
    saveSessions(updated);
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
  const saveChildAchievements = (childId, ach) => {
    const child = children[childId];
    if (!child) return;
    saveChildren({ ...children, [childId]: { ...child, achievements: ach } });
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
    wrap:  {maxWidth:'900px',margin:'0 auto',padding:'20px'},
    card:  {background:'white',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
    btn:   (bg,col='white',sm=false)=>({padding:sm?'6px 12px':'10px 16px',background:bg,color:col,border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:sm?'13px':'14px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}),
    input: {padding:'10px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',flex:1,minWidth:0},
    label: {fontSize:'13px',fontWeight:'600',color:'#555',marginBottom:'4px',display:'block'},
  };

  if (loading) return <div style={{...s.page(activeGroup?.color),display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'white',fontSize:'20px'}}>Laden...</p></div>;

  if (!user) return (
    <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        {/* Logo & Titel */}
        <div style={{textAlign:'center',marginBottom:'36px'}}>
          <div style={{width:'72px',height:'72px',borderRadius:'20px',background:'linear-gradient(135deg,#15803d,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',margin:'0 auto 16px',boxShadow:'0 8px 32px rgba(74,222,128,0.3)'}}>🏓</div>
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
                  <span>Ich bin ein Elternteil</span>
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
              <button onClick={handleForgotPassword} style={{background:'none',border:'none',color:'rgba(74,222,128,0.5)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                Passwort vergessen?
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
      <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{width:'100%',maxWidth:'420px'}}>
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'18px',background:'linear-gradient(135deg,#15803d,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',margin:'0 auto 14px',boxShadow:'0 8px 28px rgba(74,222,128,0.28)'}}>🏓</div>
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
                  <button key={role} onClick={()=>{ setUserRole(role); setShowRolePicker(false); setView('home'); }}
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
    <div style={{minHeight:'100vh',background:'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
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
            {view!=='home'&&<button onClick={()=>setView('home')} style={s.btn('#358941')} title="Startseite"><Home size={16}/></button>}
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
            {userRole==='admin'&&<button onClick={()=>setView('admin')} style={s.btn('#7c3aed')}><Shield size={16}/> Admin</button>}
            {canEdit()&&<button onClick={()=>setView('trainingsplan')} style={s.btn('#0369a1')}><Calendar size={16}/> Trainingsplan</button>}
            {canEdit()&&<button onClick={()=>setView('turniere')} style={s.btn('#b45309')}><Trophy size={16}/> Turniere</button>}
            {canEdit()&&<button onClick={()=>setView('archiv')} style={s.btn('#374151')}><Archive size={16}/> Archiv</button>}
            {canEdit()&&<button onClick={()=>setView('achievements')} style={s.btn('#7c3aed')}>🏅 Errungenschaften</button>}
            {canEdit()&&appSettings.mannschaftEnabled&&<button onClick={()=>setView('mannschaft')} style={s.btn('#0f766e')}>⚽ Mannschaft</button>}
            {canEdit()&&(()=>{
              // Badge = nur eingehende Eltern-Nachrichten für zugängliche Gruppen
              const unreadCount = Object.values(notifications).filter(n =>
                n.type === 'parent_message' && !n.trashedAt && canAccessGroup(n.toGroupId)
              ).length;
              return (
                <button onClick={()=>setView('notifications')} style={{...s.btn('#059669'),position:'relative'}} title="Benachrichtigungen">
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
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#0369a1')}><Home size={16}/></button>
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
          </div>
          <button onClick={createSession} style={s.btn('#0369a1')}>
            <Calendar size={18}/> {newSession.repeat?`${newSession.repeatWeeks} Einheiten anlegen`:'Einheit anlegen'}
          </button>
        </div>

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
                const coming=Object.values(responses).filter(r=>r==='coming').length;
                const missing=Object.values(responses).filter(r=>r==='missing').length;
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
                            {sessionIsPast&&<span style={{fontSize:'11px',fontWeight:'700',color:'white',background:'#dc2626',padding:'2px 8px',borderRadius:'20px'}}>Vergangen</span>}
                          </div>
                          <p style={{margin:'0 0 2px',fontWeight:'600',color:'#333'}}>
                            {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})} · {session.time} Uhr
                          </p>
                          {session.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#555'}}>👤 Trainer: {session.trainer}</p>}
                          {session.info&&<p style={{margin:'0 0 4px',fontSize:'13px',color:'#0369a1',display:'flex',alignItems:'center',gap:'4px'}}><Info size={13}/> {session.info}</p>}
                          <p style={{margin:0,fontSize:'12px',color:'#999'}}>✓ {coming} kommen · ✗ {missing} fehlen</p>
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
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#b45309')}><Home size={16}/></button>
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
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
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
                        <button onClick={()=>saveUserRoles(u.uid,['eltern'])}
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
                              const cur = u.roles && u.roles.length>0 ? u.roles : [u.role];
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
          <h2 style={{margin:'0 0 8px',color:'#dc2626',fontSize:'18px'}}>⚠️ Gefahrenzone</h2>
          <p style={{margin:'0 0 16px',color:'#666',fontSize:'14px'}}>
            Diese Aktion löscht <strong>alle Anwesenheitsdaten</strong> aller Kinder sowie alle geplanten Trainingseinheiten. Die Kinder selbst bleiben erhalten.
          </p>
          <div style={{display:'grid',gap:'10px'}}>
            <button onClick={()=>setResetDialog(true)} style={{...s.btn('#dc2626'),width:'100%',justifyContent:'center'}}>
              🗑️ Alle Anwesenheitsdaten zurücksetzen
            </button>
            <div style={{borderTop:'1px solid #fca5a5',paddingTop:'10px'}}>
              <p style={{margin:'0 0 10px',color:'#666',fontSize:'14px'}}>
                Löscht alle <strong>manuell gesendeten Trainer-Nachrichten</strong> aus allen Accounts. Automatische Benachrichtigungen (Training, Turnier, Fehlzeiten) bleiben erhalten.
              </p>
              <button onClick={adminDeleteAllTrainerMessages} style={{...s.btn('#b45309','white'),width:'100%',justifyContent:'center',background:'#fef3c7',color:'#92400e',border:'2px solid #d97706'}}>
                🔔 Alle Trainer-Nachrichten löschen
              </button>
            </div>
          </div>
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
                <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'16px',letterSpacing:'-0.3px'}}>TTC Grün-Weiß Staffel</p>
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

          {/* ── 1. Training diese Woche ──────────────────────────── */}
          <p style={{color:'rgba(74,222,128,0.45)',fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>Training diese Woche</p>
          <div style={{background:'rgba(74,222,128,0.03)',border:'1px solid rgba(74,222,128,0.12)',borderRadius:'20px',overflow:'hidden',marginBottom:'32px',boxShadow:'inset 0 1px 0 rgba(74,222,128,0.07)'}}>
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



  // ── GRUPPE ───────────────────────────────────────────────────
  if (view==='group') {
    const subs=getSubgroupsForGroup(activeGroup.id);
    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header/>
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:activeGroup.color}}>{activeGroup.emoji} {activeGroup.name}</h2>
          {canEdit()&&(
            <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
              <input style={s.input} placeholder="Neue Trainingsgruppe..." value={newSubgroupName} onChange={e=>setNewSubgroupName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addSubgroup()}/>
              <button onClick={addSubgroup} style={s.btn(activeGroup.color)}><Plus size={18}/> Gruppe</button>
            </div>
          )}
          <div style={{display:'grid',gap:'12px'}}>
            {subs.length===0
              ? <p style={{color:'#999',textAlign:'center',padding:'30px'}}>Noch keine Gruppen.</p>
              : subs.map(sub=>{
                const kids=getChildrenForSubgroup(sub.id);
                const presentToday=kids.filter(c=>(c.attendance||{})[trainingDate]==='present').length;
                return (
                  <div key={sub.id} style={{border:'1px solid #ddd',borderRadius:'10px',overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px',background:'#f8f9fa',cursor:'pointer'}} onClick={()=>{setActiveSubgroup(sub);setView('subgroup');}}>
                      <div>
                        <h3 style={{margin:'0 0 4px',color:'#333',fontSize:'17px'}}>{sub.name}</h3>
                        <p style={{margin:0,color:'#666',fontSize:'12px'}}>{kids.length} Kinder · {(sub.trainingDates||[]).length} Trainings · heute {presentToday} anwesend</p>
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <button onClick={e=>{e.stopPropagation();exportSubgroupExcel(sub);}} style={s.btn('#16a34a',undefined,true)}><Download size={15}/> Excel</button>
                        {canEdit()&&<button onClick={e=>{e.stopPropagation();deleteSubgroup(sub.id);}} style={{padding:'6px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={16}/></button>}
                        <ChevronDown size={20} color="#999" style={{transform:'rotate(-90deg)'}}/>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div></div>
    );
  }

  // ── UNTERGRUPPE ──────────────────────────────────────────────
  if (view==='subgroup') {
    const sub=subgroups[activeSubgroup.id]||activeSubgroup;
    const kids=getChildrenForSubgroup(sub.id);
    const allSubs=Object.values(subgroups);

    // Gesamtstatistik der Gruppe
    const totalPresent=kids.reduce((sum,c)=>sum+getAttendanceStats(c.id,sub.id).present,0);
    const totalSessions=(sub.trainingDates||[]).length;

    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header back backLabel={activeGroup.name} backAction={()=>setView('group')}/>
        <div style={s.card}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0,color:activeGroup.color}}>{sub.name}</h2>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>exportSubgroupExcel(sub)} style={s.btn('#16a34a',undefined,true)}><Download size={15}/> Excel</button>
              {canEdit()&&<button onClick={()=>deleteSubgroup(sub.id)} style={{padding:'6px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626'}}><Trash2 size={16}/></button>}
            </div>
          </div>

          {/* Gruppen-Gesamtstatistik */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'20px'}}>
            <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'24px',fontWeight:'700',color:'#333'}}>{kids.length}</p>
              <p style={{margin:0,fontSize:'11px',color:'#666'}}>Kinder</p>
            </div>
            <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'24px',fontWeight:'700',color:'#333'}}>{totalSessions}</p>
              <p style={{margin:0,fontSize:'11px',color:'#666'}}>Trainings gesamt</p>
            </div>
            <div style={{background:'#dcfce7',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'24px',fontWeight:'700',color:'#16a34a'}}>
                {kids.length>0&&totalSessions>0?Math.round((totalPresent/(kids.length*totalSessions))*100):0}%
              </p>
              <p style={{margin:0,fontSize:'11px',color:'#16a34a'}}>Ø Anwesenheit</p>
            </div>
          </div>

          {/* Kind hinzufügen */}
          {canEdit()&&(
            <div style={{display:'flex',gap:'8px',marginBottom:'20px',paddingBottom:'20px',borderBottom:'1px solid #eee'}}>
              <input style={s.input} placeholder="Kind hinzufügen..." value={newChildName} onChange={e=>setNewChildName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addChild()}/>
              <button onClick={addChild} style={s.btn(activeGroup.color)}><Plus size={18}/> Kind</button>
            </div>
          )}

          {/* Kinderliste - nur Statistiken */}
          <div style={{display:'grid',gap:'10px'}}>
            {kids.length===0
              ? <p style={{color:'#999',textAlign:'center',padding:'30px'}}>Noch keine Kinder. Oben hinzufügen!</p>
              : kids.map(child=>{
                const stats=getAttendanceStats(child.id,sub.id);
                const pct=stats.percent;
                return (
                  <div key={child.id}
                    onClick={()=>{setActiveChild(child);setView('childHistory');}}
                    style={{padding:'14px',borderRadius:'10px',border:'1px solid #ddd',background:'white',cursor:'pointer',transition:'box-shadow 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <div style={{flex:1}}>
                        <p style={{margin:'0 0 6px',fontWeight:'600',color:'#333',fontSize:'16px'}}>{child.name}</p>
                        {/* Fortschrittsbalken */}
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div style={{flex:1,background:'#f3f4f6',borderRadius:'99px',height:'8px',overflow:'hidden'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'#16a34a':pct>=60?'#d97706':'#dc2626',borderRadius:'99px'}}/>
                          </div>
                          <span style={{fontSize:'13px',fontWeight:'700',color:pct>=80?'#16a34a':pct>=60?'#d97706':'#dc2626',minWidth:'36px'}}>{pct}%</span>
                        </div>
                        <p style={{margin:'4px 0 0',fontSize:'12px',color:'#999'}}>
                          {stats.present}/{stats.total} Trainings · {stats.excused}x entschuldigt · {stats.unexcused}x unentschuldigt
                        </p>
                      </div>
                      <ChevronRight size={18} color="#999"/>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div></div>
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

    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header/>
        <div style={s.card}>
          {/* Session Info */}
          <div style={{marginBottom:'20px'}}>
            <h2 style={{margin:'0 0 8px',color:'#0369a1',fontSize:'22px'}}>
              {new Date(sessionDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · {session?.time} Uhr
            </h2>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'6px'}}>
              {sessionSubs.map(sub=>{
                const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                return <span key={sub.id} style={{fontSize:'13px',fontWeight:'700',color:grp?.color,background:'#f8f9fa',padding:'3px 10px',borderRadius:'20px',border:`1px solid ${grp?.color}`}}>{grp?.emoji} {sub.name}</span>;
              })}
            </div>
            {session?.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#555'}}>👤 Trainer: {session.trainer}</p>}
            {session?.info&&<div style={{display:'flex',gap:'6px',marginTop:'8px',padding:'8px',background:'#f0f9ff',borderRadius:'6px'}}><Info size={14} color="#0369a1" style={{flexShrink:0,marginTop:'2px'}}/><p style={{margin:0,fontSize:'13px',color:'#0369a1'}}>{session.info}</p></div>}
          </div>

          {/* Schnell-Statistik */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'20px'}}>
            <div style={{background:'#dcfce7',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'28px',fontWeight:'700',color:'#16a34a'}}>{presentCount}</p>
              <p style={{margin:0,fontSize:'12px',color:'#16a34a'}}>Anwesend</p>
            </div>
            <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'28px',fontWeight:'700',color:'#6b7280'}}>{absentCount}</p>
              <p style={{margin:0,fontSize:'12px',color:'#6b7280'}}>Unentschuldigt</p>
            </div>
            <div style={{background:'#fef3c7',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <p style={{margin:0,fontSize:'28px',fontWeight:'700',color:'#d97706'}}>{excusedCount}</p>
              <p style={{margin:0,fontSize:'12px',color:'#d97706'}}>Entschuldigt</p>
            </div>
          </div>

          {/* Kinderliste mit Anwesenheits-Buttons */}
          <div style={{display:'grid',gap:'10px'}}>
            {allKids.length===0
              ? <p style={{color:'#999',textAlign:'center',padding:'30px'}}>Keine Kinder in den zugewiesenen Gruppen.</p>
              : allKids.map(child=>{
                const currentChild = children[child.id] || child;
                const status = (currentChild.attendance||{})[sessionDate];
                const parentResponse = getParentResponse(child.id, sessionDate);
                const parentExcused = parentResponse==='missing';
                const parentComing = parentResponse==='coming';
                const sub = subgroups[child.subgroupId];

                return (
                  <div key={child.id} style={{
                    padding:'14px', borderRadius:'10px',
                    border: parentExcused&&!status?'2px solid #d97706': parentComing&&!status?'2px solid #16a34a':'1px solid #ddd',
                    background: status==='present'?'#f0fdf4': status==='absent_unexcused'?'#f9fafb': status==='absent_excused'?'#fffbeb':'white'
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'120px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                          <p style={{margin:0,fontWeight:'600',color:'#333',fontSize:'16px'}}>{child.name}</p>
                          {parentExcused&&<span style={{fontSize:'11px',fontWeight:'600',color:'#d97706',background:'#fef3c7',padding:'2px 8px',borderRadius:'20px',border:'1px solid #d97706'}}>Eltern abgemeldet</span>}
                          {parentComing&&<span style={{fontSize:'11px',fontWeight:'600',color:'#16a34a',background:'#dcfce7',padding:'2px 8px',borderRadius:'20px',border:'1px solid #16a34a'}}>Eltern angemeldet</span>}
                        </div>
                        {sub&&<p style={{margin:'2px 0 0',fontSize:'11px',color:'#999'}}>{sub.name}</p>}
                      </div>

                      {/* 3 Anwesenheits-Buttons */}
                      <div style={{display:'flex',gap:'8px'}}>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'present')}
                          style={{width:'50px',height:'50px',border:'2px solid #16a34a',background:status==='present'?'#16a34a':'white',color:status==='present'?'white':'#16a34a',borderRadius:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <Check size={26}/>
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_unexcused')}
                          style={{width:'50px',height:'50px',border:'2px solid #9ca3af',background:status==='absent_unexcused'?'#6b7280':'white',color:status==='absent_unexcused'?'white':'#6b7280',borderRadius:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',fontWeight:'700'}}>
                          –
                        </button>
                        <button onClick={()=>setSessionStatus(child.id, child.subgroupId, 'absent_excused')}
                          style={{width:'50px',height:'50px',border:'2px solid #d97706',background:status==='absent_excused'?'#d97706':'white',color:status==='absent_excused'?'white':'#d97706',borderRadius:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <Clock size={24}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Legende */}
          <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid #eee',display:'flex',gap:'16px',flexWrap:'wrap'}}>
            <span style={{fontSize:'13px',color:'#16a34a'}}>✓ Anwesend</span>
            <span style={{fontSize:'13px',color:'#6b7280'}}>– Fehlt unentschuldigt</span>
            <span style={{fontSize:'13px',color:'#d97706'}}>~ Fehlt entschuldigt</span>
          </div>

          {/* Archiv-Button */}
          {canEdit()&&(()=>{
            const archivable = isSessionArchivable(session);
            return (
              <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid #eee'}}>
                {archivable
                  ? <button onClick={()=>{if(window.confirm('Dieses Training archivieren? Es verschwindet aus der Übersicht, die Anwesenheitsdaten bleiben erhalten.')) archiveSession(session); setView('home');}}
                      style={{...s.btn('#374151'),width:'100%',justifyContent:'center'}}>
                      <Archive size={16}/> Training archivieren
                    </button>
                  : <p style={{margin:0,fontSize:'13px',color:'#999',textAlign:'center'}}>
                      ⏳ Archivieren möglich sobald alle {allKids.length} Kinder einen Status haben ({presentCount+absentCount+excusedCount}/{allKids.length} erfasst)
                    </p>
                }
              </div>
            );
          })()}
        </div>
      </div></div>
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

    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header back backLabel={sub?.name||'Zurück'} backAction={()=>setView('subgroup')}/>
        <div style={s.card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'8px'}}>
            <div>
              <h2 style={{margin:'0 0 4px',color:grp?.color||'#358941',fontSize:'22px'}}>{child.name}</h2>
              <p style={{margin:0,color:'#666',fontSize:'13px'}}>{grp?.emoji} {grp?.name} · {sub?.name}</p>
            </div>
            {canEdit()&&(
              <div style={{display:'flex',gap:'6px'}}>
                <button onClick={()=>setMoveChildId(moveChildId===child.id?null:child.id)} style={s.btn('#e0f2fe','#0369a1',true)}><MoveRight size={15}/> Verschieben</button>
                <button onClick={()=>deleteChild(child.id)} style={{padding:'6px 12px',background:'#fee2e2',border:'none',borderRadius:'6px',cursor:'pointer',color:'#dc2626',fontWeight:'600',fontSize:'13px',display:'flex',alignItems:'center',gap:'4px'}}><Trash2 size={14}/> Löschen</button>
              </div>
            )}
          </div>

          {/* Gruppe verschieben */}
          {moveChildId===child.id&&canEdit()&&(
            <div style={{marginBottom:'16px',padding:'12px',background:'#f0f9ff',borderRadius:'8px',border:'1px solid #bae6fd'}}>
              <p style={{margin:'0 0 8px',fontSize:'13px',fontWeight:'600',color:'#0369a1'}}>In welche Gruppe verschieben?</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                {allSubs.filter(sg=>sg.id!==child.subgroupId).map(sg=>{
                  const g=FIXED_GROUPS.find(f=>f.id===sg.groupId);
                  return <button key={sg.id} onClick={()=>moveChild(child.id,sg.id)} style={s.btn(g?.color||'#358941',undefined,true)}>{g?.emoji} {sg.name}</button>;
                })}
              </div>
            </div>
          )}

          {/* Statistik */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'20px'}}>
            {[{label:'Trainings',value:stats.total,color:'#333',bg:'#f8f9fa'},
              {label:'Anwesend',value:stats.present,color:'#16a34a',bg:'#dcfce7'},
              {label:'Unentschuldigt',value:stats.unexcused,color:'#6b7280',bg:'#f3f4f6'},
              {label:'Entschuldigt',value:stats.excused,color:'#d97706',bg:'#fef3c7'},
            ].map(({label,value,color,bg})=>(
              <div key={label} style={{background:bg,borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                <p style={{margin:0,fontSize:'24px',fontWeight:'700',color}}>{value}</p>
                <p style={{margin:0,fontSize:'11px',color}}>{label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{marginBottom:'24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'14px',fontWeight:'600'}}>Anwesenheitsquote</span>
              <span style={{fontSize:'14px',fontWeight:'700',color:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626'}}>{stats.percent}%</span>
            </div>
            <div style={{background:'#f3f4f6',borderRadius:'99px',height:'12px',overflow:'hidden'}}>
              <div style={{width:`${stats.percent}%`,height:'100%',background:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626',borderRadius:'99px'}}/>
            </div>
          </div>

          {/* ── Errungenschaften (für Trainer/Admin) – nur Jugendgruppe ── */}
          {grp?.id === 'jugend' && (()=>{
            const ach = getAchievements(child.id);
            const ttrUnlocked = ach.ttrUnlocked || [];
            const currentMonth = new Date().toISOString().slice(0,7);
            const currentLevel = getMonthlyAttendanceLevel(child.id, currentMonth);
            const cumul = getAttendanceCumulatives(child.id);
            const totalTrainings = getTotalTrainingsAttended(child.id);
            const streak = getLongestStreak(child.id);
            const tournParts = getTournamentParticipations(child.id);

            const Sec = ({title, children: ch}) => (
              <div style={{marginBottom:'14px'}}>
                <p style={{margin:'0 0 6px',fontSize:'11px',fontWeight:'700',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.5px'}}>{title}</p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>{ch}</div>
              </div>
            );

            const SmTile = ({icon,iconGray='⬜',label,sub,has,activeBg,activeBorder,activeTextColor='#333',onClick}) => (
              <button onClick={onClick}
                style={{padding:'7px 10px',borderRadius:'8px',border:`2px solid ${has?(activeBorder||'#e5e7eb'):'#e5e7eb'}`,background:has?(activeBg||'#f9fafb'):'#f9fafb',cursor:'pointer',textAlign:'center',minWidth:'64px',transition:'transform 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.07)'}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{fontSize:'18px'}}>{has?icon:iconGray}</div>
                <div style={{fontSize:'10px',fontWeight:'700',color:has?activeTextColor:'#9ca3af',marginTop:'2px',lineHeight:'1.2'}}>{label}</div>
                {sub&&<div style={{fontSize:'11px',fontWeight:'700',color:has?activeTextColor:'#9ca3af'}}>{sub}</div>}
              </button>
            );

            const openP = (icon,title,desc,count) => setAchievementPopup({icon,title,desc,count});

            return (
              <div style={{marginBottom:'24px',padding:'14px',background:'#f8f9fa',borderRadius:'12px',border:'1px solid #e5e7eb'}}>
                <h4 style={{margin:'0 0 12px',color:'#374151',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}>🏅 Errungenschaften</h4>

                {/* TTR */}
                <Sec title="TTR Meilensteine">
                  {TTR_MILESTONES.map((val,i)=>{
                    const unlocked = ttrUnlocked.includes(val);
                    const col = TTR_COLORS[i];
                    return (
                      <button key={val}
                        onClick={()=>openP('🏓',`${val} TTR`,unlocked?ACHIEVEMENT_DESCRIPTIONS.ttr(val):`Noch nicht erreicht. Ziel: ${val} TTR-Punkte.`)}
                        style={{padding:'6px 9px',borderRadius:'8px',border:`2px solid ${unlocked?col.bg:'#e5e7eb'}`,background:unlocked?col.bg:'#f3f4f6',color:unlocked?col.text:'#9ca3af',fontWeight:'700',fontSize:'11px',cursor:'pointer',minWidth:'48px',transition:'transform 0.1s'}}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                        {unlocked?'🏓 ':''}{val}
                      </button>
                    );
                  })}
                </Sec>

                {/* Trainings-Meilensteine */}
                <Sec title="Trainings-Meilensteine">
                  {[10,25,50,100,200,500,1000].map(m=>{
                    const has=totalTrainings>=m;
                    return <SmTile key={m} icon="🏋️" label={`${m}×`} sub={has?'✓':`${totalTrainings}/${m}`}
                      has={has} activeBg="#f0fdf4" activeBorder="#16a34a" activeTextColor="#15803d"
                      onClick={()=>openP('🏋️',`${m} Trainings`,`Insgesamt ${m} Trainingseinheiten absolviert. Aktuell: ${totalTrainings}.`)}/>;
                  })}
                  {[5,10,20,30,50].map(m=>{
                    const has=streak>=m;
                    return <SmTile key={`s${m}`} icon="🔥" label={`${m}er Serie`} sub={has?'✓':`${streak}/${m}`}
                      has={has} activeBg="#fff7ed" activeBorder="#f97316" activeTextColor="#c2410c"
                      onClick={()=>openP('🔥',`${m}er Trainingsserie`,`${m} Trainings in Folge. Längste Serie: ${streak}.`)}/>;
                  })}
                </Sec>

                {/* Turnier-Teilnahmen */}
                <Sec title="Turnier-Teilnahmen">
                  {[1,5,10,20].map(m=>{
                    const has=tournParts>=m;
                    return <SmTile key={m} icon="🏆" label={`${m}×`} sub={has?'✓':`${tournParts}/${m}`}
                      has={has} activeBg="#fffbeb" activeBorder="#f59e0b" activeTextColor="#92400e"
                      onClick={()=>openP('🏆',`${m} Turnier${m>1?'e':''}`,`An ${m} Turnier${m>1?'en':''} teilgenommen. Bisher: ${tournParts}.`)}/>;
                  })}
                </Sec>

                {/* Turnierergebnisse */}
                <Sec title="Turnierergebnisse Einzel">
                  {[
                    {icon:'🥇',label:'1.',field:'einzel1',desc:ACHIEVEMENT_DESCRIPTIONS.einzel1},
                    {icon:'🥈',label:'2.',field:'einzel2',desc:ACHIEVEMENT_DESCRIPTIONS.einzel2},
                    {icon:'🥉',label:'3.',field:'einzel3',desc:ACHIEVEMENT_DESCRIPTIONS.einzel3},
                  ].map(({icon,label,field,desc})=>{
                    const count=ach[field]||0;
                    return <SmTile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                      has={count>0} activeBg="#fffbeb" activeBorder="#fde68a" activeTextColor="#b45309"
                      onClick={()=>openP(icon,label,desc,count)}/>;
                  })}
                </Sec>

                <Sec title="Turnierergebnisse Doppel">
                  {[
                    {icon:'🥇',label:'1.',field:'doppel1',desc:ACHIEVEMENT_DESCRIPTIONS.doppel1},
                    {icon:'🥈',label:'2.',field:'doppel2',desc:ACHIEVEMENT_DESCRIPTIONS.doppel2},
                    {icon:'🥉',label:'3.',field:'doppel3',desc:ACHIEVEMENT_DESCRIPTIONS.doppel3},
                  ].map(({icon,label,field,desc})=>{
                    const count=ach[field]||0;
                    return <SmTile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                      has={count>0} activeBg="#fffbeb" activeBorder="#fde68a" activeTextColor="#b45309"
                      onClick={()=>openP(icon,label,desc,count)}/>;
                  })}
                </Sec>

                <Sec title="Mannschaft & Auszeichnungen">
                  {[
                    {icon:'🏆',label:'Meisterschaft',field:'team',desc:ACHIEVEMENT_DESCRIPTIONS.team},
                    {icon:'⭐',label:'Spieler d.M.',field:'spielerDesMonats',desc:'Zum Spieler des Monats gewählt.'},
                  ].map(({icon,label,field,desc})=>{
                    const count=ach[field]||0;
                    return <SmTile key={field} icon={icon} label={label} sub={count>0?`×${count}`:undefined}
                      has={count>0} activeBg="#fffbeb" activeBorder="#fcd34d" activeTextColor="#b45309"
                      onClick={()=>openP(icon,label,desc,count)}/>;
                  })}
                </Sec>

                {/* Anwesenheits-Monate */}
                <Sec title={`Akt. Monat (${new Date().toLocaleDateString('de-DE',{month:'long'})})`}>
                  {(()=>{
                    const attCfgMap = {
                      gold:  {icon:'🥇',color:'#b45309',bg:'#fef3c7',border:'#fde68a',label:'Gold (100%)'},
                      silver:{icon:'🥈',color:'#6b7280',bg:'#f3f4f6',border:'#d1d5db',label:'Silber (≥90%)'},
                      bronze:{icon:'🥉',color:'#92400e',bg:'#fef9c3',border:'#fde68a',label:'Bronze (≥80%)'},
                    };
                    const cfg = currentLevel ? attCfgMap[currentLevel] : null;
                    return (
                      <SmTile icon={cfg?cfg.icon:'📅'} label={cfg?cfg.label:'Kein Rang'} has={!!cfg}
                        activeBg={cfg?.bg} activeBorder={cfg?.border} activeTextColor={cfg?.color||'#9ca3af'}
                        onClick={()=>openP(cfg?cfg.icon:'📅','Akt. Monat',cfg?cfg.label:'Noch kein Rang diesen Monat.')}/>
                    );
                  })()}
                </Sec>

                <Sec title="Anwesenheits-Monate (Gesamt)">
                  {[
                    {icon:'🥇',label:'Gold',count:cumul.gold,bg:'#fef3c7',border:'#fde68a',color:'#b45309',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceGold},
                    {icon:'🥈',label:'Silber',count:cumul.silver,bg:'#f3f4f6',border:'#d1d5db',color:'#6b7280',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceSilver},
                    {icon:'🥉',label:'Bronze',count:cumul.bronze,bg:'#fef9c3',border:'#fde68a',color:'#92400e',desc:ACHIEVEMENT_DESCRIPTIONS.attendanceBronze},
                  ].map(({icon,label,count,bg,border,color,desc})=>(
                    <SmTile key={label} icon={icon} label={label} sub={count>0?`${count}×`:undefined}
                      has={count>0} activeBg={bg} activeBorder={border} activeTextColor={color}
                      onClick={()=>openP(icon,`${label}-Monate`,desc,count)}/>
                  ))}
                </Sec>
              </div>
            );
          })()}

          {/* Trainings-Verlauf mit bearbeitbarer Anwesenheit */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <h3 style={{margin:0,color:'#333'}}>Trainings-Verlauf</h3>
            {canEdit()&&(
              <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',background:'#f0f9ff',borderRadius:'20px',border:'1px solid #bae6fd'}}>
                <Edit2 size={12} color="#0369a1"/>
                <span style={{fontSize:'12px',color:'#0369a1',fontWeight:'600'}}>Anwesenheit anpassbar</span>
              </div>
            )}
          </div>
          <div style={{display:'grid',gap:'8px'}}>
            {dates.length===0
              ? <p style={{color:'#999',textAlign:'center',padding:'20px'}}>Noch keine Trainings erfasst.</p>
              : dates.map(date=>{
                const status=(child.attendance||{})[date];
                const cfg=STATUS_CONFIG[status];
                const parentResponse=getParentResponse(child.id, date);
                const parentExcused=parentResponse==='missing';
                const parentComing=parentResponse==='coming';
                return (
                  <div key={date} style={{padding:'12px 14px',background:cfg?.bg||'#f9fafb',borderRadius:'8px',border:'1px solid #eee'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <p style={{margin:'0 0 3px',fontSize:'14px',color:'#333',fontWeight:'500'}}>
                          {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                        </p>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          {parentExcused&&<span style={{fontSize:'11px',fontWeight:'600',color:'#d97706',background:'#fef3c7',padding:'1px 6px',borderRadius:'10px',border:'1px solid #d97706'}}>Eltern abgemeldet</span>}
                          {parentComing&&<span style={{fontSize:'11px',fontWeight:'600',color:'#16a34a',background:'#dcfce7',padding:'1px 6px',borderRadius:'10px',border:'1px solid #16a34a'}}>Eltern angemeldet</span>}
                        </div>
                      </div>
                      {canEdit() ? (
                        /* Anwesenheits-Buttons zum Anpassen */
                        <div style={{display:'flex',gap:'5px'}}>
                          <button onClick={()=>setChildStatus(date,'present')}
                            style={{width:'36px',height:'36px',border:'2px solid #16a34a',background:status==='present'?'#16a34a':'white',color:status==='present'?'white':'#16a34a',borderRadius:'6px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <Check size={18}/>
                          </button>
                          <button onClick={()=>setChildStatus(date,'absent_unexcused')}
                            style={{width:'36px',height:'36px',border:'2px solid #9ca3af',background:status==='absent_unexcused'?'#6b7280':'white',color:status==='absent_unexcused'?'white':'#6b7280',borderRadius:'6px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700'}}>
                            –
                          </button>
                          <button onClick={()=>setChildStatus(date,'absent_excused')}
                            style={{width:'36px',height:'36px',border:'2px solid #d97706',background:status==='absent_excused'?'#d97706':'white',color:status==='absent_excused'?'white':'#d97706',borderRadius:'6px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <Clock size={16}/>
                          </button>
                        </div>
                      ) : (
                        <span style={{fontSize:'13px',fontWeight:'600',color:cfg?.color||'#999',background:'white',padding:'4px 10px',borderRadius:'20px',border:`1px solid ${cfg?.color||'#ddd'}`}}>
                          {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Neues Training manuell hinzufügen */}
          {canEdit()&&(
            <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid #eee'}}>
              <p style={{margin:'0 0 10px',fontSize:'13px',fontWeight:'600',color:'#555'}}>Training manuell hinzufügen:</p>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)} style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px'}}/>
                <div style={{display:'flex',gap:'5px'}}>
                  <button onClick={()=>setChildStatus(trainingDate,'present')}
                    style={{...s.btn('#16a34a',undefined,true),gap:'4px'}}><Check size={14}/> Da</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_unexcused')}
                    style={{...s.btn('#6b7280',undefined,true),gap:'4px'}}>– Unentsch.</button>
                  <button onClick={()=>setChildStatus(trainingDate,'absent_excused')}
                    style={{...s.btn('#d97706',undefined,true),gap:'4px'}}><Clock size={14}/> Entsch.</button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // ── ERRUNGENSCHAFTEN VIEW (Trainer/Admin) ────────────────────────────────
  if (view === 'achievements') {
    // Achievements only for Jugendgruppe children, filtered by trainer's access
    const jugendSubs = Object.values(subgroups).filter(sg=>sg.groupId==='jugend'&&canAccessGroup('jugend'));
    const jugendSubIds = new Set(jugendSubs.map(sg=>sg.id));
    const kidsWithSub = Object.values(children)
      .filter(c => jugendSubIds.has(c.subgroupId))
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
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#7c3aed')}><Home size={16}/></button>
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

                const toggleTTR = (val) => {
                  const wasUnlocked = ttrUnlocked.includes(val);
                  const next = wasUnlocked ? ttrUnlocked.filter(v=>v!==val) : [...ttrUnlocked, val];
                  saveChildAchievements(child.id, {...ach, ttrUnlocked: next});
                  if (!wasUnlocked) {
                    createNotification(child.id, 'achievement', '🏓 TTR-Meilenstein erreicht!',
                      `Glückwunsch ${child.name}! Du hast einen TTR-Wert von ${val} erreicht. ${ACHIEVEMENT_DESCRIPTIONS.ttr(val)}`);
                  }
                };
                const ACH_LABELS = {
                  einzel1:'🥇 1. Platz Einzel', einzel2:'🥈 2. Platz Einzel', einzel3:'🥉 3. Platz Einzel',
                  doppel1:'🥇 1. Platz Doppel', doppel2:'🥈 2. Platz Doppel', doppel3:'🥉 3. Platz Doppel',
                  team:'🏆 Mannschaftsmeister', spielerDesMonats:'⭐ Spieler des Monats',
                };
                const incField = (field) => {
                  saveChildAchievements(child.id, {...ach, [field]: (ach[field]||0)+1});
                  const label = ACH_LABELS[field] || field;
                  createNotification(child.id, 'achievement', `${label}`,
                    `Glückwunsch ${child.name}! Du hast eine neue Errungenschaft erhalten: ${label}. Weiter so! 🎉`);
                };
                const decField = (field) => saveChildAchievements(child.id, {...ach, [field]: Math.max(0,(ach[field]||0)-1)});

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
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#059669')}><Home size={16}/></button>
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
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f4c3a 0%,#134e4a 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#0f766e')}><Home size={16}/></button>
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
  if (view === 'archiv') {
    const sortedArchivedSessions    = Object.values(archivedSessions).filter(s=>canAccessSession(s)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const sortedArchivedTournaments = Object.values(archivedTournaments).sort((a,b)=>(b.dateFrom||b.date||'').localeCompare(a.dateFrom||a.date||''));
    // Attendance status config
    const attCfg = {
      present:          { label:'Anwesend',     color:'#16a34a', bg:'#dcfce7', symbol:'✅' },
      absent_unexcused: { label:'Unentschuldigt',color:'#6b7280',bg:'#f3f4f6', symbol:'–'  },
      absent_excused:   { label:'Entschuldigt', color:'#d97706', bg:'#fef3c7', symbol:'⏰' },
    };

    return (
      <>
      {editingArchivedTourn && <ArchiveTournEditDialog tournament={editingArchivedTourn} onClose={()=>setEditingArchivedTourn(null)} onSave={saveArchivedTournEdit}/>}
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a3a2a 0%,#2d5a3d 100%)',fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif"}}>
        {/* Header */}
        <div style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',padding:'12px 20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <button onClick={()=>setView('home')} style={s.btn('#358941')}><Home size={16}/></button>
          <h1 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800',flex:1,letterSpacing:'-0.3px'}}>📦 Archiv</h1>
        </div>

        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          {/* Tabs */}
          <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
            {[['sessions','🏋️ Archiv Training'],['tournaments','🏆 Archiv Turniere']].map(([key,label])=>(
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
                                        {k:'absent_unexcused',icon:'–',  title:'Unentschuldigt', active:'#6b7280', border:'#9ca3af'},
                                        {k:'absent_excused',  icon:'⏰', title:'Entschuldigt',   active:'#d97706', border:'#d97706'},
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
        </div>
      </div>
      </>
    );
  }
}
