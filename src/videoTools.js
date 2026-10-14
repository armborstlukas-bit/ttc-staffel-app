// Kurzvideos für die Redaktion: im Browser prüfen, auf max. 720p verkleinern (H.264/MP4, wo möglich) und ein Vorschaubild erzeugen.
// Das Verkleinern läuft in Echtzeit (ein 40-Sekunden-Video braucht ca. 40 Sekunden) – der Bildschirm sollte so lange an bleiben.

export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_BYTES = 30 * 1024 * 1024;
const MAX_SIDE = 1280; // 720p
const VIDEO_BPS = 2_000_000;
const AUDIO_BPS = 96_000;

const TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const recorderType = () => (typeof MediaRecorder === 'undefined' ? null : TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || null);

const loadVideo = (file) => new Promise((resolve, reject) => {
  const v = document.createElement('video');
  v.preload = 'auto'; v.playsInline = true; v.muted = false; v.crossOrigin = 'anonymous';
  v.src = URL.createObjectURL(file);
  v.onloadedmetadata = () => resolve(v);
  v.onerror = () => reject(new Error('Dieses Video kann der Browser nicht lesen. Bitte als MP4 versuchen.'));
});

const seek = (v, t) => new Promise((r) => { v.onseeked = () => r(); v.currentTime = t; });

// Vorschaubild (JPEG) aus dem Video
async function posterOf(v, w, h) {
  await seek(v, Math.min(0.6, (v.duration || 1) / 3));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(v, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
  await seek(v, 0);
  return blob;
}

export async function prepareVideo(file, onProgress = () => {}) {
  const v = await loadVideo(file);
  const duration = v.duration;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Die Länge des Videos konnte nicht gelesen werden.');
  if (duration > VIDEO_MAX_SECONDS + 0.5) throw new Error(`Das Video ist ${Math.round(duration)} Sekunden lang – bitte auf höchstens ${VIDEO_MAX_SECONDS} Sekunden kürzen (z. B. in der Fotos-App des Handys).`);
  const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth || MAX_SIDE, v.videoHeight || MAX_SIDE));
  const w = Math.max(2, Math.round((v.videoWidth || 1280) * scale / 2) * 2);
  const h = Math.max(2, Math.round((v.videoHeight || 720) * scale / 2) * 2);
  const poster = await posterOf(v, w, h).catch(() => null);

  const type = recorderType();
  if (!type) {
    // Ohne Aufnahme-Funktion im Browser: nur kleine MP4-Dateien direkt übernehmen
    if (file.type === 'video/mp4' && file.size <= VIDEO_MAX_BYTES) return { blob: file, type: 'video/mp4', duration, poster };
    throw new Error('Dieser Browser kann das Video nicht verkleinern. Bitte in Chrome oder Safari versuchen.');
  }

  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  let audioCtx = null;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume?.();
    const src = audioCtx.createMediaElementSource(v);
    const dest = audioCtx.createMediaStreamDestination();
    src.connect(dest); // nicht an die Lautsprecher – das Verkleinern läuft lautlos
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch { /* Video ohne Ton weiterverarbeiten */ }

  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const done = new Promise((r) => { rec.onstop = r; });

  const draw = () => { ctx.drawImage(v, 0, 0, w, h); onProgress(Math.min(1, v.currentTime / duration)); };
  let timer = null;
  const loop = () => {
    if (v.ended || v.paused) return;
    draw();
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(loop); else timer = setTimeout(loop, 33);
  };
  rec.start(1000);
  try {
    await v.play();
  } catch {
    v.muted = true; await v.play(); // falls Ton blockiert ist: Bild trotzdem verarbeiten
  }
  loop();
  await new Promise((r) => { v.onended = r; });
  clearTimeout(timer);
  draw();
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  audioCtx?.close?.();
  URL.revokeObjectURL(v.src);
  const outType = type.split(';')[0];
  const blob = new Blob(chunks, { type: outType });
  if (blob.size > VIDEO_MAX_BYTES) throw new Error('Das Video ist auch verkleinert noch zu groß. Bitte kürzen.');
  return { blob, type: outType, duration, poster };
}

// Upload direkt in den Speicher (mit Fortschritt)
export const putWithProgress = (url, blob, type, onProgress = () => {}) => new Promise((resolve, reject) => {
  const x = new XMLHttpRequest();
  x.open('PUT', url);
  x.setRequestHeader('Content-Type', type);
  x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
  x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Hochladen fehlgeschlagen (${x.status}).`)));
  x.onerror = () => reject(new Error('Hochladen fehlgeschlagen – bitte Internetverbindung prüfen.'));
  x.send(blob);
});
