"use client";

import { ASSETS } from "@/config/assets";
import { AssetIcon } from "@/components/ui";
import { useLive } from "@/lib/data";
import { usd } from "@/lib/finance";

/** The verified assets with their live Chainlink prices, as a slow tape. */
export function Tape() {
  const { prices } = useLive();
  const row = ASSETS.map((a) => (
    <span key={a.symbol} className="flex shrink-0 items-center gap-2 border-r border-line px-5 py-3">
      <AssetIcon symbol={a.symbol} size={22} />
      <span className="text-[14px] font-medium">{a.symbol}</span>
      <span className="figure text-[13px] text-ink-3">{prices[a.symbol] ? usd(prices[a.symbol].price) : "…"}</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-line-2 bg-card" aria-label="Verified assets and their live prices" data-qa-skip>
      <div className="flex w-max" style={{ animation: "ticker 90s linear infinite" }}>
        <div className="flex">{row}</div>
        <div className="flex" aria-hidden="true">
          {row}
        </div>
      </div>
    </div>
  );
}
