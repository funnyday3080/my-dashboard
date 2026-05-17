import type { Todo, CalendarEvent, Bookmark } from "@/types";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export const loadTodos     = () => load<Todo>("dash_todos");
export const saveTodos     = (d: Todo[]) => save("dash_todos", d);

export const loadEvents    = () => load<CalendarEvent>("dash_events");
export const saveEvents    = (d: CalendarEvent[]) => save("dash_events", d);

export const loadBookmarks = () => load<Bookmark>("dash_bookmarks");
export const saveBookmarks = (d: Bookmark[]) => save("dash_bookmarks", d);

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
