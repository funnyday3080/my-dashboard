"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Trash2, Edit2, Check, X, FolderPlus, FilePlus } from "lucide-react";
import type { NoteFolder, NotePage } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { addFolder, deleteFolder, updateFolder, addPage, deletePage } from "@/lib/firestore";

interface Props {
  folders: NoteFolder[];
  pages: NotePage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  onSelectPage: (page: NotePage) => void;
  onSelectFolder: (folderId: string | null) => void;
}

function FolderNode({
  folder,
  allFolders,
  pages,
  selectedPageId,
  selectedFolderId,
  onSelectPage,
  onSelectFolder,
  depth,
}: {
  folder: NoteFolder;
  allFolders: NoteFolder[];
  pages: NotePage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  onSelectPage: (page: NotePage) => void;
  onSelectFolder: (folderId: string | null) => void;
  depth: number;
}) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const folderPages = pages.filter((p) => p.folderId === folder.id);
  const isSelected = selectedFolderId === folder.id;

  const handleRename = async () => {
    if (!user || !name.trim()) return;
    try {
      await updateFolder(user.uid, folder.id, { name: name.trim() });
      setEditing(false);
    } catch (e) {
      alert("폴더 이름 변경에 실패했습니다: " + String(e));
    }
  };

  const handleDeleteFolder = async () => {
    if (!user) return;
    if (!confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) return;
    try {
      await deleteFolder(user.uid, folder.id);
    } catch (e) {
      alert("폴더 삭제에 실패했습니다: " + String(e));
    }
  };

  return (
    <div>
      <div
        onClick={() => { onSelectFolder(folder.id); setOpen(!open); }}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 8px", paddingLeft: `${depth * 12 + 8}px`,
          borderRadius: "8px", cursor: "pointer",
          background: isSelected ? "var(--accent)" : "transparent",
          border: isSelected ? "1px solid var(--border)" : "1px solid transparent",
          transition: "all 0.15s",
        }}
        className="group"
      >
        <span style={{ color: "var(--muted)", flexShrink: 0 }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        {open
          ? <FolderOpen size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
          : <Folder size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
        }
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, fontSize: "0.8rem", padding: "1px 4px", borderRadius: "4px",
              border: "1px solid var(--border)", background: "var(--accent)",
              color: "var(--foreground)", outline: "none",
            }}
            autoFocus
          />
        ) : (
          <span style={{ flex: 1, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)" }}>
            {folder.name}
          </span>
        )}
        <div style={{ display: "flex", gap: "3px", opacity: 0 }} className="folder-actions">
          {editing ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleRename(); }} style={{ color: "var(--success)" }}><Check size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} style={{ color: "var(--muted)" }}><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ color: "var(--muted)" }} title="이름 변경"><Edit2 size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(); }} style={{ color: "var(--danger)" }} title="삭제"><Trash2 size={11} /></button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              pages={pages}
              selectedPageId={selectedPageId}
              selectedFolderId={selectedFolderId}
              onSelectPage={onSelectPage}
              onSelectFolder={onSelectFolder}
              depth={depth + 1}
            />
          ))}
          {folderPages.map((page) => (
            <PageItem
              key={page.id}
              page={page}
              selected={selectedPageId === page.id}
              onSelect={() => onSelectPage(page)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageItem({ page, selected, onSelect, depth }: { page: NotePage; selected: boolean; onSelect: () => void; depth: number }) {
  const { user } = useAuthStore();
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deletePage(user.uid, page.id);
    } catch (err) {
      alert("페이지 삭제 실패: " + String(err));
    }
  };

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "5px 8px", paddingLeft: `${depth * 12 + 8}px`,
        borderRadius: "8px", cursor: "pointer",
        background: selected ? "var(--primary)" + "15" : "transparent",
        color: selected ? "var(--primary)" : "var(--muted)",
        transition: "all 0.15s",
        fontSize: "0.82rem",
      }}
      className="group"
    >
      <FileText size={12} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selected ? 600 : 400 }}>
        {page.title}
      </span>
      <button onClick={handleDelete} style={{ color: "var(--danger)", opacity: 0, flexShrink: 0 }} className="page-delete">
        <Trash2 size={10} />
      </button>
    </div>
  );
}

export default function NoteTree({ folders, pages, selectedPageId, selectedFolderId, onSelectPage, onSelectFolder }: Props) {
  const { user } = useAuthStore();
  const rootFolders = folders.filter((f) => f.parentId === null);
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;

  const handleAddFolder = async () => {
    if (!user) { alert("로그인 후 사용 가능합니다."); return; }
    try {
      await addFolder(user.uid, {
        name: "새 폴더",
        parentId: null,
        order: rootFolders.length,
        createdAt: Date.now(),
      });
    } catch (e) {
      alert("폴더 추가 실패: " + String(e));
    }
  };

  const handleAddPage = async () => {
    if (!user) { alert("로그인 후 사용 가능합니다."); return; }
    if (!selectedFolderId) { alert("먼저 폴더를 선택하세요."); return; }
    const folderPages = pages.filter((p) => p.folderId === selectedFolderId);
    try {
      const ref = await addPage(user.uid, {
        folderId: selectedFolderId,
        title: "새 페이지",
        content: "",
        order: folderPages.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      onSelectPage({
        id: ref.id,
        folderId: selectedFolderId,
        title: "새 페이지",
        content: "",
        order: folderPages.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      alert("페이지 추가 실패: " + String(e));
    }
  };

  return (
    <div style={{ width: "220px", flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
      {/* Header with two separate action buttons */}
      <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          노트
        </p>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleAddFolder}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "7px 6px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--accent)",
              color: "var(--foreground)", cursor: "pointer", transition: "all 0.15s",
            }}
            title="폴더 추가"
          >
            <FolderPlus size={13} />
            폴더 추가
          </button>
          <button
            onClick={handleAddPage}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "7px 6px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600,
              border: "1px solid var(--border)",
              background: selectedFolderId ? "var(--primary)" : "var(--accent)",
              color: selectedFolderId ? "#fff" : "var(--muted)",
              cursor: selectedFolderId ? "pointer" : "not-allowed",
              opacity: selectedFolderId ? 1 : 0.6,
              transition: "all 0.15s",
            }}
            title={selectedFolderId ? `"${selectedFolder?.name}"에 페이지 추가` : "폴더를 먼저 선택하세요"}
          >
            <FilePlus size={13} />
            페이지 추가
          </button>
        </div>
        {selectedFolder && (
          <p style={{ marginTop: "6px", fontSize: "0.7rem", color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📂 {selectedFolder.name}
          </p>
        )}
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {rootFolders.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", paddingTop: "24px", lineHeight: 1.6 }}>
            폴더 추가 버튼으로<br />폴더를 만들어보세요
          </p>
        ) : (
          rootFolders.map((f) => (
            <FolderNode
              key={f.id}
              folder={f}
              allFolders={folders}
              pages={pages}
              selectedPageId={selectedPageId}
              selectedFolderId={selectedFolderId}
              onSelectPage={onSelectPage}
              onSelectFolder={onSelectFolder}
              depth={0}
            />
          ))
        )}
      </div>

      <style>{`
        .group:hover .folder-actions { opacity: 1 !important; }
        .group:hover .page-delete { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
