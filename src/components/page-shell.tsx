import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base text-primary">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
