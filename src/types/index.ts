export type TodoStatus = "todo" | "inprogress" | "done";
export type TodoPriority = "low" | "medium" | "high";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  status: TodoStatus;
  priority: TodoPriority;
  date: string; // YYYY-MM-DD
  viewType: "daily" | "weekly" | "monthly" | "yearly";
  createdAt: number;
}

export interface WeeklyPlan {
  weekKey: string;
  goals: string[];
  notes: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  memo: string;
  createdAt: number;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
}

export interface NotePage {
  id: string;
  folderId: string;
  title: string;
  content: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
}

export type ThemeMode = "light" | "dark" | "developer";

export interface AppSettings {
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number;
}
