import React, { useEffect, useRef, useState } from 'react';
import { Home, Plus, Trash2, Download, Camera, X } from 'lucide-react';
import { parseBetrag, fmtBetrag, erstelleAbrechnungPdf, belegFotosAnhaengen } from './abrechnungPdf.js';

// Abrechnungsformular „Erstattung von Aufwendungen" – für Admins und Trainer.
// Angaben zur Person/Bank und der Entwurf bleiben auf dem Gerät gespeichert (localStorage), Belegfotos nur bis zum Erstellen.

const LS_PERSON = 'ttcAbrechnungPerson';
const LS_ENTWURF = 'ttcAbrechnungEntwurf';
const lsGet = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } };
const neuerBeleg = () => ({ id: Math.random().toString(36).slice(2), datum: '', zweck: '', betrag: '' });

const C = { accent: '#86efac', line: 'rgba(134,239,172,0.2)' };
const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '10px', color: 'white', fontSize: '16px', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.55)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' };
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '14px' };
const h2 = { margin: '0 0 12px', fontSize: '15px', fontWeight: '800', color: C.accent };

// Foto verkleinern (max. 1600 px, JPEG) – hält das PDF klein
const bildLaden = (file) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const f = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    res({ bild: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height });
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild nicht lesbar')); };
  img.src = url;
});

