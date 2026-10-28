import React, { useMemo, useState } from 'react';
import { Home, Search } from 'lucide-react';
import daten from './data/spielAnzahl.json';

// Anzahl der Spiele je Spieler:in für den TTC Staffel.
// Offiziell = TTR-Historie auf mytischtennis.de (ab 2005). Für die Saisons davor (und für Leute,
// die dort nicht auffindbar sind) gibt es eine Hochrechnung: 24 Mannschaftsspiele pro Saison.
const ARTEN = [
  { key: 'gesamt', label: 'Gesamt' },
  { key: 'mannschaft', label: 'Mannschaft' },
  { key: 'turnier', label: 'Turnier' },
];
const ZEITRAUM = [
  { key: 'offiziell', label: 'Seit myTischtennis', info: 'Offizielle Zählung seit 2005' },
  { key: 'alle', label: 'Seit Beginn', info: 'Seit Einführung der Mannschaftsspiele, ältere Saisons hochgerechnet' },
];
const AKTIV_AB = '2025-08-01'; // wer seitdem noch für Staffel gespielt hat, gilt als aktiv
const jahr = (iso) => (iso || '').slice(0, 4);
const fmt = (n) => n.toLocaleString('de-DE');

export default function SpielAnzahl({ isMobile, onHome }) {
  const [art, setArt] = useState('gesamt');
  const [zeitraum, setZeitraum] = useState('offiziell');
  const [suche, setSuche] = useState('');
  const [ehemalige, setEhemalige] = useState(true);
  const mitHoch = zeitraum === 'alle';

  const alle = useMemo(() => daten.spieler.map(([name, mannschaft, turnier, hoch, seit, bis, vonJahr, nurHoch]) => {
    const m = mannschaft + (mitHoch ? hoch : 0);
    return {
      name, turnier, hoch: mitHoch ? hoch : 0, nurHoch: !!nurHoch, seit, bis, vonJahr,
      mannschaft: m, gesamt: m + turnier, ehemalig: (bis || '') < AKTIV_AB,
    };
  }), [mitHoch]);

  const sichtbar = alle.filter((s) => ehemalige || !s.ehemalig);
  const liste = useMemo(() => {
    const sortiert = sichtbar.filter((s) => s[art] > 0).sort((a, b) => b[art] - a[art] || b.gesamt - a.gesamt);
    let platz = 0, vorher = null;
    const mitPlatz = sortiert.map((s, i) => { if (s[art] !== vorher) { platz = i + 1; vorher = s[art]; } return { ...s, platz }; });
    const q = suche.trim().toLowerCase();
    return q ? mitPlatz.filter((s) => s.name.toLowerCase().includes(q)) : mitPlatz;
  }, [sichtbar, art, suche]);

  const summe = sichtbar.reduce((n, s) => n + s[art], 0);
  const stand = new Date(daten.stand + 'T12:00:00').toLocaleDateString('de-DE');
  const medaille = ['🥇', '🥈', '🥉'];
  const zr = ZEITRAUM.find((z) => z.key === zeitraum);

  const tab = (aktiv) => ({ flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '13px',
    border: `1.5px solid ${aktiv ? '#4ade80' : 'rgba(255,255,255,0.12)'}`, background: aktiv ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)', color: aktiv ? '#4ade80' : 'rgba(255,255,255,0.6)' });

  const unterzeile = (s) => {
    const zeit = s.nurHoch || mitHoch
      ? `${s.vonJahr}–${s.ehemalig ? jahr(s.bis) : 'heute'}`
      : (s.ehemalig ? `${jahr(s.seit)}–${jahr(s.bis)}` : `seit ${jahr(s.seit)}`);
    const teile = [s.ehemalig ? `ehemalig · ${zeit}` : zeit];
    if (art === 'gesamt' && !s.nurHoch) teile.push(`${fmt(s.mannschaft)} Mannsch. · ${fmt(s.turnier)} Turnier`);
    if (s.hoch > 0) teile.push(s.nurHoch ? 'hochgerechnet' : `davon ~${fmt(s.hoch)} hochgerechnet`);
    return teile.join(' · ');
  };

  return (
    <div className="ttc-view-enter" style={{ minHeight: '100vh', background: 'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)', color: 'white', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" }}>
      <div className="ttc-sticky-hdr" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onHome} aria-label="Startseite" style={{ padding: '10px 12px', background: 'rgba(134,239,172,0.12)', color: '#86efac', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Home size={16} /></button>
        <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏓 Anzahl der Spiele</h1>
      </div>

      <div style={{ padding: isMobile ? '14px 16px 48px' : '20px', maxWidth: '760px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {ZEITRAUM.map((z) => <button key={z.key} onClick={() => setZeitraum(z.key)} style={tab(zeitraum === z.key)}>{z.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {ARTEN.map((a) => <button key={a.key} onClick={() => setArt(a.key)} style={tab(art === a.key)}>{a.label}</button>)}
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {zr.info}. Gezählt werden Einzelspiele für den TTC Staffel (Doppel gehen nicht in den TTR-Wert ein und sind deshalb nicht enthalten); Turniere nur in der Zeit, in der jemand für Staffel gespielt hat.
          {mitHoch && ' Hochrechnung: 24 Mannschaftsspiele pro Saison.'} Stand: {stand}.
        </p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name suchen…" aria-label="Name suchen"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={ehemalige} onChange={(e) => setEhemalige(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            Ehemalige zeigen
          </label>
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{mitHoch ? 'ca. ' : ''}{fmt(summe)} Spiele insgesamt · {liste.length} Personen</p>

        <div style={{ display: 'grid', gap: '6px' }}>
          {liste.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px',
              background: s.platz <= 3 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.platz <= 3 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
              <span style={{ width: '30px', flexShrink: 0, textAlign: 'center', fontWeight: 800, fontSize: s.platz <= 3 ? '18px' : '13px', color: 'rgba(255,255,255,0.5)' }}>{medaille[s.platz - 1] || `${s.platz}.`}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unterzeile(s)}</div>
              </div>
              <span style={{ flexShrink: 0, fontWeight: 900, fontSize: '18px', color: s.nurHoch ? 'rgba(74,222,128,0.6)' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{(s.hoch > 0 && art !== 'turnier') ? '~' : ''}{fmt(s[art])}</span>
            </div>
          ))}
          {liste.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '20px' }}>Niemand gefunden.</p>}
        </div>
      </div>
    </div>
  );
}
