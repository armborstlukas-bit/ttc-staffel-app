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

    if (req.method === 'POST' && req.query.action === 'fix-mismatches') {
      const fixed = [];
      for (const mm of mismatches) {
        const userDoc = await db.collection('users').doc(mm.uid).get();
        const user = userDoc.exists ? userDoc.data() : {};
        const primaryRole = (user.primaryRole && mm.mitgliedRoles.includes(user.primaryRole)) ? user.primaryRole : mm.mitgliedRoles[0];
        const updated = { ...user, roles: mm.mitgliedRoles, role: primaryRole, primaryRole };
        await db.collection('users').doc(mm.uid).set(updated, { merge: true });
        const ttcUsersSnap = await db.collection('ttc').doc('users').get();
        const ttcUsers = ttcUsersSnap.exists ? ttcUsersSnap.data() : {};
        ttcUsers[mm.uid] = updated;
        await db.collection('ttc').doc('users').set(ttcUsers);
        fixed.push({ uid: mm.uid, name: mm.name, newRoles: mm.mitgliedRoles });
      }
      res.status(200).json({ fixedCount: fixed.length, fixed });
      return;
    }

    res.status(200).json({ pendingCount: pendingUsers.length, pendingUsers, mismatchCount: mismatches.length, mismatches });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
