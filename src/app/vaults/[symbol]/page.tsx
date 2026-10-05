import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { VaultDetail } from "@/components/app/VaultDetail";
import { VAULTS, vaultBySymbol } from "@/config/assets";

export function generateStaticParams() {
  return VAULTS.map((v) => ({ symbol: v.symbol.toLowerCase() }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const vault = vaultBySymbol(symbol);
  if (!vault) return {};
  return {
    title: `${vault.symbol} vault`,
    description: `${vault.headline} Target ${vault.target[0]}-${vault.target[1]}% APY on ${vault.symbol}, compounding daily, no lock-up.`,
  };
}

export default async function VaultPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const vault = vaultBySymbol(symbol);
  if (!vault) notFound();
  return (
    <Shell>
      <VaultDetail vault={vault} />
    </Shell>
  );
}
