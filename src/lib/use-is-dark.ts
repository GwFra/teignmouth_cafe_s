import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/**
 * Whether the resolved theme is dark, i.e. `<html>` has the `dark` class set
 * by the theme selector (see lib/theme). null on the server and during
 * hydration, when it isn't known yet.
 */
export function useIsDark(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => null,
  );
}
