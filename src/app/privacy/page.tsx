import type { Metadata } from "next";
import { LegalArticle, LinkedText } from "@/components/legal-article";
import { privacy } from "@/content/legal";

export const metadata: Metadata = { title: `${privacy.title} · Velve` };

export default function PrivacyPage() {
  return (
    <LegalArticle title={privacy.title} subline={privacy.subline} updated={privacy.updated}>
      {privacy.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="m-0 text-20 leading-[1.35] font-semibold tracking-[-0.01em]">
            {section.heading}
          </h2>
          <p className="m-0 text-16 leading-[1.65] text-muted">
            <LinkedText text={section.text} linkClass="text-link underline" />
          </p>
        </section>
      ))}
    </LegalArticle>
  );
}
