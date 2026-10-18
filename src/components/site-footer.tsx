import Link from "next/link";
import { contactEmail, footer, links } from "@/content/copy";
import { ExternalArrow } from "./external-arrow";
import { LogoMark } from "./logo-mark";

const columnHeading = "text-12 font-medium tracking-[0.04em] text-muted uppercase";
const footerLink =
  "text-14 font-medium text-primary no-underline transition-colors duration-120 ease-velve hover:text-link";

export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-line bg-base text-primary">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-6 gap-y-10 px-4 pt-12 pb-8 desk:grid-cols-[minmax(0,4fr)_repeat(2,minmax(0,1fr))] desk:px-6 desk:pt-[72px] desk:pb-10">
        <div className="col-span-2 flex flex-col items-start gap-4 desk:col-span-1">
          <Link
            href="/"
            aria-label={footer.homeLabel}
            className="inline-flex items-center gap-2 text-primary no-underline"
          >
            <LogoMark size={20} />
            <span className="text-16 font-semibold tracking-[-0.01em]">{footer.brand}</span>
          </Link>
          <p className="m-0 max-w-[300px] text-14 leading-normal text-muted">{footer.tagline}</p>
          <a
            href={`mailto:${contactEmail}`}
            className="font-mono text-13 font-medium tracking-[-0.01em] text-primary no-underline transition-colors duration-120 ease-velve hover:text-link"
          >
            {contactEmail}
          </a>
        </div>

        <nav aria-label={footer.followLabel} className="flex flex-col items-start gap-3">
          <span className={columnHeading}>{footer.followHeading}</span>
          <a href={links.threads} className={`${footerLink} inline-flex items-center gap-1`}>
            {footer.threads}
            <ExternalArrow size={14} />
          </a>
          <a href={links.github} className={`${footerLink} inline-flex items-center gap-1`}>
            {footer.github}
            <ExternalArrow size={14} />
          </a>
        </nav>

        <nav aria-label={footer.legalHeading} className="flex flex-col items-start gap-3">
          <span className={columnHeading}>{footer.legalHeading}</span>
          <Link href="/imprint" className={footerLink}>
            {footer.imprint}
          </Link>
          <Link href="/privacy" className={footerLink}>
            {footer.privacy}
          </Link>
        </nav>

        <div className="col-span-full flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line pt-6 font-mono text-12 leading-normal font-medium tracking-[-0.01em] text-muted">
          <span>{footer.cookies}</span>
          <a
            href={links.levoStudio}
            className="inline-flex items-center gap-1 text-muted no-underline transition-colors duration-120 ease-velve hover:text-link"
          >
            {footer.copyright}
            <ExternalArrow size={12} />
          </a>
        </div>
      </div>

      <div aria-hidden="true" className="mx-auto max-w-[1180px] px-4 desk:px-6">
        <svg viewBox="0 0 1000 290" className="-mb-px block h-auto w-full">
          <text
            x="500"
            y="340"
            textAnchor="middle"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            className="font-sans"
            fontSize="440"
            fontWeight="600"
            fill="#0D0D13"
            stroke="#26242F"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          >
            {footer.wordmark}
          </text>
        </svg>
      </div>
    </footer>
  );
}
