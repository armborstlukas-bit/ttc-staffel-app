// Holt und parst den RSS-Feed der neuen Vereinswebseite (Berichte erscheinen seit Okt. 2026 nur noch dort).
// Nach dem Domain-Umzug WEB_URL auf https://ttc-staffel.de setzen (oder Default anpassen).
const WEB_URL = process.env.WEB_URL || 'https://ttc-staffel-web.web.app';
export async function fetchTtcNewsItems(limit = 3) {
  const response = await fetch(`${WEB_URL}/feed.xml`, {
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
