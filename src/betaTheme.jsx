import React, { useEffect } from 'react';
import {
  CalendarDays, Users, Gamepad2, Shirt, Package, BarChart3, Medal, Trophy, CalendarRange, TrendingUp, Target, Radio, Swords,
  Newspaper, PenLine, MessageCircle, CalendarHeart, Car, ClipboardList, Lightbulb, Dices, Recycle, Receipt, FolderOpen, Archive,
  Trash2, Activity, LayoutGrid, ArrowUpRight, Backpack,
} from 'lucide-react';

// Neues App-Design (Beta) – bewusst sehr nah an der Webseite (ttc-staffel-web):
// Papier/Tinte, Archivo (breit, Versalien) + IBM Plex Mono, eckige Kanten, Linien statt Karten, Wappen-Streifen.
export const T = {
  ink: '#0b1a11', ink2: '#1c2a21', paper: '#f3f1ea', paper2: '#e9e6dc', white: '#ffffff',
  green: '#1d7f3f', deep: '#0f4a25', crest: '#5c9e50', signal: '#b6f36a', muted: '#5f6b63', loss: '#c2410c',
  line: 'rgba(11,26,17,0.14)', lineLight: 'rgba(255,255,255,0.16)', mutedLight: 'rgba(255,255,255,0.62)',
};

