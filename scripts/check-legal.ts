// Blocks indexable builds while legal texts still hold placeholders.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");
const legalFiles = ["src/content/legal.ts"];

if (process.env.SITE_INDEXABLE !== "true") {
  console.log("legal check skipped, site is not indexable");
  process.exit(0);
}

const unfinished = legalFiles.filter((file) => {
  const full = path.join(root, file);
  return existsSync(full) && readFileSync(full, "utf8").includes("[TODO");
});

if (unfinished.length > 0) {
  console.error(
    `SITE_INDEXABLE=true but legal texts still contain [TODO: ${unfinished.join(", ")}`,
  );
  process.exit(1);
}
console.log("legal check passed");
