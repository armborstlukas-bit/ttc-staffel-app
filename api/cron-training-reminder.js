import { adminDb, adminMessaging } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';

// Läuft täglich per Vercel Cron. Erinnert an Trainings, die "morgen" (Europe/Berlin)
// stattfinden und für die ein Kind/Spieler noch nicht per Abstimmung reagiert hat.
export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db = adminDb();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD

    const [sessionsSnap, childrenSnap, usersSnap] = await Promise.all([
      db.collection('ttc').doc('sessions').get(),
      db.collection('ttc').doc('children').get(),
      db.collection('users').get(),
    ]);
    const sessions = sessionsSnap.exists ? sessionsSnap.data() : {};
    const children = childrenSnap.exists ? childrenSnap.data() : {};
    const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

    const tomorrowSessions = Object.values(sessions).filter(s => s.date === tomorrowStr);
    if (tomorrowSessions.length === 0) {
      res.status(200).json({ sessions: 0, sent: 0 });
      return;
    }

    const userIdsToNotify = new Set();

    for (const session of tomorrowSessions) {
      const childIdsInSession = new Set();
      Object.values(children).forEach(c => {
        if ((session.subgroupIds || []).includes(c.subgroupId)) childIdsInSession.add(c.id);
      });
      (session.extraPlayerIds || []).forEach(id => childIdsInSession.add(id));

      for (const childId of childIdsInSession) {
        const responded = (session.responses || {})[childId];
        if (responded) continue; // schon abgestimmt

        users.forEach(u => {
          const linkedIds = u.linkedChildIds?.length > 0 ? u.linkedChildIds : (u.linkedChildId ? [u.linkedChildId] : []);
          if (linkedIds.includes(childId)) userIdsToNotify.add(u.uid);
        });
      }
    }

    if (userIdsToNotify.size === 0) {
      res.status(200).json({ sessions: tomorrowSessions.length, sent: 0 });
      return;
    }

    const result = await sendPushToUsers(db, adminMessaging(), {
      userIds: [...userIdsToNotify],
      title: '🏓 Training morgen',
      body: 'Bitte gib an, ob du morgen zum Training kommst.',
      url: '/',
      category: 'training',
    });

    res.status(200).json({ sessions: tomorrowSessions.length, ...result });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
