import { adminDb } from './_lib/firebaseAdmin.js';

const normName = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const db = adminDb();
    const records = req.body?.records;
    if (!Array.isArray(records)) { res.status(400).json({ error: 'records[] fehlt' }); return; }

    const listeSnap = await db.collection('ttc').doc('mitgliederListe').get();
    const liste = listeSnap.exists ? (listeSnap.data().list || {}) : {};
    const finanzSnap = await db.collection('ttc').doc('mitgliederFinanzen').get();
    const finanz = finanzSnap.exists ? (finanzSnap.data().list || {}) : {};

    const existingNames = new Set(Object.values(liste).map(m => normName(`${m.vorname} ${m.nachname}`)));

    let added = 0, skipped = 0;
    const addedNames = [];
    for (const rec of records) {
      const name = normName(`${rec.vorname || ''} ${rec.nachname || ''}`);
      if (!name.trim()) { skipped++; continue; }
      if (existingNames.has(name)) { skipped++; continue; }
      const id = 'm_ex_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      liste[id] = {
        vorname: rec.vorname || '', nachname: rec.nachname || '',
        geburtsdatum: rec.geburtsdatum || '', email: rec.email || '',
        roles: [], linkedMemberIds: [], excelMitgliedId: rec.excelMitgliedId || null,
      };
      finanz[id] = {
        strasse: rec.strasse || '', plz: rec.plz || '', ort: rec.ort || '',
        telefon: rec.telefon || '', handy: rec.handy || '',
        iban: rec.iban || '', bic: rec.bic || '',
        sepaMandatsRef: rec.sepaMandatsRef || '', sepaMandatsDatum: rec.sepaMandatsDatum || '',
        zahlart: rec.zahlart || '', zahler: rec.zahler || '', zahlweise: rec.zahlweise || '',
        beitragsart: '', beitrag: rec.beitrag || '', kontosaldo: rec.kontosaldo || 0,
        eintrittsdatum: rec.eintrittsdatum || '', austrittsdatum: rec.austrittsdatum || '',
      };
      existingNames.add(name);
      addedNames.push(`${rec.vorname} ${rec.nachname}`);
      added++;
    }

    await db.collection('ttc').doc('mitgliederListe').set({ list: liste });
    await db.collection('ttc').doc('mitgliederFinanzen').set({ list: finanz });

    res.status(200).json({ added, skipped, addedNames });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
