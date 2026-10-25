// Dependabot runs weekly, groups minor and patch, keeps prefixes.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const config = readFileSync(path.join(repoRoot, ".github/dependabot.yml"), "utf8");

const agreedPrefixes: Record<string, string> = {
  "github-actions": "ci",
  npm: "build",
  docker: "build",
};

type Update = { ecosystem: string; values: Map<string, string[]> };

function scalar(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

function listOrScalar(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map(scalar)
      .filter((value) => value !== "");
  }
  return [scalar(trimmed)];
}

function parseUpdates(text: string): Update[] {
  const updates: Update[] = [];
  let current: Update | undefined;
  let keys: { indent: number; key: string }[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    const content = line.trim();
    if (indent === 0) {
      current = undefined;
      continue;
    }
    const start = /^- package-ecosystem:\s*(.+)$/.exec(content);
    if (start?.[1] !== undefined) {
      current = { ecosystem: scalar(start[1]), values: new Map() };
      updates.push(current);
      keys = [];
      continue;
    }
    if (current === undefined) continue;
    if (content.startsWith("- ")) {
      while ((keys.at(-1)?.indent ?? -1) > indent) keys.pop();
      const parent = keys.map((entry) => entry.key).join(".");
      current.values.set(parent, [...(current.values.get(parent) ?? []), scalar(content.slice(2))]);
      continue;
    }
    const pair = /^([\w-]+):\s*(.*)$/.exec(content);
    if (pair?.[1] === undefined) continue;
    while ((keys.at(-1)?.indent ?? -1) >= indent) keys.pop();
    keys.push({ indent, key: pair[1] });
    const value = pair[2] ?? "";
    if (value !== "")
      current.values.set(keys.map((entry) => entry.key).join("."), listOrScalar(value));
  }
  return updates;
}

const updates = parseUpdates(config);
const topLevelKeys = config.split("\n").flatMap((line) => /^([\w-]+):/.exec(line)?.[1] ?? []);
const allowedKey =
  /^(directory|schedule\.(interval|day|time|timezone)|groups\.[^.]+\.update-types|commit-message\.(prefix|prefix-development|include))$/;

function updateFor(ecosystem: string): Update {
  const update = updates.find((candidate) => candidate.ecosystem === ecosystem);
  if (update === undefined) throw new Error(`no update entry for ${ecosystem}`);
  return update;
}

function groupUpdateTypes(update: Update): Map<string, string[] | undefined> {
  const groups = new Map<string, string[] | undefined>();
  for (const [key, value] of update.values) {
    const match = /^groups\.([^.]+)(?:\.(.+))?$/.exec(key);
    if (match?.[1] === undefined) continue;
    if (!groups.has(match[1])) groups.set(match[1], undefined);
    if (match[2] === "update-types") groups.set(match[1], value);
  }
  return groups;
}

describe("dependabot.yml", () => {
  it("covers actions, npm and Docker once each", () => {
    expect(updates.map((update) => update.ecosystem).sort()).toEqual(
      Object.keys(agreedPrefixes).sort(),
    );
  });

  it("holds nothing but version 2 and the updates", () => {
    expect(topLevelKeys).toEqual(["version", "updates"]);
    expect(config.startsWith("version: 2\n")).toBe(true);
  });

  it("contains no comment", () => {
    expect(config.split("\n").filter((line) => /(^|\s)#/.test(line))).toEqual([]);
  });

  describe.each(Object.entries(agreedPrefixes))("%s", (ecosystem, prefix) => {
    it("runs weekly from the repository root", () => {
      const update = updateFor(ecosystem);
      expect(update.values.get("schedule.interval")).toEqual(["weekly"]);
      expect(update.values.get("directory")).toEqual(["/"]);
    });

    it("sets nothing that could skip, hold back or regroup updates", () => {
      const keys = [...updateFor(ecosystem).values.keys()];
      expect(keys.filter((key) => !allowedKey.test(key))).toEqual([]);
    });

    it("groups minor and patch updates", () => {
      const types = [...groupUpdateTypes(updateFor(ecosystem)).values()];
      expect(types.map((group) => [...(group ?? [])].sort())).toContainEqual(["minor", "patch"]);
    });

    it("leaves every major update to its own pull request", () => {
      const groups = groupUpdateTypes(updateFor(ecosystem));
      for (const [name, types] of groups) {
        expect(types, `group ${name} needs update-types`).toBeDefined();
        expect(types, `group ${name} groups major updates`).not.toContain("major");
      }
    });

    it(`commits as ${prefix} with the deps scope`, () => {
      const update = updateFor(ecosystem);
      expect(update.values.get("commit-message.prefix")).toEqual([prefix]);
      expect(update.values.get("commit-message.include")).toEqual(["scope"]);
      const development = update.values.get("commit-message.prefix-development");
      if (ecosystem === "npm") expect(development).toEqual([prefix]);
      if (development !== undefined) expect(development).toEqual([prefix]);
    });
  });
});
