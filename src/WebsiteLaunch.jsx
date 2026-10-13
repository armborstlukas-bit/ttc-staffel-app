import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useBetaFonts } from './betaTheme.jsx';
import { LAUNCH_AT } from './LaunchCountdown.jsx';

// Einmalige Ankündigung der neuen Vereinswebseite beim nächsten App-Öffnen (pro Konto, siehe App.jsx).
// Im Stil der Webseite: Mannschaftsfoto, „Grün. Weiß. Staffel.“ fährt zeilenweise herein, Wappen-Streifen, Konfetti.
export const WEBSITE_URL = 'https://ttc-staffel.de';
export const WEBSITE_ANNOUNCE_DAYS = 14;
export const websiteAnnounceActive = () => Date.now() >= LAUNCH_AT && Date.now() < LAUNCH_AT + WEBSITE_ANNOUNCE_DAYS * 86400e3;

const CSS = `
@keyframes wl-up { from { transform: translateY(105%); } to { transform: none; } }
@keyframes wl-fade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes wl-zoom { from { transform: scale(1.12); } to { transform: scale(1); } }
@keyframes wl-stripes { from { background-position: 0 0; } to { background-position: 88px 0; } }
@keyframes wl-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
.wl-line { display: block; overflow: hidden; padding-top: .12em; margin-top: -.12em; }
.wl-line > span { display: block; transform: translateY(105%); animation: wl-up .9s cubic-bezier(.2,.7,.1,1) forwards; }
.wl-in { opacity: 0; animation: wl-fade .7s cubic-bezier(.2,.7,.1,1) forwards; }
.wl-btn { transition: transform .15s, background .2s, color .2s; }
.wl-btn:hover { background: #b6f36a !important; color: #0b1a11 !important; }
.wl-btn:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .wl-line > span, .wl-in, .wl-photo, .wl-stripes { animation: none !important; transform: none !important; opacity: 1 !important; } }
`;

export default function WebsiteLaunch({ onOpen, onLater }) {
  useBetaFonts(true);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  const confetti = useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    left: Math.random() * 100, delay: 0.6 + Math.random() * 1.6, duration: 2.6 + Math.random() * 1.8,
    color: ['#20a050', '#ffffff', '#b6f36a', '#1d7f3f', '#f3f1ea'][i % 5], rotate: Math.random() * 360, size: 6 + Math.random() * 6,
  })), []);
  const display = { fontFamily: "Archivo, 'Arial Black', system-ui, sans-serif", fontStretch: '125%', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.035em' };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Die neue TTC-Webseite ist online"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,14,9,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden', fontFamily: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{CSS}</style>
      {confetti.map((c, i) => (
        <span key={i} className="ttc-confetti-piece" style={{ left: `${c.left}%`, background: c.color, borderRadius: i % 3 === 0 ? '50%' : '2px', width: `${c.size}px`, height: `${c.size * 1.5}px`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s`, transform: `rotate(${c.rotate}deg)` }} />
      ))}

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', maxHeight: '100%', overflowY: 'auto', background: '#f3f1ea', color: '#0b1a11', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'wl-pop .6s cubic-bezier(.2,.7,.1,1) both' }}>
        {/* „Webseite“ im Kleinen: Foto + Schriftzug wie auf der Startseite */}
        <div style={{ position: 'relative', height: 'min(300px, 42vh)', overflow: 'hidden', background: '#0b1a11' }}>
          <img className="wl-photo" src={`${WEBSITE_URL}/images/hero-team.jpg`} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%', filter: 'saturate(.8) brightness(.8)', animation: 'wl-zoom 2.4s cubic-bezier(.2,.7,.1,1) both' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,26,17,.55) 0%, rgba(11,26,17,.1) 35%, rgba(11,26,17,.92) 100%)' }} />
          <div style={{ position: 'absolute', top: '14px', left: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '9px', color: '#f3f1ea' }}>
            <img src="/logo.png" alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ ...display, fontSize: '14px', letterSpacing: '-0.01em', lineHeight: 1 }}>TTC Staffel</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#b6f36a' }}>● Jetzt online</span>
          </div>
          <h1 aria-label="Grün. Weiß. Staffel." style={{ ...display, position: 'absolute', left: '16px', right: '16px', bottom: '14px', margin: 0, color: '#f3f1ea', fontSize: 'min(12.6vw, 52px)', lineHeight: 0.84 }}>
            <span className="wl-line"><span style={{ animationDelay: '.35s' }}>Grün.</span></span>
            <span className="wl-line"><span style={{ animationDelay: '.5s' }}>Weiß.</span></span>
            <span className="wl-line"><span style={{ animationDelay: '.65s', color: '#20a050' }}>Staffel.</span></span>
          </h1>
        </div>
        <div className="wl-stripes" style={{ height: '12px', background: 'repeating-linear-gradient(90deg, #5c9e50 0 22px, #f3f1ea 22px 44px)', animation: 'wl-stripes 1.6s linear infinite' }} />

        <div style={{ padding: '22px 20px 20px' }}>
          <div className="wl-in" style={{ animationDelay: '.9s', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1d7f3f' }}>Die neue TTC-Webseite</div>
          <h2 className="wl-in" style={{ ...display, animationDelay: '1s', margin: '8px 0 10px', fontSize: 'min(9.5vw, 38px)', lineHeight: 0.9 }}>Aus Alt<br />wird Neu.</h2>
          <p className="wl-in" style={{ animationDelay: '1.1s', margin: '0 0 18px', fontSize: '15px', lineHeight: 1.5, color: '#3b463f' }}>
            Unsere Webseite ist komplett neu – modern, fürs Handy gemacht und immer aktuell: Spielplan, Ergebnisse, Berichte, Training und vieles mehr. Schau gleich vorbei!
          </p>
          <div className="wl-in" style={{ animationDelay: '1.2s', display: 'grid', gap: '8px' }}>
            <button className="wl-btn" onClick={onOpen}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', minHeight: '54px', padding: '0 20px', background: '#0b1a11', color: '#f3f1ea', border: 'none', borderRadius: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '16px' }}>
              Zur neuen Webseite <span aria-hidden style={{ fontSize: '20px' }}>↗</span>
            </button>
            <button onClick={onLater}
              style={{ minHeight: '44px', background: 'transparent', color: '#5f6b63', border: '1.5px solid rgba(11,26,17,0.14)', borderRadius: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '14px' }}>
              Später ansehen
            </button>
          </div>
          <p className="wl-in" style={{ animationDelay: '1.3s', margin: '14px 0 0', textAlign: 'center', fontSize: '12px', fontWeight: 600, letterSpacing: '.04em', color: '#1d7f3f' }}>ttc-staffel.de</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
