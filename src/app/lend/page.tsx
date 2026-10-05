import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { LendDesk } from "@/components/morpho/LendDesk";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Lend USDG",
  description: "Lend USDG on Morpho Blue markets on Robinhood Chain from your own wallet. Live rates, live liquidity, no Arter fee.",
};

export default function Page() {
  return (
    <Shell>
      <PageHead
        kicker={<span className="live-tag">Live · real transactions</span>}
        title={
          <>
            Lend USDG, <em className="text-brass-deep">earn today.</em>
          </>
        }
        lead="Supply USDG to a Morpho Blue market on Robinhood Chain and earn what borrowers pay. Your position stays in your name on Morpho; withdraw whenever the market has USDG free."
      />
      <LendDesk />
    </Shell>
  );
}
