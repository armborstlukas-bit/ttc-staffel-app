// Liest die Mannschaftsliste von mytischtennis.de (click-tt) und gibt nur die
// regulaeren Liga-Mannschaften zurueck (keine Pokal-Meldungen). Pokal-Einträge sind
// dort ueber season:"P 26/27" (Praefix "P ") von den echten Liga-Meldungen ("26/27") zu
// unterscheiden.
const TEAMS_URL = 'https://www.mytischtennis.de/click-tt/HeTTV/25--26/verein/33066/TTC_G.-W._Staffel_1953/mannschaften';

export default async function handler(req, res) {
  try {
    const response = await fetch(TEAMS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('Seite nicht erreichbar: ' + response.status);
    const html = await response.text();

    const marker = 'window.__remixContext = ';
    const scriptStart = html.indexOf(marker);
    if (scriptStart === -1) throw new Error('Datenstruktur nicht gefunden (window.__remixContext)');
    const scriptEnd = html.indexOf('</script>', scriptStart);
    let jsonStr = html.slice(scriptStart + marker.length, scriptEnd).replace(/;\s*$/, '');
    const ctx = JSON.parse(jsonStr);

    const routeKey = Object.keys(ctx.state.loaderData || {}).find(k => k.includes('mannschaften'));
    if (!routeKey) throw new Error('Mannschaften-Route nicht gefunden');
    const clubTeams = ctx.state.loaderData[routeKey].data?.teams_list?.club_teams || [];

    const teams = clubTeams
      .filter(t => !(t.season || '').trim().startsWith('P'))
      .map(t => ({
        teamId: t.team_id,
        name: t.team_name,
        league: (t.league_name || '').trim(),
      }));

    res.status(200).json({ teams });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
