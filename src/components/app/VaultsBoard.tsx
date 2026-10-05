"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RISK, VAULTS, assetBySymbol } from "@/config/assets";
import { AssetIcon, Ago, Figure, PracticeNote } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { bestMarketFor, useHoldings, useLive } from "@/lib/data";
import { grow, pct, units as fmtUnits, usd } from "@/lib/finance";
import { usePractice } from "@/lib/practice";

export function VaultsBoard() {
  const { prices, pricesAt, markets } = useLive();
  const { address } = useWallet();
  const { open } = useWalletModal();
  const { holdings, loading } = useHoldings(address);
  const { book } = usePractice();

  const held = (symbol: string) => holdings?.find((h) => h.asset.symbol === symbol)?.units ?? 0;
  const eligibleUsd = holdings
    ? holdings.filter((h) => VAULTS.some((v) => v.symbol === h.asset.symbol)).reduce((s, h) => s + h.units * (prices[h.asset.symbol]?.price ?? 0), 0)
    : null;
  const practiceUsd = book.vaults.reduce((s, p) => s + p.units * (prices[p.symbol]?.price ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card p-5">
          <Figure label="Arter vault TVL" value="$0" note="Not deployed. Practice deposits are never counted." tone="brass" />
        </div>
        <div className="bg-card p-5">
          <Figure label="Target band" value="3-7% APY" note="Per-vault targets sit inside it. Not a live rate." />
        </div>
        <div className="bg-card p-5">
          <Figure
            label="Your eligible holdings"
            value={!address ? "—" : loading ? "…" : usd(eligibleUsd)}
            note={!address ? "Connect to read your real balances." : "Real balances of vault assets, Chainlink-priced."}
            tone="moss"
          />
          {!address ? (
            <button type="button" onClick={open} className="mt-3 text-[13px] underline decoration-brass underline-offset-4">
              Connect wallet
            </button>
          ) : null}
        </div>
        <div className="bg-card p-5">
          <Figure label="Your practice deposits" value={usd(practiceUsd)} note={`${book.vaults.length} open position${book.vaults.length === 1 ? "" : "s"}, kept in this browser.`} />
        </div>
      </div>

      <PracticeNote className="mt-6">
        Vault contracts are not deployed yet. Deposits on these pages are simulated over live Chainlink prices and stay in this browser,
        keyed to your wallet. Reference rates come from other people&apos;s live Morpho markets on Robinhood Chain.
      </PracticeNote>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="serif text-[32px]">Vaults</h2>
        <p className="font-mono text-[11px] text-ink-3">
          Prices: Chainlink · <Ago at={pricesAt} />
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[4px] border border-line-2 bg-card">
        <div className="hidden grid-cols-[1.6fr_0.9fr_0.9fr_1.2fr_1fr_40px] gap-4 border-b border-line-2 bg-paper-2/60 px-5 py-3 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase lg:grid">
          <span>Vault</span>
          <span>Target APY</span>
          <span className="text-right">Price</span>
          <span>Live reference</span>
          <span className="text-right">Your balance</span>
          <span />
        </div>
        {VAULTS.map((v) => {
          const asset = assetBySymbol(v.symbol);
          if (!asset) return null;
          const price = prices[v.symbol]?.price ?? null;
          const market = v.symbol === "USDG" ? markets.filter((m) => m.supplyUsd >= 1_000_000)[0] ?? null : bestMarketFor(markets, v.symbol);
          const reference =
            v.symbol === "USDG"
              ? market
                ? `Lenders earn ${pct(market.supplyApy)}`
                : "—"
              : market
                ? `Borrowers pay ${pct(market.borrowApy)} against it`
                : "No live market yet";
          const mine = held(v.symbol);
          const mid = (v.target[0] + v.target[1]) / 2;
          return (
            <Link
              key={v.symbol}
              href={`/vaults/${v.symbol.toLowerCase()}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t border-line px-5 py-4 first:border-t-0 hover:bg-paper-2/40 lg:grid-cols-[1.6fr_0.9fr_0.9fr_1.2fr_1fr_40px]"
              data-testid="vault-row"
            >
              <span className="flex min-w-0 items-center gap-3">
                <AssetIcon symbol={v.symbol} size={34} />
                <span className="min-w-0">
                  <span className="block font-medium">{v.symbol} vault</span>
                  <span className="block text-[13px] leading-snug text-ink-3">
                    {asset.name} · {RISK[asset.cls].label}
                  </span>
                </span>
              </span>
              <span className="figure text-right text-[17px] text-moss lg:text-left">
                {v.target[0]}-{v.target[1]}%
              </span>
              <span className="figure hidden text-right text-[14px] text-ink-2 lg:block">{price === null ? "…" : usd(price)}</span>
              <span className="col-span-2 text-[13px] text-ink-3 lg:col-span-1">
                {reference}
                {market ? <span className="ml-1 font-mono text-[10.5px]">({market.collateral})</span> : null}
              </span>
              <span className="text-[13px] lg:text-right">
                {!address ? (
                  <span className="text-ink-3">—</span>
                ) : mine > 0 ? (
                  <span className="figure">
                    {fmtUnits(mine)} <span className="block text-[11.5px] text-moss">+{fmtUnits(grow(mine, mid, 365) - mine)} / yr at {mid}%</span>
                  </span>
                ) : (
                  <span className="text-ink-3">{loading ? "…" : "None held"}</span>
                )}
              </span>
              <ArrowRight className="hidden size-4 justify-self-end text-ink-3 group-hover:text-ink lg:block" />
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
        Live reference: for USDG, the supply APY of the deepest USDG market on Morpho; for other assets, the borrow APY of the deepest
        market that accepts them as collateral. These are not Arter rates.
      </p>
    </div>
  );
}
