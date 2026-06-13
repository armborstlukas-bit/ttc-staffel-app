export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const response = await fetch('https://ttc-staffel.de/index.php?format=feed&type=rss', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await response.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      const desc = get('description').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
      items.push({ title: get('title'), link: get('link'), date: get('pubDate'), desc });
    }

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
