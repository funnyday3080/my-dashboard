"use client";
import { useEffect, useCallback, useState } from "react";
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
import { useAuthStore } from "@/store/authStore";
import { updatePage } from "@/lib/firestore";
import { cn } from "@/lib/utils";

interface Props {
  page: NotePage;
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
  return <div className="w-px h-5 mx-1 self-center" style={{ background: "var(--border)" }} />;
}

export default function NoteEditor({ page }: Props) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState(page.title);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

  const saveContent = useCallback(
    async (content: string) => {
      if (!user) return;
      setSaveStatus("saving");
      await updatePage(user.uid, page.id, { content, updatedAt: Date.now() });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 1500);
    },
    [user, page.id]
  );

  const saveTitle = useCallback(
    async (t: string) => {
      if (!user) return;
      await updatePage(user.uid, page.id, { title: t, updatedAt: Date.now() });
    },
    [user, page.id]
  );

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
    content: page.content ? JSON.parse(page.content) : "",
    onUpdate: ({ editor }) => {
      const content = JSON.stringify(editor.getJSON());
      saveContent(content);
    },
  });

  useEffect(() => {
    if (editor && page.content) {
      const current = JSON.stringify(editor.getJSON());
      if (current !== page.content) {
        editor.commands.setContent(JSON.parse(page.content));
      }
    }
    setTitle(page.title);
  }, [page.id]);

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

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (!editor) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-8 pt-8 pb-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveTitle(title)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-full text-3xl font-bold bg-transparent outline-none"
          style={{ color: "var(--foreground)", fontFamily: "var(--font-family)" }}
          placeholder="제목 없음"
        />
      </div>

      {/* Toolbar */}
      <div className="px-8 py-1.5 border-b flex items-center flex-wrap gap-0.5" style={{ borderColor: "var(--border)" }}>
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목1"><Heading1 size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="제목2"><Heading2 size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="제목3"><Heading3 size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게"><Bold size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임"><Italic size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄"><UnderlineIcon size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="코드"><Code size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="왼쪽 정렬"><AlignLeft size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="가운데 정렬"><AlignCenter size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="오른쪽 정렬"><AlignRight size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="불릿 리스트"><List size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 리스트"><ListOrdered size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용문"><Quote size={15} /></ToolbarBtn>
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선"><Minus size={15} /></ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn active={editor.isActive("link")} onClick={setLink} title="링크"><LinkIcon size={15} /></ToolbarBtn>
        <ToolbarBtn active={false} onClick={insertTable} title="표 삽입"><TableIcon size={15} /></ToolbarBtn>

        {saveStatus && (
          <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
            {saveStatus === "saving" ? "저장 중..." : "저장됨"}
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
