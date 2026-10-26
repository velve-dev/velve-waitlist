// The image pins its bases and installs pnpm from packageManager.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const dockerfile = readFileSync(path.join(repoRoot, "Dockerfile.dokploy"), "utf8");
const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
  packageManager?: string;
};

type Stage = { from: string; lines: string[] };

function parseStages(text: string): Stage[] {
  const stages: Stage[] = [];
  for (const line of text.split("\n").map((raw) => raw.trim())) {
    const from = /^FROM\s+(\S+)/.exec(line);
    if (from?.[1] !== undefined) {
      stages.push({ from: from[1], lines: [] });
      continue;
    }
    stages.at(-1)?.lines.push(line);
  }
  return stages;
}

const stages = parseStages(dockerfile);
const installFromPackageManager =
  /^RUN npm install --global --ignore-scripts "\$\(node -p "require\('\.\/package\.json'\)\.packageManager"\)"$/;
const runsPnpm = /^RUN\s+pnpm\s/;

function copiesManifest(line: string): boolean {
  const [instruction, ...rest] = line.split(/\s+/);
  if (instruction !== "COPY" || rest.some((token) => token.startsWith("--from="))) return false;
  const sources = rest.filter((token) => !token.startsWith("--")).slice(0, -1);
  return sources.includes("package.json") || sources.includes(".");
}

describe("Image build", () => {
  it("pins every base image by digest", () => {
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      expect(stage.from).toMatch(/^[^@\s]+:[^@\s]+@sha256:[0-9a-f]{64}$/);
    }
  });

  it("does not use corepack", () => {
    expect(dockerfile).not.toMatch(/corepack/i);
  });

  it("names no pnpm version of its own", () => {
    expect(dockerfile).not.toMatch(/pnpm@|@pnpm\/|pnpm[_-]?version/i);
    const version = manifest.packageManager?.split("@")[1] ?? "";
    expect(version).not.toBe("");
    expect(dockerfile).not.toContain(version);
  });

  it("takes pnpm from an exact packageManager release", () => {
    expect(manifest.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
  });

  it("installs pnpm from packageManager before each stage runs it", () => {
    const stagesRunningPnpm = stages.filter((stage) =>
      stage.lines.some((line) => runsPnpm.test(line)),
    );
    expect(stagesRunningPnpm.length).toBeGreaterThan(0);
    for (const stage of stagesRunningPnpm) {
      const firstPnpm = stage.lines.findIndex((line) => runsPnpm.test(line));
      const install = stage.lines.findIndex((line) => installFromPackageManager.test(line));
      const manifestCopy = stage.lines.findIndex(copiesManifest);
      expect(install).toBeGreaterThanOrEqual(0);
      expect(install).toBeLessThan(firstPnpm);
      expect(manifestCopy).toBeGreaterThanOrEqual(0);
      expect(manifestCopy).toBeLessThan(install);
    }
  });

  it("installs nothing with npm but the packageManager release", () => {
    const npmInstalls = stages
      .flatMap((stage) => stage.lines)
      .filter((line) => /\bnpm\s+(install|i|add)\b/.test(line));
    expect(npmInstalls.length).toBeGreaterThan(0);
    for (const line of npmInstalls) {
      expect(line).toMatch(installFromPackageManager);
    }
  });

  it("adds no package manager to the runtime stage", () => {
    const runtime = stages.at(-1);
    expect(runtime?.lines.some((line) => /\b(npm|pnpm)\b/.test(line))).toBe(false);
  });
});
