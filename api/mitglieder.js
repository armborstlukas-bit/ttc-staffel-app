import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

const getMemberRoles = m => m.roles?.length ? m.roles : (m.role ? [m.role] : []);
const getMemberLinkedIds = m => m.linkedMemberIds?.length ? m.linkedMemberIds : (m.linkedMemberId ? [m.linkedMemberId] : []);
const normName = s => (s || '').trim().toLowerCase();
// Ein Mitglied (v.a. Kinder) kann mehrere zugehörige E-Mail-Adressen haben — die eigene
// (falls schon vorhanden) UND z.B. die der Mutter/des Vaters, damit beide sich einloggen
// und auf dasselbe Profil zugreifen können, ohne dass sich ein Elternteil extra als "eltern"
// mit linkedMemberIds eintragen muss.
const getMemberEmails = m => {
  const all = [m.email, ...(Array.isArray(m.zusatzEmails) ? m.zusatzEmails : [])];
  return [...new Set(all.map(e => (e || '').trim().toLowerCase()).filter(Boolean))];
};

async function requireAdmin(req, res) {
  const uid = await verifyRequestUser(req);
  if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return null; }
  const snap = await adminDb().collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const roles = data.roles?.length ? data.roles : (data.role ? [data.role] : []);
  if (!roles.includes('admin')) { res.status(403).json({ error: 'Nur Admins' }); return null; }
  return uid;
}

async function requireStaff(req, res) {
  const uid = await verifyRequestUser(req);
  if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return null; }
  const snap = await adminDb().collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const roles = data.roles?.length ? data.roles : (data.role ? [data.role] : []);
  if (!roles.includes('admin') && !roles.includes('trainer')) { res.status(403).json({ error: 'Nur Admins/Trainer' }); return null; }
  return uid;
}

// Liefert für Trainer (die mitgliederListe wegen der DSGVO-Absicherung nicht direkt lesen
// dürfen) eine minimale, unsensible Liste der Jugendlichen (nur Name+ID) — genutzt, um beim
// Anlegen eines Kindes in einer Trainingsgruppe aus der Mitgliedsdatei auswählen zu können.
async function handleListJugendliche(req, res) {
  if (!(await requireStaff(req, res))) return;
  const snap = await adminDb().collection('ttc').doc('mitgliederListe').get();
  const liste = snap.exists ? (snap.data().list || {}) : {};
  const jugendliche = Object.entries(liste)
    .filter(([, m]) => getMemberRoles(m).includes('jugendlich'))
    .map(([id, m]) => ({ id, vorname: m.vorname || '', nachname: m.nachname || '' }));
  res.status(200).json({ jugendliche });
}

