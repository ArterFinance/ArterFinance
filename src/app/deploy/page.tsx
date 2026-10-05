import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { DeployDesk } from "@/components/app/DeployDesk";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Deploy liquidity",
  description: "Deploy idle tokenized assets across lending, AMM ranges and a withdrawal buffer, inside hard caps, settled on Robinhood Chain.",
};

export default function Page() {
  return (
    <Shell>
      <PageHead kicker={<span className="practice-tag">Practice mode</span>} title={<>Deploy what <em className="text-brass-deep">sits idle.</em></>} lead="Split a balance across the strategies a vault would use, see the blended estimate, and check it against the caps an on-chain allocator would enforce." />
      <DeployDesk />
    </Shell>
  );
}
