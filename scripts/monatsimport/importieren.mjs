// Schritt 3: Monatsimport. Ohne --schreiben nur Vorschau.
//   node importieren.mjs --monat 2026-10 --daten ergebnis.json [--schreiben]
// Der Stand zum 1. des Folgemonats wird als Folgemonat gespeichert (Oktober → „2026-11“);
// ältere Werte bleiben unberührt, ein zweiter Lauf überschreibt nur denselben Monatswert.
// „Anzahl der Spiele“ bekommt nur Spiele nach ihrem bisherigen Stand, danach steht sie auf Monatsende.
import fs from 'node:fs';
import { db } from './_db.mjs';

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const monat = arg('monat'), schreiben = process.argv.includes('--schreiben');
if (!/^\d{4}-\d{2}$/.test(monat || '') || !arg('daten')) throw new Error('--monat JJJJ-MM und --daten sind nötig');
const [y, m] = monat.split('-').map(Number);
const pad = (n) => String(n).padStart(2, '0');
const ziel = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
const monatsende = `${monat}-${pad(new Date(y, m, 0).getDate())}`;

const clean = (n) => n.normalize('NFC').replace(/[\s ]+/g, ' ').trim();
// Format je Name: [TTR am Monatsanfang, TTR am Monatsende, Ereignisse im Monat oder 'R', neue Spiele].
// 'R' = Historie bei mytischtennis gesperrt, Wert aus der Vereinsrangliste vom Importtag.
const ALIAS = { 'Bastian Herberling': 'Bastian Heberling', 'Lea Moukadder': 'Lea Zeinab Moukhadder', 'Lea Moukhadder': 'Lea Zeinab Moukhadder', 'Mikal Asmerom': 'Mikal Berhane Asmerom', 'Sally Elkaliny': 'Sally Osama Ahmed Elkaliny', 'William Vonnemann': 'William Kento Vonnemann' };
const daten = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(arg('daten'), 'utf8'))).map(([n, [start, ende, imMonat, neu]]) => [n, { start, ende, imMonat, neu, rangliste: imMonat === 'R' }]));
for (const [a, n] of Object.entries(ALIAS)) if (daten[n]) daten[a] = { ...daten[n], neu: [] };
const SA_PFAD = new URL('../../src/data/spielAnzahl.json', import.meta.url);
const sa = JSON.parse(fs.readFileSync(SA_PFAD, 'utf8'));
const get = async (n) => (await db.doc(`ttc/${n}`).get()).data() || {};
const [hist, aktive, kids, subgroups] = await Promise.all(['ttrHistory', 'aktiveSpieler', 'children', 'subgroups'].map(get));

// ── TTR ──
const personen = [
  ...Object.values(aktive).map((a) => ({ id: a.id, name: a.name })),
  ...Object.entries(kids).filter(([id, c]) => c?.name && (hist[id] || (subgroups[c.subgroupId]?.groupId === 'jugend' && !c.nachwuchsKarriereBeendet))).map(([id, c]) => ({ id, name: c.name })),
];
const updates = {}, aktivUpdates = {}, ohneWert = [], abweichung = [], aenderungen = [];
const vormonat = `${y}-${pad(m)}`;
for (const { id, name } of personen) {
  const d = daten[clean(name)];
  if (!d || d.ende == null) { ohneWert.push(`${clean(name)}${d?.fehlt ? ` (${d.fehlt})` : ''}`); continue; }
  const alt = (hist[id]?.entries || []).filter((e) => e.month !== ziel);
  const vor = alt.find((e) => e.month === vormonat)?.ttr;
  if (vor != null && d.start != null && vor !== d.start) abweichung.push(`${clean(name)}: App ${vor}, mytischtennis ${d.start}`);
  updates[id] = { entries: [...alt, { month: ziel, ttr: d.ende }].sort((a, b) => a.month.localeCompare(b.month)) };
  if (aktive[id]) aktivUpdates[`${id}.ttr`] = d.ende;
  if (d.imMonat) aenderungen.push({ name: clean(name), id, von: vor ?? d.start, nach: d.ende });
}

