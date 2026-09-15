// Liest den kompletten Vereins-Spielplan (alle Mannschaften, alle Ligen) von mytischtennis.de
// (click-tt) fuer die aktuelle Saison und gibt ihn als flache, chronologisch sortierte Liste
// zurueck -- inkl. Ergebnis, sobald ein Spiel abgeschlossen ist.
const CLUB_PATH = 'HeTTV/26--27/verein/33066/TTC_G.-W._Staffel_1953';
const BASE = 'https://www.mytischtennis.de';

// Realistische Browser-Header um Bot-Detection zu umgehen
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.mytischtennis.de/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

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

export default async function handler(req, res) {
  // CORS für Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const dateStart = req.query.date_start || '2026-08-01';
    const dateEnd = req.query.date_end || '2027-05-31';
    const url = `${BASE}/click-tt/${CLUB_PATH}/spielplan?date_start=${encodeURIComponent(dateStart)}&date_end=${encodeURIComponent(dateEnd)}`;

    const response = await fetch(url, { headers: BROWSER_HEADERS });
    if (!response.ok) throw new Error('Seite nicht erreichbar: ' + response.status);
    const html = await response.text();

    // Bot-Detection erkennen: Wenn keine Remix-Daten aber Verifizierungsseite
    if (!html.includes('window.__remixContext') && html.includes('Verifizierung')) {
      return res.status(503).json({ error: 'bot_detection', message: 'mytischtennis.de zeigt eine Verifizierungsseite — bitte später erneut versuchen.' });
    }

    const routeData = extractRemixData(html, k => k.includes('spielplan'));
    const byDate = routeData?.data || {};

    const matches = [];
    for (const dateKey of Object.keys(byDate)) {
      const dayMeetings = byDate[dateKey];
      if (!Array.isArray(dayMeetings)) continue;
      for (const m of dayMeetings) {
        const isHome = m.team_home_club_id === '33066';
        matches.push({
          meetingId: m.meeting_id,
          date: m.date,
          formattedDay: m.formattedDay || null,
          formattedTime: m.formattedTime || null,
          league: (m.league_name || '').trim(),
          teamHome: m.team_home || '',
          teamAway: m.team_away || '',
          isHome,
          location: m.location ? { city: m.location.city || '', label: m.location.label || '' } : null,
          state: m.state || 'scheduled',
          isComplete: !!m.is_meeting_complete,
          resultHome: m.is_meeting_complete ? m.matches_won : null,
          resultAway: m.is_meeting_complete ? m.matches_lost : null,
        });
      }
    }
    matches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    res.status(200).json({ matches });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
