import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BRAND, CHAIN } from "@/config/brand";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Yield for platforms",
  description: "Wallets, brokers and apps can offer yield on tokenized assets through Arter's ERC-4626 vaults on Robinhood Chain, without building the backend.",
};

const MODELS = [
  {
    name: "Shared vaults",
    tag: "Standard",
    text: "Point your app at the public ERC-4626 vault for each asset. Deposit, withdraw and read balances with the same four calls every ERC-4626 integration already knows.",
    cta: { href: "#preview", label: "See the interface" },
  },
  {
    name: "Dedicated vault",
    tag: "Custom",
    text: "A vault that only your users can enter, with its own asset list, caps, buffer size and fee split, so the product matches your terms and your controls.",
    cta: { href: BRAND.x, label: "Talk to us" },
  },
];

const POINTS = [
  { title: "Idle balances earn", text: "Assets your users already hold start compounding daily, while they keep the exposure they chose." },
  { title: "No yield desk to build", text: "Allocation, rebalancing, liquidations and buffers run in the contracts. Your team ships the button." },
  { title: "Accounting on-chain", text: "Share prices and accruals are contract state. Reconcile from events instead of a partner's spreadsheet." },
  { title: "Fits your controls", text: "Allow-lists, per-user limits and blocklist checks come built in, and a dedicated vault can go further." },
];

const CODE = `import { createPublicClient, http, parseAbi } from "viem";

// Interface preview. Vault addresses are published once deployed.
const VAULT = process.env.ARTER_USDG_VAULT as \`0x\${string}\`;

const client = createPublicClient({
  transport: http("${CHAIN.publicRpc}"),
});

const erc4626 = parseAbi([
  "function totalAssets() view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
]);

// What one user's position is worth, in USDG.
export async function positionOf(user: \`0x\${string}\`) {
  const shares = await client.readContract({
    address: VAULT, abi: erc4626, functionName: "balanceOf", args: [user],
  });
  return client.readContract({
    address: VAULT, abi: erc4626, functionName: "convertToAssets", args: [shares],
  });
}`;

export default function PlatformsPage() {
  const lines = CODE.split("\n");
  return (
    <Shell>
      <section className="ruled border-b border-line-2">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:pt-20 lg:pb-20">
          <div className="min-w-0">
            <p className="font-mono text-[12px] text-ink-3">For wallets, brokers and apps</p>
            <h1 className="serif mt-5 text-[48px] leading-[0.98] sm:text-[72px] lg:text-[84px]">
              Offer yield.
              <br />
              <em className="text-brass-deep">Skip the backend.</em>
            </h1>
          </div>
          <div className="min-w-0">
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Put an earn product on top of tokenized assets your users already hold on {CHAIN.name}. Arter runs the vaults; your interface
              stays yours.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#preview" className="btn btn-ink h-12 px-5 text-[15px]">
                Preview the interface
              </a>
              <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-flat h-12 px-5 text-[15px]">
                Talk to us <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">Where the money goes.</h2>
          <div className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.3fr]">
            {[
              { t: "Your users", s: "Hold USDG, GLD, SGOV or stock tokens" },
              { t: "Your app", s: "Shows an Earn balance and a deposit button" },
              { t: "Arter vault", s: "Shared or dedicated ERC-4626, one per asset" },
            ].map((b, i) => (
              <div key={b.t} className="contents">
                <div className={`flex min-w-0 flex-col justify-center rounded-[4px] border p-5 ${i === 2 ? "border-ink bg-ink text-paper" : "border-line-2 bg-card"}`}>
                  <p className="serif text-[24px]">{b.t}</p>
                  <p className={`mt-1 text-[13.5px] ${i === 2 ? "text-paper/70" : "text-ink-3"}`}>{b.s}</p>
                </div>
                <div className="flex items-center justify-center font-mono text-ink-3" aria-hidden="true">
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </div>
              </div>
            ))}
            <div className="min-w-0 rounded-[4px] border border-line-2 bg-card">
              {[
                ["Isolated lending", "overcollateralized USDG and asset loans"],
                ["Liquidity ranges", "narrow asset/USDG positions"],
                ["Withdrawal buffer", "idle, for instant exits"],
              ].map(([t, s]) => (
                <div key={t} className="border-t border-line px-5 py-3 first:border-t-0">
                  <p className="font-medium">{t}</p>
                  <p className="text-[13px] text-ink-3">{s}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-[14px] text-ink-3">Income flows back the same way: converted into the deposited asset and added to the vault&apos;s share price every day.</p>
        </div>
      </section>

      <section className="border-b border-line-2 bg-paper-2/50">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">Two ways in.</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {MODELS.map((m) => (
              <div key={m.name} className="panel flex flex-col p-6 sm:p-8">
                <span className="font-mono text-[11px] tracking-[0.08em] text-brass-deep uppercase">{m.tag}</span>
                <h3 className="serif mt-2 text-[34px]">{m.name}</h3>
                <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-ink-2">{m.text}</p>
                <a
                  href={m.cta.href}
                  {...(m.cta.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="mt-6 inline-flex w-fit items-center gap-1.5 text-[14.5px] underline decoration-brass underline-offset-4"
                >
                  {m.cta.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">The part you no longer build.</h2>
          <div className="mt-12 grid grid-cols-1 border-t border-ink/80 md:grid-cols-2">
            {POINTS.map((p, i) => (
              <div key={p.title} className={`border-b border-line-2 py-8 md:px-8 ${i % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"}`}>
                <h3 className="text-[20px] font-semibold">{p.title}</h3>
                <p className="mt-2 max-w-md text-[15.5px] leading-relaxed text-ink-2">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="bg-deep text-paper">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:py-24">
          <div className="min-w-0">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[50px]">
              Integration <em className="text-brass">preview.</em>
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-paper/70">
              Standard ERC-4626, so any library that speaks it works. This reads one user&apos;s position. The vault address is a placeholder until
              deployment.
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[4px] border border-paper/15 bg-deep-2">
            <div className="border-b border-paper/10 px-4 py-2.5 font-mono text-[11px] text-paper/50">position.ts</div>
            <pre className="overflow-x-auto py-4 font-mono text-[12.5px] leading-[1.7]">
              <code>
                {lines.map((l, i) => (
                  <span key={i} className="flex">
                    <span className="w-10 shrink-0 pr-3 text-right text-paper/30 select-none">{i + 1}</span>
                    <span className={`pr-4 whitespace-pre ${l.trim().startsWith("//") ? "text-brass/80" : "text-paper/85"}`}>{l || " "}</span>
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-brass-soft/70">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[56px]">Build your earn tab.</h2>
            <p className="mt-3 max-w-lg text-[15.5px] text-ink-2">Tell us what your users hold. We will sketch the vault setup that fits.</p>
          </div>
          <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-ink h-12 px-6 text-[15px]">
            Message {BRAND.xHandle} <ArrowUpRight className="size-4" />
          </a>
        </div>
      </section>
    </Shell>
  );
}
