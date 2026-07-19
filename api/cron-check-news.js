import { adminDb, adminMessaging } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';
import { fetchTtcNewsItems } from './_lib/fetchNews.js';

// Läuft per Vercel Cron. Prüft, ob es einen neuen TTC-News-Artikel gibt
// (verglichen mit dem zuletzt gesehenen Link) und benachrichtigt alle Nutzer,
// die die Kategorie "Sonstige Nachrichten" aktiviert haben.
export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db = adminDb();
    const items = await fetchTtcNewsItems(1);
    if (items.length === 0) {
      res.status(200).json({ sent: 0, message: 'Kein Artikel gefunden' });
      return;
    }
    const latest = items[0];

    const stateSnap = await db.collection('ttc').doc('newsState').get();
    const lastSeenLink = stateSnap.exists ? stateSnap.data().lastSeenLink : null;

    if (lastSeenLink === latest.link) {
      res.status(200).json({ sent: 0, message: 'Kein neuer Artikel' });
      return;
    }

    await db.collection('ttc').doc('newsState').set({ lastSeenLink: latest.link, updatedAt: new Date().toISOString() });

    // Beim allerersten Lauf (noch kein gespeicherter Stand) nur merken, nicht pushen —
    // sonst würde der neueste Bestandsartikel beim ersten Cron-Durchlauf sofort verschickt.
    if (!lastSeenLink) {
      res.status(200).json({ sent: 0, message: 'Erstlauf, Stand gespeichert' });
      return;
    }

    const usersSnap = await db.collection('users').get();
    const allUserIds = usersSnap.docs.map(d => d.id);

    const result = await sendPushToUsers(db, adminMessaging(), {
      userIds: allUserIds,
      title: '📰 Neue TTC News',
      body: latest.title,
      url: '/?notif=news',
      category: 'other',
    });

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
