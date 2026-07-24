// Liest den oeffentlich freigegebenen Google-Sheets "Wer faehrt wann"-Plan als CSV
// und wandelt ihn in strukturierte Spieltermine um. Wird sowohl vom bisherigen
// Sheet-basierten Fahrplan als auch zum Abgleich der Fahrer/Betreuer-Zuordnung
// im mytischtennis-basierten Fahrplan genutzt.
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1kt23pFWJlHoFcQw4lDNtgJVUXI8J0_bysICuL0jXaiw/export?format=csv';

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

export async function fetchFahrplanSheetItems() {
  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) throw new Error('Sheet nicht erreichbar: ' + response.status);
  const text = await response.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  // Manche Zeilen haben ein leeres "Halle"-Feld, wodurch sich die mittleren Spalten
  // verschieben. Zuverlässig bleiben nur: die ersten Spalten (Spiel-ID, Datum, Zeit)
  // und die letzten 3 Spalten (Fahrer/Betreuer, Anpfiff, Treffpunkt). Heim-/Gastteam
  // lesen wir daher aus der Spiel-ID (Format "CODE_Heimteam_Gastteam_").
  return rows.slice(1).filter(r => r.some(c => c && c.trim())).map(r => {
    const idParts = (r[0] || '').split('_');
    const code = (idParts[0] || '').trim();
    const heim = (idParts[1] || '').trim();
    const gast = (idParts[2] || '').trim();
    const datum = r[1] || '';
    const zeit = r[3] || '';
    const fahrer = r[r.length - 3] || '';
    const anpfiff = r[r.length - 2] || '';
    const treffpunkt = (r[r.length - 1] || '').replace(/:00$/, '');
    const isHeimspiel = /TTC G\.?-?W\.? Staffel/i.test(heim);
    const ourTeam = isHeimspiel ? heim : (/TTC G\.?-?W\.? Staffel/i.test(gast) ? gast : '');
    return {
      datum,
      zeit: zeit || anpfiff,
      liga: code,
      heim,
      gast,
      isHeimspiel,
      ourTeam,
      fahrer: fahrer && fahrer !== '#N/A' ? fahrer : '',
      treffpunkt: treffpunkt && treffpunkt !== '#N/A' ? treffpunkt : '',
      isJugend: /^J/i.test(code),
    };
  }).filter(it => it.datum && it.heim && it.gast && it.isJugend);
}
