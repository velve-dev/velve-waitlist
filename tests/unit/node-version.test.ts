// Node version matches across .nvmrc, package.json and the image.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function read(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

const nvmrc = read(".nvmrc").trim();
const manifest = JSON.parse(read("package.json")) as { engines?: { node?: string } };
const baseImages = [...read("Dockerfile.dokploy").matchAll(/^FROM\s+(\S+)/gm)].map(
  (match) => match[1],
);

describe("Node version", () => {
  it("is pinned to one exact release in .nvmrc", () => {
    expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("is the same in engines.node", () => {
    expect(manifest.engines?.node).toBe(nvmrc);
  });

  it("is the same in every stage of the image", () => {
    expect(baseImages.length).toBeGreaterThan(0);
    for (const image of baseImages) {
      expect(image).toMatch(new RegExp(`^node:${nvmrc.replaceAll(".", "\\.")}-`));
    }
  });
});
