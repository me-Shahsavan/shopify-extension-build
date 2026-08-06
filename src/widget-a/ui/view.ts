/** Rendering for widget A. Last in the bundle: needs both init and controls. */
(function () {
  const platform = window.WidgetPlatform;
  const state = platform.widgets.a as { roots: HTMLElement[] } | undefined;
  if (!state || platform.page !== "product") return;

  for (const root of state.roots) {
    root.classList.add("widget-root");
    root.setAttribute("data-theme", platform.theme || "light");
  }
})();
