import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { BRAND } from "@/config/brand";
import { Faq } from "@/components/Faq";
import { NoteList } from "@/components/NoteList";
import { Shell } from "@/components/Shell";
import { Compare } from "@/components/home/Compare";
import { Hero } from "@/components/home/Hero";
import { Numbers } from "@/components/home/Numbers";
import { Tape } from "@/components/home/Tape";
import { NOTES, noteDate } from "@/data/notes";

const JOBS = [
  { job: "Earn a yield", today: "Pays nothing while it sits in a wallet.", arter: "Vaults pay a target 3-7% APY in the same asset, compounding daily." },
  { job: "Back a loan", today: "Has to be sold to raise cash.", arter: "Borrow USDG against it at conservative LTVs and keep the upside." },
  { job: "Supply liquidity", today: "Idle unless you manage pools yourself.", arter: "The allocator places idle balance in lending and AMM ranges, settled on-chain." },
  { job: "Stay exposed", today: "Held, or sold. That is the menu.", arter: "Price exposure and dividends stay yours through every one of the above." },
];

const VAULT_POINTS = [
  { n: "01", title: "Paid in what you put in", text: "Deposit GLD, get more GLD. Deposit NVDA, get more NVDA. No swap into a reward token, no second asset to manage." },
  { n: "02", title: "Compounds every day", text: "Earnings are added to the balance daily, so tomorrow's yield is paid on today's. Nothing to claim, nothing to restake." },
  { n: "03", title: "Gold, treasuries, dollars and stocks", text: "The first vaults cover USDG, SGOV, GLD, SPY, QQQ and seven large-cap stock tokens. More follow the deepest markets." },
];

const STEPS = [
  { title: "Deposit", text: "Move a tokenized asset into its vault. You receive vault shares that track your balance, withdrawable any time." },
  { title: "Allocate", text: "The allocator lends the asset to overcollateralized borrowers and places part of it in tight liquidity ranges, inside hard caps." },
  { title: "Accrue", text: "Income is converted back into the deposited asset and added to the vault every day. Your share of it grows on its own." },
];

const WHY = [
  { title: "Yield on what you already own", text: "No new asset to buy and no change in exposure. The holding you chose starts paying." },
  { title: "No lock-ups", text: "Withdraw whenever you want. A cash buffer covers instant exits; anything larger is served as strategies unwind." },
  { title: "Checkable at every step", text: "Prices come from Chainlink feeds on Robinhood Chain and balances from the tokens themselves. Read them yourself." },
  { title: "Built around the token's own rules", text: "Stock tokens report dividends through uiMultiplier and enforce a blocklist. Arter's vaults are designed to honour both." },
];

const FAQ = [
  {
    q: "What is Arter Finance?",
    a: "Arter is infrastructure for tokenized capital markets on Robinhood Chain. It takes assets that usually sit idle, such as tokenized gold, treasuries and stocks, and lets them earn yield, back loans and supply liquidity while you keep their price exposure.",
  },
  {
    q: "Can I deposit today?",
    a: "Not with real funds. Arter's vault, lending and allocator contracts are not deployed yet. Every deposit, loan and deployment you open on this site runs in practice mode: a simulation in your browser over live prices and your real wallet balances. Nothing is signed or sent.",
  },
  {
    q: "Is the 3-7% APY guaranteed?",
    a: "No. It is the range the vaults are designed to target. Actual returns will depend on borrowing demand, liquidity fees and market conditions, and could be lower. Where the site shows live rates, they belong to other lending markets and are labelled as a reference.",
  },
  {
    q: "Is there a lock-up or withdrawal period?",
    a: "No lock-up by design. Each vault keeps a buffer for instant withdrawals. If many holders exit at once and the buffer runs out, the remaining withdrawals are filled as loans repay and liquidity ranges unwind.",
  },
  {
    q: "Which assets are supported?",
    a: "The first vaults are USDG, SGOV, GLD, SPY, QQQ, NVDA, AAPL, TSLA, MSFT, GOOGL, AMZN and META. The borrow simulator accepts every one of the 36 verified Robinhood stock, ETF and commodity tokens that has a Chainlink feed.",
  },
  {
    q: "What are the risks?",
    a: "Smart contract risk once contracts exist, oracle risk (equity feeds trade 24/5 and update on a 24-hour heartbeat), borrower default absorbed by liquidations, liquidity range losses, and the issuer and custody risk of the underlying tokens. No protocol is risk-free.",
  },
  {
    q: `What is ${BRAND.symbol}?`,
    a: `${BRAND.symbol} is the project's token on Robinhood Chain. Its contract address is published on this site at launch, in the navbar, the footer and the phone bottom bar. Do not trust an address from anywhere else.`,
  },
];