// ── Spieler des Monats (gleiche Regel wie in der App: größtes Plus der Jugend) ──
const jugend = Object.entries(kids).filter(([, c]) => subgroups[c?.subgroupId]?.groupId === 'jugend' && !c.nachwuchsKarriereBeendet);
const plus = jugend.map(([id, c]) => {
  const e = updates[id]?.entries; if (!e || e.length < 2) return null;
  const vor = [...e].filter((x) => x.month < ziel).pop();
  return vor ? { name: `${clean(c.name)}${daten[clean(c.name)]?.rangliste ? ' [Rangliste]' : ''}`, diff: e.find((x) => x.month === ziel).ttr - vor.ttr, von: vor.ttr, nach: e.find((x) => x.month === ziel).ttr } : null;
}).filter(Boolean).sort((a, b) => b.diff - a.diff);

// ── Anzahl der Spiele ──
const zeilen = new Map(sa.spieler.map((r) => [clean(r[0]), r]));
const neueSpiele = [];
if (sa.stand < monatsende) {
  for (const [name, d] of Object.entries(daten)) {
    const neu = (d.neu || []).filter(([tag]) => tag > sa.stand && tag <= monatsende);
    if (!neu.length) continue;
    const dm = neu.filter((e) => e[1] === 'm').reduce((s, e) => s + e[2], 0), dt = neu.filter((e) => e[1] === 't').reduce((s, e) => s + e[2], 0);
    if (!dm && !dt) continue;
    const letzter = neu[neu.length - 1][0];
    let r = zeilen.get(name);
    if (!r) { r = [name, 0, 0, 0, neu[0][0], letzter, Number(neu[0][0].slice(0, 4)), 0]; sa.spieler.push(r); zeilen.set(name, r); neueSpiele.push(`NEU ${name}`); }
    r[1] += dm; r[2] += dt; r[4] = r[4] || neu[0][0]; if (letzter > (r[5] || '')) r[5] = letzter; r[7] = 0;
    neueSpiele.push(`${name}: +${dm} Mannschaft, +${dt} Turnier`);
  }
  sa.stand = monatsende;
  sa.spieler.sort((a, b) => (b[1] + b[2] + b[3]) - (a[1] + a[2] + a[3]));
}

console.log(`\nMonat ${monat} → gespeichert als ${ziel}`);
console.log(`TTR: ${Object.keys(updates).length} Werte, ${aenderungen.length} mit Spielen im Monat`);
console.log('\nSpieler des Monats:', plus[0]?.diff > 0 ? plus.filter((p) => p.diff === plus[0].diff).map((p) => `${p.name} ${p.von} → ${p.nach} (+${p.diff})`).join(', ') : 'niemand mit Plus');
console.log('Verfolger:', plus.slice(1, 8).map((p) => `${p.name} ${p.diff >= 0 ? '+' : ''}${p.diff}`).join(', '));
console.log(`\nAbweichung Vormonat (${abweichung.length}):`, abweichung.join('; ') || 'keine');
console.log(`\nOhne Wert, bleibt unverändert (${ohneWert.length}):`, ohneWert.join('; ') || 'keine');
console.log(`\nAnzahl der Spiele (${neueSpiele.length}):`, neueSpiele.join('; ') || 'keine neuen');

if (schreiben) {
  await db.doc('ttc/ttrHistory').update(updates);
  if (Object.keys(aktivUpdates).length) await db.doc('ttc/aktiveSpieler').update(aktivUpdates);
  fs.writeFileSync(SA_PFAD, JSON.stringify(sa));
  console.log('\nGESCHRIEBEN. Jetzt App veröffentlichen: bash deploy/deploy.sh');
} else console.log('\nNur Vorschau, nichts geschrieben.');
