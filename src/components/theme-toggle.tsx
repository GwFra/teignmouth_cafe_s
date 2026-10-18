"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import {
  applyTheme,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

// The stored preference, read through useSyncExternalStore so every toggle
// (and other tabs, via the storage event) stays in sync. Falls back to memory
// when localStorage is unavailable, e.g. blocked site data.
const listeners = new Set<() => void>();
let memoryPreference: ThemePreference = "system";

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return memoryPreference;
  }
}

function setPreference(preference: ThemePreference) {
  memoryPreference = preference;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Keeps working for this page view via memoryPreference.
  }
  listeners.forEach((listener) => listener());
}

/** Segmented System/Light/Dark switch for the site header. */
export function ThemeToggle({ className }: { className?: string }) {
  // null on the server, where the preference is unknown; nothing is shown as
  // selected until hydration.
  const preference = useSyncExternalStore<ThemePreference | null>(
    subscribe,
    getPreference,
    () => null,
  );

  useEffect(() => {
    if (preference === null) return;
    applyTheme(preference);
    if (preference !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => applyTheme("system");
    query.addEventListener("change", onSystemChange);
    return () => query.removeEventListener("change", onSystemChange);
  }, [preference]);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn("inline-flex items-center rounded-md border p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={preference === value}
          title={label}
          onClick={() => setPreference(value)}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            preference === value && "bg-surface text-foreground shadow-sm",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
