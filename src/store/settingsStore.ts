"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, ThemeMode } from "@/types";

interface SettingsStore extends AppSettings {
  setTheme: (theme: ThemeMode) => void;
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",
      fontFamily: "NanumBarunGothic",
      fontSize: 15,
      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: "dashboard-settings" }
  )
);

export const FONT_OPTIONS = [
  { label: "나눔바른고딕 (기본)", value: "NanumBarunGothic" },
  { label: "나눔고딕", value: "NanumGothic" },
  { label: "나눔명조", value: "NanumMyeongjo" },
  { label: "맑은 고딕", value: "Malgun Gothic" },
  { label: "Noto Sans KR", value: "Noto Sans KR" },
  { label: "Inter", value: "Inter" },
  { label: "Georgia", value: "Georgia" },
];
