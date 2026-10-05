/** Questions and answers as native disclosure rows. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-t border-ink/80">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line-2">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">{item.q}</span>
            <span className="figure mt-0.5 shrink-0 text-ink-3 transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="max-w-3xl pb-6 text-[15px] leading-relaxed text-ink-2">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
