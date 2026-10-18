// Renders every mail and enforces the privacy and unsubscribe rules.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildConfirmMail,
  buildUpdateTemplate,
  buildWelcomeMail,
  siteLinks,
} from "../emails/mails.ts";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");
const siteUrl = "https://velve.dev";
const links = siteLinks(siteUrl);
const updateTemplatePath = path.join(root, "emails/update.html");
const writeTemplate = process.argv.includes("--write");

const mails = [
  {
    name: "confirm",
    needsUnsubscribe: false,
    mail: buildConfirmMail("Alex", `${siteUrl}/confirm/sample`, links),
  },
  {
    name: "welcome",
    needsUnsubscribe: true,
    mail: buildWelcomeMail("Alex", `${siteUrl}/unsubscribe/sample`, links),
  },
  { name: "update", needsUnsubscribe: true, mail: buildUpdateTemplate(links) },
];

const allowedLinkHosts = new Set(["velve.dev", "www.threads.com", "github.com"]);
const problems: string[] = [];

for (const { name, needsUnsubscribe, mail } of mails) {
  const fail = (message: string) => problems.push(`${name}: ${message}`);
  if (!mail.html.startsWith("<!doctype html>")) fail("HTML does not render a document");
  if (mail.text.trim() === "") fail("text version is empty");
  if (/<(script|link|iframe|object|embed|form)\b/i.test(mail.html))
    fail("loads or embeds external content");
  if (/url\(|@import|@font-face/i.test(mail.html)) fail("CSS pulls a remote resource");
  if (/utm_|[?&](mc_|_hs|fbclid|gclid)/i.test(mail.html)) fail("carries tracking parameters");

  for (const [, source] of mail.html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)) {
    if (!source?.startsWith(`${siteUrl}/`)) fail(`image from a foreign server: ${source}`);
  }
  if (/<img\b[^>]*\b(width|height)="1"/i.test(mail.html)) fail("contains a pixel image");

  for (const [, href] of mail.html.matchAll(/\bhref="([^"]+)"/gi)) {
    if (href === undefined || href.startsWith("{{")) continue;
    const host = new URL(href).hostname;
    if (!allowedLinkHosts.has(host)) fail(`links to an unexpected host: ${host}`);
  }

  const hasUnsubscribe = />Unsubscribe</.test(mail.html) && /Unsubscribe: /.test(mail.text);
  if (needsUnsubscribe && !hasUnsubscribe) fail("has no unsubscribe link");
  if (!needsUnsubscribe && hasUnsubscribe) fail("offers unsubscribe before anyone is subscribed");
  if (!/>Privacy</.test(mail.html)) fail("has no privacy link");
}

const updateHtml = mails.find((entry) => entry.name === "update")?.mail.html ?? "";
if (writeTemplate) {
  writeFileSync(updateTemplatePath, updateHtml);
} else if (
  !existsSync(updateTemplatePath) ||
  readFileSync(updateTemplatePath, "utf8") !== updateHtml
) {
  problems.push("emails/update.html is out of date, run pnpm emails:build");
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(writeTemplate ? "emails/update.html written" : "emails:check passed");
