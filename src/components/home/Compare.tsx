"use client";

import { useState } from "react";
import Link from "next/link";
import { VAULTS } from "@/config/assets";
import { TARGET_APY } from "@/config/brand";
import { GrowthChart } from "@/components/GrowthChart";
import { AssetIcon } from "@/components/ui";
import { useLive } from "@/lib/data";
import { aprFromApy, cleanAmount, grow, num, usd } from "@/lib/finance";

const PICKS = ["GLD", "USDG", "NVDA", "SGOV", "SPY"];

/** Holding versus the same balance compounding daily at a target APY. */
export function Compare() {
  const { prices } = useLive();
  const [symbol, setSymbol] = useState("GLD");
  const [amount, setAmount] = useState("100");
  const [years, setYears] = useState<1 | 5>(1);
  const [apy, setApy] = useState(5);
  const units = Number(amount) || 0;
  const days = years * 365;
  const after = grow(units, apy, days);
  const extra = after - units;
  const price = prices[symbol]?.price ?? null;
  const band = VAULTS.find((v) => v.symbol === symbol)?.target;

  return (
    <section id="compare" className="bg-deep text-paper">
      <div className="ruled-dark">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">
              Hold it, or put it <em className="text-brass">to work.</em>
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-paper/70 lg:justify-self-end">
              The same balance, side by side. Yield arrives as more of the asset you put in, so the price exposure is identical on both
              lines; only the unit count differs.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]">
            <div className="min-w-0 space-y-6">
              <div>
                <p className="font-mono text-[11px] tracking-[0.08em] text-paper/55 uppercase">Asset</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PICKS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSymbol(s);
                        setAmount(s === "USDG" ? "10000" : s === "SGOV" ? "100" : "50");
                      }}
                      className={`flex cursor-pointer items-center gap-2 rounded-[3px] border px-2.5 py-1.5 text-[13.5px] transition-colors ${symbol === s ? "border-brass bg-brass text-ink" : "border-paper/25 text-paper/80 hover:border-paper/60"}`}
                    >
                      <AssetIcon symbol={s} size={18} className="ring-0" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="font-mono text-[11px] tracking-[0.08em] text-paper/55 uppercase">Amount ({symbol})</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(cleanAmount(e.target.value))}
                  className="figure mt-2 w-full rounded-[3px] border border-paper/25 bg-deep-2 px-3 py-2.5 text-[22px] text-paper outline-none focus:border-brass"
                  aria-label={`Amount of ${symbol}`}
                />
                <span className="mt-1.5 block font-mono text-[11px] text-paper/50">
                  {price === null ? "Reading price…" : `≈ ${usd(units * price)} at ${usd(price)} (Chainlink)`}
                </span>
              </label>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] tracking-[0.08em] text-paper/55 uppercase">Target APY</span>
                  <span className="figure text-[18px] text-brass">{apy.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  className="range mt-2"
                  min={TARGET_APY.min}
                  max={TARGET_APY.max}
                  step={0.1}
                  value={apy}
                  onChange={(e) => setApy(Number(e.target.value))}
                  aria-label="Target APY"
                  style={{ accentColor: "#c08a2e" }}
                />
                <p className="mt-1 font-mono text-[11px] text-paper/50">
                  {aprFromApy(apy).toFixed(2)}% simple rate, compounded daily.{band ? ` ${symbol} vault target: ${band[0]}-${band[1]}%.` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {([1, 5] as const).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYears(y)}
                    className={`cursor-pointer rounded-[3px] border px-4 py-2 font-mono text-[13px] ${years === y ? "border-paper bg-paper text-ink" : "border-paper/25 text-paper/75 hover:border-paper/60"}`}
                  >
                    +{y}Y
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-[4px] border border-paper/15 bg-deep-2 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-[0.06em] text-paper/50 uppercase">Just holding</p>
                  <p className="figure mt-1.5 text-[24px] break-words">
                    {num(units, units >= 1000 ? 0 : 2)} <span className="text-[14px] text-paper/50">{symbol}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-[0.06em] text-paper/50 uppercase">In a vault, +{years}Y</p>
                  <p className="figure mt-1.5 text-[24px] break-words text-brass">
                    {num(after, after >= 1000 ? 2 : 4)} <span className="text-[14px] text-paper/50">{symbol}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-[0.06em] text-paper/50 uppercase">Extra, at today&apos;s price</p>
                  <p className="figure mt-1.5 text-[24px] break-words">
                    +{num(extra, extra >= 100 ? 2 : 4)}
                    <span className="block text-[13px] text-paper/50">{price === null ? "…" : `≈ ${usd(extra * price)}`}</span>
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <GrowthChart principal={units || 1} apy={apy} days={days} unit={symbol} tone="dark" />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-paper/15 pt-4">
                <p className="max-w-md text-[12.5px] leading-relaxed text-paper/55">
                  A projection at a target rate, not a quote. Real vault returns will vary and are not guaranteed.
                </p>
                <Link href={`/vaults/${symbol.toLowerCase()}`} className="btn btn-brass h-10 px-4 text-[14px]">
                  Open the {symbol} vault
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
