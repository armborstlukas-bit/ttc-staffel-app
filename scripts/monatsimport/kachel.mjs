// Kachel „Nachwuchstalent des Monats“ im bisherigen Stil.
// node kachel.mjs --foto x.jpg --crop l,t,b,h --vorname FELIX --nachname SCHNEIDER --bilanz "11 - 4" --ttr +54 --monat "Okt 2026" --aus out.jpg
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../ttc-staffel-web/package.json', import.meta.url));
const sharp = require('sharp');
const arg = (n) => process.argv[process.argv.indexOf(`--${n}`) + 1];
const [l, t, b, h] = arg('crop').split(',').map(Number);
const FX = 120, FY = 197, FW = 370, FH = 660;
const foto = await sharp(arg('foto')).extract({ left: l, top: t, width: b, height: h }).resize(FW, FH, { fit: 'cover', position: 'top', kernel: 'lanczos3' }).toBuffer();
const wappen = await sharp(new URL('../../../ttc-staffel-web/public/images/wappen.png', import.meta.url).pathname.slice(1)).resize({ height: 232 }).png().toBuffer();
const wert = (y, gross, klein) => `<text x="848" y="${y}" text-anchor="middle" font-family="Arial" font-size="${gross.length >= 8 ? 54 : 70}" fill="#fff">${gross}</text><rect x="722" y="${y + 24}" width="252" height="4" fill="#fff"/><text x="848" y="${y + 74}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="32" fill="#fff">${klein}</text>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
<rect width="1080" height="1080" fill="#37883f"/>
<path d="M0 58H596a52 52 0 0 0 52 52V955a52 52 0 0 0-52 52H0Z" fill="#9dc08f"/>
<text x="120" y="163" font-family="Arial" font-weight="700" font-style="italic" font-size="50" fill="#fff">TTC STAFFEL</text>
<text x="120" y="922" font-family="Arial" font-weight="700" font-style="italic" font-size="46" fill="#fff">${arg('vorname')}</text>
<text x="120" y="967" font-family="Arial" font-weight="700" font-style="italic" font-size="46" fill="#fff">${arg('nachname')}</text>
<g transform="translate(562,527) rotate(90)" font-family="Arial" font-weight="700" font-size="44" fill="#fff" text-anchor="middle"><text y="0">NACHWUCHSTALENT</text><text y="50">DES MONATS</text></g>
${wert(360, arg('bilanz'), 'BILANZ')}${wert(572, arg('ttr'), 'TTR WERT')}${wert(765, arg('monat'), 'MONAT')}
<g fill="#fff"><circle cx="965" cy="935" r="82"/><circle cx="968" cy="880" r="17" fill="#37883f"/><rect x="845" y="1012" width="100" height="24" rx="10" transform="rotate(-32 895 1024)"/><circle cx="975" cy="980" r="70"/></g>
</svg>`;
const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset=".82" stop-color="#fff" stop-opacity="0"/><stop offset=".98" stop-color="#fff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
await sharp(Buffer.from(svg)).composite([{ input: foto, left: FX, top: FY }, { input: fade, left: FX, top: FY }, { input: wappen, left: 880, top: 28 }]).jpeg({ quality: 90 }).toFile(arg('aus'));
