/** First in the bundle: everything downstream branches on which page we are on. */
(function () {
  const path = window.location.pathname;
  window.WidgetPlatform.page = path.startsWith("/products/")
    ? "product"
    : path.startsWith("/collections/")
      ? "collection"
      : "other";
})();
