// Blocks indexable builds while legal texts still hold placeholders.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");
const legalFiles = ["src/content/legal.ts", "src/app/imprint/page.tsx", "src/app/privacy/page.tsx"];

if (process.env.SITE_INDEXABLE?.trim() !== "true") {
  console.log("legal check skipped, site is not indexable");
  process.exit(0);
}

const missing = legalFiles.filter((file) => !existsSync(path.join(root, file)));
const unfinished = legalFiles.filter(
  (file) =>
    !missing.includes(file) && readFileSync(path.join(root, file), "utf8").includes("[TODO"),
);

if (missing.length > 0) {
  console.error(`SITE_INDEXABLE=true but legal sources are missing: ${missing.join(", ")}`);
  process.exit(1);
}
if (unfinished.length > 0) {
  console.error(
    `SITE_INDEXABLE=true but legal texts still contain [TODO: ${unfinished.join(", ")}`,
  );
  process.exit(1);
}
console.log("legal check passed");
