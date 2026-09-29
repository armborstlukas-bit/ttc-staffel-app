import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, ArrowLeft, Bold, Italic, Underline, Heading2, List, Undo2, ImagePlus, Star, ArrowUp, ArrowDown, PanelLeft, PanelRight, RectangleHorizontal, Trash2, Eye, CheckCircle2, X, Loader2, PenLine, Plus, ExternalLink, Search, AlignJustify, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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
const EMPTY = { title: '', category: '', html: '', images: [], coverImage: '', date: today(), textAlign: 'justify' };

// ---------- Fotos im Schreibfeld: Adressen für die Anzeige in der App vollständig machen, beim Speichern wieder kürzen ----------
const absImages = (html) => (html || '').replace(/(src=")(\/media\/web\/)/g, `$1${WEB_URL}$2`);
const toEditorHtml = (html) => absImages(html).replace(/<figure(?=[\s>])/g, '<figure contenteditable="false"');
const fromEditorHtml = (html) => (html || '').split(`${WEB_URL}/media/web/`).join('/media/web/')
  .replace(/ contenteditable="false"/g, '').replace(/\s*ttc-img-(sel|drag)/g, '').replace(/ class="\s*"/g, '');
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
  const [tab, setTab] = useState('berichte'); // berichte | news

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
        {screen.name === 'list' && (
          <div role="tablist" aria-label="Bereich" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,222,128,0.14)', borderRadius: '12px' }}>
            {[['berichte', '📰 Berichte'], ['news', '📣 TTC News']].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                style={{ padding: '9px 10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, background: tab === key ? A : 'transparent', color: tab === key ? '#052e16' : 'rgba(255,255,255,0.75)' }}>{label}</button>
            ))}
          </div>
        )}
        {screen.name === 'list' && tab === 'news' && <TickerManager api={api} isMobile={isMobile} />}
        {screen.name === 'list' && tab === 'berichte' && <Overview api={api} isMobile={isMobile} onNew={() => setScreen({ name: 'edit' })} onEdit={(id) => setScreen({ name: 'edit', id })} />}
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
      setForm({ title: d.title, category: d.category || '', html: d.html, images: d.images || [], coverImage: d.coverImage || '', date: d.date || today(), textAlign: d.textAlign || 'justify' });
      setStatus(d.status);
      setLoaded(true);
    }).catch(e => setError(e.message));
  }, [id, api]);

  useEffect(() => {
    if (loaded && editorRef.current) editorRef.current.innerHTML = toEditorHtml(form.html);
    // nur beim Laden setzen – danach ist das Textfeld selbst die Quelle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, restored]);

  // Zwischenspeichern auf dem Gerät, damit nichts verloren geht
  useEffect(() => {
    if (!dirty || id) return;
    const t = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* Speicher voll */ } }, 500);
    return () => clearTimeout(t);
  }, [form, dirty, id, draftKey]);

  const onInput = () => update({ html: fromEditorHtml(editorRef.current.innerHTML) });

  // Letzte Schreibstelle merken – dort landen eingefügte Fotos
  const lastRange = useRef(null);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false });
  const [sel, setSel] = useState(null); // ausgewähltes Foto im Text: { el, block, top }
  const wrapRef = useRef(null);
  useEffect(() => {
    const onSel = () => {
      const root = editorRef.current; const s = window.getSelection();
      if (!root || !s?.rangeCount || !root.contains(s.anchorNode)) return;
      lastRange.current = s.getRangeAt(0).cloneRange();
      setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  // oberster Absatz im Schreibfeld, der den Knoten enthält
  const topBlock = (node) => {
    const root = editorRef.current;
    if (!node || node === root || !root.contains(node)) return null;
    while (node.parentNode && node.parentNode !== root) node = node.parentNode;
    return node.parentNode === root ? node : null;
  };
  // Lage eines Fotos relativ zum Schreibfeld-Rahmen (für Anfasser und Leiste)
  const measure = (el) => {
    const r = el.getBoundingClientRect(), w = wrapRef.current.getBoundingClientRect();
    return { top: r.top - w.top, left: r.left - w.left, width: r.width, height: r.height };
  };
  const clearSel = () => { editorRef.current?.querySelectorAll('.ttc-img-sel').forEach(e => e.classList.remove('ttc-img-sel')); setSel(null); };
  const selectImg = (el) => {
    clearSel();
    const target = el.closest('figure') || el;
    target.classList.add('ttc-img-sel');
    setSel({ el: target, block: topBlock(target), rect: measure(target) });
  };
  const insertPhoto = (url, after) => {
    const root = editorRef.current;
    const fig = document.createElement('figure');
    fig.setAttribute('contenteditable', 'false');
    const img = document.createElement('img');
    img.src = imgSrc(url); img.alt = '';
    fig.appendChild(img);
    const block = after !== undefined ? after : topBlock(lastRange.current?.startContainer);
    if (block) block.after(fig); else root.appendChild(fig);
    if (!fig.nextElementSibling) { const p = document.createElement('p'); p.innerHTML = '<br>'; fig.after(p); }
    onInput();
    selectImg(img);
    fig.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const moveSel = (dir) => {
    if (!sel?.block) return;
    const b = sel.block;
    if (dir < 0 && b.previousElementSibling) b.previousElementSibling.before(b);
    if (dir > 0 && b.nextElementSibling) b.nextElementSibling.after(b);
    onInput(); selectImg(sel.el.querySelector?.('img') || sel.el);
    sel.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const removeSel = () => {
    if (!sel) return;
    const b = sel.block;
    sel.el.remove();
    if (b && b !== sel.el && !b.textContent.trim() && !b.querySelector('img')) b.remove();
    clearSel(); onInput();
  };
  // Foto im Text: links / volle Breite / rechts (Text fließt neben schmalen Fotos weiter)
  const getW = (fig) => Number(fig.className.match(/img-w-(\d+)/)?.[1]) || null;
  const setW = (fig, pct) => { [...fig.classList].filter(c => /^img-w-/.test(c)).forEach(c => fig.classList.remove(c)); if (pct) fig.classList.add(`img-w-${pct}`); };
  const figureFor = (el) => {
    let fig = el.tagName === 'FIGURE' ? el : el.closest('figure');
    if (!fig) { // alte Berichte: Foto ohne Rahmen – in einen Rahmen setzen
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      fig = document.createElement('figure');
      fig.setAttribute('contenteditable', 'false');
      const block = topBlock(img);
      img.classList.remove('ttc-img-sel');
      if (block && block !== img) { if (!block.textContent.replace(/\s/g, '') && block.querySelectorAll('img').length === 1) block.replaceWith(fig); else block.after(fig); } else editorRef.current.appendChild(fig);
      fig.appendChild(img);
    }
    return fig;
  };
  const ensureFigure = () => figureFor(sel.el);

  // Foto mit Maus oder Finger an eine andere Stelle im Text ziehen (verschiebt – keine Kopie)
  const [dropLine, setDropLine] = useState(null);
  const onEditorPointerDown = (e) => {
    const img = e.target.closest?.('img');
    if (!img || !editorRef.current.contains(img) || e.button > 0) return;
    // Finger: erst antippen (Auswahl), dann ziehen – so bleibt die Seite über Fotos scrollbar
    if (e.pointerType === 'touch' && !(img.closest('figure') || img).classList.contains('ttc-img-sel')) return;
    e.preventDefault();
    const fig = figureFor(img);
    selectImg(fig.querySelector('img'));
    const root = editorRef.current;
    const startY = e.clientY, startX = e.clientX;
    let dragging = false, target = null;
    const move = (ev) => {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      if (!dragging) { dragging = true; fig.classList.add('ttc-img-drag'); }
      // Absatz unter dem Zeiger suchen – obere Hälfte: davor, untere Hälfte: dahinter
      const blocks = [...root.children].filter(b => b !== fig);
      let best = null;
      for (const b of blocks) {
        const r = b.getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) { best = { block: b, before: true }; break; }
        best = { block: b, before: false };
      }
      target = best;
      if (best) {
        const r = best.block.getBoundingClientRect(), w = wrapRef.current.getBoundingClientRect();
        setDropLine((best.before ? r.top - 4 : r.bottom + 2) - w.top);
      }
      // am Rand automatisch mitscrollen
      if (ev.clientY < 60) window.scrollBy(0, -12); else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      fig.classList.remove('ttc-img-drag'); setDropLine(null);
      if (dragging && target) { if (target.before) target.block.before(fig); else target.block.after(fig); }
      onInput(); selectImg(fig.querySelector('img'));
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  // Seite wählen: links / mittig / rechts – die Größe bleibt, neben Text startet ein großes Foto mit 45 %
  const placeSel = (side) => {
    if (!sel) return;
    const fig = ensureFigure();
    fig.classList.remove('img-left', 'img-right');
    if (side) { fig.classList.add(side === 'left' ? 'img-left' : 'img-right'); if (!getW(fig)) setW(fig, 45); }
    onInput(); selectImg(fig.querySelector('img'));
  };
  // Größe an den Ecken ziehen (Maus und Finger). Ab 85 % wird das Foto automatisch volle Breite.
  const [sizeLabel, setSizeLabel] = useState('');
  const onHandleDown = (e) => startResize(e, e.currentTarget.dataset.corner);
  const startResize = (e, corner) => {
    if (!sel) return;
    e.preventDefault(); e.stopPropagation();
    const fig = ensureFigure();
    const side = fig.classList.contains('img-left') ? 'img-left' : fig.classList.contains('img-right') ? 'img-right' : '';
    const cs = getComputedStyle(editorRef.current);
    const full = editorRef.current.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const startW = fig.getBoundingClientRect().width, startX = e.clientX;
    const sign = corner.includes('r') ? 1 : -1;
    const centered = !side && getW(fig);
    const move = (ev) => {
      const w = startW + sign * (ev.clientX - startX) * (centered ? 2 : 1);
      const pct = Math.max(15, Math.min(100, Math.round((w / full) * 20) * 5));
      if (pct >= 85) { setW(fig, null); fig.classList.remove('img-left', 'img-right'); setSizeLabel('Volle Breite'); }
      else { setW(fig, pct); if (side && !fig.classList.contains(side)) fig.classList.add(side); setSizeLabel(`${pct} %`); }
      setSel(s => s && ({ ...s, el: fig, rect: measure(fig) }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      setSizeLabel(''); onInput(); selectImg(fig.querySelector('img'));
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const selSide = sel ? ((sel.el.closest?.('figure') || sel.el).classList.contains('img-left') ? 'left' : (sel.el.closest?.('figure') || sel.el).classList.contains('img-right') ? 'right' : '') : '';
  const onEditorClick = (e) => {
    const img = e.target.closest?.('img');
    if (img && editorRef.current.contains(img)) selectImg(img); else if (sel) clearSel();
  };
  const onEditorDrop = (e) => {
    const url = e.dataTransfer.getData('text/ttc-foto');
    if (!url) return;
    e.preventDefault();
    const at = document.elementFromPoint(e.clientX, e.clientY);
    insertPhoto(url, topBlock(at) || null);
  };
  const inText = (url) => (form.html || '').includes(url);
  const onPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? cleanPaste(html) : textToHtml(text));
    onInput();
  };
  const cmd = (command, value) => {
    editorRef.current.focus(); document.execCommand(command, false, value); onInput();
    setFmt({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') });
  };

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
    clearSel();
    const body = { ...form, html: editorRef.current ? fromEditorHtml(editorRef.current.innerHTML) : form.html, coverImage: form.coverImage || form.images[0] || '', status: targetStatus };
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
  const photoBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 8px', fontSize: '12px', fontWeight: 600, color: 'white', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', cursor: 'pointer' };
  const imgBtn = { display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', fontSize: '13px', fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer' };

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="radiogroup">
          {CATEGORIES.map(c => {
            const on = form.category === c.id;
            return (
              <button key={c.id || 'keine'} role="radio" aria-checked={on} onClick={() => update({ category: c.id })}
                style={{ padding: '7px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: on ? '#052e16' : 'white', background: on ? A : 'rgba(255,255,255,0.05)', border: `1px solid ${on ? A : 'rgba(255,255,255,0.18)'}` }}>
                {c.label}
              </button>
            );
          })}
        </div>
      </Step>

      <Step n="3" title="Fotos hochladen" note="(freiwillig)">
        <p style={{ ...C.muted, margin: '0 0 10px', fontSize: '12px' }}>Erst alle Fotos hochladen – dann das <b style={{ color: '#bbf7d0' }}>Titelbild</b> wählen (Vorschaubild bei „Aktuelles“) und Fotos in den Text setzen.</p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
        <button onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '12px', border: '2px dashed rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.05)', color: '#bbf7d0', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
          <ImagePlus size={20} /> Fotos auswählen
        </button>
        {(form.images.length > 0 || uploads > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 140 : 160}px,1fr))`, gap: '10px', marginTop: '12px' }}>
            {form.images.map((url) => {
              const cover = (form.coverImage || form.images[0]) === url;
              const used = inText(url);
              return (
                <div key={url} style={{ borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: `2px solid ${cover ? A : 'rgba(255,255,255,0.12)'}` }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3' }}>
                    <img src={imgSrc(url)} alt="" draggable onDragStart={e => e.dataTransfer.setData('text/ttc-foto', url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'grab' }} />
                    {cover && <span style={{ ...photoTag, background: A, color: '#052e16' }}><Star size={11} fill="currentColor" /> Titelbild</span>}
                    {used && <span style={{ ...photoTag, left: 'auto', right: '6px', background: 'rgba(5,26,12,0.85)' }}>im Text</span>}
                  </div>
                  <div style={{ display: 'grid', gap: '4px', padding: '6px' }}>
                    {!cover && <button onClick={() => update({ coverImage: url })} style={photoBtn}><Star size={13} /> Als Titelbild</button>}
                    <button onClick={() => insertPhoto(url)} style={{ ...photoBtn, background: 'rgba(74,222,128,0.14)', borderColor: 'rgba(74,222,128,0.4)', color: '#bbf7d0' }}><Plus size={13} /> {used ? 'Nochmal in Text' : 'In Text einfügen'}</button>
                    <button onClick={() => {
                      editorRef.current?.querySelectorAll('img').forEach(i => { if (i.getAttribute('src')?.endsWith(url)) { const f = i.closest('figure') || i; f.remove(); } });
                      clearSel();
                      update({ images: form.images.filter(u => u !== url), coverImage: form.coverImage === url ? '' : form.coverImage, html: fromEditorHtml(editorRef.current?.innerHTML || '') });
                    }} style={{ ...photoBtn, color: '#fca5a5', borderColor: 'rgba(252,165,165,0.3)' }}><Trash2 size={13} /> Entfernen</button>
                  </div>
                </div>
              );
            })}
            {Array.from({ length: uploads }).map((_, i) => (
              <div key={`u${i}`} style={{ aspectRatio: '4/3', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                <Loader2 size={20} className="ttc-spin" /> lädt hoch …
              </div>
            ))}
          </div>
        )}
      </Step>

      <Step n="4" title="Text">
        <p style={{ ...C.muted, margin: '0 0 10px', fontSize: '12px' }}>Einfach hineinschreiben – oder einen fertigen Text aus Word bzw. einer E-Mail einfügen. Fotos: in Schritt 3 „In Text einfügen“ tippen – sie erscheinen unter dem Absatz, in dem du zuletzt geschrieben hast. Fotos im Text einfach anfassen und an die gewünschte Stelle ziehen. Antippen: an den grünen Ecken größer oder kleiner ziehen, links/mittig/rechts setzen oder entfernen.</p>
        <div role="toolbar" aria-label="Formatierung" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {[['bold', Bold, 'Fett'], ['italic', Italic, 'Kursiv'], ['underline', Underline, 'Unterstrichen']].map(([c, Icon, label]) => (
            <button key={c} aria-pressed={fmt[c]} onMouseDown={e => e.preventDefault()} onClick={() => cmd(c)}
              style={{ ...toolBtn, ...(fmt[c] ? { background: A, borderColor: A, color: '#052e16' } : {}) }}><Icon size={14} /> {label}</button>
          ))}
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'h3')} style={toolBtn}><Heading2 size={14} /> Zwischenüberschrift</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('formatBlock', 'p')} style={toolBtn}>Normaler Text</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('insertUnorderedList')} style={toolBtn}><List size={14} /> Liste</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => cmd('undo')} style={toolBtn}><Undo2 size={14} /> Rückgängig</button>
        </div>
        <div role="radiogroup" aria-label="Ausrichtung" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
          <span style={{ ...C.muted, fontSize: '12px', marginRight: '2px' }}>Ausrichtung:</span>
          {ALIGNS.map(({ id: al, label, Icon }) => {
            const on = (form.textAlign || 'justify') === al;
            return (
              <button key={al} role="radio" aria-checked={on} onMouseDown={e => e.preventDefault()} onClick={() => update({ textAlign: al })}
                style={{ ...toolBtn, ...(on ? { background: 'rgba(74,222,128,0.16)', borderColor: A, color: '#bbf7d0' } : {}) }}>
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </div>
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <div ref={editorRef} className="ttc-redaktion-editor" contentEditable suppressContentEditableWarning onInput={onInput} onPaste={onPaste}
            onClick={onEditorClick} onPointerDown={onEditorPointerDown} onDragStart={e => { if (e.target.closest?.('img, figure')) e.preventDefault(); }} onKeyDown={() => sel && clearSel()} onDragOver={e => { if ([...e.dataTransfer.types].includes('text/ttc-foto')) e.preventDefault(); }} onDrop={onEditorDrop}
            role="textbox" aria-multiline="true" aria-label="Text des Berichts" data-placeholder="Hier den Bericht schreiben …"
            lang="de" style={{ minHeight: '240px', padding: '12px 14px', fontSize: '15px', lineHeight: 1.65, color: '#111', background: '#fff', borderRadius: '10px', outline: 'none', overflowWrap: 'anywhere', textAlign: form.textAlign || 'justify', hyphens: 'auto', WebkitHyphens: 'auto' }} />
          {dropLine !== null && <div aria-hidden style={{ position: 'absolute', left: '10px', right: '10px', top: dropLine, height: '4px', borderRadius: '2px', background: A, boxShadow: '0 0 0 3px rgba(74,222,128,0.3)', zIndex: 7, pointerEvents: 'none' }} />}
          {sel && dropLine === null && ['tl', 'tr', 'bl', 'br'].map(c => (
            <span key={c} data-corner={c} onPointerDown={onHandleDown} aria-hidden title="Ziehen, um die Größe zu ändern"
              style={{ position: 'absolute', zIndex: 6, width: isMobile ? '26px' : '16px', height: isMobile ? '26px' : '16px', borderRadius: '50%', background: A, border: '3px solid #052e16', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', touchAction: 'none',
                top: sel.rect.top + (c[0] === 'b' ? sel.rect.height : 0) - (isMobile ? 13 : 8), left: sel.rect.left + (c[1] === 'r' ? sel.rect.width : 0) - (isMobile ? 13 : 8),
                cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize' }} />
          ))}
          {sel && sizeLabel && (
            <span style={{ position: 'absolute', zIndex: 6, top: sel.rect.top + sel.rect.height / 2 - 16, left: sel.rect.left + sel.rect.width / 2, transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: '8px', background: 'rgba(5,46,22,0.9)', color: 'white', fontWeight: 800, fontSize: '14px', pointerEvents: 'none' }}>{sizeLabel}</span>
          )}
          {sel && (
            <div role="toolbar" aria-label="Foto im Text" style={{ position: 'absolute', top: Math.max(4, sel.rect.top - 52), left: '50%', transform: 'translateX(-50%)', flexWrap: 'nowrap', whiteSpace: 'nowrap', display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', background: '#052e16', boxShadow: '0 6px 20px rgba(0,0,0,0.35)', zIndex: 5 }}>
              {[['left', PanelLeft, 'Links'], ['', RectangleHorizontal, 'Mitte'], ['right', PanelRight, 'Rechts']].map(([side, Icon, label]) => (
                <button key={label} onMouseDown={e => e.preventDefault()} onClick={() => placeSel(side)} aria-pressed={selSide === side} title={side ? `Foto ${label.toLowerCase()}, Text daneben` : 'Foto mittig'}
                  style={{ ...imgBtn, ...(selSide === side ? { background: A, color: '#052e16' } : {}) }}><Icon size={16} />{!isMobile && ` ${label}`}</button>
              ))}
              <span style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 2px' }} />
              <button onMouseDown={e => e.preventDefault()} onClick={() => moveSel(-1)} style={imgBtn} aria-label="Foto nach oben"><ArrowUp size={16} />{!isMobile && ' Hoch'}</button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => moveSel(1)} style={imgBtn} aria-label="Foto nach unten"><ArrowDown size={16} />{!isMobile && ' Runter'}</button>
              <button onMouseDown={e => e.preventDefault()} onClick={removeSel} style={{ ...imgBtn, color: '#fca5a5' }} aria-label="Foto aus dem Text nehmen"><X size={16} /></button>
            </div>
          )}
        </div>
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

      {/* Vorschau direkt an die Seite hängen: sonst hält die Einblend-Animation der App das Fenster fest und die Zurück-Leiste rutscht aus dem Bild */}
      {preview && createPortal((() => {
        const coverUrl = (form.coverImage || form.images[0] || '');
        const gallery = form.images.filter(u => u !== coverUrl && !(form.html || '').includes(u));
        return (
          <div role="dialog" aria-modal="true" aria-label="Vorschau" onKeyDown={e => e.key === 'Escape' && setPreview(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#052e16', color: 'white', fontSize: '13px' }}>
              <button onClick={() => setPreview(false)} autoFocus style={btn('primary', { padding: '8px 14px', fontSize: '14px' })}><ArrowLeft size={16} /> Zurück zum Text</button>
              {!isMobile && <span style={{ opacity: 0.8 }}><Eye size={14} style={{ verticalAlign: '-2px' }} /> So erscheint der Bericht auf der Webseite</span>}
            </div>
            <article style={{ background: '#f3f1ea', color: '#0b1a11', maxWidth: '860px', margin: isMobile ? '0 auto' : '24px auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <header style={{ background: 'radial-gradient(120% 140% at 12% 20%, #17602f 0%, #0f4a25 48%, #0a3319 100%)', color: '#f3f1ea', padding: isMobile ? '22px 18px' : '36px 40px', borderBottom: '4px solid #b6f36a' }}>
                <div style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  <span style={{ color: '#b6f36a' }}>{form.category ? catLabel(form.category) : 'Aktuelles'}</span><span style={{ opacity: 0.75 }}> · {fmtDate(form.date)}</span>
                </div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '26px' : '38px', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em' }}>{form.title || 'Ohne Überschrift'}</h1>
              </header>
              {coverUrl && <img src={imgSrc(coverUrl)} alt="" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} />}
              <div style={{ padding: isMobile ? '22px 18px 28px' : '36px 40px 44px', maxWidth: '680px', margin: '0 auto' }}>
                <div className="ttc-redaktion-preview" lang="de" style={{ textAlign: form.textAlign || 'justify', hyphens: 'auto', WebkitHyphens: 'auto' }} dangerouslySetInnerHTML={{ __html: absImages(form.html) }} />
                {gallery.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '8px', marginTop: '24px' }}>{gallery.map(u => <img key={u} src={imgSrc(u)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />)}</div>}
              </div>
            </article>
            <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'center', padding: '14px' }}>
              <button onClick={() => setPreview(false)} style={btn('primary', { padding: '12px 22px', fontSize: '15px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' })}><ArrowLeft size={17} /> Zurück zum Text</button>
            </div>
          </div>
        );
      })(), document.body)}
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

// ---------- TTC News: kurze Meldungen für das weiße Laufband auf der Startseite ----------
const EMPTY_TICK = { text: '', date: '', link: '', until: '' };
function TickerManager({ api, isMobile }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY_TICK);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api('/ticker').then(d => setItems(d.items)).catch(e => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError(''); setMsg('');
    if (form.text.trim().length < 3) return setError('Bitte einen Text für die Meldung eingeben.');
    setBusy(true);
    try {
      if (editId) await api(`/ticker/${editId}`, { method: 'PUT', body: { ...form, active: true } });
      else await api('/ticker', { method: 'POST', body: form });
      setMsg(editId ? 'Meldung gespeichert.' : 'Meldung veröffentlicht – sie läuft jetzt auf der Startseite.');
      setForm(EMPTY_TICK); setEditId(null);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const toggle = async (t) => {
    setError('');
    try { await api(`/ticker/${t.id}`, { method: 'PUT', body: { ...t, active: !t.active } }); await load(); } catch (e) { setError(e.message); }
  };
  const remove = async (t) => {
    if (!window.confirm('Diese Meldung endgültig löschen?')) return;
    setError('');
    try { await api(`/ticker/${t.id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); }
  };
  const todayIso = today();
  const expired = (t) => (t.until || t.date) && (t.until || t.date) < todayIso;

  return (
    <>
      <div style={C.card}>
        <strong style={{ display: 'block', fontSize: '15px', marginBottom: '4px' }}>{editId ? 'Meldung bearbeiten' : 'Neue TTC News'}</strong>
        <p style={{ ...C.muted, margin: '0 0 12px', fontSize: '12px' }}>Kurze Meldungen laufen im weißen Band auf der Startseite durch – z. B. Termine, Absagen oder Hinweise.</p>
        <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value.slice(0, 140) }))} rows={2} placeholder="z. B. Vereinsmeisterschaften ab 10 Uhr in der Halle" aria-label="Text der Meldung" style={{ ...C.input, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ ...C.muted, fontSize: '11px', textAlign: 'right', margin: '3px 0 10px' }}>{form.text.length}/140 Zeichen</div>
        <label style={{ display: 'block', fontSize: '12px', ...C.muted, marginBottom: '10px' }}>Datum des Termins – steht im Laufband vor der Meldung
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...C.input, marginTop: '4px', colorScheme: 'dark', maxWidth: '220px' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '10px' }}>
          <label style={{ fontSize: '12px', ...C.muted }}>Link (freiwillig)
            <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://…" style={{ ...C.input, marginTop: '4px' }} />
          </label>
          <label style={{ fontSize: '12px', ...C.muted }}>Anzeigen bis (freiwillig, sonst bis zum Termin)
            <input type="date" value={form.until} onChange={e => setForm(f => ({ ...f, until: e.target.value }))} style={{ ...C.input, marginTop: '4px', colorScheme: 'dark' }} />
          </label>
        </div>
        {error && <p style={{ color: '#fca5a5', fontSize: '13px', margin: '10px 0 0' }}>{error}</p>}
        {msg && <p style={{ color: '#bbf7d0', fontSize: '13px', margin: '10px 0 0' }}>✓ {msg}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', flexWrap: 'wrap' }}>
          {editId && <button onClick={() => { setEditId(null); setForm(EMPTY_TICK); }} style={btn('ghost')}>Abbrechen</button>}
          <button onClick={save} disabled={busy} style={btn('primary', { opacity: busy ? 0.6 : 1 })}>{busy ? <Loader2 size={15} className="ttc-spin" /> : <CheckCircle2 size={15} />} {editId ? 'Speichern' : 'Veröffentlichen'}</button>
        </div>
      </div>

      <strong style={{ display: 'block', fontSize: '14px', margin: '4px 0 10px' }}>Alle Meldungen</strong>
      {items === null ? <Spinner /> : items.length === 0 ? (
        <p style={{ ...C.muted, fontSize: '13px' }}>Noch keine TTC News. Die erste Meldung oben eintragen.</p>
      ) : items.map(t => {
        const live = t.active && !expired(t);
        return (
          <div key={t.id} style={{ ...C.card, padding: '12px 14px', marginBottom: '8px', opacity: live ? 1 : 0.6 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>{t.date && <span style={{ color: A, marginRight: '6px' }}>{fmtDate(t.date)}:</span>}{t.text}</div>
            <div style={{ ...C.muted, fontSize: '11px', marginTop: '4px' }}>
              {live ? '🟢 läuft auf der Startseite' : expired(t) ? '⏱ abgelaufen' : '⏸ ausgeblendet'}
              {t.until ? ` · bis ${fmtDate(t.until)}` : ''}{t.link ? ' · mit Link' : ''}{t.author ? ` · ${t.author}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => { setEditId(t.id); setForm({ text: t.text, date: t.date || '', link: t.link, until: t.until }); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={btn('ghost', { padding: '6px 11px', fontSize: '12px' })}><PenLine size={13} /> Bearbeiten</button>
              <button onClick={() => toggle(t)} style={btn('ghost', { padding: '6px 11px', fontSize: '12px' })}>{t.active ? 'Ausblenden' : 'Wieder anzeigen'}</button>
              <button onClick={() => remove(t)} style={btn('danger', { padding: '6px 11px', fontSize: '12px' })}><Trash2 size={13} /> Löschen</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
