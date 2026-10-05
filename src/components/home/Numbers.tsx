"use client";

import Link from "next/link";
import { ASSETS } from "@/config/assets";
import { Ago, Figure } from "@/components/ui";
import { useLive } from "@/lib/data";
import { pct, usd } from "@/lib/finance";

/** Figures read from the chain and the Morpho API, next to Arter's honest zero. */
export function Numbers() {
  const { markets, marketsAt, marketsError } = useLive();
  const usdgSupplied = markets.reduce((s, m) => s + m.supplyUsd, 0);
  const deep = markets.filter((m) => m.supplyUsd >= 1_000_000).sort((a, b) => b.supplyUsd - a.supplyUsd)[0] ?? null;
  const stockMarkets = markets.filter((m) => ASSETS.some((a) => a.symbol === m.collateral && a.cls !== "cash"));
  const loading = !marketsAt && !marketsError;

  return (
    <section id="numbers" className="border-b border-line-2">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_2fr] lg:py-20">
        <div className="min-w-0">
          <h2 className="serif text-[38px] leading-[1.05] sm:text-[44px]">Numbers you can check.</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-2">
            Every figure here is read live, from Robinhood Chain or from the lending markets already running on it. Arter&apos;s own
            column stays at zero until its contracts exist.
          </p>
          <p className="mt-4 font-mono text-[11px] text-ink-3">
            Morpho API · <Ago at={marketsAt} />
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 sm:grid-cols-2">
          <div className="bg-card p-6">
            <Figure
              label="Verified asset tokens"
              value={ASSETS.length}
              note={`${ASSETS.length - 1} stock, ETF and commodity tokens checked against Robinhood's token beacon, plus USDG.`}
            />
          </div>
          <div className="bg-card p-6">
            <Figure
              label="USDG lent in reference markets"
              value={loading ? "…" : marketsError && !marketsAt ? "unavailable" : usd(usdgSupplied)}
              note={`Across ${markets.length || "the"} live Morpho markets on Robinhood Chain, ${stockMarkets.length} of them against tokenized stocks or funds.`}
              tone="moss"
            />
          </div>
          <div className="bg-card p-6">
            <Figure
              label="USDG supply APY, deepest market"
              value={loading ? "…" : deep ? pct(deep.supplyApy) : "—"}
              note={deep ? `${deep.collateral} collateral, ${usd(deep.supplyUsd)} supplied. Someone else's market, live.` : "Read from the Morpho API."}
              tone="moss"
            />
          </div>
          <div className="bg-card p-6">
            <Figure label="Arter TVL" value="$0" note="Vaults are not deployed. Nothing on this site is counted as Arter deposits." tone="brass" />
            <Link href="/analytics" className="mt-4 inline-block text-[13px] text-ink underline decoration-brass underline-offset-4">
              See every live market
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
