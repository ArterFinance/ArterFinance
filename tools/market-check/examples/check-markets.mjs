// Every USDG market on Morpho (Robinhood Chain), checked on chain the way Arter checks it.
//   node examples/check-markets.mjs
import { expectationFor, listUsdgMarkets, readMarket, trustMarket } from "../src/markets.mjs";
import { client } from "./lib.mjs";

const candidates = await listUsdgMarkets();
console.log(`${candidates.length} USDG markets with at least $1,000 supplied\n`);
for (const c of candidates.sort((a, b) => b.state.supplyAssetsUsd - a.state.supplyAssetsUsd)) {
  const m = await readMarket(client, c.marketId);
  const t = trustMarket(m, expectationFor(m.params.collateralToken));
  const apy = ((c.state.supplyApy ?? 0) * 100).toFixed(2).padStart(6);
  const free = `$${Math.round(c.state.liquidityAssetsUsd ?? 0).toLocaleString("en-US")}`.padStart(14);
  console.log(`${(t.ok ? "OFFERED    " : "NOT OFFERED")}  ${c.collateralAsset.symbol.padEnd(11)} supply APY ${apy}%  free ${free}  ${t.reason}`);
}
