import { useSyncExternalStore } from "react";

/**
 * Follows the app's light/dark theme: Settings toggles the `dark` class on
 * <html>; this hook observes it so any screen can theme itself (basemaps,
 * neumorphic surfaces, …) without prop-drilling.
 */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const obs = new MutationObserver(onStoreChange);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}
