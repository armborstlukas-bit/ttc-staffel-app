import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Check, X, Plus, Trash2, Download, ChevronDown, ChevronUp, LogOut, ArrowLeft, Clock } from 'lucide-react';

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
  { id: 'jugend', name: 'Jugendgruppe', emoji: '🏓', color: '#358941' },
  { id: 'anfaenger', name: 'Anfängergruppe', emoji: '⭐', color: '#2563eb' },
  { id: 'kleinkind', name: 'Kleinkindgruppe', emoji: '🌟', color: '#d97706' },
];

export default function TrainingsApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ jugend: [], anfaenger: [], kleinkind: [] });
  const [view, setView] = useState('home'); // 'home' | 'group' | 'subgroup'
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'clubs', 'ttc-staffel-v2');
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setData(snap.data().groups || { jugend: [], anfaenger: [], kleinkind: [] });
      }
    });
    return unsubscribe;
  }, [user]);

  const saveData = (updated) => {
    setData(updated);
    if (user) setDoc(doc(db, 'clubs', 'ttc-staffel-v2'), { groups: updated });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setError('Login fehlgeschlagen. Email oder Passwort falsch!');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setError('Registrierung fehlgeschlagen. Passwort min. 6 Zeichen!');
    }
  };

  const addSubgroup = () => {
    if (!newSubgroupName.trim()) return;
    const updated = { ...data };
    updated[activeGroup.id] = [...(updated[activeGroup.id] || []), {
      id: Date.now(),
      name: newSubgroupName,
      children: []
    }];
    saveData(updated);
    setNewSubgroupName('');
  };

  const deleteSubgroup = (subgroupId) => {
    if (!window.confirm('Untergruppe wirklich löschen?')) return;
    const updated = { ...data };
    updated[activeGroup.id] = updated[activeGroup.id].filter(s => s.id !== subgroupId);
    saveData(updated);
  };

  const addChild = () => {
    if (!newChildName.trim()) return;
    const updated = { ...data };
    updated[activeGroup.id] = updated[activeGroup.id].map(s =>
      s.id === activeSubgroup.id
        ? { ...s, children: [...s.children, { id: Date.now(), name: newChildName, status: null, notes: '' }] }
        : s
    );
    saveData(updated);
    setNewChildName('');
    // Aktive Untergruppe aktualisieren
    const newSub = updated[activeGroup.id].find(s => s.id === activeSubgroup.id);
    setActiveSubgroup(newSub);
  };

  const deleteChild = (childId) => {
    const updated = { ...data };
    updated[activeGroup.id] = updated[activeGroup.id].map(s =>
      s.id === activeSubgroup.id
        ? { ...s, children: s.children.filter(c => c.id !== childId) }
        : s
    );
    saveData(updated);
    const newSub = updated[activeGroup.id].find(s => s.id === activeSubgroup.id);
    setActiveSubgroup(newSub);
  };

  const setStatus = (childId, status) => {
    const updated = { ...data };
    updated[activeGroup.id] = updated[activeGroup.id].map(s =>
      s.id === activeSubgroup.id
        ? { ...s, children: s.children.map(c =>
            c.id === childId ? { ...c, status: c.status === status ? null : status } : c
          )}
        : s
    );
    saveData(updated);
    const newSub = updated[activeGroup.id].find(s => s.id === activeSubgroup.id);
    setActiveSubgroup(newSub);
  };

  const exportToCSV = () => {
    let csv = `Trainingstag,${trainingDate}\nTrainer,${user?.email}\n\n`;
    FIXED_GROUPS.forEach(group => {
      const subgroups = data[group.id] || [];
      subgroups.forEach(sub => {
        csv += `${group.name} - ${sub.name}\nName,Anwesenheit\n`;
        sub.children.forEach(c => {
          const s = c.status === 'present' ? 'Anwesend' : c.status === 'absent_unexcused' ? 'Fehlt unentschuldigt' : c.status === 'absent_excused' ? 'Fehlt entschuldigt' : 'Keine Angabe';
          csv += `"${c.name}",${s}\n`;
        });
        csv += '\n';
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TTC_Anwesenheit_${trainingDate}.csv`;
    link.click();
  };

  const getStats = (subgroup) => {
    const present = subgroup.children.filter(c => c.status === 'present').length;
    const unexcused = subgroup.children.filter(c => c.status === 'absent_unexcused').length;
    const excused = subgroup.children.filter(c => c.status === 'absent_excused').length;
    return { present, unexcused, excused, total: subgroup.children.length };
  };

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' },
    inner: { maxWidth: '900px', margin: '0 auto', padding: '20px' },
    card: { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    btn: (bg, color='white') => ({ padding: '10px 16px', background: bg, color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }),
    input: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', flex: 1 },
  };

  if (loading) return <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'white', fontSize: '20px' }}>Laden...</p></div>;

  // LOGIN
  if (!user) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: '0 0 4px 0', color: '#358941', fontSize: '28px', textAlign: 'center' }}>TTC Staffel</h1>
        <p style={{ margin: '0 0 28px 0', color: '#666', textAlign: 'center' }}>Trainingsapp</p>
        {error && <p style={{ color: 'red', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="email" placeholder="E-Mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
          <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
          <button type="submit" style={{ padding: '12px', background: '#358941', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            {authMode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#358941', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>
            {authMode === 'login' ? 'Neu registrieren' : 'Zum Login'}
          </button>
        </div>
      </div>
    </div>
  );

  // HEADER
  const Header = () => (
    <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ margin: '0 0 4px 0', color: '#358941', fontSize: '24px' }}>TTC Grün-Weiß Staffel</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>Trainer: <strong>{user?.email}</strong></p>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
        <button onClick={exportToCSV} style={styles.btn('#358941')}>
          <Download size={16} /> CSV
        </button>
        <button onClick={() => signOut(auth)} style={styles.btn('#ef4444')}>
          <LogOut size={16} /> Abmelden
        </button>
      </div>
    </div>
  );

  // STARTSEITE - 3 feste Gruppen
  if (view === 'home') return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <Header />
        <div style={{ display: 'grid', gap: '16px' }}>
          {FIXED_GROUPS.map(group => {
            const subgroups = data[group.id] || [];
            const totalKids = subgroups.reduce((sum, s) => sum + s.children.length, 0);
            const presentKids = subgroups.reduce((sum, s) => sum + s.children.filter(c => c.status === 'present').length, 0);
            return (
              <div key={group.id}
                onClick={() => { setActiveGroup(group); setView('group'); }}
                style={{ ...styles.card, cursor: 'pointer', borderLeft: `6px solid ${group.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.1s', marginBottom: 0 }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div>
                  <h2 style={{ margin: '0 0 6px 0', color: group.color, fontSize: '22px' }}>{group.emoji} {group.name}</h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                    {subgroups.length} Untergruppen · {totalKids} Kinder · ✓ {presentKids} heute anwesend
                  </p>
                </div>
                <ChevronDown size={24} color="#999" style={{ transform: 'rotate(-90deg)' }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // GRUPPENANSICHT - Untergruppen
  if (view === 'group') return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <Header />
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setView('home')} style={styles.btn('#f3f4f6', '#333')}>
              <ArrowLeft size={18} /> Zurück
            </button>
            <h2 style={{ margin: 0, color: activeGroup.color, fontSize: '22px' }}>{activeGroup.emoji} {activeGroup.name}</h2>
          </div>

          {/* Neue Untergruppe */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input style={styles.input} type="text" placeholder="Neue Untergruppe (z.B. U11, Montags-Gruppe...)"
              value={newSubgroupName} onChange={e => setNewSubgroupName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addSubgroup()} />
            <button onClick={addSubgroup} style={styles.btn(activeGroup.color)}>
              <Plus size={18} /> Gruppe
            </button>
          </div>

          {/* Untergruppen Liste */}
          <div style={{ display: 'grid', gap: '12px' }}>
            {(data[activeGroup.id] || []).length === 0
              ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Noch keine Untergruppen. Oben hinzufügen!</p>
              : (data[activeGroup.id] || []).map(sub => {
                const stats = getStats(sub);
                return (
                  <div key={sub.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8f9fa', cursor: 'pointer' }}
                      onClick={() => { setActiveSubgroup(sub); setView('subgroup'); }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#333', fontSize: '17px' }}>{sub.name}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                          ✓ {stats.present} anwesend · ✗ {stats.unexcused} unentschuldigt · ~ {stats.excused} entschuldigt · {stats.total} gesamt
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); deleteSubgroup(sub.id); }}
                          style={{ padding: '6px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}>
                          <Trash2 size={16} />
                        </button>
                        <ChevronDown size={20} color="#999" style={{ transform: 'rotate(-90deg)' }} />
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );

  // UNTERGRUPPEN-ANSICHT - Anwesenheit
  if (view === 'subgroup') {
    const currentSub = (data[activeGroup.id] || []).find(s => s.id === activeSubgroup.id) || activeSubgroup;
    const stats = getStats(currentSub);

    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <Header />
          <div style={styles.card}>
            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setView('group')} style={styles.btn('#f3f4f6', '#333')}>
                <ArrowLeft size={18} /> {activeGroup.emoji} {activeGroup.name}
              </button>
              <h2 style={{ margin: 0, color: activeGroup.color, fontSize: '20px' }}>{currentSub.name}</h2>
            </div>

            {/* Statistik */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{stats.present}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#16a34a' }}>Anwesend</p>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>{stats.unexcused}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Unentschuldigt</p>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#d97706' }}>{stats.excused}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#d97706' }}>Entschuldigt</p>
              </div>
            </div>

            {/* Kind hinzufügen */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
              <input style={styles.input} type="text" placeholder="Kind hinzufügen..."
                value={newChildName} onChange={e => setNewChildName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addChild()} />
              <button onClick={addChild} style={styles.btn(activeGroup.color)}>
                <Plus size={18} /> Kind
              </button>
            </div>

            {/* Kinder Liste */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {currentSub.children.length === 0
                ? <p style={{ color: '#999', textAlign: 'center', padding: '30px' }}>Noch keine Kinder. Oben hinzufügen!</p>
                : currentSub.children.map(child => (
                  <div key={child.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '10px', border: '1px solid #ddd',
                    background: child.status === 'present' ? '#f0fdf4' : child.status === 'absent_unexcused' ? '#f9fafb' : child.status === 'absent_excused' ? '#fffbeb' : 'white'
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#333', fontSize: '16px', flex: 1 }}>{child.name}</p>

                    {/* 3 Status-Buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Anwesend */}
                      <button onClick={() => setStatus(child.id, 'present')}
                        title="Anwesend"
                        style={{
                          width: '44px', height: '44px', border: '2px solid #16a34a',
                          background: child.status === 'present' ? '#16a34a' : 'white',
                          color: child.status === 'present' ? 'white' : '#16a34a',
                          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <Check size={22} />
                      </button>

                      {/* Fehlt unentschuldigt */}
                      <button onClick={() => setStatus(child.id, 'absent_unexcused')}
                        title="Fehlt unentschuldigt"
                        style={{
                          width: '44px', height: '44px', border: '2px solid #9ca3af',
                          background: child.status === 'absent_unexcused' ? '#6b7280' : 'white',
                          color: child.status === 'absent_unexcused' ? 'white' : '#6b7280',
                          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '16px'
                        }}>
                        –
                      </button>

                      {/* Fehlt entschuldigt */}
                      <button onClick={() => setStatus(child.id, 'absent_excused')}
                        title="Fehlt entschuldigt"
                        style={{
                          width: '44px', height: '44px', border: '2px solid #d97706',
                          background: child.status === 'absent_excused' ? '#d97706' : 'white',
                          color: child.status === 'absent_excused' ? 'white' : '#d97706',
                          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <Clock size={20} />
                      </button>
                    </div>

                    {/* Löschen */}
                    <button onClick={() => deleteChild(child.id)}
                      style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              }
            </div>

            {/* Legende */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Anwesend</span>
              <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>– Fehlt unentschuldigt</span>
              <span style={{ fontSize: '13px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Fehlt entschuldigt (Eltern-Funktion folgt)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
