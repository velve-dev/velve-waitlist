// Every workflow action is pinned to a full commit SHA.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowDirectory = path.resolve(import.meta.dirname, "../../.github/workflows");
const usesLine = /^\s*(?:-\s+)?uses:/;
const pinnedUses = /^\s*(?:-\s+)?uses:\s*[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}$/;

const workflows = readdirSync(workflowDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map(({ name }) => ({
    file: name,
    lines: readFileSync(path.join(workflowDirectory, name), "utf8").split("\n"),
  }));

describe("workflow action pins", () => {
  it("finds the workflows", () => {
    expect(workflows.map(({ file }) => file)).toEqual(
      expect.arrayContaining(["ci.yml", "deploy.yml"]),
    );
  });

  it.each(workflows)("pins every action in $file to a full commit SHA", ({ lines }) => {
    const references = lines.filter((line) => usesLine.test(line));
    expect(references.length).toBeGreaterThan(0);
    expect(references.filter((line) => !pinnedUses.test(line))).toEqual([]);
  });
});
