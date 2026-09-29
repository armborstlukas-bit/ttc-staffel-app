import React, { useEffect } from 'react';
import {
  CalendarDays, Users, Gamepad2, Shirt, Package, BarChart3, Medal, Trophy, CalendarRange, TrendingUp, Target, Radio, Swords,
  Newspaper, PenLine, MessageCircle, CalendarHeart, Car, ClipboardList, Lightbulb, Dices, Recycle, Receipt, FolderOpen, Archive,
  Trash2, Activity, LayoutGrid,
} from 'lucide-react';

// Neues App-Design (Beta) – angelehnt an die Webseite: Archivo + IBM Plex Mono, Tinte/Signal-Limette, Wappen-Streifen
export const T = {
  ink: '#0b1a11', ink2: '#14261b', ink3: '#1b3024', line: 'rgba(255,255,255,0.09)', line2: 'rgba(255,255,255,0.16)',
  text: '#eef0ea', muted: 'rgba(238,240,234,0.58)', faint: 'rgba(238,240,234,0.38)',
  signal: '#b6f36a', club: '#20a050', deep: '#0f4a25', warn: '#fb923c', red: '#f87171',
  display: "Archivo, 'Arial Black', system-ui, sans-serif",
  body: "Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
};

export const monoLabel = { fontFamily: T.mono, fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase' };

// Schriften nur laden, wenn das Beta-Design aktiv ist
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
  'Datenlöschen': Trash2, 'App-Statistik': Activity,
};
// Kurze Beschriftungen für die Symbol-Kacheln
const SHORT = { 'TTC Mannschaften': 'Mann­schaften', 'Übungswettkämpfe': 'Übungs­wettkämpfe', 'Materialverwaltung': 'Material', 'Errungenschaften': 'Erfolge', 'Live-Statistiken': 'Live-Stats', 'Vereinskalender': 'Kalender', 'Wer fährt wann': 'Fahrten', 'Verbesserungen': 'Ideen', 'Trainingsplan': 'Trainings­plan', 'Meine Gruppen': 'Gruppen', 'Trainingsmatches': 'Matches', 'App-Statistik': 'Statistik', 'Rompel Bereich': 'Rompel', 'Trikotgrößen': 'Trikots', 'Datenlöschen': 'Daten löschen' };

export const shortLabel = (l) => (/tippspiel/i.test(l) ? 'Tippspiel' : SHORT[l] || l);

export function LinkIcon({ link, size = 22 }) {
  if (link.icon && typeof link.icon === 'object' && link.icon.type === 'img') {
    return <img src={link.icon.src} alt="" style={{ width: size + 8, height: size + 8, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top' }} />;
  }
  const I = /tippspiel/i.test(link.label) ? Dices : ICONS[link.label] || LayoutGrid;
  return <I size={size} strokeWidth={1.8} color={T.signal} />;
}

// Kachel wie ein App-Symbol am Handy
export function AppTile({ link, onDone }) {
  const badge = link.badge === '!' ? '!' : link.badge > 9 ? '9+' : link.badge > 0 ? link.badge : null;
  return (
    <button onClick={() => { onDone?.(); link.action(); }} className={link.blink ? 'ttc-blink' : ''}
      style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', position: 'relative', WebkitTapHighlightColor: 'transparent' }}>
      <span className="tb-ico" style={{ width: '54px', height: '54px', borderRadius: '17px', background: T.ink2, border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', transition: 'transform .15s, background .15s' }}>
        <LinkIcon link={link} />
      </span>
      {badge && <span style={{ position: 'absolute', top: '-4px', right: 'calc(50% - 34px)', background: T.club, color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '99px', minWidth: '18px', height: '18px', display: 'grid', placeItems: 'center', padding: '0 4px', border: `2px solid ${T.ink}`, fontFamily: T.body }}>{badge}</span>}
      <span style={{ fontSize: '11.5px', lineHeight: 1.2, textAlign: 'center', color: 'rgba(238,240,234,0.86)', fontFamily: T.body, maxWidth: '76px', hyphens: 'manual' }}>{shortLabel(link.label)}</span>
    </button>
  );
}

export function TileGrid({ cats, onDone }) {
  return cats.filter((c) => c.links.length).map((cat) => (
    <div key={cat.label} style={{ marginBottom: '22px' }}>
      <div style={{ ...monoLabel, color: T.muted, marginBottom: '12px' }}>{cat.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px 6px' }}>
        {cat.links.map((l) => <AppTile key={l.label} link={l} onDone={onDone} />)}
      </div>
    </div>
  ));
}

export const Stripes = ({ h = 5 }) => <div style={{ height: h, background: `repeating-linear-gradient(90deg, ${T.club} 0 14px, #fff 14px 28px)` }} />;

export const BETA_CSS = `
.tb-root button:active .tb-ico { transform: scale(.94); background: ${T.ink3}; }
@media (hover:hover) { .tb-root button:hover .tb-ico { background: ${T.ink3}; } }
@keyframes tb-up { from { transform: translateY(100%); } to { transform: none; } }
@keyframes tb-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes tb-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.tb-in { animation: tb-in .35s cubic-bezier(.2,.7,.1,1) both; }
`;
