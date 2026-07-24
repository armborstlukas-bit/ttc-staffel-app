// TEST-Endpunkt: liest den offiziellen Spielplan von mytischtennis.de (click-tt) statt
// des bisherigen Google-Sheets. Liefert nur Nachwuchs-Spiele (Liga-Kuerzel beginnt mit "J").
// Enthaelt (noch) keine Fahrer/Betreuer- oder Treffpunkt-Angaben, da diese nur im Google-Sheet
// manuell gepflegt werden.
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

    const items = [];
    Object.values(byDate).forEach(dayGames => {
      (dayGames || []).forEach(g => {
        const ligaCode = g.league_short_name || '';
        if (!/^J/i.test(ligaCode)) return; // nur Nachwuchs
        const heim = g.team_home || '';
        const gast = g.team_away || '';
        const dateMatch = (g.formattedDay || '').match(/(\d{2}\.\d{2}\.\d{4})/);
        const isHeimspiel = /TTC G\.?-?W\.? Staffel/i.test(heim);
        const ourTeam = isHeimspiel ? heim : (/TTC G\.?-?W\.? Staffel/i.test(gast) ? gast : '');
        items.push({
          datum: dateMatch ? dateMatch[1] : '',
          zeit: g.formattedTime || '',
          liga: ligaCode,
          ligaName: g.league_name || '',
          halle: g.location?.label || '',
          heim,
          gast,
          isHeimspiel,
          ourTeam,
          fahrer: '',
          treffpunkt: '',
        });
      });
    });
    items.sort((a,b) => a.datum.split('.').reverse().join('').localeCompare(b.datum.split('.').reverse().join('')) || a.zeit.localeCompare(b.zeit));

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
