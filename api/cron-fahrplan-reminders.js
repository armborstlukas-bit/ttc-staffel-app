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

    // ── Änderungserkennung: Spielverlegungen etc. ────────────────────────────
    // Vergleicht jedes Spiel mit dem zuletzt gespeicherten Stand (ttc/fahrplanSnapshot).
    // Weicht Datum, Uhrzeit, Heim/Auswärts, Halle oder Treffpunkt/Abfahrt ab, wird NUR
    // der aktuell zugeordnete Betreuer (falls dort eine E-Mail steht) per Mail informiert.
    const snapSnap = await db.collection('ttc').doc('fahrplanSnapshot').get();
    const prevSnapshot = snapSnap.exists ? (snapSnap.data().items || {}) : {};
    const newSnapshot = {};
    const TRACKED_FIELDS = [
      { key: 'datum', label: 'Datum' },
      { key: 'zeit', label: 'Uhrzeit' },
      { key: 'isHeimspiel', label: 'Heim/Auswärts', fmt: v => (v === 'true' || v === true) ? 'Heimspiel' : 'Auswärtsspiel' },
      { key: 'halle', label: 'Halle' },
      { key: 'treffpunkt', label: 'Treffpunkt/Abfahrt' },
    ];
    let changeMailsSent = 0;
    for (const game of items) {
      if (!game.meetingId) continue;
      const snap = { datum: game.datum || '', zeit: game.zeit || '', isHeimspiel: !!game.isHeimspiel, halle: game.halle || '', treffpunkt: game.treffpunkt || '' };
      newSnapshot[game.meetingId] = snap;
      const prev = prevSnapshot[game.meetingId];
      if (!prev) continue; // erster bekannter Stand für dieses Spiel — keine "Änderung"

      const diffs = TRACKED_FIELDS.filter(f => String(prev[f.key]) !== String(snap[f.key]));
      if (diffs.length === 0) continue;

      const fahrer = (game.fahrer || '').trim();
      if (!EMAIL_REGEX.test(fahrer)) continue; // nur informieren, wenn ein Betreuer mit E-Mail zugeordnet ist

      // Immer ALLE aktuellen Spieldaten in der Mail zeigen (nicht nur die geänderten Felder!)
      // — sonst fehlen dem Empfänger z.B. Datum/Uhrzeit komplett, wenn sich nur die Halle
      // geändert hat. Geänderte Felder werden zusätzlich mit "war: ..." hervorgehoben.
      const diffKeys = new Set(diffs.map(f => f.key));
      const artLabel = game.isHeimspiel ? 'Treffpunkt' : 'Abfahrt';
      const rows = TRACKED_FIELDS.map(f => {
        const fmt = f.fmt || (v => v || '–');
        const label = f.key === 'treffpunkt' ? artLabel : f.label;
        const changed = diffKeys.has(f.key);
        const oldNote = changed ? ` <span style="color:#dc2626;font-size:12px">(war: ${fmt(prev[f.key])})</span>` : '';
        return `<tr><td><b>${label}</b></td><td>${changed?'<b>':''}${fmt(snap[f.key])}${changed?'</b>':''}${oldNote}</td></tr>`;
      }).join('');
      const html = `
        <p>Hallo,</p>
        <p>bei deinem Spiel hat sich etwas geändert — hier der komplette aktuelle Stand:</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Spiel</b></td><td>${game.heim} – ${game.gast}</td></tr>
          <tr><td><b>Liga</b></td><td>${game.ligaName || game.liga}</td></tr>
          ${rows}
        </table>
        <p>Den aktuellen Stand findest du jederzeit in der App unter "Wer fährt wann".</p>
        <p>Sportliche Grüße<br/>TTC Grün-Weiß Staffel</p>
      `;
      try {
        await sendEmail({ to: fahrer, subject: `Änderung bei deinem Spiel: ${game.heim} – ${game.gast}`, html });
        changeMailsSent++;
      } catch (e) {
        console.error('[cron-fahrplan-reminders] Fehler bei Änderungs-Mail an', fahrer, e?.message);
      }
    }
    await db.collection('ttc').doc('fahrplanSnapshot').set({ items: newSnapshot, updatedAt: new Date().toISOString() });

    res.status(200).json({ sent, changeMailsSent });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
