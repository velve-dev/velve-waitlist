// Refuses committed secrets, env files and filled env examples.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");

const secretPatterns: [string, RegExp][] = [
  ["Brevo API key", /xkeysib-[0-9a-f]{20,}/i],
  ["Brevo SMTP key", /xsmtpsib-[0-9a-f]{20,}/i],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ["JSON web token", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./],
  [
    "hard-coded secret",
    /(?:secret|token|password|passwd|api_?key)[A-Za-z0-9_]*["']?\s*[:=]\s*["'`](?!test-)[A-Za-z0-9+/_.=-]{20,}["'`]/i,
  ],
  ["webhook URL with credentials", /https?:\/\/[^\s/:@]+:[^\s/@]+@/],
];

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => existsSync(path.join(root, file)));

const problems: string[] = [];

for (const file of trackedFiles) {
  const name = path.basename(file);
  if (name.startsWith(".env") && name !== ".env.example") {
    problems.push(`${file}: env files must never be committed`);
    continue;
  }
  if (/\.(woff2|png|ico|jpg|svg)$/.test(file)) continue;
  const text = readFileSync(path.join(root, file), "utf8");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text) && file !== "scripts/secrets-lint.ts")
      problems.push(`${file}: looks like a ${label}`);
  }
  if (name === ".env.example") {
    for (const line of text.split("\n")) {
      if (/^\s*[A-Z0-9_]+\s*=\s*\S/.test(line))
        problems.push(`${file}: example holds a value: ${line.split("=")[0]}`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("secrets:lint passed");
