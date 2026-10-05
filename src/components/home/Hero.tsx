"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND, CHAIN } from "@/config/brand";
import { AssetIcon, Ago } from "@/components/ui";
import { useLive } from "@/lib/data";
import { grow, num, usd } from "@/lib/finance";

/** Illustration holdings for the statement card. Amounts are examples. */
const SAMPLE = [
  { symbol: "GLD", units: 12 },
  { symbol: "NVDA", units: 30 },
  { symbol: "USDG", units: 4000 },
];
const RATE = 5;

export function Hero() {
  const { prices, pricesAt, pricesError } = useLive();
  const rows = SAMPLE.map((r) => {
    const price = prices[r.symbol]?.price ?? null;
    return { ...r, price, value: price === null ? null : r.units * price };
  });
  const ready = rows.every((r) => r.value !== null);
  const total = ready ? rows.reduce((s, r) => s + (r.value ?? 0), 0) : null;
  const yearOut = total === null ? null : grow(total, RATE, 365);
  const perDay = total === null ? null : grow(total, RATE, 1) - total;

  return (
    <section className="ruled relative border-b border-line-2">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-4 pt-14 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pb-24">
        <div className="min-w-0" style={{ animation: "rise .6s ease-out both" }}>
          <p className="font-mono text-[12px] tracking-[0.06em] text-ink-3">{BRAND.name} · on {CHAIN.name}</p>
          <h1 className="serif mt-6 text-[64px] leading-[0.92] sm:text-[96px] lg:text-[118px]">
            Assets
            <br />
            <em className="text-brass-deep">that earn.</em>
          </h1>
          <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-ink-2 sm:text-[19px]">
            Transform tokenized assets into productive capital. Earn a 3-7% target APY, compounding daily, with no lock-ups.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/vaults" className="btn btn-ink h-12 px-6 text-[15px]">
              Start earning <ArrowRight className="size-4" />
            </Link>
            <Link href="/borrow" className="btn btn-flat h-12 px-6 text-[15px]">
              Borrow against what you hold
            </Link>
          </div>
          <dl className="mt-12 grid max-w-xl grid-cols-3 border-t border-ink/80 pt-4">
            {[
              ["3-7%", "target APY"],
              ["Daily", "compounding"],
              ["None", "lock-up"],
            ].map(([v, l]) => (
              <div key={l} className="min-w-0">
                <dt className="sr-only">{l}</dt>
                <dd className="serif text-[28px] leading-none sm:text-[34px]">{v}</dd>
                <dd className="mt-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-3">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="min-w-0 self-end" style={{ animation: "rise .8s .1s ease-out both" }}>
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line-2 bg-paper-2/60 px-5 py-3">
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-2 uppercase">Statement · example</p>
              <span className="live-tag">
                <span className="size-1.5 rounded-full bg-moss-2" style={{ animation: "pulse-dot 2s infinite" }} />
                Chainlink prices
              </span>
            </div>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-5 pt-3 pb-2 font-normal">Holding</th>
                  <th className="px-2 pt-3 pb-2 text-right font-normal">Price</th>
                  <th className="px-5 pt-3 pb-2 text-right font-normal">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol} className="border-t border-line">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <AssetIcon symbol={r.symbol} size={26} />
                        <span className="min-w-0">
                          <span className="block font-medium">{r.symbol}</span>
                          <span className="figure block text-[12px] text-ink-3">{num(r.units, r.units >= 1000 ? 0 : 2)} units</span>
                        </span>
                      </span>
                    </td>
                    <td className="figure px-2 py-3 text-right text-ink-2">{r.price === null ? "…" : usd(r.price)}</td>
                    <td className="figure px-5 py-3 text-right">{r.value === null ? "…" : usd(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-px border-t border-line-2 bg-line-2">
              <div className="bg-card px-5 py-4">
                <p className="label">At a {RATE}% target, per day</p>
                <p className="figure mt-1 text-[22px] text-moss">{perDay === null ? "…" : `+${usd(perDay)}`}</p>
              </div>
              <div className="bg-card px-5 py-4">
                <p className="label">After one year</p>
                <p className="figure mt-1 text-[22px]">{yearOut === null ? "…" : usd(yearOut)}</p>
              </div>
            </div>
            <p className="border-t border-line-2 px-5 py-2.5 font-mono text-[10.5px] leading-relaxed text-ink-3">
              {pricesError && !pricesAt ? "Price feeds unreachable right now. " : null}
              Example holdings, not an account. Yield shown at a target rate; price moves not included. <Ago at={pricesAt} />
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
