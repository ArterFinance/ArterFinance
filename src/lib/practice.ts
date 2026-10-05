"use client";

import { useCallback } from "react";
import { useLocalStore } from "@/components/wallet/useLocalStore";
import { useWallet } from "@/components/wallet/WalletProvider";

/**
 * Practice mode. Arter's vault, lending and allocator contracts are not
 * deployed, so positions opened on this site live in this browser only,
 * keyed by the connected wallet (or "guest"). Nothing here touches the chain.
 */

export type VaultPosition = { id: string; symbol: string; units: number; apy: number; openedAt: number };
export type LoanPosition = {
  id: string;
  collateral: string;
  units: number;
  debt: number;
  borrowApy: number;
  openedAt: number;
};
export type Deployment = { id: string; symbol: string; usd: number; mix: Record<string, number>; openedAt: number };
export type LogEntry = { at: number; text: string };

export type PracticeBook = {
  vaults: VaultPosition[];
  loans: LoanPosition[];
  deployments: Deployment[];
  log: LogEntry[];
};

const EMPTY: PracticeBook = { vaults: [], loans: [], deployments: [], log: [] };

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function usePractice() {
  const { address } = useWallet();
  const key = `arter.practice.v1.${address ? address.toLowerCase() : "guest"}`;
  const [book, setBook] = useLocalStore<PracticeBook>(key, EMPTY);

  const update = useCallback(
    (fn: (b: PracticeBook) => PracticeBook, text: string) => {
      const next = fn({ ...EMPTY, ...book });
      setBook({ ...next, log: [{ at: Date.now(), text }, ...next.log].slice(0, 40) });
    },
    [book, setBook],
  );

  const deposit = useCallback(
    (symbol: string, units: number, apy: number) =>
      update(
        (b) => ({ ...b, vaults: [...b.vaults, { id: newId(), symbol, units, apy, openedAt: Date.now() }] }),
        `Deposited ${units} ${symbol} into the ${symbol} vault at a ${apy.toFixed(2)}% target`,
      ),
    [update],
  );

  const withdraw = useCallback(
    (id: string, label: string) =>
      update((b) => ({ ...b, vaults: b.vaults.filter((v) => v.id !== id) }), `Withdrew ${label}. No lock-up, no fee`),
    [update],
  );

  const borrow = useCallback(
    (loan: Omit<LoanPosition, "id" | "openedAt">) =>
      update(
        (b) => ({ ...b, loans: [...b.loans, { ...loan, id: newId(), openedAt: Date.now() }] }),
        `Borrowed ${loan.debt.toFixed(2)} USDG against ${loan.units} ${loan.collateral}`,
      ),
    [update],
  );

  const repay = useCallback(
    (id: string, label: string) => update((b) => ({ ...b, loans: b.loans.filter((l) => l.id !== id) }), `Repaid ${label}`),
    [update],
  );

  const deploy = useCallback(
    (d: Omit<Deployment, "id" | "openedAt">) =>
      update(
        (b) => ({ ...b, deployments: [...b.deployments, { ...d, id: newId(), openedAt: Date.now() }] }),
        `Deployed $${d.usd.toFixed(2)} of ${d.symbol} across ${Object.keys(d.mix).length} strategies`,
      ),
    [update],
  );

  const recall = useCallback(
    (id: string, label: string) =>
      update((b) => ({ ...b, deployments: b.deployments.filter((d) => d.id !== id) }), `Recalled ${label}`),
    [update],
  );

  const reset = useCallback(() => setBook(null), [setBook]);

  return { book: { ...EMPTY, ...book }, owner: address, deposit, withdraw, borrow, repay, deploy, recall, reset };
}
