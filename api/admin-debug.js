import { adminDb } from './_lib/firebaseAdmin.js';
import { getFahrplanItems } from './_lib/getFahrplanItems.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const db = adminDb();
  if (req.query.action === 'lock-in-fahrer') {
    const items = await getFahrplanItems();
    const snap = await db.collection('ttc').doc('fahrplanOverrides').get();
    const overrides = snap.exists ? (snap.data() || {}) : {};
    let added = 0;
    items.forEach(it => {
      if (it.meetingId && it.fahrer && overrides[it.meetingId] == null) {
        overrides[it.meetingId] = it.fahrer;
        added++;
      }
    });
    await db.collection('ttc').doc('fahrplanOverrides').set(overrides);
    res.status(200).json({ added, totalOverrides: Object.keys(overrides).length });
    return;
  }
  res.status(400).json({ error: 'unknown action' });
}
