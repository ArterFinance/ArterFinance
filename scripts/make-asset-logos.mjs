/* Builds the round logo tiles for every asset the site lists.
 *
 *   node scripts/make-asset-logos.mjs
 *
 * The marks are the issuers' trademarks, used only to label the token that
 * tracks them. Stocks and ETFs come from Financial Modeling Prep's public
 * logo endpoint, USDG from CoinGecko. Each mark is trimmed, fitted into 62%
 * of a 192px circle and baked onto a white disc (or an ink disc when the mark
 * itself is nearly white), so it reads on both light and dark sections.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = fileURLToPath(new URL("../public/assets/", import.meta.url));
const SIZE = 192;
const INK = 0.62;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

const generated = await import("../src/config/assets.generated.ts").catch(() => null);
let tickers = generated?.RESOLVED_ASSETS?.map((a) => a.symbol);
if (!tickers) {
  // Node without TypeScript loading: read the symbols straight from the file.
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/config/assets.generated.ts", import.meta.url), "utf8");
  tickers = [...src.matchAll(/symbol: "([A-Z]+)"/g)].map((m) => m[1]);
}

async function grab(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function usdgSource() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/global-dollar?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false", { headers: { "user-agent": UA } });
  const body = await res.json();
  return grab(body.image.large);
}

/** Mean luminance of the visible pixels. */
async function luminance(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n++;
  }
  return n ? sum / n : 0;
}

await mkdir(OUT, { recursive: true });
const jobs = [["USDG", usdgSource], ...tickers.map((t) => [t, () => grab(`https://financialmodelingprep.com/image-stock/${t}.png`)])];

for (const [ticker, load] of jobs) {
  try {
    const raw = await load();
    const trimmed = await sharp(raw, { density: 384 }).ensureAlpha().trim({ threshold: 4 }).png().toBuffer();
    const lum = await luminance(trimmed);
    // USDG ships as a full disc already; let it fill the tile.
    const share = ticker === "USDG" ? 1 : INK;
    const inner = Math.round(SIZE * share);
    const mark = await sharp(trimmed).resize(inner, inner, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const { width, height } = await sharp(mark).metadata();
    const disc = lum > 225 ? "#16201b" : "#ffffff";
    const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="${disc}"/></svg>`);
    const tile = await sharp(base)
      .composite([{ input: mark, left: Math.round((SIZE - width) / 2), top: Math.round((SIZE - height) / 2) }])
      .webp({ quality: 90 })
      .toBuffer();
    await writeFile(`${OUT}${ticker.toLowerCase()}.webp`, tile);
    console.log(`${ticker.padEnd(6)} lum ${lum.toFixed(0).padStart(3)} ${disc}`);
  } catch (error) {
    console.log(`${ticker.padEnd(6)} FAILED ${error.message}`);
  }
}
