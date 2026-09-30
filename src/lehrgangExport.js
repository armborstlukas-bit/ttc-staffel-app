import { jsPDF } from 'jspdf';

// Abrechnung eines Ferien-Lehrgangs: wer war an wie vielen Tagen da und muss wie viel zahlen.
// daten: { name, preis, tage:[iso], zeilen:[{name, gruppe, tage:[iso], betrag}], summe, hinweis, logo }

export const fmtEuro = (n) => (Number.isFinite(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const dm = (iso) => { const [, m, d] = iso.split('-'); return `${d}.${m}.`; };
export const dmy = (iso) => iso.split('-').reverse().join('.');
const zeitraum = (tage) => (tage.length ? (tage.length === 1 ? dmy(tage[0]) : `${dmy(tage[0])} – ${dmy(tage[tage.length - 1])}`) : '');
export const dateiName = (name, ext) => `${String(name || 'Lehrgang').replace(/[^\wäöüÄÖÜß-]+/g, '_')}_Abrechnung.${ext}`;

export function lehrgangPdf({ name, preis, tage, zeilen, summe, hinweis, logo }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const L = 18, R = 192, green = [22, 101, 52], grey = [110, 110, 110];
  const line = (x1, y1, x2, y2, w = 0.2, c = [180, 180, 180]) => { pdf.setDrawColor(...c); pdf.setLineWidth(w); pdf.line(x1, y1, x2, y2); };

  const kopf = (erste) => {
    if (logo) { try { pdf.addImage(logo, 'PNG', L, 12, 58, 58 * 98 / 452); } catch { /* ohne Logo */ } }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(erste ? 17 : 12); pdf.setTextColor(...green);
    pdf.text('Lehrgangsabrechnung', R, 18, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0);
    pdf.text(String(name || ''), R, 24.5, { align: 'right' });
    line(L, 30, R, 30, 0.6, green);
  };
  kopf(true);

  let y = 38;
  pdf.setFontSize(10); pdf.setTextColor(...grey);
  const info = [['Zeitraum', zeitraum(tage)], ['Lehrgangstage', `${tage.length} (${tage.map(dm).join(', ')})`], ['Kosten pro Tag', `${fmtEuro(preis)} €`], ['Teilnehmer', String(zeilen.length)]];
  info.forEach(([k, v]) => {
    pdf.setTextColor(...grey); pdf.text(k, L, y);
    pdf.setTextColor(0, 0, 0); const t = pdf.splitTextToSize(v, R - L - 38); pdf.text(t, L + 38, y); y += 5.4 * t.length;
  });
  y += 4;

  const cols = [{ t: 'Nr.', w: 11, a: 'center' }, { t: 'Name', w: 58, a: 'left' }, { t: 'Anwesend an', w: 70, a: 'left' }, { t: 'Tage', w: 13, a: 'center' }, { t: 'Betrag', w: 22, a: 'right' }];
  const xs = cols.reduce((a, c, i) => (a.push(i ? a[i - 1] + cols[i - 1].w : L), a), []);
  const tabKopf = () => {
    pdf.setFillColor(232, 243, 236); pdf.rect(L, y, R - L, 8, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...green);
    cols.forEach((c, i) => pdf.text(c.t, c.a === 'center' ? xs[i] + c.w / 2 : c.a === 'right' ? xs[i] + c.w - 2 : xs[i] + 2, y + 5.4, { align: c.a }));
    y += 8; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(0, 0, 0);
  };
  tabKopf();
  zeilen.forEach((z, i) => {
    const tageTxt = pdf.splitTextToSize(z.tage.map(dm).join(', '), cols[2].w - 4);
    const nameTxt = pdf.splitTextToSize(z.name, cols[1].w - 4);
    const h = Math.max(7.5, Math.max(tageTxt.length, nameTxt.length) * 4.3 + 3.2);
    if (y + h > 272) { pdf.addPage(); kopf(false); y = 38; tabKopf(); }
    if (i % 2) { pdf.setFillColor(248, 248, 246); pdf.rect(L, y, R - L, h, 'F'); }
    const m = y + 5;
    pdf.text(String(i + 1), xs[0] + cols[0].w / 2, m, { align: 'center' });
    pdf.setFont('helvetica', 'bold'); pdf.text(nameTxt, xs[1] + 2, m); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(90, 90, 90); pdf.text(tageTxt, xs[2] + 2, m); pdf.setTextColor(0, 0, 0);
    pdf.text(String(z.tage.length), xs[3] + cols[3].w / 2, m, { align: 'center' });
    pdf.setFont('helvetica', 'bold'); pdf.text(`${fmtEuro(z.betrag)} €`, xs[4] + cols[4].w - 2, m, { align: 'right' }); pdf.setFont('helvetica', 'normal');
    line(L, y + h, R, y + h);
    y += h;
  });
  if (y > 262) { pdf.addPage(); kopf(false); y = 40; }
  line(L, y, R, y, 0.5, green);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('Gesamt:', xs[4] - 3, y + 6.5, { align: 'right' });
  pdf.text(`${fmtEuro(summe)} €`, R - 2, y + 6.5, { align: 'right' });
  y += 16;

  if (hinweis && hinweis.trim()) {
    const t = pdf.splitTextToSize(hinweis.trim(), R - L - 10);
    const h = t.length * 4.8 + 12;
    if (y + h > 285) { pdf.addPage(); kopf(false); y = 40; }
    pdf.setFillColor(245, 248, 246); pdf.roundedRect(L, y, R - L, h, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...green); pdf.text('Hinweis zur Zahlung', L + 5, y + 6.5);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0); pdf.text(t, L + 5, y + 12.5);
  }

  const n = pdf.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p); pdf.setFontSize(8); pdf.setTextColor(...grey);
    pdf.text(`TTC Grün-Weiß Staffel 1953 e.V. · ${name}`, L, 290);
    pdf.text(`Seite ${p} von ${n}`, R, 290, { align: 'right' });
  }
  return pdf;
}

