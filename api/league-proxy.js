// Vercel Serverless Function — proxies mytischtennis.de API calls server-side
export default async function handler(req, res) {
  const { assoc, groupId } = req.query;
  if (!assoc || !groupId) {
    return res.status(400).json({ error: 'Missing assoc or groupId parameter' });
  }

  const apiUrl = `https://www.mytischtennis.de/api/league-table/${encodeURIComponent(assoc)}/${encodeURIComponent(groupId)}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.mytischtennis.de/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
