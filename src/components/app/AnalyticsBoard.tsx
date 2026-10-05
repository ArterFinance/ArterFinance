"use client";

import { useState } from "react";
import { ASSETS, RISK, type AssetClass } from "@/config/assets";
import { MarketsTable } from "@/components/app/MarketsTable";
import { AssetIcon, Ago, Figure, feedAge, useNow } from "@/components/ui";
import { ChainPulseProvider, useChainPulse } from "@/lib/chain";
import { useLive } from "@/lib/data";
import { fmt } from "@/lib/chain";
import { pct, usd } from "@/lib/finance";

function Pulse() {
  const pulse = useChainPulse();
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 lg:grid-cols-4">
      <div className="bg-card p-5">
        <Figure label="Latest block" value={fmt(pulse.block)} note={pulse.error && !pulse.block ? "RPC unreachable" : "Robinhood Chain RPC"} />
      </div>
      <div className="bg-card p-5">
        <Figure label="Block time" value={pulse.blockTime ? `${pulse.blockTime.toFixed(2)}s` : "—"} note="Average of the last 100 blocks" />
      </div>
      <div className="bg-card p-5">
        <Figure label="Gas price" value={pulse.gasGwei === null ? "—" : `${pulse.gasGwei.toFixed(4)} gwei`} note="eth_gasPrice" />
      </div>
      <div className="bg-card p-5">
        <Figure label="Arter vault TVL" value="$0" note="Not deployed" tone="brass" />
      </div>
    </div>
  );
}

const FILTERS: (AssetClass | "all")[] = ["all", "cash", "treasury", "gold", "index", "commodity", "stock", "highbeta"];

export function AnalyticsBoard() {
  const { prices, pricesAt, markets } = useLive();
  const now = useNow(30000);
  const [filter, setFilter] = useState<AssetClass | "all">("all");
  const rows = ASSETS.filter((a) => filter === "all" || a.cls === filter);

  // Where USDG is lent today, by collateral, across the reference markets.
  const byCollateral = new Map<string, number>();
  for (const m of markets) byCollateral.set(m.collateral, (byCollateral.get(m.collateral) ?? 0) + m.supplyUsd);
  const dist = [...byCollateral.entries()].sort((a, b) => b[1] - a[1]);
  const distTotal = dist.reduce((s, [, v]) => s + v, 0);
  const top = dist.slice(0, 6);
  const rest = dist.slice(6).reduce((s, [, v]) => s + v, 0);

  return (
    <div className="mx-auto max-w-[1240px] space-y-16 px-4 py-10 sm:px-6 lg:py-12">
      <ChainPulseProvider>
        <Pulse />
      </ChainPulseProvider>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="live-tag">Chainlink on Robinhood Chain</span>
            <h2 className="serif mt-3 text-[30px] sm:text-[36px]">Oracle prices</h2>
          </div>
          <p className="font-mono text-[11px] text-ink-3">
            {Object.keys(prices).length} feeds · <Ago at={pricesAt} />
          </p>
        </div>
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 cursor-pointer rounded-[3px] border px-2.5 py-1 text-[13px] whitespace-nowrap ${filter === f ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-ink"}`}
            >
              {f === "all" ? "All" : RISK[f].label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => {
            const row = prices[a.symbol];
            return (
              <div key={a.symbol} className="flex items-center gap-3 bg-card px-4 py-3" data-testid="price-row">
                <AssetIcon symbol={a.symbol} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.symbol}</p>
                  <p className="text-[12px] leading-snug text-ink-3">{a.name}</p>
                </div>
                <div className="text-right">
                  <p className="figure text-[15px]">{row ? usd(row.price) : "…"}</p>
                  <p className="font-mono text-[11px] text-ink-3">{row && now ? feedAge(row.updatedAt, now) : ""}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
          Equity, ETF and commodity feeds update every 24 hours or on a 0.5% move and follow US market hours (24/5), so an older timestamp on a
          weekend is normal. A vault oracle must treat that schedule as part of its staleness check.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="min-w-0">
          <span className="live-tag">Live reference · not Arter</span>
          <h2 className="serif mt-3 text-[30px] sm:text-[36px]">Where USDG is lent today</h2>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            Share of USDG supplied in Morpho markets on Robinhood Chain, by the collateral borrowers post. It shows how much of today&apos;s
            on-chain credit already runs against tokenized assets.
          </p>
        </div>
        <div className="min-w-0 space-y-3">
          {top.map(([sym, v]) => (
            <div key={sym}>
              <div className="flex justify-between text-[13.5px]">
                <span>{sym}</span>
                <span className="figure text-ink-2">
                  {usd(v)} · {pct((v / (distTotal || 1)) * 100, 1)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full bg-moss" style={{ width: `${Math.max(0.5, (v / (distTotal || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
          {rest > 0 ? (
            <div>
              <div className="flex justify-between text-[13.5px]">
                <span>Everything else</span>
                <span className="figure text-ink-2">
                  {usd(rest)} · {pct((rest / (distTotal || 1)) * 100, 1)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full bg-brass" style={{ width: `${Math.max(0.5, (rest / (distTotal || 1)) * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {dist.length === 0 ? <p className="text-ink-3">Reading markets…</p> : null}
        </div>
      </section>

      <MarketsTable title="Every USDG market worth reading" />
    </div>
  );
}
