/* Renders every brand image from the SVG drawings below.
 *
 *   npm run brand
 *
 * Writes public/brand/{arter-mark, arter-badge, og}.webp and
 * src/app/{favicon.ico, icon.png, apple-icon.png}.
 * Every shipped image is .webp except the browser icons, which browsers read
 * as ICO/PNG. To use final artwork, replace MARK_SVG (or load a file into
 * sharp instead) and run the script again.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = fileURLToPath(new URL("../public/brand/", import.meta.url));
const APP = fileURLToPath(new URL("../src/app/", import.meta.url));
await mkdir(OUT, { recursive: true });

const INK = "#16201b";
const BRASS = "#c08a2e";
const BRASS_LIGHT = "#e3b762";
const PAPER = "#f2eee4";
const MOSS = "#2f7a5b";

/** Three ingots stacked into an A. The top bar is the one that earns. */
const ingots = `
  <polygon points="11,51 53,51 48.5,40 15.5,40" fill="${BRASS}"/>
  <polygon points="15.5,40 48.5,40 47.3,37.2 16.7,37.2" fill="${BRASS_LIGHT}"/>
  <polygon points="18,35 46,35 41.5,24.5 22.5,24.5" fill="${BRASS}"/>
  <polygon points="22.5,24.5 41.5,24.5 40.3,21.7 23.7,21.7" fill="${BRASS_LIGHT}"/>
  <polygon points="25,19.5 39,19.5 35.2,10.5 28.8,10.5" fill="${PAPER}"/>
`;

const tile = (size, radius = 12) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${radius}" fill="${INK}"/>${ingots}</svg>`;

const round = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="${INK}"/><g transform="translate(32 33) scale(0.86) translate(-32 -31)">${ingots}</g></svg>`;

const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

await sharp(await png(tile(512))).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}arter-mark.webp`);
await sharp(await png(round(512))).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}arter-badge.webp`);

// Social card: ledger rules, a compounding curve and the slogan.
const rules = Array.from({ length: 14 }, (_, i) => `<line x1="0" x2="1200" y1="${60 + i * 42}" y2="${60 + i * 42}" stroke="${PAPER}" stroke-opacity="0.07"/>`).join("");
const curve = Array.from({ length: 61 }, (_, i) => {
  const x = 640 + i * 9;
  const y = 520 - (Math.pow(1.05, i / 6) - 1) * 360;
  return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  ${rules}
  <path d="M640 520 L1180 520" stroke="${PAPER}" stroke-opacity="0.35" stroke-dasharray="4 6"/>
  <path d="${curve}" fill="none" stroke="${BRASS}" stroke-width="4"/>
  <circle cx="1180" cy="${(520 - (Math.pow(1.05, 10) - 1) * 360).toFixed(1)}" r="7" fill="${BRASS}"/>
  <g transform="translate(80 78) scale(1.5)"><rect width="64" height="64" rx="12" fill="#0f1915"/>${ingots}</g>
  <text x="196" y="138" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="${PAPER}">Arter Finance</text>
  <text x="80" y="320" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="${PAPER}">Assets</text>
  <text x="80" y="420" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="96" fill="${BRASS_LIGHT}">That Earn.</text>
  <text x="80" y="492" font-family="Helvetica, Arial, sans-serif" font-size="25" fill="${PAPER}" fill-opacity="0.8">Tokenized gold, treasuries and stocks, put to work.</text>
  <text x="80" y="566" font-family="Menlo, monospace" font-size="19" letter-spacing="3" fill="${PAPER}" fill-opacity="0.6">$ARTER · ROBINHOOD CHAIN · ARTER.FINANCE</text>
  <text x="1180" y="566" text-anchor="end" font-family="Menlo, monospace" font-size="17" letter-spacing="2" fill="${MOSS}">TARGET 3-7% APY</text>
</svg>`;
await sharp(Buffer.from(og)).webp({ quality: 90 }).toFile(`${OUT}og.webp`);

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const ico = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    data: await sharp(Buffer.from(tile(size, 14))).resize(size, size).ensureAlpha().png({ compressionLevel: 9 }).toBuffer(),
  })),
);
await writeFile(`${APP}favicon.ico`, buildIco(ico));

// Home-screen icons are opaque squares; the platform rounds the corners.
await writeFile(`${APP}icon.png`, await sharp(Buffer.from(tile(192, 0))).png().toBuffer());
await writeFile(`${APP}apple-icon.png`, await sharp(Buffer.from(tile(180, 0))).png().toBuffer());

console.log("brand images written");
