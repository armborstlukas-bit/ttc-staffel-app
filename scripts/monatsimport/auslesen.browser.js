// Schritt 2: Im eingeloggten Browser auf mytischtennis.de ausführen (Tab im Vordergrund!).
// Vorher setzen: window.MI = { namen:[...], von:'2026-10-01', bis:'2026-11-01', stand:'2026-10-28' }
// von/bis = Monat (bis exklusiv), stand = bisheriger Stand der Anzahl der Spiele.
// Ergebnis landet in localStorage 'monatsimport' und window.MI.fertig.
window.MI_START = async () => {
  const { namen, von, bis, stand } = window.MI;
  const speicher = JSON.parse(localStorage.getItem('monatsimport') || '{}');
  const norm = s => s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
  // In anderem Verein gemeldet, daher nicht über den Vereinsfilter auffindbar
  const FESTE_IDS = { 'Johanna Braun': { external_id: 'd0479f6b-8151-4818-8c6d-5de6af0e5dea', club_name: 'TTC Wirges' } };
  const suche = async (name) => {
    if (FESTE_IDS[name]) return FESTE_IDS[name];
    const r = await fetch('/api/search/players', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `query=${encodeURIComponent(name)}&page=1&pagesize=50` });
    const treffer = ((await r.json()).results || []).filter(x => norm(`${x.firstname} ${x.lastname}`) === norm(name));
    return treffer.filter(x => /\(33066\)|Staffel/.test(`${x.licence_club} ${x.club_name}`))[0] || (treffer.length === 1 ? treffer[0] : null);
  };
  const historie = async (id) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-3000px;width:1000px;height:800px';
    f.src = `/rankings/ttr-historie?user-id=${id}&show=everything`;
    document.body.append(f);
    await new Promise(r => { f.onload = r; });
    let d = null;
    for (let i = 0; i < 60 && !d; i++) {
      await new Promise(r => setTimeout(r, 500));
      const b = f.contentWindow.__remixContext?.state?.loaderData?.['routes/$']?.pageContent?.blockLoaderData || {};
      d = Object.values(b).map(v => v?.data).find(x => x?.event);
    }
    f.remove();
    return d;
  };
  const eins = async (name) => {
    const p = await suche(name);
    if (!p) return { fehlt: 'nicht gefunden' };
    const d = await historie(p.external_id);
    if (!d) return { fehlt: 'keine Historie', club: p.club_name };
    const ev = [...d.event].filter(e => e.ttr_after != null).sort((a, b) => a.event_date_time.localeCompare(b.event_date_time));
    const wert = (grenze) => { const v = ev.filter(e => e.event_date_time < grenze); return v.length ? v[v.length - 1].ttr_after : null; };
    // Spiele: eigener Verein aus Heim/Gast; Turniere zählen zum Verein des letzten Mannschaftsspiels davor
    let staffel = false; const neu = [];
    for (const e of ev) {
      if (e.type === 'meeting') {
        const [h, g] = (e.event_name.split('|')[1] || '').split(' : ');
        staffel = /Staffel/.test((e.home_team ? h : g) || '');
      }
      const tag = e.event_date_time.slice(0, 10);
      if (tag > stand && e.event_date_time < bis && staffel && (e.type === 'meeting' || e.type === 'competition')) neu.push([tag, e.type === 'meeting' ? 'm' : 't', e.match_count || 0]);
    }
    return { club: p.club_name, start: wert(von), ende: wert(bis), imMonat: ev.filter(e => e.event_date_time >= von && e.event_date_time < bis).length, neu };
  };
  const offen = namen.filter(n => !speicher[n] || speicher[n].fehlt === 'keine Historie');
  window.MI.fortschritt = () => `${Object.keys(speicher).length}/${namen.length}`;
  const arbeiter = async () => { while (offen.length) { const n = offen.shift(); try { speicher[n] = await eins(n); } catch (e) { speicher[n] = { fehlt: String(e) }; } localStorage.setItem('monatsimport', JSON.stringify(speicher)); } };
  await Promise.all([arbeiter(), arbeiter(), arbeiter()]);
  window.MI.fertig = speicher;
};
