/** Last in the bundle: reads the merchant's theme settings and exposes them. */
(function () {
  const root = document.documentElement;
  window.WidgetPlatform.theme = root.dataset.widgetTheme || "light";
})();
