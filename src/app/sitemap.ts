import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";
import { VAULTS } from "@/config/assets";
import { NOTES } from "@/data/notes";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/vaults",
    ...VAULTS.map((v) => `/vaults/${v.symbol.toLowerCase()}`),
    "/borrow",
    "/deploy",
    "/manage",
    "/analytics",
    "/institutions",
    "/platforms",
    "/notes",
    ...NOTES.map((n) => `/notes/${n.slug}`),
    "/swap",
    "/chat",
  ];
  return paths.map((path) => ({ url: `${BRAND.url}${path}`, lastModified: new Date("2026-10-04") }));
}
