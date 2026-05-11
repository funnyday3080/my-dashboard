"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckSquare, Calendar, BookOpen, Bookmark, Settings, TrendingUp, ArrowRight } from "lucide-react";
import { isToday, isTomorrow, parseISO, format, startOfWeek, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuthStore } from "@/store/authStore";
import { subscribeTodos } from "@/lib/firestore";
import type { Todo, TodoStatus } from "@/types";

const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const LINKS = [
  { href: "/todo",      icon: CheckSquare, label: "할 일",    desc: "일/주/월/연 · 칸반",    color: "#2563eb" },
  { href: "/calendar",  icon: Calendar,    label: "캘린더",   desc: "일정 관리",             color: "#16a34a" },
  { href: "/notes",     icon: BookOpen,    label: "공부 노트", desc: "트리 구조 노트",        color: "#7c3aed" },
  { href: "/scrapbook", icon: Bookmark,    label: "스크랩북", desc: "링크 & 북마크",         color: "#d97706" },
  { href: "/settings",  icon: Settings,    label: "설정",     desc: "테마 · 글씨체",         color: "#6b7280" },
];

const STATUS_META: Record<TodoStatus, { color: string; label: string }> = {
  todo:       { color: "#6b7280", label: "할 일" },
  inprogress: { color: "#2563eb", label: "진행 중" },
  done:       { color: "#16a34a", label: "완료" },
};

export default function HomePage() {
  const { user } = useAuthStore();
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeTodos(user.uid, setTodos);
  }, [user]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const todayTodos = todos.filter(t => { try { return isToday(parseISO(t.date)); } catch { return false; } });
  const tomorrowTodos = todos.filter(t => { try { return isTomorrow(parseISO(t.date)); } catch { return false; } });
  const done = todayTodos.filter(t => t.status === "done").length;
  const pct = todayTodos.length > 0 ? Math.round((done / todayTodos.length) * 100) : 0;

  // Weekly mini view — count todos per day
  const weekCounts = WEEK_DAYS.map((_, i) => {
    const date = format(addDays(weekStart, i), "yyyy-MM-dd");
    const dayTodos = todos.filter(t => t.date === date);
    const doneCnt = dayTodos.filter(t => t.status === "done").length;
    return { total: dayTodos.length, done: doneCnt };
  });

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "4px" }}>
          {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })}
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
          {user ? `안녕하세요, ${user.displayName?.split(" ")[0]}님 👋` : "My Dashboard"}
        </h1>
        {!user && (
          <p style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--muted)" }}>
            <Link href="/settings" style={{ color: "var(--primary)" }}>설정</Link>에서 Google 로그인하면 기기 간 동기화가 됩니다
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        {/* Today's progress */}
        <div style={{ borderRadius: "20px", padding: "20px", border: "1px solid var(--border)", background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={16} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)" }}>오늘 진행률</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--primary)" }}>{pct}%</span>
          </div>
          <div style={{ height: "6px", borderRadius: "4px", background: "var(--border)", overflow: "hidden", marginBottom: "14px" }}>
            <div style={{ height: "100%", borderRadius: "4px", width: `${pct}%`, background: "var(--primary)", transition: "width 0.6s" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {todayTodos.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>오늘 등록된 할 일이 없습니다</p>
            ) : (
              todayTodos.slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_META[t.status ?? "todo"].color, flexShrink: 0 }} />
                  <span style={{
                    fontSize: "0.82rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: t.status === "done" ? "var(--muted)" : "var(--foreground)",
                    textDecoration: t.status === "done" ? "line-through" : "none",
                  }}>{t.title}</span>
                </div>
              ))
            )}
            {todayTodos.length > 4 && (
              <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>+{todayTodos.length - 4}개 더</p>
            )}
          </div>
          <Link href="/todo" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "12px", fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none" }}>
            모두 보기 <ArrowRight size={13} />
          </Link>
        </div>

        {/* This week mini kanban */}
        <div style={{ borderRadius: "20px", padding: "20px", border: "1px solid var(--border)", background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)" }}>이번 주</span>
            <Link href="/todo" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>
              주간 플래너 →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {WEEK_DAYS.map((day, i) => {
              const isCurrentDay = format(addDays(weekStart, i), "yyyy-MM-dd") === todayStr;
              const { total, done: d } = weekCounts[i];
              return (
                <div key={day} style={{ textAlign: "center" }}>
                  <p style={{
                    fontSize: "0.7rem", fontWeight: isCurrentDay ? 700 : 400,
                    color: isCurrentDay ? "var(--primary)" : "var(--muted)",
                    marginBottom: "4px",
                  }}>{day}</p>
                  <div style={{
                    height: "36px", borderRadius: "8px",
                    background: total === 0 ? "var(--accent)" : d === total ? "var(--success)" + "20" : "var(--primary)" + "15",
                    border: isCurrentDay ? "2px solid var(--primary)" : "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {total > 0 && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: d === total ? "#16a34a" : "var(--primary)" }}>
                        {d}/{total}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {tomorrowTodos.length > 0 && (
            <div style={{ marginTop: "14px", padding: "8px 12px", borderRadius: "10px", background: "var(--accent)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "4px" }}>내일 ({tomorrowTodos.length}개)</p>
              <p style={{ fontSize: "0.82rem", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tomorrowTodos[0].title}{tomorrowTodos.length > 1 ? ` 외 ${tomorrowTodos.length - 1}개` : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick nav cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {LINKS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href} style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: "10px", padding: "16px", borderRadius: "16px",
            border: "1px solid var(--border)", background: "var(--card)",
            textDecoration: "none", transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <div style={{ padding: "8px", borderRadius: "10px", background: color + "18" }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--foreground)", marginBottom: "2px" }}>{label}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
