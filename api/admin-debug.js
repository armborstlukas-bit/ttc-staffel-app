import { adminDb } from './_lib/firebaseAdmin.js';

// Temporaerer Debug-Endpunkt fuer einmalige manuelle Datenbereinigung. Wird nach Gebrauch wieder entfernt.
export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = adminDb();
  if (req.query.action === 'list-subgroups') {
    const snap = await db.collection('ttc').doc('subgroups').get();
    res.status(200).json(snap.exists ? snap.data() : {});
    return;
  }
  if (req.query.action === 'clear-attendance-date') {
    const { subgroupId, date } = req.query;
    if (!subgroupId || !date) { res.status(400).json({ error: 'subgroupId und date erforderlich' }); return; }
    const childrenSnap = await db.collection('ttc').doc('children').get();
    const children = childrenSnap.exists ? childrenSnap.data() : {};
    const updated = { ...children };
    const cleared = [];
    Object.values(children).forEach(c => {
      if (c.subgroupId === subgroupId && c.attendance && date in c.attendance) {
        const att = { ...c.attendance };
        delete att[date];
        updated[c.id] = { ...c, attendance: att };
        cleared.push(c.name);
      }
    });
    await db.collection('ttc').doc('children').set(updated);
    res.status(200).json({ cleared });
    return;
  }
  res.status(400).json({ error: 'unknown action' });
}
