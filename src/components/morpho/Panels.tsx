"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { MarketRow } from "@/app/api/markets/route";
import { ASSETS, USDG } from "@/config/assets";
import { CHAIN } from "@/config/brand";
import { AssetIcon } from "@/components/ui";
import { useMorpho, useTokenBalance, useTxRunner, type Step } from "@/components/morpho/useMorpho";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { cleanAmount, num, pct, usd } from "@/lib/finance";
import {
  MORPHO,
  book,
  encodeBorrow,
  encodeRepay,
  encodeSupply,
  encodeSupplyCollateral,
  encodeWithdraw,
  encodeWithdrawCollateral,
  formatExact,
  liquidity,
  parseUnits,
  toAssetsUp,
  toNumber,
  trustMarket,
  type MarketSnapshot,
  type Trust,
} from "@/lib/morpho";

const LOAN_DECIMALS = USDG.decimals;

/** USD per whole collateral token from a Morpho oracle price (1e36 scale, raw units). */
export function oracleUsd(price: bigint | null, collateralDecimals: number) {
  if (price === null) return null;
  return (Number(price) / 1e36) * 10 ** (collateralDecimals - LOAN_DECIMALS);
}

/** Whether Arter offers new money into this market (see trustMarket). Null while unread. */
export function marketTrust(m: MarketSnapshot | undefined, row: MarketRow): Trust | null {
  if (!m) return null;
  const asset = ASSETS.find((a) => a.address.toLowerCase() === row.collateralAddress.toLowerCase());
  return trustMarket(m, { loanToken: USDG.address, loanDecimals: USDG.decimals, loanFeed: USDG.feed, collateral: row.collateralAddress, collateralFeed: asset?.feed ?? null });
}

function TrustNote({ trust }: { trust: Trust | null }) {
  if (!trust || trust.ok) return null;
  return (
    <p className="rounded-[3px] border border-rust/40 bg-rust/5 px-3 py-2 text-[12.5px] leading-snug text-rust" data-testid="morpho-untrusted">
      Arter does not offer new deposits or borrowing in this market. {trust.reason} You can still withdraw or repay anything you already have here.
    </p>
  );
}

function Gate() {
  const { address, onRobinhoodChain, switchNetwork, switching } = useWallet();
  const { open } = useWalletModal();
  if (!address)
    return (
      <button type="button" onClick={open} className="btn btn-ink h-11 w-full text-[14.5px]" data-testid="morpho-connect">
        Connect wallet
      </button>
    );
  if (!onRobinhoodChain)
    return (
      <button type="button" onClick={switchNetwork} disabled={switching} className="btn btn-ink h-11 w-full text-[14.5px]">
        {switching ? "Switching…" : `Switch to ${CHAIN.name}`}
      </button>
    );
  return null;
}

