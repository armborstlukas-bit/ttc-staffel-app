import React, { useEffect, useState } from 'react';

// Countdown zum Launch der neuen TTC-Webseite
// Mittwoch, 14.10.2026, 15:00 Uhr (MESZ). Wird auf allen Startseiten unter der Begrüßung gezeigt
// und verschwindet 7 Tage nach dem Start von selbst.
export const LAUNCH_AT = new Date('2026-10-14T15:00:00+02:00').getTime();
const AUSBLENDEN_NACH = 7 * 24 * 3600 * 1000;
const WEBSEITE = 'https://ttc-staffel-web.vercel.app';

const CSS = `
@keyframes lc-spin { to { --lc-a: 360deg; } }
@property --lc-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes lc-tick { 0% { transform: translateY(-38%); opacity: 0; filter: blur(3px); } 100% { transform: none; opacity: 1; filter: none; } }
@keyframes lc-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,222,128,.7); } 50% { opacity: .55; box-shadow: 0 0 0 6px rgba(74,222,128,0); } }
@keyframes lc-shine { 0% { transform: translateX(-120%) skewX(-18deg); } 60%,100% { transform: translateX(320%) skewX(-18deg); } }
@keyframes lc-float { 0%,100% { transform: translateY(0); opacity: .0; } 15% { opacity: .9; } 100% { transform: translateY(-90px); opacity: 0; } }
.lc-card { position: relative; border-radius: 20px; padding: 1.5px; margin-bottom: 24px;
  background: conic-gradient(from var(--lc-a), rgba(32,160,80,.15), #4ade80, rgba(32,160,80,.15) 30%, rgba(250,204,21,.7) 50%, rgba(32,160,80,.15) 70%, #4ade80, rgba(32,160,80,.15));
  animation: lc-spin 6s linear infinite; box-shadow: 0 18px 50px -18px rgba(34,197,94,.55); }
.lc-in { position: relative; overflow: hidden; border-radius: 19px; background: radial-gradient(120% 90% at 100% 0%, #0f5132 0%, #06301a 45%, #03170c 100%); padding: 16px 16px 15px; }
.lc-in::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 38%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent); animation: lc-shine 5.5s ease-in-out infinite; pointer-events: none; }
.lc-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: lc-pulse 1.6s ease-in-out infinite; }
.lc-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin: 13px 0 11px; }
.lc-box { background: rgba(0,0,0,.28); border: 1px solid rgba(134,239,172,.16); border-radius: 12px; padding: 9px 2px 7px; text-align: center; }
.lc-num { display: block; font-size: 30px; font-weight: 900; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -1px; animation: lc-tick .45s cubic-bezier(.2,.8,.2,1); }
.lc-lbl { display: block; margin-top: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(134,239,172,.7); }
.lc-spark { position: absolute; bottom: 8px; width: 3px; height: 3px; border-radius: 50%; background: #facc15; animation: lc-float 4s linear infinite; pointer-events: none; }
@media (min-width: 640px) { .lc-in { padding: 20px 22px 18px; } .lc-num { font-size: 40px; } .lc-grid { gap: 10px; } }
@media (prefers-reduced-motion: reduce) { .lc-card, .lc-in::after, .lc-num, .lc-dot, .lc-spark { animation: none !important; } }
`;

const teile = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [[Math.floor(s / 86400), 'Tage'], [Math.floor(s / 3600) % 24, 'Std'], [Math.floor(s / 60) % 60, 'Min'], [s % 60, 'Sek']];
};

export default function LaunchCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const rest = LAUNCH_AT - now;
  if (rest < -AUSBLENDEN_NACH) return null;
  const live = rest <= 0;

  return (
    <div className="lc-card" role="region" aria-label="Countdown zur neuen Webseite">
      <style>{CSS}</style>
      <div className="lc-in">
        {[8, 23, 41, 58, 74, 90].map((l, i) => <span key={l} className="lc-spark" style={{ left: `${l}%`, animationDelay: `${i * 0.7}s` }} />)}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="lc-dot" />
          <span style={{ fontSize: '10.5px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: '#86efac' }}>{live ? 'Jetzt online' : 'Die neue TTC-Webseite'}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(250,204,21,.9)', whiteSpace: 'nowrap' }}>Mi · 14.10. · 15:00</span>
        </div>

        {live ? (<>
          <h2 style={{ margin: '12px 0 6px', fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.6px', lineHeight: 1.1 }}>🎉 Es ist so weit!</h2>
          <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,.75)' }}>Aus Alt wird Neu: Die neue TTC-Webseite ist online. Schau vorbei!</p>
          <a href={WEBSEITE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', background: 'linear-gradient(135deg,#22c55e,#15803d)', color: 'white', borderRadius: '11px', fontWeight: 800, fontSize: '14px', textDecoration: 'none', boxShadow: '0 8px 22px -8px rgba(34,197,94,.8)' }}>Zur neuen Webseite →</a>
        </>) : (<>
          <h2 style={{ margin: '10px 0 0', fontSize: '21px', fontWeight: 900, color: 'white', letterSpacing: '-0.6px', lineHeight: 1.15 }}>
            Aus Alt wird <span style={{ background: 'linear-gradient(90deg,#4ade80,#facc15)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Neu.</span>
          </h2>
          <div className="lc-grid">
            {teile(rest).map(([v, l]) => (
              <div key={l} className="lc-box"><span key={v} className="lc-num">{String(v).padStart(2, '0')}</span><span className="lc-lbl">{l}</span></div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(255,255,255,.66)' }}>
            Wir erneuern unsere Webseite aus den 2010er-Jahren: Am <b style={{ color: 'white' }}>Mittwoch, 14. Oktober um 15 Uhr</b> geht die neue TTC-Webseite online. Seid gespannt!
          </p>
        </>)}
      </div>
    </div>
  );
}
