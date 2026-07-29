import { getFahrplanItems } from './_lib/getFahrplanItems.js';

export default async function handler(req, res) {
  try {
    const items = await getFahrplanItems();
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
