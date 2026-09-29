import React, { useEffect, useState } from 'react';
import { Bell, UserRound, ChevronRight } from 'lucide-react';
import { T, monoLabel, useBetaFonts, TileGrid, Stripes, BETA_CSS } from './betaTheme.jsx';
import { LAUNCH_AT } from './LaunchCountdown.jsx';

// Startseite im neuen Design (Beta) für Trainer/Admins – nur sichtbar, wenn das Beta-Design eingeschaltet ist.
// sessions: [{id, date, time, groups:[{name,color}], past, today, recorded, total, onOpen}]

function UpdateBanner() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const r = Math.max(0, Math.floor((LAUNCH_AT - now) / 1000));
  if (LAUNCH_AT - now < -7 * 86400e3) return null;
  const d = Math.floor(r / 86400), h = Math.floor(r / 3600) % 24, m = Math.floor(r / 60) % 60, s = r % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="tb-in" style={{ margin: '14px 16px 0', borderRadius: '16px', padding: '13px 14px', background: `linear-gradient(120deg, ${T.deep}, ${T.ink2} 62%)`, border: '1px solid rgba(182,243,106,0.24)', display: 'flex', alignItems: 'center', gap: '12px', animationDelay: '.08s' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...monoLabel, color: T.signal }}>{r ? 'Update · Mi 14.10.' : 'Jetzt live'}</div>
        <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '3px', lineHeight: 1.25 }}>Neue Webseite.<br />Neue App.</div>
      </div>
      <div style={{ marginLeft: 'auto', fontFamily: T.display, fontStretch: '125%', fontWeight: 900, fontSize: '20px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
        {r ? <>{d}<span style={{ color: T.muted, fontSize: '14px' }}>T</span> {pad(h)}:{pad(m)}<span style={{ color: T.muted }}>:{pad(s)}</span></> : '🎉'}
      </div>
    </div>
  );
}

