import { adminDb } from './_lib/firebaseAdmin.js';

const getRoles = m => m.roles?.length ? m.roles : (m.role ? [m.role] : []);
const getLinkedIds = m => m.linkedMemberIds?.length ? m.linkedMemberIds : (m.linkedMemberId ? [m.linkedMemberId] : []);

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

    const byEmail = new Map();
    Object.entries(liste).forEach(([id, m]) => {
      const email = (m.email || '').trim().toLowerCase();
      if (!email) return;
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email).push([id, m]);
    });

    const problems = [];
    const ok = [];
    for (const [email, entries] of byEmail.entries()) {
      if (entries.length < 2) continue;
      const eltern = entries.filter(([, m]) => getRoles(m).includes('eltern'));
      const jugendliche = entries.filter(([, m]) => getRoles(m).includes('jugendlich'));
      if (eltern.length === 0 || jugendliche.length === 0) continue;
      for (const [jid, jm] of jugendliche) {
        for (const [eid, em] of eltern) {
          const linked = getLinkedIds(em).includes(jid);
          const entry = {
            email,
            elternId: eid, elternName: `${em.vorname} ${em.nachname}`,
            jugendlichId: jid, jugendlichName: `${jm.vorname} ${jm.nachname}`,
          };
          if (linked) ok.push(entry); else problems.push(entry);
        }
      }
    }

    res.status(200).json({ problemCount: problems.length, problems, okCount: ok.length });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
