// Schritt 1: Liste aller auszulesenden Personen (App + aktive aus „Anzahl der Spiele“).
import fs from 'node:fs';
import { db } from './_db.mjs';
const AUS = /tamoschus|wolfgang jahn|kilian baumann/i;
const SA = JSON.parse(fs.readFileSync(new URL('../../src/data/spielAnzahl.json', import.meta.url)));
const get = async n => (await db.doc(`ttc/${n}`).get()).data() || {};
const [hist, aktive, children, subgroups] = await Promise.all(['ttrHistory', 'aktiveSpieler', 'children', 'subgroups'].map(get));
console.error('Struktur children:', Object.keys(children).slice(0, 3), 'subgroups:', Object.keys(subgroups).slice(0, 3));
const kids = children.items || children.children || children;
const namen = new Set();
const clean = n => n.normalize('NFC').replace(/[\s ]+/g, ' ').trim();
for (const c of Object.values(kids)) if (subgroups[c?.subgroupId]?.groupId === 'jugend' && !c.nachwuchsKarriereBeendet) namen.add(clean(c.name));
for (const id of Object.keys(hist)) { const n = aktive[id]?.name || kids[id]?.name; if (n) namen.add(clean(n)); else console.error('ohne Namen:', id); }
for (const r of SA.spieler) if (!r[7] && (r[5] || '') >= '2025-08-01') namen.add(clean(r[0]));
const liste = [...new Set([...namen].map(clean))].filter(n => !AUS.test(n)).sort();
fs.writeFileSync(process.argv[2], JSON.stringify(liste));
console.log(liste.length, 'Personen; Stand Spielanzahl', SA.stand);
