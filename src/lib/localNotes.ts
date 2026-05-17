import type { NoteFolder, NotePage } from "@/types";

const FOLDERS_KEY = "dash_note_folders";
const NOTES_KEY = "dash_notes";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadFolders(): NoteFolder[] {
  return load<NoteFolder[]>(FOLDERS_KEY, []);
}

export function saveFolders(folders: NoteFolder[]) {
  save(FOLDERS_KEY, folders);
}

export function loadNotes(): NotePage[] {
  return load<NotePage[]>(NOTES_KEY, []);
}

export function saveNotes(notes: NotePage[]) {
  save(NOTES_KEY, notes);
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
