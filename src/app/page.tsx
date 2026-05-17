"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckSquare, Calendar, BookOpen, Bookmark, Settings, ArrowRight, CheckCircle2, Clock, Circle, Flame } from "lucide-react";
import { isToday, isTomorrow, parseISO, format, startOfWeek, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuthStore } from "@/store/authStore";
import { subscribeTodos } from "@/lib/firestore";
import type { Todo, TodoStatus } from "@/types";

const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const LINKS = [
  { href: "/todo",      icon: CheckSquare, label: "할 일",    desc: "일/주/월/연 · 칸반", color: "#2563eb", bg: "#eff6ff" },
  { href: "/calendar",  icon: Calendar,    label: "캘린더",   desc: "일정 관리",           color: "#16a34a", bg: "#f0fdf4" },
  { href: "/notes",     icon: BookOpen,    label: "공부 노트", desc: "트리 구조 노트",     color: "#7c3aed", bg: "#faf5ff" },
  { href: "/scrapbook", icon: Bookmark,    label: "스크랩북", desc: "링크 & 북마크",       color: "#d97706", bg: "#fffbeb" },
  { href: "/settings",  icon: Settings,    label: "설정",     desc: "테마 · 글씨체",       color: "#6b7280", bg: "#f9fafb" },
];

const STATUS_ICON: Record<TodoStatus, React.ReactNode> = {
  todo:       <Circle size={14} color="#d1d5db" />,
  inprogress: <Clock size={14} color="#2563eb" />,
  done:       <CheckCircle2 size={14} color="#16a34a" />,
};

const CARD: React.CSSProperties = {
  borderRadius: "16px", padding: "20px",
  border: "1px solid var(--border)", background: "var(--card)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
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

  const todayTodos   = todos.filter(t => { try { return isToday(parseISO(t.date)); }    catch { return false; } });
  const tomorrowTodos = todos.filter(t => { try { return isTomorrow(parseISO(t.date)); } catch { return false; } });
  const done        = todayTodos.filter(t => t.status === "done").length;
  const inprogress  = todayTodos.filter(t => t.status === "inprogress").length;
  const pct         = todayTodos.length > 0 ? Math.round((done / todayTodos.length) * 100) : 0;

  const weekCounts = WEEK_DAYS.map((_, i) => {
    const date    = format(addDays(weekStart, i), "yyyy-MM-dd");
    const dayTodos = todos.filter(t => t.date === date);
    return { total: dayTodos.length, done: dayTodos.filter(t => t.status === "done").length };
  });

  const totalThisWeek = weekCounts.reduce((s, d) => s + d.total, 0);
  const doneThisWeek  = weekCounts.reduce((s, d) => s + d.done, 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>
            {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })}
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
            {user ? `안녕하세요, ${user.displayName?.split(" ")[0]}님 👋` : "My Dashboard"}
          </h1>
          {!user && (
            <p style={{ marginTop: "4px", fontSize: "0.82rem", color: "var(--muted)" }}>
              <Link href="/settings" style={{ color: "var(--primary)" }}>로그인</Link>하면 기기 간 동기화가 됩니다
            </p>
          )}
        </div>
        <Link href="/todo" style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px",
          borderRadius: "12px", background: "var(--primary)", color: "#fff",
          fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
        }}>
          + 할 일 추가
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "오늘 할 일", value: todayTodos.length, icon: <CheckSquare size={18} />, color: "#2563eb", bg: "#eff6ff" },
          { label: "완료",       value: done,               icon: <CheckCircle2 size={18} />, color: "#16a34a", bg: "#f0fdf4" },
          { label: "진행 중",    value: inprogress,          icon: <Clock size={18} />,        color: "#d97706", bg: "#fffbeb" },
          { label: "이번 주 달성", value: `${doneThisWeek}/${totalThisWeek}`, icon: <Flame size={18} />, color: "#7c3aed", bg: "#faf5ff" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ ...CARD, display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "2px" }}>{label}</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* Today's tasks */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>오늘 할 일</p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>진행률 {pct}%</p>
            </div>
            <div style={{ position: "relative", width: "44px", height: "44px" }}>
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--primary)" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 22 22)"
                  style={{ transition: "stroke-dashoffset 0.6s" }}
                />
              </svg>
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "var(--primary)" }}>{pct}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: "5px", borderRadius: "3px", background: "var(--border)", overflow: "hidden", marginBottom: "14px" }}>
            <div style={{ height: "100%", borderRadius: "3px", width: `${pct}%`, background: "linear-gradient(90deg, var(--primary), #60a5fa)", transition: "width 0.6s" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {todayTodos.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>오늘 할 일이 없습니다</p>
            ) : (
              todayTodos.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  {STATUS_ICON[t.status ?? "todo"]}
                  <span style={{
                    fontSize: "0.83rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: t.status === "done" ? "var(--muted)" : "var(--foreground)",
                    textDecoration: t.status === "done" ? "line-through" : "none",
                  }}>{t.title}</span>
                </div>
              ))
            )}
            {todayTodos.length > 5 && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>+{todayTodos.length - 5}개 더</p>
            )}
          </div>
          <Link href="/todo" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "14px", fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
            모두 보기 <ArrowRight size={13} />
          </Link>
        </div>

        {/* This week */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>이번 주</p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>{doneThisWeek}개 완료 / {totalThisWeek}개</p>
            </div>
            <Link href="/todo" style={{ fontSize: "0.78rem", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
              주간 플래너 →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "16px" }}>
            {WEEK_DAYS.map((day, i) => {
              const isCurrentDay = format(addDays(weekStart, i), "yyyy-MM-dd") === todayStr;
              const { total, done: d } = weekCounts[i];
              const allDone = total > 0 && d === total;
              return (
                <div key={day} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: isCurrentDay ? 700 : 400, color: isCurrentDay ? "var(--primary)" : "var(--muted)", marginBottom: "6px" }}>{day}</p>
                  <div style={{
                    height: "40px", borderRadius: "10px",
                    background: allDone ? "#16a34a20" : total > 0 ? "var(--primary)" + "12" : "var(--accent)",
                    border: isCurrentDay ? "2px solid var(--primary)" : "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {total > 0 && (
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: allDone ? "#16a34a" : "var(--primary)" }}>
                        {d}/{total}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {tomorrowTodos.length > 0 && (
            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "var(--accent)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "3px", fontWeight: 600 }}>내일 예정</p>
              <p style={{ fontSize: "0.82rem", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tomorrowTodos[0].title}{tomorrowTodos.length > 1 ? ` 외 ${tomorrowTodos.length - 1}개` : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {LINKS.map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link key={href} href={href} style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px",
            padding: "18px 16px", borderRadius: "16px",
            border: "1px solid var(--border)", background: "var(--card)",
            textDecoration: "none", transition: "all 0.15s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; el.style.borderColor = color + "60"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; el.style.borderColor = "var(--border)"; }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--foreground)", marginBottom: "3px" }}>{label}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
