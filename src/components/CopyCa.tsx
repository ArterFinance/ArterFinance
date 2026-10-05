"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { BRAND, CHAIN, TOKEN, shortAddress } from "@/config/brand";

export function useCopyCa() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Until the contract is published there is nothing worth copying.
  const live = TOKEN.isLive;
  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(BRAND.ca);
    } catch {
      // Older browsers and some embedded views refuse the async clipboard.
      const area = document.createElement("textarea");
      area.value = BRAND.ca;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return { copied, copy, live };
}

/** Navbar copy button: "CA" plus the short address. Compact on phones. */
export function CopyCaTag({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { copied, copy, live } = useCopyCa();
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!live}
      title={live ? `Copy ${BRAND.ca}` : `The ${BRAND.symbol} contract address is published at launch`}
      aria-label={live ? "Copy contract address" : "Contract address not published yet"}
      data-testid="ca-tag"
      className={`group flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[3px] border border-line-2 bg-card px-2.5 font-mono text-[11.5px] text-ink transition-colors enabled:hover:border-ink disabled:cursor-default ${className}`}
    >
      <span className="rounded-[2px] bg-ink px-1 text-[9px] leading-4 font-semibold tracking-[0.1em] text-paper">CA</span>
      <span className={compact ? "hidden sm:inline" : ""}>
        {!live ? "At launch" : copied ? "Copied" : shortAddress(BRAND.ca, 5, 4)}
      </span>
      {!live ? null : copied ? <Check className="size-3.5 text-moss" strokeWidth={2.5} /> : <Copy className="size-3.5 text-ink-3" />}
    </button>
  );
}

/** Full contract block: chain, the whole address and a large copy button. */
export function CopyCaBlock({ className = "", tone = "paper" }: { className?: string; tone?: "paper" | "deep" }) {
  const { copied, copy, live } = useCopyCa();
  const deep = tone === "deep";
  return (
    <div className={`rounded-[4px] border p-4 ${deep ? "border-paper/20 bg-deep-2 text-paper" : "border-line-2 bg-card text-ink"} ${className}`}>
      <p className={`font-mono text-[10.5px] tracking-[0.1em] uppercase ${deep ? "text-paper/55" : "text-ink-3"}`}>
        {BRAND.symbol} contract · {CHAIN.name}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className={`min-w-0 flex-1 font-mono text-[13px] leading-snug ${live ? "break-all" : "break-words"}`} data-testid="ca-full">
          {live ? BRAND.ca : "Published at launch. Trust only the address shown on this site."}
        </code>
        <button type="button" onClick={copy} disabled={!live} className="btn btn-brass h-9 px-3.5 text-sm" data-testid="ca-copy">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {!live ? "Not live yet" : copied ? "Copied" : "Copy CA"}
        </button>
      </div>
    </div>
  );
}
