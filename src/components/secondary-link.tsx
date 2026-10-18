import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalArrow } from "./external-arrow";

const secondaryButton =
  "inline-flex h-12 items-center justify-center gap-1.5 rounded border border-line-strong bg-card px-4 text-14 font-medium text-primary no-underline transition-colors duration-120 ease-velve hover:bg-hover desk:h-10";

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={secondaryButton}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={secondaryButton}>
      {children}
      <ExternalArrow size={14} />
    </a>
  );
}
