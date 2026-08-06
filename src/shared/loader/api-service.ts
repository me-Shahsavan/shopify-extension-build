/** Thin fetch wrapper. Depends on page context for the storefront locale path. */
(function () {
  const platform = window.WidgetPlatform;

  platform.widgets.api = {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(path, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
      return (await res.json()) as T;
    },
  };
})();
