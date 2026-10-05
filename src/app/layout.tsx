import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/config/brand";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { LiveDataProvider } from "@/lib/data";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"] });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jbmono = JetBrains_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-jbmono", display: "swap" });

const title = `${BRAND.name} (${BRAND.symbol}) · ${BRAND.slogan}`;

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: title, template: `%s · ${BRAND.short}` },
  description: BRAND.description,
  keywords: [BRAND.name, BRAND.symbol, "Robinhood Chain", "tokenized assets", "RWA yield", "tokenized stocks", "USDG", "GLD"],
  openGraph: {
    type: "website",
    url: BRAND.url,
    siteName: BRAND.name,
    title,
    description: BRAND.description,
    images: [{ url: "/brand/og.webp", width: 1200, height: 630, alt: `${BRAND.name}: ${BRAND.slogan}` }],
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.xHandle,
    title,
    description: BRAND.description,
    images: ["/brand/og.webp"],
  },
};

export const viewport: Viewport = { themeColor: "#f2eee4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${hanken.variable} ${jbmono.variable}`}>
      <body className="min-h-dvh overflow-x-hidden font-sans antialiased">
        <LiveDataProvider>
          <WalletProvider>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </LiveDataProvider>
      </body>
    </html>
  );
}
