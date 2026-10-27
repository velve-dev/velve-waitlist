// Every workflow action is pinned to a full commit SHA.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowDirectory = path.resolve(import.meta.dirname, "../../.github/workflows");
const usesLine = /(?:^|[\s{,])["']?uses["']?\s*:/;
const pinnedUses = /^\s*(?:-\s+)?uses:\s*[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}$/;
const commitSha = "81c6f93d4bc991e510b342a00b419b3bb4efc5c6";

const workflows = readdirSync(workflowDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map(({ name }) => ({
    file: name,
    lines: readFileSync(path.join(workflowDirectory, name), "utf8").split("\n"),
  }));

function actionReferences(lines: string[]) {
  return lines.filter((line) => usesLine.test(line));
}

function unpinnedReferences(lines: string[]) {
  return actionReferences(lines).filter((line) => !pinnedUses.test(line));
}

describe("workflow action pins", () => {
  it("finds the workflows", () => {
    expect(workflows.map(({ file }) => file)).toEqual(
      expect.arrayContaining(["ci.yml", "deploy.yml"]),
    );
  });

  it.each(workflows)("pins every action in $file to a full commit SHA", ({ lines }) => {
    expect(actionReferences(lines).length).toBeGreaterThan(0);
    expect(unpinnedReferences(lines)).toEqual([]);
  });

  it("accepts an action pinned to a full commit SHA", () => {
    expect(unpinnedReferences([`      - uses: docker/login-action@${commitSha}`])).toEqual([]);
  });

  it.each([
    "      - uses: docker/login-action@v4.7.0",
    "      - uses: docker/login-action@81c6f93",
    `      - uses: docker/login-action@${commitSha} # v4.7.0`,
    "      - uses: docker/login-action@main",
    "      - uses: docker/login-action@refs/heads/main",
    `      - uses: docker/login-action@${commitSha.toUpperCase()}`,
    "      - { uses: docker/login-action@v4.7.0 }",
    '        "uses": docker/login-action@v4.7.0',
    "        'uses': docker/login-action@v4.7.0",
  ])("rejects %s", (line) => {
    expect(unpinnedReferences([line])).toEqual([line]);
  });
});
