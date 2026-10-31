import React, { useEffect, useMemo, useState } from 'react';
import { Home, Search } from 'lucide-react';
import daten from './data/spielAnzahl.json';

// Anzahl der Spiele je Spieler:in für den TTC Staffel.
// Offiziell = TTR-Historie auf mytischtennis.de (ab 2005, nur Einzel). Für die Saisons davor (und für
// Leute, die dort nicht auffindbar sind) gibt es eine Hochrechnung: 24 Einzel pro Saison.
const ARTEN = [
  { key: 'gesamt', label: 'Gesamt' },
  { key: 'mannschaft', label: 'Mannschaft' },
  { key: 'turnier', label: 'Turnier' },
];
const ZEITRAUM = [
  { key: 'offiziell', label: 'Seit myTischtennis', info: 'Offizielle Zählung seit 2005' },
  { key: 'alle', label: 'Seit Beginn', info: 'Seit Einführung der Mannschaftsspiele – ältere Saisons hochgerechnet (24 Einzel pro Saison)' },
];
const AKTIV_AB = '2025-08-01'; // wer seitdem noch für Staffel gespielt hat, gilt als aktiv
const jahr = (iso) => (iso || '').slice(0, 4);
const fmt = (n) => n.toLocaleString('de-DE');

const CSS = `
@keyframes saRays { to { transform: rotate(360deg) } }
@keyframes saRise { from { transform: translateY(18px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes saGrow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes saBar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes saShine { 0%,100% { text-shadow: 0 0 18px rgba(74,222,128,.45) } 50% { text-shadow: 0 0 38px rgba(190,242,100,.9) } }
@keyframes saSweep { from { transform: translateX(-120%) } to { transform: translateX(320%) } }
.sa-row { animation: saRise .45s cubic-bezier(.2,.8,.3,1) both; }
.sa-bar { transform-origin: left; animation: saBar .9s cubic-bezier(.2,.8,.3,1) both; }
.sa-chip:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .sa-row, .sa-bar { animation: none !important } }
`;

