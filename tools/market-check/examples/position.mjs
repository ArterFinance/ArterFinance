// A wallet's Morpho positions in USDG markets: supplied, collateral, debt and health.
//   node examples/position.mjs 0xYourAddress
import { book, listUsdgMarkets, readMarket, readPosition } from "../src/markets.mjs";
import { client } from "./lib.mjs";

const user = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(user ?? "")) throw new Error("Usage: node examples/position.mjs 0xYourAddress");
let any = false;
for (const c of await listUsdgMarkets()) {
  const p = await readPosition(client, c.marketId, user);
  if (p.supplyShares === 0n && p.borrowShares === 0n && p.collateral === 0n) continue;
  any = true;
  const m = await readMarket(client, c.marketId);
  const b = book(m, p);
  const usdg = (v) => (Number(v) / 1e6).toFixed(2);
  console.log(`${c.collateralAsset.symbol}: supplied ${usdg(b.supplied)} USDG, collateral ${(Number(b.collateral) / 1e18).toFixed(6)}, debt ${usdg(b.borrowed)} USDG, health ${b.health === Infinity ? "no debt" : b.health?.toFixed(3)}`);
}
if (!any) console.log("No positions in USDG markets.");
