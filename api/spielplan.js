// Liest den kompletten Vereins-Spielplan (alle Mannschaften, alle Ligen) von mytischtennis.de
// (click-tt) fuer die aktuelle Saison und gibt ihn als flache, chronologisch sortierte Liste
// zurueck -- inkl. Ergebnis, sobald ein Spiel abgeschlossen ist.
const CLUB_PATH = 'HeTTV/26--27/verein/33066/TTC_G.-W._Staffel_1953';
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

export default async function handler(req, res) {
  try {
    const dateStart = req.query.date_start || '2026-08-01';
    const dateEnd = req.query.date_end || '2027-05-31';
    const url = `${BASE}/click-tt/${CLUB_PATH}/spielplan?date_start=${encodeURIComponent(dateStart)}&date_end=${encodeURIComponent(dateEnd)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('Seite nicht erreichbar: ' + response.status);
    const html = await response.text();

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
