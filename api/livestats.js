import { verifyRequestUser, adminDb } from './_lib/firebaseAdmin.js';

// ── TESTFEATURE: Live-Statistiken pro Spieler/in aus dem echten Spielplan ──────────────────
// Holt für jedes ABGESCHLOSSENE Punktspiel unseres Vereins den offiziellen Spielbericht von
// mytischtennis.de (click-tt) — dort steht jede Einzel-/Doppelpaarung mit Satzergebnis und
// Spielernamen drin (nicht nur das Mannschaftsergebnis wie im normalen Spielplan/Fahrplan).
// Daraus werden drei Season-Rankings berechnet: meiste Siege, längste Siegesserie, beste
// Siegquote (min. 5 Spiele). Ergebnis wird in ttc/livestatsCache zwischengespeichert, damit
// nicht bei jedem Aufruf der komplette Spielplan neu abgegrast werden muss — ein "Aktualisieren"
// im Adminbereich holt nur die seit dem letzten Lauf neu abgeschlossenen Spiele nach.
const CLUB_ID = '33066';
const SEASON = '26--27';
const BASE = 'https://www.mytischtennis.de';
const MAX_MEETINGS_PER_RUN = 25; // Timeout-Schutz -- bei vielen neuen Spielen einfach nochmal auf "Aktualisieren" drücken

function extractRemixData(html) {
  const marker = 'window.__remixContext = ';
  const s = html.indexOf(marker);
  if (s === -1) return null;
  const e = html.indexOf('</script>', s);
  const json = html.slice(s + marker.length, e).replace(/;\s*$/, '');
  return JSON.parse(json);
}

async function fetchSeasonMeetings() {
  const url = `${BASE}/click-tt/HeTTV/${SEASON}/verein/${CLUB_ID}/TTC_G.-W._Staffel_1953/spielplan?date_start=2026-08-01&date_end=2027-05-31`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error('Spielplan nicht erreichbar: ' + response.status);
  const html = await response.text();
  const ctx = extractRemixData(html);
  const routeKey = Object.keys(ctx?.state?.loaderData || {}).find(k => k.includes('spielplan'));
  const byDate = ctx?.state?.loaderData?.[routeKey]?.data || {};
  const meetings = [];
  for (const dayMeetings of Object.values(byDate)) {
    if (!Array.isArray(dayMeetings)) continue;
    for (const m of dayMeetings) {
      if (!m.is_meeting_complete || !m.meeting_id) continue;
      meetings.push({
        meetingId: String(m.meeting_id),
        date: m.date,
        leagueId: m.league_id,
        leagueShort: m.league_short_name,
        orgShort: m.league_org_short_name || 'HeTTV',
        isHome: m.team_home_club_id === CLUB_ID,
        teamHome: m.team_home,
        teamAway: m.team_away,
      });
    }
  }
  return meetings;
}

async function fetchMeetingReport(meeting) {
  const url = `${BASE}/click-tt/${meeting.orgShort}/${SEASON}/ligen/${meeting.leagueShort}/gruppe/${meeting.leagueId}/spielbericht/${meeting.meetingId}/x-vs-y`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const html = await response.text();
  const ctx = extractRemixData(html);
  const routeKey = Object.keys(ctx?.state?.loaderData || {}).find(k => k.includes('spielbericht'));
  return ctx?.state?.loaderData?.[routeKey]?.meetingReport || null;
}

function winnerSide(entry) {
  if (entry.home_wo) return 'guest';
  if (entry.guest_wo) return 'home';
  const h = Number(entry.sets_home) || 0, g = Number(entry.sets_guest) || 0;
  if (h > g) return 'home';
  if (g > h) return 'guest';
  return null; // unentschieden/nicht auswertbar
}

