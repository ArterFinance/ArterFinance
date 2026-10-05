import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";
import { Shell } from "@/components/Shell";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Notes",
  description: "Notes from the Arter Finance team on tokenized assets, yield, lending markets and the contracts still to ship.",
};

export default function NotesPage() {
  return (
    <Shell>
      <PageHead title="Notes" lead="What we are building, what is live, and what is not yet. Written by the team, dated, and corrected in place when something changes." />
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 lg:py-14">
        <NoteList />
      </div>
    </Shell>
  );
}
