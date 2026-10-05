"use client";

import { useEffect, useState } from "react";

/** Round asset logo tile, baked by scripts/make-asset-logos.mjs. */
export function AssetIcon({ symbol, size = 28, className = "" }: { symbol: string; size?: number; className?: string }) {
  return (
    // Small fixed-size icons: a plain <img> renders reliably where next/image can come up blank.
    <img
      src={`/assets/${symbol.toLowerCase()}.webp`}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full ring-1 ring-line ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** "read 12s ago", re-rendered every few seconds. */
export function Ago({ at, prefix = "read" }: { at: number | null; prefix?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 5000);
    return () => window.clearInterval(t);
  }, []);
  if (!at || now === null) return <span>{prefix} …</span>;
  const s = Math.max(0, Math.round((now - at) / 1000));
  const text = s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
  return (
    <span>
      {prefix} {text}
    </span>
  );
}

/** Feed timestamp age, for "updated 3h ago" next to oracle prices. */
export function feedAge(updatedAt: number | null | undefined, now: number) {
  if (!updatedAt) return "—";
  const h = (now - updatedAt) / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 48) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** A page title block used by every inner page. */
export function PageHead({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line-2">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 pt-10 pb-9 sm:px-6 md:pt-14 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="min-w-0">
          {kicker ? <div className="mb-4 flex flex-wrap items-center gap-2">{kicker}</div> : null}
          <h1 className="serif text-[42px] leading-[1.02] sm:text-[56px] lg:text-[64px]">{title}</h1>
        </div>
        <div className="min-w-0">
          {lead ? <p className="max-w-lg text-[16px] leading-relaxed text-ink-2">{lead}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/** A labelled figure in the ledger style. */
export function Figure({
  label,
  value,
  note,
  tone = "ink",
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "ink" | "moss" | "brass";
}) {
  const color = tone === "moss" ? "text-moss" : tone === "brass" ? "text-brass-deep" : "text-ink";
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className={`figure mt-1.5 text-[26px] leading-none break-words ${color}`}>{value}</p>
      {note ? <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">{note}</p> : null}
    </div>
  );
}

export function PracticeNote({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-[3px] border border-dashed border-brass-deep/60 bg-brass-soft/60 px-3.5 py-3 text-[13px] leading-relaxed text-ink-2 ${className}`}>
      <span className="practice-tag h-fit">Practice</span>
      <p className="min-w-0">
        {children ?? "Arter's contracts are not deployed yet. This runs as a simulation in your browser over live prices; no funds move."}
      </p>
    </div>
  );
}

/** Current time, refreshed every `ms`; null until mounted so SSR stays stable. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
