// Liest den oeffentlich freigegebenen Google-Sheets "Wer faehrt wann"-Plan als CSV
// und wandelt ihn in strukturierte Spieltermine um.
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1kt23pFWJlHoFcQw4lDNtgJVUXI8J0_bysICuL0jXaiw/export?format=csv';

// Einfacher CSV-Parser mit Unterstuetzung fuer in Anfuehrungszeichen stehende Felder (Kommas/Zeilenumbrueche darin)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export default async function handler(req, res) {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error('Sheet nicht erreichbar: ' + response.status);
    const text = await response.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { res.status(200).json({ items: [] }); return; }

    // Manche Zeilen haben ein leeres "Halle"-Feld, wodurch sich die mittleren Spalten
    // verschieben. Zuverlässig bleiben nur: die ersten Spalten (Spiel-ID, Datum, Zeit)
    // und die letzten 3 Spalten (Fahrer/Betreuer, Anpfiff, Treffpunkt). Heim-/Gastteam
    // lesen wir daher aus der Spiel-ID (Format "CODE_Heimteam_Gastteam_").
    const items = rows.slice(1).filter(r => r.some(c => c && c.trim())).map(r => {
      const idParts = (r[0] || '').split('_');
      const heim = (idParts[1] || '').trim();
      const gast = (idParts[2] || '').trim();
      const datum = r[1] || '';
      const zeit = r[3] || '';
      const fahrer = r[r.length - 3] || '';
      const anpfiff = r[r.length - 2] || '';
      const isHeimspiel = /TTC G\.?-?W\.? Staffel/i.test(heim);
      const ourTeam = isHeimspiel ? heim : (/TTC G\.?-?W\.? Staffel/i.test(gast) ? gast : '');
      return {
        datum,
        zeit: zeit || anpfiff,
        heim,
        gast,
        isHeimspiel,
        ourTeam,
        fahrer: fahrer && fahrer !== '#N/A' ? fahrer : '',
      };
    }).filter(it => it.datum && it.heim && it.gast);

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
