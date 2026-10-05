/** Arter's own notes. Written by the team; nothing here is a press release. */

export type Note = {
  slug: string;
  title: string;
  date: string;
  minutes: number;
  summary: string;
  body: { heading?: string; paragraphs?: string[]; list?: string[] }[];
};

export const NOTES: Note[] = [
  {
    slug: "idle-by-default",
    title: "Idle by default: why tokenized assets earn nothing today",
    date: "2026-10-04",
    minutes: 5,
    summary: "Gold, treasuries and stocks now live on Robinhood Chain as tokens. Almost all of them just sit in wallets. Here is why, and what changes that.",
    body: [
      {
        paragraphs: [
          "Robinhood Chain carries real tokenized assets: dozens of US stocks and ETFs, a gold fund, a short-dated Treasury fund, and USDG as the dollar leg. Each one has a Chainlink price feed on the chain itself. On paper, everything a capital market needs is already here.",
          "In practice, most of these tokens are held and nothing else. A GLD token pays no coupon. A tokenized NVDA can be held or sold, and that is roughly the menu. The value is real, but it is parked.",
        ],
      },
      {
        heading: "Three reasons the money stays parked",
        list: [
          "No native venue: lending stock tokens needs isolated markets with oracles that understand trading hours, and those are only starting to appear.",
          "Dividends and splits: stock tokens report corporate actions through a uiMultiplier. A vault that ignores it mis-prices every share.",
          "Compliance hooks: the tokens carry a blocklist. Any contract holding them has to respect it or it breaks for everyone.",
        ],
      },
      {
        heading: "What Arter is for",
        paragraphs: [
          "Arter is the layer that lets the same asset do four jobs: earn yield in a vault, back a loan, supply liquidity, and stay exposed to its own price. The design target is a 3-7% APY, compounding daily, with no lock-up.",
          "None of Arter's contracts are deployed yet. Until they are, the app runs in practice mode on top of live prices and live reference markets, so you can see exactly what a position would do before anything goes on-chain.",
        ],
      },
    ],
  },
  {
    slug: "how-practice-mode-works",
    title: "How practice mode works, and what it is not",
    date: "2026-10-03",
    minutes: 4,
    summary: "Every deposit, loan and deployment you open on Arter today is a simulation over real prices. This note explains the maths and the limits.",
    body: [
      {
        paragraphs: [
          "Practice mode is a ledger kept in your browser, keyed by your wallet address. It never signs or sends a transaction. Positions you open there are not visible to anyone else and they move no tokens.",
        ],
      },
      {
        heading: "The maths",
        list: [
          "Vaults: a target APY you pick inside the 3-7% band. With daily compounding the daily rate is (1 + APY)^(1/365) - 1, so 1,000 units at 5% become 1,050 after a year and about 1,276 after five.",
          "Loans: debt divided by collateral value gives the LTV. Health factor is collateral value times the liquidation threshold, divided by debt. Below 1.0 the position would be liquidated.",
          "Liquidation price: debt divided by (collateral units times the liquidation threshold).",
        ],
      },
      {
        heading: "What is live",
        paragraphs: [
          "Prices are Chainlink reads on Robinhood Chain. Wallet balances are real balanceOf reads, scaled by each stock token's uiMultiplier. The lending rates in the reference tables come from Morpho markets that already exist on the chain and belong to other people.",
          "What is not live: Arter vault balances, Arter TVL and Arter yields. There are none yet, and the site says so wherever a number would otherwise appear.",
        ],
      },
    ],
  },
  {
    slug: "reading-the-reference-markets",
    title: "Reading the live lending markets on Robinhood Chain",
    date: "2026-10-01",
    minutes: 6,
    summary: "USDG lenders on Robinhood Chain already earn a few percent from borrowers who post stocks and stable assets. What those numbers say about Arter's targets.",
    body: [
      {
        paragraphs: [
          "Morpho Blue runs isolated lending markets on Robinhood Chain. Each market pairs one collateral with one loan asset, and almost all of them lend USDG. Arter's analytics page reads them live and filters out test and dust markets.",
        ],
      },
      {
        heading: "What to look for",
        list: [
          "Supply APY on USDG markets: this is what a lender earns today. It is the closest public benchmark for an Arter USDG vault.",
          "LLTV on stock-collateral markets: most use 62.5%. Arter's simulator uses lower limits on purpose (45% liquidation threshold for single stocks).",
          "Utilization: very high utilization means lenders may wait to withdraw. Arter's no-lock-up promise needs a liquidity buffer for exactly this reason.",
        ],
      },
      {
        heading: "Why we show them separately",
        paragraphs: [
          "These markets are not Arter's and their rates are not Arter's. They are context. Every table that shows them carries a live-reference label and the source, and none of their numbers is added to anything we call ours.",
        ],
      },
    ],
  },
  {
    slug: "contracts-we-still-need",
    title: "The contracts Arter still needs before it goes live",
    date: "2026-09-29",
    minutes: 5,
    summary: "A plain list of the on-chain pieces between practice mode and real deposits: vaults, an oracle adapter, isolated credit and an allocator.",
    body: [
      {
        heading: "The set",
        list: [
          "One ERC-4626 vault per asset. Share accounting has to read the stock token's uiMultiplier and the vault must refuse deposits from, and transfers to, addresses on the token's blocklist.",
          "An oracle adapter over Chainlink feeds with staleness checks that know equity feeds follow a 24/5 schedule with a 24-hour heartbeat.",
          "Isolated lending markets for each collateral, or an integration that supplies into existing ones, with the conservative LTVs shown in the simulator.",
          "A strategy allocator that moves vault balances between lending, liquidity ranges and cash buffers within hard caps, and keeps enough idle balance for instant withdrawals.",
        ],
      },
      {
        heading: "Before any of it holds real money",
        paragraphs: [
          "Independent audits, a public test deployment and a capped launch. Until then the site stays in practice mode, and the contract addresses section of each vault stays empty.",
        ],
      },
    ],
  },
];

export const noteBySlug = (slug: string) => NOTES.find((n) => n.slug === slug) ?? null;

export function noteDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
