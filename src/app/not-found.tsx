import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <section className="ruled mx-auto flex min-h-[60vh] max-w-[1240px] flex-col items-start justify-center px-4 py-20 sm:px-6">
        <p className="figure text-[13px] text-ink-3">404 · no such entry</p>
        <h1 className="serif mt-4 text-[52px] leading-none sm:text-[72px]">This line of the ledger is blank.</h1>
        <p className="mt-4 max-w-md text-ink-2">The page you asked for does not exist, or it moved.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn btn-ink h-11 px-5">Home</Link>
          <Link href="/vaults" className="btn btn-flat h-11 px-5">Vaults</Link>
        </div>
      </section>
    </Shell>
  );
}
