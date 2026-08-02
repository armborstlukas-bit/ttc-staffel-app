import { adminDb } from './_lib/firebaseAdmin.js';

const calcAge = (geburtsdatum) => {
  if (!geburtsdatum) return null;
  const bd = new Date(geburtsdatum);
  if (isNaN(bd)) return null;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
};

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
    const finSnap = await db.collection('ttc').doc('mitgliederFinanzen').get();
    const fin = finSnap.exists ? (finSnap.data().list || {}) : {};

    const dryRun = req.query.dryRun !== 'false';
    const fixed = [];
    for (const [id, f] of Object.entries(fin)) {
      if (f?.beitragsart !== 'kind_unter10' || f?.austrittsdatum) continue;
      const geb = liste[id]?.geburtsdatum;
      const age = calcAge(geb);
      if (age === null || age < 10) continue;
      fixed.push({ id, name: `${liste[id]?.vorname||''} ${liste[id]?.nachname||''}`, geburtsdatum: geb, age, oldBeitrag: f.beitrag });
      if (!dryRun) {
        fin[id] = { ...f, beitragsart: 'kind_ab10', beitrag: f.beitrag === 72 ? 96 : f.beitrag };
      }
    }
    if (!dryRun && fixed.length > 0) {
      await db.collection('ttc').doc('mitgliederFinanzen').set({ list: fin });
    }
    res.status(200).json({ dryRun, fixedCount: fixed.length, fixed });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
