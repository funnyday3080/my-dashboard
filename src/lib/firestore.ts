import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, setDoc, getDoc, getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import type { Todo, NoteFolder, NotePage, CalendarEvent, Bookmark, WeeklyPlan } from "@/types";

// ─── Todos ────────────────────────────────────────────────────────────────────
export function subscribeTodos(uid: string, callback: (todos: Todo[]) => void) {
  const q = query(collection(db, "users", uid, "todos"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({
      id: d.id, status: "todo", priority: "medium", ...d.data(),
    } as Todo)));
  });
}

export async function addTodo(uid: string, todo: Omit<Todo, "id" | "createdAt">) {
  await addDoc(collection(db, "users", uid, "todos"), { ...todo, createdAt: Date.now() });
}

export async function updateTodo(uid: string, id: string, data: Partial<Todo>) {
  await updateDoc(doc(db, "users", uid, "todos", id), data);
}

export async function deleteTodo(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "todos", id));
}

// ─── Weekly Plan ──────────────────────────────────────────────────────────────
export async function getWeeklyPlan(uid: string, weekKey: string): Promise<WeeklyPlan | null> {
  const ref = doc(db, "users", uid, "weeklyPlans", weekKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { weekKey, ...snap.data() } as WeeklyPlan;
}

export async function saveWeeklyPlan(uid: string, plan: WeeklyPlan) {
  const ref = doc(db, "users", uid, "weeklyPlans", plan.weekKey);
  await setDoc(ref, { goals: plan.goals, notes: plan.notes }, { merge: true });
}

// ─── Calendar Events ──────────────────────────────────────────────────────────
export function subscribeEvents(uid: string, callback: (events: CalendarEvent[]) => void) {
  const q = query(collection(db, "users", uid, "events"), orderBy("start", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)));
  });
}

export async function addEvent(uid: string, event: Omit<CalendarEvent, "id">) {
  await addDoc(collection(db, "users", uid, "events"), event);
}

export async function updateEvent(uid: string, id: string, data: Partial<CalendarEvent>) {
  await updateDoc(doc(db, "users", uid, "events", id), data);
}

export async function deleteEvent(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "events", id));
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export function subscribeBookmarks(uid: string, callback: (bookmarks: Bookmark[]) => void) {
  const q = query(collection(db, "users", uid, "bookmarks"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bookmark)));
  });
}

export async function addBookmark(uid: string, bookmark: Omit<Bookmark, "id" | "createdAt">) {
  await addDoc(collection(db, "users", uid, "bookmarks"), { ...bookmark, createdAt: Date.now() });
}

export async function updateBookmark(uid: string, id: string, data: Partial<Bookmark>) {
  await updateDoc(doc(db, "users", uid, "bookmarks", id), data);
}

export async function deleteBookmark(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "bookmarks", id));
}

// ─── Note Folders ─────────────────────────────────────────────────────────────
export function subscribeFolders(uid: string, callback: (folders: NoteFolder[]) => void) {
  const q = query(collection(db, "users", uid, "noteFolders"), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NoteFolder)));
  });
}

export async function addFolder(uid: string, folder: Omit<NoteFolder, "id">) {
  await addDoc(collection(db, "users", uid, "noteFolders"), folder);
}

export async function updateFolder(uid: string, id: string, data: Partial<NoteFolder>) {
  await updateDoc(doc(db, "users", uid, "noteFolders", id), data);
}

export async function deleteFolder(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "noteFolders", id));
}

// ─── Note Pages ───────────────────────────────────────────────────────────────
export function subscribePages(uid: string, folderId: string, callback: (pages: NotePage[]) => void) {
  const q = query(
    collection(db, "users", uid, "notePages"),
    where("folderId", "==", folderId),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotePage)));
  });
}

export async function addPage(uid: string, page: Omit<NotePage, "id">) {
  return await addDoc(collection(db, "users", uid, "notePages"), page);
}

export async function updatePage(uid: string, id: string, data: Partial<NotePage>) {
  await updateDoc(doc(db, "users", uid, "notePages", id), data);
}

export async function deletePage(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "notePages", id));
}

export async function getAllPages(uid: string): Promise<NotePage[]> {
  const q = query(collection(db, "users", uid, "notePages"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotePage));
}
