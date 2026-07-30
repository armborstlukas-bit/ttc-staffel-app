import { adminDb } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = adminDb();
  if (req.method === 'POST' && req.query.action === 'import-mitglieder') {
    const list = req.body;
    await db.collection('ttc').doc('mitgliederListe').set({ list });
    res.status(200).json({ ok: true, count: Object.keys(list).length });
    return;
  }
  res.status(400).json({ error: 'unknown action' });
}
