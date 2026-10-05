import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { BorrowDesk } from "@/components/app/BorrowDesk";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Borrow",
  description:
    "Borrow USDG against tokenized stocks, gold and treasuries on Robinhood Chain. Conservative LTVs, live Chainlink prices, health factor and liquidation price.",
};

export default function Page() {
  return (
    <Shell>
      <PageHead
        kicker={
          <>
            <span className="live-tag">Live on Morpho</span>
            <span className="practice-tag">Simulator</span>
          </>
        }
        title={
          <>
            Borrow against <em className="text-brass-deep">what you hold.</em>
          </>
        }
        lead="Post a tokenized asset as collateral, borrow USDG, pay interest, and keep the price appreciation. Where Morpho runs a market for it, do it for real; for everything else, the simulator uses live prices and stated limits per asset class."
      />
      <BorrowDesk />
    </Shell>
  );
}
