"use client";

import { ASSETS } from "@/config/assets";
import { AssetIcon, Ago } from "@/components/ui";
import { useLive } from "@/lib/data";
import { pct, usd } from "@/lib/finance";

/** Morpho Blue USDG markets on Robinhood Chain, as a clearly separated live reference. */
export function MarketsTable({ title, limit }: { title: string; limit?: number }) {
  const { markets, marketsAt, marketsError } = useLive();
  const rows = limit ? markets.slice(0, limit) : markets;
  const known = new Set(ASSETS.map((a) => a.symbol));
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="live-tag">Live reference · not Arter</span>
          <h2 className="serif mt-3 text-[30px] leading-tight sm:text-[36px]">{title}</h2>
        </div>
        <p className="font-mono text-[11px] text-ink-3">
          Morpho API · <Ago at={marketsAt} />
        </p>
      </div>
      <div className="mt-5 overflow-x-auto rounded-[4px] border border-line-2 bg-card">
        <table className="w-full min-w-[760px] text-[14px]" data-testid="markets-table">
          <thead>
            <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
              <th className="px-4 py-2.5 font-normal">Collateral → loan</th>
              <th className="px-4 py-2.5 text-right font-normal">Supplied</th>
              <th className="px-4 py-2.5 text-right font-normal">Borrowed</th>
              <th className="px-4 py-2.5 text-right font-normal">Supply APY</th>
              <th className="px-4 py-2.5 text-right font-normal">Borrow APY</th>
              <th className="px-4 py-2.5 text-right font-normal">Utilization</th>
              <th className="px-4 py-2.5 text-right font-normal">LLTV</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
                  {marketsError ? "The Morpho API could not be reached. Try again shortly." : "Reading markets…"}
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {known.has(m.collateral) ? <AssetIcon symbol={m.collateral} size={22} /> : <span className="size-[22px] shrink-0 rounded-full border border-line-2 bg-paper-2" />}
                      <span>
                        {m.collateral} <span className="text-ink-3">→ USDG</span>
                      </span>
                    </span>
                  </td>
                  <td className="figure px-4 py-3 text-right">{usd(m.supplyUsd)}</td>
                  <td className="figure px-4 py-3 text-right">{usd(m.borrowUsd)}</td>
                  <td className="figure px-4 py-3 text-right text-moss">{pct(m.supplyApy)}</td>
                  <td className="figure px-4 py-3 text-right">{pct(m.borrowApy)}</td>
                  <td className="figure px-4 py-3 text-right">{pct(m.utilization, 1)}</td>
                  <td className="figure px-4 py-3 text-right">{pct(m.lltv * 100, 1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
        Morpho Blue markets on Robinhood Chain that lend the real USDG, filtered to verified collateral or markets Morpho lists, with at least
        $1,000 supplied. They belong to other curators and lenders; Arter has no position in them and none of their balances count as Arter&apos;s.
      </p>
    </div>
  );
}
