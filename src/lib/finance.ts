/**
 * The arithmetic behind every simulator on the site. Pure functions, no I/O.
 *
 * APY already includes compounding. With daily compounding the daily rate is
 * (1 + APY)^(1/365) - 1, and a balance after d days is P * (1 + APY)^(d/365).
 */

export const DAY_MS = 86_400_000;

export function dailyRate(apyPct: number) {
  return Math.pow(1 + apyPct / 100, 1 / 365) - 1;
}

/** The simple yearly rate that compounds daily into `apyPct`. */
export function aprFromApy(apyPct: number) {
  return dailyRate(apyPct) * 365 * 100;
}

/** Balance after `days` (fractional days allowed for a smooth live counter). */
export function grow(principal: number, apyPct: number, days: number) {
  return principal * Math.pow(1 + apyPct / 100, days / 365);
}

/** Earnings only. */
export function earned(principal: number, apyPct: number, days: number) {
  return grow(principal, apyPct, days) - principal;
}

/** One point per step for a growth chart. */
export function growthSeries(principal: number, apyPct: number, days: number, steps = 60) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const d = (days * i) / steps;
    return { day: d, value: grow(principal, apyPct, d) };
  });
}

export type LoanInput = {
  units: number;
  price: number;
  debt: number;
  liqLtv: number;
};

export function loanStats({ units, price, debt, liqLtv }: LoanInput) {
  const collateralUsd = units * price;
  const ltv = collateralUsd > 0 ? debt / collateralUsd : 0;
  const health = debt > 0 ? (collateralUsd * liqLtv) / debt : Infinity;
  const liqPrice = debt > 0 && units > 0 ? debt / (units * liqLtv) : 0;
  const drop = price > 0 && liqPrice > 0 ? 1 - liqPrice / price : 1;
  return { collateralUsd, ltv, health, liqPrice, drop };
}

/** Interest owed on `debt` after `days` at a borrow APY. */
export function interest(debt: number, borrowApyPct: number, days: number) {
  return grow(debt, borrowApyPct, days) - debt;
}

export function usd(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e5) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function num(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** Sensible decimals for an asset amount. */
export function units(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  return num(n, abs >= 1000 ? 2 : abs >= 1 ? 4 : 6);
}

/** Keeps digits and one dot, for amount inputs. */
export function cleanAmount(v: string) {
  const s = v.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  return dot < 0 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
}