export function useBetaFonts(active = true) {
  useEffect(() => {
    if (!active || document.getElementById('ttc-beta-fonts')) return;
    const l = document.createElement('link');
    l.id = 'ttc-beta-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }, [active]);
}

const ICONS = {
  'Trainingsplan': CalendarDays, 'Meine Gruppen': Users, 'Übungswettkämpfe': Gamepad2, 'Trikotgrößen': Shirt, 'Materialverwaltung': Package,
  'Rangliste': BarChart3, 'Errungenschaften': Medal, 'TTC Mannschaften': Trophy, 'Spielplan': CalendarRange, 'TTR Werte': TrendingUp,
  'Gegnerlogbuch': Target, 'Live-Statistiken': Radio, 'Trainingsmatches': Swords, 'TTC News': Newspaper, 'Redaktion': PenLine,
  'Nachrichten': MessageCircle, 'Vereinskalender': CalendarHeart, 'Wer fährt wann': Car, 'Pinnwand': ClipboardList,
  'Verbesserungen': Lightbulb, 'Pfandkasse': Recycle, 'Abrechnung': Receipt, 'Mitglieder': FolderOpen, 'Archiv': Archive,
  'Datenlöschen': Trash2, 'App-Statistik': Activity, 'Lehrgangsabrechnung': Backpack,
};
const SHORT = { 'TTC Mannschaften': 'Mannschaften', 'Materialverwaltung': 'Material', 'Live-Statistiken': 'Live-Statistiken', 'Vereinskalender': 'Kalender', 'Verbesserungen': 'Ideen & Wünsche', 'Rompel Bereich': 'Rompel', 'Datenlöschen': 'Daten löschen', 'Lehrgangsabrechnung': 'Lehrgänge' };
export const shortLabel = (l) => (/tippspiel/i.test(l) ? 'Tippspiel' : SHORT[l] || l);

export function LinkIcon({ link, size = 20 }) {
  if (link.icon && typeof link.icon === 'object' && link.icon.type === 'img') {
    return <img src={link.icon.src} alt="" style={{ width: size + 4, height: size + 4, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top' }} />;
  }
  const I = /tippspiel/i.test(link.label) ? Dices : ICONS[link.label] || LayoutGrid;
  return <I size={size} strokeWidth={1.6} />;
}

// Bereiche als Raster mit Haarlinien – wie die Tabellen/Boards der Webseite
export function TileGrid({ cats, onDone, startIndex = 2 }) {
  return cats.filter((c) => c.links.length).map((cat, ci) => (
    <div key={cat.label} className="tw-cat">
      <div className="tw-cat-head"><span className="tw-mono"><b>{String(ci + startIndex).padStart(2, '0')}</b></span><h3>{cat.label}</h3></div>
      <div className="tw-grid">
        {cat.links.map((l) => {
          const badge = l.badge === '!' ? '!' : l.badge > 9 ? '9+' : l.badge > 0 ? l.badge : null;
          return (
            <button key={l.label} className={'tw-cell' + (l.blink ? ' ttc-blink' : '')} onClick={() => { onDone?.(); l.action(); }}>
              <span className="tw-cell-top"><LinkIcon link={l} />{badge ? <span className="tw-badge">{badge}</span> : <ArrowUpRight className="tw-arrow" size={16} strokeWidth={1.8} />}</span>
              <span className="tw-cell-label">{shortLabel(l.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  ));
}

export const Stripes = ({ h = 12 }) => <div style={{ height: h, background: `repeating-linear-gradient(90deg, ${T.crest} 0 22px, ${T.paper} 22px 44px)` }} />;

export const BETA_CSS = `
.tw { --ink:${T.ink}; --paper:${T.paper}; --paper2:${T.paper2}; --green:${T.green}; --signal:${T.signal}; --muted:${T.muted}; --line:${T.line}; --line-light:${T.lineLight};
  --ease: cubic-bezier(.2,.7,.1,1);
  background: var(--paper); color: var(--ink); font-family: Archivo, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.tw * { box-sizing: border-box; }
.tw button { font: inherit; color: inherit; }
.tw-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
.tw-mono b { font-weight: 500; color: var(--green); }
.tw-wrap { max-width: 640px; margin: 0 auto; padding: 0 16px; }

/* Kopf wie site-header */
.tw-header { position: sticky; top: 0; z-index: 50; background: var(--paper); border-bottom: 1px solid var(--line); }
.tw-header .tw-wrap { display: flex; align-items: center; gap: 12px; height: 64px; }
.tw-brand { display: flex; align-items: center; gap: 10px; }
.tw-brand img { width: 30px; height: auto; }
.tw-brand-name { font-stretch: 125%; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: -.02em; line-height: 1; }
.tw-brand-name small { display: block; font-family: 'IBM Plex Mono', monospace; font-stretch: 100%; font-weight: 400; font-size: 9.5px; letter-spacing: .12em; margin-top: 4px; opacity: .7; }
.tw-icon-btn { all: unset; cursor: pointer; position: relative; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--line); }
.tw-icon-btn:hover { background: var(--ink); color: var(--paper); }
.tw-dot { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 4px; background: var(--green); color: #fff; font-size: 10px; font-weight: 800; display: grid; place-items: center; font-family: Archivo, sans-serif; }

/* Hero (dunkel wie auf der Webseite) */
.tw-hero { background: var(--ink); color: var(--paper); padding: 34px 0 0; position: relative; overflow: hidden; }
.tw-hero .tw-mono { color: rgba(243,241,234,.62); }
.tw-display { margin: 14px 0 26px; font-stretch: 125%; font-weight: 900; text-transform: uppercase; font-size: clamp(44px, 14vw, 76px); line-height: .84; letter-spacing: -.035em; }
.tw-display .line { display: block; overflow: hidden; padding-top: .12em; margin-top: -.12em; }
.tw-display .line > span { display: block; transform: translateY(105%); animation: twUp 1s var(--ease) forwards; }
.tw-display .line:nth-child(2) > span { animation-delay: .08s; }
.tw-display .line:nth-child(3) > span { animation-delay: .16s; }
.tw-display .accent { color: var(--signal); }
@keyframes twUp { to { transform: none; } }
.tw-bar { border-top: 1px solid var(--line-light); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.tw-bar > button { all: unset; cursor: pointer; padding: 16px 0 16px 14px; border-right: 1px solid var(--line-light); }
.tw-bar > button:first-child { padding-left: 0; }
.tw-bar > button:last-child { border-right: 0; }
.tw-bar strong { display: block; font-stretch: 125%; font-weight: 800; font-size: 28px; line-height: 1; font-variant-numeric: tabular-nums; }
.tw-bar strong.warn { color: #fb923c; }
.tw-bar span { display: block; margin-top: 6px; font-size: 12.5px; color: rgba(243,241,234,.62); }

/* Countdown-Streifen */
.tw-launch { display: flex; align-items: center; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.tw-launch-t { font-stretch: 112%; font-weight: 800; font-size: 17px; letter-spacing: -.01em; line-height: 1.1; margin-top: 4px; }
.tw-launch-n { margin-left: auto; display: flex; gap: 10px; font-variant-numeric: tabular-nums; }
.tw-launch-n div { text-align: center; }
.tw-launch-n b { display: block; font-stretch: 125%; font-weight: 900; font-size: 24px; line-height: 1; }
.tw-launch-n span { font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: var(--muted); text-transform: uppercase; }

/* Abschnitte wie sec-head */
.tw-sec { padding: 40px 0 8px; }
.tw-sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.tw-sec-head .tw-mono { display: block; margin-bottom: 10px; color: var(--muted); }
.tw-h { margin: 0; font-stretch: 112%; font-weight: 800; font-size: 34px; line-height: .95; letter-spacing: -.025em; }
.tw-ulink { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; padding-bottom: 3px; white-space: nowrap;
  background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1.5px no-repeat; transition: background-size .4s var(--ease); }
.tw-ulink:hover { background-size: 0 1.5px; background-position: 100% 100%; }

/* Board wie Spielplan der Webseite */
.tw-board { border-top: 1px solid var(--ink); }
.tw-row { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: grid; grid-template-columns: 74px 1fr auto; gap: 14px; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--line); transition: background .2s, padding .3s var(--ease); }
.tw-row:hover { background: var(--paper2); padding-left: 8px; padding-right: 8px; }
.tw-when { white-space: nowrap; font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 1.3; color: var(--muted); text-transform: uppercase; }
.tw-when b { display: block; color: var(--ink); font-weight: 500; font-size: 17px; }
.tw-fix { font-weight: 600; font-size: 15.5px; line-height: 1.25; min-width: 0; }
.tw-fix .sub { display: block; font-weight: 400; font-size: 13px; color: var(--muted); margin-top: 3px; }
.tw-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; padding: 4px 7px; border: 1px solid currentColor; white-space: nowrap; }
.tw-tag.today { background: var(--signal); border-color: var(--signal); color: var(--ink); }
.tw-tag.open { color: ${T.loss}; }
.tw-tag.ok { color: var(--green); }
.tw-empty { padding: 22px 0; color: var(--muted); border-bottom: 1px solid var(--line); }

/* Bereiche */
.tw-cat { margin-bottom: 28px; }
.tw-cat-head { display: flex; align-items: baseline; gap: 12px; padding-bottom: 10px; }
.tw-cat-head h3 { margin: 0; font-stretch: 112%; font-weight: 800; font-size: 19px; letter-spacing: -.015em; }
.tw-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--ink); border-left: 1px solid var(--line); }
@media (min-width: 520px) { .tw-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.tw-cell { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: 18px; min-height: 92px; padding: 13px 13px 12px;
  border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: transparent; position: relative; isolation: isolate; overflow: hidden; transition: color .3s var(--ease); -webkit-tap-highlight-color: transparent; }
.tw-cell::before { content: ''; position: absolute; inset: 0; background: var(--signal); transform: translateY(101%); transition: transform .4s var(--ease); z-index: -1; }
.tw-cell:hover::before, .tw-cell:active::before { transform: none; }
.tw-cell-top { display: flex; justify-content: space-between; align-items: flex-start; color: var(--green); }
.tw-cell:hover .tw-cell-top, .tw-cell:active .tw-cell-top { color: var(--ink); }
.tw-arrow { opacity: .35; transition: transform .3s var(--ease), opacity .3s; }
.tw-cell:hover .tw-arrow { opacity: 1; transform: translate(2px, -2px); }
.tw-badge { min-width: 20px; height: 20px; padding: 0 5px; background: var(--ink); color: var(--paper); font-size: 11px; font-weight: 800; display: grid; place-items: center; }
.tw-cell-label { font-weight: 600; font-size: 14.5px; line-height: 1.2; letter-spacing: -.005em; }

/* untere Leiste */
.tw-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9995; background: var(--paper); border-top: 1px solid var(--ink); padding-bottom: env(safe-area-inset-bottom); }
.tw-nav-in { max-width: 640px; margin: 0 auto; display: grid; grid-template-columns: repeat(5, 1fr); }
.tw-nav-b { all: unset; cursor: pointer; position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0 11px; color: var(--muted); -webkit-tap-highlight-color: transparent; }
.tw-nav-b span.l { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; }
.tw-nav-b.on { color: var(--ink); }
.tw-nav-b.on::before { content: ''; position: absolute; top: -1px; left: 22%; right: 22%; height: 3px; background: var(--green); }
.tw-nav-b .tw-dot { top: -6px; right: -12px; }

/* Blätter (Mehr / Wettkampf) */
@keyframes twSheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes twFade { from { opacity: 0; } to { opacity: 1; } }
.tw-sheet-bg { position: fixed; inset: 0; z-index: 9990; background: rgba(11,26,17,.55); animation: twFade .2s; display: flex; align-items: flex-end; justify-content: center; }
.tw-sheet { width: 100%; max-width: 640px; max-height: 84vh; overflow-y: auto; background: var(--paper); border-top: 1px solid var(--ink); padding: 0 16px calc(90px + env(safe-area-inset-bottom)); animation: twSheet .35s var(--ease); }
.tw-sheet-head { position: sticky; top: 0; background: var(--paper); display: flex; align-items: center; justify-content: space-between; padding: 18px 0 14px; margin-bottom: 14px; border-bottom: 1px solid var(--line); z-index: 1; }
.tw-sheet-head h2 { margin: 0; font-stretch: 125%; font-weight: 900; text-transform: uppercase; font-size: 30px; letter-spacing: -.03em; line-height: .9; }
.tw-action { all: unset; box-sizing: border-box; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--line); font-weight: 600; font-size: 16px; }
.tw-action:first-child { border-top: 1px solid var(--ink); }
.tw-action.danger { color: ${T.loss}; }
@media (prefers-reduced-motion: reduce) { .tw * { animation: none !important; transition: none !important; } .tw-display .line > span { transform: none; } }
`;
