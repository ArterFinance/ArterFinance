import { NextResponse } from "next/server";
import { ASSETS, USDG } from "@/config/assets";

export const dynamic = "force-dynamic";

export type MarketRow = {
  id: string;
  collateral: string;
  collateralAddress: string;
  collateralDecimals: number;
  /** Listed by Morpho (curated in its app), as opposed to permissionless. */
  listed: boolean;
  loan: string;
  lltv: number;
  supplyUsd: number;
  borrowUsd: number;
  collateralUsd: number;
  liquidityUsd: number;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
};
export type MarketsResponse = { markets: MarketRow[]; readAt: number; source: string };

type Raw = {
  marketId: string;
  lltv: string;
  listed: boolean;
  loanAsset: { address: string; symbol: string };
  collateralAsset: { address: string; symbol: string; decimals: number } | null;
  state: {
    supplyAssetsUsd: number | null;
    borrowAssetsUsd: number | null;
    collateralAssetsUsd: number | null;
    liquidityAssetsUsd: number | null;
    supplyApy: number | null;
    borrowApy: number | null;
    utilization: number | null;
  } | null;
};

const QUERY = `{ markets(first: 1000, where: { chainId_in: [4663] }) { items {
  marketId lltv listed
  loanAsset { address symbol } collateralAsset { address symbol decimals }
  state { supplyAssetsUsd borrowAssetsUsd collateralAssetsUsd liquidityAssetsUsd supplyApy borrowApy utilization }
} } }`;

/** Markets smaller than this are test or dust markets, not a reference. */
const MIN_SUPPLY_USD = 1000;
let cache: { at: number; body: MarketsResponse } | null = null;

/**
 * Morpho Blue lending markets on Robinhood Chain that lend the real USDG,
 * read from the Morpho API. A market is kept when its collateral is one of
 * the verified assets, or Morpho lists it, and it holds at least $1,000.
 * These are other people's markets, shown as a live reference only.
 */
export async function GET() {
  if (cache && Date.now() - cache.at < 120_000) return NextResponse.json(cache.body);
  try {
    const res = await fetch("https://api.morpho.org/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json()) as { data?: { markets?: { items?: Raw[] } } };
    const items = body.data?.markets?.items;
    if (!items) throw new Error("no markets");
    const verified = new Map(ASSETS.map((a) => [a.address.toLowerCase(), a.symbol]));
    const markets: MarketRow[] = [];
    for (const m of items) {
      if (!m.state || !m.collateralAsset) continue;
      if (m.loanAsset.address.toLowerCase() !== USDG.address.toLowerCase()) continue;
      const known = verified.get(m.collateralAsset.address.toLowerCase());
      if (!known && !m.listed) continue;
      if ((m.state.supplyAssetsUsd ?? 0) < MIN_SUPPLY_USD) continue;
      markets.push({
        id: m.marketId,
        collateral: known ?? m.collateralAsset.symbol,
        collateralAddress: m.collateralAsset.address,
        collateralDecimals: m.collateralAsset.decimals,
        listed: m.listed,
        loan: "USDG",
        lltv: Number(m.lltv) / 1e18,
        supplyUsd: m.state.supplyAssetsUsd ?? 0,
        borrowUsd: m.state.borrowAssetsUsd ?? 0,
        collateralUsd: m.state.collateralAssetsUsd ?? 0,
        liquidityUsd: m.state.liquidityAssetsUsd ?? 0,
        supplyApy: (m.state.supplyApy ?? 0) * 100,
        borrowApy: (m.state.borrowApy ?? 0) * 100,
        utilization: (m.state.utilization ?? 0) * 100,
      });
    }
    markets.sort((a, b) => b.supplyUsd - a.supplyUsd);
    const out: MarketsResponse = { markets, readAt: Date.now(), source: "Morpho API" };
    cache = { at: Date.now(), body: out };
    return NextResponse.json(out);
  } catch {
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json({ error: "Could not reach the Morpho API right now." }, { status: 503 });
  }
}
