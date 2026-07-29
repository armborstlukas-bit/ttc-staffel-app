import { getFahrplanItems } from './_lib/getFahrplanItems.js';
import { sendEmail } from './_lib/sendEmail.js';
import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

// Manuell vom Admin ausgeloester Einmal-Versand: informiert jede Person, die irgendwo
// im "Wer faehrt wann"-Plan als Fahrer/Betreuer mit E-Mail-Adresse eingetragen ist,
// ueber ALLE ihre zugeteilten Spiele der Saison (Sammel-Mail statt Einzel-Erinnerung).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const callerUid = await verifyRequestUser(req);
    if (!callerUid) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }
    const callerSnap = await adminDb().collection('users').doc(callerUid).get();
    const callerData = callerSnap.exists ? callerSnap.data() : null;
    const callerRoles = callerData?.roles?.length ? callerData.roles : [callerData?.role];
    if (!callerRoles.includes('admin')) { res.status(403).json({ error: 'Nur fuer Admins' }); return; }

    const items = await getFahrplanItems();

    // Optional: nur an eine bestimmte Auswahl von E-Mail-Adressen verschicken
    // (aus dem "Einzelauswahl"-Modus in der App). Ohne Angabe: alle.
    const onlyEmails = Array.isArray(req.body?.emails) && req.body.emails.length > 0
      ? new Set(req.body.emails.map(e => String(e).trim().toLowerCase()))
      : null;

    const byEmail = new Map();
    items.forEach(it => {
      const fahrer = (it.fahrer || '').trim();
      if (!EMAIL_REGEX.test(fahrer)) return;
      const key = fahrer.toLowerCase();
      if (onlyEmails && !onlyEmails.has(key)) return;
      if (!byEmail.has(key)) byEmail.set(key, { email: fahrer, games: [] });
      byEmail.get(key).games.push(it);
    });

    let sent = 0;
    for (const { email, games } of byEmail.values()) {
      games.sort((a,b) => a.datum.split('.').reverse().join('').localeCompare(b.datum.split('.').reverse().join('')) || a.zeit.localeCompare(b.zeit));
      const rows = games.map(g => {
        const artLabel = g.isHeimspiel ? 'Treffpunkt' : 'Abfahrt';
        return `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${g.datum}${g.zeit ? ', ' + g.zeit + ' Uhr' : ''}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${g.heim} – ${g.gast}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${g.halle || ''}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${g.treffpunkt ? artLabel + ': ' + g.treffpunkt + ' Uhr' : ''}</td>
          </tr>`;
      }).join('');

      const html = `
        <p>Hallo,</p>
        <p>wir haben jetzt einen neuen "Wer fährt wann"-Plan in der TTC-App eingerichtet. Du bist dort für folgende Spiele als Fahrer/Betreuer eingetragen:</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
          <thead>
            <tr style="background:#dcfce7">
              <th style="padding:6px 10px;text-align:left">Datum</th>
              <th style="padding:6px 10px;text-align:left">Spiel</th>
              <th style="padding:6px 10px;text-align:left">Halle</th>
              <th style="padding:6px 10px;text-align:left">Treffpunkt/Abfahrt</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Den aktuellen Plan findest du jederzeit in der App unter "Wer fährt wann". Vor jedem deiner Spiele bekommst du außerdem automatisch nochmal eine Erinnerung (5 Tage und 1 Tag vorher).</p>
        <p>Sportliche Grüße<br/>TTC Grün-Weiß Staffel</p>
      `;

      try {
        await sendEmail({ to: email, subject: `Dein "Wer fährt wann"-Plan – ${games.length} Spiel${games.length===1?'':'e'}`, html });
        sent++;
      } catch (e) {
        console.error('[fahrplan-send-intro] Fehler bei', email, e?.message);
      }
    }

    res.status(200).json({ sent, recipients: byEmail.size });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
