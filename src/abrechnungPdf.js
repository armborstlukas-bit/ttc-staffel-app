import { jsPDF } from 'jspdf';

// Erzeugt das Abrechnungsformular „Erstattung von Aufwendungen" als PDF (A4) – Aufbau wie die Word-Vorlage des Vereins.
// daten: { person:{name,vorname,strasse,plz,ort}, bank:{inhaber,iban,bic}, belege:[{datum,zweck,betrag}], unterschrift:dataURL|null, logo:dataURL|null }

export const parseBetrag = (v) => {
  const s = String(v ?? '').trim().replace(/\s|€/g, '');
  if (!s) return NaN;
  // „1.234,56" → 1234.56 · „12,5" → 12.5 · „12.50" → 12.5
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return /^-?\d+(\.\d+)?$/.test(norm) ? Number(norm) : NaN;
};
export const fmtBetrag = (n) => (Number.isFinite(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const fmtDatum = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('.') : iso || '');

export function erstelleAbrechnungPdf({ person = {}, bank = {}, belege = [], unterschrift = null, logo = null, datum = new Date() }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const W = 210, L = 20, R = 190;
  const green = [22, 101, 52];
  const grey = [110, 110, 110];
  const line = (x1, y1, x2, y2, w = 0.25, c = [60, 60, 60]) => { pdf.setDrawColor(...c); pdf.setLineWidth(w); pdf.line(x1, y1, x2, y2); };

  // ── Kopf
  if (logo) { try { pdf.addImage(logo, 'PNG', L, 14, 70, 70 * 98 / 452); } catch { /* Logo optional */ } }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(...green);
  pdf.text('Erstattung', R, 20, { align: 'right' });
  pdf.text('von Aufwendungen', R, 27.5, { align: 'right' });
  line(L, 34, R, 34, 0.6, green);

  // ── Angaben zur Person
  let y = 44;
  const feld = (label, wert, x, w) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey);
    pdf.text(label, x, y - 5.2);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(0, 0, 0);
    pdf.text(String(wert || ''), x, y, { maxWidth: w - 2 });
    line(x, y + 1.6, x + w - 3, y + 1.6);
  };
  feld('Name', person.name, L, 85); feld('Vorname', person.vorname, L + 85, 85); y += 13;
  feld('Straße', person.strasse, L, 85); feld('PLZ', person.plz, L + 85, 25); feld('Ort', person.ort, L + 110, 60); y += 12;

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5); pdf.setTextColor(0, 0, 0);
  pdf.text('Folgende Aufwendungen stelle ich dem TTC Grün-Weiß Staffel in Rechnung:', L, y); y += 5;
  pdf.setFontSize(9); pdf.setTextColor(...grey);
  pdf.text('Belege sind mit Nummerierung beigefügt.', L, y); y += 6;

  // ── Tabelle
  const cols = [{ t: 'Bel.-Nr.', w: 18, a: 'center' }, { t: 'Datum', w: 26, a: 'center' }, { t: 'Art der Aufwendung', w: 96, a: 'left' }, { t: 'Betrag in €', w: 30, a: 'right' }];
  const xs = cols.reduce((a, c, i) => (a.push(i ? a[i - 1] + cols[i - 1].w : L), a), []);
  const kopf = () => {
    pdf.setFillColor(232, 243, 236); pdf.rect(L, y, R - L, 8, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...green);
    cols.forEach((c, i) => pdf.text(c.t, c.a === 'center' ? xs[i] + c.w / 2 : c.a === 'right' ? xs[i] + c.w - 2.5 : xs[i] + 2.5, y + 5.4, { align: c.a }));
    line(L, y + 8, R, y + 8, 0.4, green); y += 8;
  };
  kopf();
  const zeilen = belege.length < 10 ? [...belege, ...Array(10 - belege.length).fill(null)] : belege;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0);
  zeilen.forEach((b, i) => {
    const zweck = b ? pdf.splitTextToSize(String(b.zweck || ''), cols[2].w - 5) : [''];
    const h = Math.max(7.5, zweck.length * 4.6 + 3);
    if (y + h > 250) { pdf.addPage(); y = 20; kopf(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); }
    if (b) {
      const mid = y + 5;
      pdf.text(String(i + 1), xs[0] + cols[0].w / 2, mid, { align: 'center' });
      pdf.text(fmtDatum(b.datum), xs[1] + cols[1].w / 2, mid, { align: 'center' });
      pdf.text(zweck, xs[2] + 2.5, mid);
      pdf.text(fmtBetrag(parseBetrag(b.betrag)), xs[3] + cols[3].w - 2.5, mid, { align: 'right' });
    }
    line(L, y + h, R, y + h, 0.15, [180, 180, 180]);
    y += h;
  });
  const summe = belege.reduce((s, b) => s + (parseBetrag(b.betrag) || 0), 0);
  line(L, y, R, y, 0.4, green);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
  pdf.text('Gesamtbetrag:', xs[3] - 3, y + 6.5, { align: 'right' });
  pdf.text(`${fmtBetrag(summe)} €`, R - 2.5, y + 6.5, { align: 'right' });
  line(xs[3] + 2, y + 8.6, R, y + 8.6, 0.3, [0, 0, 0]); line(xs[3] + 2, y + 9.4, R, y + 9.4, 0.3, [0, 0, 0]);
  y += 16;

  // ── Datum / Unterschrift + Bankverbindung
  if (y > 240) { pdf.addPage(); y = 30; }
  const yU = y + 16;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(0, 0, 0);
  pdf.text(datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), L, yU - 1.5);
  if (unterschrift) { try { const ip = pdf.getImageProperties(unterschrift); let w = 48, h = w * ip.height / ip.width; if (h > 20) { h = 20; w = h * ip.width / ip.height; } pdf.addImage(unterschrift, 'PNG', L + 36, yU + 1 - h, w, h); } catch { /* ohne Bild */ } }
  line(L, yU, L + 30, yU); line(L + 36, yU, L + 86, yU);
  pdf.setFontSize(8.5); pdf.setTextColor(...grey);
  pdf.text('Datum', L, yU + 4); pdf.text('Unterschrift', L + 36, yU + 4);

  const bx = 112;
  pdf.setFillColor(245, 248, 246); pdf.roundedRect(bx, y - 2, R - bx, 30, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...green);
  pdf.text('Bitte überweisen:', bx + 4, y + 4.5);
  const bz = (l, v, yy) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey); pdf.text(l, bx + 4, yy); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); pdf.text(String(v || ''), bx + 26, yy); };
  bz('Kontoinhaber', bank.inhaber, y + 11.5); bz('IBAN', bank.iban, y + 17.5); bz('BIC', bank.bic, y + 23.5);

  return { pdf, summe };
}

// Fotos der Belege als eigene Seiten anhängen (optional) – fotos: [{nr, bild:dataURL(JPEG), w, h}]
export function belegFotosAnhaengen(pdf, fotos = []) {
  fotos.forEach(({ nr, bild, w, h }) => {
    pdf.addPage();
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(22, 101, 52);
    pdf.text(`Beleg Nr. ${nr}`, 20, 18);
    const maxW = 170, maxH = 255;
    const f = Math.min(maxW / w, maxH / h);
    try { pdf.addImage(bild, 'JPEG', 20 + (maxW - w * f) / 2, 26, w * f, h * f); } catch { /* Bild nicht lesbar */ }
  });
}
