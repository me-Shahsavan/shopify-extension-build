# Shopify Theme-Extension Build Pipeline

**[▶ Open the animated walkthrough](https://me-shahsavan.github.io/shopify-extension-build/)**
&nbsp;·&nbsp; or open `index.html` in a browser.

A case study in fixing a slow developer inner-loop. Shopify's native hot reload
for theme app extensions is unreliable, and the asset folder must be **flat**
(no subdirectories) — together that forced developers into a slow
edit → manual build → wait loop on every change. This pipeline replaces that
with a **watch build** that recompiles a nested, modular source tree into
Shopify's flat assets the instant a file is saved.

> Illustrative reconstruction of a build system I designed and shipped. Product
> names, widget names, and business logic are genericized — this repo shows the
> **pattern and the reasoning**, not proprietary source.

---

## The problem: the inner loop was killing team velocity

Two Shopify constraints stacked on top of each other:

**1. Native hot reload for theme app extensions is unreliable.**
Shopify's CLI is supposed to hot-reload extension assets, but in practice it
often does a full-page reload instead — or logs that a file changed without the
change actually showing up. ([Shopify/cli #5488](https://github.com/Shopify/cli/issues/5488))
So developers couldn't trust "save and see it."

**2. The `assets/` folder must be flat.**
Every file has to sit at the top level — no subdirectories. Assets are referenced
by flat filename via the block's `javascript`/`stylesheet` schema or `asset_url`,
so a nested layout simply doesn't work.

Put together, the daily reality was:

```
edit a file  →  run a manual build  →  wait  →  refresh  →  maybe see it
                ▲ every single change, every developer
```

For a widget platform that's thousands of lines across many modules, that loop
ran dozens of times a day per developer. It was the single biggest drag on how
fast the team could ship.

## The solution: a watch build that makes the loop instant

The fix was to stop fighting either constraint and absorb both in one place — a
**watch build** that owns the nested → flat compilation and runs it
automatically on every save.

```
  Developer just saves.                    The watch build, on each save:
  (nested, modular source)                 ─────────────────────────────
  src/                                      1. detect the changed file
    shared/loader/renderer.ts   ──save──►   2. compile TS → JS
    widget-a/modules/init.ts                3. flatten path → flat filename
                                            4. write into assets/  (~tens of ms)
                                            ▼
                                       assets/  (flat, ready)
                                         shared-loader.bundle.js
                                         widget-a.bundle.js
```

| | Before | After |
|---|---|---|
| Trigger | manual build, every change | automatic, on save |
| Feedback loop | edit → build → wait → refresh | save → it's already there |
| Reliability | Shopify hot reload flaky / full-page reload | deterministic, every time |
| Source layout | forced flat (unmaintainable) | nested & modular (build flattens it) |

Three commands cover the lifecycle:

| Command | What it does | Who uses it |
|---|---|---|
| `build:watch` | Watches the source tree, recompiles + flattens **only the changed file** on save | Internal devs (the fast inner loop) |
| `build:bundle` | Concatenates files **in dependency order**, compiles TS→JS, minifies, writes flat `.bundle.js` / `.bundle.css` | CI / release |
| `build:release` | `bundle` + obfuscate for production | Release |

## Key design decisions

**1. Watch is a first-class developer experience, not an afterthought.**
The inner loop determines daily velocity, so the watch build is built for speed:
it recompiles only the file that changed and writes its flat counterpart in
place. The developer never thinks about flattening — they just save.

**2. Flattening is a deterministic, reversible path transform.**
A nested path becomes a flat filename by replacing separators:
`shared/loader/resource-loader.ts` → `shared-loader-resource-loader.js`.
Collision-free and readable — you can always trace a flat asset back to its source.

**3. Order is explicit, not globbed.**
Some modules must load before others (a shared loader before the widgets that use
it). Bundle definitions list files in explicit dependency order — implicit
ordering is exactly what breaks silently in production.

**4. Two file classes, handled differently.**
Most files get bundled. A few are referenced directly from Liquid templates and
can't be — they're copied and compiled individually. The config makes that split
visible rather than buried.

## Why this is a product decision, not just a build script

The constraints are Shopify's, but the **cost** lands on developers — and a slow,
unreliable inner loop quietly taxes every feature shipped afterward. The pipeline
is where that cost gets paid **once, centrally**, instead of by every developer on
every change. The trade I chose: add one build step to maintain, to buy an inner
loop that's fast and trustworthy. For a growing widget platform, that compounds
on every change the team makes.

## What's in this repo

```
README.md
index.html                     # animated walkthrough (open in a browser)
examples/
  watch.example.ts             # the watch build — the core of the story
  bundle.config.example.ts     # release bundle/flatten config (genericized)
  source-tree.md               # nested source → flat output
```

The examples are intentionally small and neutral — they demonstrate the watch
loop, the flattening transform, and explicit-order bundling, without any
proprietary code.
