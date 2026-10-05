"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { MarketRow, MarketsResponse } from "@/app/api/markets/route";
import type { PriceRow, PricesResponse } from "@/app/api/prices/route";
import { ASSETS, type Asset } from "@/config/assets";
import { address as encodeAddress, readWord } from "@/lib/abi";
import { rpcBatch } from "@/lib/rpc";

type Live = {
  prices: Record<string, PriceRow>;
  pricesAt: number | null;
  pricesError: boolean;
  markets: MarketRow[];
  marketsAt: number | null;
  marketsError: boolean;
};

const EMPTY: Live = { prices: {}, pricesAt: null, pricesError: false, markets: [], marketsAt: null, marketsError: false };
const LiveContext = createContext<Live>(EMPTY);

/**
 * Chainlink prices and the Morpho reference markets, fetched once for the
 * whole site through the app's own API routes and refreshed in the background.
 */
export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<Live>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error();
        const body = (await res.json()) as PricesResponse;
        if (!cancelled) setLive((l) => ({ ...l, prices: body.prices, pricesAt: body.readAt, pricesError: false }));
      } catch {
        if (!cancelled) setLive((l) => ({ ...l, pricesError: true }));
      }
    };
    const loadMarkets = async () => {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) throw new Error();
        const body = (await res.json()) as MarketsResponse;
        if (!cancelled) setLive((l) => ({ ...l, markets: body.markets, marketsAt: body.readAt, marketsError: false }));
      } catch {
        if (!cancelled) setLive((l) => ({ ...l, marketsError: true }));
      }
    };
    loadPrices();
    loadMarkets();
    const a = window.setInterval(loadPrices, 60_000);
    const b = window.setInterval(loadMarkets, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}

/** USD price of a symbol, or null while unknown. */
export function usePrice(symbol: string) {
  return useLive().prices[symbol]?.price ?? null;
}

/** The deepest live market that takes `symbol` as collateral, if any. */
export function bestMarketFor(markets: MarketRow[], symbol: string) {
  return markets.filter((m) => m.collateral === symbol).sort((a, b) => b.supplyUsd - a.supplyUsd)[0] ?? null;
}

export type Holding = { asset: Asset; units: number };

const BALANCE_OF = "0x70a08231";
const UI_MULTIPLIER = "0xa60bf13d";

/**
 * Real balances of every listed asset for one wallet, read from Robinhood
 * Chain. Stock tokens are scaled by uiMultiplier, which is how they show
 * dividends; the result is the share count a holder would recognise.
 */
export function useHoldings(owner: string | null) {
  const [state, setState] = useState<{ owner: string | null; holdings: Holding[] | null; error: boolean }>({
    owner: null,
    holdings: null,
    error: false,
  });

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    const load = async () => {
      try {
        const calls = ASSETS.flatMap((a) => [
          { method: "eth_call", params: [{ to: a.address, data: BALANCE_OF + encodeAddress(owner) }, "latest"] },
          ...(a.multiplier ? [{ method: "eth_call", params: [{ to: a.address, data: UI_MULTIPLIER }, "latest"] }] : []),
        ]);
        const results: string[] = [];
        for (let i = 0; i < calls.length; i += 20) results.push(...(await rpcBatch<string>(calls.slice(i, i + 20))));
        let k = 0;
        const holdings: Holding[] = [];
        for (const asset of ASSETS) {
          const raw = readWord(results[k++] ?? "0x", 0);
          const mult = asset.multiplier ? readWord(results[k++] ?? "0x", 0) : 0n;
          const scaled = asset.multiplier && mult > 0n ? (raw * mult) / 10n ** 18n : raw;
          const units = Number(scaled) / 10 ** asset.decimals;
          if (units > 0) holdings.push({ asset, units });
        }
        if (!cancelled) setState({ owner, holdings, error: false });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, owner, error: true }));
      }
    };
    load();
    const t = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [owner]);

  if (!owner || state.owner !== owner) return { holdings: null, error: false, loading: Boolean(owner) };
  return { holdings: state.holdings, error: state.error, loading: state.holdings === null && !state.error };
}
