"use client";

import Link from "next/link";
import { ASSETS, USDG } from "@/config/assets";
import { AssetIcon } from "@/components/ui";
import { useMorpho } from "@/components/morpho/useMorpho";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useLive } from "@/lib/data";
import { num } from "@/lib/finance";
import { book, toNumber } from "@/lib/morpho";

/** The wallet's live Morpho positions across every USDG market Arter lists. */
export function MorphoPositions() {
  const { address } = useWallet();
  const { markets: rows } = useLive();
  const { markets, positions, error } = useMorpho(rows.map((r) => r.id));
  const known = new Set(ASSETS.map((a) => a.symbol));
  const open = rows
    .map((r) => ({ r, m: markets[r.id], p: positions[r.id] }))
    .filter((x) => x.m && x.p && (x.p.supplyShares > 0n || x.p.borrowShares > 0n || x.p.collateral > 0n))
    .map((x) => ({ ...x, b: book(x.m!, x.p!) }));

  return (
    <section data-testid="morpho-positions">
      <span className="live-tag">Live on Morpho</span>
      <h2 className="serif mt-3 text-[28px]">Your Morpho positions</h2>
      {!address ? (
        <p className="mt-3 text-[14px] text-ink-3">Connect a wallet to read your positions.</p>
      ) : error ? (
        <p className="mt-3 text-[14px] text-rust">Could not read Morpho right now. Retrying.</p>
      ) : open.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">No positions in these markets yet.</p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {open.map(({ r, b }) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 text-[14px]" data-testid="morpho-position">
              {known.has(r.collateral) ? (
                <AssetIcon symbol={r.collateral} size={24} />
              ) : (
                <span className="size-6 rounded-full border border-line-2 bg-paper-2" />
              )}
              <span className="min-w-[140px] flex-1">
                {r.collateral} <span className="text-ink-3">→ USDG</span>
              </span>
              {b.supplied > 0n ? <span className="figure text-moss">Lent {num(toNumber(b.supplied, USDG.decimals), 2)} USDG</span> : null}
              {b.collateral > 0n ? (
                <span className="figure">
                  Collateral {num(toNumber(b.collateral, r.collateralDecimals), 4)} {r.collateral}
                </span>
              ) : null}
              {b.borrowed > 0n ? <span className="figure text-brass-deep">Debt {num(toNumber(b.borrowed, USDG.decimals), 2)} USDG</span> : null}
              {b.borrowed > 0n && b.health !== null ? (
                <span className={`figure ${b.health < 1.1 ? "text-rust" : b.health < 1.5 ? "text-brass-deep" : "text-moss"}`}>Health {num(b.health, 2)}</span>
              ) : null}
              <Link href={b.collateral > 0n || b.borrowed > 0n ? `/borrow?asset=${r.collateral}` : "/lend"} className="text-[13px] underline">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
