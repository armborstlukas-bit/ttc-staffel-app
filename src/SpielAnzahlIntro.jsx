import React, { useEffect, useMemo, useState } from 'react';
import daten from './data/spielAnzahl.json';

// Einmalige, "epische" Ankündigung des Reiters "Anzahl der Spiele":
// 1) Gesamtzahl aller offiziellen Vereinsspiele zählt hoch, 2) Podium der Top 3 fährt hoch,
// 3) Konfetti + Buttons.
const STYLE = `
@keyframes saZoom { 0% { transform: scale(.3); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
@keyframes saRise { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes saGrow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes saRays { to { transform: rotate(360deg) } }
@keyframes saShine { 0%,100% { text-shadow: 0 0 18px rgba(74,222,128,.5) } 50% { text-shadow: 0 0 42px rgba(190,242,100,.95) } }
@keyframes saFall { 0% { transform: translateY(-12vh) rotate(0) } 100% { transform: translateY(112vh) rotate(720deg) } }
.sa-confetti { position: absolute; top: 0; animation: saFall linear infinite; pointer-events: none; }
`;

export default function SpielAnzahlIntro({ onOpen, onLater }) {
  const { total, top3 } = useMemo(() => {
    const rows = daten.spieler.map(([name, m, t]) => ({ name, n: m + t })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
    return { total: rows.reduce((s, r) => s + r.n, 0), top3: rows.slice(0, 3) };
  }, []);

  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState(0); // 0 zählen, 1 Podium, 2 Buttons
  useEffect(() => {
    const dauer = 2600; const start = performance.now(); let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dauer);
      setCount(Math.round(total * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { setPhase(1); setTimeout(() => setPhase(2), 1400); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const confetti = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 2, dur: 2.8 + Math.random() * 2.2, size: 6 + Math.random() * 7,
    color: ['#4ade80', '#bef264', '#fde68a', '#ffffff', '#16a34a', '#fbbf24'][i % 6], round: i % 3 === 0,
  })), []);

  // Podium-Reihenfolge: 2. links, 1. Mitte, 3. rechts
  const podium = [{ r: top3[1], platz: 2, h: 70, c: '#e2e8f0' }, { r: top3[0], platz: 1, h: 100, c: '#fde68a' }, { r: top3[2], platz: 3, h: 50, c: '#fdba74' }];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", color: 'white',
      background: 'radial-gradient(circle at 50% 35%, #14532d 0%, #052e16 45%, #010a04 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{STYLE}</style>
      {/* rotierende Lichtstrahlen */}
      <div aria-hidden style={{ position: 'absolute', width: '160vmax', height: '160vmax', left: '50%', top: '38%', marginLeft: '-80vmax', marginTop: '-80vmax', opacity: 0.18,
        background: 'repeating-conic-gradient(from 0deg, #4ade80 0deg 6deg, transparent 6deg 18deg)', animation: 'saRays 40s linear infinite', borderRadius: '50%' }} />
      {phase >= 1 && confetti.map((c, i) => (
        <span key={i} className="sa-confetti" style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.5, background: c.color, borderRadius: c.round ? '50%' : '2px', animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
      ))}

      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#bef264', animation: 'saRise .6s ease both' }}>🆕 Neu in der App</p>
        <h2 style={{ margin: '0 0 18px', fontSize: '26px', fontWeight: 900, lineHeight: 1.15, animation: 'saRise .6s .15s ease both' }}>Anzahl der Spiele</h2>

        <div style={{ animation: 'saZoom .9s .3s cubic-bezier(.2,.9,.3,1.2) both' }}>
          <div style={{ fontSize: 'clamp(46px, 15vw, 68px)', fontWeight: 900, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', color: '#4ade80', animation: phase >= 1 ? 'saShine 2s ease-in-out infinite' : 'none', lineHeight: 1 }}>
            {count.toLocaleString('de-DE')}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>Einzel hat der TTC Staffel seit 2005 offiziell gespielt</p>
        </div>

        {/* Podium */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', margin: '26px 0 22px', minHeight: '150px' }}>
          {phase >= 1 && podium.map(({ r, platz, h, c }, i) => r && (
            <div key={platz} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `saRise .6s ${i * 0.18}s ease both` }}>
              <div style={{ fontSize: platz === 1 ? '30px' : '24px' }}>{['🥇', '🥈', '🥉'][platz - 1]}</div>
              <div style={{ fontSize: '12px', fontWeight: 800, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0' }}>{r.name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{r.n.toLocaleString('de-DE')} Spiele</div>
              <div style={{ width: '100%', height: `${h}px`, background: `linear-gradient(180deg, ${c}, ${c}55)`, borderRadius: '8px 8px 0 0', transformOrigin: 'bottom',
                animation: `saGrow .7s ${0.1 + i * 0.18}s cubic-bezier(.2,.9,.3,1.1) both`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '6px',
                fontWeight: 900, fontSize: '20px', color: '#052e16' }}>{platz}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'none' : 'translateY(14px)', transition: 'all .5s ease', pointerEvents: phase >= 2 ? 'auto' : 'none' }}>
          <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Wer hat die meisten Spiele für Staffel gemacht? Mannschaft, Turnier und gesamt – auch die Legenden von früher.</p>
          <button onClick={onOpen} style={{ padding: '14px 24px', background: 'linear-gradient(135deg,#4ade80,#16a34a)', color: '#052e16', border: 'none', borderRadius: '99px', cursor: 'pointer', fontWeight: 900, fontSize: '15px', boxShadow: '0 10px 30px rgba(22,163,74,0.55)' }}>
            🏓 Jetzt ansehen
          </button>
          <button onClick={onLater} style={{ padding: '10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Später</button>
        </div>
      </div>
    </div>
  );
}
