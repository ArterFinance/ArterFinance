"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { RISK, assetBySymbol, type Vault } from "@/config/assets";
import { CHAIN, explorerAddress, shortAddress } from "@/config/brand";
import { GrowthChart } from "@/components/GrowthChart";
import { LendPanel } from "@/components/morpho/Panels";
import { AssetIcon, Figure, PracticeNote, feedAge, useNow } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { readWord } from "@/lib/abi";
import { bestMarketFor, useHoldings, useLive } from "@/lib/data";
import { DAY_MS, aprFromApy, cleanAmount, grow, num, pct, units as fmtUnits, usd } from "@/lib/finance";
import { usePractice } from "@/lib/practice";
import { rpc } from "@/lib/rpc";

const TABS = ["Overview", "Projection", "Reserve & contracts", "Transparency"] as const;
type Tab = (typeof TABS)[number];

/** Live uiMultiplier of a stock token (1e18 = 1.0). */
function useMultiplier(address: string, enabled: boolean) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    rpc<string>("eth_call", [{ to: address, data: "0xa60bf13d" }, "latest"])
      .then((r) => !cancelled && setValue(Number(readWord(r, 0)) / 1e18))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, enabled]);
  return value;
}

export function VaultDetail({ vault }: { vault: Vault }) {
  const asset = assetBySymbol(vault.symbol)!;
  const risk = RISK[asset.cls];
  const { prices, markets } = useLive();
  const price = prices[vault.symbol]?.price ?? null;
  const updatedAt = prices[vault.symbol]?.updatedAt ?? null;
  const now = useNow(1000);
  const { address } = useWallet();
  const { open } = useWalletModal();
  const { holdings } = useHoldings(address);
  const walletUnits = holdings?.find((h) => h.asset.symbol === vault.symbol)?.units ?? null;
  const multiplier = useMultiplier(asset.address, asset.multiplier);
  const { book, deposit, withdraw } = usePractice();
  const mine = book.vaults.filter((p) => p.symbol === vault.symbol);

  const mid = (vault.target[0] + vault.target[1]) / 2;
  const [tab, setTab] = useState<Tab>("Overview");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [apy, setApy] = useState(mid);
  const [projection, setProjection] = useState(365);
  const units = Number(amount) || 0;
  const market = vault.symbol === "USDG" ? markets.filter((m) => m.supplyUsd >= 1_000_000)[0] ?? null : bestMarketFor(markets, vault.symbol);
  // Live today: USDG can be lent on Morpho's deepest listed market; stocks with a market can be borrowed against.
  const lendMarket = vault.symbol === "USDG" ? (markets.filter((m) => m.listed).sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0] ?? null) : null;
  const borrowMarket = vault.symbol === "USDG" ? null : bestMarketFor(markets, vault.symbol);

  const submit = () => {
    if (units <= 0) return;
    deposit(vault.symbol, units, apy);
    setAmount("");
    setMode("withdraw");
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:py-10">
      <nav className="flex items-center gap-1.5 text-[13px] text-ink-3" aria-label="Breadcrumb">
        <Link href="/vaults" className="hover:text-ink">
          Vaults
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-ink">{vault.symbol} vault</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <AssetIcon symbol={vault.symbol} size={44} />
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.06em] text-ink-3 uppercase">
                {asset.name} · {risk.label}
              </p>
              <p className="text-[15px] font-medium">{vault.symbol} vault</p>
            </div>
            <span className="practice-tag ml-auto">Not deployed</span>
          </div>
          <h1 className="serif mt-6 text-[40px] leading-[1.02] sm:text-[54px]">{vault.headline}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">{vault.about}</p>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 md:grid-cols-4">
            <div className="bg-card p-4">
              <Figure label="Target APY" value={`${vault.target[0]}-${vault.target[1]}%`} note="Target, not live" tone="moss" />
            </div>
            <div className="bg-card p-4">
              <Figure label="Vault TVL" value="$0" note="Not deployed" tone="brass" />
            </div>
            <div className="bg-card p-4">
              <Figure label="Price" value={price === null ? "…" : usd(price)} note={`Chainlink · ${now ? feedAge(updatedAt, now) : "…"}`} />
            </div>
            <div className="bg-card p-4">
              <Figure
                label="In your wallet"
                value={!address ? "—" : walletUnits === null ? "…" : fmtUnits(walletUnits)}
                note={!address ? "Connect to read" : walletUnits && price ? usd(walletUnits * price) : "Real balance"}
              />
            </div>
          </div>

          <div className="mt-10 flex gap-1 overflow-x-auto border-b border-line-2 [scrollbar-width:none]" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-[14px] whitespace-nowrap ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="pt-6" role="tabpanel">
            {tab === "Overview" ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="label">Where the yield is meant to come from</p>
                    <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-ink-2">
                      {vault.sources.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-moss" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <p className="label">What could go wrong</p>
                    <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-ink-2">
                      {[risk.note, "Borrower defaults are covered by liquidations only if the oracle and keepers keep up.", "Liquidity ranges can lose value against holding when prices move fast."].map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-rust" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="panel p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="label">1,000 {vault.symbol} at {mid}% for {projection === 365 ? "one year" : "five years"}</p>
                    <div className="flex gap-1">
                      {[365, 1825].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setProjection(d)}
                          className={`cursor-pointer rounded-[3px] border px-2.5 py-1 font-mono text-[12px] ${projection === d ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2"}`}
                        >
                          {d === 365 ? "1Y" : "5Y"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <GrowthChart principal={1000} apy={mid} days={projection} unit={vault.symbol} />
                  </div>
                  <p className="figure mt-2 text-[13px] text-ink-2">
                    1,000 → {num(grow(1000, mid, projection), 2)} {vault.symbol}
                  </p>
                </div>
              </div>
            ) : null}

            {tab === "Projection" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[14px]">
                  <thead>
                    <tr className="border-b border-ink/80 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                      <th className="py-2.5 pr-4 font-normal">1,000 {vault.symbol} after</th>
                      {[vault.target[0], mid, vault.target[1]].map((r) => (
                        <th key={r} className="py-2.5 pr-4 text-right font-normal">
                          at {r}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["1 day", 1],
                      ["30 days", 30],
                      ["90 days", 90],
                      ["1 year", 365],
                      ["5 years", 1825],
                    ].map(([label, d]) => (
                      <tr key={label} className="border-b border-line">
                        <td className="py-3 pr-4 text-ink-2">{label}</td>
                        {[vault.target[0], mid, vault.target[1]].map((r) => (
                          <td key={r} className="figure py-3 pr-4 text-right">
                            {num(grow(1000, r, Number(d)), 3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                  Daily compounding: daily rate = (1 + APY)^(1/365) − 1. At {mid}% that is {aprFromApy(mid).toFixed(3)}% simple per year.
                  Units of {vault.symbol}; the asset&apos;s own price moves are not included.
                </p>
              </div>
            ) : null}

            {tab === "Reserve & contracts" ? (
              <dl className="divide-y divide-line border-y border-line text-[14px]">
                {[
                  ["Underlying token", <a key="a" href={explorerAddress(asset.address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono break-all text-moss underline">{asset.address} <ExternalLink className="size-3 shrink-0" /></a>],
                  ["Verification", asset.multiplier ? "Proxy to Robinhood's token beacon; symbol and name checked on-chain" : "Paxos dollar token, 6 decimals, Chainlink USDG / USD feed"],
                  ["uiMultiplier", asset.multiplier ? (multiplier === null ? "reading…" : `${multiplier.toFixed(6)} (dividends and splits reported here)`) : "Not used by this token"],
                  ["Compliance", asset.multiplier ? "The token enforces a blocklist; the vault must reject blocked addresses" : "Issuer controls apply to USDG transfers"],
                  ["Vault contract", "Not deployed. The address will be published here."],
                  ["Custody", "Planned: non-custodial ERC-4626 vault; no off-chain custodian"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {tab === "Transparency" ? (
              <div className="space-y-6">
                <dl className="divide-y divide-line border-y border-line text-[14px]">
                  {[
                    ["Price feed", <a key="f" href={explorerAddress(asset.feed)} target="_blank" rel="noreferrer" className="font-mono break-all text-moss underline">{shortAddress(asset.feed, 8, 6)}</a>],
                    ["Latest answer", price === null ? "…" : usd(price, 4)],
                    ["Updated", updatedAt && now ? `${new Date(updatedAt).toUTCString()} (${feedAge(updatedAt, now)})` : "…"],
                    ["Feed schedule", asset.multiplier ? "24 h heartbeat or 0.5% move; follows US equity hours (24/5)" : "24 h heartbeat or 0.5% move"],
                    ["Network", `${CHAIN.name} · chain id ${CHAIN.id}`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="min-w-0">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="panel p-4">
                  <p className="label">Live reference market (Morpho, not Arter)</p>
                  {market ? (
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <Figure label="Collateral" value={<span className="text-[18px]">{market.collateral}</span>} />
                      <Figure label="Supplied" value={<span className="text-[18px]">{usd(market.supplyUsd)}</span>} />
                      <Figure label="Supply APY" value={<span className="text-[18px]">{pct(market.supplyApy)}</span>} tone="moss" />
                      <Figure label="Borrow APY" value={<span className="text-[18px]">{pct(market.borrowApy)}</span>} />
                    </div>
                  ) : (
                    <p className="mt-2 text-[14px] text-ink-3">No live market above $1,000 accepts {vault.symbol} yet.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Deposit panel */}
        <aside className="min-w-0 space-y-5">
          {lendMarket ? (
            <div className="panel p-4 sm:p-5">
              <LendPanel market={lendMarket} />
              <Link href="/lend" className="mt-3 inline-block text-[13px] underline">
                All USDG markets
              </Link>
            </div>
          ) : borrowMarket ? (
            <div className="panel p-4 sm:p-5" data-testid="vault-live-borrow">
              <span className="live-tag">Live on Morpho</span>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                The {vault.symbol} vault is not deployed yet, but a live Morpho market already lends USDG against {vault.symbol} at {pct(borrowMarket.borrowApy)}: keep the
                shares, borrow against them.
              </p>
              <Link href={`/borrow?asset=${vault.symbol}`} className="btn btn-paper mt-3 h-10 px-4 text-[13.5px]">
                Borrow against {vault.symbol}
              </Link>
            </div>
          ) : null}
          <div className={`panel ${lendMarket || borrowMarket ? "" : "lg:sticky lg:top-40"}`}>
            <div className="grid grid-cols-2 border-b border-line-2">
              {(["deposit", "withdraw"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`cursor-pointer py-3 text-[14px] capitalize ${mode === m ? "bg-card font-medium text-ink" : "bg-paper-2/60 text-ink-3"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-5">
              {mode === "deposit" ? (
                <>
                  <div className="flex items-center justify-between text-[12px] text-ink-3">
                    <span>You deposit</span>
                    {walletUnits ? (
                      <button type="button" onClick={() => setAmount(String(Number(walletUnits.toFixed(6))))} className="cursor-pointer text-moss underline">
                        Wallet: {fmtUnits(walletUnits)}
                      </button>
                    ) : (
                      <span>{address ? "Wallet: 0" : "Any practice amount"}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[3px] border border-line-2 bg-paper px-3 py-2">
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(cleanAmount(e.target.value))}
                      className="figure min-w-0 flex-1 bg-transparent text-[26px] outline-none placeholder:text-ink-3"
                      aria-label={`Amount of ${vault.symbol} to deposit`}
                      data-testid="deposit-amount"
                    />
                    <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-medium">
                      <AssetIcon symbol={vault.symbol} size={22} /> {vault.symbol}
                    </span>
                  </div>
                  <p className="figure mt-1 text-[12px] text-ink-3">{price === null ? "…" : `≈ ${usd(units * price)}`}</p>

                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink-3">Simulate at target</span>
                      <span className="figure text-moss">{apy.toFixed(2)}%</span>
                    </div>
                    <input
                      type="range"
                      className="range mt-1"
                      min={vault.target[0]}
                      max={vault.target[1]}
                      step={0.05}
                      value={apy}
                      onChange={(e) => setApy(Number(e.target.value))}
                      aria-label="Target APY for the simulation"
                    />
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[13.5px]">
                    {[
                      ["Earned per day", `${fmtUnits(grow(units, apy, 1) - units)} ${vault.symbol}`],
                      ["After 1 year", `${fmtUnits(grow(units, apy, 365))} ${vault.symbol}`],
                      ["Lock-up", "None. Withdraw any time"],
                      ["Fees", "None in practice mode"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-ink-3">{k}</dt>
                        <dd className="figure text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <button type="button" onClick={submit} disabled={units <= 0} className="btn btn-ink mt-5 h-12 w-full text-[15px]" data-testid="deposit-submit">
                    Deposit in practice mode
                  </button>
                  {!address ? (
                    <button type="button" onClick={open} className="mt-2 w-full cursor-pointer text-center text-[12.5px] text-ink-3 underline">
                      Connect a wallet to keep positions under your address
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {mine.length === 0 ? (
                    <p className="py-6 text-center text-[14px] text-ink-3">No practice deposits in this vault yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {mine.map((p) => {
                        const days = now ? (now - p.openedAt) / DAY_MS : 0;
                        const value = grow(p.units, p.apy, days);
                        return (
                          <li key={p.id} className="py-3" data-testid="vault-position">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="figure text-[16px]">
                                {num(value, 6)} {vault.symbol}
                              </span>
                              <span className="figure text-[12px] text-moss">+{num(value - p.units, 8)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3 text-[12px] text-ink-3">
                              <span>
                                {fmtUnits(p.units)} at {p.apy.toFixed(2)}% · since {new Date(p.openedAt).toLocaleDateString("en-US")}
                              </span>
                              <button type="button" onClick={() => withdraw(p.id, `${fmtUnits(value)} ${vault.symbol}`)} className="cursor-pointer text-rust underline">
                                Withdraw
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-3">Accrual ticks every second using the daily-compounding formula.</p>
                </>
              )}
            </div>
            <div className="border-t border-line-2 p-4">
              <PracticeNote className="text-[12px]">
                On-chain deposits open when the {vault.symbol} vault is deployed and audited. Nothing here is signed or sent.
              </PracticeNote>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
