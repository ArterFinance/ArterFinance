"use client";

import { CHAIN } from "@/config/brand";
import { address as addr, bytes, dynamic, encode, fixed, readAddress, readWord, word } from "@/lib/abi";
import { rpc, rpcBatch } from "@/lib/rpc";

/*
 * Live lending through Morpho Blue on Robinhood Chain, without a library.
 * Arter adds no contract of its own here: positions belong to the wallet on
 * Morpho, and every market's parameters are read from Morpho itself by id, so
 * nothing the API says is trusted for a transaction.
 */

/** Morpho Blue, checked with eth_getCode and owner() on Robinhood Chain mainnet. */
export const MORPHO = "0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010";
/** Morpho's adaptive curve rate model and Chainlink oracle factory on Robinhood Chain (morpho-org address book). */
export const ADAPTIVE_IRM = "0x2BD3d5965B26B51814AC95127B2b80dD6CcC0fa1";
export const ORACLE_FACTORY = "0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2";

const SEL = {
  supply: "a99aad89",
  withdraw: "5c2bea49",
  borrow: "50d8cd4b",
  repay: "20b76e81",
  supplyCollateral: "238d6579",
  withdrawCollateral: "8720316d",
  position: "93c52062",
  market: "5c60e39a",
  idToMarketParams: "2c3c9157",
  price: "a035b1fe",
  isFactoryOracle: "4cf4a264",
  baseFeed1: "f50a4718",
  baseFeed2: "dc53858c",
  quoteFeed1: "56095e11",
  quoteFeed2: "acfbd39e",
  baseVault: "eaa2d7b4",
  quoteVault: "2e6f20a6",
  scaleFactor: "ce4b5bbe",
  decimals: "313ce567",
  approve: "095ea7b3",
  allowance: "dd62ed3e",
  balanceOf: "70a08231",
} as const;

export type MarketParams = { loanToken: string; collateralToken: string; oracle: string; irm: string; lltv: bigint };
export type MarketState = {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
};
export type Position = { supplyShares: bigint; borrowShares: bigint; collateral: bigint };

const paramsHex = (p: MarketParams) => addr(p.loanToken) + addr(p.collateralToken) + addr(p.oracle) + addr(p.irm) + word(p.lltv);
const id32 = (id: string) => id.slice(2).toLowerCase().padStart(64, "0");

// ------------------------------------------------------------ calldata

export const encodeSupply = (p: MarketParams, assets: bigint, shares: bigint, onBehalf: string) =>
  `0x${SEL.supply}` + encode([fixed(paramsHex(p)), fixed(word(assets)), fixed(word(shares)), fixed(addr(onBehalf)), dynamic(bytes("0x"))]);
export const encodeWithdraw = (p: MarketParams, assets: bigint, shares: bigint, onBehalf: string, receiver: string) =>
  `0x${SEL.withdraw}${paramsHex(p)}${word(assets)}${word(shares)}${addr(onBehalf)}${addr(receiver)}`;
export const encodeBorrow = (p: MarketParams, assets: bigint, shares: bigint, onBehalf: string, receiver: string) =>
  `0x${SEL.borrow}${paramsHex(p)}${word(assets)}${word(shares)}${addr(onBehalf)}${addr(receiver)}`;
export const encodeRepay = (p: MarketParams, assets: bigint, shares: bigint, onBehalf: string) =>
  `0x${SEL.repay}` + encode([fixed(paramsHex(p)), fixed(word(assets)), fixed(word(shares)), fixed(addr(onBehalf)), dynamic(bytes("0x"))]);
export const encodeSupplyCollateral = (p: MarketParams, assets: bigint, onBehalf: string) =>
  `0x${SEL.supplyCollateral}` + encode([fixed(paramsHex(p)), fixed(word(assets)), fixed(addr(onBehalf)), dynamic(bytes("0x"))]);
export const encodeWithdrawCollateral = (p: MarketParams, assets: bigint, onBehalf: string, receiver: string) =>
  `0x${SEL.withdrawCollateral}${paramsHex(p)}${word(assets)}${addr(onBehalf)}${addr(receiver)}`;
export const encodeApprove = (spender: string, amount: bigint) => `0x${SEL.approve}${addr(spender)}${word(amount)}`;

// --------------------------------------------------------------- reads

