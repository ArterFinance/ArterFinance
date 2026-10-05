import { NextResponse } from "next/server";
import { ASSETS, ETH_USD_FEED } from "@/config/assets";
import { serverEthCalls } from "@/lib/server/chain";
import { readWord } from "@/lib/abi";

export const dynamic = "force-dynamic";

export type PriceRow = { price: number; updatedAt: number };
export type PricesResponse = { prices: Record<string, PriceRow>; readAt: number; source: string };

const LATEST_ROUND_DATA = "0xfeaf968c";
let cache: { at: number; body: PricesResponse } | null = null;

/**
 * Chainlink USD prices for every asset the site lists, read with eth_call on
 * Robinhood Chain. Equity feeds update on a 24 h heartbeat or a 0.5% move and
 * follow US market hours (24/5), so updatedAt is returned with each price.
 * A failed read is never cached; the client keeps its last good answer.
 */
export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return NextResponse.json(cache.body);
  const feeds = [{ symbol: "ETH", feed: ETH_USD_FEED }, ...ASSETS.map((a) => ({ symbol: a.symbol, feed: a.feed }))];
  try {
    const results = await serverEthCalls(feeds.map((f) => ({ to: f.feed, data: LATEST_ROUND_DATA })));
    const prices: Record<string, PriceRow> = {};
    feeds.forEach((f, i) => {
      const r = results[i];
      if (!r || r === "0x") return;
      const answer = Number(readWord(r, 1)) / 1e8;
      const updatedAt = Number(readWord(r, 3)) * 1000;
      if (answer > 0) prices[f.symbol] = { price: answer, updatedAt };
    });
    if (Object.keys(prices).length < feeds.length / 2) throw new Error("too few prices");
    const body: PricesResponse = { prices, readAt: Date.now(), source: "Chainlink on Robinhood Chain" };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch {
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json({ error: "Could not read the price feeds right now." }, { status: 503 });
  }
}
