// The checks Arter runs before it lets new money into a Morpho Blue market on
// Robinhood Chain, plus the position maths its lend and borrow screens use.
//
// Morpho markets are permissionless. Anyone can open one that lends USDG
// against a real token, with a price oracle they wrote themselves, or a
// standard oracle built with the wrong decimals. A borrower can then post
// collateral the oracle overvalues and walk away with the lenders' USDG.
// So before Arter offers "supply", "deposit collateral" or "borrow" in a
// market, it reads the market from the chain and checks it (trustMarket).
// Withdrawing and repaying are always allowed.

import { readFileSync } from "node:fs";
import { parseAbi } from "viem";

const ASSETS = JSON.parse(readFileSync(new URL("./assets.json", import.meta.url), "utf8"));

/** Morpho Blue and its adaptive rate model and Chainlink oracle factory on Robinhood Chain (Morpho's address book). */
export const MORPHO = "0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010";
export const ADAPTIVE_IRM = "0x2BD3d5965B26B51814AC95127B2b80dD6CcC0fa1";
export const ORACLE_FACTORY = "0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2";
export const USDG = ASSETS.usdg;

/**
 * Morpho-listed USDG markets Arter offers, pinned with their oracle (checked
 * 5 Oct 2026). A "listed" flag from an API is not trusted on its own: a
 * market only takes this path when its id and oracle both match.
 */
export const PINNED = {
  "0xc845da65a020ddca5f132efa8fea79676d8edfdea504226a4c01e7a9e34cddd6": { oracle: "0xE64849bd4AD03DfaBbe02bb521de19997a19055f", label: "USDe" },
  "0x919a9b6b94dae7c86620eaf7a08e597aae8a4c3a9e9c7671771fbaf62b6b61c7": { oracle: "0x152c638fad68913739Ee19Ba8eF47fAEB09DCa91", label: "syrupUSDG" },
  "0x1efd13a2d1dc66a2466e7c25820537028e604791f00454d9c686fdfbf70f404d": { oracle: "0xCb6EdD02FDB9b0f2893e590eBeD889214F4Df650", label: "mGLO" },
  "0x0309c02dabf0be02682af1a2bde9a457f4df0f0b6bc889cde3f948e5315e4114": { oracle: "0xe694c531F65c4BaBc88A52d7178476e095e51574", label: "spUSDG" },
};

const WAD = 10n ** 18n;
/** Highest liquidation LTV accepted: pinned stable markets, and markets on a volatile asset's own oracle. */
export const MAX_LLTV_PINNED = (915n * WAD) / 1000n;
export const MAX_LLTV_FACTORY = (770n * WAD) / 1000n;
const CHAINLINK_USD_DECIMALS = 8;
const ZERO = "0x0000000000000000000000000000000000000000";
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export const morphoAbi = parseAbi([
  "function idToMarketParams(bytes32 id) view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)",
  "function market(bytes32 id) view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)",
  "function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)",
]);
const oracleAbi = parseAbi([
  "function price() view returns (uint256)",
  "function BASE_FEED_1() view returns (address)",
  "function BASE_FEED_2() view returns (address)",
  "function QUOTE_FEED_1() view returns (address)",
  "function QUOTE_FEED_2() view returns (address)",
  "function BASE_VAULT() view returns (address)",
  "function QUOTE_VAULT() view returns (address)",
  "function SCALE_FACTOR() view returns (uint256)",
]);
const factoryAbi = parseAbi(["function isMorphoChainlinkOracleV2(address) view returns (bool)"]);
const erc20Abi = parseAbi(["function decimals() view returns (uint8)"]);

const tryRead = (p) => p.catch(() => null);

/** Parameters, totals, oracle price and oracle composition of one market, read from the chain. */
export async function readMarket(client, id) {
  const [params, state] = await Promise.all([
    client.readContract({ address: MORPHO, abi: morphoAbi, functionName: "idToMarketParams", args: [id] }),
    client.readContract({ address: MORPHO, abi: morphoAbi, functionName: "market", args: [id] }),
  ]);
  const [loanToken, collateralToken, oracle, irm, lltv] = params;
  const read = (functionName) => tryRead(client.readContract({ address: oracle, abi: oracleAbi, functionName }));
  const [price, fromFactory] = await Promise.all([
    read("price"),
    tryRead(client.readContract({ address: ORACLE_FACTORY, abi: factoryAbi, functionName: "isMorphoChainlinkOracleV2", args: [oracle] })),
  ]);
  let composition = { fromFactory: Boolean(fromFactory) };
  if (fromFactory) {
    const [baseFeed1, baseFeed2, quoteFeed1, quoteFeed2, baseVault, quoteVault, scaleFactor, collateralDecimals] = await Promise.all([
      read("BASE_FEED_1"),
      read("BASE_FEED_2"),
      read("QUOTE_FEED_1"),
      read("QUOTE_FEED_2"),
      read("BASE_VAULT"),
      read("QUOTE_VAULT"),
      read("SCALE_FACTOR"),
      tryRead(client.readContract({ address: collateralToken, abi: erc20Abi, functionName: "decimals" })),
    ]);
    composition = { fromFactory: true, baseFeed1, baseFeed2, quoteFeed1, quoteFeed2, baseVault, quoteVault, scaleFactor, collateralDecimals: collateralDecimals === null ? null : Number(collateralDecimals) };
  }
  return {
    id,
    params: { loanToken, collateralToken, oracle, irm, lltv },
    state: { totalSupplyAssets: state[0], totalSupplyShares: state[1], totalBorrowAssets: state[2], totalBorrowShares: state[3], lastUpdate: state[4], fee: state[5] },
    price,
    oracle: composition,
  };
}

