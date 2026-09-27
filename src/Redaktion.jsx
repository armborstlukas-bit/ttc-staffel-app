import { useCallback, useEffect, useRef, useState } from 'react';
import { Home, ArrowLeft, Bold, Heading2, List, Undo2, ImagePlus, Star, Trash2, Eye, CheckCircle2, X, Loader2, PenLine, Plus, ExternalLink, Search, AlignJustify, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

// ── Redaktion: Berichte für die Vereinswebseite schreiben ────────────────────────
// Die Berichte werden über die Schnittstelle der Webseite gespeichert (gleiches Firebase-Konto).
// Größen wie in den übrigen App-Bereichen (z. B. Rompel-Bereich).
const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://ttc-staffel-web.vercel.app';

const CATEGORIES = [
  { id: 'mannschaften', label: 'Mannschaften', hint: 'Punktspiele, Pokal' },
  { id: 'nachwuchs', label: 'Nachwuchs', hint: 'Jugend, Turniere, Lehrgänge' },
  { id: 'verein', label: 'Verein', hint: 'Feiern, Ehrungen, Termine' },
  { id: 'osterturnier', label: 'Osterturnier', hint: 'rund um Ostern' },
  { id: '', label: 'Keine Angabe', hint: 'nur unter „Alle“' },
];
const catLabel = (id) => (id === 'presse' ? 'Presse' : id && CATEGORIES.find(c => c.id === id)?.label) || 'Ohne Artikelart';
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const imgSrc = (u) => (u?.startsWith('/') ? WEB_URL + u : u);
const EMPTY = { title: '', category: '', html: '', images: [], date: today(), textAlign: 'justify' };
// Textausrichtung des Berichts auf der Webseite – Standard ist Blocksatz
const ALIGNS = [
  { id: 'justify', label: 'Blocksatz', Icon: AlignJustify },
  { id: 'left', label: 'Links', Icon: AlignLeft },
  { id: 'center', label: 'Mittig', Icon: AlignCenter },
  { id: 'right', label: 'Rechts', Icon: AlignRight },
];

const A = '#4ade80';
const C = {
  bg: 'linear-gradient(170deg,#06200f 0%,#0b2e17 45%,#051a0c 100%)',
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,222,128,0.14)', borderRadius: '16px', padding: '16px', marginBottom: '14px' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 13px', fontSize: '14px', color: 'white', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', outline: 'none' },
  muted: { color: 'rgba(255,255,255,0.58)' },
};
const btn = (kind = 'primary', extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 16px',
  fontSize: '14px', fontWeight: 700, borderRadius: '10px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
  ...(kind === 'primary' ? { background: A, color: '#052e16', border: 'none' }
    : kind === 'danger' ? { background: 'transparent', color: '#fca5a5', border: '1px solid rgba(252,165,165,0.35)' }
      : { background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.16)' }),
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
    <div className="ttc-view-enter" style={{ minHeight: '100vh', background: C.bg, color: 'white', fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", fontSize: '14px' }}>
      <div className="ttc-sticky-hdr-light" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onHome} aria-label="Zur Startseite" style={btn('ghost', { padding: '8px 11px' })}><Home size={16} /></button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, flex: 1, letterSpacing: '-0.3px' }}>✍️ Redaktion</h1>
        <a href={WEB_URL} target="_blank" rel="noopener noreferrer" style={btn('ghost', { padding: '8px 12px', fontSize: '13px' })}><ExternalLink size={15} />{!isMobile && ' Webseite'}</a>
      </div>
      <div style={{ padding: isMobile ? '14px' : '20px', maxWidth: '760px', margin: '0 auto' }}>
        {screen.name === 'list' && accessRow}
        {screen.name === 'list' && <Overview api={api} isMobile={isMobile} onNew={() => setScreen({ name: 'edit' })} onEdit={(id) => setScreen({ name: 'edit', id })} />}
        {screen.name === 'edit' && <Editor api={api} id={screen.id} isMobile={isMobile} onBack={() => setScreen({ name: 'list' })} onDone={(res) => setScreen({ name: 'done', ...res })} />}
        {screen.name === 'done' && <Done res={screen} onBack={() => setScreen({ name: 'list' })} />}
      </div>
    </div>
  );
}

