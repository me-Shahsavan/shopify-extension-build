/** Event wiring for widget A. Assumes init has populated the roots list. */
(function () {
  const state = window.WidgetPlatform.widgets.a as { roots: HTMLElement[] } | undefined;
  if (!state) return;

  for (const root of state.roots) {
    root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.matches("[data-widget-a-toggle]")) root.classList.toggle("is-open");
    });
  }
})();
