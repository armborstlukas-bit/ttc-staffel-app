// Einmalige Korrektur (05.11.2026) nach Liste eines Vereinsmitglieds: volle Namen statt Abkürzungen,
// Doppel-Einträge zusammenführen (Spiele addieren), neue Hochrechnung Lothar Ludwig (ab 1975).
import fs from 'node:fs';
const PFAD = new URL('../../src/data/spielAnzahl.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(PFAD, 'utf8'));
const finde = (n) => { const t = d.spieler.filter(s => s[0] === n); if (t.length !== 1) throw new Error(`${n}: ${t.length} Treffer`); return t[0]; };

const UMBENENNEN = {
  'Huster': 'Horst Huster', 'Arndt': 'Karl-Günther (Charly) Arndt', 'Eufinger': 'Horst Eufinger', 'Keul': 'Ewald Keul', 'Hahn': 'Friedel Hahn',
  'Schütz': 'Hans Schütz', 'Kloft': 'Wolfgang Kloft', 'Kordula Röhr': 'Cordula Röhr', 'Friedhelm Röhr': 'Hannes Röhr', 'Schütze': 'Georg Schütz',
  'Kleinmichel': 'Reinhard Kleinmichel', 'Peri Schmollig': 'Peri Schmolling', 'Weissmantel': 'Wolfgang Weissmantel', 'Späth': 'Ottmar Späth',
  'M. Kaufmann': 'Matthias Kaufmann', 'I. Thomé': 'Irene Thomé', 'B. Claasen': 'Birgit Claasen', 'Keht': 'Arthur Keht', 'D. Engelhardt': 'Dieter Engelhardt',
  'S. Loos': 'Silvia Loos', 'R. Wagner': 'Rainer Wagner', 'I. Peters': 'Irene Peters', 'M. Schlosser': 'Margot Schlosser', 'Baca': 'Vladimir Baca',
  'Heinritz': 'Wolfgang Heinritz', 'A. Schmidt': 'Andreas Schmidt', 'Dillmann': 'Franz Dillmann', 'Faatz': 'Manfred Faatz', 'B. Mai': 'Bernd Mai',
  'Brunswig': 'Fritz Brunswig', 'K. Angelstein': 'Kathrin Angelstein', 'Roswita Schlink': 'Roswitha Schlink', 'Auer': 'Markus Auer',
  'Längsfeld': 'Carsten Längsfeld', 'Rasel': 'Sabine Rasel', 'Christ': 'Esther Christ', 'Feuerstake': 'Jutta Feuerstake',
};
for (const [alt, neu] of Object.entries(UMBENENNEN)) finde(alt)[0] = neu;

// [Ziel, Quelle]: Quelle wird ins Ziel addiert und entfernt
const ZUSAMMEN = [['Irene Thomé', 'I. Diefenbach'], ['Irene Thomé', 'Irene Picha'], ['Edelbert Schmid', 'E. Schmid schwach'], ['Andrea Grulke', 'A. Grulke'], ['Roswitha Schlink', 'R. Schlink']];
for (const [ziel, quelle] of ZUSAMMEN) {
  const z = finde(ziel), q = finde(quelle);
  z[1] += q[1]; z[2] += q[2]; z[3] += q[3];
  if (q[4] && (!z[4] || q[4] < z[4])) z[4] = q[4];
  if ((q[5] || '') > (z[5] || '')) z[5] = q[5];
  z[6] = Math.min(z[6], q[6]);
  z[7] = z[7] && q[7] ? 1 : 0;
  d.spieler.splice(d.spieler.indexOf(q), 1);
}

// Lothar Ludwig: seit 1975 (Schülermannschaft) statt 1978 → 28 Saisons × 24 Einzel
const l = finde('Lothar Ludwig'); l[6] = 1975; l[3] = (2003 - 1975) * 24;

fs.writeFileSync(PFAD, JSON.stringify(d));
console.log('ok', d.spieler.length, 'Einträge');
for (const n of ['Irene Thomé', 'Edelbert Schmid', 'Andrea Grulke', 'Roswitha Schlink', 'Lothar Ludwig', 'Hannes Röhr', 'Esther Christ', 'Esther Krist']) console.log(JSON.stringify(finde(n)));
