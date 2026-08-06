/** Shared DOM helpers. Loaded after api-service so widgets can render results. */
(function () {
  const platform = window.WidgetPlatform;

  platform.widgets.render = function render(root: Element, html: string): void {
    root.innerHTML = html;
    root.removeAttribute("hidden");
  };
})();