function applyMeetingToPlayers(meeting, report, players) {
  const ourSide = meeting.isHome ? 'home' : 'guest';
  for (const entry of report?.match || []) {
    const win = winnerSide(entry);
    if (!win) continue;
    const ourPlayers = ourSide === 'home'
      ? [entry.mm_player11, entry.mm_player12]
      : [entry.mm_player21, entry.mm_player22];
    const won = win === ourSide;
    for (const p of ourPlayers) {
      if (!p) continue;
      const key = p.player_id || `${p.firstname} ${p.lastname}`.trim().toLowerCase();
      if (!players[key]) players[key] = { name: `${p.firstname} ${p.lastname}`.trim(), results: [] };
      players[key].results.push({ date: meeting.date, win: won });
    }
  }
}

function buildLeaderboards(players) {
  const rows = Object.values(players).map(p => {
    const sorted = [...p.results].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const wins = sorted.filter(r => r.win).length;
    const losses = sorted.length - wins;
    let maxStreak = 0, cur = 0;
    for (const r of sorted) { cur = r.win ? cur + 1 : 0; if (cur > maxStreak) maxStreak = cur; }
    const winPct = sorted.length > 0 ? Math.round((wins / sorted.length) * 1000) / 10 : 0;
    return { name: p.name, wins, losses, games: sorted.length, maxStreak, winPct };
  });
  const meisteSiege = [...rows].sort((a, b) => b.wins - a.wins || b.games - a.games).slice(0, 8);
  const laengsteSerie = [...rows].filter(r => r.maxStreak > 0).sort((a, b) => b.maxStreak - a.maxStreak).slice(0, 8);
  const besteSiegquote = [...rows].filter(r => r.games >= 5).sort((a, b) => b.winPct - a.winPct || b.games - a.games).slice(0, 8);
  return { meisteSiege, laengsteSerie, besteSiegquote };
}

export default async function handler(req, res) {
  try {
    const uid = await verifyRequestUser(req);
    if (!uid) { res.status(401).json({ error: 'Nicht angemeldet' }); return; }
    const userSnap = await adminDb().collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const roles = userData.roles?.length ? userData.roles : (userData.role ? [userData.role] : []);
    if (!roles.includes('admin')) { res.status(403).json({ error: 'Nur Admins (Testfeature)' }); return; }

    const cacheRef = adminDb().collection('ttc').doc('livestatsCache');
    const cacheSnap = await cacheRef.get();
    const cache = cacheSnap.exists ? cacheSnap.data() : { processedMeetingIds: [], players: {} };

    const action = req.query.action || 'get';
    if (action === 'get') {
      res.status(200).json({ leaderboards: buildLeaderboards(cache.players || {}), updatedAt: cache.updatedAt || null, meetingsProcessed: (cache.processedMeetingIds || []).length });
      return;
    }

    if (action === 'refresh') {
      const allMeetings = await fetchSeasonMeetings();
      const processedSet = new Set(cache.processedMeetingIds || []);
      const neu = allMeetings.filter(m => !processedSet.has(m.meetingId)).slice(0, MAX_MEETINGS_PER_RUN);

      const players = { ...(cache.players || {}) };
      // Tiefe Kopie der results-Arrays, damit wir nicht das gecachte Objekt in-place mutieren
      for (const k of Object.keys(players)) players[k] = { name: players[k].name, results: [...players[k].results] };

      let ok = 0, failed = 0;
      for (const meeting of neu) {
        try {
          const report = await fetchMeetingReport(meeting);
          if (report) { applyMeetingToPlayers(meeting, report, players); ok++; }
          else failed++;
        } catch { failed++; }
      }

      const newProcessedIds = [...processedSet, ...neu.map(m => m.meetingId)];
      const updated = { processedMeetingIds: newProcessedIds, players, updatedAt: new Date().toISOString() };
      await cacheRef.set(updated);

      res.status(200).json({
        leaderboards: buildLeaderboards(players),
        updatedAt: updated.updatedAt,
        meetingsProcessed: newProcessedIds.length,
        totalMeetingsAvailable: allMeetings.length,
        newlyProcessed: ok,
        failed,
        remaining: Math.max(0, allMeetings.length - newProcessedIds.length),
      });
      return;
    }

    res.status(400).json({ error: 'Unbekannte action' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
