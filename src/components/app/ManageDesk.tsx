"use client";

import Link from "next/link";
import { RISK, vaultBySymbol } from "@/config/assets";
import { shortAddress } from "@/config/brand";
import { AssetIcon, Figure, PracticeNote, useNow } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { MorphoPositions } from "@/components/morpho/MorphoPositions";
import { useHoldings, useLive } from "@/lib/data";
import { DAY_MS, grow, interest, units as fmtUnits, usd } from "@/lib/finance";
import { usePractice } from "@/lib/practice";

export function ManageDesk() {
  const { prices } = useLive();
  const { address, walletName } = useWallet();
  const { open } = useWalletModal();
  const { holdings, loading, error } = useHoldings(address);
  const { book, withdraw, repay, recall, reset } = usePractice();
  const now = useNow(1000);
  const p = (s: string) => prices[s]?.price ?? 0;
  const days = (t: number) => (now ? (now - t) / DAY_MS : 0);

  const vaultValue = book.vaults.reduce((s, v) => s + grow(v.units, v.apy, days(v.openedAt)) * p(v.symbol), 0);
  const vaultEarned = book.vaults.reduce((s, v) => s + (grow(v.units, v.apy, days(v.openedAt)) - v.units) * p(v.symbol), 0);
  const debt = book.loans.reduce((s, l) => s + l.debt + interest(l.debt, l.borrowApy, days(l.openedAt)), 0);
  const deployed = book.deployments.reduce((s, d) => s + d.usd, 0);
  const walletUsd = holdings ? holdings.reduce((s, h) => s + h.units * p(h.asset.symbol), 0) : null;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card p-5">
          <Figure label="Practice position value" value={usd(vaultValue)} note={`${book.vaults.length} vault deposit${book.vaults.length === 1 ? "" : "s"}`} />
        </div>
        <div className="bg-card p-5">
          <Figure label="Practice earnings" value={`+${usd(vaultEarned, vaultEarned < 1 ? 6 : 2)}`} note="Accrued at your chosen targets" tone="moss" />
        </div>
        <div className="bg-card p-5">
          <Figure label="Practice debt" value={usd(debt)} note={`${book.loans.length} loan${book.loans.length === 1 ? "" : "s"} · ${usd(deployed)} deployed`} tone="brass" />
        </div>
        <div className="bg-card p-5">
          <Figure
            label="Real wallet value"
            value={!address ? "—" : loading ? "…" : usd(walletUsd)}
            note={!address ? "Not connected" : `${walletName ?? "Wallet"} · ${shortAddress(address, 6, 4)}`}
          />
        </div>
      </div>

      <div className="mt-12">
        <MorphoPositions />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="live-tag">Live from Robinhood Chain</span>
            <h2 className="serif mt-3 text-[32px]">What your wallet could do</h2>
          </div>
          <p className="max-w-md text-[13px] text-ink-3">Real balanceOf reads, scaled by each stock token&apos;s uiMultiplier, priced by Chainlink.</p>
        </div>
        {!address ? (
          <div className="mt-5 flex flex-col items-start gap-4 rounded-[4px] border border-dashed border-line-2 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-[15px] text-ink-2">
              Connect a wallet to read your USDG, GLD, SGOV and stock-token balances and see what each could earn in a vault or borrow against.
            </p>
            <button type="button" onClick={open} className="btn btn-ink h-11 px-5 text-[14.5px]">
              Connect wallet
            </button>
          </div>
        ) : loading ? (
          <p className="mt-5 text-ink-3">Reading balances…</p>
        ) : error && !holdings ? (
          <p className="mt-5 text-rust">Could not read balances right now. Retrying shortly.</p>
        ) : holdings && holdings.length === 0 ? (
          <p className="mt-5 rounded-[4px] border border-dashed border-line-2 p-6 text-[15px] text-ink-2">
            This wallet holds none of the listed assets on Robinhood Chain. You can still open practice positions with any amount.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[4px] border border-line-2 bg-card">
            <table className="w-full min-w-[700px] text-[14px]" data-testid="holdings-table">
              <thead>
                <tr className="bg-paper-2/60 text-left font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-normal">Asset</th>
                  <th className="px-4 py-2.5 text-right font-normal">Balance</th>
                  <th className="px-4 py-2.5 text-right font-normal">Value</th>
                  <th className="px-4 py-2.5 text-right font-normal">Could earn / yr</th>
                  <th className="px-4 py-2.5 text-right font-normal">Could borrow</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {[...holdings!].sort((x, y) => y.units * p(y.asset.symbol) - x.units * p(x.asset.symbol)).map((h) => {
                  const v = vaultBySymbol(h.asset.symbol);
                  const value = h.units * p(h.asset.symbol);
                  const mid = v ? (v.target[0] + v.target[1]) / 2 : null;
                  const risk = RISK[h.asset.cls];
                  return (
                    <tr key={h.asset.symbol} className="border-t border-line">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <AssetIcon symbol={h.asset.symbol} size={24} />
                          <span>
                            {h.asset.symbol}
                            <span className="block text-[12px] text-ink-3">{h.asset.name}</span>
                          </span>
                        </span>
                      </td>
                      <td className="figure px-4 py-3 text-right">{fmtUnits(h.units)}</td>
                      <td className="figure px-4 py-3 text-right">{usd(value)}</td>
                      <td className="figure px-4 py-3 text-right text-moss">{mid ? `${usd(value * (Math.pow(1 + mid / 100, 1) - 1))} at ${mid}%` : "no vault yet"}</td>
                      <td className="figure px-4 py-3 text-right">{h.asset.cls === "cash" ? "—" : `${usd(value * risk.maxLtv)} USDG`}</td>
                      <td className="px-4 py-3 text-right text-[13px]">
                        {v ? (
                          <Link href={`/vaults/${h.asset.symbol.toLowerCase()}`} className="underline decoration-brass underline-offset-4">
                            Vault
                          </Link>
                        ) : (
                          <Link href="/borrow" className="underline decoration-brass underline-offset-4">
                            Borrow
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="serif text-[32px]">Practice positions</h2>
            {book.vaults.length + book.loans.length + book.deployments.length > 0 ? (
              <button type="button" onClick={reset} className="cursor-pointer text-[13px] text-ink-3 underline">
                Clear practice book
              </button>
            ) : null}
          </div>
          <PracticeNote className="mt-4" />
          {book.vaults.length + book.loans.length + book.deployments.length === 0 ? (
            <p className="mt-5 text-[15px] text-ink-2">
              Nothing open yet. Start with a <Link href="/vaults" className="underline decoration-brass underline-offset-4">vault</Link>, a{" "}
              <Link href="/borrow" className="underline decoration-brass underline-offset-4">loan</Link> or a{" "}
              <Link href="/deploy" className="underline decoration-brass underline-offset-4">deployment</Link>.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {book.vaults.map((v) => {
                const bal = grow(v.units, v.apy, days(v.openedAt));
                return (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5" data-testid="manage-vault">
                    <span className="flex items-center gap-2">
                      <AssetIcon symbol={v.symbol} size={24} />
                      <span>
                        {v.symbol} vault <span className="figure text-[13px] text-ink-3">{bal.toFixed(6)}</span>
                      </span>
                    </span>
                    <span className="figure text-[13px] text-moss">+{(bal - v.units).toFixed(8)} at {v.apy.toFixed(2)}%</span>
                    <button type="button" onClick={() => withdraw(v.id, `${fmtUnits(bal)} ${v.symbol}`)} className="cursor-pointer text-[13px] text-rust underline">
                      Withdraw
                    </button>
                  </li>
                );
              })}
              {book.loans.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <span className="flex items-center gap-2">
                    <AssetIcon symbol={l.collateral} size={24} /> Loan against {fmtUnits(l.units)} {l.collateral}
                  </span>
                  <span className="figure text-[13px]">{usd(l.debt + interest(l.debt, l.borrowApy, days(l.openedAt)), 4)} owed</span>
                  <button type="button" onClick={() => repay(l.id, `loan against ${l.collateral}`)} className="cursor-pointer text-[13px] text-rust underline">
                    Repay
                  </button>
                </li>
              ))}
              {book.deployments.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <span className="flex items-center gap-2">
                    <AssetIcon symbol={d.symbol} size={24} /> {usd(d.usd)} of {d.symbol} deployed
                  </span>
                  <button type="button" onClick={() => recall(d.id, `${usd(d.usd)} of ${d.symbol}`)} className="cursor-pointer text-[13px] text-rust underline">
                    Recall
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="serif text-[32px]">Activity</h2>
          {book.log.length === 0 ? (
            <p className="mt-5 text-[15px] text-ink-3">No activity in this practice book.</p>
          ) : (
            <ol className="mt-5 space-y-3 border-l border-line-2 pl-4">
              {book.log.map((e, i) => (
                <li key={`${e.at}-${i}`} className="text-[14px]">
                  <span className="figure block text-[11.5px] text-ink-3">{new Date(e.at).toLocaleString("en-US")}</span>
                  {e.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
