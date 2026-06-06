import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Check, X, Plus, Trash2, Download, ChevronDown, ChevronUp, LogOut } from 'lucide-react';

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

export default function TrainingsApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');

  // Auth-Status überwachen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Daten aus Firestore laden (Echtzeit)
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'clubs', 'ttc-staffel');
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setGroups(snap.data().groups || []);
      } else {
        const defaultGroups = [
          { id: 1, name: 'Anfänger', children: [] },
          { id: 2, name: 'Noppenspiel', children: [] },
          { id: 3, name: 'Versierte', children: [] }
        ];
        setGroups(defaultGroups);
        setDoc(ref, { groups: defaultGroups });
      }
    });
    return unsubscribe;
  }, [user]);

  // Daten in Firestore speichern
  const saveGroups = (updated) => {
    setGroups(updated);
    if (user) {
      setDoc(doc(db, 'clubs', 'ttc-staffel'), { groups: updated });
    }
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
      setError('Registrierung fehlgeschlagen. Email bereits vergeben oder Passwort zu kurz (min. 6 Zeichen)!');
    }
  };

  const handleLogout = () => signOut(auth);

  const addGroup = () => {
    if (newGroupName.trim()) {
      saveGroups([...groups, { id: Date.now(), name: newGroupName, children: [] }]);
      setNewGroupName('');
    }
  };

  const deleteGroup = (groupId) => {
    saveGroups(groups.filter(g => g.id !== groupId));
  };

  const addChild = (groupId) => {
    if (newChildName.trim()) {
      saveGroups(groups.map(g =>
        g.id === groupId
          ? { ...g, children: [...g.children, { id: Date.now(), name: newChildName, present: null, notes: '' }] }
          : g
      ));
      setNewChildName('');
    }
  };

  const deleteChild = (groupId, childId) => {
    saveGroups(groups.map(g =>
      g.id === groupId ? { ...g, children: g.children.filter(c => c.id !== childId) } : g
    ));
  };

  const togglePresence = (groupId, childId, value) => {
    saveGroups(groups.map(g =>
      g.id === groupId
        ? { ...g, children: g.children.map(c =>
            c.id === childId ? { ...c, present: c.present === value ? null : value } : c
          )}
        : g
    ));
  };

  const updateNotes = (groupId, childId, notes) => {
    saveGroups(groups.map(g =>
      g.id === groupId
        ? { ...g, children: g.children.map(c => c.id === childId ? { ...c, notes } : c) }
        : g
    ));
  };

  const exportToCSV = () => {
    let csv = `Trainingstag,${trainingDate}\nTrainer,${user?.email}\nGruppe,Name,Anwesenheit,Notizen\n`;
    groups.forEach(group => {
      group.children.forEach((child, idx) => {
        const p = child.present === true ? 'Da' : child.present === false ? 'Abwesend' : 'Keine Angabe';
        csv += `${idx === 0 ? group.name : ''},"${child.name}",${p},"${child.notes}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TTC_Training_${trainingDate}.csv`;
    link.click();
  };

  const resetDay = () => {
    if (window.confirm('Wirklich alle Anwesenheits-Einträge zurücksetzen?')) {
      saveGroups(groups.map(g => ({ ...g, children: g.children.map(c => ({ ...c, present: null, notes: '' })) })));
    }
  };

  const getStats = (group) => ({
    present: group.children.filter(c => c.present === true).length,
    absent: group.children.filter(c => c.present === false).length,
    total: group.children.length
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'white', fontSize: '20px' }}>Laden...</p>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#358941', fontSize: '28px', textAlign: 'center' }}>TTC Staffel</h1>
        <p style={{ margin: '0 0 32px 0', color: '#666', textAlign: 'center' }}>Trainingsapp</p>
        {error && <p style={{ color: 'red', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="email" placeholder="E-Mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
            style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
          <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required
            style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #358941 0%, #9cc18f 100%)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px 0', color: '#358941', fontSize: '28px' }}>TTC Staffel Training</h1>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Trainer: <strong>{user?.email}</strong></p>
            </div>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              <LogOut size={18} /> Abmelden
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
            <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#358941', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              <Download size={18} /> Export CSV
            </button>
            <button onClick={resetDay} style={{ padding: '10px 16px', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              Zurücksetzen
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>Neue Trainingsgruppe</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Gruppenname (z.B. Fortgeschrittene)" value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)} onKeyPress={e => e.key === 'Enter' && addGroup()}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
            <button onClick={addGroup} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#358941', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              <Plus size={18} /> Gruppe
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {groups.map(group => {
            const stats = getStats(group);
            const isExpanded = expandedGroup === group.id;
            return (
              <div key={group.id} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: '#f8f9fa', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #ddd' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: '0 0 8px 0', color: '#358941', fontSize: '20px' }}>{group.name}</h2>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>✓ {stats.present} da · ✗ {stats.absent} abwesend · {stats.total} insgesamt</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteGroup(group.id); }}
                    style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}>
                    <Trash2 size={18} />
                  </button>
                  <div style={{ marginLeft: '12px', color: '#999' }}>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder={`Kind hinzufügen...`}
                        value={selectedGroup === group.id ? newChildName : ''}
                        onChange={e => { setSelectedGroup(group.id); setNewChildName(e.target.value); }}
                        onFocus={() => setSelectedGroup(group.id)}
                        onKeyPress={e => e.key === 'Enter' && addChild(group.id)}
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
                      <button onClick={() => addChild(group.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#358941', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                        <Plus size={18} /> Kind
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {group.children.length === 0
                        ? <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Noch keine Kinder. Oben hinzufügen!</p>
                        : group.children.map(child => (
                          <div key={child.id} style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                              <p style={{ margin: 0, fontWeight: '600', color: '#333', fontSize: '16px', flex: 1 }}>{child.name}</p>
                              <button onClick={() => togglePresence(group.id, child.id, true)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: '2px solid #16a34a', background: child.present === true ? '#16a34a' : 'white', color: child.present === true ? 'white' : '#16a34a', borderRadius: '6px', cursor: 'pointer' }}>
                                <Check size={24} />
                              </button>
                              <button onClick={() => togglePresence(group.id, child.id, false)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: '2px solid #dc2626', background: child.present === false ? '#dc2626' : 'white', color: child.present === false ? 'white' : '#dc2626', borderRadius: '6px', cursor: 'pointer' }}>
                                <X size={24} />
                              </button>
                              <button onClick={() => deleteChild(group.id, child.id)}
                                style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                            <input type="text" placeholder="Notizen (z.B. Verletzt, Verspätet)..." value={child.notes}
                              onChange={e => updateNotes(group.id, child.id, e.target.value)}
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                          </div>
                        ))
                      }
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
