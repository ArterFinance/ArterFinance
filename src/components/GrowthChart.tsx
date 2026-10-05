/**
 * Two lines over time: the balance held as-is and the same balance compounding.
 * Pure SVG, scales to its container width.
 */
export function GrowthChart({
  principal,
  apy,
  days,
  unit,
  tone = "light",
}: {
  principal: number;
  apy: number;
  days: number;
  unit: string;
  tone?: "light" | "dark";
}) {
  const W = 600;
  const H = 220;
  const pad = { l: 8, r: 8, t: 18, b: 26 };
  const steps = 48;
  const end = principal * Math.pow(1 + apy / 100, days / 365);
  const top = end * 1.002;
  const bottom = principal * 0.995;
  const x = (i: number) => pad.l + (i / steps) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - bottom) / (top - bottom || 1)) * (H - pad.t - pad.b);
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const d = (days * i) / steps;
    return [x(i), y(principal * Math.pow(1 + apy / 100, d / 365))] as const;
  });
  const path = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = `${path} L${x(steps).toFixed(1)} ${y(principal).toFixed(1)} L${x(0).toFixed(1)} ${y(principal).toFixed(1)} Z`;
  const dark = tone === "dark";
  const axis = dark ? "rgba(242,238,228,0.35)" : "rgba(22,32,27,0.3)";
  const text = dark ? "rgba(242,238,228,0.6)" : "#6f7a73";
  const years = days / 365;
  const ticks = years >= 2 ? Array.from({ length: Math.round(years) + 1 }, (_, i) => i) : [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Growth of ${principal} ${unit} at ${apy}% APY over ${days} days`}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke={axis} strokeOpacity="0.35" />
      ))}
      <path d={area} fill={dark ? "rgba(192,138,46,0.16)" : "rgba(29,90,67,0.08)"} />
      <line x1={x(0)} x2={x(steps)} y1={y(principal)} y2={y(principal)} stroke={axis} strokeDasharray="4 5" />
      <path d={path} fill="none" stroke={dark ? "#d9a54a" : "#1d5a43"} strokeWidth="2.5" />
      <circle cx={x(steps)} cy={y(end)} r="4.5" fill={dark ? "#d9a54a" : "#1d5a43"} />
      {ticks.map((t) => (
        <text key={t} x={pad.l + (t / years) * (W - pad.l - pad.r)} y={H - 6} fontSize="11" fill={text} fontFamily="var(--font-mono)" textAnchor={t === 0 ? "start" : t >= years ? "end" : "middle"}>
          {years >= 2 ? `Y${t}` : t === 0 ? "Today" : `${Math.round(t * 12)}m`}
        </text>
      ))}
      <text x={W - pad.r} y={y(principal) - 7} fontSize="11" fill={text} fontFamily="var(--font-mono)" textAnchor="end">
        just holding
      </text>
    </svg>
  );
}
