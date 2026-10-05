"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import {
  MORPHO,
  encodeApprove,
  readAllowance,
  readBalance,
  readMarkets,
  readPositions,
  simulate,
  waitReceipt,
  type MarketSnapshot,
  type Position,
} from "@/lib/morpho";

const EMPTY_POSITION: Position = { supplyShares: 0n, borrowShares: 0n, collateral: 0n };

/**
 * Live state of some Morpho markets for the connected wallet: parameters,
 * totals and oracle price from Morpho, plus the wallet's own positions.
 * Re-read every 20 seconds and after every transaction.
 */
export function useMorpho(ids: string[]) {
  const { address } = useWallet();
  const key = ids.join(",");
  const [markets, setMarkets] = useState<Record<string, MarketSnapshot>>({});
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (!list.length) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [ms, ps] = await Promise.all([readMarkets(list), address ? readPositions(address, list) : Promise.resolve([] as Position[])]);
        if (cancelled) return;
        setMarkets(Object.fromEntries(ms.map((m) => [m.id, m])));
        setPositions(Object.fromEntries(list.map((id, i) => [id, ps[i] ?? EMPTY_POSITION])));
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const t = window.setInterval(() => !document.hidden && load(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [key, address, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { markets, positions: address ? positions : {}, error, reload, empty: EMPTY_POSITION };
}

export type Step = { label: string; to: string; data: string; approve?: { token: string; amount: bigint } };

/**
 * Runs a short sequence of transactions: an exact-amount approval first when
 * the allowance is short, each step dry-run before the wallet is asked.
 */
export function useTxRunner(onDone: () => void) {
  const { address, sendTransaction, refreshBalance } = useWallet();
  const [stage, setStage] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);

  const run = useCallback(
    async (steps: Step[], done: string) => {
      if (!address) return;
      setNote(null);
      let last: string | undefined;
      try {
        for (const step of steps) {
          if (step.approve) {
            const have = await readAllowance(step.approve.token, address, MORPHO);
            if (have < step.approve.amount) {
              setStage("Approve in wallet…");
              const hash = await sendTransaction({ to: step.approve.token, data: encodeApprove(MORPHO, step.approve.amount) });
              setStage("Waiting for the approval…");
              await waitReceipt(hash);
            }
          }
          setStage("Checking…");
          await simulate({ from: address, to: step.to, data: step.data });
          setStage(`${step.label}: confirm in wallet…`);
          const hash = await sendTransaction({ to: step.to, data: step.data });
          setStage("Waiting for the block…");
          await waitReceipt(hash);
          last = hash;
        }
        setNote({ ok: true, text: done, hash: last });
        refreshBalance();
        onDone();
      } catch (cause) {
        setNote({ ok: false, text: cause instanceof Error ? cause.message : "The transaction did not go through." });
      } finally {
        setStage(null);
      }
    },
    [address, sendTransaction, refreshBalance, onDone],
  );

  return { run, stage, note, setNote };
}

/** Wallet balance of one token, refreshed with the markets. */
export function useTokenBalance(token: string | null, refreshKey: unknown) {
  const { address } = useWallet();
  const [value, setValue] = useState<bigint | null>(null);
  useEffect(() => {
    if (!address || !token) return;
    let cancelled = false;
    readBalance(token, address)
      .then((v) => !cancelled && setValue(v))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, token, refreshKey]);
  return address && token ? value : null;
}
