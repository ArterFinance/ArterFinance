"use client";

import { useState } from "react";
import { BorrowPanel, marketTrust } from "@/components/morpho/Panels";
import { useMorpho } from "@/components/morpho/useMorpho";
import { useLive } from "@/lib/data";
import { pct, usd } from "@/lib/finance";

/** The live Morpho borrow panel for one collateral asset, or why there is none. */
export function LiveBorrow({ symbol }: { symbol: string }) {
  const { markets } = useLive();
  const all = markets.filter((m) => m.collateral === symbol);
  const { markets: chain } = useMorpho(all.map((m) => m.id));
  // Verified markets first, then the one with the most USDG free.
  const ok = (id: string) => (marketTrust(chain[id], all.find((m) => m.id === id)!)?.ok ? 1 : 0);
  const options = [...all].sort((a, b) => ok(b.id) - ok(a.id) || b.liquidityUsd - a.liquidityUsd);
  const [picked, setPicked] = useState<string | null>(null);
  const market = options.find((m) => m.id === picked) ?? options[0] ?? null;

  if (!market) {
    return (
      <div className="rounded-[4px] border border-dashed border-line-2 p-5 text-[14px] leading-relaxed text-ink-2" data-testid="live-borrow-none">
        <span className="live-tag">Live on Morpho</span>
        <p className="mt-3">
          No live Morpho market lends USDG against {symbol} on Robinhood Chain yet, so it can only be simulated below. Markets that exist today take NVDA,
          GOOGL, AAPL and TSLA among others.
        </p>
      </div>
    );
  }
  return (
    <div className="panel p-5" data-testid="live-borrow">
      {options.length > 1 ? (
        <label className="mb-4 block">
          <span className="label">Market</span>
          <select value={market.id} onChange={(e) => setPicked(e.target.value)} className="field mt-2 text-[14px]">
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {symbol} → USDG · {usd(m.liquidityUsd)} free · borrow {pct(m.borrowApy)}
                {chain[m.id] ? (ok(m.id) ? " · verified" : " · not offered") : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <BorrowPanel key={market.id} market={market} symbol={symbol} />
    </div>
  );
}
