/**
 * Referenced directly from a .liquid block (not bundled), because the block
 * needs it before it knows which widget bundle to request.
 */
(function () {
  const platform = window.WidgetPlatform;

  platform.widgets.load = function load(name: string): void {
    const existing = document.querySelector(`script[data-widget="${name}"]`);
    if (existing) return;

    const el = document.createElement("script");
    el.dataset.widget = name;
    el.src = `/assets/${name}.bundle.js`;
    el.defer = true;
    document.head.appendChild(el);
  };
})();
