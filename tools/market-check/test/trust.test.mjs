// Offline checks of the market rules: every way a market can fail, and the two ways it can pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADAPTIVE_IRM, USDG, book, expectationFor, trustMarket } from "../src/markets.mjs";

const NVDA = "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC";
const NVDA_FEED = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";
const ZERO = "0x0000000000000000000000000000000000000000";
const WAD = 10n ** 18n;

const factoryMarket = (over = {}, oracle = {}) => ({
  id: "0x66306c08000000000000000000000000000000000000000000000000000000ab",
  params: { loanToken: USDG.address, collateralToken: NVDA, oracle: "0x0000000000000000000000000000000000000001", irm: ADAPTIVE_IRM, lltv: (625n * WAD) / 1000n, ...over },
  state: { totalSupplyAssets: 0n, totalSupplyShares: 0n, totalBorrowAssets: 0n, totalBorrowShares: 0n },
  price: 234n * 10n ** 24n, // $234 per NVDA in raw units (USDG 6 decimals per 18-decimal token), Morpho 1e36 scale
  oracle: { fromFactory: true, baseFeed1: NVDA_FEED, baseFeed2: ZERO, quoteFeed1: USDG.feed, quoteFeed2: ZERO, baseVault: ZERO, quoteVault: ZERO, scaleFactor: 10n ** 24n, collateralDecimals: 18, ...oracle },
});
const expect = expectationFor(NVDA);

test("a factory oracle on the asset's own feed passes", () => {
  assert.equal(trustMarket(factoryMarket(), expect).ok, true);
});

test("a custom oracle fails", () => {
  const r = trustMarket(factoryMarket({}, { fromFactory: false }), expect);
  assert.equal(r.ok, false);
  assert.match(r.reason, /custom code/);
});

test("a factory oracle built with the wrong decimals fails", () => {
  // Claiming 6 decimals for an 18-decimal token inflates the collateral price by 10^12.
  const r = trustMarket(factoryMarket({}, { scaleFactor: 10n ** 36n }), expect);
  assert.equal(r.ok, false);
  assert.match(r.reason, /wrong token decimals/);
});

test("another asset's feed fails", () => {
  const r = trustMarket(factoryMarket({}, { baseFeed1: "0x4A1166a659A55625345e9515b32adECea5547C38" }), expect);
  assert.equal(r.ok, false);
});

test("a vault or second feed in the oracle fails", () => {
  assert.equal(trustMarket(factoryMarket({}, { baseVault: "0x0000000000000000000000000000000000000002" }), expect).ok, false);
  assert.equal(trustMarket(factoryMarket({}, { baseFeed2: NVDA_FEED }), expect).ok, false);
});

test("a liquidation LTV above 77% fails on a volatile asset", () => {
  assert.equal(trustMarket(factoryMarket({ lltv: (860n * WAD) / 1000n }), expect).ok, false);
});

test("a non-standard rate model or loan token fails", () => {
  assert.equal(trustMarket(factoryMarket({ irm: "0x0000000000000000000000000000000000000003" }), expect).ok, false);
  assert.equal(trustMarket(factoryMarket({ loanToken: NVDA }), expect).ok, false);
});

test("a pinned listed market passes only with its pinned oracle", () => {
  const id = "0xc845da65a020ddca5f132efa8fea79676d8edfdea504226a4c01e7a9e34cddd6";
  const usde = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
  const listed = { ...factoryMarket({ collateralToken: usde, oracle: "0xE64849bd4AD03DfaBbe02bb521de19997a19055f", lltv: (915n * WAD) / 1000n }, { fromFactory: false }), id };
  const e = expectationFor(usde);
  assert.equal(trustMarket(listed, e).ok, true);
  assert.equal(trustMarket({ ...listed, params: { ...listed.params, oracle: "0x0000000000000000000000000000000000000004" } }, e).ok, false);
});

test("health and borrow limit follow Morpho's maths", () => {
  const m = factoryMarket();
  m.state = { totalSupplyAssets: 1_000_000_000n, totalSupplyShares: 1_000_000_000_000_000n, totalBorrowAssets: 500_000_000n, totalBorrowShares: 500_000_000_000_000n };
  // 1 NVDA at $234 with 62.5% LLTV can borrow $146.25; 100 USDG borrowed -> health 1.4625.
  const b = book(m, { supplyShares: 0n, borrowShares: 100_000_000_000_000n, collateral: WAD });
  assert.equal(b.maxBorrow, 146_250_000n);
  assert.ok(Math.abs(b.health - 1.4625) < 0.001);
});
