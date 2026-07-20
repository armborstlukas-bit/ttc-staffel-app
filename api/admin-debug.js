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
  res.status(400).json({ error: 'unknown action' });
}
