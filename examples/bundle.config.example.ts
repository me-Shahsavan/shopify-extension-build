/**
 * Illustrative bundle + flatten build for Shopify theme-extension assets — the
 * release path (CI), as opposed to the watch build's per-save path.
 *
 * Goal: developers work in a nested, modular source tree (src/), but Shopify
 * requires every asset to be FLAT in the extension's assets/ folder.
 *
 * This script builds every bundle in explicit dependency order, compiles
 * TypeScript -> JS, minifies, and writes flat .bundle.js / .bundle.css files,
 * plus the individual files that Liquid references directly.
 *
 * The bundle map and the flatten transform live in build-core.ts, shared with
 * the watch build. Genericized for portfolio use — names are placeholders.
 * Run: npm run build:bundle
 */

import {
  BUNDLES,
  LIQUID_DIRECT_FILES,
  TARGET_DIR,
  assertNoFlattenCollisions,
  buildBundle,
  buildDirectFile,
} from "./build-core";

/** Release builds minify; the watch build does not. */
const MINIFY = true;

function build(): void {
  // Fail before writing anything: two sources landing on one asset name would
  // otherwise show up as a widget that mysteriously loads the wrong code.
  assertNoFlattenCollisions();

  // Direct-from-Liquid files: compiled individually, written flat.
  for (const source of LIQUID_DIRECT_FILES) {
    const target = buildDirectFile(source, MINIFY);
    if (target) console.log(`📄 ${source}  →  ${target}`);
  }

  // Bundles: concatenated in explicit order, written flat.
  for (const name of Object.keys(BUNDLES)) {
    for (const asset of buildBundle(name, MINIFY)) {
      console.log(`📦 ${asset}`);
    }
  }

  console.log("✅ flat assets written to", TARGET_DIR);
}

build();
