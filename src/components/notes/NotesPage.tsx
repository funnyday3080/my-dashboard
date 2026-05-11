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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--foreground)" }}>공부 노트</h2>
      <div
        className="flex rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--card)", height: "calc(100vh - 160px)" }}
      >
        <NoteTree
          folders={folders}
          pages={pages}
          selectedPageId={selectedPage?.id ?? null}
          onSelectPage={handleSelectPage}
        />
        {selectedPage ? (
          <NoteEditor key={selectedPage.id} page={selectedPage} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
            왼쪽에서 페이지를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
