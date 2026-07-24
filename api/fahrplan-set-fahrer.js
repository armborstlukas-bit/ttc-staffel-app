import { adminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';

const EDITOR_ROLES = ['admin', 'trainer'];

// Speichert eine manuelle Fahrer/Betreuer-Zuweisung fuer ein einzelnes Spiel
// (per mytischtennis meeting_id) — nur fuer Admin/Trainer.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const callerUid = await verifyRequestUser(req);
    if (!callerUid) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }

    const db = adminDb();
    const callerSnap = await db.collection('users').doc(callerUid).get();
    const callerData = callerSnap.exists ? callerSnap.data() : null;
    const callerRoles = callerData?.roles?.length ? callerData.roles : [callerData?.role];
    if (!callerRoles.some(r => EDITOR_ROLES.includes(r))) {
      res.status(403).json({ error: 'Keine Berechtigung' });
      return;
    }

    const { meetingId, fahrer } = req.body || {};
    if (!meetingId) { res.status(400).json({ error: 'meetingId fehlt' }); return; }

    await db.collection('ttc').doc('fahrplanOverrides').set({ [meetingId]: fahrer || '' }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
