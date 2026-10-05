/** Arter mark: three ingots stacked into an A. The top bar is the one that earns. */
export function Mark({ size = 32, className = "", round = false }: { size?: number; className?: string; round?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      {round ? <circle cx="32" cy="32" r="32" fill="#16201b" /> : <rect width="64" height="64" rx="12" fill="#16201b" />}
      <g transform={round ? "translate(32 33) scale(0.86) translate(-32 -31)" : undefined}>
        <polygon points="11,51 53,51 48.5,40 15.5,40" fill="#c08a2e" />
        <polygon points="15.5,40 48.5,40 47.3,37.2 16.7,37.2" fill="#e3b762" />
        <polygon points="18,35 46,35 41.5,24.5 22.5,24.5" fill="#c08a2e" />
        <polygon points="22.5,24.5 41.5,24.5 40.3,21.7 23.7,21.7" fill="#e3b762" />
        <polygon points="25,19.5 39,19.5 35.2,10.5 28.8,10.5" fill="#f2eee4" />
      </g>
    </svg>
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
