import { useEffect, useRef, useCallback } from "react";
import type { Theme } from "./types.ts";

const STORAGE_KEY_THEME = "subtitle-renamer.theme";
const STORAGE_KEY_LOCALE = "subtitle-renamer.locale";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadThemePreference(): Theme {
  const stored = readStorage(STORAGE_KEY_THEME);
  if (stored === "system" || stored === "light" || stored === "dark") return stored;
  if (stored !== null) removeStorage(STORAGE_KEY_THEME);
  return "dark";
}

export function saveThemePreference(theme: Theme): void {
  writeStorage(STORAGE_KEY_THEME, theme);
}

export function loadLocalePreference(): "en" | "pt-BR" | null {
  const stored = readStorage(STORAGE_KEY_LOCALE);
  if (stored === "en") return "en";
  if (stored !== null && stored.toLowerCase() === "pt-br") return "pt-BR";
  if (stored !== null) removeStorage(STORAGE_KEY_LOCALE);
  return null;
}

export function saveLocalePreference(locale: "en" | "pt-BR"): void {
  writeStorage(STORAGE_KEY_LOCALE, locale);
}

export function clearLocalePreference(): void {
  removeStorage(STORAGE_KEY_LOCALE);
}

/** Returns the system dark-mode state and subscribes to changes. */
export function useSystemTheme(
  onChange: (isDark: boolean) => void,
): "light" | "dark" {
  const query = useRef<MediaQueryList | null>(null);
  if (query.current === null && typeof window.matchMedia === "function") {
    try {
      query.current = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      query.current = null;
    }
  }

  const stableOnChange = useCallback(onChange, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mq = query.current;
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => stableOnChange(e.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (typeof (mq as { addListener?: (fn: unknown) => void }).addListener === "function") {
      (mq as { addListener: (fn: unknown) => void }).addListener(handler);
      return () => (mq as { removeListener: (fn: unknown) => void }).removeListener(handler);
    }
  }, [stableOnChange]);

  return query.current?.matches ? "dark" : "light";
}
