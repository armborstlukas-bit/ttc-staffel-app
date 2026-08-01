import { adminDb } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const db = adminDb();
    const q = String(req.query.q || 'lilly').toLowerCase();

    const childrenSnap = await db.collection('ttc').doc('children').get();
    const childrenMap = childrenSnap.exists ? (childrenSnap.data() || {}) : {};
    const childMatches = Object.entries(childrenMap)
      .filter(([, c]) => (c.name || '').toLowerCase().includes(q))
      .map(([id, c]) => ({ id, name: c.name, achievements: c.achievements, seenAchievementKeys: c.seenAchievementKeys, lastAchievementCheckAt: c.lastAchievementCheckAt }));

    const usersSnap = await db.collection('users').get();
    const userMatches = [];
    usersSnap.forEach(d => {
      const data = d.data();
      if ((data.name || '').toLowerCase().includes(q) || (data.email || '').toLowerCase().includes(q)) {
        userMatches.push({ uid: d.id, name: data.name, email: data.email, roles: data.roles, role: data.role, primaryRole: data.primaryRole, linkedChildId: data.linkedChildId, linkedChildIds: data.linkedChildIds });
      }
    });

    if (req.method === 'POST' && req.query.action === 'fix-seen') {
      const childId = String(req.query.childId || '');
      const child = childrenMap[childId];
      if (!child) { res.status(404).json({ error: 'child not found' }); return; }
      const realTeam = child.achievements?.team || 0;
      const fixedSeen = (child.seenAchievementKeys || []).filter(k => {
        const m = k.match(/^team_(\d+)$/);
        if (!m) return true;
        return Number(m[1]) <= realTeam;
      });
      await db.collection('ttc').doc('children').update({ [`${childId}.seenAchievementKeys`]: fixedSeen });
      res.status(200).json({ fixedSeen });
      return;
    }

    res.status(200).json({ childMatches, userMatches });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
