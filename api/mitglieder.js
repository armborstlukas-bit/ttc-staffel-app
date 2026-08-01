import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

const getMemberRoles = m => m.roles?.length ? m.roles : (m.role ? [m.role] : []);
const getMemberLinkedIds = m => m.linkedMemberIds?.length ? m.linkedMemberIds : (m.linkedMemberId ? [m.linkedMemberId] : []);

async function requireAdmin(req, res) {
  const uid = await verifyRequestUser(req);
  if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return null; }
  const snap = await adminDb().collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const roles = data.roles?.length ? data.roles : (data.role ? [data.role] : []);
  if (!roles.includes('admin')) { res.status(403).json({ error: 'Nur Admins' }); return null; }
  return uid;
}

// Gleicht Rollen aus der Mitgliederliste verbindlich mit dem echten App-Account ab —
// läuft komplett serverseitig gegen den aktuellen Datenbankstand (keine veralteten
// Client-Daten wie zuvor), damit eine Rollenänderung IMMER beim Account ankommt.
// Ohne body.mitgliedId wird die komplette Liste abgeglichen (Massen-Check vor dem Launch).
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

  const onlyId = req.body?.mitgliedId || null;
  const writes = [];
  let fixed = 0;
  const fixedNames = [];

  for (const [id, m] of Object.entries(liste)) {
    if (onlyId && id !== onlyId) continue;
    const email = (m.email || '').trim().toLowerCase();
    if (!email) continue;
    // Wurden alle Rollen entfernt, fällt der Account auf "pending" zurück statt unverändert
    // (mit alten, nicht mehr gültigen Rollen) zu bleiben.
    const mRoles = getMemberRoles(m).length ? getMemberRoles(m) : ['pending'];
    const uid = byEmail.get(email);
    if (!uid) continue;

    const user = allUsers[uid];
    const curRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    const same = curRoles.length === mRoles.length && mRoles.every(r => curRoles.includes(r));
    if (same) continue;

    const primaryRole = (user.primaryRole && mRoles.includes(user.primaryRole)) ? user.primaryRole : mRoles[0];
    const updated = { ...user, roles: mRoles, role: primaryRole, primaryRole };
    writes.push(db.collection('users').doc(uid).set(updated, { merge: true }));
    ttcUsers[uid] = updated;
    fixed++;
    fixedNames.push(`${m.vorname} ${m.nachname}`);
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
  const matches = Object.values(list).filter(m => (m.email || '').trim().toLowerCase() === email && getMemberRoles(m).length > 0);
  const roles = [...new Set(matches.flatMap(getMemberRoles))];

  let linkedMembers = [];
  if (roles.includes('eltern')) {
    const linkedIds = [...new Set(matches.flatMap(getMemberLinkedIds))];
    linkedMembers = linkedIds.map(lid => list[lid]).filter(Boolean).map(m => ({ vorname: m.vorname, nachname: m.nachname }));
  }

  res.status(200).json({ roles, linkedMembers });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && req.query.action === 'match-email') return handleMatchEmail(req, res);
    if (req.method === 'POST' && req.query.action === 'sync-roles') return handleSyncRoles(req, res);
    res.status(404).json({ error: 'unknown action' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
