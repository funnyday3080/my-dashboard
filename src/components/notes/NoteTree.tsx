"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Trash2, FileText, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteFolder, NotePage } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { addFolder, deleteFolder, updateFolder, addPage, deletePage } from "@/lib/firestore";

interface Props {
  folders: NoteFolder[];
  pages: NotePage[];
  selectedPageId: string | null;
  onSelectPage: (page: NotePage) => void;
}

function FolderNode({
  folder,
  allFolders,
  pages,
  selectedPageId,
  onSelectPage,
  depth,
}: {
  folder: NoteFolder;
  allFolders: NoteFolder[];
  pages: NotePage[];
  selectedPageId: string | null;
  onSelectPage: (page: NotePage) => void;
  depth: number;
}) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const folderPages = pages.filter((p) => p.folderId === folder.id);

  const handleRename = async () => {
    if (!user || !name.trim()) return;
    await updateFolder(user.uid, folder.id, { name: name.trim() });
    setEditing(false);
  };

  const handleDeleteFolder = async () => {
    if (!user) return;
    if (!confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) return;
    await deleteFolder(user.uid, folder.id);
  };

  const handleAddPage = async () => {
    if (!user) return;
    const ref = await addPage(user.uid, {
      folderId: folder.id,
      title: "새 페이지",
      content: "",
      order: folderPages.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    onSelectPage({
      id: ref.id,
      folderId: folder.id,
      title: "새 페이지",
      content: "",
      order: folderPages.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const handleAddSubFolder = async () => {
    if (!user) return;
    await addFolder(user.uid, {
      name: "새 폴더",
      parentId: folder.id,
      order: children.length,
      createdAt: Date.now(),
    });
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-2 rounded-md group cursor-pointer hover:opacity-80 transition"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button onClick={() => setOpen(!open)} className="flex-shrink-0" style={{ color: "var(--muted)" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open ? <FolderOpen size={14} style={{ color: "var(--primary)", flexShrink: 0 }} /> : <Folder size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />}
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-sm px-1 rounded outline-none"
            style={{ background: "var(--accent)", color: "var(--foreground)" }}
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm truncate" style={{ color: "var(--foreground)" }} onClick={() => setOpen(!open)}>
            {folder.name}
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          {editing ? (
            <>
              <button onClick={handleRename} style={{ color: "var(--success)" }}><Check size={12} /></button>
              <button onClick={() => setEditing(false)} style={{ color: "var(--muted)" }}><X size={12} /></button>
            </>
          ) : (
            <>
              <button onClick={handleAddPage} title="페이지 추가" style={{ color: "var(--muted)" }}><Plus size={12} /></button>
              <button onClick={handleAddSubFolder} title="하위 폴더" style={{ color: "var(--muted)" }}><Folder size={11} /></button>
              <button onClick={() => setEditing(true)} style={{ color: "var(--muted)" }}><Edit2 size={11} /></button>
              <button onClick={handleDeleteFolder} style={{ color: "var(--danger)" }}><Trash2 size={11} /></button>
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
              onSelectPage={onSelectPage}
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
    await deletePage(user.uid, page.id);
  };

  return (
    <div
      className={cn("flex items-center gap-2 py-0.5 px-2 rounded-md group cursor-pointer transition", selected ? "font-medium" : "hover:opacity-80")}
      style={{
        paddingLeft: `${depth * 12 + 8}px`,
        background: selected ? "var(--accent)" : "transparent",
        color: selected ? "var(--foreground)" : "var(--muted)",
      }}
      onClick={onSelect}
    >
      <FileText size={13} style={{ flexShrink: 0 }} />
      <span className="flex-1 text-sm truncate">{page.title}</span>
      <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--danger)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function NoteTree({ folders, pages, selectedPageId, onSelectPage }: Props) {
  const { user } = useAuthStore();
  const rootFolders = folders.filter((f) => f.parentId === null);

  const handleAddRoot = async () => {
    if (!user) return;
    await addFolder(user.uid, {
      name: "새 폴더",
      parentId: null,
      order: rootFolders.length,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="w-52 flex-shrink-0 border-r pr-2 py-2 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>노트</span>
        <button onClick={handleAddRoot} className="hover:opacity-70 transition" style={{ color: "var(--muted)" }}>
          <Plus size={14} />
        </button>
      </div>
      {rootFolders.map((f) => (
        <FolderNode
          key={f.id}
          folder={f}
          allFolders={folders}
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          depth={0}
        />
      ))}
      {rootFolders.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>+ 버튼으로 폴더를 추가하세요</p>
      )}
    </div>
  );
}
