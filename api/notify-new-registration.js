import { adminDb, adminMessaging, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';

// Wird direkt nach einer Neuregistrierung vom frisch angelegten (noch "pending") Account
// aufgerufen. Bewusst OHNE Rollen-Check (der Aufrufer hat ja noch keine Rolle) — aber der
// Nachrichtentext wird ausschließlich serverseitig aus dem bereits gespeicherten eigenen
// Nutzerprofil gebildet, damit kein beliebiger Text an Admins verschickt werden kann.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const callerUid = await verifyRequestUser(req);
    if (!callerUid) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }

    const db = adminDb();
    const callerSnap = await db.collection('users').doc(callerUid).get();
    if (!callerSnap.exists) {
      res.status(400).json({ error: 'Profil nicht gefunden' });
      return;
    }
    const caller = callerSnap.data();

    const adminsSnap = await db.collection('users').get();
    const adminUserIds = adminsSnap.docs
      .filter(d => {
        const data = d.data();
        const roles = data.roles?.length ? data.roles : [data.role];
        return roles.includes('admin');
      })
      .map(d => d.id);

    if (adminUserIds.length === 0) {
      res.status(200).json({ sent: 0, message: 'Keine Admins gefunden' });
      return;
    }

    const userType = caller.isParent ? 'Elternteil' : 'Jugendlicher / Trainer';
    const result = await sendPushToUsers(db, adminMessaging(), {
      userIds: adminUserIds,
      title: '🆕 Neue Registrierung',
      body: `${caller.name || caller.email} (${userType}) wartet auf Freischaltung.`,
      url: '/',
      category: 'other',
    });

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
