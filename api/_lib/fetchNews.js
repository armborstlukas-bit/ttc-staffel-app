// Holt und parst den RSS-Feed von ttc-staffel.de (gleiche Logik wie api/news.js).
export async function fetchTtcNewsItems(limit = 3) {
  const response = await fetch('https://ttc-staffel.de/index.php?format=feed&type=rss', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const xml = await response.text();

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const desc = get('description').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
    items.push({ title: get('title'), link: get('link'), date: get('pubDate'), desc });
  }
  return items;
}
