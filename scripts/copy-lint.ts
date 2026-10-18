// Fails on forbidden phrases or drifted approved copy.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");

const forbiddenPhrases = [
  "seamless",
  "powerful",
  "revolutionary",
  "the first",
  "unique",
  "more secure than aws",
  "scales like aws",
  "highest security",
  "open source",
  "open-source",
  "all in europe",
  "only european regions",
  "we can't read your data",
  "formally verified",
  "certified",
  "no tracking pixel",
  "not tracked",
  "testimonial",
  "simon",
];

const scannedDirectories = ["src", "emails"];
const scannedExtensions = new Set([".ts", ".tsx", ".html", ".txt", ".css", ".json", ".md"]);

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return filesUnder(full);
    return scannedExtensions.has(path.extname(full)) ? [full] : [];
  });
}

function normalised(text: string): string {
  return text
    .toLowerCase()
    .replace(/&apos;|&#0*39;|&rsquo;|&#0*8217;|&#x0*2019;|\\u2019|[\u2018\u2019\u02bc]/g, "'")
    .replace(/\s+/g, " ");
}

function findForbiddenPhrases(): string[] {
  const problems: string[] = [];
  for (const file of scannedDirectories.flatMap((d) => filesUnder(path.join(root, d)))) {
    const text = normalised(readFileSync(file, "utf8"));
    for (const phrase of forbiddenPhrases) {
      const pattern = new RegExp(
        `(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
      );
      if (pattern.test(text))
        problems.push(`${path.relative(root, file)}: forbidden phrase "${phrase}"`);
    }
  }
  return problems;
}

function findDriftedCopy(): string[] {
  const approved = JSON.parse(
    readFileSync(path.join(import.meta.dirname, "approved-copy.json"), "utf8"),
  ) as string[];
  const copySource = readFileSync(path.join(root, "src/content/copy.ts"), "utf8");
  return approved
    .filter((text) => !copySource.includes(JSON.stringify(text)))
    .map(
      (text) => `src/content/copy.ts: approved string missing or changed: ${JSON.stringify(text)}`,
    );
}

const problems = [...findForbiddenPhrases(), ...findDriftedCopy()];
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("copy:lint passed");
