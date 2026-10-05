import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { NOTES, noteBySlug, noteDate } from "@/data/notes";

export function generateStaticParams() {
  return NOTES.map((n) => ({ slug: n.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = noteBySlug(slug);
  return note ? { title: note.title, description: note.summary } : {};
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = noteBySlug(slug);
  if (!note) notFound();
  const others = NOTES.filter((n) => n.slug !== note.slug).slice(0, 3);
  return (
    <Shell>
      <article className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-14">
        <nav className="flex items-center gap-1.5 text-[13px] text-ink-3" aria-label="Breadcrumb">
          <Link href="/notes" className="hover:text-ink">
            Notes
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="truncate text-ink">{noteDate(note.date)}</span>
        </nav>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px] lg:gap-16">
          <div className="min-w-0 max-w-[720px]">
            <h1 className="serif text-[40px] leading-[1.04] sm:text-[56px]">{note.title}</h1>
            <p className="mt-5 font-mono text-[12px] text-ink-3">
              {noteDate(note.date)} · {note.minutes} min read · Arter team
            </p>
            <p className="mt-8 text-[19px] leading-relaxed text-ink">{note.summary}</p>
            <div className="prose-note mt-4">
              {note.body.map((b, i) => (
                <section key={i}>
                  {b.heading ? <h2>{b.heading}</h2> : null}
                  {b.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                  {b.list ? (
                    <ul>
                      {b.list.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
          <aside className="min-w-0 lg:border-l lg:border-line-2 lg:pl-8">
            <p className="label">More notes</p>
            <ul className="mt-3 divide-y divide-line">
              {others.map((n) => (
                <li key={n.slug} className="py-3">
                  <Link href={`/notes/${n.slug}`} className="block text-[15px] leading-snug hover:text-moss">
                    {n.title}
                  </Link>
                  <span className="font-mono text-[11px] text-ink-3">{noteDate(n.date)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </article>
    </Shell>
  );
}