/** JSON-RPC batch where a failing entry comes back as null instead of failing the whole batch. */
async function batchLoose(calls: { method: string; params: unknown[] }[]): Promise<(string | null)[]> {
  if (!calls.length) return [];
  const out: (string | null)[] = [];
  for (let i = 0; i < calls.length; i += 40) {
    const chunk = calls.slice(i, i + 40);
    let rows: (string | null)[] | null = null;
    for (const url of [CHAIN.rpc, CHAIN.fallbackRpc]) {
      try {
        const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(chunk.map((c, id) => ({ jsonrpc: "2.0", id, ...c }))), cache: "no-store" });
        if (!res.ok) continue;
        const body = (await res.json()) as { id: number; result?: string }[];
        if (!Array.isArray(body)) continue;
        rows = chunk.map(() => null);
        for (const e of body) if (typeof e.result === "string" && e.result !== "0x") rows[e.id] = e.result;
        break;
      } catch {
        // try the next endpoint
      }
    }
    if (!rows) throw new Error("Could not reach the chain.");
    out.push(...rows);
  }
  return out;
}

const call = (to: string, data: string) => ({ method: "eth_call", params: [{ to, data }, "latest"] });

/** What the market's oracle is made of, when it comes from Morpho's Chainlink oracle factory. */
export type OracleInfo = {
  fromFactory: boolean;
  baseFeed1: string;
  baseFeed2: string;
  quoteFeed1: string;
  quoteFeed2: string;
  baseVault: string;
  quoteVault: string;
  scaleFactor: bigint | null;
  /** decimals() of the collateral token, read from the token itself. */
  collateralDecimals: number | null;
};

export type MarketSnapshot = {
  id: string;
  params: MarketParams;
  state: MarketState;
  /** Oracle price of one collateral unit in loan units, scaled by 1e36 (Morpho's convention). */
  price: bigint | null;
  oracle: OracleInfo | null;
};

function decodeState(hex: string): MarketState {
  return {
    totalSupplyAssets: readWord(hex, 0),
    totalSupplyShares: readWord(hex, 1),
    totalBorrowAssets: readWord(hex, 2),
    totalBorrowShares: readWord(hex, 3),
    lastUpdate: readWord(hex, 4),
    fee: readWord(hex, 5),
  };
}

/** Parameters, totals and oracle price of several markets, straight from Morpho. */
export async function readMarkets(ids: string[]): Promise<MarketSnapshot[]> {
  if (!ids.length) return [];
  const base = await rpcBatch<string>(ids.flatMap((id) => [call(MORPHO, `0x${SEL.idToMarketParams}${id32(id)}`), call(MORPHO, `0x${SEL.market}${id32(id)}`)]));
  const markets = ids.map((id, i) => {
    const p = base[i * 2];
    return {
      id,
      params: { loanToken: readAddress(p, 0), collateralToken: readAddress(p, 1), oracle: readAddress(p, 2), irm: readAddress(p, 3), lltv: readWord(p, 4) },
      state: decodeState(base[i * 2 + 1]),
      price: null as bigint | null,
      oracle: null as OracleInfo | null,
    };
  });
  const withOracle = markets.filter((m) => /^0x0{40}$/.test(m.params.oracle) === false);
  if (withOracle.length) {
    // Prices and factory membership for every oracle; feed getters only for factory oracles (custom ones revert on them).
    const first = await batchLoose(withOracle.flatMap((m) => [call(m.params.oracle, `0x${SEL.price}`), call(ORACLE_FACTORY, `0x${SEL.isFactoryOracle}${addr(m.params.oracle)}`)]));
    const factory = withOracle.filter((m, i) => {
      m.price = first[i * 2] ? readWord(first[i * 2]!, 0) : null;
      const fromFactory = first[i * 2 + 1] ? readWord(first[i * 2 + 1]!, 0) === 1n : false;
      m.oracle = { fromFactory, baseFeed1: "", baseFeed2: "", quoteFeed1: "", quoteFeed2: "", baseVault: "", quoteVault: "", scaleFactor: null, collateralDecimals: null };
      return fromFactory;
    });
    const getters = [SEL.baseFeed1, SEL.baseFeed2, SEL.quoteFeed1, SEL.quoteFeed2, SEL.baseVault, SEL.quoteVault];
    const PER = getters.length + 2;
    const feeds = await batchLoose(
      factory.flatMap((m) => [
        ...getters.map((sel) => call(m.params.oracle, `0x${sel}`)),
        call(m.params.oracle, `0x${SEL.scaleFactor}`),
        call(m.params.collateralToken, `0x${SEL.decimals}`),
      ]),
    );
    factory.forEach((m, i) => {
      const raw = feeds.slice(i * PER, i * PER + PER);
      const r = raw.slice(0, getters.length).map((hex) => (hex ? readAddress(hex, 0) : ""));
      m.oracle = {
        fromFactory: r.every(Boolean),
        baseFeed1: r[0],
        baseFeed2: r[1],
        quoteFeed1: r[2],
        quoteFeed2: r[3],
        baseVault: r[4],
        quoteVault: r[5],
        scaleFactor: raw[6] ? readWord(raw[6], 0) : null,
        collateralDecimals: raw[7] ? Number(readWord(raw[7], 0)) : null,
      };
    });
  }
  return markets;
}

