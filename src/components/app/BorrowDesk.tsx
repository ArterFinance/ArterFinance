"use client";

import { useEffect, useMemo, useState } from "react";
import { ASSETS, RISK, type AssetClass } from "@/config/assets";
import { AssetIcon, Figure, PracticeNote, useNow } from "@/components/ui";
import { MarketsTable } from "@/components/app/MarketsTable";
import { LiveBorrow } from "@/components/morpho/LiveBorrow";
import { useWallet } from "@/components/wallet/WalletProvider";
import { bestMarketFor, useHoldings, useLive } from "@/lib/data";
import { DAY_MS, cleanAmount, interest, loanStats, num, pct, units as fmtUnits, usd } from "@/lib/finance";
import { usePractice } from "@/lib/practice";

/** Used when no live market accepts the collateral. Stated, not hidden. */
const FALLBACK_BORROW_APY = 8;
const COLLATERAL = ASSETS.filter((a) => a.symbol !== "USDG");

function healthTone(h: number) {
  if (!Number.isFinite(h)) return "text-moss";
  if (h < 1.1) return "text-rust";
  if (h < 1.5) return "text-brass-deep";
  return "text-moss";
}

export function BorrowDesk() {
  const { prices, markets } = useLive();
  const { address } = useWallet();
  const { holdings } = useHoldings(address);
  const { book, borrow, repay } = usePractice();
  const now = useNow(5000);

  const [symbol, setSymbol] = useState("NVDA");
  // /borrow?asset=GOOGL opens on that collateral (links from Manage). Read after mount so the server render stays stable.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("asset")?.toUpperCase();
    if (!asked || !COLLATERAL.some((a) => a.symbol === asked)) return;
    const t = window.setTimeout(() => setSymbol(asked), 0);
    return () => window.clearTimeout(t);
  }, []);
  const [amount, setAmount] = useState("20");
  const [share, setShare] = useState(0.6); // share of max LTV
  const [rateOverride, setRateOverride] = useState<string>("");

  const asset = COLLATERAL.find((a) => a.symbol === symbol) ?? COLLATERAL[0];
  const risk = RISK[asset.cls];
  const price = prices[asset.symbol]?.price ?? null;
  const units = Number(amount) || 0;
  const collateralUsd = price === null ? 0 : units * price;
  const maxDebt = collateralUsd * risk.maxLtv;
  const debt = maxDebt * share;
  const market = bestMarketFor(markets, asset.symbol);
  const referenceRate = market ? market.borrowApy : null;
  const borrowApy = rateOverride !== "" ? Number(rateOverride) || 0 : (referenceRate ?? FALLBACK_BORROW_APY);
  const stats = loanStats({ units, price: price ?? 0, debt, liqLtv: risk.liqLtv });
  const walletUnits = holdings?.find((h) => h.asset.symbol === asset.symbol)?.units ?? null;

  const groups = useMemo(() => {
    const order: AssetClass[] = ["treasury", "gold", "index", "commodity", "stock", "highbeta"];
    return order.map((cls) => ({ cls, items: COLLATERAL.filter((a) => a.cls === cls) }));
  }, []);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-12">
      <section className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
        <div className="min-w-0">
          <h2 className="serif text-[30px] leading-tight sm:text-[36px]">Borrow for real, on Morpho</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
            Where a live Morpho market takes your collateral, you can deposit it, borrow USDG, repay and withdraw right here. The position is yours on Morpho Blue; Arter adds
            no fee. Pick the collateral in the simulator below and the live panel follows it.
          </p>
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-ink-3">
            <li>Liquidation is enforced by Morpho at the market&apos;s LLTV, not by the conservative limits used in the simulator.</li>
            <li>Stock-token markets are nearly fully borrowed today; the panel shows how much USDG is actually free.</li>
          </ul>
        </div>
        <LiveBorrow symbol={symbol} />
      </section>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-12">
        <div className="min-w-0 space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="label">Collateral</span>
              <select
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setRateOverride("");
                }}
                className="field mt-2 text-[15px]"
                data-testid="borrow-asset"
              >
                {groups.map((g) => (
                  <optgroup key={g.cls} label={`${RISK[g.cls].label} · max LTV ${Math.round(RISK[g.cls].maxLtv * 100)}%`}>
                    {g.items.map((a) => (
                      <option key={a.symbol} value={a.symbol}>
                        {a.symbol} · {a.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="flex items-baseline justify-between">
                <span className="label">Amount ({asset.symbol})</span>
                {walletUnits ? (
                  <button type="button" onClick={() => setAmount(String(Number(walletUnits.toFixed(6))))} className="cursor-pointer text-[12px] text-moss underline">
                    Wallet: {fmtUnits(walletUnits)}
                  </button>
                ) : null}
              </span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(cleanAmount(e.target.value))} className="field figure mt-2 text-[18px]" data-testid="borrow-amount" />
            </label>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <AssetIcon symbol={asset.symbol} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{asset.name}</p>
                <p className="text-[13px] text-ink-3">{risk.note}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label="Price" value={<span className="text-[20px]">{price === null ? "…" : usd(price)}</span>} note="Chainlink" />
              <Figure label="Collateral value" value={<span className="text-[20px]">{usd(collateralUsd)}</span>} />
              <Figure label="Max LTV" value={<span className="text-[20px]">{Math.round(risk.maxLtv * 100)}%</span>} note={risk.label} />
              <Figure label="Liquidation at" value={<span className="text-[20px]">{Math.round(risk.liqLtv * 100)}%</span>} note="debt / collateral" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="label">Borrow USDG</span>
              <span className="figure text-[22px]">{usd(debt)}</span>
            </div>
            <input type="range" className="range mt-2" min={0} max={1} step={0.01} value={share} onChange={(e) => setShare(Number(e.target.value))} aria-label="Share of maximum borrow" data-testid="borrow-share" />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-3">
              <span>$0</span>
              <span>{Math.round(share * 100)}% of max · LTV {pct(stats.ltv * 100, 1)}</span>
              <span>{usd(maxDebt)}</span>
            </div>
          </div>

          <label className="block">
            <span className="label">Borrow APY</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                inputMode="decimal"
                value={rateOverride !== "" ? rateOverride : borrowApy.toFixed(2)}
                onChange={(e) => setRateOverride(cleanAmount(e.target.value))}
                className="field figure w-28 text-[16px]"
                aria-label="Borrow APY used in the simulation"
              />
              <span className="text-[13px] text-ink-3">
                {rateOverride !== ""
                  ? "Your own assumption."
                  : market
                    ? `Live reference: deepest Morpho ${asset.symbol}/USDG market (${usd(market.supplyUsd)} supplied).`
                    : `No live ${asset.symbol} market yet; ${FALLBACK_BORROW_APY}% is an assumption.`}
              </span>
            </div>
          </label>

          <div>
            <p className="label">If the price falls</p>
            <div className="mt-3 overflow-hidden rounded-[4px] border border-line-2">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                    <th className="px-4 py-2.5 font-normal">Move</th>
                    <th className="px-4 py-2.5 text-right font-normal">{asset.symbol} price</th>
                    <th className="px-4 py-2.5 text-right font-normal">LTV</th>
                    <th className="px-4 py-2.5 text-right font-normal">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, -0.1, -0.2, -0.3, -0.4].map((m) => {
                    const p = (price ?? 0) * (1 + m);
                    const s = loanStats({ units, price: p, debt, liqLtv: risk.liqLtv });
                    return (
                      <tr key={m} className="border-t border-line bg-card">
                        <td className="figure px-4 py-2.5">{m === 0 ? "today" : `${m * 100}%`}</td>
                        <td className="figure px-4 py-2.5 text-right">{usd(p)}</td>
                        <td className="figure px-4 py-2.5 text-right">{pct(s.ltv * 100, 1)}</td>
                        <td className={`figure px-4 py-2.5 text-right ${healthTone(s.health)}`}>
                          {Number.isFinite(s.health) ? (s.health < 1 ? "liquidated" : num(s.health, 2)) : "no debt"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="min-w-0">
          <div className="panel lg:sticky lg:top-40">
            <div className="border-b border-line-2 px-5 py-4">
              <p className="label">Position preview</p>
              <p className={`figure mt-2 text-[44px] leading-none ${healthTone(stats.health)}`} data-testid="borrow-health">
                {Number.isFinite(stats.health) ? num(stats.health, 2) : "∞"}
              </p>
              <p className="mt-1 text-[13px] text-ink-3">Health factor. Below 1.00 the collateral is liquidated.</p>
            </div>
            <dl className="space-y-2.5 px-5 py-4 text-[14px]">
              {[
                ["Collateral", `${fmtUnits(units)} ${asset.symbol} · ${usd(collateralUsd)}`],
                ["Debt", `${usd(debt)} USDG`],
                ["Loan-to-value", pct(stats.ltv * 100, 1)],
                ["Liquidation price", debt > 0 ? usd(stats.liqPrice) : "—"],
                ["Room before liquidation", debt > 0 ? `${pct(stats.drop * 100, 1)} drop` : "—"],
                ["Interest, one year", `${usd(interest(debt, borrowApy, 365))} at ${pct(borrowApy)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="figure text-right" data-testid={k === "Liquidation price" ? "borrow-liq" : undefined}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="px-5 pb-5">
              <button
                type="button"
                disabled={debt <= 0 || price === null}
                onClick={() => borrow({ collateral: asset.symbol, units, debt, borrowApy })}
                className="btn btn-ink h-12 w-full text-[15px]"
                data-testid="borrow-submit"
              >
                Open practice loan
              </button>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                You keep the {asset.symbol} price upside and its dividends while the loan is open. Repay any time, no lock-up.
              </p>
            </div>
            <div className="border-t border-line-2 p-4">
              <PracticeNote className="text-[12px]">Lending contracts are not deployed. No collateral moves and no USDG is issued.</PracticeNote>
            </div>
          </div>
        </aside>
      </div>

      {book.loans.length ? (
        <section className="mt-14">
          <h2 className="serif text-[30px]">Your practice loans</h2>
          <div className="mt-4 overflow-x-auto rounded-[4px] border border-line-2 bg-card">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-normal">Collateral</th>
                  <th className="px-4 py-2.5 text-right font-normal">Debt now</th>
                  <th className="px-4 py-2.5 text-right font-normal">Health now</th>
                  <th className="px-4 py-2.5 text-right font-normal">Liq. price</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {book.loans.map((l) => {
                  const a = ASSETS.find((x) => x.symbol === l.collateral);
                  const p = prices[l.collateral]?.price ?? 0;
                  const owed = l.debt + interest(l.debt, l.borrowApy, now ? (now - l.openedAt) / DAY_MS : 0);
                  const s = loanStats({ units: l.units, price: p, debt: owed, liqLtv: a ? RISK[a.cls].liqLtv : 0.5 });
                  return (
                    <tr key={l.id} className="border-t border-line" data-testid="loan-row">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <AssetIcon symbol={l.collateral} size={22} /> {fmtUnits(l.units)} {l.collateral}
                        </span>
                      </td>
                      <td className="figure px-4 py-3 text-right">{usd(owed, 4)}</td>
                      <td className={`figure px-4 py-3 text-right ${healthTone(s.health)}`}>{num(s.health, 2)}</td>
                      <td className="figure px-4 py-3 text-right">{usd(s.liqPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => repay(l.id, `${usd(owed)} against ${l.collateral}`)} className="cursor-pointer text-[13px] text-rust underline">
                          Repay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 className="serif text-[34px] leading-tight sm:text-[40px]">Limits by asset class</h2>
          <p className="max-w-lg text-[14.5px] leading-relaxed text-ink-2">
            Set below what live markets on the chain allow today. Equity feeds update on a 24-hour heartbeat and stop over weekends,
            so a position has to survive a gap without a fresh price.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-[4px] border border-line-2 bg-card">
          <table className="w-full min-w-[620px] text-[14px]">
            <thead>
              <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                <th className="px-4 py-2.5 font-normal">Class</th>
                <th className="px-4 py-2.5 text-right font-normal">Max LTV</th>
                <th className="px-4 py-2.5 text-right font-normal">Liquidation</th>
                <th className="px-4 py-2.5 font-normal">Examples</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(RISK) as AssetClass[])
                .filter((c) => c !== "cash")
                .map((c) => (
                  <tr key={c} className="border-t border-line">
                    <td className="px-4 py-3">{RISK[c].label}</td>
                    <td className="figure px-4 py-3 text-right">{Math.round(RISK[c].maxLtv * 100)}%</td>
                    <td className="figure px-4 py-3 text-right">{Math.round(RISK[c].liqLtv * 100)}%</td>
                    <td className="px-4 py-3 text-[13px] text-ink-3">
                      {ASSETS.filter((a) => a.cls === c)
                        .slice(0, 6)
                        .map((a) => a.symbol)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16">
        <MarketsTable title="Live lending markets for USDG" />
      </section>
    </div>
  );
}
