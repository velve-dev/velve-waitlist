// Renders the dark email frame as table HTML and text.
import { mailFrame } from "./content.ts";

export type MailLinks = {
  site: string;
  threads: string;
  github: string;
  privacy: string;
  logo: string;
  unsubscribe: string | null;
};

type MailBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "section"; label: string; text: string }
  | { kind: "button"; label: string; href: string }
  | { kind: "note"; text: string };

export type MailContent = {
  eyebrow?: string;
  subject: string;
  preview: string;
  title: string;
  greeting: string;
  blocks: MailBlock[];
  signoff: string;
  links: MailLinks;
};

export type RenderedMail = { subject: string; html: string; text: string };

const colors = {
  page: "#050509",
  primary: "#F1F0F4",
  muted: "#8B8797",
  faint: "#67637A",
  line: "#1A1922",
  separator: "#26242F",
  accent: "#7B5CFF",
  onAccent: "#FFFFFF",
};

const sans = "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const mono = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function row(content: string, paddingTop: number): string {
  return `<tr><td style="padding:${paddingTop}px 0 0 0;">${content}</td></tr>`;
}

function blockHtml(block: MailBlock): { html: string; gap: number } {
  switch (block.kind) {
    case "paragraph":
      return {
        gap: 24,
        html: `<p style="margin:0;font-family:${sans};font-size:16px;line-height:1.6;font-weight:400;color:${colors.muted};">${escapeHtml(block.text)}</p>`,
      };
    case "section":
      return {
        gap: 32,
        html: `<p style="margin:0 0 8px 0;font-family:${mono};font-size:12px;line-height:1.5;font-weight:500;letter-spacing:-0.01em;color:${colors.primary};">${escapeHtml(block.label)}</p><p style="margin:0;font-family:${sans};font-size:16px;line-height:1.6;font-weight:400;color:${colors.muted};">${escapeHtml(block.text)}</p>`,
      };
    case "button":
      return {
        gap: 24,
        html: `<table role="presentation" class="button" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${colors.accent}" style="border-radius:12px;background:${colors.accent};"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:0 28px;font-family:${sans};font-size:14px;line-height:48px;font-weight:600;color:${colors.onAccent};text-decoration:none;border-radius:12px;">${escapeHtml(block.label)}</a></td></tr></table>`,
      };
    case "note":
      return {
        gap: 24,
        html: `<p style="margin:0;font-family:${sans};font-size:13px;line-height:1.5;font-weight:400;color:${colors.faint};">${escapeHtml(block.text)}</p>`,
      };
  }
}

function blockText(block: MailBlock): string {
  switch (block.kind) {
    case "paragraph":
    case "note":
      return block.text;
    case "section":
      return `${block.label}\n${block.text}`;
    case "button":
      return `${block.label}: ${block.href}`;
  }
}

function footerLink(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${colors.primary};text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function renderMail(mail: MailContent): RenderedMail {
  const greeting = mailFrame.greeting.replace("{greeting}", mail.greeting);
  const separator = `<span style="color:${colors.separator};">&nbsp;&nbsp;/&nbsp;&nbsp;</span>`;
  const legalLinks = [
    ...(mail.links.unsubscribe === null
      ? []
      : [
          `<a href="${escapeHtml(mail.links.unsubscribe)}" style="color:${colors.muted};">${mailFrame.unsubscribe}</a>`,
        ]),
    `<a href="${escapeHtml(mail.links.privacy)}" style="color:${colors.muted};">${mailFrame.privacy}</a>`,
  ].join(" · ");

  const bodyRows = mail.blocks
    .map((block, index) => {
      const { html, gap } = blockHtml(block);
      return row(html, index === 0 ? 24 : gap);
    })
    .join("");

  const eyebrowRow =
    mail.eyebrow === undefined
      ? ""
      : row(
          `<p style="margin:0;font-family:${mono};font-size:12px;line-height:1.5;font-weight:500;letter-spacing:-0.01em;color:${colors.muted};">${escapeHtml(mail.eyebrow)}</p>`,
          40,
        );

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(mail.subject)}</title>
<style>
:root { color-scheme: dark; }
@media (max-width: 560px) {
  .outer { padding: 48px 24px !important; }
  .button { width: 100% !important; }
  .button a { display: block !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${colors.page};" bgcolor="${colors.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(mail.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.page}" style="background:${colors.page};">
<tr><td align="center" class="outer" style="padding:64px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td style="padding:0;"><img src="${escapeHtml(mail.links.logo)}" width="24" height="24" alt="Velve" style="display:block;border:0;"></td></tr>
${eyebrowRow}
<tr><td style="padding:${mail.eyebrow === undefined ? 40 : 24}px 0 0 0;"><h1 style="margin:0;font-family:${sans};font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${colors.primary};">${escapeHtml(mail.title)}</h1></td></tr>
${row(`<p style="margin:0;font-family:${sans};font-size:16px;line-height:1.6;font-weight:500;color:${colors.primary};">${escapeHtml(greeting)}</p>`, 24)}
${bodyRows}
${row(`<p style="margin:0;font-family:${sans};font-size:16px;line-height:1.6;font-weight:400;color:${colors.muted};">${escapeHtml(mail.signoff)}<br><span style="font-weight:600;color:${colors.primary};">${mailFrame.team}</span></p>`, 32)}
<tr><td style="padding:40px 0 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 0 0 0;border-top:1px solid ${colors.line};">
<p style="margin:0;font-family:${sans};font-size:14px;line-height:1.5;font-weight:500;">${footerLink(mailFrame.threads, mail.links.threads)}${separator}${footerLink(mailFrame.github, mail.links.github)}${separator}${footerLink(mailFrame.site, mail.links.site)}</p>
<p style="margin:12px 0 0 0;font-family:${sans};font-size:12px;line-height:1.6;font-weight:400;color:${colors.faint};">${escapeHtml(mailFrame.address)}<br>${legalLinks}</p>
</td></tr></table></td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

  const text = [
    ...(mail.eyebrow === undefined ? [] : [mail.eyebrow]),
    mail.title,
    greeting,
    ...mail.blocks.map(blockText),
    `${mail.signoff}\n${mailFrame.team}`,
    `Threads: ${mail.links.threads}\nGitHub: ${mail.links.github}\nvelve.dev: ${mail.links.site}`,
    [
      mailFrame.address,
      ...(mail.links.unsubscribe === null
        ? []
        : [`${mailFrame.unsubscribe}: ${mail.links.unsubscribe}`]),
      `${mailFrame.privacy}: ${mail.links.privacy}`,
    ].join("\n"),
  ].join("\n\n");

  return { subject: mail.subject, html, text: `${text}\n` };
}
