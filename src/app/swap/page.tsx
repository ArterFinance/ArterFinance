import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { SwapScreen } from "@/components/swap/SwapScreen";
import { BRAND, CHAIN } from "@/config/brand";

export const metadata: Metadata = {
  title: `Buy ${BRAND.symbol}`,
  description: `Buy and sell ${BRAND.symbol} on ${CHAIN.name} with ETH, straight from its Pons launch.`,
};

export default function SwapPage() {
  return (
    <Shell>
      <SwapScreen />
    </Shell>
  );
}
