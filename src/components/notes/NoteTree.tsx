"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Trash2, Edit2, Check, X, FolderPlus, FilePlus } from "lucide-react";
import type { NoteFolder, NotePage } from "@/types";

interface Props {
  folders: NoteFolder[];
  notes: NotePage[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onAddFolder: (name: string, parentId: string | null) => string | Promise<string>;
  onDeleteFolder: (id: string) => void | Promise<void>;
  onRenameFolder: (id: string, name: string) => void | Promise<void>;
  onAddNote: (folderId: string) => string | Promise<string>;
  onDeleteNote: (id: string) => void | Promise<void>;
}

function FolderNode({
  folder, allFolders, notes, selectedNoteId, selectedFolderId,
  onSelectNote, onSelectFolder, onAddFolder, onDeleteFolder, onRenameFolder, onAddNote, onDeleteNote, depth,
}: {
  folder: NoteFolder;
  allFolders: NoteFolder[];
  notes: NotePage[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onAddFolder: (name: string, parentId: string | null) => string | Promise<string>;
  onDeleteFolder: (id: string) => void | Promise<void>;
  onRenameFolder: (id: string, name: string) => void | Promise<void>;
  onAddNote: (folderId: string) => string | Promise<string>;
  onDeleteNote: (id: string) => void | Promise<void>;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const children = allFolders.filter((f) => f.parentId === folder.id);
  const folderNotes = notes.filter((n) => n.folderId === folder.id);
  const isSelected = selectedFolderId === folder.id;

  const handleRename = () => {
    if (!name.trim()) return;
    onRenameFolder(folder.id, name.trim());
    setEditing(false);
  };

  return (
    <div>
      <div
        onClick={() => { onSelectFolder(folder.id); setOpen((p) => !p); }}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 8px", paddingLeft: `${depth * 14 + 8}px`,
          borderRadius: "8px", cursor: "pointer",
          background: isSelected ? "var(--accent)" : "transparent",
          border: isSelected ? "1px solid var(--border)" : "1px solid transparent",
          transition: "background 0.1s",
        }}
        className="folder-row"
      >
        <span style={{ color: "var(--muted)", flexShrink: 0, lineHeight: 0 }}>
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
              border: "1px solid var(--border)", background: "var(--bg)",
              color: "var(--foreground)", outline: "none",
            }}
            autoFocus
          />
        ) : (
          <span style={{
            flex: 1, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", color: "var(--foreground)",
          }}>
            {folder.name}
            <span style={{ marginLeft: "4px", fontSize: "0.68rem", color: "var(--muted)" }}>
              {folderNotes.length > 0 ? folderNotes.length : ""}
            </span>
          </span>
        )}
        <div className="folder-actions" style={{ display: "flex", gap: "2px" }}>
          {editing ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleRename(); }} style={{ color: "var(--success)", padding: "2px" }}><Check size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} style={{ color: "var(--muted)", padding: "2px" }}><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ color: "var(--muted)", padding: "2px" }} title="이름 변경"><Edit2 size={11} /></button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) onDeleteFolder(folder.id); }} style={{ color: "var(--danger)", padding: "2px" }} title="삭제"><Trash2 size={11} /></button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id} folder={child} allFolders={allFolders} notes={notes}
              selectedNoteId={selectedNoteId} selectedFolderId={selectedFolderId}
              onSelectNote={onSelectNote} onSelectFolder={onSelectFolder}
              onAddFolder={onAddFolder} onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder} onAddNote={onAddNote} onDeleteNote={onDeleteNote}
              depth={depth + 1}
            />
          ))}
          {folderNotes.map((note) => (
            <NoteItem
              key={note.id} note={note}
              selected={selectedNoteId === note.id}
              onSelect={() => onSelectNote(note.id)}
              onDelete={() => onDeleteNote(note.id)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteItem({ note, selected, onSelect, onDelete, depth }: {
  note: NotePage; selected: boolean; onSelect: () => void; onDelete: () => void; depth: number;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "5px 8px", paddingLeft: `${depth * 14 + 8}px`,
        borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem",
        background: selected ? "var(--primary)" + "18" : "transparent",
        color: selected ? "var(--primary)" : "var(--muted)",
        fontWeight: selected ? 600 : 400,
        transition: "background 0.1s",
      }}
      className="note-row"
    >
      <FileText size={12} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {note.title || "제목 없음"}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="note-delete"
        style={{ color: "var(--danger)", padding: "2px", lineHeight: 0 }}
        title="삭제"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

export default function NoteTree({
  folders, notes, selectedNoteId, selectedFolderId,
  onSelectNote, onSelectFolder, onAddFolder, onDeleteFolder, onRenameFolder, onAddNote, onDeleteNote,
}: Props) {
  const rootFolders = folders.filter((f) => f.parentId === null);
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;

  const handleAddFolder = () => {
    onAddFolder("새 폴더", null);
  };

  const handleAddNote = () => {
    if (!selectedFolderId) {
      alert("먼저 폴더를 선택하세요.");
      return;
    }
    onAddNote(selectedFolderId);
  };

  return (
    <div style={{ width: "220px", flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
      {/* Action buttons */}
      <div style={{ padding: "12px 10px 10px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          노트
        </p>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleAddFolder}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              padding: "7px 4px", borderRadius: "8px", fontSize: "0.74rem", fontWeight: 600,
              border: "1px solid var(--border)", background: "var(--accent)",
              color: "var(--foreground)", cursor: "pointer",
            }}
          >
            <FolderPlus size={13} /> 폴더 추가
          </button>
          <button
            onClick={handleAddNote}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              padding: "7px 4px", borderRadius: "8px", fontSize: "0.74rem", fontWeight: 600,
              border: `1px solid ${selectedFolderId ? "var(--primary)" : "var(--border)"}`,
              background: selectedFolderId ? "var(--primary)" : "var(--accent)",
              color: selectedFolderId ? "#fff" : "var(--muted)",
              cursor: "pointer",
              opacity: selectedFolderId ? 1 : 0.55,
            }}
          >
            <FilePlus size={13} /> 노트 추가
          </button>
        </div>
        {selectedFolder && (
          <p style={{ marginTop: "6px", fontSize: "0.7rem", color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📂 {selectedFolder.name}
          </p>
        )}
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {rootFolders.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", paddingTop: "28px", lineHeight: 1.8 }}>
            폴더 추가 버튼으로<br />시작하세요
          </p>
        ) : (
          rootFolders.map((f) => (
            <FolderNode
              key={f.id} folder={f} allFolders={folders} notes={notes}
              selectedNoteId={selectedNoteId} selectedFolderId={selectedFolderId}
              onSelectNote={onSelectNote} onSelectFolder={onSelectFolder}
              onAddFolder={onAddFolder} onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder} onAddNote={onAddNote} onDeleteNote={onDeleteNote}
              depth={0}
            />
          ))
        )}
      </div>

      <style>{`
        .folder-row .folder-actions { opacity: 0; transition: opacity 0.15s; }
        .folder-row:hover .folder-actions { opacity: 1; }
        .note-row .note-delete { opacity: 0; transition: opacity 0.15s; }
        .note-row:hover .note-delete { opacity: 1; }
      `}</style>
    </div>
  );
}
