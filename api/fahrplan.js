// Liest den offiziellen Spielplan von mytischtennis.de (click-tt) fuer Termine/Teams/Halle.
// Fahrer/Betreuer und Treffpunkt werden weiterhin nur im Google-Sheet manuell gepflegt —
// die werden hier per Datum+Liga (Fallback: Datum+Teams) automatisch aus dem Sheet
// zugeordnet, bei jedem Aufruf neu. Manuelle Zuweisungen ueber die App (fahrplanOverrides)
// haben Vorrang vor dem Sheet-Abgleich.
import { fetchFahrplanSheetItems } from './_lib/fetchFahrplanSheet.js';
import { adminDb } from './_lib/firebaseAdmin.js';

const SPIELPLAN_URL = 'https://www.mytischtennis.de/click-tt/HeTTV/26--27/verein/33066/TTC_G.-W._Staffel_1953/spielplan?date_start=2026-08-01&date_end=2027-05-31';

export default async function handler(req, res) {
  try {
    const response = await fetch(SPIELPLAN_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('Seite nicht erreichbar: ' + response.status);
    const html = await response.text();

    const marker = 'window.__remixContext = ';
    const scriptStart = html.indexOf(marker);
    if (scriptStart === -1) throw new Error('Datenstruktur nicht gefunden (window.__remixContext)');
    const scriptEnd = html.indexOf('</script>', scriptStart);
    let jsonStr = html.slice(scriptStart + marker.length, scriptEnd).replace(/;\s*$/, '');
    const ctx = JSON.parse(jsonStr);

    const routeKey = Object.keys(ctx.state.loaderData || {}).find(k => k.includes('spielplan'));
    if (!routeKey) throw new Error('Spielplan-Route nicht gefunden');
    const byDate = ctx.state.loaderData[routeKey].data || {};

    // Fahrer/Betreuer + Treffpunkt kommen weiterhin aus dem Google-Sheet — hier per
    // Datum+Liga nachschlagen (Fallback: Datum+Heimteam+Gastteam, falls sich der Liga-Code
    // mal unterscheiden sollte).
    let sheetItems = [];
    try { sheetItems = await fetchFahrplanSheetItems(); } catch { /* Sheet optional, ohne Abgleich weitermachen */ }
    const byLiga = new Map();
    const byTeams = new Map();
    sheetItems.forEach(s => {
      byLiga.set(`${s.datum}|${s.liga}`, s);
      byTeams.set(`${s.datum}|${s.heim}|${s.gast}`, s);
    });

    // Manuelle Fahrer-Zuweisungen aus der App (von Trainern per Dropdown gesetzt) —
    // haben Vorrang vor dem automatischen Sheet-Abgleich, gespeichert je Spiel (meeting_id).
    let overrides = {};
    try {
      const snap = await adminDb().collection('ttc').doc('fahrplanOverrides').get();
      overrides = snap.exists ? (snap.data() || {}) : {};
    } catch { /* Overrides optional */ }

    const items = [];
    Object.values(byDate).forEach(dayGames => {
      (dayGames || []).forEach(g => {
        const ligaCode = g.league_short_name || '';
        if (!/^J/i.test(ligaCode)) return; // nur Nachwuchs
        const heim = g.team_home || '';
        const gast = g.team_away || '';
        const dateMatch = (g.formattedDay || '').match(/(\d{2}\.\d{2}\.\d{4})/);
        const datum = dateMatch ? dateMatch[1] : '';
        const isHeimspiel = /TTC G\.?-?W\.? Staffel/i.test(heim);
        const ourTeam = isHeimspiel ? heim : (/TTC G\.?-?W\.? Staffel/i.test(gast) ? gast : '');
        // team_home_id/team_away_id sind stabile, eindeutige click-tt Mannschafts-IDs —
        // zuverlässiger als der Team-Name als Text (der bei mehreren Ligen pro Mannschaft
        // gleich lauten kann, z.B. wenn dieselbe Mannschaft in zwei Altersklassen spielt).
        const ourTeamId = isHeimspiel ? (g.team_home_id || '') : (g.team_away_id || '');
        const match = byLiga.get(`${datum}|${ligaCode}`) || byTeams.get(`${datum}|${heim}|${gast}`);
        const meetingId = g.meeting_id || '';
        const override = meetingId ? overrides[meetingId] : null;
        items.push({
          meetingId,
          datum,
          zeit: g.formattedTime || '',
          liga: ligaCode,
          ligaName: g.league_name || '',
          halle: g.location?.label || '',
          heim,
          gast,
          isHeimspiel,
          ourTeam,
          ourTeamId,
          fahrer: override != null ? override : (match?.fahrer || ''),
          treffpunkt: match?.treffpunkt || '',
        });
      });
    });
    items.sort((a,b) => a.datum.split('.').reverse().join('').localeCompare(b.datum.split('.').reverse().join('')) || a.zeit.localeCompare(b.zeit));

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