export async function lehrgangXlsx({ name, preis, tage, zeilen, summe, hinweis }) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const H = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#E8F3EC', textColor: '#166534', borderStyle: 'thin', borderColor: '#B7D7C1' });
  const C = (value, extra = {}) => ({ value, borderStyle: 'thin', borderColor: '#DDDDDD', ...extra });
  const euro = '#,##0.00 "€"';
  const data = [
    [{ value: `Lehrgangsabrechnung – ${name}`, fontWeight: 'bold', fontSize: 14, columnSpan: 5 + tage.length }],
    [{ value: `TTC Grün-Weiß Staffel 1953 e.V. · Kosten pro Tag: ${fmtEuro(preis)} € · ${tage.length} Lehrgangstage`, columnSpan: 5 + tage.length }],
    [],
    [H('Nr.'), H('Name'), H('Gruppe'), ...tage.map((t) => ({ ...H(dm(t)), align: 'center' })), { ...H('Tage'), align: 'center' }, { ...H('Betrag'), align: 'right' }],
    ...zeilen.map((z, i) => [
      C(i + 1, { type: Number, align: 'center' }), C(z.name, { fontWeight: 'bold' }), C(z.gruppe || ''),
      ...tage.map((t) => C(z.tage.includes(t) ? 'x' : '', { align: 'center' })),
      C(z.tage.length, { type: Number, align: 'center' }), C(z.betrag, { type: Number, format: euro, align: 'right', fontWeight: 'bold' }),
    ]),
    [{ value: 'Gesamt', fontWeight: 'bold', columnSpan: 3 + tage.length }, ...Array(2 + tage.length).fill(null), { value: zeilen.reduce((s, z) => s + z.tage.length, 0), type: Number, fontWeight: 'bold', align: 'center' }, { value: summe, type: Number, format: euro, fontWeight: 'bold', align: 'right' }],
    ...(hinweis && hinweis.trim() ? [[], [{ value: `Hinweis: ${hinweis.trim()}`, columnSpan: 5 + tage.length, wrap: true }]] : []),
  ];
  const columns = [{ width: 5 }, { width: 28 }, { width: 18 }, ...tage.map(() => ({ width: 7 })), { width: 7 }, { width: 12 }];
  return writeExcelFile(data, { columns, sheet: 'Abrechnung', stickyRowsCount: 4 }).toBlob();
}
