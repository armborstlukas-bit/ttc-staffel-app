import { adminDb } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = adminDb();
  if (req.method === 'POST' && req.query.action === 'seed-abfahrtszeiten') {
    const clubs = req.body;
    await db.collection('ttc').doc('abfahrtszeiten').set({ clubs }, { merge: true });
    res.status(200).json({ ok: true, count: Object.keys(clubs).length });
    return;
  }
  res.status(400).json({ error: 'unknown action' });
}