/** One wallet's positions in several markets. */
export async function readPositions(user: string, ids: string[]): Promise<Position[]> {
  if (!ids.length) return [];
  const rows = await rpcBatch<string>(ids.map((id) => call(MORPHO, `0x${SEL.position}${id32(id)}${addr(user)}`)));
  return rows.map((hex) => ({ supplyShares: readWord(hex, 0), borrowShares: readWord(hex, 1), collateral: readWord(hex, 2) }));
}

export async function readBalance(token: string, owner: string) {
  return readWord(await rpc<string>("eth_call", [{ to: token, data: `0x${SEL.balanceOf}${addr(owner)}` }, "latest"]), 0);
}

export async function readAllowance(token: string, owner: string, spender = MORPHO) {
  return readWord(await rpc<string>("eth_call", [{ to: token, data: `0x${SEL.allowance}${addr(owner)}${addr(spender)}` }, "latest"]), 0);
}

// ----------------------------------------------------------------- trust

const ZERO = "0x0000000000000000000000000000000000000000";
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export type Trust = { ok: boolean; reason: string };

/**
 * Morpho-listed USDG markets Arter offers, pinned with their oracle (checked
 * 5 Oct 2026). The live "listed" flag from Morpho's API is not trusted on its
 * own: a market gets this path only if its id and oracle match here.
 */
const PINNED: Record<string, { oracle: string; label: string }> = {
  "0xc845da65a020ddca5f132efa8fea79676d8edfdea504226a4c01e7a9e34cddd6": { oracle: "0xE64849bd4AD03DfaBbe02bb521de19997a19055f", label: "USDe" },
  "0x919a9b6b94dae7c86620eaf7a08e597aae8a4c3a9e9c7671771fbaf62b6b61c7": { oracle: "0x152c638fad68913739Ee19Ba8eF47fAEB09DCa91", label: "syrupUSDG" },
  "0x1efd13a2d1dc66a2466e7c25820537028e604791f00454d9c686fdfbf70f404d": { oracle: "0xCb6EdD02FDB9b0f2893e590eBeD889214F4Df650", label: "mGLO" },
  "0x0309c02dabf0be02682af1a2bde9a457f4df0f0b6bc889cde3f948e5315e4114": { oracle: "0xe694c531F65c4BaBc88A52d7178476e095e51574", label: "spUSDG" },
};

const WAD_LLTV = (pct: number) => (BigInt(Math.round(pct * 10)) * 10n ** 18n) / 1000n;
/** Highest liquidation LTV accepted: pinned stable markets, and markets on a volatile asset's own oracle. */
const MAX_LLTV_PINNED = WAD_LLTV(91.5);
const MAX_LLTV_FACTORY = WAD_LLTV(77);
const CHAINLINK_USD_DECIMALS = 8;

/**
 * Morpho markets are permissionless: anyone can open one for a real token
 * with an oracle they control (or a factory oracle built with the wrong
 * decimals), and lenders in it can be drained. Arter only offers new money
 * in a market when, read from the chain, it lends `loanToken` against
 * `collateral` with Morpho's adaptive rate model, and either
 *  - it is one of the pinned Morpho-listed markets with the pinned oracle, or
 *  - its oracle comes from Morpho's Chainlink oracle factory, prices the
 *    collateral with `collateralFeed` against the loan token's feed (or
 *    none), has no vaults or second feeds, and its SCALE_FACTOR matches the
 *    real token decimals; and its liquidation LTV is at most 77%.
 */
