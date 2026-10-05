import Link from "next/link";
import { BRAND, CHAIN } from "@/config/brand";
import { CopyCaBlock } from "@/components/CopyCa";
import { Wordmark } from "@/components/Mark";

const COLUMNS = [
  {
    title: "Vaults",
    links: [
      { href: "/vaults/usdg", label: "USDG vault" },
      { href: "/vaults/gld", label: "Gold vault" },
      { href: "/vaults/sgov", label: "Treasury vault" },
      { href: "/vaults", label: "All vaults" },
    ],
  },
  {
    title: "Use your assets",
    links: [
      { href: "/borrow", label: "Borrow against them" },
      { href: "/deploy", label: "Deploy liquidity" },
      { href: "/manage", label: "Your positions" },
      { href: "/analytics", label: "Live markets" },
    ],
  },
  {
    title: "For teams",
    links: [
      { href: "/institutions", label: "Institutions & issuers" },
      { href: "/platforms", label: "Yield for platforms" },
      { href: "/notes", label: "Notes" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: BRAND.x, label: `X ${BRAND.xHandle}`, external: true },
      { href: "/chat", label: "Wallet chat" },
      { href: "/swap", label: `Buy ${BRAND.symbol}` },
      { href: CHAIN.explorer, label: "Block explorer", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="ruled-dark bg-deep pb-24 text-paper md:pb-0">
      <div className="mx-auto max-w-[1240px] px-4 pt-16 pb-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_2fr]">
          <div className="min-w-0">
            <Wordmark tone="paper" />
            <p className="serif mt-5 max-w-sm text-[26px] leading-tight text-paper">{BRAND.slogan}</p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-paper/65">
              Yield, credit and liquidity for tokenized assets on {CHAIN.name}.
            </p>
            <CopyCaBlock tone="deep" className="mt-6 max-w-md" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title} className="min-w-0">
                <p className="font-mono text-[10.5px] tracking-[0.1em] text-brass uppercase">{col.title}</p>
                <ul className="mt-3 space-y-2.5 text-[14px]">
                  {col.links.map((l) =>
                    "external" in l && l.external ? (
                      <li key={l.href}>
                        <a href={l.href} target="_blank" rel="noreferrer" className="text-paper/75 hover:text-paper">
                          {l.label} ↗
                        </a>
                      </li>
                    ) : (
                      <li key={l.href}>
                        <Link href={l.href} className="text-paper/75 hover:text-paper">
                          {l.label}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 border-t border-paper/15 pt-6 text-[12px] leading-relaxed text-paper/50">
          <p>
            {BRAND.name} is an independent project on {CHAIN.name}. It is not affiliated with, endorsed by or sponsored by
            Robinhood Markets, Inc. or any issuer of the tokens it lists. Nothing on this site is financial advice, nor an offer of
            securities. The 3-7% APY range is a design target, not a promised or live rate. Arter&apos;s vault, lending and
            allocation contracts are not deployed yet: deposits, loans and deployments on this site run in practice mode and
            move no funds. Prices come from Chainlink feeds on {CHAIN.name}; reference lending data comes from the Morpho API.
          </p>
          <p className="mt-3 font-mono text-[11px]">
            © 2026 {BRAND.name} · {BRAND.domain}
          </p>
        </div>
      </div>
    </footer>
  );
}
