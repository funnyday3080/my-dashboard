"use client";
import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, fontFamily, fontSize } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.setProperty("--font-family", fontFamily);
    root.style.setProperty("--font-size", `${fontSize}px`);

    if (theme === "dark" || theme === "developer") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, fontFamily, fontSize]);

  return <>{children}</>;
}