function Overview({ api, isMobile, onNew, onEdit }) {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  // Suche erst nach kurzer Tipp-Pause auslösen
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback((p, q) => api(`/news?${new URLSearchParams({ seite: String(p), ...(q ? { q } : {}) })}`), [api]);

  useEffect(() => {
    let active = true;
    fetchPage(1, search)
      .then(d => { if (!active) return; setItems(d.items); setTotal(d.total); setHasMore(d.hasMore); setPage(1); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [search, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await fetchPage(page + 1, search);
      setItems(prev => [...(prev || []), ...d.items]);
      setHasMore(d.hasMore);
      setPage(page + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = async (n) => {
    if (!window.confirm(`„${n.title}“ wirklich löschen? Der Bericht verschwindet von der Webseite.`)) return;
    setDeleting(n.id);
    try {
      await api(`/news/${n.id}`, { method: 'DELETE' });
      setItems(list => list.filter(x => x.id !== n.id));
      setTotal(t => t - 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <button onClick={onNew} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'linear-gradient(120deg,#15803d,#22c55e)', color: 'white', marginBottom: '20px' }}>
        <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#bbf7d0', color: '#052e16', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Plus size={22} strokeWidth={2.6} /></span>
        <span><strong style={{ display: 'block', fontSize: '16px' }}>Neuen Bericht schreiben</strong><span style={{ fontSize: '13px', opacity: 0.9 }}>Überschrift, Text und Fotos – mehr braucht es nicht.</span></span>
      </button>

      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Berichte durchsuchen (z. B. Osterturnier 2019)" aria-label="Berichte durchsuchen" style={{ ...C.input, paddingLeft: '36px' }} />
      </div>
      <p style={{ ...C.muted, fontSize: '12px', margin: '0 0 10px' }}>{items ? `${total.toLocaleString('de-DE')} ${search ? 'Treffer' : 'Berichte'} · neueste zuerst` : ' '}</p>

      {error && <p style={alertS}>{error}</p>}
      {!items && !error && <Spinner />}
      {items?.length === 0 && <p style={C.muted}>{search ? 'Keine Berichte gefunden.' : 'Noch keine Berichte vorhanden.'}</p>}
      <div style={{ display: 'grid', gap: '8px' }}>
        {items?.map(n => (
          <div key={n.id} style={{ ...C.card, marginBottom: 0, padding: '10px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', opacity: deleting === n.id ? 0.5 : 1 }}>
            {n.coverImage ? <img src={imgSrc(n.coverImage)} alt="" loading="lazy" style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} /> : <div style={{ width: '64px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ ...C.muted, fontSize: '12px', marginTop: '3px' }}>
                <span style={{ ...badgeS, ...(n.status === 'draft' ? { background: 'rgba(250,204,21,0.18)', color: '#fde68a' } : {}) }}>{n.status === 'draft' ? 'Entwurf' : 'Online'}</span>
                {' '}{catLabel(n.category)} · {fmtDate(n.publishedAt)}{n.author ? ` · ${n.author}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: isMobile ? 'auto' : 0 }}>
              <button onClick={() => onEdit(n.id)} style={btn('ghost', { padding: '8px 12px', fontSize: '13px' })}><PenLine size={15} /> Bearbeiten</button>
              {n.status === 'published' && <a href={`${WEB_URL}/news/${n.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Auf der Webseite ansehen" title="Auf der Webseite ansehen" style={btn('ghost', { padding: '8px 10px' })}><Eye size={15} /></a>}
              <button onClick={() => remove(n)} disabled={deleting === n.id} aria-label="Bericht löschen" title="Bericht löschen" style={btn('danger', { padding: '8px 10px' })}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore} style={btn('ghost', { width: '100%', marginTop: '12px' })}>
          {loadingMore ? <><Loader2 size={15} className="ttc-spin" /> Lädt …</> : 'Weitere Berichte laden'}
        </button>
      )}
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
      setForm({ title: d.title, category: d.category || '', html: d.html, images: d.images || [], date: d.date || today(), textAlign: d.textAlign || 'justify' });
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
    if (!window.confirm('Diesen Bericht wirklich löschen? Er verschwindet von der Webseite.')) return;
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

  const toolBtn = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, color: 'white', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', cursor: 'pointer' };
  const blocked = busy || uploads > 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button onClick={back} style={btn('ghost', { padding: '8px 12px', fontSize: '13px' })}><ArrowLeft size={15} /> Übersicht</button>
        <h2 style={{ fontSize: '18px', margin: 0, flex: 1 }}>{id ? 'Bericht bearbeiten' : 'Neuer Bericht'}</h2>
      </div>

      {restored && (
        <div style={{ ...C.card, background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.3)', fontSize: '13px' }}>
          Dein zuletzt angefangener Bericht wurde wiederhergestellt.{' '}
          <button onClick={discardDraft} style={{ background: 'none', border: 'none', color: '#fde68a', textDecoration: 'underline', fontSize: '13px', cursor: 'pointer', padding: 0 }}>Verwerfen und neu beginnen</button>
        </div>
      )}

      <Step n="1" title="Überschrift">
        <input value={form.title} onChange={e => update({ title: e.target.value })} placeholder="z. B. Herren I gewinnt Derby gegen Elz" maxLength={160} style={{ ...C.input, fontSize: '15px', fontWeight: 600 }} aria-label="Überschrift" />
      </Step>

      <Step n="2" title="Worum geht es?" note="(freiwillig)">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '8px' }} role="radiogroup">
          {CATEGORIES.map(c => {
            const on = form.category === c.id;
            return (
              <button key={c.id} role="radio" aria-checked={on} onClick={() => update({ category: c.id })}
                style={{ textAlign: 'left', padding: '9px 11px', borderRadius: '10px', cursor: 'pointer', color: 'white', background: on ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? A : 'rgba(255,255,255,0.16)'}` }}>
                <strong style={{ display: 'block', fontSize: '14px' }}>{on ? '✓ ' : ''}{c.label}</strong>
                <span style={{ ...C.muted, fontSize: '11px' }}>{c.hint}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n="3" title="Text">
        <p style={{ ...C.muted, margin: '0 0 10px', fontSize: '12px' }}>Einfach hineinschreiben – oder einen fertigen Text aus Word bzw. einer E-Mail kopieren und hier einfügen.</p>
        <div role="toolbar" aria-label="Formatierung" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('bold')} style={toolBtn}><Bold size={14} /> Fett</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'h3')} style={toolBtn}><Heading2 size={14} /> Zwischenüberschrift</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'p')} style={toolBtn}>Normaler Text</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('insertUnorderedList')} style={toolBtn}><List size={14} /> Liste</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('undo')} style={toolBtn}><Undo2 size={14} /> Rückgängig</button>
        </div>
        <div role="radiogroup" aria-label="Ausrichtung" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
          <span style={{ ...C.muted, fontSize: '12px', marginRight: '2px' }}>Ausrichtung:</span>
          {ALIGNS.map(({ id: a, label, Icon }) => {
            const on = (form.textAlign || 'justify') === a;
            return (
              <button key={a} role="radio" aria-checked={on} onMouseDown={e => e.preventDefault()} onClick={() => update({ textAlign: a })}
                style={{ ...toolBtn, ...(on ? { background: 'rgba(74,222,128,0.16)', borderColor: A, color: '#bbf7d0' } : {}) }}>
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
        <div ref={editorRef} className="ttc-redaktion-editor" contentEditable suppressContentEditableWarning onInput={onInput} onPaste={onPaste}
          role="textbox" aria-multiline="true" aria-label="Text des Berichts" data-placeholder="Hier den Bericht schreiben …"
          lang="de" style={{ minHeight: '240px', padding: '12px 14px', fontSize: '15px', lineHeight: 1.65, color: '#111', background: '#fff', borderRadius: '10px', outline: 'none', overflowWrap: 'anywhere', textAlign: form.textAlign || 'justify', hyphens: 'auto', WebkitHyphens: 'auto' }} />
      </Step>

      <Step n="4" title="Fotos" note="(freiwillig)">
        <p style={{ ...C.muted, margin: '0 0 10px', fontSize: '12px' }}>Das erste Foto wird groß über dem Bericht gezeigt (Titelbild). Weitere Fotos erscheinen darunter.</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
        <button onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', borderRadius: '12px', border: '2px dashed rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.05)', color: '#bbf7d0', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
          <ImagePlus size={22} /> Fotos auswählen
        </button>
        {(form.images.length > 0 || uploads > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: '8px', marginTop: '12px' }}>
            {form.images.map((url, i) => (
              <div key={url} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${i === 0 ? A : 'transparent'}` }}>
                <img src={imgSrc(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0
                  ? <span style={{ ...photoTag, background: A, color: '#052e16' }}><Star size={11} /> Titelbild</span>
                  : <button onClick={() => update({ images: [url, ...form.images.filter(u => u !== url)] })} style={{ ...photoTag, border: 'none', cursor: 'pointer' }}><Star size={11} /> Titelbild</button>}
                <button onClick={() => update({ images: form.images.filter(u => u !== url) })} aria-label="Foto entfernen" style={{ position: 'absolute', top: '4px', right: '4px', width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.95)', color: '#b91c1c', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            ))}
            {Array.from({ length: uploads }).map((_, i) => (
              <div key={`u${i}`} style={{ aspectRatio: '4/3', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                <Loader2 size={20} className="ttc-spin" /> lädt hoch …
              </div>
            ))}
          </div>
        )}
      </Step>

      <Step n="5" title="Datum">
        <input type="date" value={form.date} onChange={e => update({ date: e.target.value })} style={{ ...C.input, maxWidth: '200px', colorScheme: 'dark' }} aria-label="Datum" />
      </Step>

      {error && <p role="alert" style={alertS}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '8px', justifyContent: 'flex-end', padding: '12px 0 6px', position: 'sticky', bottom: 0, background: 'linear-gradient(to top, #051a0c 70%, rgba(5,26,12,0))' }}>
        {id && <button onClick={remove} disabled={busy} style={btn('danger', isMobile ? {} : { marginRight: 'auto' })}><Trash2 size={15} /> Löschen</button>}
        <button onClick={() => { update({ html: editorRef.current.innerHTML }); setPreview(true); }} style={btn('ghost')}><Eye size={15} /> Vorschau</button>
        <button disabled={blocked} onClick={() => save('draft')} style={btn('ghost')}>{status === 'published' ? 'Offline nehmen' : 'Als Entwurf speichern'}</button>
        <button disabled={blocked} onClick={() => save('published')} style={btn('primary', { opacity: blocked ? 0.6 : 1 })}>
          {busy ? 'Wird gespeichert …' : uploads > 0 ? 'Fotos werden hochgeladen …' : id && status === 'published' ? 'Änderungen speichern' : 'Veröffentlichen'}
        </button>
      </div>

      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Vorschau" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', overflowY: 'auto', padding: '16px 10px' }}>
          <div style={{ background: '#f3f1ea', color: '#0b1a11', maxWidth: '720px', margin: '0 auto', borderRadius: '14px', padding: isMobile ? '16px' : '28px' }}>
            <button onClick={() => setPreview(false)} style={btn('ghost', { color: '#0b1a11', borderColor: 'rgba(11,26,17,0.3)', background: 'transparent', marginBottom: '14px' })}><X size={15} /> Vorschau schließen</button>
            <p style={{ margin: '0 0 6px', color: '#5f6b63', fontSize: '13px' }}>{catLabel(form.category)} · {fmtDate(form.date)}</p>
            <h1 style={{ fontSize: isMobile ? '24px' : '32px', lineHeight: 1.1, margin: '0 0 16px' }}>{form.title || 'Ohne Überschrift'}</h1>
            {form.images[0] && <img src={imgSrc(form.images[0])} alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />}
            <div className="ttc-redaktion-preview" lang="de" style={{ fontSize: '16px', lineHeight: 1.65, textAlign: form.textAlign || 'justify', hyphens: 'auto', WebkitHyphens: 'auto' }} dangerouslySetInnerHTML={{ __html: form.html }} />
            {form.images.length > 1 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '6px', marginTop: '18px' }}>{form.images.slice(1).map(u => <img key={u} src={imgSrc(u)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />)}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function Done({ res, onBack }) {
  const online = res.status === 'published';
  return (
    <div style={{ textAlign: 'center', paddingTop: '24px' }}>
      <CheckCircle2 size={56} color={A} style={{ margin: '0 auto 12px' }} />
      <h2 style={{ fontSize: '20px', margin: '0 0 8px' }}>{online ? 'Der Bericht ist online!' : 'Entwurf gespeichert'}</h2>
      <p style={{ ...C.muted, fontSize: '14px' }}>{online ? 'Er erscheint ab sofort auf der Webseite unter „Aktuelles“.' : 'Der Bericht ist noch nicht öffentlich und kann jederzeit weiter bearbeitet werden.'}</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
        {online && <a href={`${WEB_URL}/news/${res.slug}`} target="_blank" rel="noopener noreferrer" style={btn('primary')}><Eye size={15} /> Bericht ansehen</a>}
        <button onClick={onBack} style={btn('ghost')}>Zurück zur Übersicht</button>
      </div>
    </div>
  );
}

function Step({ n, title, note, children }) {
  return (
    <section style={C.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: A, color: '#052e16', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: A }}>{title} {note && <span style={{ ...C.muted, fontSize: '12px', fontWeight: 400 }}>{note}</span>}</h3>
      </div>
      {children}
    </section>
  );
}

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><Loader2 size={28} className="ttc-spin" color={A} /></div>;
}

const alertS = { background: 'rgba(248,113,113,0.1)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.35)', padding: '10px 13px', borderRadius: '10px', margin: '12px 0', fontSize: '13px' };
const badgeS = { display: 'inline-block', padding: '1px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(74,222,128,0.16)', color: '#bbf7d0' };
const photoTag = { position: 'absolute', left: '4px', bottom: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.95)', color: '#111' };
