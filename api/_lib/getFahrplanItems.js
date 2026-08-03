// Liest den offiziellen Spielplan von mytischtennis.de (click-tt) fuer Termine/Teams/Halle.
// Fahrer/Betreuer und Treffpunkt werden weiterhin nur im Google-Sheet manuell gepflegt —
// die werden hier automatisch aus dem Sheet zugeordnet, bei jedem Aufruf neu. Manuelle
// Zuweisungen ueber die App (fahrplanOverrides) haben Vorrang vor dem Sheet-Abgleich.
import { fetchFahrplanSheetItems } from './fetchFahrplanSheet.js';
import { adminDb } from './firebaseAdmin.js';

// Ordnet ein echtes Spiel (aus dem offiziellen Spielplan) genau EINER Sheet-Zeile zu.
// Frueher wurde nur nach Datum+Liga gesucht (Fallback Datum+Teams) — das kollidierte, sobald
// zwei Spiele am selben Tag in derselben Liga stattfanden (z.B. zwei J15KL-Spiele am selben
// Tag): beide Spiele bekamen dieselbe Sheet-Zeile und damit denselben Fahrer zugewiesen, ohne
// dass das auffiel (genau das ist Benjamin Blech im Dezember passiert).
//
// Jetzt wird von der EINDEUTIGSTEN zur ungenauesten Ebene durchprobiert, und auf jeder Ebene
// nur zugeschlagen, wenn dort GENAU EIN Kandidat übrig bleibt:
//   1) Datum + Heim + Gast + Anpfiffzeit  — eindeutig, auch bei einem Doppelspieltag mit
//      identischer Paarung am selben Tag, solange die Anpfiffzeiten sich unterscheiden
//      (was bei echten Doppelspieltagen praktisch immer der Fall ist).
//   2) Datum + Heim + Gast (ohne Zeit)    — greift, falls im Sheet die Uhrzeit fehlt/abweicht.
//   3) Datum + Liga                        — nur als letzter Rueckfall, und auch nur, wenn es
//      an dem Tag in der Liga wirklich nur EIN Spiel gibt.
// Bleiben auf KEINER Ebene eindeutig, wird lieber gar kein automatischer Fahrer gezeigt als
// versehentlich der falsche — ein leeres Feld faellt sofort auf, ein falscher Name nicht.
function buildFahrplanMatcher(sheetItems) {
  const addTo = (map, key, row) => { (map.get(key) || map.set(key, []).get(key)).push(row); };
  const byExact = new Map();
  const byTeams = new Map();
  const byLiga = new Map();
  sheetItems.forEach(s => {
    addTo(byExact, `${s.datum}|${s.heim}|${s.gast}|${s.zeit}`, s);
    addTo(byTeams, `${s.datum}|${s.heim}|${s.gast}`, s);
    addTo(byLiga, `${s.datum}|${s.liga}`, s);
  });
  return (datum, heim, gast, zeit, liga) => {
    let cands = byExact.get(`${datum}|${heim}|${gast}|${zeit}`);
    if (cands?.length === 1) return cands[0];
    cands = byTeams.get(`${datum}|${heim}|${gast}`);
    if (cands?.length === 1) return cands[0];
    cands = byLiga.get(`${datum}|${liga}`);
    if (cands?.length === 1) return cands[0];
    return null;
  };
}

const SPIELPLAN_URL = 'https://www.mytischtennis.de/click-tt/HeTTV/26--27/verein/33066/TTC_G.-W._Staffel_1953/spielplan?date_start=2026-08-01&date_end=2027-05-31';

export async function getFahrplanItems() {
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

  let sheetItems = [];
  try { sheetItems = await fetchFahrplanSheetItems(); } catch { /* Sheet optional, ohne Abgleich weitermachen */ }
  const findSheetMatch = buildFahrplanMatcher(sheetItems);

  let overrides = {};
  try {
    const snap = await adminDb().collection('ttc').doc('fahrplanOverrides').get();
    overrides = snap.exists ? (snap.data() || {}) : {};
  } catch { /* Overrides optional */ }

  let abfahrtsClubs = {};
  try {
    const snap = await adminDb().collection('ttc').doc('abfahrtszeiten').get();
    abfahrtsClubs = snap.exists ? (snap.data()?.clubs || {}) : {};
  } catch { /* Abfahrtszeiten optional */ }

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
      const ourTeamId = isHeimspiel ? (g.team_home_id || '') : (g.team_away_id || '');
      const match = findSheetMatch(datum, heim, gast, g.formattedTime || '', ligaCode);
      const meetingId = g.meeting_id || '';
      const override = meetingId ? overrides[meetingId] : null;

      let treffpunkt = match?.treffpunkt || '';
      if (!isHeimspiel && g.formattedTime) {
        const heimLower = heim.toLowerCase();
        const matchingKey = Object.keys(abfahrtsClubs)
          .filter(k => heimLower.includes(k.toLowerCase()))
          .sort((a, b) => b.length - a.length)[0];
        const leadMinutes = matchingKey != null ? abfahrtsClubs[matchingKey] : null;
        if (leadMinutes != null) {
          const [hh, mm] = g.formattedTime.split(':').map(Number);
          const total = hh * 60 + mm - leadMinutes;
          const dh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
          const dm = ((total % 60) + 60) % 60;
          treffpunkt = `${String(dh).padStart(2,'0')}:${String(dm).padStart(2,'0')}`;
        }
      }

      if (isHeimspiel && !treffpunkt && g.formattedTime) {
        const codeUpper = ligaCode.toUpperCase();
        let defaultLead = null;
        if (codeUpper.includes('HL') || codeUpper.includes('BOL')) defaultLead = 60;
        else if (codeUpper.includes('KL') || codeUpper.includes('KK')) defaultLead = 45;
        if (defaultLead != null) {
          const [hh, mm] = g.formattedTime.split(':').map(Number);
          const total = hh * 60 + mm - defaultLead;
          const dh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
          const dm = ((total % 60) + 60) % 60;
          treffpunkt = `${String(dh).padStart(2,'0')}:${String(dm).padStart(2,'0')}`;
        }
      }

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
        treffpunkt,
      });
    });
  });
  items.sort((a,b) => a.datum.split('.').reverse().join('').localeCompare(b.datum.split('.').reverse().join('')) || a.zeit.localeCompare(b.zeit));

  return items;
}
