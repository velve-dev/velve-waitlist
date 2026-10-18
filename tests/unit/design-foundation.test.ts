// The global stylesheet carries the design tokens and nothing unused.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const css = readFileSync(path.join(repoRoot, "src/app/globals.css"), "utf8");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const components = sourceFiles(path.join(repoRoot, "src"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const tokens: Record<string, string> = {
  "--bg-base": "#050509",
  "--surface-card": "#09090d",
  "--surface-raised": "#0d0d13",
  "--surface-hover": "#121218",
  "--border-default": "#1a1922",
  "--border-strong": "#26242f",
  "--text-primary": "#f1f0f4",
  "--text-muted": "#8b8797",
  "--text-faint": "#67637a",
  "--text-link": "#b8a6ff",
  "--accent": "#7b5cff",
  "--status-live": "#3faf6b",
  "--status-warning": "#f5a623",
  "--status-failed": "#f0554c",
  "--ease": "cubic-bezier(0.2, 0.6, 0.25, 1)",
  "--duration-hover": "120ms",
  "--duration-fade": "180ms",
  "--opacity-disabled": "0.42",
};

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[2] ?? "";
}

describe("design foundation", () => {
  it.each(Object.entries(tokens))("defines %s as %s", (name, value) => {
    expect(ruleBody(":root")).toContain(`${name}: ${value};`);
  });

  it("dims disabled controls and blocks the pointer", () => {
    const body = ruleBody(":disabled");
    expect(body).toContain("opacity: var(--opacity-disabled);");
    expect(body).toContain("cursor: not-allowed;");
  });

  it("only defines classes that a component uses", () => {
    const classes = [...css.matchAll(/^\s*\.([a-z][\w-]*)[\s,{]/gm)].map((m) => m[1] ?? "");
    const unused = classes.filter((name) => !components.includes(name));
    expect(unused).toEqual([]);
  });

  it("only defines keyframes that an animation uses", () => {
    const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1] ?? "");
    const unused = names.filter((name) => !new RegExp(`animation:[^;]*\\b${name}\\b`).test(css));
    expect(unused).toEqual([]);
  });
});
