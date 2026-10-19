// Builds the confirmation, welcome and update emails.
import { confirmMail, updateMail, welcomeMail } from "./content.ts";
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

export function buildWelcomeMail(
  greeting: string,
  unsubscribeUrl: string,
  questionsUrl: string,
  links: SiteLinks,
): RenderedMail {
  return renderMail({
    subject: welcomeMail.subject,
    preview: welcomeMail.body,
    title: welcomeMail.title,
    greeting,
    blocks: [
      { kind: "paragraph", text: welcomeMail.body },
      { kind: "paragraph", text: welcomeMail.vote },
      { kind: "button", label: welcomeMail.voteButton, href: questionsUrl },
    ],
    signoff: welcomeMail.signoff,
    links: { ...links, unsubscribe: unsubscribeUrl },
  });
}

const brevoPlaceholders = {
  greeting: "{{ contact.GREETING }}",
  unsubscribe: "{{ unsubscribe }}",
} as const;

export function buildUpdateTemplate(links: SiteLinks): RenderedMail {
  const [shipped, broke, next] = updateMail.sections;
  return renderMail({
    eyebrow: updateMail.eyebrow,
    subject: updateMail.subject,
    preview: updateMail.intro,
    title: updateMail.title,
    greeting: brevoPlaceholders.greeting,
    blocks: [
      { kind: "paragraph", text: updateMail.intro },
      { kind: "section", label: shipped, text: updateMail.shippedPlaceholder },
      { kind: "section", label: broke, text: updateMail.brokePlaceholder },
      { kind: "section", label: next, text: `${updateMail.nextPlaceholder} ${updateMail.closing}` },
    ],
    signoff: updateMail.signoff,
    links: { ...links, unsubscribe: brevoPlaceholders.unsubscribe },
  });
}
