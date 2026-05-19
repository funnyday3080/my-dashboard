"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { db } from "@/lib/firebase";
import {
  setDoc, deleteDoc, doc, collection, onSnapshot, query, orderBy
} from "firebase/firestore";
import type { NoteFolder, NotePage } from "@/types";
import { loadFolders, saveFolders, loadNotes, saveNotes, genId } from "@/lib/localNotes";
import NoteTree from "./NoteTree";
import NoteEditor from "./NoteEditor";

export default function NotesPage() {
  const { user } = useAuthStore();
  const [folders, setFoldersState] = useState<NoteFolder[]>([]);
  const [notes, setNotesState] = useState<NotePage[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const setFolders = useCallback((data: NoteFolder[] | ((p: NoteFolder[]) => NoteFolder[])) => {
    setFoldersState(prev => {
      const next = typeof data === "function" ? data(prev) : data;
      saveFolders(next);
      return next;
    });
  }, []);

  const setNotes = useCallback((data: NotePage[] | ((p: NotePage[]) => NotePage[])) => {
    setNotesState(prev => {
      const next = typeof data === "function" ? data(prev) : data;
      saveNotes(next);
      return next;
    });
  }, []);

  // Load from localStorage, then subscribe to Firestore if logged in
  useEffect(() => {
    setFoldersState(loadFolders());
    setNotesState(loadNotes());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    const unsubFolders = onSnapshot(
      query(collection(db, "users", user.uid, "folders"), orderBy("createdAt", "asc")),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NoteFolder));
        setFoldersState(data);
        saveFolders(data);
      },
      (err) => console.error("folders 구독 오류:", err)
    );

    const unsubNotes = onSnapshot(
      query(collection(db, "users", user.uid, "notes"), orderBy("createdAt", "asc")),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotePage));
        setNotesState(data);
        saveNotes(data);
      },
      (err) => console.error("notes 구독 오류:", err)
    );

    return () => { unsubFolders(); unsubNotes(); };
  }, [user]);

  // ─── Folder actions ───────────────────────────────────────────────────────
  const addFolder = useCallback(async (name: string, parentId: string | null) => {
    const newFolder: NoteFolder = {
      id: genId(), name, parentId, order: Date.now(), createdAt: Date.now(),
    };
    setFolders(prev => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id);
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "folders", newFolder.id), newFolder); }
      catch (e) { console.error("folder 저장 오류:", e); }
    }
    return newFolder.id;
  }, [user, setFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    // 하위 폴더 포함 전체 삭제할 ID 수집
    const getAllDescendantIds = (parentId: string, allFolders: NoteFolder[]): string[] => {
      const children = allFolders.filter(f => f.parentId === parentId);
      return [parentId, ...children.flatMap(c => getAllDescendantIds(c.id, allFolders))];
    };
    const folderIds = getAllDescendantIds(id, folders);

    setFolders(prev => prev.filter(f => !folderIds.includes(f.id)));
    setNotes(prev => prev.filter(n => !folderIds.includes(n.folderId)));
    setSelectedFolderId(prev => folderIds.includes(prev ?? "") ? null : prev);
    setSelectedNoteId(prev => {
      const killed = notes.filter(n => folderIds.includes(n.folderId)).map(n => n.id);
      return killed.includes(prev ?? "") ? null : prev;
    });
    if (user && db) {
      try {
        await Promise.all(folderIds.map(fid => deleteDoc(doc(db, "users", user.uid, "folders", fid))));
        const noteIds = notes.filter(n => folderIds.includes(n.folderId)).map(n => n.id);
        await Promise.all(noteIds.map(nid => deleteDoc(doc(db, "users", user.uid, "notes", nid))));
      } catch (e) { console.error("folder 삭제 오류:", e); }
    }
  }, [user, folders, notes, setFolders, setNotes]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    if (user && db) {
      try {
        const folder = folders.find(f => f.id === id);
        if (folder) await setDoc(doc(db, "users", user.uid, "folders", id), { ...folder, name });
      } catch (e) { console.error("folder 이름 변경 오류:", e); }
    }
  }, [user, folders, setFolders]);

  // ─── Note actions ─────────────────────────────────────────────────────────
  const addNote = useCallback(async (folderId: string) => {
    const newNote: NotePage = {
      id: genId(), folderId, title: "새 노트", content: "",
      order: Date.now(), createdAt: Date.now(), updatedAt: Date.now(),
    };
    setNotes(prev => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "notes", newNote.id), newNote); }
      catch (e) { console.error("note 저장 오류:", e); }
    }
    return newNote.id;
  }, [user, setNotes]);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNoteId(prev => prev === id ? null : prev);
    if (user && db) {
      try { await deleteDoc(doc(db, "users", user.uid, "notes", id)); }
      catch (e) { console.error("note 삭제 오류:", e); }
    }
  }, [user, setNotes]);

  const updateNote = useCallback(async (id: string, data: Partial<NotePage>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data, updatedAt: Date.now() } : n));
    if (user && db) {
      try {
        const note = notes.find(n => n.id === id);
        if (note) await setDoc(doc(db, "users", user.uid, "notes", id), { ...note, ...data, updatedAt: Date.now() });
      } catch (e) { console.error("note 업데이트 오류:", e); }
    }
  }, [user, notes, setNotes]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;

  if (!loaded) return null;

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px", color: "var(--foreground)" }}>
        공부 노트
      </h2>
      <div style={{
        display: "flex", borderRadius: "12px",
        border: "1px solid var(--border)", background: "var(--card)",
        height: "calc(100vh - 160px)", overflow: "hidden",
      }}>
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
