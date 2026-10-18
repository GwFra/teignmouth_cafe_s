/**
 * Light/dark theme preference. "system" (the default) follows the OS via
 * prefers-color-scheme; the resolved theme is applied as a `dark` class on
 * <html>, which the CSS tokens and Tailwind's `dark:` variant key off.
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

/**
 * Runs inline in <head> before first paint so a dark-mode visitor never sees
 * a flash of the light theme. Must stay in sync with applyTheme below.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
