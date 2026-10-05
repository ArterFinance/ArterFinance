import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { VaultsBoard } from "@/components/app/VaultsBoard";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Vaults",
  description: "Yield vaults for tokenized gold, treasuries, USDG and stock tokens on Robinhood Chain. Target 3-7% APY, compounding daily, no lock-ups.",
};

export default function VaultsPage() {
  return (
    <Shell>
      <PageHead
        kicker={<span className="practice-tag">Practice mode</span>}
        title="Vaults"
        lead="One vault per asset. Yield arrives as more of the asset you put in, added to your balance every day, and you can leave whenever you want."
      />
      <VaultsBoard />
    </Shell>
  );
}