// Zählt von 0 auf den Zielwert hoch (bei jedem Wechsel von Filter/Art neu).
function useHochzaehlen(ziel, dauer = 1400) {
  const [wert, setWert] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now();
    const tick = (now) => { const p = Math.min(1, (now - start) / dauer); setWert(Math.round(ziel * (1 - Math.pow(1 - p, 4)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ziel, dauer]);
  return wert;
}

export default function SpielAnzahl({ isMobile, onHome }) {
  const [art, setArt] = useState('gesamt');
  const [zeitraum, setZeitraum] = useState('offiziell');
  const [suche, setSuche] = useState('');
  const [ehemalige, setEhemalige] = useState(true);
  const mitHoch = zeitraum === 'alle';

  const alle = useMemo(() => daten.spieler.map(([name, mannschaft, turnier, hoch, seit, bis, vonJahr, nurHoch]) => {
    const m = mannschaft + (mitHoch ? hoch : 0);
    return { name, turnier, hoch: mitHoch ? hoch : 0, nurHoch: !!nurHoch, seit, bis, vonJahr, mannschaft: m, gesamt: m + turnier, ehemalig: (bis || '') < AKTIV_AB };
  }), [mitHoch]);

  const sortiert = useMemo(() => {
    const s = alle.filter((x) => (ehemalige || !x.ehemalig) && x[art] > 0).sort((a, b) => b[art] - a[art] || b.gesamt - a.gesamt);
    let platz = 0, vorher = null;
    return s.map((x, i) => { if (x[art] !== vorher) { platz = i + 1; vorher = x[art]; } return { ...x, platz }; });
  }, [alle, art, ehemalige]);

  const q = suche.trim().toLowerCase();
  const liste = q ? sortiert.filter((s) => s.name.toLowerCase().includes(q)) : sortiert;
  const max = sortiert[0]?.[art] || 1;
  const summe = sortiert.reduce((n, s) => n + s[art], 0);
  const gezaehlt = useHochzaehlen(summe);
  const stand = new Date(daten.stand + 'T12:00:00').toLocaleDateString('de-DE');
  const zr = ZEITRAUM.find((z) => z.key === zeitraum);
  const top3 = q ? [] : sortiert.slice(0, 3);
  const rest = q ? liste : liste.slice(3);
  const animKey = `${art}-${zeitraum}-${ehemalige}`;

  const chip = (aktiv) => ({
    flex: 1, minWidth: 0, padding: isMobile ? '10px 4px' : '11px 8px', borderRadius: '99px', cursor: 'pointer', fontWeight: 800, fontSize: isMobile ? '12.5px' : '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all .2s',
    border: `1.5px solid ${aktiv ? '#4ade80' : 'rgba(255,255,255,0.10)'}`,
    background: aktiv ? 'linear-gradient(135deg,#4ade80,#16a34a)' : 'rgba(255,255,255,0.04)',
    color: aktiv ? '#052e16' : 'rgba(255,255,255,0.65)', boxShadow: aktiv ? '0 6px 20px rgba(22,163,74,0.35)' : 'none',
  });

  const unterzeile = (s) => {
    const zeit = s.nurHoch || mitHoch ? `${s.vonJahr}–${s.ehemalig ? jahr(s.bis) : 'heute'}` : (s.ehemalig ? `${jahr(s.seit)}–${jahr(s.bis)}` : `seit ${jahr(s.seit)}`);
    const teile = [s.ehemalig ? `ehemalig · ${zeit}` : zeit];
    if (art === 'gesamt' && !s.nurHoch) teile.push(`${fmt(s.mannschaft)} M · ${fmt(s.turnier)} T`);
    if (s.hoch > 0) teile.push(s.nurHoch ? 'hochgerechnet' : `~${fmt(s.hoch)} hochger.`);
    return teile.join(' · ');
  };
  const wert = (s) => `${s.hoch > 0 && art !== 'turnier' ? '~' : ''}${fmt(s[art])}`;

  // Podium: 2. links, 1. Mitte, 3. rechts
  const podium = [{ s: top3[1], platz: 2, h: 74, c: '#e2e8f0', m: '🥈' }, { s: top3[0], platz: 1, h: 108, c: '#fde68a', m: '🥇' }, { s: top3[2], platz: 3, h: 54, c: '#fdba74', m: '🥉' }];

  return (
    <div className="ttc-view-enter" style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', background: 'radial-gradient(ellipse at 50% -10%, #166534 0%, #052e16 38%, #021a0a 70%)', color: 'white', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" }}>
      <style>{CSS}</style>
      {/* Lichtstrahlen hinter dem Kopfbereich */}
      <div aria-hidden style={{ position: 'absolute', top: '-60vmax', left: '50%', width: '120vmax', height: '120vmax', marginLeft: '-60vmax', opacity: 0.12, pointerEvents: 'none',
        background: 'repeating-conic-gradient(from 0deg, #4ade80 0deg 5deg, transparent 5deg 15deg)', borderRadius: '50%', animation: 'saRays 60s linear infinite',
        maskImage: 'radial-gradient(circle, black 0%, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 60%)' }} />

      <div className="ttc-sticky-hdr" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onHome} aria-label="Startseite" style={{ padding: '10px 12px', background: 'rgba(134,239,172,0.12)', color: '#86efac', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex' }}><Home size={16} /></button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>🏓 Anzahl der Spiele</h1>
      </div>

      <div style={{ position: 'relative', padding: isMobile ? '6px 14px 56px' : '12px 20px 64px', maxWidth: '760px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '14px' }}>
        {/* Hero: hochzählende Gesamtzahl */}
        <div style={{ textAlign: 'center', padding: isMobile ? '10px 0 0' : '18px 0 4px' }}>
          <div className="mono" style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#bef264' }}>TTC Staffel · {ARTEN.find((a) => a.key === art).label}</div>
          <div style={{ fontSize: isMobile ? 'clamp(44px, 15vw, 60px)' : '72px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', color: '#4ade80', fontVariantNumeric: 'tabular-nums', animation: 'saShine 2.4s ease-in-out infinite', margin: '6px 0 2px' }}>
            {mitHoch ? '~' : ''}{fmt(gezaehlt)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Einzel · {fmt(sortiert.length)} Personen</div>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '5px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {ZEITRAUM.map((z) => <button key={z.key} className="sa-chip" onClick={() => setZeitraum(z.key)} style={chip(zeitraum === z.key)}>{z.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '5px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {ARTEN.map((a) => <button key={a.key} className="sa-chip" onClick={() => setArt(a.key)} style={chip(art === a.key)}>{a.label}</button>)}
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div key={'p' + animKey} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: isMobile ? '6px' : '12px', padding: '8px 0 0' }}>
            {podium.map(({ s, platz, h, c, m }, i) => s && (
              <div key={platz} style={{ flex: 1, minWidth: 0, maxWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: `saRise .6s ${0.1 + i * 0.12}s ease both` }}>
                <div style={{ fontSize: platz === 1 ? '34px' : '26px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.4))' }}>{m}</div>
                <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 800, width: '100%', lineHeight: 1.2, overflowWrap: 'anywhere', hyphens: 'auto', marginTop: '2px' }}>{s.name}</div>
                <div style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 900, color: c, fontVariantNumeric: 'tabular-nums', margin: '2px 0 6px' }}>{wert(s)}</div>
                <div style={{ width: '100%', height: `${h}px`, borderRadius: '10px 10px 0 0', transformOrigin: 'bottom', position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(180deg, ${c} 0%, ${c}66 100%)`, boxShadow: `0 0 26px ${c}44`, animation: `saGrow .7s ${0.15 + i * 0.12}s cubic-bezier(.2,.9,.3,1.1) both`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '6px', fontWeight: 900, fontSize: '22px', color: '#052e16' }}>
                  {platz}
                  <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)', animation: `saSweep 2.8s ${1 + i * 0.3}s ease-in-out infinite` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)' }} />
            <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name suchen…" aria-label="Name suchen"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 36px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '14px', outline: 'none' }} />
          </label>
          <button onClick={() => setEhemalige(!ehemalige)} aria-pressed={ehemalige}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <span style={{ width: '34px', height: '20px', borderRadius: '99px', background: ehemalige ? '#22c55e' : 'rgba(255,255,255,0.18)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: '3px', left: ehemalige ? '17px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
            </span>
            Ehemalige
          </button>
        </div>

        {/* Rangliste */}
        <div key={'l' + animKey} style={{ display: 'grid', gap: '6px' }}>
          {rest.map((s, i) => (
            <div key={s.name} className="sa-row" style={{ animationDelay: `${Math.min(i, 14) * 0.035}s`, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px',
              background: s.platz <= 3 ? 'rgba(251,191,36,0.08)' : s.platz <= 10 ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${s.platz <= 3 ? 'rgba(251,191,36,0.3)' : s.platz <= 10 ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.07)'}` }}>
              {/* Balken relativ zum Spitzenreiter */}
              <div aria-hidden className="sa-bar" style={{ animationDelay: `${0.2 + Math.min(i, 14) * 0.035}s`, position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(s[art] / max) * 100}%`,
                background: s.nurHoch ? 'linear-gradient(90deg, rgba(74,222,128,0.05), rgba(74,222,128,0.10))' : 'linear-gradient(90deg, rgba(74,222,128,0.08), rgba(74,222,128,0.20))' }} />
              <span style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px',
                background: s.platz <= 10 ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)', color: s.platz <= 10 ? '#86efac' : 'rgba(255,255,255,0.55)' }}>{s.platz}</span>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unterzeile(s)}</div>
              </div>
              <span style={{ position: 'relative', flexShrink: 0, fontWeight: 900, fontSize: '17px', color: s.nurHoch ? 'rgba(134,239,172,0.7)' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{wert(s)}</span>
            </div>
          ))}
          {liste.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '13px', padding: '20px' }}>Niemand gefunden.</p>}
        </div>

        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, textAlign: 'center' }}>
          {zr.info}. Gezählt werden Einzel für den TTC Staffel (Doppel gehen nicht in den TTR-Wert ein); Turniere nur in der Zeit, in der jemand für Staffel gespielt hat. Stand: {stand}.
        </p>
      </div>
    </div>
  );
}
