/**
 * Illustrative watch build — the fast inner loop for local development.
 *
 * Subscribes to the nested source tree and, on every save, recompiles the
 * changed file and writes its flat counterpart into the Shopify assets folder.
 * The developer never thinks about flattening — they just save and refresh.
 *
 * Genericized sketch. Uses @parcel/watcher (same approach as the real system).
 * Run: npx tsx examples/watch.example.ts
 */

import { subscribe, type AsyncSubscription } from "@parcel/watcher";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, relative } from "path";
import { transformSync } from "esbuild";

const SOURCE_DIR = "src";
const TARGET_DIR = "extensions/widget/assets";

/** Same deterministic transform as the bundle build: nested -> flat. */
function flatten(relPath: string): string {
  return relPath.replace(/\//g, "-").replace(/\.ts$/, ".js");
}

function compile(relPath: string): string {
  const code = readFileSync(join(SOURCE_DIR, relPath), "utf-8");
  if (relPath.endsWith(".css")) {
    return transformSync(code, { loader: "css", minify: false }).code;
  }
  return transformSync(code, {
    loader: relPath.endsWith(".ts") ? "ts" : "js",
    minify: false, // dev: skip minify for readable output + faster rebuilds
    target: "es2019",
  }).code;
}

function rebuildOne(relPath: string): void {
  if (!/\.(ts|js|css)$/.test(relPath)) return;
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });
  const out = flatten(relPath);
  writeFileSync(join(TARGET_DIR, out), compile(relPath));
  console.log(`👀 ${relPath}  →  ${out}`);
}

async function watch(): Promise<void> {
  console.log(`👀 watching ${SOURCE_DIR}/ … (Ctrl+C to stop)`);

  const sub: AsyncSubscription = await subscribe(SOURCE_DIR, (err, events) => {
    if (err) {
      console.error("watch error:", err);
      return;
    }
    for (const e of events) {
      if (e.type === "delete") continue;
      rebuildOne(relative(SOURCE_DIR, e.path));
    }
  });

  process.on("SIGINT", async () => {
    await sub.unsubscribe();
    process.exit(0);
  });
}

watch();
