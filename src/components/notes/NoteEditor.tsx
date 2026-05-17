"use client";
import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Quote, Code, Minus,
  Heading1, Heading2, Heading3,
} from "lucide-react";
import type { NotePage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  note: NotePage;
  onUpdate: (data: Partial<NotePage>) => void;
}

function ToolbarBtn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn("p-1.5 rounded-md transition hover:opacity-80", active ? "opacity-100" : "opacity-50")}
      style={{ background: active ? "var(--accent)" : "transparent", color: "var(--foreground)" }}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div style={{ width: "1px", height: "18px", margin: "0 4px", alignSelf: "center", background: "var(--border)" }} />;
}

export default function NoteEditor({ note, onUpdate }: Props) {
  const [title, setTitle] = useState(note.title);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((data: Partial<NotePage>) => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(data);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 1500);
    }, 400);
  }, [onUpdate]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
    ],
    content: (() => {
      if (!note.content) return "";
      try { return JSON.parse(note.content); } catch { return note.content; }
    })(),
    onUpdate: ({ editor }) => {
      scheduleSave({ content: JSON.stringify(editor.getJSON()) });
    },
  });

  useEffect(() => {
    if (editor && note.content) {
      try {
        const next = JSON.parse(note.content);
        const current = JSON.stringify(editor.getJSON());
        if (current !== note.content) {
          editor.commands.setContent(next);
        }
      } catch { /* ignore */ }
    }
    setTitle(note.title);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleSave({ title: val });
  };

  const setLink = () => {
    if (!editor) return;
    const url = prompt("URL을 입력하세요:", "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Title */}
      <div style={{ padding: "32px 40px 12px" }}>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          style={{
            width: "100%", fontSize: "1.75rem", fontWeight: 700,
            background: "transparent", outline: "none", border: "none",
            color: "var(--foreground)", fontFamily: "var(--font-family)",
          }}
          placeholder="제목 없음"
        />
      </div>

      {/* Toolbar */}
      <div style={{ padding: "6px 40px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px" }}>
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목1"><Heading1 size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="제목2"><Heading2 size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="제목3"><Heading3 size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게"><Bold size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임"><Italic size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄"><UnderlineIcon size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="코드"><Code size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="왼쪽"><AlignLeft size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="가운데"><AlignCenter size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="오른쪽"><AlignRight size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="불릿"><List size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호"><ListOrdered size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용"><Quote size={15} /></ToolbarBtn>
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선"><Minus size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("link")} onClick={setLink} title="링크"><LinkIcon size={15} /></ToolbarBtn>
        <ToolbarBtn active={false} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표"><TableIcon size={15} /></ToolbarBtn>

        {saveStatus && (
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>
            {saveStatus === "saving" ? "저장 중..." : "✓ 저장됨"}
          </span>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 40px 40px" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
