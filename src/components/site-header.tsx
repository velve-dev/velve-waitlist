import Link from "next/link";
import { footer } from "@/content/copy";
import { LogoMark } from "./logo-mark";

export function SiteHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-center">
      <Link href="/" aria-label={footer.homeLabel} className="inline-flex rounded-sm text-primary">
        <LogoMark size={24} />
      </Link>
    </header>
  );
}