// Gleicht Rollen aus der Mitgliederliste verbindlich mit dem echten App-Account ab —
// läuft komplett serverseitig gegen den aktuellen Datenbankstand (keine veralteten
// Client-Daten wie zuvor), damit eine Rollenänderung IMMER beim Account ankommt.
// Läuft IMMER über die komplette Liste (auch wenn body.mitgliedId gesetzt ist — das Feld wird
// nur noch aus Kompatibilität akzeptiert, aber ignoriert): Ein Account kann sich mit MEHREREN
// Mitgliederlisten-Einträgen dieselbe E-Mail teilen (z.B. eine Mutter, die über dieselbe Adresse
// bei zwei eigenen Kind-Einträgen als zusatzEmail hinterlegt ist, um beide Kinder über einen
// Login zu sehen) — Rollen und Kinder-Verknüpfungen aus ALLEN betroffenen Einträgen werden pro
// Account zu einer Vereinigungsmenge zusammengeführt, statt dass der zuletzt verarbeitete
// Eintrag die Ergebnisse der anderen überschreibt (das war der eigentliche Bug).
async function handleSyncRoles(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const db = adminDb();

  const listeSnap = await db.collection('ttc').doc('mitgliederListe').get();
  const liste = listeSnap.exists ? (listeSnap.data().list || {}) : {};

  const usersSnap = await db.collection('users').get();
  const allUsers = {};
  const byEmail = new Map();
  usersSnap.forEach(d => {
    const data = d.data();
    allUsers[d.id] = data;
    const email = (data.email || '').trim().toLowerCase();
    if (email) byEmail.set(email, d.id);
  });

  const ttcUsersSnap = await db.collection('ttc').doc('users').get();
  const ttcUsers = ttcUsersSnap.exists ? ttcUsersSnap.data() : {};

  // Für den Live-Abgleich der zugeordneten Kinder (Eltern → linkedChildIds) wird die
  // echte Kinder-Sammlung gebraucht, um Mitgliederlisten-Einträge (m_xxx) per Namensabgleich
  // auf die tatsächlichen children-Datensätze (mit Trainings-/Anwesenheitsdaten) zu mappen.
  const childrenSnap = await db.collection('ttc').doc('children').get();
  const childrenMap = childrenSnap.exists ? (childrenSnap.data() || {}) : {};
  const childIdByName = new Map();
  Object.entries(childrenMap).forEach(([cid, c]) => {
    const n = normName(c.name);
    if (n) childIdByName.set(n, cid);
  });

  // 1) Pro Ziel-Account (uid) aus ALLEN passenden Mitgliederlisten-Einträgen sammeln, statt
  // pro Eintrag sofort zu schreiben.
  const aggByUid = new Map(); // uid -> { roles:Set, childIds:Set, linkedPlayerId, names:Set }
  for (const [, m] of Object.entries(liste)) {
    const emails = getMemberEmails(m);
    if (!emails.length) continue;
    // Wurden alle Rollen entfernt, fällt der Account auf "pending" zurück statt unverändert
    // (mit alten, nicht mehr gültigen Rollen) zu bleiben.
    const mRoles = getMemberRoles(m).length ? getMemberRoles(m) : ['pending'];

    const mappedChildIds = [];
    if (mRoles.includes('eltern')) {
      const linkedMemberIds = getMemberLinkedIds(m);
      linkedMemberIds
        .map(lid => liste[lid])
        .filter(Boolean)
        .forEach(lm => { const cid = childIdByName.get(normName(`${lm.vorname} ${lm.nachname}`)); if (cid) mappedChildIds.push(cid); });
    }
    if (mRoles.includes('jugendlich')) {
      // Jugendliche sind mit ihrem EIGENEN Kind-Datensatz zu verknüpfen (nicht mit einem
      // fremden Kind) — das wurde bisher nur bei "Eltern" gemacht, Jugendliche gingen leer aus
      // und sahen dadurch nie ihre eigenen Trainings-/Errungenschaftsdaten.
      const selfCid = childIdByName.get(normName(`${m.vorname} ${m.nachname}`));
      if (selfCid) mappedChildIds.push(selfCid);
    }

    // Manuelle TTR-Zuordnung (aktiveSpieler) ebenfalls laufend abgleichen — bisher wurde
    // users.linkedPlayerId nur beim manuellen Speichern von ttrRefId gesetzt, wenn zu dem
    // Zeitpunkt schon ein Account existierte. Registrierte sich die Person erst SPÄTER (oder
    // wurde ttrRefId vor der Registrierung gesetzt), blieb der TTR-Wert im Aktiven-Portal leer.
    const ttrRef = (mRoles.includes('aktiver') && (m.ttrRefId||'').startsWith('aktiv:')) ? m.ttrRefId.slice('aktiv:'.length) : null;

    for (const email of emails) {
      const uid = byEmail.get(email);
      if (!uid) continue;
      if (!aggByUid.has(uid)) aggByUid.set(uid, { roles: new Set(), childIds: new Set(), linkedPlayerId: null, names: new Set() });
      const agg = aggByUid.get(uid);
      mRoles.forEach(r => agg.roles.add(r));
      mappedChildIds.forEach(c => agg.childIds.add(c));
      if (ttrRef) agg.linkedPlayerId = ttrRef;
      agg.names.add(`${m.vorname} ${m.nachname}`);
    }
  }

  // 2) Pro Account EINMAL die zusammengeführten Rollen/Kinder schreiben.
  const writes = [];
  let fixed = 0;
  const fixedNames = [];
  for (const [uid, agg] of aggByUid.entries()) {
    const user = allUsers[uid];
    if (!user) continue;
    const mRoles = agg.roles.size ? [...agg.roles] : ['pending'];
    const curRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    const rolesSame = curRoles.length === mRoles.length && mRoles.every(r => curRoles.includes(r));

    let newLinkedChildIds = null;
    if (mRoles.includes('eltern') || mRoles.includes('jugendlich')) {
      const mappedUnique = [...agg.childIds];
      const curLinkedChildIds = user.linkedChildIds?.length ? user.linkedChildIds : (user.linkedChildId ? [user.linkedChildId] : []);
      const childrenSame = curLinkedChildIds.length === mappedUnique.length && mappedUnique.every(c => curLinkedChildIds.includes(c));
      if (!childrenSame) newLinkedChildIds = mappedUnique;
    }

    const targetLinkedPlayerId = mRoles.includes('aktiver') ? (agg.linkedPlayerId || null) : undefined;
    const linkedPlayerSame = targetLinkedPlayerId === undefined || targetLinkedPlayerId === (user.linkedPlayerId || null);

    if (rolesSame && newLinkedChildIds === null && linkedPlayerSame) continue;

    const primaryRole = (user.primaryRole && mRoles.includes(user.primaryRole)) ? user.primaryRole : mRoles[0];
    const updated = { ...user, roles: mRoles, role: primaryRole, primaryRole };
    if (newLinkedChildIds !== null) {
      updated.linkedChildIds = newLinkedChildIds;
      updated.linkedChildId = newLinkedChildIds[0] || null;
    }
    if (!linkedPlayerSame) updated.linkedPlayerId = targetLinkedPlayerId;
    writes.push(db.collection('users').doc(uid).set(updated, { merge: true }));
    ttcUsers[uid] = updated;
    fixed++;
    agg.names.forEach(n => { if (!fixedNames.includes(n)) fixedNames.push(n); });
  }

  await Promise.all(writes);
  if (fixed > 0) await db.collection('ttc').doc('users').set(ttcUsers);

  res.status(200).json({ fixed, fixedNames });
}

