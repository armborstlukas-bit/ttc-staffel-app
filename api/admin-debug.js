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
    const entries = Object.entries(liste).slice(0, 3);
    const finSnap = await db.collection('ttc').doc('mitgliederFinanzen').get();
    const fin = finSnap.exists ? (finSnap.data().list || {}) : {};
    const sample = entries.map(([id, m]) => ({ id, m, fin: fin[id] }));
    res.status(200).json({ sample });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
