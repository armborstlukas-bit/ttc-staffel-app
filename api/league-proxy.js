// Vercel Serverless Function — proxies mytischtennis.de API calls server-side
export default async function handler(req, res) {
  const { assoc, groupId, season, league, filter, type } = req.query;
  if (!assoc || !groupId) {
    return res.status(400).json({ error: 'Missing assoc or groupId' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.mytischtennis.de/',
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    let data;

    if (season && league && type) {
      // Remix _data endpoint — returns full stats incl. wins/losses/sets/points
      const leagueSlug = league.toLowerCase();
      const dataParam  = `routes/click-tt+/$association+/$season+/$type+/$groupname.gruppe.$urlid+/${type === 'tabelle' ? 'tabelle' : 'spielplan'}.$filter`;
      const url = `https://www.mytischtennis.de/click-tt/${assoc}/${season}/ligen/${league}/gruppe/${groupId}/${type}/${filter || 'gesamt'}?_data=${encodeURIComponent(dataParam)}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      data = await r.json();
    } else {
      // Fallback: simple API (only rank + team name)
      const r = await fetch(`https://www.mytischtennis.de/api/league-table/${assoc}/${groupId}`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      data = await r.json();
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