function Note({ note }: { note: { ok: boolean; text: string; hash?: string } | null }) {
  if (!note) return null;
  return (
    <p className={`text-[13px] leading-snug ${note.ok ? "text-moss" : "text-rust"}`} data-testid="morpho-note">
      {note.text}{" "}
      {note.hash ? (
        <a href={`${CHAIN.explorer}/tx/${note.hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
          tx <ExternalLink className="size-3" />
        </a>
      ) : null}
    </p>
  );
}

function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-[3px] border border-line-2 bg-paper p-1" role="tablist">
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`min-w-0 flex-1 cursor-pointer rounded-[2px] px-2 py-1.5 text-[13px] whitespace-nowrap ${value === k ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
          data-testid={`morpho-tab-${k}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Row({ k, v, tone = "" }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-[13.5px]">
      <span className="text-ink-3">{k}</span>
      <span className={`figure text-right ${tone}`}>{v}</span>
    </div>
  );
}

const usdgText = (v: bigint | null) => (v === null ? "…" : `${num(toNumber(v, LOAN_DECIMALS), 2)} USDG`);

/** Supply USDG to one Morpho market and withdraw it, from the connected wallet. */
export function LendPanel({ market }: { market: MarketRow }) {
  const { address } = useWallet();
  const { markets, positions, reload } = useMorpho([market.id]);
  const { run, stage, note } = useTxRunner(reload);
  const [mode, setMode] = useState<"supply" | "withdraw">("supply");
  const [amount, setAmount] = useState("");
  const m: MarketSnapshot | undefined = markets[market.id];
  const pos = positions[market.id];
  const b = m && pos ? book(m, pos) : null;
  const free = m ? liquidity(m) : null;
  const wallet = useTokenBalance(USDG.address, note);
  const value = parseUnits(amount, LOAN_DECIMALS);
  const trust = marketTrust(m, market);
  // Exits always work; new money only goes into markets that pass the trust check.
  const allowed = mode === "withdraw" || Boolean(trust?.ok);
  const ready = Boolean(address && m && value && value > 0n && allowed);

  const supplied = b?.supplied ?? 0n;
  const withdrawCap = free === null ? supplied : supplied < free ? supplied : free;
  const tooMuch = value !== null && (mode === "supply" ? wallet !== null && value > wallet : value > withdrawCap);

  const submit = () => {
    if (!m || !address || !value || !pos) return;
    if (mode === "supply") {
      const steps: Step[] = [
        { label: "Supply", to: MORPHO, data: encodeSupply(m.params, value, 0n, address), approve: { token: USDG.address, amount: value } },
      ];
      run(steps, `Supplied ${amount} USDG. It earns the market's supply rate from now on.`);
    } else {
      // Withdrawing everything goes by shares, so no dust is left behind.
      const all = value >= supplied && supplied <= (free ?? 0n);
      const data = all ? encodeWithdraw(m.params, 0n, pos.supplyShares, address, address) : encodeWithdraw(m.params, value, 0n, address, address);
      run([{ label: "Withdraw", to: MORPHO, data }], `Withdrew ${all ? num(toNumber(supplied, LOAN_DECIMALS), 2) : amount} USDG to your wallet.`);
    }
    setAmount("");
  };

  return (
    <div className="space-y-4" data-testid="lend-panel">
      <div className="flex items-center gap-2">
        <span className="live-tag">Live on Morpho</span>
        <span className="text-[12.5px] text-ink-3">
          USDG lent against {market.collateral}
          {market.listed ? " · listed by Morpho" : " · permissionless market"}
        </span>
      </div>
      <div>
        <Row k="Supply APY (live)" v={pct(market.supplyApy)} tone="text-moss" />
        <Row k="Free to withdraw from market" v={usdgText(free)} />
        <Row k="You have supplied" v={address ? usdgText(b ? b.supplied : null) : "—"} />
        <Row k="In your wallet" v={address ? usdgText(wallet) : "—"} />
        <Row k="Market check" v={trust === null ? "…" : trust.ok ? "Verified" : "Not offered"} tone={trust && !trust.ok ? "text-rust" : "text-moss"} />
      </div>
      <TrustNote trust={trust} />
      <Tabs
        value={mode}
        options={[
          ["supply", "Supply"],
          ["withdraw", "Withdraw"],
        ]}
        onChange={(v) => {
          setMode(v);
          setAmount("");
        }}
      />
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={`lend-${market.id}`} className="label">
            Amount (USDG)
          </label>
          <button
            type="button"
            className="cursor-pointer text-[12px] text-moss underline disabled:no-underline disabled:opacity-50"
            disabled={!address}
            onClick={() => {
              const max = mode === "supply" ? wallet : withdrawCap;
              if (max !== null) setAmount(formatExact(max, LOAN_DECIMALS));
            }}
          >
            Max
          </button>
        </div>
        <input
          id={`lend-${market.id}`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(cleanAmount(e.target.value))}
          placeholder="0.00"
          className="field figure mt-2 text-[18px]"
          data-testid="lend-amount"
        />
        {tooMuch ? (
          <p className="mt-1.5 text-[12.5px] text-rust">
            {mode === "supply" ? "More than your wallet holds." : "More than you can withdraw right now (your supply, or the market's free USDG)."}
          </p>
        ) : null}
      </div>
      <Gate />
      {address ? (
        <button
          type="button"
          onClick={submit}
          disabled={!ready || tooMuch || stage !== null}
          className="btn btn-ink h-11 w-full text-[14.5px]"
          data-testid="lend-submit"
        >
          {stage ?? (mode === "supply" ? "Supply USDG" : "Withdraw USDG")}
        </button>
      ) : null}
      <Note note={note} />
      <p className="text-[12px] leading-relaxed text-ink-3">
        Your USDG goes to Morpho Blue (<span className="font-mono">{MORPHO.slice(0, 10)}…</span>), not to Arter. The rate floats with the market; when borrowers
        use most of the pool, withdrawals wait until they repay. Arter adds no fee here.
      </p>
    </div>
  );
}

function healthTone(h: number | null) {
  if (h === null || !Number.isFinite(h)) return "text-moss";
  if (h < 1.1) return "text-rust";
  if (h < 1.5) return "text-brass-deep";
  return "text-moss";
}
const healthText = (h: number | null) => (h === null ? "—" : Number.isFinite(h) ? num(h, 2) : "No debt");

/** Collateral, borrow, repay and collateral withdrawal in one Morpho market. */
export function BorrowPanel({ market, symbol }: { market: MarketRow; symbol: string }) {
  const { address } = useWallet();
  const { markets, positions, reload } = useMorpho([market.id]);
  const { run, stage, note } = useTxRunner(reload);
  const [mode, setMode] = useState<"collateral" | "borrow" | "repay" | "withdraw">("collateral");
  const [amount, setAmount] = useState("");
  const m = markets[market.id];
  const pos = positions[market.id];
  const b = m && pos ? book(m, pos) : null;
  const decimals = market.collateralDecimals;
  const collateralWallet = useTokenBalance(market.collateralAddress, note);
  const usdgWallet = useTokenBalance(USDG.address, note);
  const free = m ? liquidity(m) : null;
  const price = m ? oracleUsd(m.price, decimals) : null;
  const trust = marketTrust(m, market);
  const allowed = mode === "repay" || mode === "withdraw" || Boolean(trust?.ok);
  const unitDecimals = mode === "collateral" || mode === "withdraw" ? decimals : LOAN_DECIMALS;
  const value = parseUnits(amount, unitDecimals);

  // Health after the action, so the effect is visible before signing.
  let preview: number | null = null;
  if (m && pos && value && value > 0n) {
    const next = { ...pos };
    if (mode === "collateral") next.collateral = pos.collateral + value;
    if (mode === "withdraw") next.collateral = pos.collateral > value ? pos.collateral - value : 0n;
    const nb = book(m, next);
    let debt = nb.borrowed;
    if (mode === "borrow") debt += value;
    if (mode === "repay") debt = debt > value ? debt - value : 0n;
    preview = nb.maxBorrow === null ? null : debt === 0n ? Infinity : Number(nb.maxBorrow) / Number(debt);
  }
  // The Max borrow keeps a 10% buffer below the liquidation line, and never exceeds what the market has free.
  let safeBorrow: bigint | null = null;
  if (b && b.maxBorrow !== null) {
    const cap = (b.maxBorrow * 90n) / 100n;
    const room = cap > b.borrowed ? cap - b.borrowed : 0n;
    safeBorrow = free !== null && free < room ? free : room;
  }

  const max = () => {
    if (mode === "collateral" && collateralWallet !== null) return setAmount(formatExact(collateralWallet, decimals));
    if (mode === "borrow" && safeBorrow !== null) return setAmount(formatExact((safeBorrow / 10_000n) * 10_000n, LOAN_DECIMALS));
    if (mode === "repay" && b) return setAmount(formatExact(b.borrowed, LOAN_DECIMALS));
    if (mode === "withdraw" && b) return setAmount(formatExact(b.collateral, decimals));
  };

  const submit = () => {
    if (!m || !pos || !address || !value) return;
    if (mode === "collateral") {
      run(
        [
          {
            label: "Deposit collateral",
            to: MORPHO,
            data: encodeSupplyCollateral(m.params, value, address),
            approve: { token: market.collateralAddress, amount: value },
          },
        ],
        `Deposited ${amount} ${symbol} as collateral.`,
      );
    } else if (mode === "borrow") {
      run([{ label: "Borrow", to: MORPHO, data: encodeBorrow(m.params, value, 0n, address, address) }], `Borrowed ${amount} USDG to your wallet.`);
    } else if (mode === "repay") {
      // Repaying the whole debt goes by shares (interest keeps accruing by the second); approve a small margin above it.
      const owed = toAssetsUp(pos.borrowShares, m.state.totalBorrowAssets, m.state.totalBorrowShares);
      const all = value >= owed;
      const approve = all ? owed + owed / 200n + 10n : value;
      const data = all ? encodeRepay(m.params, 0n, pos.borrowShares, address) : encodeRepay(m.params, value, 0n, address);
      run([{ label: "Repay", to: MORPHO, data, approve: { token: USDG.address, amount: approve } }], all ? "Debt repaid in full." : `Repaid ${amount} USDG.`);
    } else {
      run(
        [{ label: "Withdraw collateral", to: MORPHO, data: encodeWithdrawCollateral(m.params, value, address, address) }],
        `Withdrew ${amount} ${symbol} to your wallet.`,
      );
    }
    setAmount("");
  };

  const unit = mode === "collateral" || mode === "withdraw" ? symbol : "USDG";
  return (
    <div className="space-y-4" data-testid="borrow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="live-tag">Live on Morpho</span>
        <AssetIcon symbol={symbol} size={18} />
        <span className="text-[12.5px] text-ink-3">
          {symbol} → USDG · liquidation at {pct(market.lltv * 100, 1)} LTV · borrow APY {pct(market.borrowApy)}
        </span>
      </div>
      <div>
        <Row k="Your collateral" v={address ? (b ? `${num(toNumber(b.collateral, decimals), 4)} ${symbol}` : "…") : "—"} />
        <Row k="Your debt" v={address ? usdgText(b ? b.borrowed : null) : "—"} />
        <Row k="Health (liquidation below 1.00)" v={address ? healthText(b?.health ?? null) : "—"} tone={healthTone(b?.health ?? null)} />
        <Row k={`Liquidation price (${symbol})`} v={b?.liquidationPrice ? usd(oracleUsd(b.liquidationPrice, decimals)) : "—"} />
        <Row k={`Oracle price (${symbol})`} v={price === null ? "…" : usd(price)} />
        <Row k="USDG free in this market" v={usdgText(free)} />
        <Row k="Market check" v={trust === null ? "…" : trust.ok ? "Verified" : "Not offered"} tone={trust && !trust.ok ? "text-rust" : "text-moss"} />
      </div>
      <TrustNote trust={trust} />
      <Tabs
        value={mode}
        options={[
          ["collateral", "Deposit"],
          ["borrow", "Borrow"],
          ["repay", "Repay"],
          ["withdraw", "Withdraw"],
        ]}
        onChange={(v) => {
          setMode(v);
          setAmount("");
        }}
      />
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={`borrow-${market.id}`} className="label">
            {mode === "collateral" ? "Deposit" : mode === "borrow" ? "Borrow" : mode === "repay" ? "Repay" : "Withdraw"} ({unit})
          </label>
          <button type="button" className="cursor-pointer text-[12px] text-moss underline disabled:opacity-50" disabled={!address} onClick={max}>
            Max{mode === "borrow" ? " (90% of limit)" : ""}
          </button>
        </div>
        <input
          id={`borrow-${market.id}`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(cleanAmount(e.target.value))}
          placeholder="0.00"
          className="field figure mt-2 text-[18px]"
          data-testid="borrow-live-amount"
        />
        <p className="mt-1.5 font-mono text-[11px] text-ink-3">
          Wallet:{" "}
          {mode === "collateral" || mode === "withdraw"
            ? collateralWallet === null
              ? "—"
              : `${num(toNumber(collateralWallet, decimals), 4)} ${symbol}`
            : usdgText(usdgWallet)}
          {preview !== null ? (
            <>
              {" "}
              · health after: <span className={healthTone(preview)}>{healthText(preview)}</span>
            </>
          ) : null}
        </p>
        {preview !== null && preview < 1.05 && (mode === "borrow" || mode === "withdraw") ? (
          <p className="mt-1 text-[12.5px] text-rust">
            That would put the position at the liquidation line. Morpho will refuse it, or liquidate on the next price move.
          </p>
        ) : null}
      </div>
      <Gate />
      {address ? (
        <button
          type="button"
          onClick={submit}
          disabled={!value || value === 0n || stage !== null || !m || !allowed}
          className="btn btn-ink h-11 w-full text-[14.5px]"
          data-testid="borrow-live-submit"
        >
          {stage ?? (mode === "collateral" ? `Deposit ${symbol}` : mode === "borrow" ? "Borrow USDG" : mode === "repay" ? "Repay USDG" : `Withdraw ${symbol}`)}
        </button>
      ) : null}
      <Note note={note} />
      <p className="text-[12px] leading-relaxed text-ink-3">
        Collateral and debt sit on Morpho Blue in your own name. If the oracle price falls to the liquidation price, anyone can repay your debt and take
        collateral at a discount. Interest accrues every second. Arter adds no fee.
      </p>
    </div>
  );
}
