/*
 * The Arter mark, from the owner's artwork: the brass A on its dark plate
 * (scripts/brand/arter-*-master.webp, rendered by `npm run brand`).
 */
export function Mark({ size = 32, className = "", round = false }: { size?: number; className?: string; round?: boolean }) {
  return (
    // Small fixed-size image: a plain <img> renders reliably where next/image can come up blank.
    <img
      src="/brand/arter-badge.webp"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 ${round ? "rounded-full" : "rounded-[19%]"} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "paper" }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark size={30} />
      <span className={`flex items-baseline gap-1.5 ${tone === "paper" ? "text-paper" : "text-ink"}`}>
        <span className="serif text-[24px] leading-none font-medium">Arter</span>
        <span className="hidden font-mono text-[9.5px] tracking-[0.18em] uppercase opacity-60 sm:inline">Finance</span>
      </span>
    </span>
  );
}
