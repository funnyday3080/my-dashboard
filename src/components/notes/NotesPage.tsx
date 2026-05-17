"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import type { NoteFolder, NotePage } from "@/types";
import { loadFolders, saveFolders, loadNotes, saveNotes, genId } from "@/lib/localNotes";
import NoteTree from "./NoteTree";
import NoteEditor from "./NoteEditor";

export default function NotesPage() {
  const { user } = useAuthStore();
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<NotePage[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setFolders(loadFolders());
    setNotes(loadNotes());
    setLoaded(true);
  }, []);

  // Persist folders to localStorage whenever they change
  useEffect(() => {
    if (!loaded) return;
    saveFolders(folders);
  }, [folders, loaded]);

  // Persist notes to localStorage whenever they change
  useEffect(() => {
    if (!loaded) return;
    saveNotes(notes);
  }, [notes, loaded]);

  // ─── Folder actions ───────────────────────────────────────────────────────
  const addFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: NoteFolder = {
      id: genId(),
      name,
      parentId,
      order: Date.now(),
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id);
    return newFolder.id;
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setNotes((prev) => prev.filter((n) => n.folderId !== id));
    setSelectedFolderId((prev) => (prev === id ? null : prev));
    setSelectedNoteId((prev) => {
      const killed = notes.filter((n) => n.folderId === id).map((n) => n.id);
      return killed.includes(prev ?? "") ? null : prev;
    });
  }, [notes]);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  // ─── Note actions ─────────────────────────────────────────────────────────
  const addNote = useCallback((folderId: string) => {
    const newNote: NotePage = {
      id: genId(),
      folderId,
      title: "새 노트",
      content: "",
      order: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    return newNote.id;
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const updateNote = useCallback((id: string, data: Partial<NotePage>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...data, updatedAt: Date.now() } : n))
    );
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  if (!loaded) return null;

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px", color: "var(--foreground)" }}>
        공부 노트
      </h2>
      <div
        style={{
          display: "flex", borderRadius: "12px",
          border: "1px solid var(--border)", background: "var(--card)",
          height: "calc(100vh - 160px)", overflow: "hidden",
        }}
      >
        <NoteTree
          folders={folders}
          notes={notes}
          selectedNoteId={selectedNoteId}
          selectedFolderId={selectedFolderId}
          onSelectNote={setSelectedNoteId}
          onSelectFolder={setSelectedFolderId}
          onAddFolder={addFolder}
          onDeleteFolder={deleteFolder}
          onRenameFolder={renameFolder}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
        />
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onUpdate={(data) => updateNote(selectedNote.id, data)}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              {selectedFolderId ? "노트를 선택하거나 추가하세요" : "왼쪽에서 폴더를 선택하세요"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
