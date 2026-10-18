// Allows one short header comment per file, nothing else.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.env.CHECK_ROOT ?? path.resolve(import.meta.dirname, "..");
const maxHeaderWords = 10;
const scriptExtensions = new Set([".ts", ".tsx", ".mts", ".mjs", ".js"]);
const scannedDirectories = ["src", "emails", "scripts", "tests", ".githooks", ".github"];
const hashCommentExtensions = new Set([".sh", ".yml", ".yaml"]);
const scannedRootFiles = [
  "Dockerfile",
  "Dockerfile.dokploy",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "vitest.config.ts",
  "playwright.config.ts",
];

type Comment = { start: number; text: string };

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

function scriptComments(file: string, text: string): Comment[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found = new Map<number, Comment>();
  const jsxTextSpans: [number, number][] = [];
  const insideJsxText = (position: number) =>
    jsxTextSpans.some(([start, end]) => position >= start && position < end);
  const collect = (ranges: ts.CommentRange[] | undefined) => {
    for (const range of ranges ?? []) {
      if (insideJsxText(range.pos)) continue;
      found.set(range.pos, { start: range.pos, text: text.slice(range.pos, range.end) });
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression === undefined) {
      found.set(node.getStart(source), {
        start: node.getStart(source),
        text: node.getText(source),
      });
    }
    if (node.kind === ts.SyntaxKind.JsxText) {
      jsxTextSpans.push([node.getFullStart(), node.getEnd()]);
    }
    node.getChildren(source).forEach(visit);
  };
  const collectAll = (node: ts.Node) => {
    if (node.kind !== ts.SyntaxKind.JsxText) {
      collect(ts.getLeadingCommentRanges(text, node.getFullStart()));
      collect(ts.getTrailingCommentRanges(text, node.getEnd()));
    }
    node.getChildren(source).forEach(collectAll);
  };
  visit(source);
  collectAll(source);
  return [...found.values()];
}

function cssComments(text: string): Comment[] {
  return [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => ({ start: m.index, text: m[0] }));
}

function shellComments(text: string): Comment[] {
  const comments: Comment[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#") && !(offset === 0 && trimmed.startsWith("#!"))) {
      comments.push({ start: offset + line.indexOf("#"), text: trimmed });
    }
    offset += line.length + 1;
  }
  return comments;
}

function commentsOf(file: string, text: string): Comment[] | null {
  const extension = path.extname(file);
  if (scriptExtensions.has(extension)) return scriptComments(file, text);
  if (extension === ".css") return cssComments(text);
  if (hashCommentExtensions.has(extension)) return shellComments(text);
  if (extension === "" && text.startsWith("#!")) return shellComments(text);
  if (path.basename(file).startsWith("Dockerfile")) return shellComments(text);
  return null;
}

function headerStart(text: string): number {
  return text.startsWith("#!") ? text.indexOf("\n") + 1 : 0;
}

function wordCount(comment: string): number {
  const words = comment
    .replace(/^\/\/|^#|^\/\*|\*\/$/g, "")
    .trim()
    .split(/\s+/);
  return words.filter(Boolean).length;
}

const problems: string[] = [];
const files = [
  ...scannedDirectories.flatMap((d) => filesUnder(path.join(root, d))),
  ...scannedRootFiles.map((f) => path.join(root, f)).filter((f) => existsSync(f)),
];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const comments = commentsOf(file, text);
  if (comments === null) continue;
  const relative = path.relative(root, file);
  for (const comment of comments) {
    const isHeader = comment.start === headerStart(text);
    if (!isHeader) {
      problems.push(`${relative}: comment outside the file header: ${comment.text.slice(0, 60)}`);
    } else if (comment.text.includes("\n")) {
      problems.push(`${relative}: header comment must be a single line`);
    } else if (wordCount(comment.text) > maxHeaderWords) {
      problems.push(`${relative}: header comment longer than ${maxHeaderWords} words`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("comments:lint passed");
