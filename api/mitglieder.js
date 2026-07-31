import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

const getMemberRoles = m => m.roles?.length ? m.roles : (m.role ? [m.role] : []);
const getMemberLinkedIds = m => m.linkedMemberIds?.length ? m.linkedMemberIds : (m.linkedMemberId ? [m.linkedMemberId] : []);

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
    res.status(404).json({ error: 'unknown action' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
