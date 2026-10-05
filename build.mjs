// Builds Keychron Dash into self-contained HTML (JS, CSS and logos inlined).
//   npm run build        -> index.html                  (GitHub Pages, full page)
//                           dist/claude-artifact.html   (Claude artifact, page body only)
//   npm run build:debug  -> same, plus window.__game / window.__bench test hooks
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [join(root, "src", "main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  loader: { ".png": "dataurl" },
  define: {
    "process.env.NODE_ENV": '"production"',
    __DEBUG__: process.env.PAX_DEBUG === "1" ? "true" : "false",
  },
  logLevel: "warning",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = await readFile(join(root, "src", "game.css"), "utf8");
const head = `<title>Keychron Dash</title>
<style>${css}</style>
`;
const content = `<div id="root"></div>
<script>${js}</script>
`;
const body = head + content;

// Claude wraps artifact pages in its own <!doctype>/<head>, so it gets the body only.
const artifact = join(root, "dist", "claude-artifact.html");
await mkdir(dirname(artifact), { recursive: true });
await writeFile(artifact, body);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Keychron × PAX Aus 2026 booth game">
${head}</head>
<body>
${content}</body>
</html>
`;
await writeFile(join(root, "index.html"), page);

console.log(`index.html (${(page.length / 1024).toFixed(0)} KB), dist/claude-artifact.html`);
