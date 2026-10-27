// Keeps test git commands and scripts inside their sandbox.
import { execFileSync } from "node:child_process";

export function sandboxEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  return Object.assign(env, extra);
}

export function sandboxGit(directory: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: directory, env: sandboxEnv(), encoding: "utf8" }).trim();
}
