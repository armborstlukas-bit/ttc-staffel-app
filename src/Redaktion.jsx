import { useCallback, useEffect, useRef, useState } from 'react';
import { Home, ArrowLeft, Bold, Heading2, List, Undo2, ImagePlus, Star, Trash2, Eye, CheckCircle2, X, Loader2, PenLine, Plus, ExternalLink } from 'lucide-react';

// ── Redaktion: Berichte für die Vereinswebseite schreiben ────────────────────────
// Die Berichte werden über die Schnittstelle der Webseite gespeichert (gleiches Firebase-Konto).
// Bewusst große Schrift und Knöpfe – die Redaktion soll auch ohne Einweisung bedienbar sein.
const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://ttc-staffel-web.vercel.app';

const CATEGORIES = [
  { id: 'mannschaften', label: 'Mannschaften', hint: 'Punktspiele, Pokal' },
  { id: 'nachwuchs', label: 'Nachwuchs', hint: 'Jugend, Turniere, Lehrgänge' },
  { id: 'verein', label: 'Verein', hint: 'Feiern, Ehrungen, Termine' },
  { id: 'osterturnier', label: 'Osterturnier', hint: 'rund um Ostern' },
  { id: 'presse', label: 'Presse', hint: 'Zeitungsartikel' },
];
const catLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || 'Verein';
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const imgSrc = (u) => (u?.startsWith('/') ? WEB_URL + u : u);
const EMPTY = { title: '', category: '', html: '', images: [], date: today() };

const A = '#4ade80';
const C = {
  bg: 'linear-gradient(170deg,#06200f 0%,#0b2e17 45%,#051a0c 100%)',
  card: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: '18px', padding: '20px', marginBottom: '16px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '15px 16px', fontSize: '18px', color: 'white', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)', borderRadius: '14px', outline: 'none', minHeight: '58px' },
  muted: { color: 'rgba(255,255,255,0.66)' },
};
const btn = (kind = 'primary', extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '58px', padding: '12px 22px',
  fontSize: '18px', fontWeight: 800, borderRadius: '14px', cursor: 'pointer', textDecoration: 'none',
  ...(kind === 'primary' ? { background: A, color: '#052e16', border: 'none' }
    : kind === 'danger' ? { background: 'transparent', color: '#fca5a5', border: '2px solid rgba(252,165,165,0.4)' }
      : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '2px solid rgba(255,255,255,0.2)' }),
  ...extra,
});

// ---------- Text beim Einfügen (z. B. aus Word) auf einfache Formatierungen reduzieren ----------
const KEEP = { P: 'p', DIV: 'p', BR: 'br', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', UL: 'ul', OL: 'ol', LI: 'li', A: 'a' };
const esc = (t) => t.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
function cleanPaste(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node) => {
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { out += esc(child.textContent); continue; }
      if (child.nodeType !== 1 || ['STYLE', 'SCRIPT', 'META', 'TITLE', 'XML'].includes(child.tagName) || child.tagName.includes(':')) continue;
      const tag = KEEP[child.tagName];
      const inner = walk(child);
      if (!tag) { out += inner; continue; }
      if (tag === 'br') { out += '<br>'; continue; }
      if (tag === 'a') { const href = child.getAttribute('href') || ''; out += /^https?:/.test(href) ? `<a href="${href.replace(/"/g, '&quot;')}">${inner}</a>` : inner; continue; }
      if (!inner.replace(/&nbsp;|\s|<br>/g, '')) continue;
      out += `<${tag}>${inner}</${tag}>`;
    }
    return out;
  };
  return walk(doc.body);
}
const textToHtml = (text) => text.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\r?\n/g, '<br>')}</p>`).join('');

// ---------- Fotos im Browser verkleinern (schneller Upload auch mit mobilem Internet) ----------
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export default function Redaktion({ user, isMobile, onHome, accessRow }) {
  const [screen, setScreen] = useState({ name: 'list' }); // list | edit | done

  const api = useCallback(async (path, { method = 'GET', body, form } = {}) => {
    const token = await user.getIdToken();
    const res = await fetch(`${WEB_URL}/api/redaktion${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: form || (body ? JSON.stringify(body) : undefined),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    return data;
  }, [user]);

  return (
    <div className="ttc-view-enter" style={{ minHeight: '100vh', background: C.bg, color: 'white', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", fontSize: '18px' }}>
      <div className="ttc-sticky-hdr-light" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onHome} aria-label="Zur Startseite" style={{ ...btn('ghost', { minHeight: '46px', padding: '8px 14px' }) }}><Home size={22} /></button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, flex: 1 }}>✍️ Redaktion</h1>
        <a href={WEB_URL} target="_blank" rel="noopener noreferrer" style={{ ...btn('ghost', { minHeight: '46px', padding: '8px 14px', fontSize: '15px' }) }}><ExternalLink size={18} />{!isMobile && ' Webseite'}</a>
      </div>
      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '820px', margin: '0 auto' }}>
        {screen.name === 'list' && accessRow}
        {screen.name === 'list' && <Overview api={api} onNew={() => setScreen({ name: 'edit' })} onEdit={(id) => setScreen({ name: 'edit', id })} />}
        {screen.name === 'edit' && <Editor api={api} id={screen.id} isMobile={isMobile} onBack={() => setScreen({ name: 'list' })} onDone={(res) => setScreen({ name: 'done', ...res })} />}
        {screen.name === 'done' && <Done res={screen} onBack={() => setScreen({ name: 'list' })} />}
      </div>
    </div>
  );
}

