import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { House, CalendarDays, Trophy, MessageCircle, Menu, UserRound, Repeat, LogOut, Undo2 } from 'lucide-react';
import { betaStore } from './betaStore.js';
import { T, monoLabel, useBetaFonts, TileGrid, BETA_CSS } from './betaTheme.jsx';

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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.55)', animation: 'tb-fade .2s', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}
        style={{ width: '100%', maxWidth: '560px', maxHeight: '82vh', overflowY: 'auto', background: T.ink, borderTop: `1px solid ${T.line2}`, borderRadius: '22px 22px 0 0', padding: '10px 16px calc(96px + env(safe-area-inset-bottom))', animation: 'tb-up .28s cubic-bezier(.2,.7,.1,1)', color: T.text, fontFamily: T.body }}>
        <div style={{ width: '38px', height: '4px', borderRadius: '4px', background: T.line2, margin: '0 auto 14px' }} />
        <div style={{ fontFamily: T.display, fontStretch: '112%', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '16px' }}>{title}</div>
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
    document.body.style.paddingBottom = 'calc(78px + env(safe-area-inset-bottom))';
    return () => { document.body.style.paddingBottom = prev; };
  }, [enabled]);
  useEffect(() => { setSheet(null); }, [st.view]);

  if (!enabled) return null;
  const cats = st.getCats ? st.getCats() : [];
  const wk = cats.filter((c) => /wettkampf/i.test(c.label));
  const close = () => setSheet(null);

  const aktiv = sheet === 'wettkampf' ? 'wettkampf' : sheet === 'mehr' ? 'mehr'
    : st.view === 'home' ? 'start' : TRAINING_VIEWS.includes(st.view) ? 'training' : WETTKAMPF_VIEWS.includes(st.view) ? 'wettkampf' : st.view === 'notifications' ? 'nachr' : 'mehr';

  const items = [
    { k: 'start', l: 'Start', I: House, a: () => { close(); st.navTo('home'); } },
    { k: 'training', l: 'Training', I: CalendarDays, a: () => { close(); st.navTo('trainingsplan'); } },
    { k: 'wettkampf', l: 'Wettkampf', I: Trophy, a: () => setSheet(sheet === 'wettkampf' ? null : 'wettkampf') },
    { k: 'nachr', l: 'Nachrichten', I: MessageCircle, a: () => { close(); st.navTo('notifications'); }, badge: st.unread },
    { k: 'mehr', l: 'Mehr', I: Menu, a: () => setSheet(sheet === 'mehr' ? null : 'mehr') },
  ];

  const Aktion = ({ I, l, onClick, danger }) => (
    <button onClick={() => { close(); onClick(); }} style={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 4px', borderTop: `1px solid ${T.line}`, fontSize: '15px', fontWeight: 600, color: danger ? T.red : T.text }}>
      <I size={19} strokeWidth={1.8} color={danger ? T.red : T.signal} /> {l}
    </button>
  );

  return (
    <>
      <style>{BETA_CSS}</style>
      {sheet === 'wettkampf' && <Sheet title="Wettkampf" onClose={close}><div className="tb-root"><TileGrid cats={wk.map((c) => ({ ...c, label: 'Wettkampf & Leistung' }))} onDone={close} /></div></Sheet>}
      {sheet === 'mehr' && (
        <Sheet title="Alle Bereiche" onClose={close}>
          <div className="tb-root"><TileGrid cats={cats} onDone={close} /></div>
          <div style={{ marginTop: '4px' }}>
            <Aktion I={UserRound} l="Mein Profil" onClick={st.openProfile} />
            {st.canSwitchRole && <Aktion I={Repeat} l="Rolle wechseln" onClick={st.switchRole} />}
            <Aktion I={Undo2} l="Zurück zum alten Design" onClick={st.disable} />
            <Aktion I={LogOut} l="Abmelden" onClick={st.logout} danger />
          </div>
          <div style={{ ...monoLabel, color: T.faint, textAlign: 'center', marginTop: '14px' }}>Neues Design · Beta · nur für dich sichtbar</div>
        </Sheet>
      )}
      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9995, background: 'rgba(11,26,17,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: `1px solid ${T.line2}`, paddingBottom: 'env(safe-area-inset-bottom)', fontFamily: T.body }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {items.map(({ k, l, I, a, badge }) => {
            const on = aktiv === k;
            return (
              <button key={k} onClick={a} aria-current={on ? 'page' : undefined}
                style={{ all: 'unset', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '9px 0 10px', color: on ? T.signal : T.muted, WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ position: 'absolute', top: 0, width: '26px', height: '3px', borderRadius: '0 0 3px 3px', background: on ? T.signal : 'transparent', transition: 'background .2s' }} />
                <span style={{ position: 'relative' }}>
                  <I size={22} strokeWidth={on ? 2.1 : 1.7} />
                  {badge > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-9px', background: T.club, color: '#fff', fontSize: '9.5px', fontWeight: 800, borderRadius: '99px', minWidth: '16px', height: '16px', display: 'grid', placeItems: 'center', padding: '0 3px', border: `2px solid ${T.ink}` }}>{badge > 9 ? '9+' : badge}</span>}
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: on ? 700 : 600 }}>{l}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