export default function Home() {
  const latest = NOTES[0];
  return (
    <Shell>
      <Hero />

      <div className="border-b border-line-2 bg-card">
        <Link href={`/notes/${latest.slug}`} className="group mx-auto flex max-w-[1240px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
          <span className="font-mono text-[11px] tracking-[0.08em] text-brass-deep uppercase">Latest note</span>
          <span className="min-w-0 flex-1 text-[15px] group-hover:text-moss">{latest.title}</span>
          <span className="font-mono text-[12px] text-ink-3">{noteDate(latest.date)}</span>
        </Link>
      </div>

      <Numbers />

      {/* The problem: four jobs an asset could do */}
      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">
              Billions in tokenized assets.
              <br />
              <span className="text-ink-3">Most of it earning zero.</span>
            </h2>
            <p className="max-w-lg text-[16px] leading-relaxed text-ink-2 lg:self-end">
              Tokenized gold pays no coupon. Tokenized stocks can be held or sold. Real-world assets sit in cold storage. Arter
              gives the same asset four jobs at once.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-[4px] border border-line-2">
            <div className="hidden grid-cols-[180px_1fr_1fr] bg-paper-2/70 font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase md:grid">
              <span className="px-5 py-3">The job</span>
              <span className="border-l border-line-2 px-5 py-3">Held in a wallet today</span>
              <span className="border-l border-line-2 px-5 py-3 text-moss">With Arter</span>
            </div>
            {JOBS.map((j) => (
              <div key={j.job} className="grid grid-cols-1 border-t border-line-2 bg-card first:border-t-0 md:grid-cols-[180px_1fr_1fr] md:first:border-t">
                <p className="serif px-5 pt-5 text-[22px] md:py-5">{j.job}</p>
                <p className="flex items-start gap-2.5 px-5 pt-2 text-[15px] leading-relaxed text-ink-3 md:border-l md:border-line-2 md:py-5">
                  <Minus className="mt-1 size-4 shrink-0" /> {j.today}
                </p>
                <p className="flex items-start gap-2.5 px-5 pt-2 pb-5 text-[15px] leading-relaxed text-ink md:border-l md:border-line-2 md:py-5">
                  <Check className="mt-1 size-4 shrink-0 text-moss" /> {j.arter}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Compare />

      {/* Vaults */}
      <section className="border-b border-line-2">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="min-w-0 lg:sticky lg:top-40 lg:self-start">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">Earn through Arter vaults.</h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-2">
              One vault per asset, each with its own strategy caps and its own target band inside 3-7%.
            </p>
            <Link href="/vaults" className="btn btn-ink mt-8 h-11 px-5 text-[14.5px]">
              Browse the vaults <ArrowRight className="size-4" />
            </Link>
          </div>
          <ol className="min-w-0">
            {VAULT_POINTS.map((p) => (
              <li key={p.n} className="grid grid-cols-[64px_1fr] gap-4 border-t border-line-2 py-8 first:border-ink/80 sm:grid-cols-[96px_1fr]">
                <span className="serif text-[44px] leading-none text-brass sm:text-[60px]">{p.n}</span>
                <div className="min-w-0">
                  <h3 className="text-[20px] font-semibold tracking-[-0.01em]">{p.title}</h3>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line-2 bg-paper-2/50">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">How a deposit earns.</h2>
          <div className="relative mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            <div className="absolute top-[18px] right-[8%] left-[8%] hidden h-px bg-ink/40 md:block" aria-hidden="true" />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative min-w-0">
                <span className="figure relative z-10 flex size-9 items-center justify-center rounded-full border border-ink bg-paper text-[14px]">
                  {i + 1}
                </span>
                <h3 className="serif mt-5 text-[28px]">{s.title}</h3>
                <p className="mt-2 max-w-sm text-[15.5px] leading-relaxed text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-b border-line-2">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[54px]">Why Arter.</h2>
            <p className="max-w-lg text-[16px] leading-relaxed text-ink-2 lg:self-end">
              The point is not a new asset. It is getting more out of the ones already on Robinhood Chain.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 border-t border-ink/80 md:grid-cols-2">
            {WHY.map((w, i) => (
              <div key={w.title} className={`border-b border-line-2 py-8 md:px-8 ${i % 2 === 0 ? "md:border-r md:pl-0" : "md:pr-0"}`}>
                <h3 className="text-[20px] font-semibold tracking-[-0.01em]">{w.title}</h3>
                <p className="mt-2 max-w-md text-[15.5px] leading-relaxed text-ink-2">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assets */}
      <section className="pt-16 lg:pt-20">
        <div className="mx-auto mb-8 flex max-w-[1240px] flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <h2 className="serif text-[34px] leading-[1.05] sm:text-[42px]">The assets it is built for.</h2>
          <p className="max-w-md text-[14px] leading-relaxed text-ink-3">
            Verified Robinhood tokens with a Chainlink feed, plus USDG. Live prices; not partners, not endorsements.
          </p>
        </div>
        <Tape />
      </section>

      {/* Notes */}
      <section className="border-b border-line-2">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:py-24">
          <div className="min-w-0">
            <h2 className="serif text-[40px] leading-[1.02] sm:text-[50px]">Notes from the desk.</h2>
            <Link href="/notes" className="mt-6 inline-block text-[14px] underline decoration-brass underline-offset-4">
              All notes
            </Link>
          </div>
          <NoteList limit={3} />
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:py-24">
          <h2 className="serif text-[40px] leading-[1.02] sm:text-[50px]">Questions, answered plainly.</h2>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-line-2 bg-brass-soft/70">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between lg:py-20">
          <h2 className="serif text-[44px] leading-[0.98] sm:text-[64px]">
            Put your holdings
            <br />
            <em>on the payroll.</em>
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/vaults" className="btn btn-ink h-12 px-6 text-[15px]">
              Start earning <ArrowRight className="size-4" />
            </Link>
            <Link href="/manage" className="btn btn-paper h-12 px-6 text-[15px]">
              Check my wallet
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
