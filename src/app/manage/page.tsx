import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { ManageDesk } from "@/components/app/ManageDesk";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Your positions",
  description: "Your real Robinhood Chain balances of tokenized assets, what each could earn or borrow, and your practice positions on Arter.",
};

export default function Page() {
  return (
    <Shell>
      <PageHead kicker={<span className="live-tag">Real balances</span>} title={<>Your <em className="text-brass-deep">positions.</em></>} lead="Your live Morpho positions and real wallet balances, next to the practice book you keep on this site. Practice positions live in this browser, keyed to your wallet." />
      <ManageDesk />
    </Shell>
  );
}
