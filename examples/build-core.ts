/**
 * Shared build core: one definition of the source layout, the flatten transform,
 * and the compile/bundle steps.
 *
 * Both entry points import from here — the watch build (dev inner loop) and the
 * bundle build (CI/release). That is deliberate: if the two had their own copies
 * of the bundle map, dev and production would drift, and the drift would only
 * surface in production where the flat filenames actually matter.
 *
 * Genericized for portfolio use — widget names and paths are placeholders.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { transformSync } from "esbuild";

export const SOURCE_DIR = "src";
export const TARGET_DIR = "extensions/widget/assets"; // Shopify wants everything flat here

// ──────────────────────────────────────────────────────────────────────────
// 1. Files referenced DIRECTLY from .liquid templates cannot be bundled.
//    They are compiled individually and written under their flattened name.
// ──────────────────────────────────────────────────────────────────────────
export const LIQUID_DIRECT_FILES: string[] = [
  "shared/loader/widget-loader.ts",
  "shared/loader/widget-loader.css",
  "global.ts",
];

// ──────────────────────────────────────────────────────────────────────────
// 2. Bundles. Files are listed in EXPLICIT dependency order (not globbed),
//    because some modules must load before others and implicit ordering
//    breaks silently in production.
// ──────────────────────────────────────────────────────────────────────────
export const BUNDLES: Record<string, { js: string[]; css: string[] }> = {
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
// The transform: nested source path -> flat asset filename
// ──────────────────────────────────────────────────────────────────────────

/** `shared/loader/widget-loader.ts` -> `shared-loader-widget-loader.js` */
export function flatten(relPath: string): string {
  return relPath.replace(/\//g, "-").replace(/\.ts$/, ".js");
}

/**
 * Replacing "/" with "-" is readable, but it is not injective on its own:
 * `widget-a/init.ts` and `widget-a-init.ts` both flatten to `widget-a-init.js`.
 * Rather than encode our way around it, the build refuses to run when two
 * sources would land on the same asset name — a name clash is a five-second
 * rename at build time and a silently overwritten asset in production.
 */
export function assertNoFlattenCollisions(): void {
  const seen = new Map<string, string>();
  const sources = [
    ...LIQUID_DIRECT_FILES,
    ...Object.values(BUNDLES).flatMap((b) => [...b.js, ...b.css]),
  ];
  for (const source of sources) {
    const flat = flatten(source);
    const previous = seen.get(flat);
    if (previous && previous !== source) {
      throw new Error(
        `flatten() collision: "${previous}" and "${source}" both map to "${flat}"`
      );
    }
    seen.set(flat, source);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lookups the watch build needs: what does this saved file belong to?
// ──────────────────────────────────────────────────────────────────────────

export function isLiquidDirect(relPath: string): boolean {
  return LIQUID_DIRECT_FILES.includes(relPath);
}

/** Every bundle whose file list contains this source path. */
export function bundlesContaining(relPath: string): string[] {
  return Object.entries(BUNDLES)
    .filter(([, { js, css }]) => js.includes(relPath) || css.includes(relPath))
    .map(([name]) => name);
}

// ──────────────────────────────────────────────────────────────────────────
// Compile / write
// ──────────────────────────────────────────────────────────────────────────

function compile(code: string, file: string, minify: boolean): string {
  if (file.endsWith(".css")) {
    return transformSync(code, { loader: "css", minify }).code;
  }
  return transformSync(code, {
    loader: file.endsWith(".ts") ? "ts" : "js",
    minify,
    target: "es2019",
  }).code;
}

/** Read one source file and compile/minify it by extension. */
export function readAndCompile(relPath: string, minify: boolean): string | null {
  const full = join(SOURCE_DIR, relPath);
  if (!existsSync(full)) {
    console.warn(`⚠️  missing: ${relPath}`);
    return null;
  }
  return compile(readFileSync(full, "utf-8"), relPath, minify) + "\n";
}

function ensureTargetDir(): void {
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });
}

/** Concatenate a list of files (in order) into one asset. */
function createBundle(
  name: string,
  files: string[],
  minify: boolean
): { content: string; count: number } {
  const parts = [`/* ${name} */\n`];
  let count = 0;
  for (const file of files) {
    const compiled = readAndCompile(file, minify);
    if (compiled) {
      parts.push(compiled);
      count++;
    }
  }
  return { content: parts.join("\n"), count };
}

/**
 * Rebuild one bundle end to end and write its flat `.js` / `.css` assets.
 * Used by both the release build (all bundles) and the watch build (only the
 * bundle that owns the file you just saved).
 */
export function buildBundle(name: string, minify: boolean): string[] {
  const spec = BUNDLES[name];
  if (!spec) throw new Error(`unknown bundle: ${name}`);
  ensureTargetDir();

  const written: string[] = [];
  if (spec.js.length) {
    const { content } = createBundle(name, spec.js, minify);
    writeFileSync(join(TARGET_DIR, `${name}.js`), content);
    written.push(`${name}.js`);
  }
  if (spec.css.length) {
    const { content } = createBundle(name, spec.css, minify);
    writeFileSync(join(TARGET_DIR, `${name}.css`), content);
    written.push(`${name}.css`);
  }
  return written;
}

/** Compile a Liquid-referenced file on its own and write it under its flat name. */
export function buildDirectFile(relPath: string, minify: boolean): string | null {
  const compiled = readAndCompile(relPath, minify);
  if (!compiled) return null;
  ensureTargetDir();
  const target = flatten(relPath);
  writeFileSync(join(TARGET_DIR, target), compiled);
  return target;
}
