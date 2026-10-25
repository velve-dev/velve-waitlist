// Sandbox git commands must never reach an outer repository.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sandboxEnv, sandboxGit } from "../support/sandbox-git";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const directories: string[] = [];

type Decoy = { main: string; linked: string; gitDir: string };

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  directories.push(directory);
  return directory;
}

function createDecoy(): Decoy {
  const main = temporaryDirectory("velve-decoy-");
  sandboxGit(main, "init", "-q");
  sandboxGit(main, "config", "user.name", "Decoy Owner");
  sandboxGit(main, "config", "user.email", "decoy@example.invalid");
  writeFileSync(path.join(main, "decoy.txt"), "decoy\n");
  sandboxGit(main, "add", ".");
  sandboxGit(main, "commit", "-q", "-m", "chore: start the decoy");
  const linked = path.join(temporaryDirectory("velve-decoy-linked-"), "linked");
  sandboxGit(main, "worktree", "add", "-q", linked, "-b", "decoy/linked");
  return { main, linked, gitDir: sandboxGit(linked, "rev-parse", "--absolute-git-dir") };
}

function snapshot(decoy: Decoy) {
  return {
    config: readFileSync(path.join(decoy.main, ".git/config"), "utf8"),
    refs: sandboxGit(decoy.main, "for-each-ref", "--format=%(refname) %(objectname)"),
    mainHead: readFileSync(path.join(decoy.main, ".git/HEAD"), "utf8"),
    linkedHead: readFileSync(path.join(decoy.gitDir, "HEAD"), "utf8"),
    linkedIndex: readFileSync(path.join(decoy.gitDir, "index")).toString("base64"),
  };
}

function withVariables<T>(variables: Record<string, string>, action: () => T): T {
  const saved = Object.keys(variables).map((key) => [key, process.env[key]] as const);
  Object.assign(process.env, variables);
  try {
    return action();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function runSandboxFlow() {
  const root = temporaryDirectory("velve-sandbox-");
  writeFileSync(path.join(root, "a.txt"), "a\n");
  writeFileSync(path.join(root, ".env.production"), "TOKEN_KEY=abc\n");
  sandboxGit(root, "init", "-q");
  sandboxGit(root, "config", "velve.identity", "Hook Test <hook@example.invalid>");
  sandboxGit(root, "config", "user.name", "Hook Test");
  sandboxGit(root, "config", "user.email", "hook@example.invalid");
  sandboxGit(root, "add", "a.txt");
  sandboxGit(root, "commit", "-q", "-m", "chore: add a file", "-m", "Reviewed-by: someone");
  const sha = sandboxGit(root, "rev-parse", "HEAD");
  const hook = spawnSync("sh", [path.join(repoRoot, ".githooks/pre-push")], {
    cwd: root,
    env: sandboxEnv(),
    input: `refs/heads/main ${sha} refs/heads/main ${"0".repeat(40)}\n`,
    encoding: "utf8",
  });
  const secrets = spawnSync(process.execPath, [path.join(repoRoot, "scripts/secrets-lint.ts")], {
    env: sandboxEnv({ CHECK_ROOT: root }),
    encoding: "utf8",
  });
  return {
    commits: sandboxGit(root, "log", "--format=%an %s"),
    hook: { status: hook.status, output: hook.stdout + hook.stderr },
    secrets: { status: secrets.status, output: secrets.stdout + secrets.stderr },
  };
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("sandbox git", () => {
  const environments: [string, (decoy: Decoy) => Record<string, string>][] = [
    [
      "a pre-push hook in a linked worktree",
      (decoy) => ({ GIT_DIR: decoy.gitDir, GIT_PREFIX: "" }),
    ],
    [
      "a hook that also sets the index and work tree",
      (decoy) => ({
        GIT_DIR: decoy.gitDir,
        GIT_INDEX_FILE: path.join(decoy.gitDir, "index"),
        GIT_WORK_TREE: decoy.linked,
        GIT_PREFIX: "",
      }),
    ],
  ];

  it.each(environments)("stays in its sandbox when run from %s", (_, variables) => {
    const decoy = createDecoy();
    const before = snapshot(decoy);
    const result = withVariables(variables(decoy), runSandboxFlow);
    expect(snapshot(decoy)).toEqual(before);
    expect(result.commits).toBe("Hook Test chore: add a file");
    expect(result.hook.status).toBe(1);
    expect(result.hook.output).toContain("trailer");
    expect(result.hook.output).not.toContain("has identity");
    expect(result.secrets.status).toBe(1);
    expect(result.secrets.output).toContain(".env.production");
  });
});
