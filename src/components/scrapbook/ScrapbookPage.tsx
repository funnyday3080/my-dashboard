"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ExternalLink, Search, X, Tag } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { subscribeBookmarks, addBookmark, deleteBookmark } from "@/lib/firestore";
import type { Bookmark } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "비즈니스": "#2563eb",
  "마케팅":   "#7c3aed",
  "개발":     "#059669",
  "디자인":   "#db2777",
  "학습":     "#d97706",
  "뉴스":     "#0891b2",
  "기타":     "#6b7280",
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#6b7280";
}

const PRESET_CATEGORIES = Object.keys(CATEGORY_COLORS);

export default function ScrapbookPage() {
  const { user } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("전체");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "기타", memo: "" });

  useEffect(() => {
    if (!user) return;
    return subscribeBookmarks(user.uid, setBookmarks);
  }, [user]);

  const filtered = bookmarks.filter(b => {
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.url.includes(search) || b.memo?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "전체" || b.category === filterCat;
    return matchSearch && matchCat;
  });

  const allCategories = ["전체", ...Array.from(new Set(bookmarks.map(b => b.category).filter(Boolean)))];

  const handleAdd = async () => {
    if (!user || !form.title.trim()) return;
    await addBookmark(user.uid, {
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category || "기타",
      memo: form.memo.trim(),
    });
    setForm({ title: "", url: "", category: "기타", memo: "" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => user && deleteBookmark(user.uid, id);

  const ensureHttp = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>스크랩북</h2>
          <p style={{ fontSize: "0.8rem", marginTop: "2px", color: "var(--muted)" }}>
            유용한 링크와 정보를 저장하세요
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500,
            border: "none", cursor: "pointer",
            background: "var(--primary)", color: "var(--primary-fg)",
          }}>
          <Plus size={15} /> 링크 추가
        </button>
      </div>

      {/* Search + Category filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            style={{
              width: "100%", padding: "8px 12px 8px 34px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", outline: "none", fontSize: "0.875rem",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              style={{
                padding: "6px 14px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500,
                border: `1px solid ${filterCat === cat ? getCategoryColor(cat) : "var(--border)"}`,
                background: filterCat === cat ? getCategoryColor(cat) + "18" : "var(--card)",
                color: filterCat === cat ? getCategoryColor(cat) : "var(--muted)",
                cursor: "pointer",
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "16px" }}>
        총 {filtered.length}개
      </div>

      {/* Table */}
      <div style={{ borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", background: "var(--card)" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "120px 90px 1fr 160px 36px",
          gap: "0", padding: "10px 16px", fontSize: "0.75rem", fontWeight: 600,
          color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em",
          background: "var(--accent)", borderBottom: "1px solid var(--border)",
        }}>
          <span>작성일</span>
          <span>분류</span>
          <span>제목 / 링크</span>
          <span>메모</span>
          <span></span>
        </div>

        {/* Table rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", fontSize: "0.875rem", color: "var(--muted)" }}>
            저장된 링크가 없습니다
          </div>
        ) : (
          filtered.map((b, i) => (
            <div key={b.id}
              style={{
                display: "grid", gridTemplateColumns: "120px 90px 1fr 160px 36px",
                gap: "0", padding: "12px 16px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {format(new Date(b.createdAt), "yyyy.MM.dd")}
              </span>
              <span>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: "10px",
                  fontSize: "0.72rem", fontWeight: 600,
                  background: getCategoryColor(b.category) + "18",
                  color: getCategoryColor(b.category),
                }}>
                  {b.category || "기타"}
                </span>
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.title}
                </p>
                {b.url && (
                  <a href={ensureHttp(b.url)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}>
                    <ExternalLink size={11} />
                    {b.url.replace(/^https?:\/\//, "").split("/")[0]}
                  </a>
                )}
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.memo || "—"}
              </p>
              <button onClick={() => handleDelete(b.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", opacity: 0.5 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
        }} onClick={() => setShowForm(false)}>
          <div style={{
            width: "100%", maxWidth: "480px", borderRadius: "20px", padding: "24px",
            background: "var(--card)", border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>링크 추가</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>제목 *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="제목 입력"
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    border: "1px solid var(--border)", background: "var(--accent)",
                    color: "var(--foreground)", outline: "none", fontSize: "0.875rem",
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>URL</label>
                <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    border: "1px solid var(--border)", background: "var(--accent)",
                    color: "var(--foreground)", outline: "none", fontSize: "0.875rem",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>분류</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {PRESET_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                      style={{
                        padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500,
                        border: `1px solid ${form.category === cat ? getCategoryColor(cat) : "var(--border)"}`,
                        background: form.category === cat ? getCategoryColor(cat) : "transparent",
                        color: form.category === cat ? "#fff" : "var(--muted)",
                        cursor: "pointer",
                      }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>메모</label>
                <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                  placeholder="간단한 메모..."
                  rows={3}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    border: "1px solid var(--border)", background: "var(--accent)",
                    color: "var(--foreground)", outline: "none", fontSize: "0.875rem",
                    resize: "vertical", fontFamily: "var(--font-family)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.875rem" }}>
                취소
              </button>
              <button onClick={handleAdd}
                style={{ padding: "9px 22px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "var(--primary-fg)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