// Prüft bei der Registrierung, ob die E-Mail in der (jetzt admin-only geschützten)
// Mitgliederliste hinterlegt ist, und liefert die dort zugewiesenen Rollen zurück.
// Läuft server-seitig übers Admin SDK, da der Client selbst mitgliederListe nicht
// mehr direkt lesen darf (Firestore-Regeln erlauben das nur noch für Admins).
async function handleMatchEmail(req, res) {
  const uid = await verifyRequestUser(req);
  if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'email fehlt' }); return; }

  const snap = await adminDb().collection('ttc').doc('mitgliederListe').get();
  const list = snap.exists ? (snap.data().list || {}) : {};
  const matches = Object.values(list).filter(m => getMemberEmails(m).includes(email) && getMemberRoles(m).length > 0);
  const roles = [...new Set(matches.flatMap(getMemberRoles))];

  let linkedMembers = [];
  if (roles.includes('eltern')) {
    const linkedIds = [...new Set(matches.flatMap(getMemberLinkedIds))];
    linkedMembers = linkedIds.map(lid => list[lid]).filter(Boolean).map(m => ({ vorname: m.vorname, nachname: m.nachname }));
  }
  // Jugendliche mit der/den EIGENEN Mitgliedschaft(en) mitgeben, damit der Client sich selbst
  // mit dem/den passenden children-Datensatz/-sätzen verknüpfen kann (Trainings-/Errungenschafts-
  // daten). Kann MEHRERE Einträge liefern, wenn dieselbe E-Mail bei mehreren eigenen
  // jugendlich-Einträgen hinterlegt ist (z.B. ein Elternteil, das dieselbe Adresse bei beiden
  // Kindern als zusatzEmail eingetragen hat, um mit einem Login beide zu sehen).
  const ownNames = matches.filter(m => getMemberRoles(m).includes('jugendlich')).map(m => ({ vorname: m.vorname, nachname: m.nachname }));
  const ownName = ownNames[0] || null; // Kompatibilität mit älteren Client-Ständen
  // Manuelle TTR-Zuordnung (aktiveSpieler) mitgeben, falls für diesen Aktiven schon vor der
  // Registrierung ein TTR-Wert manuell zugeordnet wurde — sonst bleibt der TTR-Wert im
  // Aktiven-Portal leer, bis die Zuordnung nach der Registrierung erneut gespeichert wird.
  let linkedPlayerId = null;
  if (roles.includes('aktiver')) {
    const withTtrRef = matches.find(m => (m.ttrRefId||'').startsWith('aktiv:'));
    if (withTtrRef) linkedPlayerId = withTtrRef.ttrRefId.slice('aktiv:'.length);
  }

  res.status(200).json({ roles, linkedMembers, ownName, ownNames, linkedPlayerId });
}

// Spiegelt das eigene users/{uid}-Profil ins gemeinsame ttc/users-Übersichtsdokument.
// Läuft übers Admin SDK (umgeht die Firestore-Regeln), weil ttc/users aus Sicherheitsgründen
// nicht mehr direkt vom Client beschreibbar ist (sonst könnte jeder eingeloggte Nutzer dieses
// gemeinsame Dokument für ALLE Mitglieder überschreiben/korrumpieren). Wird bei der
// Registrierung und beim nachträglichen Eintragen des Namens (Pending-Screen) aufgerufen —
// beides Fälle, in denen der Nutzer noch kein Admin ist, sich aber selbst eintragen muss.
async function handleSyncSelfMirror(req, res) {
  const uid = await verifyRequestUser(req);
  if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }

  const db = adminDb();
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) { res.status(404).json({ error: 'Profil nicht gefunden' }); return; }
  const profile = { ...userSnap.data(), uid };

  const ttcUsersRef = db.collection('ttc').doc('users');
  await ttcUsersRef.set({ [uid]: profile }, { merge: true });

  res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && req.query.action === 'match-email') return handleMatchEmail(req, res);
    if (req.method === 'POST' && req.query.action === 'sync-roles') return handleSyncRoles(req, res);
    if (req.method === 'GET' && req.query.action === 'list-jugendliche') return handleListJugendliche(req, res);
    if (req.method === 'POST' && req.query.action === 'sync-self-mirror') return handleSyncSelfMirror(req, res);
    res.status(404).json({ error: 'unknown action' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
