// Renders logo, favicon and social images from the logo mark.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const markPath = "M12 2.4 20.3 7.2v9.6L12 21.6 3.7 16.8V7.2L12 2.4Z";

function mark(size: number, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="${markPath}" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.1" fill="${color}"/></svg>`;
}

function fontFace(family: string, file: string): string {
  const data = readFileSync(path.join(root, "src/app/fonts", file)).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:100 900;}`;
}

const socialCard = `<!doctype html><html><head><style>
${fontFace("Geist", "Geist-Variable.woff2")}
${fontFace("Geist Mono", "GeistMono-Variable.woff2")}
html,body{margin:0;width:1200px;height:630px;background:#050509;color:#F1F0F4;font-family:Geist,sans-serif}
.card{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px}
.pill{display:inline-flex;align-items:center;gap:12px;height:56px;padding:0 22px;border-radius:14px;background:#09090D;border:1px solid #1A1922;font-family:"Geist Mono";font-size:22px;font-weight:500}
.prompt{color:#8B8797}.live{color:#3FAF6B;display:inline-flex;align-items:center;gap:10px}.dot{width:10px;height:10px;border-radius:50%;background:#3FAF6B}
h1{margin:0;font-size:76px;font-weight:600;letter-spacing:-0.025em;line-height:1.1}
p{margin:0;font-size:30px;color:#8B8797}
</style></head><body><div class="card">${mark(56, "#F1F0F4")}
<div class="pill"><span class="prompt">$</span><span>git push origin main</span><span class="live"><span class="dot"></span>live</span></div>
<div style="display:flex;flex-direction:column;align-items:center;gap:18px"><h1>Security without shortcuts.</h1><p>Deploys as simple as a git push.</p></div>
</div></body></html>`;

const outputs = [
  { file: "public/email/logo-mark.png", size: 48, html: mark(48, "#F1F0F4"), transparent: true },
  { file: "docs/assets/velve-logo.png", size: 96, html: mark(96, "#7B5CFF"), transparent: true },
  {
    file: "src/app/apple-icon.png",
    size: 180,
    html: `<div style="width:180px;height:180px;background:#7B5CFF;display:flex;align-items:center;justify-content:center">${mark(112, "#FFFFFF")}</div>`,
    transparent: false,
  },
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH === undefined
    ? {}
    : { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
);
const page = await browser.newPage();

for (const output of outputs) {
  await page.setViewportSize({ width: output.size, height: output.size });
  await page.setContent(`<html><body style="margin:0">${output.html}</body></html>`);
  mkdirSync(path.dirname(path.join(root, output.file)), { recursive: true });
  await page.screenshot({ path: path.join(root, output.file), omitBackground: output.transparent });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(socialCard);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, "src/app/opengraph-image.png") });
await browser.close();

writeFileSync(
  path.join(root, "src/app/icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#7B5CFF"/><g transform="translate(4 4)"><path d="${markPath}" fill="none" stroke="#FFFFFF" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.1" fill="#FFFFFF"/></g></svg>\n`,
);
console.log("assets rendered");
