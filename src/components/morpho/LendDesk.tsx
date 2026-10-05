"use client";

import { useState } from "react";
import { ASSETS } from "@/config/assets";
import { AssetIcon, Ago } from "@/components/ui";
import { LendPanel, marketTrust } from "@/components/morpho/Panels";
import { useMorpho } from "@/components/morpho/useMorpho";
import { MorphoPositions } from "@/components/morpho/MorphoPositions";
import { useLive } from "@/lib/data";
import { pct, usd } from "@/lib/finance";

/** Pick a live Morpho USDG market and lend into it from the wallet. */
export function LendDesk() {
  const { markets, marketsAt, marketsError } = useLive();
  const known = new Set(ASSETS.map((a) => a.symbol));
  const [picked, setPicked] = useState<string | null>(null);
  const { markets: chain } = useMorpho(markets.map((m) => m.id));
  const trust = (id: string) => marketTrust(chain[id], markets.find((m) => m.id === id)!);
  const selected = markets.find((m) => m.id === picked) ?? markets.find((m) => trust(m.id)?.ok) ?? markets[0] ?? null;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="serif text-[30px] leading-tight sm:text-[36px]">USDG markets on Morpho</h2>
            <p className="font-mono text-[11px] text-ink-3">
              Morpho API · <Ago at={marketsAt} />
            </p>
          </div>
          <div className="mt-5 overflow-x-auto rounded-[4px] border border-line-2 bg-card">
            <table className="w-full min-w-[720px] text-[14px]" data-testid="lend-markets">
              <thead>
                <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-normal">Lent against</th>
                  <th className="px-4 py-2.5 text-right font-normal">Supply APY</th>
                  <th className="px-4 py-2.5 text-right font-normal">Supplied</th>
                  <th className="px-4 py-2.5 text-right font-normal">Free</th>
                  <th className="px-4 py-2.5 text-right font-normal">Utilization</th>
                  <th className="px-4 py-2.5 font-normal">Check</th>
                  <th className="px-4 py-2.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {markets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
                      {marketsError ? "The Morpho API could not be reached. Try again shortly." : "Reading markets…"}
                    </td>
                  </tr>
                ) : (
                  markets.map((m) => (
                    <tr key={m.id} className={`border-t border-line ${selected?.id === m.id ? "bg-paper-2/50" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {known.has(m.collateral) ? (
                            <AssetIcon symbol={m.collateral} size={22} />
                          ) : (
                            <span className="size-[22px] shrink-0 rounded-full border border-line-2 bg-paper-2" />
                          )}
                          <span>
                            {m.collateral}
                            {m.listed ? <span className="ml-1.5 font-mono text-[10.5px] text-moss uppercase">listed</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className="figure px-4 py-3 text-right text-moss">{pct(m.supplyApy)}</td>
                      <td className="figure px-4 py-3 text-right">{usd(m.supplyUsd)}</td>
                      <td className={`figure px-4 py-3 text-right ${m.liquidityUsd < 1000 ? "text-rust" : ""}`}>{usd(m.liquidityUsd)}</td>
                      <td className="figure px-4 py-3 text-right">{pct(m.utilization, 1)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase" title={trust(m.id)?.reason}>
                        {trust(m.id) === null ? "…" : trust(m.id)!.ok ? <span className="text-moss">verified</span> : <span className="text-rust">not offered</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setPicked(m.id)} className="btn btn-paper h-8 px-3 text-[12.5px]" data-testid="lend-pick">
                          {selected?.id === m.id ? "Selected" : "Lend"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-2 text-[13px] leading-relaxed text-ink-2">
            <p>
              <strong className="text-ink">Higher rate, less exit.</strong> Markets lent against stock tokens pay more because borrowers use nearly all of the
              pool; what is not free (the &ldquo;Free&rdquo; column) can only be withdrawn as borrowers repay. Listed markets backed by USDe and syrupUSDG are
              deep and liquid.
            </p>
            <p>
              <strong className="text-ink">Checked on chain.</strong> Anyone can open a Morpho market, including one with a price oracle they control. Arter offers deposits only
              where the market lends real USDG with Morpho&apos;s standard rate model and either it is one of the deep Morpho-listed markets with its oracle pinned, or its oracle
              is Morpho&apos;s Chainlink oracle on the asset&apos;s own feed with the decimals checked and a liquidation LTV of at most 77%. Markets marked &ldquo;not offered&rdquo; use custom oracles Arter cannot verify; existing positions there can still be withdrawn.
            </p>
            <p className="text-ink-3">
              These are Morpho Blue markets run by their own curators. Arter is the interface: it adds no fee and never holds your USDG.
            </p>
          </div>
          <div className="mt-10">
            <MorphoPositions />
          </div>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">{selected ? <LendPanel key={selected.id} market={selected} /> : <p className="text-ink-3">Reading markets…</p>}</div>
        </aside>
      </div>
    </div>
  );
}
