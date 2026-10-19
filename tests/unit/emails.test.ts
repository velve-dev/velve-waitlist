import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildConfirmMail,
  buildUpdateTemplate,
  buildWelcomeMail,
  siteLinks,
} from "../../emails/mails";

const links = siteLinks("https://velve.dev");

describe("mails", () => {
  it("renders the confirmation without an unsubscribe link", () => {
    const mail = buildConfirmMail("Alex", "https://velve.dev/confirm/abc", links);
    expect(mail.subject).toBe("Confirm your spot on the Velve waitlist");
    expect(mail.html).toContain('href="https://velve.dev/confirm/abc"');
    expect(mail.html).toContain("Confirm my email");
    expect(mail.html).not.toContain("Unsubscribe");
    expect(mail.text).toContain("Hey Alex,");
    expect(mail.text).toContain("Confirm my email: https://velve.dev/confirm/abc");
  });

  it("escapes the greeting", () => {
    const mail = buildConfirmMail("<b>x</b>", "https://velve.dev/confirm/abc", links);
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("renders the welcome with our own unsubscribe link", () => {
    const mail = buildWelcomeMail(
      "there",
      "https://velve.dev/unsubscribe/xyz",
      "https://velve.dev/questions/abc",
      links,
    );
    expect(mail.subject).toBe("You're on the Velve waitlist");
    expect(mail.html).toContain('href="https://velve.dev/unsubscribe/xyz"');
    expect(mail.text).toContain("Hey there,");
    expect(mail.text).toContain("Stay tuned and see you soon,");
    expect(mail.html).toContain('href="https://velve.dev/questions/abc"');
    expect(mail.text).toContain("Cast my vote: https://velve.dev/questions/abc");
    expect(mail.text.indexOf("you get a vote")).toBeLessThan(mail.text.indexOf("Stay tuned"));
  });

  it("keeps Brevo placeholders in the update template", () => {
    const mail = buildUpdateTemplate(links);
    expect(mail.html).toContain("Hey {{ contact.GREETING }},");
    expect(mail.html).toContain('href="{{ unsubscribe }}"');
    expect(mail.html).toContain("update {n} · {month year}");
    expect(mail.html).toContain("Questions? Hit reply, a human reads it.");
  });
});

describe("emails:check", () => {
  it("fails when the committed update template drifts", () => {
    const root = mkdtempSync(path.join(tmpdir(), "velve-mails-"));
    try {
      mkdirSync(path.join(root, "emails"));
      writeFileSync(path.join(root, "emails/update.html"), "<p>stale</p>");
      execFileSync("git", ["init", "-q"], { cwd: root });
      const result = spawnSync(
        process.execPath,
        [path.resolve(import.meta.dirname, "../../scripts/emails-check.ts")],
        { env: { ...process.env, CHECK_ROOT: root }, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("out of date");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
