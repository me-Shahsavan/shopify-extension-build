# Source tree → flat output

## What developers see (nested, modular)

Developers work in a clean, navigable tree. Related code lives together; shared
helpers are shared, not copy-pasted.

```
src/
├── global.ts                      # entry, referenced from Liquid
├── shared/
│   └── loader/
│       ├── widget-loader.ts        # referenced directly from Liquid
│       ├── widget-loader.css       # referenced directly from Liquid
│       ├── page-context.ts         # detect page type — must load first
│       ├── api-service.ts
│       ├── renderer.ts
│       └── theme-manager.ts
├── widget-a/
│   ├── modules/
│   │   ├── init.ts
│   │   └── controls.ts
│   ├── ui/
│   │   └── view.ts
│   └── styles/
│       ├── base.css
│       └── responsive.css
└── widget-b/
    ├── modules/
    │   ├── init.ts
    │   └── player.ts
    └── styles/
        └── base.css
```

## What Shopify gets (flat, bundled, minified)

Every file at the top level. Bundles concatenate their members in dependency
order; direct-from-Liquid files are flattened individually.

```
extensions/widget/assets/
├── global.js
├── shared-loader-widget-loader.js     # flattened direct file (path → dashes)
├── shared-loader-widget-loader.css
├── shared-loader.bundle.js            # page-context + api + renderer + theme
├── widget-a.bundle.js                 # init + controls + view
├── widget-a.bundle.css                # base + responsive
├── widget-b.bundle.js
└── widget-b.bundle.css
```

## The transform

| Nested source | Flat asset |
|---|---|
| `shared/loader/widget-loader.ts` | `shared-loader-widget-loader.js` |
| `widget-a/modules/init.ts` (+ siblings) | `widget-a.bundle.js` |
| `widget-a/styles/base.css` (+ responsive) | `widget-a.bundle.css` |

Two rules do all the work:

1. **Direct files**: replace `/` with `-`, `.ts` with `.js`. Readable — you can
   always see where a flat file came from. The mapping is not injective, so the
   build asserts that no two sources produce the same asset name before it writes
   anything.
2. **Bundles**: concatenate the listed files **in order**, compile, minify, emit
   one flat `.bundle.js` / `.bundle.css`. Concatenation is only valid because
   bundled modules are global-scoped IIFEs rather than ES modules — the ordering
   here *is* the dependency graph.

Both trees above are real: `npm run build:bundle` turns the first into the second.
