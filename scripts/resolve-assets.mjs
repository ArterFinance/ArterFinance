/* Resolves every tokenized asset the site lists to its real contract on
 * Robinhood Chain and writes src/config/assets.generated.ts.
 *
 *   node scripts/resolve-assets.mjs            (public RPC)
 *   ROBINHOOD_RPC_URL=https://... node scripts/resolve-assets.mjs
 *
 * A ticker is not an identity on Robinhood Chain: many tokens borrow stock
 * tickers. A candidate is accepted only when all of these hold on-chain:
 *   1. its runtime bytecode embeds Robinhood's token beacon,
 *   2. symbol() equals the ticker exactly,
 *   3. name() ends in "Robinhood Token".
 * Candidates come from the Morpho API and Dexscreener; the chain decides.
 * The tickers are the ones Chainlink publishes a Robinhood Chain feed for, so
 * every accepted asset also has an oracle price.
 */
import { writeFile } from "node:fs/promises";

const RPCS = [process.env.ROBINHOOD_RPC_URL, "https://robinhood-rpc.publicnode.com", "https://rpc.mainnet.chain.robinhood.com"].filter(Boolean);
const BEACON = "e10b6f6b275de231345c20d14ab812db62151b00";
const FEEDS_URL = "https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

let id = 0;
async function rpc(method, params) {
  let last;
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.json();
      if (body.error) throw new Error(body.error.message);
      return body.result;
    } catch (error) {
      last = error;
    }
  }
  throw last;
}
const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]).catch(() => null);

function decodeString(hex) {
  if (!hex || hex === "0x") return null;
  const buf = Buffer.from(hex.slice(2), "hex");
  if (buf.length === 32) return buf.toString("utf8").replace(/\0+$/, "") || null;
  const len = Number(BigInt("0x" + buf.subarray(32, 64).toString("hex")));
  return buf.subarray(64, 64 + len).toString("utf8");
}

// Chainlink feeds: "Robinhood NVDA / USD", "Robinhood SGOV-USD", "GLD / USD".
const feeds = await (await fetch(FEEDS_URL)).json();
const wanted = new Map();
for (const feed of feeds) {
  const m = /^(?:Robinhood )?([A-Z]+)\s*(?:\/|-)\s*USD$/.exec(feed.name.trim());
  if (!m) continue;
  const isEquity = feed.docs?.marketHours === "us_equities_24/5" || m[1] === "GLD";
  if (!isEquity) continue;
  wanted.set(m[1], { feed: feed.proxyAddress, feedName: feed.name });
}
console.log(`${wanted.size} equity-style feeds`);

// Candidates from Morpho (every asset used in a market on chain 4663).
const candidates = new Map(); // symbol -> Set(address)
const add = (symbol, address) => {
  if (!symbol || !address || !wanted.has(symbol)) return;
  if (!candidates.has(symbol)) candidates.set(symbol, new Set());
  candidates.get(symbol).add(address.toLowerCase());
};
const morpho = await fetch("https://api.morpho.org/graphql", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: "{ markets(first: 1000, where: { chainId_in: [4663] }) { items { collateralAsset { address symbol } loanAsset { address symbol } } } }" }),
}).then((r) => r.json());
for (const m of morpho.data?.markets?.items ?? []) {
  add(m.collateralAsset?.symbol, m.collateralAsset?.address);
  add(m.loanAsset?.symbol, m.loanAsset?.address);
}
// Dexscreener for any ticker Morpho does not carry.
for (const symbol of wanted.keys()) {
  if (candidates.has(symbol)) continue;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
    for (const pair of (await res.json()).pairs ?? []) {
      if (pair.chainId !== "robinhood") continue;
      add(pair.baseToken.symbol, pair.baseToken.address);
      add(pair.quoteToken.symbol, pair.quoteToken.address);
    }
  } catch {
    // No candidates for this ticker; it is reported below.
  }
}

const resolved = [];
const missing = [];
for (const [symbol, info] of wanted) {
  const hits = [];
  for (const address of candidates.get(symbol) ?? []) {
    const code = (await rpc("eth_getCode", [address, "latest"])).toLowerCase();
    if (!code.includes(BEACON)) continue;
    const [sym, name] = await Promise.all([call(address, "0x95d89b41"), call(address, "0x06fdde03")].map((p) => p.then(decodeString)));
    if (sym !== symbol || !/Robinhood Token\s*$/.test(name ?? "")) continue;
    hits.push({ address, name });
  }
  if (hits.length !== 1) {
    missing.push(`${symbol} (${hits.length} matches of ${candidates.get(symbol)?.size ?? 0})`);
    continue;
  }
  const checksum = await checksumAddress(hits[0].address);
  resolved.push({ symbol, address: checksum, name: hits[0].name.replace(/\s*•\s*Robinhood Token\s*$/, "").replace(/ Class A Common Stock$/, ""), feed: info.feed });
  console.log(symbol.padEnd(6), checksum, hits[0].name);
}
if (missing.length) console.log("not resolved:", missing.join(", "));

async function checksumAddress(address) {
  const { keccak_256 } = await import("@noble/hashes/sha3.js");
  const lower = address.toLowerCase().replace(/^0x/, "");
  const hash = Buffer.from(keccak_256(new TextEncoder().encode(lower))).toString("hex");
  return "0x" + [...lower].map((c, i) => (parseInt(hash[i], 16) >= 8 ? c.toUpperCase() : c)).join("");
}

resolved.sort((a, b) => a.symbol.localeCompare(b.symbol));
const body = `// Generated by scripts/resolve-assets.mjs. Do not edit by hand.
//
// Every token below was read off Robinhood Chain: a proxy to Robinhood's token
// beacon, symbol() equal to the ticker, name() ending in "Robinhood Token".
// Tokens that only borrow a ticker are rejected. "feed" is the Chainlink
// USD price feed proxy for the same ticker on Robinhood Chain.
//
// Resolved ${new Date().toISOString().slice(0, 10)}.

export type ResolvedAsset = { symbol: string; address: \`0x\${string}\`; name: string; feed: \`0x\${string}\` };

export const RESOLVED_ASSETS: ResolvedAsset[] = [
${resolved.map((r) => `  { symbol: "${r.symbol}", address: "${r.address}", name: ${JSON.stringify(r.name)}, feed: "${r.feed}" },`).join("\n")}
];
`;
await writeFile(new URL("../src/config/assets.generated.ts", import.meta.url), body);
console.log(`\nwrote src/config/assets.generated.ts (${resolved.length} assets)`);
