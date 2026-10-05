import { RESOLVED_ASSETS } from "@/config/assets.generated";
import { TARGET_APY } from "@/config/brand";

/**
 * Real assets on Robinhood Chain that Arter is designed around.
 * Stock, ETF and commodity tokens come from assets.generated.ts (verified
 * on-chain by scripts/resolve-assets.mjs); USDG is Paxos' dollar token.
 */

export type AssetClass = "cash" | "treasury" | "gold" | "index" | "commodity" | "stock" | "highbeta";

export type Asset = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  /** Chainlink USD feed proxy on Robinhood Chain. */
  feed: `0x${string}`;
  cls: AssetClass;
  /** Robinhood stock tokens report dividends through uiMultiplier. */
  multiplier: boolean;
};

export const USDG: Asset = {
  symbol: "USDG",
  name: "Global Dollar",
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  decimals: 6,
  feed: "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2",
  cls: "cash",
  multiplier: false,
};

export const ETH_USD_FEED = "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9";

const CLASS_OF: Record<string, AssetClass> = {
  SGOV: "treasury",
  GLD: "gold",
  SPY: "index",
  QQQ: "index",
  EWY: "index",
  SLV: "commodity",
  USO: "commodity",
  NVDA: "stock",
  AAPL: "stock",
  MSFT: "stock",
  GOOGL: "stock",
  AMZN: "stock",
  META: "stock",
  TSM: "stock",
  ORCL: "stock",
  ASML: "stock",
  AMD: "stock",
  INTC: "stock",
  MU: "stock",
  DELL: "stock",
  BABA: "stock",
  TSLA: "stock",
};

export const ASSETS: Asset[] = [
  USDG,
  ...RESOLVED_ASSETS.map((a) => ({
    ...a,
    decimals: 18,
    cls: CLASS_OF[a.symbol] ?? ("highbeta" as AssetClass),
    multiplier: true,
  })),
];

export const assetBySymbol = (symbol: string) => ASSETS.find((a) => a.symbol === symbol.toUpperCase()) ?? null;

/**
 * Conservative borrowing parameters per asset class, used by the borrow
 * simulator. maxLtv: the most you can borrow against the collateral.
 * liqLtv: the debt-to-collateral ratio at which a position is liquidated.
 * Deliberately below the 62.5% LLTV the live stock markets use today.
 */
export const RISK: Record<AssetClass, { label: string; maxLtv: number; liqLtv: number; note: string }> = {
  cash: { label: "Dollar token", maxLtv: 0.85, liqLtv: 0.9, note: "Pegged to USD; the risk is the peg and the issuer." },
  treasury: { label: "Treasury ETF", maxLtv: 0.8, liqLtv: 0.86, note: "Short-dated T-bill fund; low volatility, priced 24/5." },
  gold: { label: "Gold ETF", maxLtv: 0.6, liqLtv: 0.7, note: "Gold moves 1-2% on a busy day; weekends carry gap risk." },
  index: { label: "Index ETF", maxLtv: 0.55, liqLtv: 0.65, note: "Broad baskets fall less than single names, but they still gap." },
  commodity: { label: "Commodity ETF", maxLtv: 0.45, liqLtv: 0.55, note: "Silver and oil swing harder than gold." },
  stock: { label: "Large-cap stock", maxLtv: 0.45, liqLtv: 0.55, note: "Single names can drop 10% on earnings overnight." },
  highbeta: { label: "High-volatility stock", maxLtv: 0.3, liqLtv: 0.4, note: "Names that routinely move 5-10% a day get the tightest limits." },
};

export type Vault = {
  symbol: string;
  /** Target APY band inside the 3-7% range. Targets, not live rates. */
  target: [number, number];
  headline: string;
  about: string;
  sources: string[];
};

/** Vaults Arter is designed to open first. None is deployed yet. */
export const VAULTS: Vault[] = [
  {
    symbol: "USDG",
    target: [4, 7],
    headline: "Dollars that do not sit still.",
    about: "Deposit USDG and it is lent to isolated markets where borrowers post tokenized stocks, gold or treasuries as collateral.",
    sources: ["Interest from overcollateralized USDG loans", "Rebalanced toward the deepest markets each day"],
  },
  {
    symbol: "SGOV",
    target: [3, 5],
    headline: "T-bills, with a second job.",
    about: "SGOV already tracks short-dated Treasuries. The vault lends it to borrowers who need treasury collateral and keeps it in your name.",
    sources: ["Lending SGOV against USDG collateral", "The fund's own distributions arrive through uiMultiplier and stay yours"],
  },
  {
    symbol: "GLD",
    target: [3, 5],
    headline: "Gold that pays you back.",
    about: "Tokenized gold usually earns nothing. The vault lends GLD and provides GLD/USDG liquidity in a tight band, paid out in GLD.",
    sources: ["Lending GLD to overcollateralized borrowers", "Fees from a narrow GLD/USDG liquidity range"],
  },
  ...["SPY", "QQQ"].map((symbol) => ({
    symbol,
    target: [3, 6] as [number, number],
    headline: "The whole index, earning.",
    about: `Hold ${symbol} exposure and let the vault lend it out and quote it in a liquidity range. Price moves stay yours.`,
    sources: [`Lending ${symbol} to overcollateralized borrowers`, `Fees from ${symbol}/USDG liquidity`],
  })),
  ...["NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "META"].map((symbol) => ({
    symbol,
    target: [3, 6] as [number, number],
    headline: "Keep the upside. Add a yield.",
    about: `Your ${symbol} keeps its price exposure and its dividends. The vault puts the idle balance to work and pays the yield in ${symbol}.`,
    sources: [`Lending ${symbol} to overcollateralized borrowers`, `Fees from ${symbol}/USDG liquidity`],
  })),
];

export const vaultBySymbol = (symbol: string) => VAULTS.find((v) => v.symbol === symbol.toUpperCase()) ?? null;

export const clampToBand = (apy: number) => Math.min(TARGET_APY.max, Math.max(TARGET_APY.min, apy));
