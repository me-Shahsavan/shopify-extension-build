/**
 * Illustrative watch build — the fast inner loop for local development.
 *
 * On every save it rebuilds the flat asset that Liquid actually loads: the
 * bundle that owns the changed file, or — for the few files referenced directly
 * from a .liquid template — that file's own flat counterpart. The developer
 * never thinks about flattening or about which bundle a module belongs to; they
 * just save and refresh.
 *
 * Writing the individual flat file here instead of the bundle would be faster
 * and useless: the page loads `widget-a.bundle.js`, so that is what has to be
 * fresh. The bundle map lives in build-core.ts and is shared with the release
 * build, so dev output and CI output cannot drift.
 *
 * Genericized sketch. Uses @parcel/watcher (same approach as the real system).
 * Run: npm run build:watch
 */

import { subscribe, type AsyncSubscription } from "@parcel/watcher";
import { relative, sep } from "path";
import {
  SOURCE_DIR,
  assertNoFlattenCollisions,
  bundlesContaining,
  buildBundle,
  buildDirectFile,
  isLiquidDirect,
} from "./build-core";

/** Dev builds skip minification: readable output, faster rebuilds. */
const MINIFY = false;

function rebuildFor(relPath: string): void {
  if (!/\.(ts|js|css)$/.test(relPath)) return;

  const started = Date.now();
  const owners = bundlesContaining(relPath);

  if (owners.length) {
    const written = owners.flatMap((name) => buildBundle(name, MINIFY));
    console.log(`👀 ${relPath}  →  ${written.join(", ")}  (${Date.now() - started}ms)`);
    return;
  }

  if (isLiquidDirect(relPath)) {
    const target = buildDirectFile(relPath, MINIFY);
    if (target) {
      console.log(`👀 ${relPath}  →  ${target}  (${Date.now() - started}ms)`);
    }
    return;
  }

  // Not in any bundle and not referenced from Liquid. Silence here is how a new
  // module gets written, saved, and never shipped — so say it out loud.
  console.warn(
    `⚠️  ${relPath} is not in any bundle and not referenced from Liquid — ` +
      `add it to BUNDLES or LIQUID_DIRECT_FILES in build-core.ts, or it will never reach assets/.`
  );
}

async function watch(): Promise<void> {
  assertNoFlattenCollisions();
  console.log(`👀 watching ${SOURCE_DIR}/ … (Ctrl+C to stop)`);

  const sub: AsyncSubscription = await subscribe(SOURCE_DIR, (err, events) => {
    if (err) {
      console.error("watch error:", err);
      return;
    }
    for (const e of events) {
      if (e.type === "delete") continue;
      const relPath = relative(SOURCE_DIR, e.path).split(sep).join("/");
      try {
        rebuildFor(relPath);
      } catch (compileError) {
        // A syntax error is the most common event in a watch loop. Report it and
        // keep watching — a watcher that dies on a typo is worse than no watcher,
        // because you only notice after the next save silently does nothing.
        const message =
          compileError instanceof Error ? compileError.message : String(compileError);
        console.error(`❌ ${relPath}\n${message}`);
      }
    }
  });

  process.on("SIGINT", async () => {
    await sub.unsubscribe();
    process.exit(0);
  });
}

watch();
