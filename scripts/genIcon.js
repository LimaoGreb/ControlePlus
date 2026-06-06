// Gera o ícone do app (moeda dourada com "$") em PNG, usando sharp.
// Uso: node scripts/genIcon.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CREME = '#F2D4A5';
const ASSETS = path.join(__dirname, '..', 'assets');

// SVG da moeda. size = lado; bg = preencher fundo creme; scale = tamanho da moeda.
function coinSvg(size, bg, scale) {
  const c = size / 2;
  const R = (size / 2) * scale; // raio externo da moeda
  const rim = R * 0.93;
  const face = R * 0.82;
  // Dólar como path vetorial (S + barra vertical), centrado.
  const h = R * 0.46; // meia-altura do S
  const w = R * 0.30; // meia-largura do S
  const sw = Math.max(6, R * 0.12); // espessura do traço
  const sPath = `M ${c + w},${c - h}
    C ${c - w * 1.5},${c - h * 1.6} ${c - w * 1.5},${c - h * 0.05} ${c},${c}
    C ${c + w * 1.5},${c + h * 0.05} ${c + w * 1.5},${c + h * 1.6} ${c - w},${c + h}`;
  const barTop = c - h - R * 0.16;
  const barBot = c + h + R * 0.16;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="gold" cx="40%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#FCE08A"/>
      <stop offset="45%" stop-color="#F4C13C"/>
      <stop offset="100%" stop-color="#D9961F"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8AE2E"/>
      <stop offset="100%" stop-color="#B5781A"/>
    </linearGradient>
  </defs>
  ${bg ? `<rect width="${size}" height="${size}" rx="${size * 0.16}" fill="${CREME}"/>` : ''}
  <circle cx="${c}" cy="${c}" r="${R}" fill="url(#rim)"/>
  <circle cx="${c}" cy="${c}" r="${rim}" fill="url(#gold)"/>
  <circle cx="${c}" cy="${c}" r="${face}" fill="none" stroke="#C98A1C" stroke-width="${R * 0.05}" stroke-opacity="0.55"/>
  <line x1="${c}" y1="${barTop}" x2="${c}" y2="${barBot}" stroke="#7A4E12" stroke-width="${sw * 0.7}" stroke-linecap="round"/>
  <path d="${sPath}" fill="none" stroke="#7A4E12" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function render(svg, size, outName) {
  const out = path.join(ASSETS, outName);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log('gerado:', outName, `(${size}x${size})`);
}

(async () => {
  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });
  // Ícone principal (com fundo creme, cantos arredondados): 1024x1024
  await render(coinSvg(1024, true, 0.86), 1024, 'icon.png');
  // Foreground adaptativo Android (transparente, moeda menor p/ safe zone)
  await render(coinSvg(1024, false, 0.62), 1024, 'android-icon-foreground.png');
  // Splash (transparente, moeda média)
  await render(coinSvg(1024, false, 0.7), 1024, 'splash-icon.png');
  // Favicon web
  await render(coinSvg(256, true, 0.86), 256, 'favicon.png');
  console.log('OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
