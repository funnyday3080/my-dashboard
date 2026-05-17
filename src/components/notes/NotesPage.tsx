"use client";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { subscribeFolders } from "@/lib/firestore";
import type { NoteFolder, NotePage } from "@/types";
import NoteTree from "./NoteTree";
import NoteEditor from "./NoteEditor";

export default function NotesPage() {
  const { user } = useAuthStore();
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [pages, setPages] = useState<NotePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotePage | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeFolders(user.uid, setFolders);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notePages"),
      orderBy("order", "asc")
    );
    return onSnapshot(q, (snap) => {
      setPages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotePage)));
    });
  }, [user]);

  const handleSelectPage = (page: NotePage) => {
    const live = pages.find((p) => p.id === page.id);
    setSelectedPage(live ?? page);
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px", color: "var(--foreground)" }}>공부 노트</h2>
      <div
        style={{
          display: "flex", borderRadius: "12px",
          border: "1px solid var(--border)", background: "var(--card)",
          height: "calc(100vh - 160px)", overflow: "hidden",
        }}
      >
        <NoteTree
          folders={folders}
          pages={pages}
          selectedPageId={selectedPage?.id ?? null}
          selectedFolderId={selectedFolderId}
          onSelectPage={handleSelectPage}
          onSelectFolder={handleSelectFolder}
        />
        {selectedPage ? (
          <NoteEditor key={selectedPage.id} page={selectedPage} />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              {selectedFolderId ? "페이지를 선택하거나 추가하세요" : "왼쪽에서 폴더를 선택하세요"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
