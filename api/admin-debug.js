import { adminDb } from './_lib/firebaseAdmin.js';

const getRoles = m => m.roles?.length ? m.roles : (m.role ? [m.role] : []);

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const db = adminDb();
    const q = String(req.query.q || 'luka weber').toLowerCase();

    const listeSnap = await db.collection('ttc').doc('mitgliederListe').get();
    const liste = listeSnap.exists ? (listeSnap.data().list || {}) : {};
    const listeMatches = Object.entries(liste)
      .filter(([, m]) => `${m.vorname} ${m.nachname}`.toLowerCase().includes(q))
      .map(([id, m]) => ({ id, vorname: m.vorname, nachname: m.nachname, email: m.email, roles: getRoles(m), linkedMemberIds: m.linkedMemberIds || m.linkedMemberId }));

    const finSnap = await db.collection('ttc').doc('mitgliederFinanzen').get();
    const fin = finSnap.exists ? (finSnap.data().list || {}) : {};
    listeMatches.forEach(m => { m.eintrittsdatum = fin[m.id]?.eintrittsdatum; m.austrittsdatum = fin[m.id]?.austrittsdatum; });

    const usersSnap = await db.collection('users').get();
    const userMatches = [];
    usersSnap.forEach(d => {
      const u = d.data();
      if ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(listeMatches[0]?.email?.toLowerCase() || '___')) {
        userMatches.push({ uid: d.id, name: u.name, email: u.email, roles: getRoles(u), role: u.role, primaryRole: u.primaryRole, linkedChildId: u.linkedChildId, linkedChildIds: u.linkedChildIds });
      }
    });

    const childrenSnap = await db.collection('ttc').doc('children').get();
    const childrenMap = childrenSnap.exists ? (childrenSnap.data() || {}) : {};
    const childMatches = Object.entries(childrenMap)
      .filter(([, c]) => (c.name || '').toLowerCase().includes(q))
      .map(([id, c]) => ({ id, name: c.name, subgroupId: c.subgroupId, seenAchievementKeys: c.seenAchievementKeys }));

    res.status(200).json({ listeMatches, userMatches, childMatches });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
