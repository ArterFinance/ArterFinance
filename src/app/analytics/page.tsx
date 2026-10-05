import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { AnalyticsBoard } from "@/components/app/AnalyticsBoard";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Live Chainlink prices for every verified tokenized asset on Robinhood Chain and the USDG lending markets already running there.",
};

export default function Page() {
  return (
    <Shell>
      <PageHead kicker={<span className="live-tag">Live market reference</span>} title={<>Read the market <em className="text-brass-deep">as it is.</em></>} lead="Oracle prices, chain activity and the lending markets other people run on Robinhood Chain. Arter&apos;s own column stays empty until its vaults exist." />
      <AnalyticsBoard />
    </Shell>
  );
}
