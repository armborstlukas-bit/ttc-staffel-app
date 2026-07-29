// Liest den oeffentlichen ICS-Feed des TTC-Staffel-Google-Kalenders und wandelt ihn
// in ein einfaches JSON-Format um. Wird von der App live abgefragt (kein Caching),
// damit neue/geaenderte Google-Kalender-Termine sofort sichtbar sind.
const ICS_URL = 'https://calendar.google.com/calendar/ical/81420c7c65351d45d0d4d2c3bc1f566d6d4dbb636c76ef20cfc1ec0f90dab94a%40group.calendar.google.com/public/basic.ics';

// Minimaler ICS-Parser: reicht fuer die von Google Calendar erzeugten Felder
// (unfaltet zeilenumbrueche, liest VEVENT-Bloecke aus).
function parseIcs(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(';')[0];
    const allDay = rawKey.includes('VALUE=DATE') && !rawKey.includes('VALUE=DATE-TIME');
    if (key === 'DTSTART') { cur.start = value; cur.startAllDay = allDay; }
    else if (key === 'DTEND') { cur.end = value; cur.endAllDay = allDay; }
    else if (key === 'SUMMARY') cur.summary = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ');
    else if (key === 'LOCATION') cur.location = value.replace(/\\,/g, ',').replace(/\\;/g, ';');
    else if (key === 'DESCRIPTION') cur.description = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ');
    else if (key === 'UID') cur.uid = value;
  }
  return events;
}

function toIsoDate(v, allDay) {
  if (!v) return null;
  if (allDay) {
    // Format YYYYMMDD
    return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
  }
  // Format YYYYMMDDTHHMMSSZ (UTC) oder ohne Z (lokale Zeit im Kalender-Zeitzone, hier als UTC behandelt)
  const y = v.slice(0,4), mo = v.slice(4,6), d = v.slice(6,8);
  const h = v.slice(9,11) || '00', mi = v.slice(11,13) || '00';
  return `${y}-${mo}-${d}T${h}:${mi}:00${v.endsWith('Z') ? 'Z' : ''}`;
}

export default async function handler(req, res) {
  try {
    const response = await fetch(ICS_URL);
    if (!response.ok) throw new Error('Kalender nicht erreichbar: ' + response.status);
    const text = await response.text();
    const raw = parseIcs(text);

    const items = raw.map(e => ({
      uid: e.uid,
      title: e.summary || '(ohne Titel)',
      location: e.location || '',
      description: e.description || '',
      start: toIsoDate(e.start, e.startAllDay),
      end: toIsoDate(e.end, e.endAllDay),
      allDay: !!e.startAllDay,
      source: 'google',
    })).filter(e => e.start);

    items.sort((a,b) => a.start.localeCompare(b.start));

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
