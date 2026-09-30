import React, { useEffect, useState } from 'react';
import { Bell, UserRound, ArrowRight } from 'lucide-react';
import { useBetaFonts, TileGrid, Stripes, BETA_CSS } from './betaTheme.jsx';
import { LAUNCH_AT } from './LaunchCountdown.jsx';

// Startseite im neuen Design (Beta) für Trainer/Admins – sehr nah an der Webseite.
// sessions: [{id, date, time, groups:[{name,color}], past, today, recorded, total, onOpen}]

function Launch() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (LAUNCH_AT - now < -7 * 86400e3) return null;
  const r = Math.max(0, Math.floor((LAUNCH_AT - now) / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="tw-launch">
      <div style={{ minWidth: 0 }}>
        <span className="tw-mono"><b>{r ? 'Mi 14.10. · 15 Uhr' : 'Jetzt online'}</b></span>
        <div className="tw-launch-t">{r ? <>Aus Alt wird Neu.<br />Die neue Webseite.</> : 'Die neue Webseite ist da.'}</div>
      </div>
      {r > 0 && (
        <div className="tw-launch-n">
          {[[Math.floor(r / 86400), 'Tage'], [Math.floor(r / 3600) % 24, 'Std'], [Math.floor(r / 60) % 60, 'Min']].map(([v, l]) => <div key={l}><b>{pad(v)}</b><span>{l}</span></div>)}
        </div>
      )}
    </div>
  );
}

export default function BetaHome({ firstName, roleLabel, dateLabel, kpis, sessions, cats, unread, onBell, onProfile, onPlan, modals }) {
  useBetaFonts();
  const hour = new Date().getHours();
  const gruss = hour < 6 ? 'Gute Nacht' : hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : hour < 22 ? 'Guten Abend' : 'Gute Nacht';
  const [w1, w2] = gruss.split(' ');

  return (
    <div className="tw" style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <style>{BETA_CSS}</style>
      {modals}

      <header className="tw-header">
        <div className="tw-wrap">
          <div className="tw-brand">
            <img src="/logo.png" alt="" />
            <div className="tw-brand-name">TTC Staffel<small>INTERN · {roleLabel.toUpperCase()}</small></div>
          </div>
          <span style={{ flex: 1 }} />
          <button className="tw-icon-btn" onClick={onBell} aria-label="Nachrichten"><Bell size={18} strokeWidth={1.7} />{unread > 0 && <span className="tw-dot">{unread > 9 ? '9+' : unread}</span>}</button>
          <button className="tw-icon-btn" onClick={onProfile} aria-label="Profil"><UserRound size={18} strokeWidth={1.7} /></button>
        </div>
      </header>

      <section className="tw-hero">
        <div className="tw-wrap">
          <span className="tw-mono">{dateLabel}</span>
          <h1 className="tw-display">
            <span className="line"><span>{w1}</span></span>
            <span className="line"><span>{w2},</span></span>
            <span className="line"><span className="accent">{firstName || 'Hallo'}.</span></span>
          </h1>
          <div className="tw-bar">
            {kpis.map((k) => (
              <button key={k.label} onClick={k.onClick}>
                <strong className={k.warn ? 'warn' : ''}>{k.value}</strong><span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <Stripes />

      <div className="tw-wrap">
        <Launch />

        <section className="tw-sec">
          <div className="tw-sec-head">
            <div><span className="tw-mono"><b>01</b> &nbsp;Nächste 14 Tage</span><h2 className="tw-h">Training</h2></div>
            <button className="tw-ulink" onClick={onPlan}>Trainingsplan <ArrowRight size={15} /></button>
          </div>
          <div className="tw-board">
            {!sessions.length && <div className="tw-empty">Keine Einheiten in den nächsten 14 Tagen.</div>}
            {sessions.map((s) => {
              const d = new Date(s.date + 'T12:00:00');
              const offen = s.past && s.total > 0 && s.recorded < s.total;
              return (
                <button key={s.id} className="tw-row" onClick={s.onOpen}>
                  <span className="tw-when"><b>{d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</b>{d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '')} · {s.time}</span>
                  <span className="tw-fix">
                    {s.groups.length ? s.groups.map((g) => g.name).join(' · ') : 'Training'}
                    <span className="sub">{s.past ? (s.total > 0 ? `Anwesenheit ${s.recorded} von ${s.total} erfasst` : 'Vergangen') : s.today ? 'Heute in der Halle' : 'Anwesenheit öffnen'}</span>
                  </span>
                  {s.today ? <span className="tw-tag today">Heute</span>
                    : offen ? <span className="tw-tag open">Eintragen</span>
                    : s.past ? <span className="tw-tag ok">Erfasst</span>
                    : <ArrowRight size={17} strokeWidth={1.7} />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="tw-sec">
          <div className="tw-sec-head"><div><span className="tw-mono"><b>02</b> &nbsp;Alles für den Verein</span><h2 className="tw-h">Bereiche</h2></div></div>
          <TileGrid cats={cats} />
        </section>
      </div>
    </div>
  );
}
