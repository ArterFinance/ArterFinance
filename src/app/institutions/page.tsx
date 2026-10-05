import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BRAND, CHAIN } from "@/config/brand";
import { ASSETS } from "@/config/assets";
import { NoteList } from "@/components/NoteList";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Institutions & issuers",
  description: "Vault, credit and issuance infrastructure for treasuries, asset managers, family offices and issuers of tokenized assets on Robinhood Chain.",
};

const AUDIENCES = [
  {
    who: "Issuers",
    text: "Tokenize gold, equities or bonds and give holders something to do with them on day one: a vault, a collateral listing and a liquidity range, wired to your token's own compliance rules.",
  },
  {
    who: "Corporate treasuries",
    text: "Put tokenized treasuries and dollar balances to work without handing them to a custodian. Positions stay in a contract you can read, with withdrawals that do not wait on a lock-up.",
  },
  {
    who: "Asset managers",
    text: "Add yield to tokenized holdings inside a portfolio, or borrow against them for liquidity, with limits that match the risk policy you already report against.",
  },
  {
    who: "Family offices",
    text: "Keep long-term exposure to stocks and gold while the same holdings earn. Segregated vaults keep one family's capital and parameters apart from everyone else's.",
  },
];

const FEATURES = [
  { n: "01", title: "Your mandate, encoded", text: "Dedicated vaults with an allow-list of depositors and assets, so the contract enforces what your policy says, not a promise in a PDF." },
  { n: "02", title: "Risk you set", text: "Choose collateral, loan-to-value limits, strategy caps and buffer size per vault. Tighter than our defaults is always allowed." },
  { n: "03", title: "Non-custodial by design", text: "ERC-4626 vaults hold the assets. No off-chain custodian, no omnibus wallet, and every movement is an on-chain event." },
  { n: "04", title: "Reporting from the chain", text: "Balances, accruals and allocator moves come from contract events, exportable for your own books and auditors." },
];

const PROCESS = [
  { title: "Scope", text: "Agree the assets, the limits and who may deposit. We map them to vault parameters." },
  { title: "Configure", text: "A dedicated vault is set up with your guardrails and tested on a public test deployment first." },
  { title: "Fund", text: "You deposit from your own wallet or custody setup. Nothing moves through us." },
  { title: "Monitor", text: "Health, allocations and accruals are visible live, with alerts on the limits you care about." },
];

const SECURITY = [
  { k: "Audits", status: "Pending", tone: "brass", text: "Contracts are in design. Independent audits come before any real deposit, and reports will be linked here." },
  { k: "Custody", status: "Non-custodial", tone: "moss", text: "Assets sit in the vault contract. Arter never holds keys to client funds." },
  { k: "Compliance", status: "Built in", tone: "moss", text: "Vaults respect each stock token's blocklist and can restrict depositors to an allow-list." },
  { k: "Oracles", status: "Chainlink", tone: "moss", text: "Feeds on Robinhood Chain, with staleness checks that understand 24/5 equity hours." },
];

export default function InstitutionsPage() {
  return (
    <Shell>
      <section className="ruled border-b border-line-2">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:pt-20 lg:pb-20">
          <div className="min-w-0">
            <p className="font-mono text-[12px] text-ink-3">For institutions and issuers</p>
            <h1 className="serif mt-5 text-[48px] leading-[0.98] sm:text-[72px] lg:text-[84px]">
              Tokenized capital,
              <br />
              <em className="text-brass-deep">run to your mandate.</em>
            </h1>
          </div>
          <div className="min-w-0">
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Structures for deploying tokenized assets on {CHAIN.name} that fit an internal policy: who can deposit, what can be lent, how far
              it can be levered, and how fast it can come back.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-ink h-12 px-5 text-[15px]">
                Start a conversation <ArrowUpRight className="size-4" />
              </a>
              <Link href="/notes/contracts-we-still-need" className="btn btn-flat h-12 px-5 text-[15px]">
                Read the contract plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line-2 bg-card">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-px bg-line px-0 sm:px-6 lg:grid-cols-4">
          {[
            [`${ASSETS.length - 1}`, "verified Robinhood stock, ETF and commodity tokens"],
            ["58", "Chainlink price feeds on the chain"],
            ["USDG", "as the settlement dollar"],
            ["Live", "isolated credit markets already running"],
          ].map(([v, l]) => (
            <div key={l} className="bg-card px-4 py-6 sm:px-6">
              <p className="serif text-[34px] leading-none">{v}</p>
              <p className="mt-2 text-[13px] leading-snug text-ink-3">{l}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-[1240px] px-4 pb-4 font-mono text-[11px] text-ink-3 sm:px-6">
          Public infrastructure Arter builds on. No partnership or endorsement is implied.
        </p>
      </section>

      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">We bring the rails. You bring the capital.</h2>
            <p className="max-w-lg text-[16px] leading-relaxed text-ink-2 lg:self-end">
              Four kinds of holders, one set of contracts, each configured to its own rules.
            </p>
          </div>
          <div className="mt-12 border-t border-ink/80">
            {AUDIENCES.map((a) => (
              <div key={a.who} className="grid grid-cols-1 gap-2 border-b border-line-2 py-7 md:grid-cols-[260px_1fr] md:gap-10">
                <h3 className="serif text-[28px]">{a.who}</h3>
                <p className="max-w-2xl text-[15.5px] leading-relaxed text-ink-2">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep text-paper">
        <div className="ruled-dark">
          <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">
              Dedicated vaults. <em className="text-brass">Your liquidity, your rules.</em>
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-x-12 md:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.n} className="grid grid-cols-[56px_1fr] gap-4 border-t border-paper/15 py-7">
                  <span className="serif text-[34px] leading-none text-brass">{f.n}</span>
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold">{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-paper/70">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">How an engagement runs.</h2>
          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p, i) => (
              <li key={p.title} className="min-w-0 border-t-2 border-ink pt-5">
                <span className="figure text-[13px] text-ink-3">Step {i + 1}</span>
                <h3 className="serif mt-2 text-[28px]">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line-2 bg-paper-2/50">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">Security, with the status shown.</h2>
            <p className="max-w-lg text-[16px] leading-relaxed text-ink-2 lg:self-end">
              We would rather show an honest &quot;pending&quot; than a badge we have not earned yet.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((s) => (
              <div key={s.k} className="bg-card p-6">
                <p className="label">{s.k}</p>
                <p className={`serif mt-3 text-[28px] leading-none ${s.tone === "brass" ? "text-brass-deep" : "text-moss"}`}>{s.status}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line-2">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[50px]">Latest from the desk.</h2>
          <NoteList limit={3} />
        </div>
      </section>

      <section className="bg-brass-soft/70">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[56px]">Deploy with a plan.</h2>
            <p className="mt-3 max-w-lg text-[15.5px] text-ink-2">Tell us the assets and the limits. We will show you the vault that enforces them, in practice mode first.</p>
          </div>
          <a href={BRAND.x} target="_blank" rel="noreferrer" className="btn btn-ink h-12 px-6 text-[15px]">
            Message {BRAND.xHandle} <ArrowUpRight className="size-4" />
          </a>
        </div>
      </section>
    </Shell>
  );
}
