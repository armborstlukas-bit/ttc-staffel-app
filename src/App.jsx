import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import {
  Check, Plus, Trash2, Download, ChevronDown, LogOut,
  ArrowLeft, Clock, BarChart2, MoveRight, Link, Users, Shield
} from 'lucide-react';

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
  admin:     { label: 'Admin',       color: '#7c3aed', bg: '#ede9fe' },
  trainer:   { label: 'Trainer',     color: '#358941', bg: '#dcfce7' },
  eltern:    { label: 'Eltern',      color: '#2563eb', bg: '#dbeafe' },
  jugendlich:{ label: 'Jugendliche', color: '#d97706', bg: '#fef3c7' },
};

// Einladungscodes (fest, kannst du ändern)
const INVITE_CODES = {
  'TRAINER-TTC2026':    'trainer',
  'ELTERN-TTC2026':     'eltern',
  'JUGEND-TTC2026':     'jugendlich',
};

export default function TrainingsApp() {
  const [user, setUser]           = useState(null);
  const [userRole, setUserRole]   = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [subgroups, setSubgroups] = useState({});
  const [children, setChildren]   = useState({});
  const [allUsers, setAllUsers]   = useState({});

  const [view, setView]               = useState('home');
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [activeChild, setActiveChild] = useState(null);

  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [newChildName, setNewChildName]       = useState('');
  const [moveChildId, setMoveChildId]         = useState(null);

  // Auth
  const [authMode, setAuthMode]       = useState('login');
  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName]     = useState('');
  const [inviteCode, setInviteCode]   = useState('');
  const [error, setError]             = useState('');

  // Admin
  const [generatedLinks, setGeneratedLinks] = useState({});

  // ── Auth State ──────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          setUserRole(snap.data().role);
          setUserProfile(snap.data());
        }
      } else {
        setUser(null); setUserRole(null); setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  // ── Firestore Listeners ─────────────────────────────────────
  useEffect(() => {
    if (!user || !userRole) return;
    const unsubs = [
      onSnapshot(doc(db, 'ttc', 'subgroups'), snap => setSubgroups(snap.exists() ? snap.data() : {})),
      onSnapshot(doc(db, 'ttc', 'children'),  snap => setChildren(snap.exists()  ? snap.data() : {})),
    ];
    if (userRole === 'admin') {
      unsubs.push(onSnapshot(doc(db, 'ttc', 'users'), snap => setAllUsers(snap.exists() ? snap.data() : {})));
    }
    return () => unsubs.forEach(u => u());
  }, [user, userRole]);

  // ── Speichern ───────────────────────────────────────────────
  const saveSubgroups = (u) => { setSubgroups(u); setDoc(doc(db,'ttc','subgroups'), u); };
  const saveChildren  = (u) => { setChildren(u);  setDoc(doc(db,'ttc','children'),  u); };

  // ── Hilfsfunktionen ─────────────────────────────────────────
  const canEdit = () => ['admin','trainer'].includes(userRole);

  const getSubgroupsForGroup = (gid) => Object.values(subgroups).filter(s => s.groupId === gid);

  const getChildrenForSubgroup = (sid) =>
    Object.values(children)
      .filter(c => c.subgroupId === sid)
      .sort((a,b) => a.name.localeCompare(b.name, 'de'));

  // Für Eltern/Jugendliche: nur verknüpftes Kind
  const getMyChild = () => {
    if (!userProfile?.linkedChildId) return null;
    return children[userProfile.linkedChildId] || null;
  };

  const getAttendanceStats = (childId, subgroupId) => {
    const child = children[childId];
    const sub   = subgroups[subgroupId];
    if (!child || !sub) return { present:0, unexcused:0, excused:0, total:0, percent:0 };
    const dates = sub.trainingDates || [];
    const att   = child.attendance || {};
    const present  = dates.filter(d => att[d]==='present').length;
    const unexcused= dates.filter(d => att[d]==='absent_unexcused').length;
    const excused  = dates.filter(d => att[d]==='absent_excused').length;
    return { present, unexcused, excused, total:dates.length,
      percent: dates.length>0 ? Math.round((present/dates.length)*100) : 0 };
  };

  // ── Auth Handler ────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    try { await signInWithEmailAndPassword(auth, loginEmail, loginPassword); }
    catch { setError('Login fehlgeschlagen. Email oder Passwort falsch!'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError('');
    const code = inviteCode.trim().toUpperCase();
    const role = INVITE_CODES[code];
    if (!role) { setError('Ungültiger Einladungscode!'); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const profile = { uid: cred.user.uid, email: loginEmail, name: loginName, role, linkedChildId: null };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      // Auch in allUsers speichern
      const usersSnap = await getDoc(doc(db,'ttc','users'));
      const current = usersSnap.exists() ? usersSnap.data() : {};
      await setDoc(doc(db,'ttc','users'), { ...current, [cred.user.uid]: profile });
      setUserRole(role);
      setUserProfile(profile);
    } catch (err) {
      setError('Registrierung fehlgeschlagen: ' + err.message);
    }
  };

  // ── Gruppen & Kinder ────────────────────────────────────────
  const addSubgroup = () => {
    if (!newSubgroupName.trim()) return;
    const id = 'sub_' + Date.now();
    saveSubgroups({ ...subgroups, [id]: { id, name: newSubgroupName, groupId: activeGroup.id, trainingDates: [] } });
    setNewSubgroupName('');
  };

  const deleteSubgroup = (sid) => {
    if (!window.confirm('Untergruppe löschen?')) return;
    const u = {...subgroups}; delete u[sid]; saveSubgroups(u);
  };

  const addChild = () => {
    if (!newChildName.trim()) return;
    const id = 'child_' + Date.now();
    saveChildren({ ...children, [id]: { id, name: newChildName, subgroupId: activeSubgroup.id, attendance: {} } });
    setNewChildName('');
  };

  const deleteChild = (cid) => {
    if (!window.confirm('Kind wirklich löschen?')) return;
    const u = {...children}; delete u[cid]; saveChildren(u);
  };

  const moveChild = (cid, newSid) => {
    saveChildren({ ...children, [cid]: { ...children[cid], subgroupId: newSid } });
    setMoveChildId(null);
  };

  const ensureTrainingDate = (sid, date) => {
    const sub = subgroups[sid];
    if (!sub) return;
    const dates = sub.trainingDates || [];
    if (!dates.includes(date))
      saveSubgroups({ ...subgroups, [sid]: { ...sub, trainingDates: [...dates, date].sort() } });
  };

  const setStatus = (childId, status) => {
    ensureTrainingDate(activeSubgroup.id, trainingDate);
    const child = children[childId];
    const cur   = (child.attendance||{})[trainingDate];
    const next  = cur===status ? null : status;
    const att   = { ...(child.attendance||{}), [trainingDate]: next };
    if (next===null) delete att[trainingDate];
    saveChildren({ ...children, [childId]: { ...child, attendance: att } });
  };

  // Eltern/Jugendliche: eigenes Kind entschuldigen
  const excuseMyChild = (date) => {
    const child = getMyChild();
    if (!child) return;
    const att = { ...(child.attendance||{}), [date]: 'absent_excused' };
    saveChildren({ ...children, [child.id]: { ...child, attendance: att } });
  };

  // ── Admin: Nutzer-Rolle ändern ───────────────────────────────
  const changeUserRole = async (uid, newRole) => {
    const updated = { ...allUsers, [uid]: { ...allUsers[uid], role: newRole } };
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users', uid), { ...allUsers[uid], role: newRole });
    setAllUsers(updated);
  };

  // Admin: Kind mit User verknüpfen
  const linkChildToUser = async (uid, childId) => {
    const updated = { ...allUsers, [uid]: { ...allUsers[uid], linkedChildId: childId } };
    await setDoc(doc(db,'ttc','users'), updated);
    await setDoc(doc(db,'users', uid), { ...allUsers[uid], linkedChildId: childId });
    setAllUsers(updated);
  };

  // ── Excel Export ─────────────────────────────────────────────
  const exportSubgroupExcel = (sub) => {
    const kids  = getChildrenForSubgroup(sub.id);
    const dates = (sub.trainingDates||[]).sort();
    const grp   = FIXED_GROUPS.find(g => g.id===sub.groupId);
    const standDatum = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
    let csv = `TTC Grün-Weiß Staffel\n${grp?.name} - ${sub.name}\nExportiert am: ${standDatum}\n\n`;
    csv += `Datum;Name;Anwesend;Entschuldigt;Unentschuldigt\n`;
    dates.forEach(date => {
      const d = new Date(date+'T12:00:00').toLocaleDateString('de-DE');
      kids.forEach(child => {
        const s = (child.attendance||{})[date];
        csv += `${d};${child.name};${s==='present'?1:0};${s==='absent_excused'?1:0};${s==='absent_unexcused'?1:0}\n`;
      });
    });
    csv += `\nZusammenfassung\nName;Trainings;Anwesend;Entschuldigt;Unentschuldigt;Quote\n`;
    kids.forEach(child => {
      const st = getAttendanceStats(child.id, sub.id);
      csv += `${child.name};${st.total};${st.present};${st.excused};${st.unexcused};${st.percent}%\n`;
    });
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TTC_${grp?.name}_${sub.name}_Stand_${standDatum}.csv`;
    link.click();
  };

  // ── Styles ───────────────────────────────────────────────────
  const s = {
    page:  { minHeight:'100vh', background:'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', fontFamily:'system-ui,-apple-system,sans-serif' },
    wrap:  { maxWidth:'900px', margin:'0 auto', padding:'20px' },
    card:  { background:'white', borderRadius:'12px', padding:'20px', marginBottom:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' },
    btn:   (bg,col='white',sm=false) => ({ padding:sm?'6px 12px':'10px 16px', background:bg, color:col, border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:sm?'13px':'14px', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap' }),
    input: { padding:'10px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', flex:1, minWidth:0 },
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'white', fontSize:'20px' }}>Laden...</p>
    </div>
  );

  // ── LOGIN / REGISTER ─────────────────────────────────────────
  if (!user) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'white', borderRadius:'16px', padding:'40px', maxWidth:'420px', width:'100%', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin:'0 0 4px', color:'#358941', fontSize:'28px', textAlign:'center' }}>TTC Grün-Weiß Staffel</h1>
        <p style={{ margin:'0 0 28px', color:'#666', textAlign:'center' }}>Vereinsapp</p>
        {error && <p style={{ color:'red', marginBottom:'16px', fontSize:'13px', textAlign:'center' }}>{error}</p>}

        <div style={{ display:'flex', marginBottom:'20px', borderRadius:'8px', overflow:'hidden', border:'1px solid #ddd' }}>
          {['login','register'].map(m => (
            <button key={m} onClick={()=>{ setAuthMode(m); setError(''); }}
              style={{ flex:1, padding:'10px', background:authMode===m?'#358941':'white', color:authMode===m?'white':'#666', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
              {m==='login'?'Anmelden':'Registrieren'}
            </button>
          ))}
        </div>

        <form onSubmit={authMode==='login' ? handleLogin : handleRegister}
          style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {authMode==='register' && (
            <input placeholder="Dein Name" value={loginName} onChange={e=>setLoginName(e.target.value)} required
              style={{ ...s.input, flex:'none' }} />
          )}
          <input type="email" placeholder="E-Mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required
            style={{ ...s.input, flex:'none' }} />
          <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
            style={{ ...s.input, flex:'none' }} />
          {authMode==='register' && (
            <input placeholder="Einladungscode" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} required
              style={{ ...s.input, flex:'none', borderColor:'#358941', borderWidth:'2px' }} />
          )}
          <button type="submit" style={{ padding:'12px', background:'#358941', color:'white', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:'pointer' }}>
            {authMode==='login'?'Anmelden':'Registrieren'}
          </button>
        </form>

        {authMode==='register' && (
          <div style={{ marginTop:'16px', padding:'12px', background:'#f0fdf4', borderRadius:'8px', fontSize:'13px', color:'#358941' }}>
            Du benötigst einen Einladungscode vom Trainer oder Admin.
          </div>
        )}
      </div>
    </div>
  );

  // ── HEADER ───────────────────────────────────────────────────
  const Header = ({ back, backLabel, backAction }) => {
    const roleCfg = ROLE_CONFIG[userRole] || {};
    return (
      <div style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {back && <button onClick={backAction} style={s.btn('#f3f4f6','#333')}><ArrowLeft size={18}/> {backLabel}</button>}
          <div>
            <h1 style={{ margin:'0 0 2px', color:'#358941', fontSize:'20px' }}>TTC Grün-Weiß Staffel</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <p style={{ margin:0, color:'#999', fontSize:'12px' }}>{userProfile?.name || user?.email}</p>
              <span style={{ fontSize:'11px', fontWeight:'700', color:roleCfg.color, background:roleCfg.bg, padding:'2px 8px', borderRadius:'20px' }}>
                {roleCfg.label}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {userRole==='admin' && (
            <button onClick={()=>setView('admin')} style={s.btn('#7c3aed')}><Shield size={16}/> Admin</button>
          )}
          <button onClick={()=>signOut(auth)} style={s.btn('#ef4444')}><LogOut size={16}/> Abmelden</button>
        </div>
      </div>
    );
  };

  // ── ELTERN / JUGENDLICHE VIEW ────────────────────────────────
  if (['eltern','jugendlich'].includes(userRole)) {
    const myChild = getMyChild();
    const sub = myChild ? subgroups[myChild.subgroupId] : null;
    const grp = sub ? FIXED_GROUPS.find(g => g.id===sub.groupId) : null;
    const dates = (sub?.trainingDates||[]).sort().reverse();
    const stats = myChild ? getAttendanceStats(myChild.id, myChild.subgroupId) : null;

    return (
      <div style={s.page}><div style={s.wrap}>
        <Header />
        {!myChild ? (
          <div style={{ ...s.card, textAlign:'center', padding:'40px' }}>
            <p style={{ fontSize:'18px', color:'#666' }}>Dein Account ist noch keinem Kind zugeordnet.</p>
            <p style={{ color:'#999', fontSize:'14px' }}>Bitte wende dich an den Trainer oder Admin.</p>
          </div>
        ) : (
          <div style={s.card}>
            <div style={{ marginBottom:'20px' }}>
              <h2 style={{ margin:'0 0 4px', color:grp?.color||'#358941', fontSize:'22px' }}>{myChild.name}</h2>
              <p style={{ margin:0, color:'#666', fontSize:'13px' }}>{grp?.emoji} {grp?.name} · {sub?.name}</p>
            </div>

            {/* Statistik */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
              {[
                { label:'Trainings', value:stats.total, color:'#333', bg:'#f8f9fa' },
                { label:'Anwesend', value:stats.present, color:'#16a34a', bg:'#dcfce7' },
                { label:'Unentschuldigt', value:stats.unexcused, color:'#6b7280', bg:'#f3f4f6' },
                { label:'Entschuldigt', value:stats.excused, color:'#d97706', bg:'#fef3c7' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background:bg, borderRadius:'8px', padding:'12px', textAlign:'center' }}>
                  <p style={{ margin:0, fontSize:'24px', fontWeight:'700', color }}>{value}</p>
                  <p style={{ margin:0, fontSize:'11px', color }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div style={{ marginBottom:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontSize:'14px', fontWeight:'600' }}>Anwesenheitsquote</span>
                <span style={{ fontSize:'14px', fontWeight:'700', color:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626' }}>{stats.percent}%</span>
              </div>
              <div style={{ background:'#f3f4f6', borderRadius:'99px', height:'12px', overflow:'hidden' }}>
                <div style={{ width:`${stats.percent}%`, height:'100%', background:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626', borderRadius:'99px' }} />
              </div>
            </div>

            {/* Verlauf */}
            <h3 style={{ margin:'0 0 12px' }}>Trainings-Verlauf</h3>
            <div style={{ display:'grid', gap:'8px' }}>
              {dates.map(date => {
                const status = (myChild.attendance||{})[date];
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={date} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:cfg?.bg||'#f9fafb', borderRadius:'8px', border:'1px solid #eee' }}>
                    <span style={{ fontSize:'14px', color:'#333' }}>
                      {new Date(date+'T12:00:00').toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}
                    </span>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'13px', fontWeight:'600', color:cfg?.color||'#999', background:'white', padding:'4px 10px', borderRadius:'20px', border:`1px solid ${cfg?.color||'#ddd'}` }}>
                        {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                      </span>
                      {/* Entschuldigen-Button wenn unentschuldigt */}
                      {status==='absent_unexcused' && (
                        <button onClick={()=>excuseMyChild(date)} style={s.btn('#d97706',undefined,true)}>
                          <Clock size={14}/> Entschuldigen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div></div>
    );
  }

  // ── ADMIN VIEW ───────────────────────────────────────────────
  if (view === 'admin') {
    const allChildrenList = Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    return (
      <div style={s.page}><div style={s.wrap}>
        <Header back backLabel="Startseite" backAction={()=>setView('home')} />

        {/* Einladungslinks */}
        <div style={s.card}>
          <h2 style={{ margin:'0 0 16px', color:'#7c3aed', display:'flex', alignItems:'center', gap:'8px' }}><Link size={20}/> Einladungslinks</h2>
          <div style={{ display:'grid', gap:'10px' }}>
            {[
              { rolle:'Trainer',     code:'TRAINER-TTC2026', color:'#358941' },
              { rolle:'Eltern',      code:'ELTERN-TTC2026',  color:'#2563eb' },
              { rolle:'Jugendliche', code:'JUGEND-TTC2026',  color:'#d97706' },
            ].map(({ rolle, code, color }) => (
              <div key={code} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f8f9fa', borderRadius:'8px', border:'1px solid #ddd' }}>
                <div>
                  <p style={{ margin:'0 0 2px', fontWeight:'600', color }}>{rolle}</p>
                  <p style={{ margin:0, fontSize:'13px', color:'#666' }}>Code: <strong>{code}</strong></p>
                </div>
                <button onClick={()=>{ navigator.clipboard.writeText(code); alert('Code kopiert: ' + code); }}
                  style={s.btn(color,undefined,true)}>
                  Kopieren
                </button>
              </div>
            ))}
          </div>
          <p style={{ margin:'12px 0 0', fontSize:'12px', color:'#999' }}>
            Schicke den Code an die Person. Sie gibt ihn bei der Registrierung ein.
          </p>
        </div>

        {/* Nutzerverwaltung */}
        <div style={s.card}>
          <h2 style={{ margin:'0 0 16px', color:'#7c3aed', display:'flex', alignItems:'center', gap:'8px' }}><Users size={20}/> Nutzerverwaltung</h2>
          <div style={{ display:'grid', gap:'10px' }}>
            {Object.values(allUsers).sort((a,b)=>a.name?.localeCompare(b.name||'')).map(u => {
              const roleCfg = ROLE_CONFIG[u.role] || {};
              const linkedChild = u.linkedChildId ? children[u.linkedChildId] : null;
              return (
                <div key={u.uid} style={{ padding:'12px 16px', background:'#f8f9fa', borderRadius:'8px', border:'1px solid #ddd' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                    <div>
                      <p style={{ margin:'0 0 2px', fontWeight:'600', color:'#333' }}>{u.name || u.email}</p>
                      <p style={{ margin:0, fontSize:'12px', color:'#999' }}>{u.email}</p>
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                      {/* Rolle ändern */}
                      <select value={u.role} onChange={e=>changeUserRole(u.uid, e.target.value)}
                        style={{ padding:'6px 10px', border:`2px solid ${roleCfg.color}`, borderRadius:'6px', fontSize:'13px', fontWeight:'600', color:roleCfg.color, background:roleCfg.bg, cursor:'pointer' }}>
                        {Object.entries(ROLE_CONFIG).map(([key,cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                      {/* Kind verknüpfen (nur für Eltern/Jugendliche) */}
                      {['eltern','jugendlich'].includes(u.role) && (
                        <select value={u.linkedChildId||''} onChange={e=>linkChildToUser(u.uid, e.target.value||null)}
                          style={{ padding:'6px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', cursor:'pointer' }}>
                          <option value=''>-- Kind zuordnen --</option>
                          {allChildrenList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {linkedChild && (
                    <p style={{ margin:'6px 0 0', fontSize:'12px', color:'#358941' }}>
                      👶 Verknüpft mit: <strong>{linkedChild.name}</strong>
                    </p>
                  )}
                </div>
              );
            })}
            {Object.keys(allUsers).length === 0 && (
              <p style={{ color:'#999', textAlign:'center', padding:'20px' }}>Noch keine registrierten Nutzer.</p>
            )}
          </div>
        </div>
      </div></div>
    );
  }

  // ── STARTSEITE (Admin + Trainer) ─────────────────────────────
  if (view === 'home') return (
    <div style={s.page}><div style={s.wrap}>
      <Header />
      <div style={{ display:'grid', gap:'14px' }}>
        {FIXED_GROUPS.map(group => {
          const subs = getSubgroupsForGroup(group.id);
          const totalKids = subs.reduce((sum,sub) => sum + getChildrenForSubgroup(sub.id).length, 0);
          return (
            <div key={group.id} onClick={()=>{ setActiveGroup(group); setView('group'); }}
              style={{ ...s.card, cursor:'pointer', borderLeft:`6px solid ${group.color}`, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0 }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.01)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <div>
                <h2 style={{ margin:'0 0 6px', color:group.color, fontSize:'22px' }}>{group.emoji} {group.name}</h2>
                <p style={{ margin:0, color:'#666', fontSize:'13px' }}>{subs.length} Trainingsgruppen · {totalKids} Kinder</p>
              </div>
              <ChevronDown size={24} color="#999" style={{ transform:'rotate(-90deg)' }} />
            </div>
          );
        })}
      </div>
    </div></div>
  );

  // ── GRUPPE ───────────────────────────────────────────────────
  if (view === 'group') {
    const subs = getSubgroupsForGroup(activeGroup.id);
    return (
      <div style={s.page}><div style={s.wrap}>
        <Header back backLabel="Startseite" backAction={()=>setView('home')} />
        <div style={s.card}>
          <h2 style={{ margin:'0 0 16px', color:activeGroup.color }}>{activeGroup.emoji} {activeGroup.name}</h2>
          {canEdit() && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
              <input style={s.input} placeholder="Neue Trainingsgruppe..." value={newSubgroupName}
                onChange={e=>setNewSubgroupName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addSubgroup()} />
              <button onClick={addSubgroup} style={s.btn(activeGroup.color)}><Plus size={18}/> Gruppe</button>
            </div>
          )}
          <div style={{ display:'grid', gap:'12px' }}>
            {subs.length === 0
              ? <p style={{ color:'#999', textAlign:'center', padding:'30px' }}>Noch keine Gruppen.</p>
              : subs.map(sub => {
                const kids = getChildrenForSubgroup(sub.id);
                const presentToday = kids.filter(c=>(c.attendance||{})[trainingDate]==='present').length;
                return (
                  <div key={sub.id} style={{ border:'1px solid #ddd', borderRadius:'10px', overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', background:'#f8f9fa', cursor:'pointer' }}
                      onClick={()=>{ setActiveSubgroup(sub); setView('subgroup'); }}>
                      <div>
                        <h3 style={{ margin:'0 0 4px', color:'#333', fontSize:'17px' }}>{sub.name}</h3>
                        <p style={{ margin:0, color:'#666', fontSize:'12px' }}>
                          {kids.length} Kinder · {(sub.trainingDates||[]).length} Trainings · heute {presentToday} anwesend
                        </p>
                      </div>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <button onClick={e=>{ e.stopPropagation(); exportSubgroupExcel(sub); }} style={s.btn('#16a34a',undefined,true)}>
                          <Download size={15}/> Excel
                        </button>
                        {canEdit() && (
                          <button onClick={e=>{ e.stopPropagation(); deleteSubgroup(sub.id); }}
                            style={{ padding:'6px', background:'#fee2e2', border:'none', borderRadius:'6px', cursor:'pointer', color:'#dc2626' }}>
                            <Trash2 size={16}/>
                          </button>
                        )}
                        <ChevronDown size={20} color="#999" style={{ transform:'rotate(-90deg)' }} />
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
  if (view === 'subgroup') {
    const sub  = subgroups[activeSubgroup.id] || activeSubgroup;
    const kids = getChildrenForSubgroup(sub.id);
    const allSubgroups = Object.values(subgroups);

    return (
      <div style={s.page}><div style={s.wrap}>
        <Header back backLabel={activeGroup.name} backAction={()=>setView('group')} />
        <div style={s.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
            <h2 style={{ margin:0, color:activeGroup.color }}>{sub.name}</h2>
            <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              {canEdit() && (
                <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)}
                  style={{ padding:'8px 14px', border:'2px solid #358941', borderRadius:'8px', fontSize:'16px', fontWeight:'600' }} />
              )}
              <span style={{ fontSize:'18px', fontWeight:'700', color:'#333', background:'#f3f4f6', padding:'8px 16px', borderRadius:'10px' }}>
                {new Date(trainingDate+'T12:00:00').toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}
              </span>
              <button onClick={()=>exportSubgroupExcel(sub)} style={s.btn('#16a34a',undefined,true)}>
                <Download size={15}/> Excel
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {[
              { key:'present', label:'Anwesend', color:'#16a34a', bg:'#dcfce7' },
              { key:'absent_unexcused', label:'Unentschuldigt', color:'#6b7280', bg:'#f3f4f6' },
              { key:'absent_excused', label:'Entschuldigt', color:'#d97706', bg:'#fef3c7' },
            ].map(({ key, label, color, bg }) => (
              <div key={key} style={{ background:bg, borderRadius:'8px', padding:'12px', textAlign:'center' }}>
                <p style={{ margin:0, fontSize:'24px', fontWeight:'700', color }}>{kids.filter(c=>(c.attendance||{})[trainingDate]===key).length}</p>
                <p style={{ margin:0, fontSize:'11px', color }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Kind hinzufügen */}
          {canEdit() && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid #eee' }}>
              <input style={s.input} placeholder="Kind hinzufügen..." value={newChildName}
                onChange={e=>setNewChildName(e.target.value)} onKeyPress={e=>e.key==='Enter'&&addChild()} />
              <button onClick={addChild} style={s.btn(activeGroup.color)}><Plus size={18}/> Kind</button>
            </div>
          )}

          {/* Kinder */}
          <div style={{ display:'grid', gap:'10px' }}>
            {kids.length === 0
              ? <p style={{ color:'#999', textAlign:'center', padding:'30px' }}>Noch keine Kinder.</p>
              : kids.map(child => {
                const todayStatus = (child.attendance||{})[trainingDate];
                const stats = getAttendanceStats(child.id, sub.id);
                return (
                  <div key={child.id} style={{ padding:'14px', borderRadius:'10px', border:'1px solid #ddd',
                    background: todayStatus==='present'?'#f0fdf4':todayStatus==='absent_unexcused'?'#f9fafb':todayStatus==='absent_excused'?'#fffbeb':'white' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:'120px' }}>
                        <p style={{ margin:'0 0 2px', fontWeight:'600', color:'#333', fontSize:'16px' }}>{child.name}</p>
                        <p style={{ margin:0, fontSize:'12px', color:'#999' }}>{stats.total} Trainings · {stats.present}x da · {stats.percent}%</p>
                      </div>
                      {canEdit() && (
                        <div style={{ display:'flex', gap:'6px' }}>
                          <button onClick={()=>setStatus(child.id,'present')}
                            style={{ width:'44px', height:'44px', border:'2px solid #16a34a', background:todayStatus==='present'?'#16a34a':'white', color:todayStatus==='present'?'white':'#16a34a', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Check size={22}/>
                          </button>
                          <button onClick={()=>setStatus(child.id,'absent_unexcused')}
                            style={{ width:'44px', height:'44px', border:'2px solid #9ca3af', background:todayStatus==='absent_unexcused'?'#6b7280':'white', color:todayStatus==='absent_unexcused'?'white':'#6b7280', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700' }}>
                            –
                          </button>
                          <button onClick={()=>setStatus(child.id,'absent_excused')}
                            style={{ width:'44px', height:'44px', border:'2px solid #d97706', background:todayStatus==='absent_excused'?'#d97706':'white', color:todayStatus==='absent_excused'?'white':'#d97706', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Clock size={20}/>
                          </button>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={()=>{ setActiveChild(child); setView('childHistory'); }} style={s.btn('#ede9fe','#7c3aed',true)}><BarChart2 size={15}/></button>
                        {canEdit() && <>
                          <button onClick={()=>setMoveChildId(moveChildId===child.id?null:child.id)} style={s.btn('#e0f2fe','#0369a1',true)}><MoveRight size={15}/></button>
                          <button onClick={()=>deleteChild(child.id)} style={{ padding:'8px', background:'#fee2e2', border:'none', borderRadius:'6px', cursor:'pointer', color:'#dc2626' }}><Trash2 size={16}/></button>
                        </>}
                      </div>
                    </div>
                    {moveChildId===child.id && canEdit() && (
                      <div style={{ marginTop:'12px', padding:'12px', background:'#f0f9ff', borderRadius:'8px', border:'1px solid #bae6fd' }}>
                        <p style={{ margin:'0 0 8px', fontSize:'13px', fontWeight:'600', color:'#0369a1' }}>In welche Gruppe verschieben?</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                          {allSubgroups.filter(sg=>sg.id!==sub.id).map(sg => {
                            const grp = FIXED_GROUPS.find(g=>g.id===sg.groupId);
                            return (
                              <button key={sg.id} onClick={()=>moveChild(child.id,sg.id)} style={s.btn(grp?.color||'#358941',undefined,true)}>
                                {grp?.emoji} {sg.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
          <div style={{ marginTop:'20px', paddingTop:'16px', borderTop:'1px solid #eee', display:'flex', gap:'16px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'13px', color:'#16a34a' }}>✓ Anwesend</span>
            <span style={{ fontSize:'13px', color:'#6b7280' }}>– Fehlt unentschuldigt</span>
            <span style={{ fontSize:'13px', color:'#d97706' }}>~ Fehlt entschuldigt</span>
          </div>
        </div>
      </div></div>
    );
  }

  // ── KIND VERLAUF ─────────────────────────────────────────────
  if (view === 'childHistory') {
    const child = children[activeChild.id] || activeChild;
    const sub   = subgroups[child.subgroupId];
    const grp   = FIXED_GROUPS.find(g=>g.id===sub?.groupId);
    const dates = (sub?.trainingDates||[]).sort().reverse();
    const stats = getAttendanceStats(child.id, child.subgroupId);
    return (
      <div style={s.page}><div style={s.wrap}>
        <Header back backLabel={sub?.name||'Zurück'} backAction={()=>setView('subgroup')} />
        <div style={s.card}>
          <div style={{ marginBottom:'20px' }}>
            <h2 style={{ margin:'0 0 4px', color:grp?.color||'#358941', fontSize:'22px' }}>{child.name}</h2>
            <p style={{ margin:0, color:'#666', fontSize:'13px' }}>{grp?.emoji} {grp?.name} · {sub?.name}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'24px' }}>
            {[
              { label:'Trainings', value:stats.total, color:'#333', bg:'#f8f9fa' },
              { label:'Anwesend', value:stats.present, color:'#16a34a', bg:'#dcfce7' },
              { label:'Unentschuldigt', value:stats.unexcused, color:'#6b7280', bg:'#f3f4f6' },
              { label:'Entschuldigt', value:stats.excused, color:'#d97706', bg:'#fef3c7' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background:bg, borderRadius:'8px', padding:'12px', textAlign:'center' }}>
                <p style={{ margin:0, fontSize:'24px', fontWeight:'700', color }}>{value}</p>
                <p style={{ margin:0, fontSize:'11px', color }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
              <span style={{ fontSize:'14px', fontWeight:'600' }}>Anwesenheitsquote</span>
              <span style={{ fontSize:'14px', fontWeight:'700', color:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626' }}>{stats.percent}%</span>
            </div>
            <div style={{ background:'#f3f4f6', borderRadius:'99px', height:'12px', overflow:'hidden' }}>
              <div style={{ width:`${stats.percent}%`, height:'100%', background:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626', borderRadius:'99px' }} />
            </div>
          </div>
          <h3 style={{ margin:'0 0 12px' }}>Trainings-Verlauf</h3>
          <div style={{ display:'grid', gap:'8px' }}>
            {dates.map(date => {
              const status = (child.attendance||{})[date];
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={date} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:cfg?.bg||'#f9fafb', borderRadius:'8px', border:'1px solid #eee' }}>
                  <span style={{ fontSize:'14px', color:'#333' }}>
                    {new Date(date+'T12:00:00').toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}
                  </span>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:cfg?.color||'#999', background:'white', padding:'4px 10px', borderRadius:'20px', border:`1px solid ${cfg?.color||'#ddd'}` }}>
                    {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div></div>
    );
  }
}
