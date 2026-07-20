import { adminDb, adminMessaging } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';

// Wandelt "Wanduhrzeit" in Berlin (z.B. 09:55 an einem bestimmten Datum) korrekt in
// einen UTC-Zeitpunkt um — berücksichtigt Sommer-/Winterzeit automatisch.
// (Vercel-Funktionen laufen intern in UTC, ein einfaches `new Date("...T09:55:00")`
// würde die Uhrzeit fälschlich als UTC statt als deutsche Zeit interpretieren.)
function berlinWallTimeToUtc(dateStr, timeStr) {
  const asUTC = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const berlinStr = asUTC.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
  const utcStr = asUTC.toLocaleString('en-US', { timeZone: 'UTC' });
  const offset = new Date(utcStr).getTime() - new Date(berlinStr).getTime();
  return new Date(asUTC.getTime() + offset);
}

// Wird von einem externen Cron-Dienst (z.B. cron-job.org) alle paar Minuten aufgerufen.
// Prüft, welche Trainingseinheiten gerade zeitlich beendet wurden, und erinnert die
// zugeordneten Trainer daran, die Anwesenheit einzutragen — aber nur einmal pro Einheit
// und nur, wenn noch nicht für alle Kinder eine Anwesenheit erfasst wurde.
export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db = adminDb();
    const [sessionsSnap, childrenSnap] = await Promise.all([
      db.collection('ttc').doc('sessions').get(),
      db.collection('ttc').doc('children').get(),
    ]);
    const sessions = sessionsSnap.exists ? sessionsSnap.data() : {};
    const children = childrenSnap.exists ? childrenSnap.data() : {};

    const now = new Date();
    const dueSessions = [];

    for (const session of Object.values(sessions)) {
      if (session.attendanceReminderSent) continue;
      if (!session.trainerUids?.length) continue;
      if (!session.date || !session.time) continue;

      // Ende = explizite Endzeit, sonst Startzeit + 2 Stunden als Annahme
      let endDateTime;
      if (session.endTime) {
        endDateTime = berlinWallTimeToUtc(session.date, session.endTime);
      } else {
        endDateTime = berlinWallTimeToUtc(session.date, session.time);
        endDateTime = new Date(endDateTime.getTime() + 2*60*60*1000);
      }
      if (endDateTime > now) continue; // noch nicht vorbei

      // Ist Anwesenheit schon für alle Kinder erfasst? Dann keine Erinnerung nötig.
      const allKidIds = new Set();
      Object.values(children).forEach(c => {
        if ((session.subgroupIds || []).includes(c.subgroupId)) allKidIds.add(c.id);
      });
      (session.extraPlayerIds || []).forEach(id => allKidIds.add(id));
      const allRecorded = allKidIds.size > 0 && [...allKidIds].every(id => !!(children[id]?.attendance || {})[session.date]);
      if (allRecorded) continue;

      dueSessions.push(session);
    }

    if (dueSessions.length === 0) {
      res.status(200).json({ sessions: 0, sent: 0 });
      return;
    }

    let totalSent = 0;
    const updatedSessions = { ...sessions };
    for (const session of dueSessions) {
      const result = await sendPushToUsers(db, adminMessaging(), {
        userIds: session.trainerUids,
        title: '📋 Anwesenheit eintragen',
        body: `Das Training um ${session.time} Uhr ist vorbei — bitte die Anwesenheit eintragen.`,
        url: `/?notif=attendance&sessionId=${session.id}`,
        category: 'training',
      });
      totalSent += result.sent || 0;
      updatedSessions[session.id] = { ...session, attendanceReminderSent: true };
    }
    await db.collection('ttc').doc('sessions').set(updatedSessions);

    res.status(200).json({ sessions: dueSessions.length, sent: totalSent });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
