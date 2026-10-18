import type { ReactNode } from "react";
import { PageShell } from "./page-shell";

export function LegalArticle({
  title,
  subline,
  updated,
  children,
}: {
  title: string;
  subline: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <main className="flex flex-1 justify-center px-4 pt-12 pb-[88px] desk:px-6 desk:pt-24 desk:pb-36">
        <article className="flex w-full max-w-[600px] flex-col gap-10">
          <header className="flex flex-col items-center gap-3 text-center">
            <h1 className="m-0 text-40 leading-[1.1] font-semibold tracking-[-0.025em]">{title}</h1>
            <p className="m-0 text-16 leading-normal text-muted">{subline}</p>
            {updated !== undefined && (
              <span className="font-mono text-12 font-medium tracking-[-0.01em] text-muted">
                {updated}
              </span>
            )}
          </header>
          {children}
        </article>
      </main>
    </PageShell>
  );
}

const linkedTerms: Record<string, string> = {
  "hello@velve.dev": "mailto:hello@velve.dev",
  "levo-studio.com": "https://levo-studio.com",
  "+49 176 61028522": "tel:+4917661028522",
};

export function LinkedText({ text, linkClass }: { text: string; linkClass: string }) {
  const pattern = new RegExp(
    `(${Object.keys(linkedTerms)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
  );
  return text.split(pattern).map((part, index) => {
    const href = linkedTerms[part];
    return href === undefined ? (
      part
    ) : (
      <a key={index} href={href} className={linkClass}>
        {part}
      </a>
    );
  });
}