export function trustMarket(
  m: MarketSnapshot,
  expect: { loanToken: string; loanDecimals: number; loanFeed: string; collateral: string; collateralFeed: string | null },
): Trust {
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
  if (!o?.fromFactory) return { ok: false, reason: "Its price oracle is custom code Arter cannot verify." };
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

// ----------------------------------------------------------------- maths

// Morpho's SharesMathLib: virtual shares and assets keep the first deposit honest.
const VIRTUAL_SHARES = 1_000_000n;
const VIRTUAL_ASSETS = 1n;
const ORACLE_SCALE = 10n ** 36n;
const WAD = 10n ** 18n;

export const toAssetsDown = (shares: bigint, totalAssets: bigint, totalShares: bigint) =>
  (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
export const toAssetsUp = (shares: bigint, totalAssets: bigint, totalShares: bigint) => {
  const d = totalShares + VIRTUAL_SHARES;
  return (shares * (totalAssets + VIRTUAL_ASSETS) + d - 1n) / d;
};

export type Book = {
  supplied: bigint; // loan units
  borrowed: bigint; // loan units, rounded up
  collateral: bigint; // collateral units
  collateralValue: bigint | null; // in loan units
  maxBorrow: bigint | null; // in loan units, at LLTV
  /** maxBorrow / borrowed; Infinity without debt; null without a price. */
  health: number | null;
  /** Collateral price (loan units per collateral unit, 1e36 scale) at which the position becomes liquidatable. */
  liquidationPrice: bigint | null;
};

export function book(m: MarketSnapshot, p: Position): Book {
  const supplied = toAssetsDown(p.supplyShares, m.state.totalSupplyAssets, m.state.totalSupplyShares);
  const borrowed = toAssetsUp(p.borrowShares, m.state.totalBorrowAssets, m.state.totalBorrowShares);
  const collateralValue = m.price === null ? null : (p.collateral * m.price) / ORACLE_SCALE;
  const maxBorrow = collateralValue === null ? null : (collateralValue * m.params.lltv) / WAD;
  const health = maxBorrow === null ? null : borrowed === 0n ? Infinity : Number(maxBorrow) / Number(borrowed);
  const liquidationPrice = borrowed > 0n && p.collateral > 0n ? (borrowed * ORACLE_SCALE * WAD) / (p.collateral * m.params.lltv) : null;
  return { supplied, borrowed, collateral: p.collateral, collateralValue, maxBorrow, health, liquidationPrice };
}

/** Loan units still available to borrow from the market itself. */
export const liquidity = (m: MarketSnapshot) =>
  m.state.totalSupplyAssets > m.state.totalBorrowAssets ? m.state.totalSupplyAssets - m.state.totalBorrowAssets : 0n;

// ------------------------------------------------------------- amounts

export function parseUnits(text: string, decimals: number): bigint | null {
  if (!/^\d*\.?\d*$/.test(text) || text === "" || text === ".") return null;
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

export const toNumber = (v: bigint, decimals: number) => Number(v) / 10 ** decimals;

/** Exact decimal text of a raw amount, for filling inputs without float noise. */
export function formatExact(v: bigint, decimals: number) {
  const whole = v / 10n ** BigInt(decimals);
  const frac = (v % 10n ** BigInt(decimals)).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

// --------------------------------------------------------- transactions

/** Morpho reverts with plain strings; say what they mean. */
const REASONS: [RegExp, string][] = [
  [/insufficient collateral/i, "Not enough collateral for that borrow (or for withdrawing that much collateral)."],
  [/insufficient liquidity/i, "The market does not have that much USDG free right now. Lenders' funds are borrowed out; try a smaller amount."],
  [/transfer.*amount exceeds balance|exceeds balance|insufficient balance/i, "Your wallet does not hold that much."],
  [/allowance/i, "The token approval is too low. Approve again."],
  [/inconsistent input/i, "Enter an amount."],
  [/zero assets/i, "Enter an amount above zero."],
  [/blocked|paused/i, "The token issuer has paused or blocked this transfer."],
];

async function rawCall(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  return (await res.json()) as { result?: string; error?: { message?: string } };
}

/** Dry run as the wallet; throws a readable reason when the call would revert. */
export async function simulate(tx: { from: string; to: string; data: string }) {
  let lastError: unknown;
  for (const url of [CHAIN.rpc, CHAIN.fallbackRpc]) {
    try {
      const body = await rawCall(url, { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ from: tx.from, to: tx.to, data: tx.data }, "latest"] });
      if (!body.error) return;
      const message = body.error.message ?? "";
      const known = REASONS.find(([re]) => re.test(message));
      throw new Error(known ? known[1] : message || "The transaction would fail.");
    } catch (error) {
      if (error instanceof Error && !/^RPC \d+|fetch/i.test(error.message)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not reach the chain.");
}

export async function waitReceipt(hash: string, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = await rpc<{ status: string } | null>("eth_getTransactionReceipt", [hash]).catch(() => null);
    if (receipt) {
      if (receipt.status !== "0x1") throw new Error("The transaction reverted on chain.");
      return;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("Still waiting for the block. Check the explorer for the result.");
}
