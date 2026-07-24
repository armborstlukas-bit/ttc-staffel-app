import { fetchFahrplanSheetItems } from './_lib/fetchFahrplanSheet.js';

export default async function handler(req, res) {
  try {
    const items = await fetchFahrplanSheetItems();
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
