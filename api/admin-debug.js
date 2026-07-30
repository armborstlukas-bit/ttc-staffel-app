import { adminDb } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = adminDb();
  if (req.query.action === 'set-passiv-defaults') {
    const snap = await db.collection('ttc').doc('mitgliederListe').get();
    const list = snap.exists() ? (snap.data().list || {}) : {};
    let changed = 0;
    const updates = {};
    Object.entries(list).forEach(([id, m]) => {
      const roles = m.roles?.length ? m.roles : (m.role ? [m.role] : []);
      if (roles.length === 0) {
        updates[`list.${id}.roles`] = ['passiv'];
        updates[`list.${id}.role`] = 'passiv';
        changed++;
      }
    });
    if (changed > 0) await db.collection('ttc').doc('mitgliederListe').update(updates);
    res.status(200).json({ changed });
    return;
  }
  res.status(400).json({ error: 'unknown action' });
}
