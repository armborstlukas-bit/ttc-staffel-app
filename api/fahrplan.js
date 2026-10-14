import { getFahrplanItems } from './_lib/getFahrplanItems.js';
import { sendEmail } from './_lib/sendEmail.js';
import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

const EDITOR_ROLES = ['admin', 'trainer'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireRole(req, res, roles) {
  const callerUid = await verifyRequestUser(req);
  if (!callerUid) { res.status(401).json({ error: 'Nicht angemeldet' }); return null; }
  const callerSnap = await adminDb().collection('users').doc(callerUid).get();
  const callerData = callerSnap.exists ? callerSnap.data() : null;
  const callerRoles = callerData?.roles?.length ? callerData.roles : [callerData?.role];
  if (!callerRoles.some(r => roles.includes(r))) { res.status(403).json({ error: 'Keine Berechtigung' }); return null; }
  return callerUid;
}

// Speichert eine manuelle Fahrer/Betreuer-Zuweisung fuer ein einzelnes Spiel (Admin/Trainer).
async function handleSetFahrer(req, res) {
  if (!(await requireRole(req, res, EDITOR_ROLES))) return;
  const { meetingId, fahrer } = req.body || {};
  if (!meetingId) { res.status(400).json({ error: 'meetingId fehlt' }); return; }
  await adminDb().collection('ttc').doc('fahrplanOverrides').set({ [meetingId]: fahrer || '' }, { merge: true });
  res.status(200).json({ ok: true });
}

// Manueller Einmal-Versand: informiert jede Person mit E-Mail im Fahrplan ueber ALLE ihre
// zugeteilten Spiele der Saison (Sammel-Mail statt Einzel-Erinnerung). Nur Admin.
async function handleSendIntro(req, res) {
  if (!(await requireRole(req, res, ['admin']))) return;
  const items = await getFahrplanItems();
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
      console.error('[fahrplan send-intro] Fehler bei', email, e?.message);
    }
  }

  res.status(200).json({ sent, recipients: byEmail.size });
}

// "Vorname N." – auf der öffentlichen Webseite nur abgekürzte Namen, nie E-Mail-Adressen.
function shortName(full) {
  const words = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] || '';
  const last = words[words.length - 1];
  return [...words.slice(0, -1), last.length > 2 ? last[0].toUpperCase() + '.' : last].join(' ');
}

// Öffentliche Fassung für die Vereinswebseite (Spielbetrieb → Wer fährt wann): nur kommende Spiele,
// E-Mail-Adressen werden über Mitgliederliste/Konten in Namen übersetzt, sonst nur „siehe App“.
async function handlePublic(req, res) {
  const items = await getFahrplanItems();
  const byMail = new Map();
  try {
    const [ml, users] = await Promise.all([
      adminDb().collection('ttc').doc('mitgliederListe').get(),
      adminDb().collection('users').get(),
    ]);
    users.docs.forEach(d => { const u = d.data(); if (u.email && u.name) byMail.set(u.email.trim().toLowerCase(), u.name); });
    Object.values(ml.data()?.list || {}).forEach(m => {
      const name = [m.vorname, m.nachname].filter(Boolean).join(' ');
      if (m.email && name) byMail.set(m.email.trim().toLowerCase(), name);
    });
  } catch { /* ohne Namensabgleich weiter */ }
  const display = (f) => {
    const v = String(f || '').trim();
    if (!v) return '';
    if (v.includes('@')) { const n = byMail.get(v.toLowerCase()); return n ? shortName(n) : 'siehe App'; }
    return shortName(v);
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = (d) => d.split('.').reverse().join('-');
  const out = items
    .filter(it => it.datum && new Date(iso(it.datum) + 'T23:59:59') >= today)
    .map(({ meetingId, datum, zeit, liga, ligaName, halle, hallenAdresse, heim, gast, isHeimspiel, ourTeam, treffpunkt, fahrer }) =>
      ({ id: meetingId, date: iso(datum), zeit, liga, ligaName, halle, hallenAdresse, heim, gast, isHeimspiel, ourTeam, treffpunkt, fahrer: display(fahrer) }));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  res.status(200).json({ items: out, fetchedAt: new Date().toISOString() });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' && req.query.action === 'set-fahrer') return handleSetFahrer(req, res);
    if (req.method === 'POST' && req.query.action === 'send-intro') return handleSendIntro(req, res);
    if (req.method === 'GET' && req.query.public === '1') return handlePublic(req, res);
    // "fahrer" enthält personenbezogene Daten (E-Mail-Adressen von Fahrern/Betreuern) —
    // dieser Endpunkt war bisher komplett unauthentifiziert abrufbar, daher jetzt Login-Pflicht.
    if (!(await verifyRequestUser(req))) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }
    const items = await getFahrplanItems();
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
