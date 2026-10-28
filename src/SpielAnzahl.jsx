import React, { useMemo, useState } from 'react';
import { Home, Search } from 'lucide-react';
import daten from './data/spielAnzahl.json';

// Anzahl der Spiele je Spieler:in für den TTC Staffel seit Einführung des TTR-Werts.
// Stand aus der TTR-Historie (mytischtennis.de) — wird bei Bedarf neu ausgelesen.
const ARTEN = [
  { key: 'gesamt', label: 'Gesamt' },
  { key: 'mannschaft', label: 'Mannschaft' },
  { key: 'turnier', label: 'Turnier' },
];
const jahr = (iso) => (iso || '').slice(0, 4);
const fmt = (n) => n.toLocaleString('de-DE');

export default function SpielAnzahl({ isMobile, onHome }) {
  const [art, setArt] = useState('gesamt');
  const [suche, setSuche] = useState('');
  const [ehemalige, setEhemalige] = useState(true);

  const alle = useMemo(() => daten.spieler.map(([name, mannschaft, turnier, seit, bis, ehemalig]) =>
    ({ name, mannschaft, turnier, gesamt: mannschaft + turnier, seit, bis, ehemalig: !!ehemalig })), []);

  const liste = useMemo(() => {
    const sortiert = alle.filter((s) => ehemalige || !s.ehemalig).filter((s) => s[art] > 0)
      .sort((a, b) => b[art] - a[art] || b.gesamt - a.gesamt);
    // Platz bei Gleichstand teilen
    let platz = 0, vorher = null;
    const mitPlatz = sortiert.map((s, i) => { if (s[art] !== vorher) { platz = i + 1; vorher = s[art]; } return { ...s, platz }; });
    const q = suche.trim().toLowerCase();
    return q ? mitPlatz.filter((s) => s.name.toLowerCase().includes(q)) : mitPlatz;
  }, [alle, art, suche, ehemalige]);

  const summe = alle.filter((s) => ehemalige || !s.ehemalig).reduce((n, s) => n + s[art], 0);
  const stand = new Date(daten.stand + 'T12:00:00').toLocaleDateString('de-DE');
  const medaille = ['🥇', '🥈', '🥉'];

  return (
    <div className="ttc-view-enter" style={{ minHeight: '100vh', background: 'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)', color: 'white', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif" }}>
      <div className="ttc-sticky-hdr" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onHome} aria-label="Startseite" style={{ padding: '10px 12px', background: 'rgba(134,239,172,0.12)', color: '#86efac', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Home size={16} /></button>
        <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏓 Anzahl der Spiele</h1>
      </div>

      <div style={{ padding: isMobile ? '14px 16px 48px' : '20px', maxWidth: '760px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          Alle Einzel- und Doppelspiele mit TTR-Wertung für den TTC Staffel seit Einführung des TTR-Werts (2005). Turniere zählen nur in der Zeit, in der jemand für Staffel gespielt hat. Stand: {stand}.
        </p>

        <div style={{ display: 'flex', gap: '6px' }}>
          {ARTEN.map((a) => (
            <button key={a.key} onClick={() => setArt(a.key)}
              style={{ flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '13px',
                border: `1.5px solid ${art === a.key ? '#4ade80' : 'rgba(255,255,255,0.12)'}`, background: art === a.key ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)', color: art === a.key ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
              {a.label}
            </button>
          ))}
        </div>

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

        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{fmt(summe)} Spiele insgesamt</p>

        <div style={{ display: 'grid', gap: '6px' }}>
          {liste.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px',
              background: s.platz <= 3 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.platz <= 3 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
              <span style={{ width: '30px', flexShrink: 0, textAlign: 'center', fontWeight: 800, fontSize: s.platz <= 3 ? '18px' : '13px', color: 'rgba(255,255,255,0.5)' }}>{medaille[s.platz - 1] || `${s.platz}.`}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.ehemalig ? `ehemalig · ${jahr(s.seit)}–${jahr(s.bis)}` : `seit ${jahr(s.seit)}`}
                  {art === 'gesamt' && ` · ${fmt(s.mannschaft)} Mannsch. · ${fmt(s.turnier)} Turnier`}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontWeight: 900, fontSize: '18px', color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{fmt(s[art])}</span>
            </div>
          ))}
          {liste.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '20px' }}>Niemand gefunden.</p>}
        </div>
      </div>
    </div>
  );
}
