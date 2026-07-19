import { fetchTtcNewsItems } from './_lib/fetchNews.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const items = await fetchTtcNewsItems(3);
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