/** What a market for `collateral` must look like: the loan token and feeds Arter expects. */
export function expectationFor(collateral) {
  const asset = ASSETS.assets.find((a) => same(a.address, collateral));
  return { loanToken: USDG.address, loanDecimals: USDG.decimals, loanFeed: USDG.feed, collateral, collateralFeed: asset?.feed ?? null, symbol: asset?.symbol ?? null };
}

/**
 * Whether Arter offers new money in a market, and why. New money needs the
 * market, read from the chain, to lend `loanToken` against `collateral` with
 * Morpho's adaptive rate model, and either
 *  - be one of the pinned Morpho-listed markets with the pinned oracle and a
 *    liquidation LTV of at most 91.5%, or
 *  - price the collateral with Morpho's factory Chainlink oracle on that
 *    asset's own feed (quote: the loan token's feed or none), with no vaults
 *    or second feeds, a SCALE_FACTOR that matches the real token decimals,
 *    and a liquidation LTV of at most 77%.
 */
export function trustMarket(m, expect) {
  if (!same(m.params.loanToken, expect.loanToken)) return { ok: false, reason: "It does not lend USDG." };
  if (!same(m.params.collateralToken, expect.collateral)) return { ok: false, reason: "Its collateral is not the token shown." };
  if (!same(m.params.irm, ADAPTIVE_IRM)) return { ok: false, reason: "It does not use Morpho's standard rate model." };
  const pinned = PINNED[m.id.toLowerCase()];
  if (pinned) {
    if (!same(m.params.oracle, pinned.oracle)) return { ok: false, reason: "Its oracle is not the one Morpho listed." };
    if (m.params.lltv > MAX_LLTV_PINNED) return { ok: false, reason: "Its liquidation LTV is above 91.5%." };
    return { ok: true, reason: `Listed by Morpho (${pinned.label}), oracle pinned.` };
  }
  const o = m.oracle;
  if (!o?.fromFactory) return { ok: false, reason: "Its price oracle is custom code that cannot be verified." };
  const plain = same(o.baseFeed2, ZERO) && same(o.quoteFeed2, ZERO) && same(o.baseVault, ZERO) && same(o.quoteVault, ZERO);
  const hasQuote = same(o.quoteFeed1, expect.loanFeed);
  const quoteOk = hasQuote || same(o.quoteFeed1, ZERO);
  if (!plain || !quoteOk || !expect.collateralFeed || !same(o.baseFeed1, expect.collateralFeed))
    return { ok: false, reason: "Its oracle does not price the collateral with that asset's Chainlink feed." };
  if (o.collateralDecimals === null || o.scaleFactor === null) return { ok: false, reason: "Its oracle scale could not be read." };
  // MorphoChainlinkOracleV2: 10^(36 + quote token + quote feeds - base token - base feeds), vault samples 1.
  const exp = 36 + expect.loanDecimals + (hasQuote ? CHAINLINK_USD_DECIMALS : 0) - o.collateralDecimals - CHAINLINK_USD_DECIMALS;
  if (exp < 0 || o.scaleFactor !== 10n ** BigInt(exp)) return { ok: false, reason: "Its oracle was built with the wrong token decimals." };
  if (m.params.lltv > MAX_LLTV_FACTORY) return { ok: false, reason: "Its liquidation LTV is above 77% for a volatile asset." };
  return { ok: true, reason: "Oracle verified: Morpho's Chainlink oracle on the asset's own feed, scale checked." };
}

// ------------------------------------------------------------------ maths

// Morpho's SharesMathLib: virtual shares and assets keep the first deposit honest.
const VIRTUAL_SHARES = 1_000_000n;
const VIRTUAL_ASSETS = 1n;
const ORACLE_SCALE = 10n ** 36n;

export const toAssetsDown = (shares, totalAssets, totalShares) => (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
export const toAssetsUp = (shares, totalAssets, totalShares) => {
  const d = totalShares + VIRTUAL_SHARES;
  return (shares * (totalAssets + VIRTUAL_ASSETS) + d - 1n) / d;
};

/** A position in loan units: supplied, borrowed, collateral value, borrow limit, health (limit / debt). */
export function book(m, p) {
  const supplied = toAssetsDown(p.supplyShares, m.state.totalSupplyAssets, m.state.totalSupplyShares);
  const borrowed = toAssetsUp(p.borrowShares, m.state.totalBorrowAssets, m.state.totalBorrowShares);
  const collateralValue = m.price === null ? null : (p.collateral * m.price) / ORACLE_SCALE;
  const maxBorrow = collateralValue === null ? null : (collateralValue * m.params.lltv) / WAD;
  const health = maxBorrow === null ? null : borrowed === 0n ? Infinity : Number(maxBorrow) / Number(borrowed);
  return { supplied, borrowed, collateral: p.collateral, collateralValue, maxBorrow, health };
}

export async function readPosition(client, id, user) {
  const [supplyShares, borrowShares, collateral] = await client.readContract({ address: MORPHO, abi: morphoAbi, functionName: "position", args: [id, user] });
  return { supplyShares, borrowShares, collateral };
}

/** USDG markets on Robinhood Chain from Morpho's public API (a list of candidates only; every check reads the chain). */
export async function listUsdgMarkets() {
  const query = `{ markets(first: 500, where: { chainId_in: [4663] }) { items { marketId listed loanAsset { address } collateralAsset { address symbol } state { supplyAssetsUsd liquidityAssetsUsd supplyApy borrowApy } } } }`;
  const res = await fetch("https://api.morpho.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  const body = await res.json();
  return (body.data?.markets?.items ?? []).filter((x) => x.collateralAsset && x.state && same(x.loanAsset.address, USDG.address) && (x.state.supplyAssetsUsd ?? 0) >= 1000);
}
