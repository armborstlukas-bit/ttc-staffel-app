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
    const listeSnap = await db.collection('ttc').doc('mitgliederListe').get();
    const liste = listeSnap.exists ? (listeSnap.data().list || {}) : {};
    const byEmail = new Map();
    Object.values(liste).forEach(m => {
      const email = (m.email || '').trim().toLowerCase();
      if (email) byEmail.set(email, m);
    });

    const usersSnap = await db.collection('users').get();
    const mismatches = [];
    const pendingUsers = [];
    usersSnap.forEach(d => {
      const u = d.data();
      const uRoles = u.roles?.length ? u.roles : (u.role ? [u.role] : []);
      const isPending = uRoles.includes('pending') || uRoles.length === 0;
      const email = (u.email || '').trim().toLowerCase();
      const m = email ? byEmail.get(email) : null;
      if (isPending) {
        pendingUsers.push({ uid: d.id, name: u.name, email: u.email, roles: uRoles, matchedInListe: !!m, listeRoles: m ? getRoles(m) : null });
      }
      if (m) {
        const mRoles = getRoles(m);
        const same = mRoles.length === uRoles.length && mRoles.every(r => uRoles.includes(r));
        if (mRoles.length > 0 && !same) {
          mismatches.push({ uid: d.id, name: u.name, email: u.email, userRoles: uRoles, mitgliedRoles: mRoles });
        }
      }
    });

    res.status(200).json({ pendingCount: pendingUsers.length, pendingUsers, mismatchCount: mismatches.length, mismatches });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