function Overview({ api, onNew, onEdit }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/news').then(d => setItems(d.items)).catch(e => setError(e.message)); }, [api]);

  return (
    <>
      <button onClick={onNew} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '18px', padding: '22px', borderRadius: '20px', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'linear-gradient(120deg,#15803d,#22c55e)', color: 'white', boxShadow: '0 12px 30px rgba(34,197,94,0.25)', marginBottom: '28px' }}>
        <span style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#bbf7d0', color: '#052e16', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Plus size={36} strokeWidth={2.6} /></span>
        <span><strong style={{ display: 'block', fontSize: '22px' }}>Neuen Bericht schreiben</strong><span style={{ fontSize: '16px', opacity: 0.92 }}>Überschrift, Text und Fotos – mehr braucht es nicht.</span></span>
      </button>

      <h2 style={{ fontSize: '20px', margin: '0 0 12px' }}>Zuletzt bearbeitet</h2>
      {error && <p style={alertS}>{error}</p>}
      {!items && !error && <Spinner />}
      {items?.length === 0 && <p style={C.muted}>Noch keine Berichte vorhanden.</p>}
      <div style={{ display: 'grid', gap: '10px' }}>
        {items?.map(n => (
          <div key={n.id} style={{ ...C.card, marginBottom: 0, padding: '14px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            {n.coverImage ? <img src={imgSrc(n.coverImage)} alt="" style={{ width: '84px', height: '64px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} /> : <div style={{ width: '84px', height: '64px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontWeight: 700, fontSize: '17px', lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ ...C.muted, fontSize: '14px', marginTop: '4px' }}>
                <span style={{ ...badgeS, ...(n.status === 'draft' ? { background: 'rgba(250,204,21,0.18)', color: '#fde68a' } : {}) }}>{n.status === 'draft' ? 'Entwurf' : 'Online'}</span>
                {' '}{catLabel(n.category)} · {fmtDate(n.publishedAt)}{n.author ? ` · ${n.author}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onEdit(n.id)} style={btn('ghost', { minHeight: '50px', fontSize: '16px' })}><PenLine size={20} /> Bearbeiten</button>
              {n.status === 'published' && <a href={`${WEB_URL}/news/${n.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Auf der Webseite ansehen" style={btn('ghost', { minHeight: '50px', padding: '10px 14px' })}><Eye size={20} /></a>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Editor({ api, id, isMobile, onBack, onDone }) {
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const draftKey = `ttc-bericht-${id || 'neu'}`;
  const [initialDraft] = useState(() => {
    if (id) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      return saved && (saved.title || saved.html) ? { ...EMPTY, ...saved } : null;
    } catch { return null; }
  });
  const [form, setForm] = useState(initialDraft || EMPTY);
  const [loaded, setLoaded] = useState(!id);
  const [status, setStatus] = useState('draft');
  const [uploads, setUploads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(!!initialDraft);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);

  const update = useCallback((patch) => { setForm(f => ({ ...f, ...patch })); setDirty(true); }, []);

  useEffect(() => {
    if (!id) return;
    api(`/news/${id}`).then(d => {
      setForm({ title: d.title, category: d.category, html: d.html, images: d.images || [], date: d.date || today() });
      setStatus(d.status);
      setLoaded(true);
    }).catch(e => setError(e.message));
  }, [id, api]);

  useEffect(() => {
    if (loaded && editorRef.current && editorRef.current.innerHTML !== form.html) editorRef.current.innerHTML = form.html;
    // nur beim Laden setzen – danach ist das Textfeld selbst die Quelle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, restored]);

  // Zwischenspeichern auf dem Gerät, damit nichts verloren geht
  useEffect(() => {
    if (!dirty || id) return;
    const t = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* Speicher voll */ } }, 500);
    return () => clearTimeout(t);
  }, [form, dirty, id, draftKey]);

  const onInput = () => update({ html: editorRef.current.innerHTML });
  const onPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? cleanPaste(html) : textToHtml(text));
    onInput();
  };
  const cmd = (command, value) => { editorRef.current.focus(); document.execCommand(command, false, value); onInput(); };

  const addPhotos = async (files) => {
    setError('');
    const list = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    setUploads(n => n + list.length);
    for (const file of list) {
      try {
        const small = await shrink(file);
        const fd = new FormData();
        fd.append('file', small);
        const { url } = await api('/upload', { method: 'POST', form: fd });
        setForm(f => ({ ...f, images: [...f.images, url] }));
        setDirty(true);
      } catch (e) {
        setError(`Ein Foto konnte nicht hochgeladen werden: ${e.message}`);
      } finally {
        setUploads(n => n - 1);
      }
    }
  };

  const save = async (targetStatus) => {
    setError('');
    const body = { ...form, html: editorRef.current?.innerHTML || form.html, status: targetStatus };
    if (!body.title.trim()) return setError('Bitte oben eine Überschrift eingeben (Schritt 1).');
    if (!body.category) return setError('Bitte auswählen, worum es geht (Schritt 2).');
    setBusy(true);
    try {
      const res = id ? await api(`/news/${id}`, { method: 'PUT', body }) : await api('/news', { method: 'POST', body });
      try { localStorage.removeItem(draftKey); } catch { /* egal */ }
      window.scrollTo({ top: 0 });
      onDone({ ...res, status: targetStatus });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Diesen Bericht wirklich von der Webseite nehmen?')) return;
    setBusy(true);
    try { await api(`/news/${id}`, { method: 'DELETE' }); onBack(); } catch (e) { setError(e.message); setBusy(false); }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* egal */ }
    setForm(EMPTY); setRestored(false); setDirty(false);
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  // Neue Berichte sind auf dem Gerät zwischengespeichert – nur beim Bearbeiten nachfragen
  const back = () => { if (!dirty || !id || window.confirm('Änderungen verwerfen und zurück zur Übersicht?')) onBack(); };

  if (!loaded) return error ? <p style={alertS}>{error}</p> : <Spinner />;

  const toolBtn = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', minHeight: '48px', fontSize: '15px', fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' };

  return (
    <>
      <button onClick={back} style={{ ...btn('ghost', { minHeight: '46px', fontSize: '16px', marginBottom: '16px' }) }}><ArrowLeft size={20} /> Zurück zur Übersicht</button>
      <h2 style={{ fontSize: '26px', margin: '0 0 18px' }}>{id ? 'Bericht bearbeiten' : 'Neuer Bericht'}</h2>

      {restored && (
        <div style={{ ...C.card, background: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.35)' }}>
          Dein zuletzt angefangener Bericht wurde wiederhergestellt.{' '}
          <button onClick={discardDraft} style={{ background: 'none', border: 'none', color: '#fde68a', textDecoration: 'underline', fontSize: '16px', cursor: 'pointer', padding: '8px 0' }}>Verwerfen und neu beginnen</button>
        </div>
      )}

      <Step n="1" title="Überschrift">
        <input value={form.title} onChange={e => update({ title: e.target.value })} placeholder="z. B. Herren I gewinnt Derby gegen Elz" maxLength={160} style={{ ...C.input, fontSize: '20px', fontWeight: 700 }} aria-label="Überschrift" />
      </Step>

      <Step n="2" title="Worum geht es?">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }} role="radiogroup">
          {CATEGORIES.map(c => {
            const on = form.category === c.id;
            return (
              <button key={c.id} role="radio" aria-checked={on} onClick={() => update({ category: c.id })}
                style={{ textAlign: 'left', padding: '14px 16px', minHeight: '68px', borderRadius: '14px', cursor: 'pointer', color: 'white', background: on ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.05)', border: `2px solid ${on ? A : 'rgba(255,255,255,0.18)'}` }}>
                <strong style={{ display: 'block', fontSize: '18px' }}>{on ? '✓ ' : ''}{c.label}</strong>
                <span style={{ ...C.muted, fontSize: '14px' }}>{c.hint}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n="3" title="Text">
        <p style={{ ...C.muted, margin: '-4px 0 12px', fontSize: '16px' }}>Einfach hineinschreiben – oder einen fertigen Text aus Word bzw. einer E-Mail kopieren und hier einfügen.</p>
        <div role="toolbar" aria-label="Formatierung" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('bold')} style={toolBtn}><Bold size={18} /> Fett</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'h3')} style={toolBtn}><Heading2 size={18} /> Zwischenüberschrift</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'p')} style={toolBtn}>Normaler Text</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('insertUnorderedList')} style={toolBtn}><List size={18} /> Liste</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('undo')} style={toolBtn}><Undo2 size={18} /> Rückgängig</button>
        </div>
        <div ref={editorRef} className="ttc-redaktion-editor" contentEditable suppressContentEditableWarning onInput={onInput} onPaste={onPaste}
          role="textbox" aria-multiline="true" aria-label="Text des Berichts" data-placeholder="Hier den Bericht schreiben …"
          style={{ minHeight: '300px', padding: '16px', fontSize: '18px', lineHeight: 1.7, color: '#111', background: '#fff', borderRadius: '14px', outline: 'none', overflowWrap: 'anywhere' }} />
      </Step>

      <Step n="4" title="Fotos" note="(freiwillig)">
        <p style={{ ...C.muted, margin: '-4px 0 12px', fontSize: '16px' }}>Das erste Foto wird groß über dem Bericht gezeigt (Titelbild). Weitere Fotos erscheinen darunter.</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
        <button onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '26px 16px', borderRadius: '16px', border: '3px dashed rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.06)', color: '#bbf7d0', cursor: 'pointer', fontSize: '16px' }}>
          <ImagePlus size={40} />
          <strong style={{ fontSize: '20px', color: 'white' }}>Fotos auswählen</strong>
          <span>vom Handy oder Computer</span>
        </button>
        {(form.images.length > 0 || uploads > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '10px', marginTop: '14px' }}>
            {form.images.map((url, i) => (
              <div key={url} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', border: `3px solid ${i === 0 ? A : 'transparent'}` }}>
                <img src={imgSrc(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0
                  ? <span style={{ ...photoTag, background: A, color: '#052e16' }}><Star size={14} /> Titelbild</span>
                  : <button onClick={() => update({ images: [url, ...form.images.filter(u => u !== url)] })} style={{ ...photoTag, border: 'none', cursor: 'pointer' }}><Star size={14} /> Als Titelbild</button>}
                <button onClick={() => update({ images: form.images.filter(u => u !== url) })} aria-label="Foto entfernen" style={{ position: 'absolute', top: '6px', right: '6px', width: '42px', height: '42px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.95)', color: '#b91c1c', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Trash2 size={20} /></button>
              </div>
            ))}
            {Array.from({ length: uploads }).map((_, i) => (
              <div key={`u${i}`} style={{ aspectRatio: '4/3', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}>
                <Loader2 size={30} className="ttc-spin" /> wird hochgeladen …
              </div>
            ))}
          </div>
        )}
      </Step>

      <Step n="5" title="Datum">
        <input type="date" value={form.date} onChange={e => update({ date: e.target.value })} style={{ ...C.input, maxWidth: '260px', colorScheme: 'dark' }} aria-label="Datum" />
      </Step>

      {error && <p role="alert" style={alertS}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '10px', justifyContent: 'flex-end', padding: '16px 0 8px', position: 'sticky', bottom: 0, background: 'linear-gradient(to top, #051a0c 70%, rgba(5,26,12,0))' }}>
        <button onClick={() => { update({ html: editorRef.current.innerHTML }); setPreview(true); }} style={btn('ghost')}><Eye size={22} /> Vorschau</button>
        <button disabled={busy || uploads > 0} onClick={() => save('draft')} style={btn('ghost')}>{status === 'published' ? 'Offline nehmen' : 'Als Entwurf speichern'}</button>
        <button disabled={busy || uploads > 0} onClick={() => save('published')} style={btn('primary', { fontSize: '20px', minHeight: '64px', opacity: busy || uploads > 0 ? 0.6 : 1 })}>
          {busy ? 'Wird gespeichert …' : uploads > 0 ? 'Fotos werden hochgeladen …' : id && status === 'published' ? 'Änderungen speichern' : 'Jetzt veröffentlichen'}
        </button>
      </div>
      {id && <button onClick={remove} disabled={busy} style={btn('danger', { marginTop: '14px', width: isMobile ? '100%' : 'auto' })}><Trash2 size={20} /> Bericht löschen</button>}

      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Vorschau" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', overflowY: 'auto', padding: '16px 10px' }}>
          <div style={{ background: '#f3f1ea', color: '#0b1a11', maxWidth: '760px', margin: '0 auto', borderRadius: '18px', padding: isMobile ? '18px' : '32px' }}>
            <button onClick={() => setPreview(false)} style={{ ...btn('ghost', { color: '#0b1a11', borderColor: '#0b1a11', minHeight: '48px', marginBottom: '18px' }) }}><X size={20} /> Vorschau schließen</button>
            <p style={{ margin: '0 0 6px', color: '#5f6b63', fontSize: '15px' }}>{catLabel(form.category)} · {fmtDate(form.date)}</p>
            <h1 style={{ fontSize: isMobile ? '28px' : '38px', lineHeight: 1.05, margin: '0 0 18px' }}>{form.title || 'Ohne Überschrift'}</h1>
            {form.images[0] && <img src={imgSrc(form.images[0])} alt="" style={{ width: '100%', borderRadius: '10px', marginBottom: '18px' }} />}
            <div className="ttc-redaktion-preview" style={{ fontSize: '18px', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: form.html }} />
            {form.images.length > 1 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '6px', marginTop: '20px' }}>{form.images.slice(1).map(u => <img key={u} src={imgSrc(u)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />)}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function Done({ res, onBack }) {
  const online = res.status === 'published';
  return (
    <div style={{ textAlign: 'center', paddingTop: '30px' }}>
      <CheckCircle2 size={90} color={A} style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: '28px', margin: '0 0 10px' }}>{online ? 'Geschafft – der Bericht ist online!' : 'Entwurf gespeichert'}</h2>
      <p style={{ ...C.muted, fontSize: '18px' }}>{online ? 'Er erscheint ab sofort auf der Webseite unter „Aktuelles“.' : 'Der Bericht ist noch nicht öffentlich und kann jederzeit weiter bearbeitet werden.'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', margin: '28px auto 0' }}>
        {online && <a href={`${WEB_URL}/news/${res.slug}`} target="_blank" rel="noopener noreferrer" style={btn('primary')}><Eye size={22} /> Bericht ansehen</a>}
        <button onClick={onBack} style={btn('ghost')}>Zurück zur Übersicht</button>
      </div>
    </div>
  );
}

function Step({ n, title, note, children }) {
  return (
    <section style={C.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: A, color: '#052e16', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: '22px' }}>{title} {note && <span style={{ ...C.muted, fontSize: '16px', fontWeight: 400 }}>{note}</span>}</h3>
      </div>
      {children}
    </section>
  );
}

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={40} className="ttc-spin" color={A} /></div>;
}

const alertS = { background: 'rgba(248,113,113,0.12)', color: '#fecaca', border: '2px solid rgba(248,113,113,0.4)', padding: '14px 16px', borderRadius: '14px', margin: '16px 0', fontSize: '17px' };
const badgeS = { display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: 'rgba(74,222,128,0.18)', color: '#bbf7d0' };
const photoTag = { position: 'absolute', left: '6px', bottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, background: 'rgba(255,255,255,0.95)', color: '#111' };
