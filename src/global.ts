/**
 * Loaded directly from Liquid on every page, before any bundle.
 * Creates the single global namespace the bundled modules attach to.
 */
declare global {
  interface Window {
    WidgetPlatform: { page?: string; theme?: string; widgets: Record<string, unknown> };
  }
}

window.WidgetPlatform = window.WidgetPlatform || { widgets: {} };

export {};
