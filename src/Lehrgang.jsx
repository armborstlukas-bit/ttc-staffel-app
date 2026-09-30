import React, { useMemo, useState } from 'react';
import { Home, Plus, Trash2, Download, Check, Search, ChevronLeft, ChevronRight, ChevronDown, UserPlus, X, Pencil } from 'lucide-react';
import { parseBetrag } from './abrechnungPdf.js';
import { lehrgangPdf, lehrgangXlsx, fmtEuro, dm, dmy, dateiName } from './lehrgangExport.js';

// Lehrgangsabrechnung für Ferien-Lehrgänge (Trainer & Admins).
// Firestore ttc/lehrgaenge: { [id]: { name, preis, tage:[iso], teilnahme:{[iso]:{[kindId]:bool}}, gaeste:{[gid]:{name}|null}, hinweis, createdAt, createdBy } }

const C = { accent: '#86efac', line: 'rgba(134,239,172,0.2)' };
const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '10px', color: 'white', fontSize: '16px', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' };
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '14px' };
const btn = (primary) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', border: primary ? 'none' : '1px solid rgba(255,255,255,0.18)', background: primary ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'rgba(255,255,255,0.06)', color: 'white' });
const wochentag = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
const neueId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const logoLaden = async () => {
  try { const bl = await (await fetch('/abrechnung-logo.png')).blob(); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); } catch { return null; }
};
const speichernAls = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); };

const wocheVon = (iso) => {
  const d = new Date(iso + 'T12:00:00'); const mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => { const x = new Date(mo); x.setDate(mo.getDate() + i); return x.toISOString().slice(0, 10); });
};

// Tage auswählen: Datum + „Tag“ oder ganze Woche „Mo–Fr“; vorhandene Tage mit ✕ entfernen
function TageEditor({ tage, onAdd, onRemove, isMobile, anzahl }) {
  const [datum, setDatum] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {tage.length === 0 && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Noch keine Tage ausgewählt.</span>}
        {tage.map((iso) => (
          <span key={iso} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 8px 7px 11px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', fontWeight: 700, fontSize: '13px' }}>
            {wochentag(iso)} {dm(iso)}{anzahl ? <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>· {anzahl(iso)}</span> : null}
            <button onClick={() => onRemove(iso)} aria-label={`${dmy(iso)} entfernen`} style={{ background: 'rgba(248,113,113,0.15)', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'grid', placeItems: 'center', width: '22px', height: '22px', borderRadius: '6px', padding: 0 }}><X size={14} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: '8px', alignItems: 'end' }}>
        <label><span style={lbl}>Datum</span><input type="date" style={input} value={datum} onChange={(e) => setDatum(e.target.value)} /></label>
        <div style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } : { display: 'contents' }}>
          <button style={{ ...btn(true), opacity: datum ? 1 : 0.5 }} disabled={!datum} onClick={() => { onAdd([datum]); setDatum(''); }}><Plus size={16} /> Tag</button>
          <button style={{ ...btn(false), opacity: datum ? 1 : 0.5 }} disabled={!datum} onClick={() => { onAdd(wocheVon(datum)); setDatum(''); }} title="Montag bis Freitag dieser Woche hinzufügen"><Plus size={16} /> Mo–Fr</button>
        </div>
      </div>
    </div>
  );
}

