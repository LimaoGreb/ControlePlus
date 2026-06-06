// Gera um mockup de como as notificações vão aparecer no Android.
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const W = 780;
const H = 470;

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function card(y, title, body) {
  return `
    <rect x="28" y="${y}" width="724" height="168" rx="30" fill="#FFFFFF"/>
    <text x="120" y="${y + 46}" font-family="Roboto, Arial, sans-serif" font-size="24" font-weight="700" fill="#E0A52E">Controle+</text>
    <text x="258" y="${y + 46}" font-family="Roboto, Arial, sans-serif" font-size="22" fill="#9AA0A6">• agora</text>
    <text x="56" y="${y + 96}" font-family="Roboto, Arial, sans-serif" font-size="29" font-weight="700" fill="#202124">${escapeXml(title)}</text>
    <text x="56" y="${y + 134}" font-family="Roboto, Arial, sans-serif" font-size="23" fill="#5F6368">${escapeXml(body)}</text>
  `;
}

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#101826"/>
      <stop offset="100%" stop-color="#1E2A38"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="40" y="44" font-family="Roboto, Arial, sans-serif" font-size="20" fill="#AAB4C2" font-weight="600">10:30  •  qua, 14 jun</text>
  ${card(80, 'Vencimento chegando', 'Spotify (R$ 21,90) vence amanhã, dia 14. Não esquece!')}
  ${card(270, 'Vencimento chegando', 'Aluguel (R$ 1.200,00) vence HOJE, dia 5. Bora pagar!')}
</svg>`;

(async () => {
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const icon = await sharp(path.join(ASSETS, 'icon.png')).resize(60, 60).png().toBuffer();
  await sharp(base)
    .composite([
      { input: icon, left: 48, top: 80 + 18 },
      { input: icon, left: 48, top: 270 + 18 },
    ])
    .png()
    .toFile(path.join(ASSETS, '_notif_mock.png'));
  console.log('mock gerado');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
