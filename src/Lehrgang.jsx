import React, { useMemo, useState } from 'react';
import { Home, Plus, Trash2, Download, Check, Search, ChevronLeft, UserPlus, X } from 'lucide-react';
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

export default function Lehrgang({ isMobile, onHome, lehrgaenge = {}, kinder = [], onSave, onDelete, userName = '' }) {
  const [aktivId, setAktivId] = useState(null);
  const [tab, setTab] = useState('anwesenheit');
  const [tag, setTag] = useState(null);
  const [neu, setNeu] = useState(null); // {name, preis}
  const [suche, setSuche] = useState('');
  const [neuerTag, setNeuerTag] = useState('');
  const [gastName, setGastName] = useState('');
  const [laeuft, setLaeuft] = useState('');
  const [fehler, setFehler] = useState('');

  const liste = Object.entries(lehrgaenge).filter(([, l]) => l && l.name).map(([id, l]) => ({ id, ...l }))
    .sort((a, b) => (b.tage?.[0] || b.createdAt || '').localeCompare(a.tage?.[0] || a.createdAt || ''));
  const lg = aktivId ? liste.find((l) => l.id === aktivId) : null;

  // alle Personen: Vereinskinder + Gäste dieses Lehrgangs
  const personen = useMemo(() => {
    if (!lg) return [];
    const g = Object.entries(lg.gaeste || {}).filter(([, v]) => v && v.name).map(([id, v]) => ({ id, name: v.name, gruppe: 'Gast', gast: true }));
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
    onSave(id, { name: neu.name.trim(), preis: p, tage: [], teilnahme: {}, gaeste: {}, hinweis: '', createdAt: new Date().toISOString(), createdBy: userName });
    setNeu(null); setFehler(''); setAktivId(id); setTab('anwesenheit'); setTag(null);
  };

  const tagHinzu = (iso) => {
    if (!iso || tage.includes(iso)) return;
    save({ tage: [...tage, iso].sort() }); setTag(iso); setNeuerTag('');
  };
  const wocheHinzu = (iso) => {
    if (!iso) return;
    const d = new Date(iso + 'T12:00:00'); const mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const neuTage = Array.from({ length: 5 }, (_, i) => { const x = new Date(mo); x.setDate(mo.getDate() + i); return x.toISOString().slice(0, 10); });
    const alle = [...new Set([...tage, ...neuTage])].sort();
    save({ tage: alle }); setTag(neuTage[0]); setNeuerTag('');
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
  const inhalt = { padding: isMobile ? '14px 16px 48px' : '20px', maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '14px' };

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
              {fehler && <p style={{ color: '#fca5a5', fontSize: '13px', margin: '10px 0 0' }}>{fehler}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button style={btn(true)} onClick={anlegen}><Check size={16} /> Anlegen</button>
                <button style={btn(false)} onClick={() => { setNeu(null); setFehler(''); }}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button style={{ ...btn(true), padding: '14px' }} onClick={() => setNeu({ name: '', preis: '' })}><Plus size={18} /> Neuen Lehrgang anlegen</button>
          )}
          {liste.length === 0 && !neu && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: '24px 0', margin: 0 }}>Noch keine Lehrgänge angelegt.</p>}
          {liste.map((l) => {
            const t = [...(l.tage || [])].sort();
            const kids = new Set(); t.forEach((iso) => Object.entries(l.teilnahme?.[iso] || {}).forEach(([k, v]) => v && kids.add(k)));
            const summe = t.reduce((s, iso) => s + Object.values(l.teilnahme?.[iso] || {}).filter(Boolean).length, 0) * (Number(l.preis) || 0);
            return (
              <button key={l.id} onClick={() => { setAktivId(l.id); setTab('anwesenheit'); setTag(t[0] || null); setSuche(''); }}
                style={{ ...card, all: undefined, textAlign: 'left', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '14px', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '26px' }}>🎒</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: '16px' }}>{l.name}</b>
                  <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)' }}>{t.length ? `${dmy(t[0])}${t.length > 1 ? ' – ' + dmy(t[t.length - 1]) : ''} · ${t.length} Tage` : 'Noch keine Tage'} · {kids.size} Kinder · {fmtEuro(Number(l.preis) || 0)} €/Tag</span>
                </span>
                <b style={{ color: C.accent, whiteSpace: 'nowrap' }}>{fmtEuro(summe)} €</b>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lehrgang ──────────────────────────────
  const q = suche.trim().toLowerCase();
  const teilnehmerIds = new Set(abrechnung.zeilen.map((z) => z.id));
  const gefiltert = personen.filter((p) => !q || p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
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
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{p.gruppe || ''}{teilnehmerIds.has(p.id) ? ` · ${abrechnung.zeilen.find((z) => z.id === p.id)?.tage.length || 0} Tage` : ''}</span>
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
            <h2 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: C.accent }}>Lehrgangstage</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {tage.length === 0 && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Noch keine Tage – unten Datum wählen.</span>}
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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto', gap: '8px', alignItems: 'end' }}>
              <label><span style={lbl}>Datum</span><input type="date" style={input} value={neuerTag} onChange={(e) => setNeuerTag(e.target.value)} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', ...(isMobile ? {} : { display: 'contents' }) }}>
                <button style={{ ...btn(true), opacity: neuerTag ? 1 : 0.5 }} disabled={!neuerTag} onClick={() => tagHinzu(neuerTag)}><Plus size={16} /> Tag</button>
                <button style={{ ...btn(false), opacity: neuerTag ? 1 : 0.5 }} disabled={!neuerTag} onClick={() => wocheHinzu(neuerTag)} title="Montag bis Freitag dieser Woche hinzufügen"><Plus size={16} /> Mo–Fr</button>
              </div>
            </div>
          </section>

          {tag && tage.includes(tag) && (
            <section style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.accent, flex: 1 }}>{new Date(tag + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} · {anzahlTag} da</h2>
                <button onClick={() => tagEntfernen(tag)} aria-label="Tag entfernen" style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', padding: '4px' }}><Trash2 size={17} /></button>
              </div>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input style={{ ...input, paddingLeft: '36px' }} value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Kind suchen…" />
                {suche && <button onClick={() => setSuche('')} aria-label="Suche leeren" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>}
              </div>
              {obenListe.length > 0 && <>
                <div style={{ ...lbl, marginTop: '4px', marginBottom: '8px' }}>Lehrgangsteilnehmer</div>
                <div style={{ display: 'grid', gap: '6px', marginBottom: '14px' }}>{obenListe.map((p) => <KindZeile key={p.id} p={p} />)}</div>
              </>}
              {restListe.length > 0 && <>
                <div style={{ ...lbl, marginBottom: '8px' }}>{obenListe.length ? 'Weitere Kinder' : 'Alle Kinder'}</div>
                <div style={{ display: 'grid', gap: '6px' }}>{restListe.map((p) => <KindZeile key={p.id} p={p} />)}</div>
              </>}
              {gefiltert.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 10px' }}>Kein Kind gefunden.</p>}
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
