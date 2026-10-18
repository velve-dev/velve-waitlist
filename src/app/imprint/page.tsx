import type { Metadata } from "next";
import { Fragment } from "react";
import { LegalArticle, LinkedText } from "@/components/legal-article";
import { imprint } from "@/content/legal";

export const metadata: Metadata = { title: `${imprint.title} · Velve` };

export default function ImprintPage() {
  return (
    <LegalArticle title={imprint.title} subline={imprint.subline}>
      {imprint.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="m-0 text-12 font-medium tracking-[0.04em] text-muted uppercase">
            {section.heading}
          </h2>
          <p
            className={`m-0 text-16 leading-[1.65] ${section.tone === "muted" ? "text-muted" : "text-primary"}`}
          >
            {section.lines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 && <br />}
                <LinkedText
                  text={line}
                  linkClass="text-primary underline transition-colors duration-120 ease-velve hover:text-link"
                />
              </Fragment>
            ))}
          </p>
        </section>
      ))}
    </LegalArticle>
  );
}
