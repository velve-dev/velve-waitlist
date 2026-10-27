// The repository checks must fail on planted problems.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sandboxEnv, sandboxGit } from "../support/sandbox-git";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const sandboxes: string[] = [];

function sandbox(files: Record<string, string>): string {
  const directory = mkdtempSync(path.join(tmpdir(), "velve-check-"));
  sandboxes.push(directory);
  mkdirSync(path.join(directory, "src/content"), { recursive: true });
  cpSync(path.join(repoRoot, "src/content/copy.ts"), path.join(directory, "src/content/copy.ts"));
  cpSync(path.join(repoRoot, "src/content/legal.ts"), path.join(directory, "src/content/legal.ts"));
  mkdirSync(path.join(directory, "emails"), { recursive: true });
  cpSync(path.join(repoRoot, "emails/content.ts"), path.join(directory, "emails/content.ts"));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), content);
  }
  sandboxGit(directory, "init", "-q");
  return directory;
}

function runCheck(script: string, root: string) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, "scripts", script)], {
    env: sandboxEnv({ CHECK_ROOT: root }),
    encoding: "utf8",
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

afterEach(() => {
  for (const directory of sandboxes.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("copy:lint", () => {
  it("passes on clean copy", () => {
    expect(runCheck("copy-lint.ts", sandbox({})).status).toBe(0);
  });

  it("fails on a forbidden phrase", () => {
    const root = sandbox({ "src/app/page.tsx": "export const x = 'A seamless deploy';" });
    const result = runCheck("copy-lint.ts", root);
    expect(result.status).toBe(1);
    expect(result.output).toContain("seamless");
  });

  it("fails when approved copy drifts", () => {
    const root = sandbox({});
    writeFileSync(
      path.join(root, "src/content/copy.ts"),
      "export const hero = { heading: 'Changed' };",
    );
    expect(runCheck("copy-lint.ts", root).status).toBe(1);
  });

  it("fails on a forbidden phrase with a typographic apostrophe", () => {
    const root = sandbox({ "src/a.ts": "export const x = 'We can\u2019t read your data';" });
    expect(runCheck("copy-lint.ts", root).status).toBe(1);
  });

  it("fails on a forbidden phrase broken across lines", () => {
    const root = sandbox({
      "src/a.tsx": "export const A = () => <p>more secure\n    than AWS</p>;",
    });
    expect(runCheck("copy-lint.ts", root).status).toBe(1);
  });
});

describe("comments:lint", () => {
  it("accepts one short header comment", () => {
    const root = sandbox({
      "src/a.ts": "// Short header.\nexport const a = 'https://velve.dev';\n",
    });
    expect(runCheck("comments-lint.ts", root).status).toBe(0);
  });

  it("rejects a comment below the header", () => {
    const root = sandbox({ "src/a.ts": "export const a = 1;\n// explains a\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });

  it("rejects a JSX comment", () => {
    const root = sandbox({ "src/a.tsx": "export const A = () => <p>{/* note */}hi</p>;\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });

  it("accepts double slashes in JSX text", () => {
    const root = sandbox({ "src/a.tsx": "export const A = () => <p><b>x</b> // y /* z */</p>;\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(0);
  });

  it("rejects a comment in a hook with any shebang", () => {
    const root = sandbox({ ".githooks/pre-commit": "#!/usr/bin/env bash\necho hi\n# explains\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });

  it("rejects a comment in a workflow", () => {
    const root = sandbox({ ".github/workflows/ci.yml": "on: push\n# explains\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });

  it("rejects a comment in a Dockerfile", () => {
    const root = sandbox({ "Dockerfile.dokploy": "FROM node\n# explains\n" });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });

  it("rejects a header longer than ten words", () => {
    const root = sandbox({
      "src/a.ts": "// one two three four five six seven eight nine ten eleven\nexport {};\n",
    });
    expect(runCheck("comments-lint.ts", root).status).toBe(1);
  });
});

describe("secrets:lint", () => {
  it("rejects an env file", () => {
    const root = sandbox({ ".env.production": "TOKEN_KEY=abc\n" });
    expect(runCheck("secrets-lint.ts", root).status).toBe(1);
  });

  it("rejects a value in the env example", () => {
    const root = sandbox({ ".env.example": "PORT=8674\n" });
    expect(runCheck("secrets-lint.ts", root).status).toBe(1);
  });

  it("rejects a Brevo key in source", () => {
    const root = sandbox({ "src/a.ts": `export const k = "xkeysib-${"a".repeat(64)}";` });
    expect(runCheck("secrets-lint.ts", root).status).toBe(1);
  });

  it("rejects a GitHub fine-grained token", () => {
    const root = sandbox({ "src/a.ts": `export const k = "github_pat_${"A1".repeat(30)}";` });
    expect(runCheck("secrets-lint.ts", root).status).toBe(1);
  });

  it("rejects a hard-coded secret assignment", () => {
    const root = sandbox({ "src/a.ts": `export const healthToken = "${"q7".repeat(16)}";` });
    expect(runCheck("secrets-lint.ts", root).status).toBe(1);
  });

  it("accepts keys without values", () => {
    const root = sandbox({ ".env.example": "PORT=\nTOKEN_KEY=\n" });
    expect(runCheck("secrets-lint.ts", root).status).toBe(0);
  });
});

describe("pre-push hook", () => {
  const identity = "Hook Test <hook@example.invalid>";

  function pushCommitWithBody(body: string) {
    const root = sandbox({ "a.txt": "a\n" });
    const git = (...args: string[]) => sandboxGit(root, ...args);
    git("config", "velve.identity", identity);
    git("config", "user.name", "Hook Test");
    git("config", "user.email", "hook@example.invalid");
    git("add", ".");
    git("commit", "-q", "-m", "chore: add a file", "-m", body);
    const sha = git("rev-parse", "HEAD");
    const result = spawnSync("sh", [path.join(repoRoot, ".githooks/pre-push")], {
      cwd: root,
      env: sandboxEnv(),
      input: `refs/heads/main ${sha} refs/heads/main ${"0".repeat(40)}\n`,
      encoding: "utf8",
    });
    return { status: result.status, output: result.stdout + result.stderr };
  }

  it("rejects a trailer-like body line", () => {
    const result = pushCommitWithBody("Reviewed-by: someone");
    expect(result.status).toBe(1);
    expect(result.output).toContain("trailer");
  });

  it("rejects attribution markers in any letter case", () => {
    const result = pushCommitWithBody("Written in a pair, co-authored-by a friend.");
    expect(result.status).toBe(1);
    expect(result.output).toContain("trailer");
  });
});

describe("legal check", () => {
  function runLegal(root: string, indexable: string) {
    return spawnSync(process.execPath, [path.join(repoRoot, "scripts/check-legal.ts")], {
      env: sandboxEnv({ CHECK_ROOT: root, SITE_INDEXABLE: indexable }),
      encoding: "utf8",
    }).status;
  }

  const finished = {
    "src/content/legal.ts": "export const imprint = {};\n",
    "src/app/imprint/page.tsx": "export default function P() { return null; }\n",
    "src/app/privacy/page.tsx": "export default function P() { return null; }\n",
  };

  it("passes an indexable build once every placeholder is gone", () => {
    expect(runLegal(sandbox(finished), "true")).toBe(0);
  });

  it("fails an indexable build while the legal texts hold a placeholder", () => {
    expect(runLegal(sandbox({}), "true")).toBe(1);
  });

  it("reads the switch the way the server does", () => {
    expect(runLegal(sandbox({}), " true\n")).toBe(1);
  });

  it("fails on a placeholder in the privacy page", () => {
    const root = sandbox({ ...finished, "src/app/privacy/page.tsx": "const x = '[TODO] y';\n" });
    expect(runLegal(root, "true")).toBe(1);
  });

  it("fails when a legal source is missing", () => {
    const root = sandbox({ "src/content/legal.ts": "export const imprint = {};\n" });
    expect(runLegal(root, "true")).toBe(1);
  });
});
