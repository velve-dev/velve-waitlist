import { useSyncExternalStore } from "react";

const desktopQuery = "(min-width: 720px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useDesktopLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}