export default function Lehrgang({ isMobile, onHome, lehrgaenge = {}, kinder = [], onSave, onDelete, userName = '' }) {
  const [aktivId, setAktivId] = useState(null);
  const [tab, setTab] = useState('anwesenheit');
  const [tag, setTag] = useState(null);
  const [neu, setNeu] = useState(null); // {name, preis}
  const [suche, setSuche] = useState('');
  const [gruppe, setGruppe] = useState(''); // Filter nach Trainingsgruppe ('' = alle)
  const [tageEdit, setTageEdit] = useState(false);
  const [gastName, setGastName] = useState('');
  const [laeuft, setLaeuft] = useState('');
  const [fehler, setFehler] = useState('');

  const liste = Object.entries(lehrgaenge).filter(([, l]) => l && l.name).map(([id, l]) => ({ id, ...l }))
    .sort((a, b) => (b.tage?.[0] || b.createdAt || '').localeCompare(a.tage?.[0] || a.createdAt || ''));
  const lg = aktivId ? liste.find((l) => l.id === aktivId) : null;

  // alle Personen: Vereinskinder + Gäste dieses Lehrgangs
  const personen = useMemo(() => {
    if (!lg) return [];
    const g = Object.entries(lg.gaeste || {}).filter(([, v]) => v && v.name).map(([id, v]) => ({ id, name: v.name, gruppe: 'Gäste', gast: true, ordnung: 99999 }));
    return [...kinder, ...g];
  }, [lg, kinder]);

  const tage = [...(lg?.tage || [])].sort();
  const preis = Number(lg?.preis) || 0;
  const da = (iso, id) => !!lg?.teilnahme?.[iso]?.[id];
  const abrechnung = useMemo(() => {
    if (!lg) return { zeilen: [], summe: 0 };
    const zeilen = personen.map((p) => {
      const t = tage.filter((iso) => da(iso, p.id));
      return { id: p.id, name: p.name, gruppe: p.gruppe, tage: t, betrag: t.length * preis };
    }).filter((z) => z.tage.length).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return { zeilen, summe: zeilen.reduce((s, z) => s + z.betrag, 0) };
  }, [lg, personen, tage.join(), preis]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch) => onSave(lg.id, patch);

  // ── Neuer Lehrgang ─────────────────────────
  const anlegen = () => {
    const p = parseBetrag(neu.preis);
    if (!neu.name.trim()) return setFehler('Bitte einen Namen eingeben.');
    if (!Number.isFinite(p) || p < 0) return setFehler('Bitte einen gültigen Preis pro Tag eingeben (z. B. 15,00).');
    const id = neueId('lg_');
    const t = [...new Set(neu.tage)].sort();
    onSave(id, { name: neu.name.trim(), preis: p, tage: t, teilnahme: {}, gaeste: {}, hinweis: '', createdAt: new Date().toISOString(), createdBy: userName });
    setNeu(null); setFehler(''); setAktivId(id); setTab('anwesenheit'); setTag(t[0] || null); setTageEdit(false);
  };

  const tageHinzu = (liste) => {
    const alle = [...new Set([...tage, ...liste])].sort();
    if (alle.length === tage.length) return;
    save({ tage: alle }); if (!tag) setTag(liste[0]);
  };
  const tagEntfernen = (iso) => {
    const n = Object.values(lg.teilnahme?.[iso] || {}).filter(Boolean).length;
    if (!window.confirm(`${wochentag(iso)} ${dmy(iso)} aus dem Lehrgang entfernen?${n ? `\n${n} eingetragene Anwesenheiten dieses Tages werden nicht mehr berechnet.` : ''}`)) return;
    save({ tage: tage.filter((t) => t !== iso) }); if (tag === iso) setTag(null);
  };
  const toggle = (id) => save({ teilnahme: { [tag]: { [id]: !da(tag, id) } } });
  const gastHinzu = () => {
    const n = gastName.trim(); if (!n) return;
    const gid = neueId('gast_');
    save({ gaeste: { [gid]: { name: n } }, ...(tag ? { teilnahme: { [tag]: { [gid]: true } } } : {}) });
    setGastName('');
  };

  const exportieren = async (art) => {
    setLaeuft(art); setFehler('');
    try {
      const d = { name: lg.name, preis, tage, zeilen: abrechnung.zeilen, summe: abrechnung.summe, hinweis: lg.hinweis || '' };
      if (art === 'pdf') { const pdf = lehrgangPdf({ ...d, logo: await logoLaden() }); speichernAls(pdf.output('blob'), dateiName(lg.name, 'pdf')); }
      else speichernAls(await lehrgangXlsx(d), dateiName(lg.name, 'xlsx'));
    } catch (e) { setFehler('Export fehlgeschlagen: ' + (e?.message || e)); }
    setLaeuft('');
  };

  const Kopf = ({ titel, zurueck }) => (
    <div className="ttc-sticky-hdr" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button onClick={zurueck || onHome} aria-label={zurueck ? 'Zurück' : 'Startseite'} style={{ padding: '10px 12px', background: 'rgba(134,239,172,0.12)', color: C.accent, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>{zurueck ? <ChevronLeft size={16} /> : <Home size={16} />}</button>
      <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '800', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titel}</h1>
    </div>
  );
  const seite = { minHeight: '100vh', background: 'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", color: 'white' };
  const inhalt = { padding: isMobile ? '14px 16px 48px' : '20px', maxWidth: '760px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '14px' };

  // ── Übersicht ─────────────────────────────
  if (!lg) {
    return (
      <div className="ttc-view-enter" style={seite}>
        <Kopf titel="🎒 Lehrgangsabrechnung" />
        <div style={inhalt}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.5 }}>Ferien-Lehrgänge kosten pro Tag. Lehrgang anlegen, Tage eintragen, Kinder abhaken – am Ende PDF oder Excel mit dem Betrag für jedes Kind erstellen.</p>
          {neu ? (
            <div style={card}>
              <h2 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: C.accent }}>Neuer Lehrgang</h2>
              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr' }}>
                <label><span style={lbl}>Name</span><input autoFocus style={input} value={neu.name} placeholder="z. B. Herbstlehrgang 2026" onChange={(e) => setNeu({ ...neu, name: e.target.value })} /></label>
                <label><span style={lbl}>Kosten pro Tag in €</span><input style={input} value={neu.preis} placeholder="z. B. 15,00" inputMode="decimal" onChange={(e) => setNeu({ ...neu, preis: e.target.value })} /></label>
              </div>
              <div style={{ marginTop: '14px' }}>
                <span style={lbl}>Lehrgangstage</span>
                <TageEditor isMobile={isMobile} tage={[...neu.tage].sort()}
                  onAdd={(l) => setNeu((n) => ({ ...n, tage: [...new Set([...n.tage, ...l])] }))}
                  onRemove={(iso) => setNeu((n) => ({ ...n, tage: n.tage.filter((t) => t !== iso) }))} />
              </div>
              {fehler && <p style={{ color: '#fca5a5', fontSize: '13px', margin: '10px 0 0' }}>{fehler}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button style={btn(true)} onClick={anlegen}><Check size={16} /> Anlegen</button>
                <button style={btn(false)} onClick={() => { setNeu(null); setFehler(''); }}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button style={{ ...btn(true), padding: '14px' }} onClick={() => setNeu({ name: '', preis: '', tage: [] })}><Plus size={18} /> Neuen Lehrgang anlegen</button>
          )}
          {liste.length === 0 && !neu && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: '24px 0', margin: 0 }}>Noch keine Lehrgänge angelegt.</p>}
          {liste.map((l) => {
            const t = [...(l.tage || [])].sort();
            const kids = new Set(); t.forEach((iso) => Object.entries(l.teilnahme?.[iso] || {}).forEach(([k, v]) => v && kids.add(k)));
            const summe = t.reduce((s, iso) => s + Object.values(l.teilnahme?.[iso] || {}).filter(Boolean).length, 0) * (Number(l.preis) || 0);
            const heute = new Date().toISOString().slice(0, 10);
            const status = !t.length ? ['Ohne Tage', '#9ca3af'] : t[t.length - 1] < heute ? ['Abgeschlossen', '#9ca3af'] : t[0] > heute ? ['Geplant', '#93c5fd'] : ['Läuft', '#4ade80'];
            const pill = { fontSize: '11.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' };
            return (
              <div key={l.id} role="button" tabIndex={0}
                onClick={() => { setAktivId(l.id); setTab('anwesenheit'); setTag(t[0] || null); setSuche(''); setGruppe(''); setTageEdit(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'rgba(255,255,255,0.045)', backgroundImage: 'linear-gradient(135deg, rgba(74,222,128,0.07), rgba(255,255,255,0) 55%)', border: '1px solid rgba(134,239,172,0.18)', borderRadius: '16px', padding: '14px', boxShadow: '0 6px 18px -10px rgba(0,0,0,0.6)' }}>
                <span style={{ width: '48px', height: '48px', borderRadius: '13px', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: '24px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)' }}>🎒</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: '16px', fontWeight: 800 }}>{l.name}</b>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: status[1] }}>● {status[0]}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 7px' }}>{t.length ? `${dmy(t[0])}${t.length > 1 ? ' – ' + dmy(t[t.length - 1]) : ''}` : 'Noch keine Tage eingetragen'}</span>
                  <span style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={pill}>{t.length} {t.length === 1 ? 'Tag' : 'Tage'}</span>
                    <span style={pill}>{kids.size} {kids.size === 1 ? 'Kind' : 'Kinder'}</span>
                    <span style={pill}>{fmtEuro(Number(l.preis) || 0)} €/Tag</span>
                  </span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <b style={{ display: 'block', color: C.accent, fontSize: '17px', whiteSpace: 'nowrap' }}>{fmtEuro(summe)} €</b>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>gesamt</span>
                </span>
                <ChevronRight size={18} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lehrgang ──────────────────────────────
  const q = suche.trim().toLowerCase();
  const teilnehmerIds = new Set(abrechnung.zeilen.map((z) => z.id));
  const gruppen = [...new Map(personen.filter((p) => p.gruppe).sort((a, b) => (a.ordnung ?? 0) - (b.ordnung ?? 0) || a.gruppe.localeCompare(b.gruppe, 'de')).map((p) => [p.gruppe, { name: p.gruppe, farbe: p.farbe }])).values()];
  const gefiltert = personen.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!gruppe || p.gruppe === gruppe)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const obenListe = gefiltert.filter((p) => teilnehmerIds.has(p.id) || (tag && da(tag, p.id)));
  const restListe = gefiltert.filter((p) => !obenListe.includes(p));
  const anzahlTag = tag ? personen.filter((p) => da(tag, p.id)).length : 0;

  const KindZeile = ({ p }) => {
    const an = da(tag, p.id);
    return (
      <button onClick={() => toggle(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', padding: '11px 12px', background: an ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${an ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '11px', cursor: 'pointer', color: 'white', fontFamily: 'inherit' }}>
        <span style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, display: 'grid', placeItems: 'center', background: an ? '#16a34a' : 'transparent', border: an ? 'none' : '2px solid rgba(255,255,255,0.25)' }}>{an && <Check size={17} strokeWidth={3} />}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: '15px', fontWeight: 700 }}>{p.name}</b>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{p.gruppe || ''}{teilnehmerIds.has(p.id) ? (() => { const n = abrechnung.zeilen.find((z) => z.id === p.id)?.tage.length || 0; return ` · ${n} ${n === 1 ? 'Tag' : 'Tage'}`; })() : ''}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="ttc-view-enter" style={seite}>
      <Kopf titel={`🎒 ${lg.name}`} zurueck={() => setAktivId(null)} />
      <div style={inhalt}>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          {[['anwesenheit', 'Anwesenheit'], ['abrechnung', 'Abrechnung'], ['einstellungen', 'Einstellungen']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '10px 4px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px', background: tab === k ? '#16a34a' : 'transparent', color: tab === k ? 'white' : 'rgba(255,255,255,0.6)' }}>{l}</button>
          ))}
        </div>

        {tab === 'anwesenheit' && (<>
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.accent, flex: 1 }}>Lehrgangstage</h2>
              <button onClick={() => setTageEdit(!tageEdit)} aria-label={tageEdit ? 'Bearbeiten beenden' : 'Tage bearbeiten'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '9px', cursor: 'pointer', fontWeight: 800, fontSize: '12.5px', border: `1px solid ${tageEdit ? '#4ade80' : 'rgba(255,255,255,0.18)'}`, background: tageEdit ? '#16a34a' : 'rgba(255,255,255,0.06)', color: 'white' }}>
                {tageEdit ? <><Check size={15} /> Fertig</> : <><Pencil size={14} /> Bearbeiten</>}
              </button>
            </div>
            {tageEdit ? (
              <TageEditor isMobile={isMobile} tage={tage} onAdd={tageHinzu} onRemove={tagEntfernen} anzahl={(iso) => Object.values(lg.teilnahme?.[iso] || {}).filter(Boolean).length} />
            ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tage.length === 0 && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Noch keine Tage – über „Bearbeiten“ hinzufügen.</span>}
              {tage.map((iso) => {
                const n = Object.values(lg.teilnahme?.[iso] || {}).filter(Boolean).length;
                const on = tag === iso;
                return (
                  <button key={iso} onClick={() => setTag(iso)} style={{ padding: '8px 11px', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${on ? '#4ade80' : 'rgba(255,255,255,0.14)'}`, background: on ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.04)', color: 'white', fontWeight: 700, fontSize: '13px', textAlign: 'center', lineHeight: 1.25 }}>
                    {wochentag(iso)} {dm(iso)}<span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: on ? '#bbf7d0' : 'rgba(255,255,255,0.5)' }}>{n} Kinder</span>
                  </button>
                );
              })}
            </div>
            )}
          </section>

          {!tageEdit && tag && tage.includes(tag) && (
            <section style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.accent, flex: 1 }}>{new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} · {anzahlTag} da</h2>
              </div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input style={{ ...input, paddingLeft: '36px' }} value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Kind suchen…" />
                {suche && <button onClick={() => setSuche('')} aria-label="Suche leeren" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>}
              </div>
              {gruppen.length > 1 && (() => {
                const aktiv = gruppen.find((g) => g.name === gruppe);
                const zahl = (name) => (name ? personen.filter((p) => p.gruppe === name && da(tag, p.id)).length : anzahlTag);
                return (
                  <label style={{ display: 'block', position: 'relative', marginBottom: '12px' }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '9px', height: '9px', borderRadius: '50%', background: aktiv?.farbe || 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                    <select value={gruppe} onChange={(e) => setGruppe(e.target.value)} aria-label="Nach Gruppe filtern"
                      style={{ ...input, paddingLeft: '32px', paddingRight: '38px', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', fontWeight: 700, border: `1px solid ${gruppe ? '#4ade80' : 'rgba(134,239,172,0.2)'}`, background: gruppe ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.07)' }}>
                      <option value="" style={{ background: '#0a2210' }}>Alle Gruppen{zahl('') ? ` (✓ ${zahl('')})` : ''}</option>
                      {gruppen.map((g) => <option key={g.name} value={g.name} style={{ background: '#0a2210' }}>{g.name}{zahl(g.name) ? ` (✓ ${zahl(g.name)})` : ''}</option>)}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, pointerEvents: 'none' }} />
                  </label>
                );
              })()}
              {obenListe.length > 0 && <>
                <div style={{ ...lbl, marginTop: '4px', marginBottom: '8px' }}>Lehrgangsteilnehmer</div>
                <div style={{ display: 'grid', gap: '6px', marginBottom: '14px' }}>{obenListe.map((p) => <KindZeile key={p.id} p={p} />)}</div>
              </>}
              {restListe.length > 0 && <>
                <div style={{ ...lbl, marginBottom: '8px' }}>{obenListe.length ? 'Weitere Kinder' : 'Alle Kinder'}</div>
                <div style={{ display: 'grid', gap: '6px' }}>{restListe.map((p) => <KindZeile key={p.id} p={p} />)}</div>
              </>}
              {gefiltert.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 10px' }}>Kein Kind gefunden{gruppe ? ` in „${gruppe}“` : ''}.</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <input style={input} value={gastName} onChange={(e) => setGastName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && gastHinzu()} placeholder="Gastkind (nicht im Verein) hinzufügen" />
                <button style={{ ...btn(false), flexShrink: 0 }} onClick={gastHinzu} aria-label="Gast hinzufügen"><UserPlus size={17} /></button>
              </div>
            </section>
          )}
        </>)}

        {tab === 'abrechnung' && (
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.accent }}>{abrechnung.zeilen.length} Kinder · {tage.length} Tage · {fmtEuro(preis)} €/Tag</h2>
            </div>
            {abrechnung.zeilen.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '10px 0' }}>Noch keine Anwesenheiten eingetragen.</p> : (
              <div style={{ display: 'grid', gap: '2px' }}>
                {abrechnung.zeilen.map((z) => (
                  <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 2px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: '14.5px' }}>{z.name}</b>
                      <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{z.tage.length} × {fmtEuro(preis)} € · {z.tage.map(dm).join(', ')}</span>
                    </span>
                    <b style={{ whiteSpace: 'nowrap', fontSize: '15px' }}>{fmtEuro(z.betrag)} €</b>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 2px 2px', fontWeight: 800, fontSize: '17px' }}><span>Gesamt</span><span style={{ color: C.accent }}>{fmtEuro(abrechnung.summe)} €</span></div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...btn(true), opacity: abrechnung.zeilen.length && !laeuft ? 1 : 0.5 }} disabled={!abrechnung.zeilen.length || !!laeuft} onClick={() => exportieren('pdf')}><Download size={16} /> {laeuft === 'pdf' ? 'Erstelle…' : 'PDF'}</button>
              <button style={{ ...btn(true), background: 'linear-gradient(135deg,#15803d,#166534)', opacity: abrechnung.zeilen.length && !laeuft ? 1 : 0.5 }} disabled={!abrechnung.zeilen.length || !!laeuft} onClick={() => exportieren('xlsx')}><Download size={16} /> {laeuft === 'xlsx' ? 'Erstelle…' : 'Excel'}</button>
            </div>
            {fehler && <p style={{ color: '#fca5a5', fontSize: '13px', margin: '10px 0 0' }}>{fehler}</p>}
            <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Die Datei enthält alle Kinder mit ihren Tagen und dem Betrag – zum Weiterschicken an die Eltern. Einen Zahlungshinweis (z. B. Kontoverbindung, Frist) kannst du unter „Einstellungen“ ergänzen.</p>
          </section>
        )}

        {tab === 'einstellungen' && (
          <section style={card}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <label><span style={lbl}>Name des Lehrgangs</span><input style={input} defaultValue={lg.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== lg.name && save({ name: e.target.value.trim() })} /></label>
              <label><span style={lbl}>Kosten pro Lehrgangstag in €</span><input style={input} inputMode="decimal" defaultValue={fmtEuro(preis)} onBlur={(e) => { const p = parseBetrag(e.target.value); if (Number.isFinite(p) && p >= 0 && p !== preis) save({ preis: p }); else e.target.value = fmtEuro(preis); }} /></label>
              <label><span style={lbl}>Hinweis zur Zahlung (erscheint in PDF & Excel)</span><textarea style={{ ...input, minHeight: '90px', resize: 'vertical' }} defaultValue={lg.hinweis || ''} placeholder="z. B. Bitte bis 15.11. überweisen an: TTC Grün-Weiß Staffel, IBAN …, Verwendungszweck: Herbstlehrgang + Name des Kindes" onBlur={(e) => e.target.value !== (lg.hinweis || '') && save({ hinweis: e.target.value })} /></label>
              {Object.entries(lg.gaeste || {}).some(([, v]) => v) && (
                <div>
                  <span style={lbl}>Gastkinder</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(lg.gaeste || {}).filter(([, v]) => v).map(([gid, v]) => (
                      <span key={gid} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', fontSize: '13px' }}>
                        {v.name}<button aria-label={`${v.name} entfernen`} onClick={() => window.confirm(`${v.name} aus dem Lehrgang entfernen?`) && save({ gaeste: { [gid]: null } })} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={15} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button style={{ ...btn(false), color: '#fca5a5', borderColor: 'rgba(248,113,113,0.4)', marginTop: '6px' }}
                onClick={() => { if (window.confirm(`Lehrgang „${lg.name}“ mit allen Anwesenheiten endgültig löschen?`)) { onDelete(lg.id); setAktivId(null); } }}><Trash2 size={16} /> Lehrgang löschen</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
