// Builds the confirmation, welcome and update emails.
import { confirmMail } from "./content.ts";
import { renderMail, type MailLinks, type RenderedMail } from "./layout.ts";

type SiteLinks = Omit<MailLinks, "unsubscribe">;

export function siteLinks(siteUrl: string): SiteLinks {
  return {
    site: siteUrl,
    threads: "https://www.threads.com/@velvedev",
    github: "https://github.com/velve-dev",
    privacy: `${siteUrl}/privacy`,
    logo: `${siteUrl}/email/logo-mark.png`,
  };
}

export function buildConfirmMail(
  greeting: string,
  confirmUrl: string,
  links: SiteLinks,
): RenderedMail {
  return renderMail({
    subject: confirmMail.subject,
    preview: confirmMail.preview,
    title: confirmMail.title,
    greeting,
    blocks: [
      { kind: "paragraph", text: confirmMail.body },
      { kind: "button", label: confirmMail.button, href: confirmUrl },
      { kind: "note", text: confirmMail.note },
    ],
    signoff: confirmMail.signoff,
    links: { ...links, unsubscribe: null },
  });
}