function Unterschrift({ onChange }) {
  const ref = useRef(null);
  const zeichnet = useRef(false);
  const leer = useRef(true);
  const [istLeer, setIstLeer] = useState(true);
  useEffect(() => {
    const c = ref.current, dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f4d';
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); zeichnet.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = (e) => { if (!zeichnet.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); if (leer.current) { leer.current = false; setIstLeer(false); } };
  const up = () => { if (!zeichnet.current) return; zeichnet.current = false; if (!leer.current) onChange(ref.current.toDataURL('image/png')); };
  const loeschen = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); leer.current = true; setIstLeer(true); onChange(null); };
  return (
    <div>
      <div style={{ position: 'relative', background: 'white', borderRadius: '10px', height: '130px' }}>
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block', borderRadius: '10px', cursor: 'crosshair' }} />
        {istLeer && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px', pointerEvents: 'none' }}>Hier mit Finger oder Maus unterschreiben</div>}
        <div style={{ position: 'absolute', left: '14px', right: '14px', bottom: '28px', borderBottom: '1px dashed #cbd5e1', pointerEvents: 'none' }} />
      </div>
      {!istLeer && <button type="button" onClick={loeschen} style={{ marginTop: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}>↺ Unterschrift löschen</button>}
    </div>
  );
}

export default function Abrechnung({ isMobile, onHome, userName = '' }) {
  const [person, setPerson] = useState(() => {
    const p = lsGet(LS_PERSON, null);
    if (p) return p;
    const teile = userName.trim().split(/\s+/);
    return { vorname: teile.length > 1 ? teile.slice(0, -1).join(' ') : '', name: teile.length > 1 ? teile[teile.length - 1] : '', strasse: '', plz: '', ort: '', inhaber: userName.trim(), iban: '', bic: '' };
  });
  const [belege, setBelege] = useState(() => { const e = lsGet(LS_ENTWURF, null); return Array.isArray(e) && e.length ? e : [neuerBeleg()]; });
  const [fotos, setFotos] = useState({}); // belegId → {bild,w,h}
  const [unterschrift, setUnterschrift] = useState(null);
  const [fehler, setFehler] = useState('');
  const [erstellt, setErstellt] = useState(null); // {url, blob, name, summe, anzahl, mitFotos}
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => { lsSet(LS_PERSON, person); }, [person]);
  useEffect(() => { lsSet(LS_ENTWURF, belege); }, [belege]);
  useEffect(() => () => { if (erstellt?.url) URL.revokeObjectURL(erstellt.url); }, [erstellt]);

  const setP = (k) => (e) => setPerson(p => ({ ...p, [k]: e.target.value }));
  const setB = (id, k, v) => setBelege(bs => bs.map(b => (b.id === id ? { ...b, [k]: v } : b)));
  const summe = belege.reduce((s, b) => s + (parseBetrag(b.betrag) || 0), 0);

  const fotoWaehlen = async (id, file) => {
    if (!file) return;
    try { const f = await bildLaden(file); setFotos(fs => ({ ...fs, [id]: f })); } catch { setFehler('Das Foto konnte nicht gelesen werden.'); }
  };

  const erstellen = async () => {
    setFehler('');
    const pflicht = [['name', 'Name'], ['vorname', 'Vorname'], ['strasse', 'Straße'], ['plz', 'PLZ'], ['ort', 'Ort'], ['inhaber', 'Kontoinhaber'], ['iban', 'IBAN']];
    const fehlt = pflicht.filter(([k]) => !String(person[k] || '').trim()).map(([, l]) => l);
    if (fehlt.length) return setFehler(`Bitte noch ausfüllen: ${fehlt.join(', ')}.`);
    const gefuellt = belege.filter(b => b.datum || b.zweck.trim() || b.betrag.trim());
    if (!gefuellt.length) return setFehler('Bitte mindestens einen Beleg eintragen.');
    for (const [i, b] of gefuellt.entries()) {
      if (!b.datum || !b.zweck.trim() || !Number.isFinite(parseBetrag(b.betrag))) return setFehler(`Beleg ${i + 1}: Bitte Datum, Verwendungszweck und einen gültigen Betrag (z. B. 12,50) angeben.`);
    }
    if (!unterschrift) return setFehler('Bitte unten unterschreiben.');
    setLaeuft(true);
    try {
      let logo = null;
      try { const r = await fetch('/abrechnung-logo.png'); const bl = await r.blob(); logo = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); } catch { /* ohne Logo */ }
      const { pdf, summe: s } = erstelleAbrechnungPdf({
        person, bank: { inhaber: person.inhaber, iban: person.iban.toUpperCase(), bic: person.bic.toUpperCase() },
        belege: gefuellt, unterschrift, logo,
      });
      const anhang = gefuellt.map((b, i) => (fotos[b.id] ? { nr: i + 1, ...fotos[b.id] } : null)).filter(Boolean);
      belegFotosAnhaengen(pdf, anhang);
      const blob = pdf.output('blob');
      const heute = new Date().toISOString().slice(0, 10);
      const name = `Abrechnung_${(person.name || 'TTC').replace(/[^\wäöüÄÖÜß-]+/g, '_')}_${heute}.pdf`;
      setErstellt({ url: URL.createObjectURL(blob), blob, name, summe: s, anzahl: gefuellt.length, mitFotos: anhang.length });
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) {
      setFehler('Das PDF konnte nicht erstellt werden: ' + (e?.message || e));
    } finally { setLaeuft(false); }
  };

  const teilen = async () => {
    const file = new File([erstellt.blob], erstellt.name, { type: 'application/pdf' });
    try { await navigator.share({ files: [file], title: 'Abrechnung TTC Staffel' }); } catch { /* abgebrochen */ }
  };
  const kannTeilen = (() => { try { return !!erstellt && !!navigator.canShare && navigator.canShare({ files: [new File([erstellt.blob], erstellt.name, { type: 'application/pdf' })] }); } catch { return false; } })();

  const neu = () => { setBelege([neuerBeleg()]); setFotos({}); setErstellt(null); setUnterschrift(null); setFehler(''); };

  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: '10px' });

  return (
    <div className="ttc-view-enter" style={{ minHeight: '100vh', background: 'linear-gradient(170deg,#021a0a 0%,#042d12 45%,#021508 100%)', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", color: 'white' }}>
      <div className="ttc-sticky-hdr" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onHome} aria-label="Startseite" style={{ padding: '10px 12px', background: 'rgba(134,239,172,0.12)', color: C.accent, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Home size={16} /></button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', flex: 1 }}>🧾 Abrechnung</h1>
      </div>

      <div style={{ padding: isMobile ? '14px 16px 40px' : '20px', maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '14px' }}>
        {erstellt ? (
          <div style={{ ...card, borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.07)', textAlign: 'center', padding: '24px 18px' }}>
            <div style={{ fontSize: '44px', lineHeight: 1 }}>✅</div>
            <h2 style={{ margin: '10px 0 4px', fontSize: '20px', fontWeight: '800' }}>Abrechnung erstellt</h2>
            <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>{erstellt.anzahl} {erstellt.anzahl === 1 ? 'Beleg' : 'Belege'} · Gesamtbetrag <b style={{ color: 'white' }}>{fmtBetrag(erstellt.summe)} €</b></p>
            <div style={{ display: 'grid', gap: '8px', maxWidth: '360px', margin: '0 auto' }}>
              <a href={erstellt.url} download={erstellt.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', borderRadius: '11px', fontWeight: '800', fontSize: '15px', textDecoration: 'none' }}><Download size={18} /> PDF herunterladen</a>
              {kannTeilen && <button onClick={teilen} style={{ padding: '12px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '11px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>📤 PDF teilen / per Mail senden</button>}
            </div>
            <div style={{ marginTop: '18px', padding: '14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '12px', color: '#fde68a', fontSize: '14px', lineHeight: 1.5, textAlign: 'left' }}>
              <b>📌 Wichtig:</b> Bitte dieses PDF an <b>Benjamin Blech</b> schicken und einreichen – <b>inklusive der Belege</b>{erstellt.mitFotos ? ' (die fotografierten Belege sind bereits im PDF angehängt; Originale bitte trotzdem aufbewahren bzw. mit abgeben)' : ' (mit der gleichen Nummerierung wie im Formular)'}.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => setErstellt(null)} style={{ padding: '10px 14px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>✏️ Nochmal bearbeiten</button>
              <button onClick={neu} style={{ padding: '10px 14px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>➕ Neue Abrechnung</button>
            </div>
          </div>
        ) : (<>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.5 }}>Erstattung von Aufwendungen: Belege eintragen, unterschreiben, PDF erstellen. Deine Angaben werden auf diesem Gerät für das nächste Mal gemerkt.</p>

          <section style={card}>
            <h2 style={h2}>1 · Deine Angaben</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={grid('1fr 1fr')}>
                <label><span style={lbl}>Vorname</span><input style={input} value={person.vorname} onChange={setP('vorname')} autoComplete="given-name" /></label>
                <label><span style={lbl}>Name</span><input style={input} value={person.name} onChange={setP('name')} autoComplete="family-name" /></label>
              </div>
              <label><span style={lbl}>Straße</span><input style={input} value={person.strasse} onChange={setP('strasse')} autoComplete="street-address" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px' }}>
                <label><span style={lbl}>PLZ</span><input style={input} value={person.plz} onChange={setP('plz')} inputMode="numeric" autoComplete="postal-code" /></label>
                <label><span style={lbl}>Ort</span><input style={input} value={person.ort} onChange={setP('ort')} autoComplete="address-level2" /></label>
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>2 · Belege</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {belege.map((b, i) => (
                <div key={b.id} style={{ border: `1px solid ${C.line}`, borderRadius: '12px', padding: '12px', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ background: 'rgba(134,239,172,0.15)', color: C.accent, fontWeight: '800', fontSize: '12px', padding: '4px 10px', borderRadius: '99px' }}>Beleg Nr. {i + 1}</span>
                    <span style={{ flex: 1 }} />
                    {belege.length > 1 && <button onClick={() => { setBelege(bs => bs.filter(x => x.id !== b.id)); setFotos(f => { const n = { ...f }; delete n[b.id]; return n; }); }} aria-label="Beleg entfernen" style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '4px', display: 'flex' }}><Trash2 size={17} /></button>}
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label><span style={lbl}>Datum</span><input type="date" style={input} value={b.datum} onChange={e => setB(b.id, 'datum', e.target.value)} /></label>
                      <label><span style={lbl}>Betrag in €</span><input style={{ ...input, textAlign: 'right' }} value={b.betrag} placeholder="0,00" inputMode="decimal" onChange={e => setB(b.id, 'betrag', e.target.value)} /></label>
                    </div>
                    <label><span style={lbl}>Verwendungszweck</span><input style={input} value={b.zweck} placeholder="z. B. Startgeld Kreiseinzelmeisterschaft" onChange={e => setB(b.id, 'zweck', e.target.value)} /></label>
                    {fotos[b.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={fotos[b.id].bild} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px' }} />
                        <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Foto wird ans PDF angehängt</span>
                        <button onClick={() => setFotos(f => { const n = { ...f }; delete n[b.id]; return n; })} aria-label="Foto entfernen" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '4px 0' }}>
                        <Camera size={16} /> Foto vom Beleg anhängen (optional)
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { fotoWaehlen(b.id, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => setBelege(bs => [...bs, neuerBeleg()])} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'rgba(134,239,172,0.08)', border: '1px dashed rgba(134,239,172,0.4)', borderRadius: '12px', color: C.accent, fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}><Plus size={17} /> Weiteren Beleg hinzufügen</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 4px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>Gesamtbetrag</span>
                <span style={{ fontWeight: '800', fontSize: '20px' }}>{fmtBetrag(summe)} €</span>
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>3 · Bitte überweisen an</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              <label><span style={lbl}>Kontoinhaber</span><input style={input} value={person.inhaber} onChange={setP('inhaber')} autoComplete="name" /></label>
              <div style={grid('2fr 1fr')}>
                <label><span style={lbl}>IBAN</span><input style={{ ...input, textTransform: 'uppercase' }} value={person.iban} onChange={setP('iban')} placeholder="DE…" autoComplete="off" /></label>
                <label><span style={lbl}>BIC</span><input style={{ ...input, textTransform: 'uppercase' }} value={person.bic} onChange={setP('bic')} autoComplete="off" /></label>
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>4 · Unterschrift</h2>
            <Unterschrift onChange={setUnterschrift} />
          </section>

          {fehler && <div role="alert" style={{ padding: '11px 14px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', borderRadius: '10px', color: '#fca5a5', fontSize: '14px' }}>{fehler}</div>}
          <button onClick={erstellen} disabled={laeuft} style={{ padding: '15px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', border: 'none', borderRadius: '12px', cursor: laeuft ? 'wait' : 'pointer', fontWeight: '800', fontSize: '16px', opacity: laeuft ? 0.7 : 1 }}>{laeuft ? 'PDF wird erstellt …' : '📄 PDF erstellen'}</button>
        </>)}
      </div>
    </div>
  );
}
