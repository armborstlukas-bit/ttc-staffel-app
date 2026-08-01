import { adminDb } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const db = adminDb();
    const listeSnap = await db.collection('ttc').doc('mitgliederListe').get();
    const liste = listeSnap.exists ? (listeSnap.data().list || {}) : {};
    const childrenSnap = await db.collection('ttc').doc('children').get();
    const childrenMap = childrenSnap.exists ? (childrenSnap.data() || {}) : {};
    const usersSnap = await db.collection('users').get();

    const q = String(req.query.q || 'krings').toLowerCase();
    const listeMatches = Object.entries(liste)
      .filter(([, m]) => `${m.vorname} ${m.nachname}`.toLowerCase().includes(q))
      .map(([id, m]) => ({ id, vorname: m.vorname, nachname: m.nachname, roles: m.roles || m.role, linkedMemberIds: m.linkedMemberIds || m.linkedMemberId, email: m.email }));
    const childMatches = Object.entries(childrenMap)
      .filter(([, c]) => (c.name || '').toLowerCase().includes(q))
      .map(([id, c]) => ({ id, name: c.name, subgroupId: c.subgroupId }));

    let lukasUser = null;
    usersSnap.forEach(d => {
      const data = d.data();
      if ((data.email || '').toLowerCase() === String(req.query.email || 'armborst.lukas@gmail.com').toLowerCase()) {
        lukasUser = { uid: d.id, roles: data.roles, role: data.role, linkedChildId: data.linkedChildId, linkedChildIds: data.linkedChildIds };
      }
    });

    res.status(200).json({ listeMatches, childMatches, lukasUser });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
