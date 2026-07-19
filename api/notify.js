import { adminDb, adminMessaging, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';

const ALLOWED_CATEGORIES = ['training', 'achievements', 'other'];
const SENDER_ROLES = ['admin', 'trainer'];

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
    const callerData = callerSnap.exists ? callerSnap.data() : null;
    const callerRoles = callerData?.roles?.length ? callerData.roles : [callerData?.role];
    if (!callerRoles.some(r => SENDER_ROLES.includes(r))) {
      res.status(403).json({ error: 'Keine Berechtigung zum Versenden' });
      return;
    }

    const { userIds, title, body, url, category } = req.body || {};
    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !body || !ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Ungültige Anfrage' });
      return;
    }

    const result = await sendPushToUsers(db, adminMessaging(), { userIds, title, body, url, category });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