export default function BetaHome({ firstName, roleLabel, dateLabel, kpis, sessions, cats, unread, onBell, onProfile, onPlan, modals }) {
  useBetaFonts();
  const vergangen = sessions.filter((s) => s.past);
  const kommend = sessions.filter((s) => !s.past);
  const hour = new Date().getHours();
  const gruss = hour < 6 ? 'Gute Nacht' : hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : hour < 22 ? 'Guten Abend' : 'Gute Nacht';
  const [w1, ...rest] = gruss.split(' ');

  const Session = ({ s, i }) => {
    const d = new Date(s.date + 'T12:00:00');
    const offen = s.past && s.total > 0 && s.recorded < s.total;
    return (
      <button onClick={s.onOpen} className="tb-in" style={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', background: s.today ? T.ink3 : T.ink2, border: `1px solid ${s.today ? 'rgba(182,243,106,0.3)' : T.line}`, borderRadius: '14px', marginBottom: '7px', animationDelay: `${0.12 + i * 0.04}s` }}>
        <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: T.display, fontStretch: '125%', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{d.getDate()}</div>
          <div style={{ ...monoLabel, fontSize: '9.5px', color: T.muted, marginTop: '2px' }}>{d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.groups.length ? s.groups.map((g, k) => <span key={k}>{k > 0 && <span style={{ color: T.faint }}> · </span>}<span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: g.color || T.club, marginRight: '6px', verticalAlign: '1px' }} />{g.name}</span>) : 'Training'}
          </div>
          <div style={{ fontSize: '12.5px', color: T.muted, marginTop: '2px' }}>
            {s.time} Uhr{s.today && <span style={{ color: T.signal, fontWeight: 700 }}> · Heute</span>}
            {s.past && s.total > 0 && <span style={{ color: offen ? T.warn : T.signal }}> · {offen ? `Anwesenheit ${s.recorded}/${s.total}` : 'erfasst'}</span>}
          </div>
        </div>
        {offen ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.warn, flexShrink: 0 }} /> : <ChevronRight size={17} color={T.faint} />}
      </button>
    );
  };

  const IconBtn = ({ onClick, label, children, badge }) => (
    <button onClick={onClick} aria-label={label} style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'grid', placeItems: 'center' }}>
      {children}
      {badge > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: T.club, color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '99px', minWidth: '17px', height: '17px', display: 'grid', placeItems: 'center', padding: '0 4px', border: `2px solid ${T.ink}` }}>{badge > 9 ? '9+' : badge}</span>}
    </button>
  );

  return (
    <div className="tb-root" style={{ minHeight: '100vh', background: T.ink, color: T.text, fontFamily: T.body, WebkitFontSmoothing: 'antialiased', paddingBottom: '96px' }}>
      <style>{BETA_CSS}</style>
      {modals}
      <Stripes />
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Kopfzeile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px' }}>
          <img src="/logo.png" alt="" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: T.display, fontStretch: '112%', fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.01em' }}>TTC Staffel</div>
            <div style={{ ...monoLabel, color: T.signal, marginTop: '4px' }}>Intern · {roleLabel}</div>
          </div>
          <span style={{ flex: 1 }} />
          <IconBtn onClick={onBell} label="Nachrichten" badge={unread}><Bell size={18} strokeWidth={1.8} color={T.text} /></IconBtn>
          <IconBtn onClick={onProfile} label="Profil"><UserRound size={18} strokeWidth={1.8} color={T.text} /></IconBtn>
        </div>

        {/* Begrüßung */}
        <div className="tb-in" style={{ padding: '14px 16px 0' }}>
          <div style={{ ...monoLabel, color: T.muted }}>{dateLabel}</div>
          <h1 style={{ margin: '10px 0 0', fontFamily: T.display, fontStretch: '125%', fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(38px, 11.5vw, 54px)', lineHeight: 0.86, letterSpacing: '-0.035em' }}>
            {w1}<br />
            <span style={{ color: 'transparent', WebkitTextStroke: `1.4px ${T.text}` }}>{rest.join(' ')},</span><br />
            {firstName || 'Hallo'}<span style={{ color: T.signal }}>.</span>
          </h1>
        </div>

        {/* Kennzahlen */}
        <div className="tb-in" style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`, margin: '18px 16px 0', borderTop: `1px solid ${T.line2}`, borderBottom: `1px solid ${T.line2}`, animationDelay: '.05s' }}>
          {kpis.map((k, i) => (
            <button key={k.label} onClick={k.onClick} style={{ all: 'unset', cursor: k.onClick ? 'pointer' : 'default', padding: '11px 0 10px', paddingLeft: i ? '12px' : 0, borderLeft: i ? `1px solid ${T.line2}` : 'none' }}>
              <div style={{ fontFamily: T.display, fontStretch: '125%', fontWeight: 900, fontSize: '25px', lineHeight: 1, color: k.warn ? T.warn : T.signal, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              <div style={{ ...monoLabel, fontSize: '9.5px', color: T.muted, marginTop: '5px' }}>{k.label}</div>
            </button>
          ))}
        </div>

        <UpdateBanner />

        {/* Training */}
        <div style={{ padding: '24px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '11px' }}>
            <span style={{ ...monoLabel, color: T.muted }}>Training · nächste 14 Tage</span>
            <button onClick={onPlan} style={{ all: 'unset', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: T.signal }}>Plan →</button>
          </div>
          {!sessions.length && <div style={{ padding: '22px', textAlign: 'center', color: T.muted, fontSize: '13.5px', background: T.ink2, borderRadius: '14px' }}>Keine Einheiten in den nächsten 14 Tagen.</div>}
          {vergangen.map((s, i) => <Session key={s.id} s={s} i={i} />)}
          {vergangen.length > 0 && kommend.length > 0 && <div style={{ height: '6px' }} />}
          {kommend.map((s, i) => <Session key={s.id} s={s} i={i + vergangen.length} />)}
        </div>

        {/* Alle Bereiche */}
        <div style={{ padding: '26px 16px 0' }}>
          <TileGrid cats={cats} />
        </div>
      </div>
    </div>
  );
}
