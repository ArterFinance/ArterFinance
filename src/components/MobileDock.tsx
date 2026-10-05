"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, HandCoins, Landmark, LayoutList, Wallet } from "lucide-react";
import { useCopyCa } from "@/components/CopyCa";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { shortAddress } from "@/config/brand";

/** Bottom bar on phones: vaults, borrow, positions, copy CA and the wallet. */
export function MobileDock() {
  const pathname = usePathname() ?? "/";
  const { copied, copy, live } = useCopyCa();
  const { address } = useWallet();
  const { open } = useWalletModal();
  const tab = (href: string) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10.5px] ${pathname.startsWith(href) ? "text-ink" : "text-ink-3"}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Quick actions">
      <div className="flex items-stretch">
        <Link href="/vaults" className={tab("/vaults")}>
          <Landmark className="size-4" />
          Vaults
        </Link>
        <Link href="/borrow" className={tab("/borrow")}>
          <HandCoins className="size-4" />
          Borrow
        </Link>
        <Link href="/manage" className={tab("/manage")}>
          <LayoutList className="size-4" />
          Positions
        </Link>
        <button
          type="button"
          onClick={copy}
          disabled={!live}
          className="flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-2 text-[10.5px] text-ink disabled:cursor-default disabled:text-ink-3"
          data-testid="dock-copy"
        >
          <Copy className="size-4" />
          {!live ? "CA at launch" : copied ? "Copied" : "Copy CA"}
        </button>
        {address ? (
          <Link href="/manage" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 bg-ink py-2 font-mono text-[10px] text-paper">
            <Wallet className="size-4 text-brass" />
            {shortAddress(address, 4, 2)}
          </Link>
        ) : (
          <button type="button" onClick={open} className="flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 bg-ink py-2 text-[10.5px] text-paper">
            <Wallet className="size-4 text-brass" />
            Connect
          </button>
        )}
      </div>
    </nav>
  );
}
