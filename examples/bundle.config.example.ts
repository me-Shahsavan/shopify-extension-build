/**
 * Illustrative bundle + flatten build for Shopify theme-extension assets.
 *
 * Goal: developers work in a nested, modular source tree (src/), but Shopify
 * requires every asset to be FLAT in the extension's assets/ folder.
 *
 * This script concatenates files in explicit dependency order, compiles
 * TypeScript -> JS, minifies, and writes flat .bundle.js / .bundle.css files.
 *
 * Genericized for portfolio use — widget names and paths are placeholders.
 * Run: npx tsx examples/bundle.config.example.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { transformSync } from "esbuild";

const SOURCE_DIR = "src";
const TARGET_DIR = "extensions/widget/assets"; // Shopify wants everything flat here

// ──────────────────────────────────────────────────────────────────────────
// 1. Files referenced DIRECTLY from .liquid templates cannot be bundled.
//    They are copied + compiled individually. The nested path is flattened
//    by turning "/" into "-" so the origin is still readable.
// ──────────────────────────────────────────────────────────────────────────
const LIQUID_DIRECT_FILES: Array<{ source: string; target: string }> = [
  { source: "shared/loader/widget-loader.ts", target: "shared-loader-widget-loader.js" },
  { source: "shared/loader/widget-loader.css", target: "shared-loader-widget-loader.css" },
  { source: "global.ts", target: "global.js" },
];

// ──────────────────────────────────────────────────────────────────────────
// 2. Bundles. Files are listed in EXPLICIT dependency order (not globbed),
//    because some modules must load before others and implicit ordering
//    breaks silently in production.
// ──────────────────────────────────────────────────────────────────────────
const BUNDLES: Record<string, { js: string[]; css: string[] }> = {
  "shared-loader.bundle": {
    js: [
      "shared/loader/page-context.ts", // detect which page we're on — load first
      "shared/loader/api-service.ts",
      "shared/loader/renderer.ts",
      "shared/loader/theme-manager.ts",
    ],
    css: [],
  },
  "widget-a.bundle": {
    js: [
      "widget-a/modules/init.ts",
      "widget-a/modules/controls.ts",
      "widget-a/ui/view.ts",
    ],
    css: ["widget-a/styles/base.css", "widget-a/styles/responsive.css"],
  },
  "widget-b.bundle": {
    js: ["widget-b/modules/init.ts", "widget-b/modules/player.ts"],
    css: ["widget-b/styles/base.css"],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Compile a single TS/JS source string to minified JS. */
function compileToJs(code: string, file: string): string {
  const result = transformSync(code, {
    loader: file.endsWith(".ts") ? "ts" : "js",
    minify: true,
    target: "es2019",
  });
  return result.code;
}

/** Minify a CSS source string. */
function minifyCss(code: string): string {
  const result = transformSync(code, { loader: "css", minify: true });
  return result.code;
}

/** Read one source file and compile/minify it by extension. */
function readAndCompile(relPath: string): string | null {
  const full = join(SOURCE_DIR, relPath);
  if (!existsSync(full)) {
    console.warn(`⚠️  missing: ${relPath}`);
    return null;
  }
  const code = readFileSync(full, "utf-8");
  if (relPath.endsWith(".css")) return minifyCss(code) + "\n";
  return compileToJs(code, relPath) + "\n";
}

/** Concatenate a list of files (in order) into one bundle string. */
function createBundle(name: string, files: string[]): { content: string; count: number } {
  const parts = [`/* ${name} */\n`];
  let count = 0;
  for (const f of files) {
    const compiled = readAndCompile(f);
    if (compiled) {
      parts.push(compiled);
      count++;
    }
  }
  return { content: parts.join("\n"), count };
}

/** Flatten a nested source path to a flat asset filename. */
function flatten(path: string): string {
  return path.replace(/\//g, "-").replace(/\.ts$/, ".js");
}

// ──────────────────────────────────────────────────────────────────────────
// Build
// ──────────────────────────────────────────────────────────────────────────
function build(): void {
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });

  // Direct-from-Liquid files: copy + compile individually, flat.
  for (const { source, target } of LIQUID_DIRECT_FILES) {
    const compiled = readAndCompile(source);
    if (compiled) {
      writeFileSync(join(TARGET_DIR, target), compiled);
      console.log(`📄 ${source}  →  ${target}`);
    }
  }

  // Bundles: concatenate in order, write flat .bundle.js / .bundle.css.
  for (const [name, { js, css }] of Object.entries(BUNDLES)) {
    if (js.length) {
      const { content, count } = createBundle(name, js);
      writeFileSync(join(TARGET_DIR, `${name}.js`), content);
      console.log(`📦 ${name}.js  (${count} files)`);
    }
    if (css.length) {
      const { content, count } = createBundle(name, css);
      writeFileSync(join(TARGET_DIR, `${name}.css`), content);
      console.log(`🎨 ${name}.css  (${count} files)`);
    }
  }

  console.log("✅ flat assets written to", TARGET_DIR);
}

build();
