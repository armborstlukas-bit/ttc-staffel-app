import { getFahrplanItems } from './_lib/getFahrplanItems.js';
import { sendEmail } from './_lib/sendEmail.js';
import { adminDb, adminMessaging } from './_lib/firebaseAdmin.js';
import { sendPushToUsers } from './_lib/sendPush.js';

// Wird taeglich per externem Cron (z.B. cron-job.org) aufgerufen. Prueft, welche
// Auswaerts-/Heimspiele in genau 5 oder 1 Tagen stattfinden, und schickt dem/der im
// Fahrplan hinterlegten Fahrer/Betreuer (falls dort eine E-Mail-Adresse steht) eine
// Erinnerungsmail. Jede Erinnerung wird pro Spiel+Frist nur einmal verschickt
// (gemerkt in ttc/fahrplanReminderLog), auch wenn der Cron mehrfach am Tag laeuft.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_EMAIL = 'armborst.lukas@gmail.com';

function berlinDateStr(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const berlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const yyyy = berlin.getFullYear();
  const mm = String(berlin.getMonth() + 1).padStart(2, '0');
  const dd = String(berlin.getDate()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}`;
}

export default async function handler(req, res) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const items = await getFahrplanItems();
    const db = adminDb();

    // E-Mail -> Nutzer-UID Zuordnung, um neben der Mail auch eine Push-Nachricht an einen
    // ggf. existierenden App-Account mit derselben Adresse zu schicken.
    const usersSnap = await db.collection('users').get();
    const uidByEmail = new Map();
    usersSnap.forEach(d => {
      const email = (d.data()?.email || '').trim().toLowerCase();
      if (email) uidByEmail.set(email, d.id);
    });

    // Manueller Testmodus: ?testMeetingIds=id1,id2 verschickt sofort fuer diese
    // konkreten Spiele (ignoriert Datum-Check und Verlauf), nutzt aber die echten
    // Fahrer-Adressen dieser Spiele. Nur zum manuellen Ausprobieren, kein Cron-Pfad.
    if (req.query.testMeetingIds) {
      const ids = String(req.query.testMeetingIds).split(',');
      let testSent = 0;
      for (const id of ids) {
        const game = items.find(it => it.meetingId === id);
        if (!game) continue;
        // Testmails/-pushes gehen unabhaengig vom echten Fahrer immer nur an TEST_EMAIL,
        // damit beim Ausprobieren keine echten Vereinsmitglieder benachrichtigt werden.
        const artLabel = game.isHeimspiel ? 'Treffpunkt' : 'Abfahrt';
        const html = `
          <p>Hallo,</p>
          <p><b>[TEST]</b> kleine Erinnerung: In Kürze steht folgendes Punktspiel an, bei dem du als Fahrer/Betreuer eingetragen bist:</p>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><b>Datum</b></td><td>${game.datum}${game.zeit ? ', ' + game.zeit + ' Uhr' : ''}</td></tr>
            <tr><td><b>Spiel</b></td><td>${game.heim} – ${game.gast}</td></tr>
            <tr><td><b>Liga</b></td><td>${game.ligaName || game.liga}</td></tr>
            ${game.halle ? `<tr><td><b>Halle</b></td><td>${game.halle}</td></tr>` : ''}
            ${game.treffpunkt ? `<tr><td><b>${artLabel}</b></td><td>${game.treffpunkt} Uhr</td></tr>` : ''}
          </table>
          <p>Sportliche Grüße<br/>TTC Grün-Weiß Staffel</p>
        `;
        await sendEmail({ to: TEST_EMAIL, subject: `[TEST] Erinnerung: ${game.heim} – ${game.gast}`, html });
        const uid = uidByEmail.get(TEST_EMAIL.toLowerCase());
        if (uid) {
          await sendPushToUsers(db, adminMessaging(), {
            userIds: [uid],
            title: '⚠️ [TEST] Bitte ans Abmelden denken',
            body: `${game.heim} – ${game.gast} (${game.datum})`,
            url: `/?notif=fahrplan`,
            category: 'training',
          });
        }
        testSent++;
      }
      res.status(200).json({ testSent });
      return;
    }

    const logSnap = await db.collection('ttc').doc('fahrplanReminderLog').get();
    const log = logSnap.exists ? (logSnap.data() || {}) : {};

    const targets = [
      { days: 5, label: '5 Tage' },
      { days: 1, label: '1 Tag' },
    ];

    let sent = 0;
    const updatedLog = { ...log };

    for (const target of targets) {
      const targetDate = berlinDateStr(target.days);
      const dueGames = items.filter(it => it.datum === targetDate && it.meetingId);

      for (const game of dueGames) {
        const fahrer = (game.fahrer || '').trim();
        if (!EMAIL_REGEX.test(fahrer)) continue; // nur wenn dort wirklich eine E-Mail steht

        const logKey = `${game.meetingId}_${target.days}`;
        if (updatedLog[logKey]) continue; // bereits verschickt

        const artLabel = game.isHeimspiel ? 'Treffpunkt' : 'Abfahrt';
        const html = `
          <p>Hallo,</p>
          <p>kleine Erinnerung: In <b>${target.label}</b> steht folgendes Punktspiel an, bei dem du als Fahrer/Betreuer eingetragen bist:</p>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><b>Datum</b></td><td>${game.datum}${game.zeit ? ', ' + game.zeit + ' Uhr' : ''}</td></tr>
            <tr><td><b>Spiel</b></td><td>${game.heim} – ${game.gast}</td></tr>
            <tr><td><b>Liga</b></td><td>${game.ligaName || game.liga}</td></tr>
            ${game.halle ? `<tr><td><b>Halle</b></td><td>${game.halle}</td></tr>` : ''}
            ${game.treffpunkt ? `<tr><td><b>${artLabel}</b></td><td>${game.treffpunkt} Uhr</td></tr>` : ''}
          </table>
          <p>Sportliche Grüße<br/>TTC Grün-Weiß Staffel</p>
        `;

        try {
          await sendEmail({
            to: fahrer,
            subject: `Erinnerung (${target.label}): ${game.heim} – ${game.gast}`,
            html,
          });
          const uid = uidByEmail.get(fahrer.toLowerCase());
          if (uid) {
            try {
              await sendPushToUsers(db, adminMessaging(), {
                userIds: [uid],
                title: '⚠️ Bitte ans Abmelden denken',
                body: `In ${target.label}: ${game.heim} – ${game.gast}${game.treffpunkt ? ` (${artLabel}: ${game.treffpunkt} Uhr)` : ''}`,
                url: `/?notif=fahrplan`,
                category: 'training',
              });
            } catch (pushErr) {
              console.error('[cron-fahrplan-reminders] Push-Fehler bei', fahrer, pushErr?.message);
            }
          }
          updatedLog[logKey] = new Date().toISOString();
          sent++;
        } catch (e) {
          console.error('[cron-fahrplan-reminders] Fehler beim Senden an', fahrer, e?.message);
        }
      }
    }

    await db.collection('ttc').doc('fahrplanReminderLog').set(updatedLog);

    res.status(200).json({ sent });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
