import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { House, CalendarDays, Trophy, MessageCircle, Menu, X, ArrowRight } from 'lucide-react';
import { betaStore } from './betaStore.js';
import { useBetaFonts, TileGrid, BETA_CSS } from './betaTheme.jsx';

// Untere Leiste des neuen Designs (Beta): Start · Training · Wettkampf · Nachrichten · Mehr
const TRAINING_VIEWS = ['trainingsplan', 'meingruppen', 'sessionAttendance', 'practiceTournaments', 'trikotgroessen', 'materialverwaltung'];
const WETTKAMPF_VIEWS = ['rangliste', 'achievements', 'ttcMannschaften', 'spielplan', 'ttrWerte', 'gegnerlogbuch', 'livestats', 'trainingsmatches'];

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [onClose]);
  return (
    <div className="tw-sheet-bg" onClick={onClose}>
      <div className="tw-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="tw-sheet-head"><h2>{title}</h2><button className="tw-icon-btn" onClick={onClose} aria-label="Schließen"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export default function BetaNav() {
  const st = useSyncExternalStore(betaStore.subscribe, betaStore.get);
  const [sheet, setSheet] = useState(null); // 'wettkampf' | 'mehr'
  const enabled = !!st.enabled;
  useBetaFonts(enabled);

  useEffect(() => {
    if (!enabled) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = 'calc(66px + env(safe-area-inset-bottom))';
    return () => { document.body.style.paddingBottom = prev; };
  }, [enabled]);
  useEffect(() => { setSheet(null); }, [st.view]);

  if (!enabled) return null;
  const cats = st.getCats ? st.getCats() : [];
  const close = () => setSheet(null);

  const aktiv = sheet || (st.view === 'home' ? 'start' : TRAINING_VIEWS.includes(st.view) ? 'training' : WETTKAMPF_VIEWS.includes(st.view) ? 'wettkampf' : st.view === 'notifications' ? 'nachr' : 'mehr');

  const items = [
    { k: 'start', l: 'Start', I: House, a: () => { close(); st.navTo('home'); } },
    { k: 'training', l: 'Training', I: CalendarDays, a: () => { close(); st.navTo('trainingsplan'); } },
    { k: 'wettkampf', l: 'Wettkampf', I: Trophy, a: () => setSheet(sheet === 'wettkampf' ? null : 'wettkampf') },
    { k: 'nachr', l: 'Nachricht', I: MessageCircle, a: () => { close(); st.navTo('notifications'); }, badge: st.unread },
    { k: 'mehr', l: 'Mehr', I: Menu, a: () => setSheet(sheet === 'mehr' ? null : 'mehr') },
  ];
  const Aktion = ({ l, onClick, danger }) => (
    <button className={'tw-action' + (danger ? ' danger' : '')} onClick={() => { close(); onClick(); }}>{l} <ArrowRight size={17} strokeWidth={1.7} /></button>
  );

  return (
    <div className="tw" style={{ background: 'transparent' }}>
      <style>{BETA_CSS}</style>
      {sheet === 'wettkampf' && <Sheet title="Wettkampf" onClose={close}><TileGrid cats={cats.filter((c) => /wettkampf/i.test(c.label))} onDone={close} startIndex={1} /></Sheet>}
      {sheet === 'mehr' && (
        <Sheet title="Alle Bereiche" onClose={close}>
          <TileGrid cats={cats} onDone={close} startIndex={1} />
          <div style={{ marginTop: '8px' }}>
            <Aktion l="Mein Profil" onClick={st.openProfile} />
            {st.canSwitchRole && <Aktion l="Rolle wechseln" onClick={st.switchRole} />}
            <Aktion l="Zurück zum alten Design" onClick={st.disable} />
            <Aktion l="Abmelden" onClick={st.logout} danger />
          </div>
          <p className="tw-mono" style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '18px' }}>Neues Design · Beta · nur für dich sichtbar</p>
        </Sheet>
      )}
      <nav className="tw-nav">
        <div className="tw-nav-in">
          {items.map(({ k, l, I, a, badge }) => (
            <button key={k} className={'tw-nav-b' + (aktiv === k ? ' on' : '')} onClick={a} aria-current={aktiv === k ? 'page' : undefined}>
              <span style={{ position: 'relative', display: 'grid' }}>
                <I size={21} strokeWidth={aktiv === k ? 2 : 1.6} />
                {badge > 0 && <span className="tw-dot">{badge > 9 ? '9+' : badge}</span>}
              </span>
              <span className="l">{l}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
