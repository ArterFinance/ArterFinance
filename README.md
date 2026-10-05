# Arter Finance

**Assets That Earn.** Lend USDG and borrow against tokenized stocks on Robinhood Chain, only in lending markets that pass an on-chain safety check. Fully open source: the website and the market check are both in this repository.

Website: [arter.finance](https://arter.finance) · X: [@arterfinance](https://x.com/arterfinance) · Token: `$ARTER`

## The problem

Robinhood Chain carries real tokenized assets: dozens of US stocks and ETFs, a gold fund (GLD), a short-dated Treasury fund (SGOV) and USDG as the dollar. Almost all of it sits idle in wallets. Tokenized gold pays no coupon; a tokenized stock can be held or sold, and that is the whole menu.

Lending is the obvious fix (lend USDG for a yield, or borrow USDG against your shares without selling them), and Morpho Blue already runs those markets on Robinhood Chain. But Morpho markets are **permissionless**. Anyone can open a market that lends USDG against a real token such as NVDA and choose its price oracle. That oracle can be:

- **custom code** whose price its author controls, or
- **a standard oracle built with the wrong decimals**, which can overvalue the collateral a trillion times.

Either way, a borrower posts collateral the oracle overprices, borrows the lenders' USDG and never comes back. From the outside such a market looks exactly like an honest one: same token, same interface, often a higher yield. On Robinhood Chain today, the four largest stock-collateral markets use custom oracles nobody outside can verify.

## The solution

Arter is the interface that checks before it lets money in, and publishes the check:

- **Read from the chain, not from an API.** Every market's loan token, collateral, rate model, oracle and liquidation LTV are read from Morpho itself by market id before any transaction is built.
- **Only verifiable oracles.** A market gets new money only if it is one of the deep Morpho-listed markets with its oracle pinned, or if its oracle is Morpho's own Chainlink oracle pricing the collateral on that asset's Chainlink feed, with no extra feeds or vaults, a scale factor that matches the real token decimals, and a liquidation LTV of at most 77%.
- **Exits are never blocked.** Withdrawing and repaying work in every market, checked or not.
- **Your position, your name, no fee.** Positions live on Morpho Blue under your wallet. Arter has no contract of its own and takes no cut.
- **Explained before you sign.** Every action is dry-run first: a borrow beyond your limit, or more than the market has free, is refused with a reason before your wallet opens. Health and liquidation price are shown for every change.

## What you can try

Live now:

- **Lend USDG** on `/lend`: pick a market, see its live rate, free liquidity and check result, supply and withdraw.
- **Borrow** on `/borrow`: post stock-token collateral, borrow USDG, repay and withdraw where a verified market exists, with the health after each action previewed.
- **Your positions** on `/manage`: Morpho positions plus real balances of 36 verified Robinhood tokens.
- Live Chainlink prices, Morpho market data, analytics and a wallet-only chat.
- **The check without the website:** `tools/market-check` lists which USDG markets pass right now and why the others do not.

Coming later, as clearly labelled simulations until they are deployed and audited:

- Per-asset yield vaults (target 3-7% APY; a design target, not a live rate), the borrow simulator for assets without a market, and the liquidity allocator.
- A swap page for $ARTER that switches on once the token contract is published.

## Run it locally

Requires Node.js 20 or newer. Download ZIP or fork this repository, then:

```bash
npm install
npm run build
npm start            # http://localhost:4860
```

No configuration is needed. Optional environment variables, in a local env file or your host's settings:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` / `ROBINHOOD_RPC_URL` | Your own Robinhood Chain RPC for the browser / the server |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Project id from cloud.reown.com, enables WalletConnect |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `KV_REDIS_URL` / `REDIS_URL` | Storage for the chat |
| `CHAT_KEY_PREFIX` | Key prefix when sharing one Redis (default `arter:`) |

**The market check on its own:**

```bash
cd tools/market-check
npm install
npm test                                   # every rule, its failing cases and both passing ones
node examples/check-markets.mjs            # every USDG market, checked on chain
node examples/position.mjs 0xYourAddress   # supplied, collateral, debt, health
```

Example output (5 October 2026, abridged):

```
OFFERED      USDe        supply APY   3.60%  free    $38,035,875  Listed by Morpho (USDe), oracle pinned.
NOT OFFERED  NVDA        supply APY  16.00%  free            $31  Its price oracle is custom code that cannot be verified.
OFFERED      NVDA        supply APY   0.00%  free         $6,547  Oracle verified: Morpho's Chainlink oracle on the asset's own feed, scale checked.
```

## Add the network to your wallet

| Field | Value |
| --- | --- |
| Network name | Robinhood Chain |
| Chain ID | 4663 |
| RPC URL | https://rpc.mainnet.chain.robinhood.com |
| Currency symbol | ETH |
| Block explorer | https://robinhoodchain.blockscout.com |

## Project layout

```
src/
  app/                    pages (/, /vaults, /lend, /borrow, /deploy, /manage, /analytics, ...) and API routes
  components/morpho/      live lend and borrow panels, market list, positions, transaction runner
  components/app/         vaults, borrow simulator, allocator, manage, analytics
  config/assets.ts        verified Robinhood tokens (assets.generated.ts) with their Chainlink feeds
  lib/morpho.ts           Morpho calls, market reads, trustMarket() rules, share maths
  lib/finance.ts          yield, loan and health maths
tools/market-check/       the same rules as a standalone library with tests and scripts
scripts/                  asset resolver, logo and brand renderers
```

## Contracts used

| | Address |
| --- | --- |
| Morpho Blue | `0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010` |
| Morpho adaptive curve rate model | `0x2BD3d5965B26B51814AC95127B2b80dD6CcC0fa1` |
| Morpho Chainlink oracle factory | `0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2` |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| $ARTER token | Published at launch. Only trust the address shown on arter.finance and [@arterfinance](https://x.com/arterfinance). |

## Security and status

- The check lowers one specific risk, oracle manipulation. It does not remove market risk, liquidation risk, issuer risk on tokenized stocks (issuers can pause or block tokens) or smart-contract risk in Morpho itself.
- Found a vulnerability? Please reach us privately on [@arterfinance](https://x.com/arterfinance) before opening a public issue.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npx tsc --noEmit` and `npm test` in `tools/market-check` before opening a pull request. Changes to the market rules need a test that fails without them.

## License

MIT, see `LICENSE`.

---

Not affiliated with Robinhood Markets, Inc. or Morpho. Nothing here is financial advice.
