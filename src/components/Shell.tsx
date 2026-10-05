import { MobileDock } from "@/components/MobileDock";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** Header, page, footer and the phone bottom bar. */
export function Shell({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className="min-w-0">{children}</main>
      {footer ? <SiteFooter /> : <div className="h-20 md:hidden" />}
      <MobileDock />
    </>
  );
}
