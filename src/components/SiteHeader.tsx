"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BRAND, TOKEN } from "@/config/brand";
import { CopyCaTag } from "@/components/CopyCa";
import { Wordmark } from "@/components/Mark";
import { APP_TABS, NAV } from "@/components/site";
import { NavWallet } from "@/components/wallet/WalletButton";

function Notice() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="relative bg-deep text-paper">
      <Link
        href="/swap"
        className="mx-auto flex min-h-9 max-w-[1240px] items-center justify-center gap-2 px-10 py-1.5 text-center text-[12.5px] leading-snug"
      >
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-brass uppercase">{BRAND.symbol}</span>
        <span className="text-paper/85">
          {TOKEN.isLive ? "is live on Robinhood Chain." : "launches on Robinhood Chain."}
          <span className="hidden sm:inline">{TOKEN.isLive ? " Buy it on the swap page." : " The contract is published on this site first."}</span>
        </span>
        <ArrowUpRight className="size-3.5 shrink-0 text-brass" />
      </Link>
      <button
        type="button"
        aria-label="Hide notice"
        onClick={() => setHidden(true)}
        className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1.5 text-paper/60 hover:text-paper"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** One header for the whole site; app routes add the tab strip below it. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const inApp = APP_TABS.some((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40">
      <Notice />
      <div className="border-b border-line-2 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Link href="/" className="mr-auto flex shrink-0 items-center lg:mr-6" aria-label={`${BRAND.name} home`}>
            <Wordmark />
          </Link>
          <nav className="mr-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[3px] px-2.5 py-2 text-[14.5px] transition-colors xl:px-3 ${active(item.href) ? "text-ink underline decoration-brass decoration-2 underline-offset-[6px]" : "text-ink-2 hover:text-ink"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <CopyCaTag compact />
            <NavWallet compact />
            {inApp ? null : (
              <Link href="/vaults" className="btn btn-ink h-9 px-3.5 text-[13.5px] max-xl:hidden">
                Open app
              </Link>
            )}
            <button
              type="button"
              className="flex size-9 cursor-pointer items-center justify-center rounded-[3px] border border-line-2 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {inApp ? <AppTabs pathname={pathname} /> : null}
      </div>
      {open ? (
        <nav className="border-b border-line-2 bg-card lg:hidden" aria-label="Menu">
          <ul className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-4 px-4 py-3 sm:px-6">
            {[...NAV, { href: "/manage", label: "Manage" }, { href: "/analytics", label: "Analytics" }, { href: "/swap", label: `Buy ${BRAND.symbol}` }, { href: "/chat", label: "Chat" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className={`block border-b border-line py-3 text-[15px] ${active(item.href) ? "text-ink" : "text-ink-2"}`}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function AppTabs({ pathname }: { pathname: string }) {
  return (
    <div className="border-t border-line">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <nav className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="App">
          {APP_TABS.map((tab) => {
            const on = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 border-b-2 px-2.5 py-2.5 text-[13.5px] whitespace-nowrap transition-colors ${on ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {pathname === "/lend" || pathname.startsWith("/borrow") || pathname === "/manage" ? (
          <span className="live-tag hidden md:inline-flex" title="Lending and borrowing run on Morpho Blue with real transactions">
            Live on Morpho
          </span>
        ) : (
          <span className="practice-tag hidden md:inline-flex" title="Arter's own vault contracts are not deployed yet">
            Practice vaults
          </span>
        )}
      </div>
    </div>
  );
}
