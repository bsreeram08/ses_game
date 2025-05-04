// app/providers.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { useEffect } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Apply saved theme colors on mount
  useEffect(() => {
    const applyThemeColors = (mode: "light" | "dark") => {
      const storageKey =
        mode === "light" ? "lightThemeColors" : "darkThemeColors";
      const savedColors = localStorage.getItem(storageKey);

      if (savedColors) {
        try {
          const colors = JSON.parse(savedColors);
          const root = document.documentElement;

          Object.entries(colors).forEach(([key, value]) => {
            // Convert key from camelCase to kebab-case for CSS variables and handle chart colors
            let cssKey = key
              .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
              .toLowerCase();

            // Special handling for chart colors (chart1 -> chart-1)
            if (cssKey.startsWith("chart")) {
              cssKey = cssKey.replace("chart", "chart-");
            }
            root.style.setProperty(`--${cssKey}`, value as string);
          });
        } catch (e) {
          console.error("Error applying saved theme colors:", e);
        }
      }
    };

    // Get current theme
    const currentTheme = localStorage.getItem("theme") || "light";
    applyThemeColors(currentTheme as "light" | "dark");

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const isDark = document.documentElement.classList.contains("dark");
          applyThemeColors(isDark ? "dark" : "light");
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
