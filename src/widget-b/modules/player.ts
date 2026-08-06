/** Media behavior for widget B. Depends on init having found the roots. */
(function () {
  const state = window.WidgetPlatform.widgets.b as { roots: HTMLElement[] } | undefined;
  if (!state) return;

  for (const root of state.roots) {
    const video = root.querySelector("video");
    if (video) video.addEventListener("play", () => root.classList.add("is-playing"));
  }
})();
