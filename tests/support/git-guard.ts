// Fails test files whose git commands bypass the sandbox helper.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect } from "vitest";
import { sandboxGit } from "./sandbox-git";

const guard = mkdtempSync(path.join(tmpdir(), "velve-git-guard-"));
const trace = path.join(guard, "trace");

function strayCommands(): string[] {
  if (!existsSync(trace)) return [];
  return readFileSync(trace, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => /: git[ -](\S+)/.exec(line)?.[1] ?? "git");
}

beforeAll(() => {
  sandboxGit(guard, "init", "-q", "--bare", "outer.git");
  for (const key of Object.keys(process.env)) if (key.startsWith("GIT_")) delete process.env[key];
  Object.assign(process.env, {
    GIT_DIR: path.join(guard, "outer.git"),
    GIT_PREFIX: "",
    GIT_TRACE: trace,
  });
});

afterAll(() => {
  const commands = strayCommands();
  rmSync(guard, { recursive: true, force: true });
  expect(commands, "git ran with the inherited environment").toEqual([]);
});
