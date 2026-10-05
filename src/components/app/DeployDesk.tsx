"use client";

import { useState } from "react";
import { VAULTS } from "@/config/assets";
import { AssetIcon, Figure, PracticeNote, useNow } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useHoldings, useLive } from "@/lib/data";
import { DAY_MS, cleanAmount, grow, pct, units as fmtUnits, usd } from "@/lib/finance";
import { usePractice } from "@/lib/practice";

type Strategy = { id: string; name: string; what: string; low: number; high: number; live?: boolean };

/** Hard caps the allocator would enforce on-chain. */
const BUFFER_MIN = 10;
const SINGLE_MAX = 70;

export function DeployDesk() {
  const { prices, markets } = useLive();
  const { address } = useWallet();
  const { holdings } = useHoldings(address);
  const { book, deploy, recall } = usePractice();
  const now = useNow(2000);

  const deepest = markets.filter((m) => m.supplyUsd >= 1_000_000)[0] ?? null;
  const lendLive = deepest ? deepest.supplyApy : null;

  const STRATEGIES: Strategy[] = [
    {
      id: "lend",
      name: "Isolated lending",
      what: "Lent to overcollateralized borrowers in single-collateral markets.",
      low: lendLive !== null ? Math.max(0, lendLive - 1) : 3,
      high: lendLive !== null ? lendLive + 1 : 5,
      live: lendLive !== null,
    },
    { id: "range", name: "AMM liquidity range", what: "Quoted in a narrow asset/USDG range; earns swap fees, can lag holding in fast moves.", low: 2, high: 8 },
    { id: "basis", name: "Matched carry", what: "Collateralized borrow and re-supply only when the spread is positive after fees.", low: 0, high: 4 },
    { id: "buffer", name: "Withdrawal buffer", what: "Kept idle so anyone can leave instantly. Earns nothing on purpose.", low: 0, high: 0 },
  ];

  const [symbol, setSymbol] = useState("USDG");
  const [amount, setAmount] = useState("5000");
  const [mix, setMix] = useState<Record<string, number>>({ lend: 50, range: 25, basis: 10, buffer: 15 });
  const price = prices[symbol]?.price ?? null;
  const usdValue = (Number(amount) || 0) * (price ?? 0);
  const total = Object.values(mix).reduce((s, v) => s + v, 0);
  const blendedLow = STRATEGIES.reduce((s, st) => s + (st.low * (mix[st.id] ?? 0)) / 100, 0);
  const blendedHigh = STRATEGIES.reduce((s, st) => s + (st.high * (mix[st.id] ?? 0)) / 100, 0);
  const problems = [
    total !== 100 ? `Allocations add up to ${total}%, not 100%.` : null,
    (mix.buffer ?? 0) < BUFFER_MIN ? `Keep at least ${BUFFER_MIN}% in the withdrawal buffer.` : null,
    ...STRATEGIES.filter((s) => s.id !== "buffer" && (mix[s.id] ?? 0) > SINGLE_MAX).map((s) => `${s.name} is capped at ${SINGLE_MAX}%.`),
  ].filter(Boolean) as string[];
  const walletUnits = holdings?.find((h) => h.asset.symbol === symbol)?.units ?? null;

  const setOne = (id: string, v: number) => setMix((m) => ({ ...m, [id]: v }));

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-12">
        <div className="min-w-0 space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="label">Asset to deploy</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VAULTS.slice(0, 6).map((v) => (
                  <button
                    key={v.symbol}
                    type="button"
                    onClick={() => setSymbol(v.symbol)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-[3px] border px-2 py-1.5 text-[13px] ${symbol === v.symbol ? "border-ink bg-ink text-paper" : "border-line-2 bg-card hover:border-ink"}`}
                  >
                    <AssetIcon symbol={v.symbol} size={16} className="ring-0" /> {v.symbol}
                  </button>
                ))}
              </div>
            </div>
            <label className="block min-w-0">
              <span className="flex items-baseline justify-between">
                <span className="label">Amount ({symbol})</span>
                {walletUnits ? (
                  <button type="button" onClick={() => setAmount(String(Number(walletUnits.toFixed(6))))} className="cursor-pointer text-[12px] text-moss underline">
                    Wallet: {fmtUnits(walletUnits)}
                  </button>
                ) : null}
              </span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanAmount(e.target.value))} className="field figure mt-2 text-[18px]" />
              <span className="figure mt-1 block text-[12px] text-ink-3">{price === null ? "…" : `≈ ${usd(usdValue)}`}</span>
            </label>
          </div>

          <div className="overflow-hidden rounded-[4px] border border-line-2 bg-card">
            {STRATEGIES.map((s) => (
              <div key={s.id} className="border-t border-line px-5 py-4 first:border-t-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {s.name}{" "}
                    {s.live ? <span className="live-tag ml-1 align-middle">live rate</span> : s.id !== "buffer" ? <span className="practice-tag ml-1 align-middle">assumed</span> : null}
                  </p>
                  <p className="figure text-[13px] text-ink-3">
                    {s.id === "buffer" ? "0%" : `${s.low.toFixed(1)}-${s.high.toFixed(1)}%`} · <span className="text-ink">{mix[s.id] ?? 0}%</span>
                  </p>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{s.what}</p>
                <input
                  type="range"
                  className="range mt-2"
                  min={0}
                  max={100}
                  step={5}
                  value={mix[s.id] ?? 0}
                  onChange={(e) => setOne(s.id, Number(e.target.value))}
                  aria-label={`${s.name} allocation`}
                />
              </div>
            ))}
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-3">
            Lending range comes from the live supply APY of the deepest USDG market on Robinhood Chain
            {deepest ? ` (${pct(deepest.supplyApy)} today, ${deepest.collateral} collateral)` : ""}, ±1 point. Range and carry figures are planning
            assumptions, not measurements.
          </p>
        </div>

        <aside className="min-w-0">
          <div className="panel lg:sticky lg:top-40">
            <div className="border-b border-line-2 p-5">
              <p className="label">Blended estimate</p>
              <p className="figure mt-2 text-[38px] leading-none text-moss">
                {blendedLow.toFixed(1)}-{blendedHigh.toFixed(1)}%
              </p>
              <p className="mt-1 text-[13px] text-ink-3">Before fees. Arter&apos;s vaults aim for 3-7% after them.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
                {STRATEGIES.map((s, i) => (
                  <span key={s.id} style={{ width: `${((mix[s.id] ?? 0) / Math.max(total, 1)) * 100}%`, background: ["#1d5a43", "#c08a2e", "#46524b", "#d9d2c1"][i] }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Figure label="Deploying" value={<span className="text-[18px]">{usd(usdValue)}</span>} />
                <Figure label="Est. per year" value={<span className="text-[18px]">{usd((usdValue * (blendedLow + blendedHigh)) / 200)}</span>} tone="moss" />
              </div>
              {problems.length ? (
                <ul className="space-y-1 rounded-[3px] border border-rust/40 bg-rust-soft px-3 py-2 text-[12.5px] text-rust">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={problems.length > 0 || usdValue <= 0}
                onClick={() => deploy({ symbol, usd: usdValue, mix })}
                className="btn btn-ink h-12 w-full text-[15px]"
                data-testid="deploy-submit"
              >
                Deploy in practice mode
              </button>
            </div>
            <div className="border-t border-line-2 p-4">
              <PracticeNote className="text-[12px]">
                The allocator contract is not deployed. On-chain, every move would settle in the same block and respect the caps above.
              </PracticeNote>
            </div>
          </div>
        </aside>
      </div>

      {book.deployments.length ? (
        <section className="mt-14">
          <h2 className="serif text-[30px]">Your practice deployments</h2>
          <ul className="mt-4 divide-y divide-line rounded-[4px] border border-line-2 bg-card">
            {book.deployments.map((d) => {
              const days = now ? (now - d.openedAt) / DAY_MS : 0;
              const rate = STRATEGIES.reduce((s, st) => s + (((st.low + st.high) / 2) * (d.mix[st.id] ?? 0)) / 100, 0);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <span className="flex items-center gap-2">
                    <AssetIcon symbol={d.symbol} size={24} />
                    <span>
                      {usd(d.usd)} of {d.symbol}
                      <span className="block font-mono text-[11.5px] text-ink-3">
                        {Object.entries(d.mix)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => `${k} ${v}%`)
                          .join(" · ")}
                      </span>
                    </span>
                  </span>
                  <span className="figure text-[14px] text-moss">+{usd(grow(d.usd, rate, days) - d.usd, 4)}</span>
                  <button type="button" onClick={() => recall(d.id, `${usd(d.usd)} of ${d.symbol}`)} className="cursor-pointer text-[13px] text-rust underline">
                    Recall
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
