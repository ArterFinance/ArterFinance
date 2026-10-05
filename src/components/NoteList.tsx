import Link from "next/link";
import { NOTES, noteDate } from "@/data/notes";

/** Notes as dated ledger rows. */
export function NoteList({ limit }: { limit?: number }) {
  const items = limit ? NOTES.slice(0, limit) : NOTES;
  return (
    <ul className="border-t border-ink/80">
      {items.map((n) => (
        <li key={n.slug} className="border-b border-line-2">
          <Link href={`/notes/${n.slug}`} className="group grid grid-cols-1 gap-1 py-5 sm:grid-cols-[150px_1fr_auto] sm:items-baseline sm:gap-6">
            <span className="font-mono text-[12px] text-ink-3">{noteDate(n.date)}</span>
            <span className="min-w-0">
              <span className="serif block text-[22px] leading-snug group-hover:text-moss sm:text-[24px]">{n.title}</span>
              <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{n.summary}</span>
            </span>
            <span className="font-mono text-[12px] text-ink-3">{n.minutes} min</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
