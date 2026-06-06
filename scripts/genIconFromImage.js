// Gera os ícones do app a partir de assets/coin-source.png (a moeda).
// A moeda fica recortada num círculo, dentro de um DISCO colorido (estilo Chrome).
// Uso: node scripts/genIconFromImage.js
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const SRC = path.join(ASSETS, 'coin-source.png');

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
// Cor do disco/círculo de fundo (a moeda dourada destaca bem sobre azul-marinho).
const DISC = '#1E2A38';

// Recorta a moeda num círculo e devolve um buffer PNG do tamanho `inner`.
async function coinBuffer(inner) {
  const trimmed = await sharp(SRC)
    .trim({ threshold: 80 })
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  const r = (inner / 2) * 0.99;
  const mask = Buffer.from(
    `<svg width="${inner}" height="${inner}"><circle cx="${inner / 2}" cy="${inner / 2}" r="${r}" fill="#fff"/></svg>`
  );
  return sharp(trimmed).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function make(outName, size, coinFraction, withDisc) {
  const inner = Math.round(size * coinFraction);
  const coin = await coinBuffer(inner);

  const layers = [];
  if (withDisc) {
    const disc = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${Math.round((size / 2) * 0.98)}" fill="${DISC}"/></svg>`
    );
    layers.push({ input: disc });
  }
  layers.push({ input: coin, gravity: 'center' });

  await sharp({ create: { width: size, height: size, channels: 4, background: TRANSPARENT } })
    .composite(layers)
    .png()
    .toFile(path.join(ASSETS, outName));

  console.log('gerado:', outName, `${size}x${size}`, withDisc ? 'com disco' : 'só moeda', `moeda ${Math.round(coinFraction * 100)}%`);
}

(async () => {
  // Ícone principal: disco + moeda (a moeda menor pra sobrar o "anel" do disco).
  await make('icon.png', 1024, 0.6, true);
  // Foreground adaptativo Android: só a moeda (o disco vem do backgroundColor).
  await make('android-icon-foreground.png', 1024, 0.58, false);
  // Splash: só a moeda transparente (fundo escuro vem do app.json).
  await make('splash-icon.png', 1024, 0.5, false);
  // Favicon web: disco + moeda.
  await make('favicon.png', 256, 0.6, true);
  console.log('OK · cor do disco:', DISC);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
