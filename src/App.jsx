import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Check, X, Plus, Trash2, Download, ChevronDown, LogOut, ArrowLeft, Clock, MoveRight, Shield, Users, Calendar, Info, RefreshCw, ChevronRight, Edit2, Save } from 'lucide-react';

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

export default function TrainingsApp() {
  const [user, setUser]               = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [subgroups, setSubgroups]     = useState({});
  const [children, setChildren]       = useState({});
  const [allUsers, setAllUsers]       = useState({});
  const [sessions, setSessions]       = useState({});

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
  const [archiveWarning, setArchiveWarning]     = useState(null); // {sessionId, missingKids:[]}
  const [resetDialog, setResetDialog]           = useState(false);
  const [resetPassword, setResetPassword]       = useState('');
  const [resetError, setResetError]             = useState('');
  const [showProfile, setShowProfile]           = useState(false);
  const [pwCurrent, setPwCurrent]               = useState('');
  const [pwNew, setPwNew]                       = useState('');
  const [pwConfirm, setPwConfirm]               = useState('');
  const [pwError, setPwError]                   = useState('');
  const [pwSuccess, setPwSuccess]               = useState(false); // {sessionId, repeatId, blockSize}

  const [authMode, setAuthMode]           = useState('login');
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName]         = useState('');
  const [error, setError]                 = useState('');

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) { setUserRole(snap.data().role); setUserProfile(snap.data()); }
      } else { setUser(null); setUserRole(null); setUserProfile(null); }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !userRole) return;
    const unsubs = [
      onSnapshot(doc(db,'ttc','subgroups'), s => setSubgroups(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','children'),  s => setChildren(s.exists()?s.data():{})),
      onSnapshot(doc(db,'ttc','sessions'),    s => setSessions(s.exists()?s.data():{})),
    ];
    if (userRole==='admin')
      unsubs.push(onSnapshot(doc(db,'ttc','users'), s => setAllUsers(s.exists()?s.data():{})));
    return () => unsubs.forEach(u=>u());
  }, [user, userRole]);

  const saveSubgroups = u => { setSubgroups(u); setDoc(doc(db,'ttc','subgroups'),u); };
  const saveChildren  = u => { setChildren(u);  setDoc(doc(db,'ttc','children'), u); };
  const saveSessions   = u => { setSessions(u);    setDoc(doc(db,'ttc','sessions'),    u); };

  const canEdit = () => ['admin','trainer'].includes(userRole);
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
  const getUpcomingSessionsForSubgroup = (subgroupId) => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sessions)
      .filter(s => s.date >= today && (s.subgroupIds||[]).includes(subgroupId))
      .sort((a,b) => a.date.localeCompare(b.date));
  };

  const getAllUpcomingSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sessions).filter(s=>s.date>=today && !s.archived).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  };

  // Vergangene, noch nicht abgeschlossene Einheiten
  const getUnclosedPastSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sessions)
      .filter(s => s.date < today && !s.archived)
      .sort((a,b) => b.date.localeCompare(a.date));
  };

  // Einheit abschließen
  const archiveSession = (sessionId, force=false) => {
    const session = sessions[sessionId];
    const sessionSubs = (session?.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
    const allKids = sessionSubs.flatMap(sub => getChildrenForSubgroup(sub.id));
    const missing = allKids.filter(c => !(children[c.id]?.attendance||{})[session.date]);

    if (missing.length > 0 && !force) {
      return missing; // Gibt fehlende Kinder zurück
    }
    // Archivieren
    saveSessions({ ...sessions, [sessionId]: { ...session, archived: true } });
    return [];
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
    try { await signInWithEmailAndPassword(auth, loginEmail, loginPassword); }
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
      const profile = { uid:cred.user.uid, email:loginEmail, name:loginName, role:'pending', linkedChildId:null };
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

  const changeUserRole = async (uid, newRole) => {
    const updated={...allUsers,[uid]:{...allUsers[uid],role:newRole}};
    await setDoc(doc(db,'ttc','users'),updated);
    await setDoc(doc(db,'users',uid),{...allUsers[uid],role:newRole});
    setAllUsers(updated);
  };

  const linkChildToUser = async (uid, childId) => {
    const updated={...allUsers,[uid]:{...allUsers[uid],linkedChildId:childId||null}};
    await setDoc(doc(db,'ttc','users'),updated);
    await setDoc(doc(db,'users',uid),{...allUsers[uid],linkedChildId:childId||null});
    setAllUsers(updated);
  };

  const exportSubgroupExcel = (sub) => {
    const kids=getChildrenForSubgroup(sub.id);
    const dates=(sub.trainingDates||[]).sort();
    const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
    const standDatum=new Date().toLocaleDateString('de-DE');
    let csv=`TTC Grün-Weiß Staffel\n${grp?.name} - ${sub.name}\nExportiert am: ${standDatum}\n\nDatum;Name;Anwesend;Entschuldigt;Unentschuldigt\n`;
    dates.forEach(date=>{
      const d=new Date(date+'T12:00:00').toLocaleDateString('de-DE');
      kids.forEach(child=>{
        const s=(child.attendance||{})[date];
        csv+=`${d};${child.name};${s==='present'?1:0};${s==='absent_excused'?1:0};${s==='absent_unexcused'?1:0}\n`;
      });
    });
    csv+=`\nZusammenfassung\nName;Trainings;Anwesend;Entschuldigt;Unentschuldigt;Quote\n`;
    kids.forEach(child=>{
      const st=getAttendanceStats(child.id,sub.id);
      csv+=`${child.name};${st.total};${st.present};${st.excused};${st.unexcused};${st.percent}%\n`;
    });
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download=`TTC_${grp?.name}_${sub.name}_Stand_${standDatum}.csv`;
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
    page:  (color=null) => ({minHeight:'100vh', background: 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', fontFamily:'system-ui,-apple-system,sans-serif'}),
    wrap:  {maxWidth:'900px',margin:'0 auto',padding:'20px'},
    card:  {background:'white',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
    btn:   (bg,col='white',sm=false)=>({padding:sm?'6px 12px':'10px 16px',background:bg,color:col,border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:sm?'13px':'14px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}),
    input: {padding:'10px 12px',border:'1px solid #ddd',borderRadius:'8px',fontSize:'14px',flex:1,minWidth:0},
    label: {fontSize:'13px',fontWeight:'600',color:'#555',marginBottom:'4px',display:'block'},
  };

  if (loading) return <div style={{...s.page(activeGroup?.color),display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'white',fontSize:'20px'}}>Laden...</p></div>;

  if (!user) return (
    <div style={{...s.page(activeGroup?.color),display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'40px',maxWidth:'420px',width:'100%',boxShadow:'0 10px 40px rgba(0,0,0,0.2)'}}>
        <h1 style={{margin:'0 0 4px',color:'#358941',fontSize:'28px',textAlign:'center'}}>TTC Grün-Weiß Staffel</h1>
        <p style={{margin:'0 0 4px',color:'#666',textAlign:'center'}}>Vereinsapp</p>
        <p style={{margin:'0 0 28px',color:'#bbb',textAlign:'center',fontSize:'11px'}}>v0.4.1</p>
        {error&&<p style={{color:'red',marginBottom:'16px',fontSize:'13px',textAlign:'center'}}>{error}</p>}
        <div style={{display:'flex',marginBottom:'20px',borderRadius:'8px',overflow:'hidden',border:'1px solid #ddd'}}>
          {['login','register'].map(m=>(
            <button key={m} onClick={()=>{setAuthMode(m);setError('');}} style={{flex:1,padding:'10px',background:authMode===m?'#358941':'white',color:authMode===m?'white':'#666',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
              {m==='login'?'Anmelden':'Registrieren'}
            </button>
          ))}
        </div>
        <form onSubmit={authMode==='login'?handleLogin:handleRegister} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {authMode==='register'&&<input placeholder="Dein Name" value={loginName} onChange={e=>setLoginName(e.target.value)} required style={{...s.input,flex:'none'}}/>}
          <input type="email" placeholder="E-Mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required style={{...s.input,flex:'none'}}/>
          <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={{...s.input,flex:'none'}}/>
          <button type="submit" style={{padding:'12px',background:'#358941',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
            {authMode==='login'?'Anmelden':'Registrieren'}
          </button>
        </form>
        {authMode==='register'&&<div style={{marginTop:'16px',padding:'12px',background:'#f0fdf4',borderRadius:'8px',fontSize:'13px',color:'#358941'}}>Nach der Registrierung wird dein Account von einem Admin freigeschaltet.</div>}
        {authMode==='login'&&(
          <div style={{marginTop:'12px',textAlign:'center'}}>
            <button onClick={handleForgotPassword} style={{background:'none',border:'none',color:'#358941',cursor:'pointer',fontSize:'13px',textDecoration:'underline'}}>
              Passwort vergessen?
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (userRole==='pending') return (
    <div style={{...s.page(activeGroup?.color),display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'40px',maxWidth:'420px',width:'100%',textAlign:'center',boxShadow:'0 10px 40px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>⏳</div>
        <h2 style={{margin:'0 0 12px',color:'#333'}}>Account wird freigeschaltet</h2>
        <p style={{margin:'0 0 24px',color:'#666',fontSize:'15px'}}>Hallo <strong>{userProfile?.name}</strong>!<br/>Ein Admin schaltet deinen Account bald frei.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
          <button onClick={()=>window.location.reload()} style={s.btn('#358941')}>🔄 Neu laden</button>
          <button onClick={()=>signOut(auth)} style={s.btn('#ef4444')}><LogOut size={16}/> Abmelden</button>
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
          <div style={{display:'flex',gap:'8px'}}>
            {userRole==='admin'&&<button onClick={()=>setView('admin')} style={s.btn('#7c3aed')}><Shield size={16}/> Admin</button>}
            {canEdit()&&<button onClick={()=>setView('trainingsplan')} style={s.btn('#0369a1')}><Calendar size={16}/> Trainingsplan</button>}
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
    const upcoming=getAllUpcomingSessions();
    const allSubs=Object.values(subgroups).sort((a,b)=>{
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
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <DeleteDialog/>
        <Header back backLabel="Startseite" backAction={()=>setView('home')}/>

        {/* Neue Einheit */}
        <div style={s.card}>
          <h2 style={{margin:'0 0 20px',color:'#0369a1',display:'flex',alignItems:'center',gap:'8px'}}><Plus size={20}/> Neue Trainingseinheit</h2>

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

                return (
                  <div key={session.id} style={{padding:'14px',borderRadius:'10px',border:'1px solid #ddd',background:'white'}}>
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
      </div></div>
    );
  }

  // ── ELTERN / JUGENDLICHE ─────────────────────────────────────
  if (['eltern','jugendlich'].includes(userRole)) {
    const myChild=getMyChild();
    const sub=myChild?subgroups[myChild.subgroupId]:null;
    const grp=sub?FIXED_GROUPS.find(g=>g.id===sub.groupId):null;
    const dates=(sub?.trainingDates||[]).sort().reverse();
    const stats=myChild?getAttendanceStats(myChild.id,myChild.subgroupId):null;
    const mySessions=myChild&&sub ? getUpcomingSessionsForSubgroup(myChild.subgroupId) : [];

    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header/>
        {!myChild
          ? <div style={{...s.card,textAlign:'center',padding:'40px'}}><p style={{fontSize:'18px',color:'#666'}}>Dein Account ist noch keinem Kind zugeordnet.</p><p style={{color:'#999',fontSize:'14px'}}>Bitte wende dich an den Trainer oder Admin.</p></div>
          : <>
            <div style={s.card}>
              <h2 style={{margin:'0 0 4px',color:grp?.color||'#358941',fontSize:'22px'}}>{myChild.name}</h2>
              <p style={{margin:'0 0 20px',color:'#666',fontSize:'13px'}}>{grp?.emoji} {grp?.name} · {sub?.name}</p>
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
              <div style={{marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'14px',fontWeight:'600'}}>Anwesenheitsquote</span>
                  <span style={{fontSize:'14px',fontWeight:'700',color:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626'}}>{stats.percent}%</span>
                </div>
                <div style={{background:'#f3f4f6',borderRadius:'99px',height:'12px',overflow:'hidden'}}>
                  <div style={{width:`${stats.percent}%`,height:'100%',background:stats.percent>=80?'#16a34a':stats.percent>=60?'#d97706':'#dc2626',borderRadius:'99px'}}/>
                </div>
              </div>
            </div>

            {/* Kommende Trainings */}
            {mySessions.length>0&&(
              <div style={s.card}>
                <h3 style={{margin:'0 0 16px',color:'#0369a1',display:'flex',alignItems:'center',gap:'8px'}}><Calendar size={18}/> Kommende 10 Trainings</h3>
                <div style={{display:'grid',gap:'10px'}}>
                  {mySessions.slice(0,10).map(session=>{
                    const childId=myChild.id;
                    const myResponse=(session.responses||{})[childId];
                    return (
                      <div key={session.id} style={{padding:'14px',borderRadius:'10px',border:'1px solid #ddd',background:myResponse==='coming'?'#f0fdf4':myResponse==='missing'?'#fef2f2':'white'}}>
                        <div style={{marginBottom:'10px'}}>
                          <p style={{margin:'0 0 2px',fontWeight:'700',color:'#333',fontSize:'15px'}}>
                            {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · {session.time} Uhr
                          </p>
                          {session.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#555'}}>👤 Trainer: {session.trainer}</p>}
                          {session.info&&<div style={{display:'flex',alignItems:'flex-start',gap:'6px',marginTop:'6px',padding:'8px',background:'#f0f9ff',borderRadius:'6px'}}><Info size={14} color="#0369a1" style={{marginTop:'2px',flexShrink:0}}/><p style={{margin:0,fontSize:'13px',color:'#0369a1'}}>{session.info}</p></div>}
                        </div>
                        <div style={{display:'flex',gap:'8px'}}>
                          <button onClick={()=>respondToSession(session.id,'coming')}
                            style={{flex:1,padding:'10px',border:`2px solid #16a34a`,background:myResponse==='coming'?'#16a34a':'white',color:myResponse==='coming'?'white':'#16a34a',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                            <Check size={18}/> Ich komme
                          </button>
                          <button onClick={()=>respondToSession(session.id,'missing')}
                            style={{flex:1,padding:'10px',border:`2px solid #dc2626`,background:myResponse==='missing'?'#dc2626':'white',color:myResponse==='missing'?'white':'#dc2626',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                            <X size={18}/> Ich fehle
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verlauf */}
            <div style={s.card}>
              <h3 style={{margin:'0 0 12px',color:'#333'}}>📋 Trainings-Verlauf</h3>
              <div style={{display:'grid',gap:'8px'}}>
                {dates.length===0
                  ? <p style={{color:'#999',textAlign:'center',padding:'20px'}}>Noch keine Trainings erfasst.</p>
                  : dates.map(date=>{
                    const status=(myChild.attendance||{})[date];
                    const cfg=STATUS_CONFIG[status];
                    return (
                      <div key={date} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:cfg?.bg||'#f9fafb',borderRadius:'8px',border:'1px solid #eee'}}>
                        <span style={{fontSize:'14px',color:'#333'}}>
                          {new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
                        </span>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                          <span style={{fontSize:'13px',fontWeight:'600',color:cfg?.color||'#999',background:'white',padding:'4px 10px',borderRadius:'20px',border:`1px solid ${cfg?.color||'#ddd'}`}}>
                            {cfg?.symbol||'–'} {cfg?.label||'Nicht erfasst'}
                          </span>
                          {status==='absent_unexcused'&&(
                            <button onClick={()=>excuseMyChild(date)} style={s.btn('#d97706',undefined,true)}><Clock size={14}/> Entschuldigen</button>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </>
        }
      </div></div>
    );
  }

  // ── ADMIN ────────────────────────────────────────────────────
  if (view==='admin') {
    const allChildrenList=Object.values(children).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const pendingCount=Object.values(allUsers).filter(u=>u.role==='pending').length;
    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header back backLabel="Startseite" backAction={()=>setView('home')}/>

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
                    <div>
                      <p style={{margin:'0 0 2px',fontWeight:'600',color:'#333'}}>{u.name||u.email}</p>
                      <p style={{margin:0,fontSize:'12px',color:'#999'}}>{u.email}</p>
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                      <select value={u.role} onChange={e=>changeUserRole(u.uid,e.target.value)} style={{padding:'6px 10px',border:`2px solid ${rc.color}`,borderRadius:'6px',fontSize:'13px',fontWeight:'600',color:rc.color,background:rc.bg,cursor:'pointer'}}>
                        {Object.entries(ROLE_CONFIG).map(([key,cfg])=><option key={key} value={key}>{cfg.label}</option>)}
                      </select>
                      {['eltern','jugendlich'].includes(u.role)&&(
                        <select value={u.linkedChildId||''} onChange={e=>linkChildToUser(u.uid,e.target.value||null)} style={{padding:'6px 10px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>
                          <option value=''>-- Kind zuordnen --</option>
                          {allChildrenList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {linkedChild&&<p style={{margin:'6px 0 0',fontSize:'12px',color:'#358941'}}>👶 Verknüpft mit: <strong>{linkedChild.name}</strong></p>}
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
          <button onClick={()=>setResetDialog(true)} style={{...s.btn('#dc2626'),width:'100%',justifyContent:'center'}}>
            🗑️ Alle Anwesenheitsdaten zurücksetzen
          </button>
        </div>

      </div></div>
    );
  }

  // ── STARTSEITE ───────────────────────────────────────────────
  if (view==='home') return (
    <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
      <Header/>
      {/* Nicht abgeschlossene vergangene Einheiten */}
      {(()=>{
        const unclosed = getUnclosedPastSessions();
        if (!unclosed.length || !canEdit()) return null;
        return (
          <div style={{...s.card,border:'2px solid #fca5a5',background:'#fff5f5'}}>
            <h3 style={{margin:'0 0 12px',color:'#dc2626',display:'flex',alignItems:'center',gap:'8px'}}>
              ⚠️ Nicht abgeschlossene Trainings ({unclosed.length})
            </h3>
            <div style={{display:'grid',gap:'8px'}}>
              {unclosed.map(session=>{
                const sessionSubs=(session.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                return (
                  <div key={session.id}
                    onClick={()=>{ setActiveSession(session); setView('sessionAttendance'); }}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'white',borderRadius:'8px',border:'1px solid #fca5a5',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#fff5f5'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'3px'}}>
                        {sessionSubs.map(sub=>{
                          const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                          return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:grp?.color}}>{grp?.emoji} {sub.name}</span>;
                        })}
                      </div>
                      <span style={{fontSize:'13px',color:'#555'}}>
                        {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})} · {session.time} Uhr
                      </span>
                    </div>
                    <ChevronRight size={16} color="#dc2626"/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Heute & nächste 6 Tage */}
        const todayStr=today.toISOString().split('T')[0], in6Str=in6.toISOString().split('T')[0];
        const week=getAllUpcomingSessions().filter(s=>s.date>=todayStr&&s.date<=in6Str);
        if (!week.length) return null;
        return (
          <div style={s.card}>
            <h3 style={{margin:'0 0 12px',color:'#0369a1',display:'flex',alignItems:'center',gap:'8px'}}><Calendar size={16}/> Trainings heute & nächste 6 Tage</h3>
            <div style={{display:'grid',gap:'8px'}}>
              {week.map(session=>{
                const sessionSubs=(session.subgroupIds||[]).map(sid=>subgroups[sid]).filter(Boolean);
                return (
                  <div key={session.id}
                    onClick={()=>{
                      setActiveSession(session);
                      setView('sessionAttendance');
                    }}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f0f9ff',borderRadius:'8px',border:'1px solid #bae6fd',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#e0f2fe'}
                    onMouseLeave={e=>e.currentTarget.style.background='#f0f9ff'}>
                    <div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
                        {sessionSubs.map(sub=>{
                          const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                          return <span key={sub.id} style={{fontSize:'12px',fontWeight:'700',color:grp?.color}}>{grp?.emoji} {sub.name}</span>;
                        })}
                      </div>
                      <span style={{fontSize:'13px',color:'#555'}}>
                        {new Date(session.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})} · {session.time} Uhr
                      </span>
                      {session.trainer&&<span style={{fontSize:'12px',color:'#999',marginLeft:'8px'}}>· {session.trainer}</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      {session.info&&<Info size={16} color="#0369a1"/>}
                      <ChevronRight size={16} color="#0369a1"/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div style={{display:'grid',gap:'14px'}}>
        {FIXED_GROUPS.map(group=>{
          const subs=getSubgroupsForGroup(group.id);
          const totalKids=subs.reduce((sum,sub)=>sum+getChildrenForSubgroup(sub.id).length,0);
          return (
            <div key={group.id} onClick={()=>{setActiveGroup(group);setView('group');}}
              style={{...s.card,cursor:'pointer',borderLeft:`6px solid ${group.color}`,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:0}}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.01)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <div>
                <h2 style={{margin:'0 0 6px',color:group.color,fontSize:'22px'}}>{group.emoji} {group.name}</h2>
                <p style={{margin:0,color:'#666',fontSize:'13px'}}>{subs.length} Gruppen · {totalKids} Kinder</p>
              </div>
              <ChevronDown size={24} color="#999" style={{transform:'rotate(-90deg)'}}/>
            </div>
          );
        })}
      </div>
    </div></div>
  );

  // ── GRUPPE ───────────────────────────────────────────────────
  if (view==='group') {
    const subs=getSubgroupsForGroup(activeGroup.id);
    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header back backLabel="Startseite" backAction={()=>setView('home')}/>
        <div style={s.card}>
          <h2 style={{margin:'0 0 16px',color:activeGroup.color}}>{activeGroup.emoji} {activeGroup.name}</h2>
            {canEdit()&&<button onClick={()=>setView('trainingsplan')} style={s.btn('#0369a1')}><Calendar size={16}/> Trainingsplan</button>}
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
    const isArchived = session?.archived;

    const setSessionStatus = (childId, subgroupId, status) => {
      ensureTrainingDate(subgroupId, sessionDate);
      const child = children[childId];
      const cur = (child.attendance||{})[sessionDate];
      const next = cur===status ? null : status;
      const att = { ...(child.attendance||{}), [sessionDate]: next };
      if (next===null) delete att[sessionDate];
      saveChildren({ ...children, [childId]: { ...child, attendance: att } });
    };

    const handleArchive = () => {
      const missing = archiveSession(session.id, false);
      if (missing.length > 0) {
        setArchiveWarning({ sessionId: session.id, missingKids: missing });
      } else {
        setView('home');
      }
    };

    const presentCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='present').length;
    const absentCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='absent_unexcused').length;
    const excusedCount = allKids.filter(c=>(children[c.id]?.attendance||{})[sessionDate]==='absent_excused').length;
    const notRecorded = allKids.filter(c=>!(children[c.id]?.attendance||{})[sessionDate]).length;

    return (
      <div style={s.page(activeGroup?.color)}><div style={s.wrap}>
        <Header back backLabel="Startseite" backAction={()=>setView('home')}/>

        {/* Archiv-Warnung Modal */}
        {archiveWarning&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:'400px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <h3 style={{margin:'0 0 8px',color:'#d97706',fontSize:'18px'}}>⚠️ Anwesenheit nicht vollständig</h3>
              <p style={{margin:'0 0 12px',color:'#666',fontSize:'14px'}}>Bei folgenden Kindern wurde noch keine Anwesenheit erfasst:</p>
              <div style={{marginBottom:'16px',padding:'12px',background:'#fef3c7',borderRadius:'8px'}}>
                {archiveWarning.missingKids.map(c=>(
                  <p key={c.id} style={{margin:'2px 0',fontSize:'14px',color:'#333'}}>• {c.name}</p>
                ))}
              </div>
              <p style={{margin:'0 0 16px',color:'#666',fontSize:'13px'}}>Trotzdem abschließen?</p>
              <div style={{display:'grid',gap:'8px'}}>
                <button onClick={()=>{ archiveSession(archiveWarning.sessionId, true); setArchiveWarning(null); setView('home'); }}
                  style={{padding:'12px',background:'#d97706',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  Trotzdem abschließen
                </button>
                <button onClick={()=>setArchiveWarning(null)}
                  style={{padding:'12px',background:'#f3f4f6',color:'#333',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                  Zurück & vervollständigen
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={s.card}>
          {/* Session Info */}
          <div style={{marginBottom:'16px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
              <h2 style={{margin:0,color:'#0369a1',fontSize:'20px'}}>
                {new Date(sessionDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} · {session?.time} Uhr
              </h2>
              {isArchived
                ? <span style={{fontSize:'13px',fontWeight:'700',color:'#16a34a',background:'#dcfce7',padding:'4px 12px',borderRadius:'20px',border:'1px solid #16a34a'}}>✓ Abgeschlossen</span>
                : canEdit()&&(
                  <button onClick={handleArchive}
                    style={{...s.btn('#358941'),gap:'6px'}}>
                    ✓ Training abschließen
                  </button>
                )
              }
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'6px'}}>
              {sessionSubs.map(sub=>{
                const grp=FIXED_GROUPS.find(g=>g.id===sub.groupId);
                return <span key={sub.id} style={{fontSize:'13px',fontWeight:'700',color:grp?.color,background:'#f8f9fa',padding:'3px 10px',borderRadius:'20px',border:`1px solid ${grp?.color}`}}>{grp?.emoji} {sub.name}</span>;
              })}
            </div>
            {session?.trainer&&<p style={{margin:'0 0 2px',fontSize:'13px',color:'#555'}}>👤 Trainer: {session.trainer}</p>}
            {session?.info&&<div style={{display:'flex',gap:'6px',marginTop:'8px',padding:'8px',background:'#f0f9ff',borderRadius:'6px'}}><Info size={14} color="#0369a1" style={{flexShrink:0,marginTop:'2px'}}/><p style={{margin:0,fontSize:'13px',color:'#0369a1'}}>{session.info}</p></div>}
          </div>

          {/* Fortschrittsbalken Erfassung */}
          {!isArchived&&allKids.length>0&&(
            <div style={{marginBottom:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontSize:'13px',color:'#555'}}>Erfassung</span>
                <span style={{fontSize:'13px',fontWeight:'600',color:notRecorded===0?'#16a34a':'#d97706'}}>
                  {allKids.length-notRecorded}/{allKids.length} erfasst {notRecorded>0&&`· ${notRecorded} fehlen noch`}
                </span>
              </div>
              <div style={{background:'#f3f4f6',borderRadius:'99px',height:'8px',overflow:'hidden'}}>
                <div style={{width:`${((allKids.length-notRecorded)/allKids.length)*100}%`,height:'100%',background:notRecorded===0?'#16a34a':'#d97706',borderRadius:'99px',transition:'width 0.3s'}}/>
              </div>
            </div>
          )}

          {/* Statistik */}
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

          {/* Kinderliste */}
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
                    border: !status?'2px solid #fbbf24': parentExcused?'2px solid #d97706': parentComing?'2px solid #16a34a':'1px solid #ddd',
                    background: status==='present'?'#f0fdf4': status==='absent_unexcused'?'#f9fafb': status==='absent_excused'?'#fffbeb':'#fffbeb'
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:'120px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                          <p style={{margin:0,fontWeight:'600',color:'#333',fontSize:'16px'}}>{child.name}</p>
                          {!status&&<span style={{fontSize:'11px',fontWeight:'600',color:'#d97706',background:'#fef3c7',padding:'2px 8px',borderRadius:'20px'}}>Noch nicht erfasst</span>}
                          {parentExcused&&<span style={{fontSize:'11px',fontWeight:'600',color:'#d97706',background:'#fef3c7',padding:'2px 8px',borderRadius:'20px',border:'1px solid #d97706'}}>Eltern abgemeldet</span>}
                          {parentComing&&<span style={{fontSize:'11px',fontWeight:'600',color:'#16a34a',background:'#dcfce7',padding:'2px 8px',borderRadius:'20px',border:'1px solid #16a34a'}}>Eltern angemeldet</span>}
                        </div>
                        {sub&&<p style={{margin:'2px 0 0',fontSize:'11px',color:'#999'}}>{sub.name}</p>}
                      </div>
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

          <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid #eee',display:'flex',gap:'16px',flexWrap:'wrap'}}>
            <span style={{fontSize:'13px',color:'#16a34a'}}>✓ Anwesend</span>
            <span style={{fontSize:'13px',color:'#6b7280'}}>– Fehlt unentschuldigt</span>
            <span style={{fontSize:'13px',color:'#d97706'}}>~ Fehlt entschuldigt</span>
          </div>
        </div>
      </div></div>
    );
  }

  // ── TURNIERVERWALTUNG (Trainer/Admin) ───────────────────────
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
            {canEdit()&&<button onClick={()=>setView('trainingsplan')} style={s.btn('#0369a1')}><Calendar size={16}/> Trainingsplan</button>}
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
      </div></div>
    );
  }
}
