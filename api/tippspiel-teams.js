// Liest die Mannschaftsliste von mytischtennis.de (click-tt) und gibt nur die
// regulaeren Liga-Mannschaften zurueck (keine Pokal-Meldungen, keine Senioren-Teams).
// Pokal-Einträge sind über season:"P 26/27" (Praefix "P ") von den echten Liga-
// Meldungen ("26/27") zu unterscheiden. Für jede Mannschaft wird zusaetzlich die
// aktuelle Liga-Groesse (Anzahl Teams) und die aktuelle Live-Tabellenposition
// nachgeschlagen (jeweils über die Liga-Tabellenseite des Vereins-Teams).
const TEAMS_URL = 'https://www.mytischtennis.de/click-tt/HeTTV/25--26/verein/33066/TTC_G.-W._Staffel_1953/mannschaften';
const BASE = 'https://www.mytischtennis.de';

function extractRemixData(html, routeMatcher) {
  const marker = 'window.__remixContext = ';
  const scriptStart = html.indexOf(marker);
  if (scriptStart === -1) return null;
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const jsonStr = html.slice(scriptStart + marker.length, scriptEnd).replace(/;\s*$/, '');
  const ctx = JSON.parse(jsonStr);
  const routeKey = Object.keys(ctx.state.loaderData || {}).find(routeMatcher);
  return routeKey ? ctx.state.loaderData[routeKey] : null;
}

async function fetchLeagueTable(groupId, html) {
  // Den echten Link zur Liga-Tabellenseite dieser Mannschaft aus der HTML-Seite ziehen
  // (Organisation/Liga-Slug im Pfad variieren je nach Spielklasse, daher nicht selbst bauen).
  const re = new RegExp(`href="(/click-tt/[^"]*/gruppe/${groupId}/tabelle/gesamt)"`);
  const m = html.match(re);
  if (!m) return null;
  const url = BASE + m[1].replace(/&amp;/g, '&');
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) return null;
  const tableHtml = await resp.text();
  const data = extractRemixData(tableHtml, k => k.includes('tabelle'));
  return data?.data?.league_table || null;
}

export default async function handler(req, res) {
  try {
    const response = await fetch(TEAMS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('Seite nicht erreichbar: ' + response.status);
    const html = await response.text();

    const routeData = extractRemixData(html, k => k.includes('mannschaften'));
    if (!routeData) throw new Error('Mannschaften-Route nicht gefunden');
    const clubTeams = routeData.data?.teams_list?.club_teams || [];

    const filtered = clubTeams
      .filter(t => !(t.season || '').trim().startsWith('P'))
      .filter(t => !/^Senior/i.test((t.team_name || '').trim()));

    const teams = await Promise.all(filtered.map(async t => {
      let leagueSize = null;
      let currentRank = t.table_rank ? parseInt(t.table_rank, 10) : null;
      try {
        const leagueTable = await fetchLeagueTable(t.group_id, html);
        if (Array.isArray(leagueTable) && leagueTable.length > 0) {
          leagueSize = leagueTable.length;
          const ownRow = leagueTable.find(r => r.team_id === t.team_id);
          if (ownRow) currentRank = ownRow.table_rank;
        }
      } catch { /* Liga-Tabelle optional, Basisdaten reichen notfalls */ }
      // Link zur mytischtennis-Mannschaftsseite (Spielplan/Kader) — direkt aus der HTML gezogen,
      // da sich Liga-Slug/Gruppen-Pfad je Spielklasse unterscheiden und sich nicht selbst bauen lassen.
      let url = null;
      const linkRe = new RegExp(`href="(/click-tt/[^"]*/mannschaft/${t.team_id}/[^"]*)"`);
      const linkMatch = html.match(linkRe);
      if (linkMatch) url = BASE + linkMatch[1].replace(/&amp;/g, '&');
      return {
        teamId: t.team_id,
        name: t.team_name,
        league: (t.league_name || '').trim(),
        leagueSize,
        currentRank,
        url,
      };
    }));

    // Reihenfolge: erst Damen, dann Herren/Erwachsene, dann Nachwuchs
    const groupOf = name => /^Damen/i.test(name) ? 0 : /^Erwachsene/i.test(name) ? 1 : 2;
    teams.sort((a, b) => groupOf(a.name) - groupOf(b.name));

    res.status(200).json({ teams });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
