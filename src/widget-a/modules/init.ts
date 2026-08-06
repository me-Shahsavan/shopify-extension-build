/** Entry point for widget A — must run before controls and view attach. */
(function () {
  const roots = document.querySelectorAll<HTMLElement>("[data-widget-a]");
  window.WidgetPlatform.widgets.a = { roots: Array.from(roots), ready: roots.length > 0 };
})();
