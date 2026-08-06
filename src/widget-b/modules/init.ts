/** Entry point for widget B. */
(function () {
  const roots = document.querySelectorAll<HTMLElement>("[data-widget-b]");
  window.WidgetPlatform.widgets.b = { roots: Array.from(roots) };
})();
