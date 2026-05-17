"use client";
import { useState, useEffect, useCallback } from "react";
import { format, addDays, isToday } from "date-fns";
import { Plus, Check, Target, StickyNote, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { loadWeeklyPlan, saveWeeklyPlan, genId } from "@/lib/storage";
import type { Todo, WeeklyPlan, TodoPriority } from "@/types";

const DAY_STYLES = [
  { bgLight: "#fef9c3", bgDark: "#1c1900", textLight: "#92400e", textDark: "#fde68a", label: "월요일" },
  { bgLight: "#dbeafe", bgDark: "#001230", textLight: "#1e40af", textDark: "#93c5fd", label: "화요일" },
  { bgLight: "#fce7f3", bgDark: "#1a0010", textLight: "#9d174d", textDark: "#f9a8d4", label: "수요일" },
  { bgLight: "#dcfce7", bgDark: "#001a0c", textLight: "#166534", textDark: "#86efac", label: "목요일" },
  { bgLight: "#ede9fe", bgDark: "#100820", textLight: "#4c1d95", textDark: "#c4b5fd", label: "금요일" },
  { bgLight: "#fdf4ff", bgDark: "#160820", textLight: "#6b21a8", textDark: "#e879f9", label: "토·일" },
];

interface Props {
  todos: Todo[];
  currentWeekStart: Date;
  onWeekChange: (dir: -1 | 1) => void;
  onAddTodo: (todo: Todo) => void;
  onToggleTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
}

function DayCard({ dayIndex, date, todos, isDark, onAdd, onToggle, onDelete }: {
  dayIndex: number; date: Date; todos: Todo[]; isDark: boolean;
  onAdd: (title: string) => void;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const style = DAY_STYLES[dayIndex];
  const bg = isDark ? style.bgDark : style.bgLight;
  const headerColor = isDark ? style.textDark : style.textLight;
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const isTodayDate = isToday(date);

  const handleAdd = () => {
    if (!newTitle.trim()) { setAdding(false); return; }
    onAdd(newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  return (
    <div style={{ background: bg, borderRadius: "16px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", border: isTodayDate ? `2px solid ${headerColor}` : "2px solid transparent" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: headerColor }}>{style.label}</span>
        {isTodayDate && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: headerColor, color: isDark ? "#000" : "#fff", padding: "1px 6px", borderRadius: "10px" }}>오늘</span>}
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: headerColor, opacity: 0.7 }}>{format(date, "M/d")}</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        {todos.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => onToggle(t)}
              style={{ width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, border: `1.5px solid ${t.status === "done" ? headerColor : headerColor + "60"}`, background: t.status === "done" ? headerColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {t.status === "done" && <Check size={10} color={isDark ? "#000" : "#fff"} strokeWidth={3} />}
            </button>
            <span style={{ flex: 1, fontSize: "0.82rem", color: t.status === "done" ? headerColor + "80" : isDark ? "#e5e5e5" : "#1a1a1a", textDecoration: t.status === "done" ? "line-through" : "none" }}>
              {t.title}
            </span>
            <button onClick={() => onDelete(t.id)} style={{ opacity: 0.3, cursor: "pointer", background: "none", border: "none" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}>
              <Trash2 size={11} color={headerColor} />
            </button>
          </div>
        ))}

        {adding ? (
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
            autoFocus placeholder="할 일 입력..."
            style={{ flex: 1, fontSize: "0.82rem", padding: "3px 6px", borderRadius: "6px", border: `1px solid ${headerColor}60`, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", color: isDark ? "#e5e5e5" : "#1a1a1a", outline: "none" }}
          />
        ) : (
          <button onClick={() => setAdding(true)}
            style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: headerColor, opacity: 0.7, padding: "4px 0", marginTop: "auto" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}>
            <Plus size={13} /> 추가
          </button>
        )}
      </div>
    </div>
  );
}

export default function WeeklyPlanner({ todos, currentWeekStart, onWeekChange, onAddTodo, onToggleTodo, onDeleteTodo }: Props) {
  const { user } = useAuthStore();
  const { theme } = useSettingsStore();
  const isDark = theme === "dark" || theme === "developer";
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");
  const [plan, setPlan] = useState<WeeklyPlan>({ weekKey, goals: [""], notes: "" });

  useEffect(() => {
    const local = loadWeeklyPlan(weekKey);
    setPlan(local ?? { weekKey, goals: [""], notes: "" });
  }, [weekKey]);

  const handlePlanChange = useCallback(async (updated: WeeklyPlan) => {
    setPlan(updated);
    saveWeeklyPlan(updated);
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "weeklyPlans", weekKey), { goals: updated.goals, notes: updated.notes }); }
      catch { /* ignore */ }
    }
  }, [user, weekKey]);

  const handleAddTodo = (date: Date, title: string) => {
    const newTodo: Todo = {
      id: genId(), title, completed: false, status: "todo", priority: "medium" as TodoPriority,
      date: format(date, "yyyy-MM-dd"), viewType: "daily", createdAt: Date.now(),
    };
    onAddTodo(newTodo);
  };

  const slots = [0, 1, 2, 3, 4].map(i => {
    const date = addDays(currentWeekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    return { date, dateStr, todos: todos.filter(t => t.date === dateStr) };
  });
  const satDate = addDays(currentWeekStart, 5);
  const sunDate = addDays(currentWeekStart, 6);
  const weekendTodos = todos.filter(t => t.date === format(satDate, "yyyy-MM-dd") || t.date === format(sunDate, "yyyy-MM-dd"));
  const weekLabel = `${format(currentWeekStart, "yyyy년 M월 d일")} – ${format(addDays(currentWeekStart, 6), "M월 d일")}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => onWeekChange(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px" }}><ChevronLeft size={20} /></button>
        <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--foreground)" }}>{weekLabel}</span>
        <button onClick={() => onWeekChange(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px" }}><ChevronRight size={20} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 260px", gap: "12px" }}>
        {slots.slice(0, 3).map((slot, i) => (
          <DayCard key={i} dayIndex={i} date={slot.date} todos={slot.todos} isDark={isDark}
            onAdd={(title) => handleAddTodo(slot.date, title)}
            onToggle={onToggleTodo} onDelete={onDeleteTodo}
          />
        ))}

        <div style={{ gridRow: "1 / 3", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--card)", borderRadius: "16px", padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Target size={16} color="#f59e0b" />
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>이번 주 목표</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {plan.goals.map((goal, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", minWidth: "16px" }}>{i + 1}.</span>
                  <input value={goal} onChange={e => { const g = [...plan.goals]; g[i] = e.target.value; handlePlanChange({ ...plan, goals: g }); }}
                    placeholder="목표 입력..."
                    style={{ flex: 1, fontSize: "0.82rem", background: "transparent", border: "none", outline: "none", color: "var(--foreground)", borderBottom: "1px solid var(--border)", padding: "2px 0" }}
                  />
                  {plan.goals.length > 1 && (
                    <button onClick={() => { const g = plan.goals.filter((_, idx) => idx !== i); handlePlanChange({ ...plan, goals: g.length ? g : [""] }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", opacity: 0.5 }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => handlePlanChange({ ...plan, goals: [...plan.goals, ""] })}
              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--muted)", marginTop: "10px" }}>
              <Plus size={13} /> 목표 추가
            </button>
          </div>

          <div style={{ background: "var(--card)", borderRadius: "16px", padding: "16px", border: "1px solid var(--border)", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <StickyNote size={16} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>메모</span>
            </div>
            <textarea value={plan.notes} onChange={e => handlePlanChange({ ...plan, notes: e.target.value })}
              placeholder={"이번 주 메모...\n• 주간 만트라\n• 감사한 것"}
              style={{ width: "100%", minHeight: "160px", resize: "none", background: "transparent", border: "none", outline: "none", fontSize: "0.82rem", color: "var(--foreground)", lineHeight: 1.7, fontFamily: "var(--font-family)" }}
            />
          </div>
        </div>

        {slots.slice(3, 5).map((slot, i) => (
          <DayCard key={i + 3} dayIndex={i + 3} date={slot.date} todos={slot.todos} isDark={isDark}
            onAdd={(title) => handleAddTodo(slot.date, title)}
            onToggle={onToggleTodo} onDelete={onDeleteTodo}
          />
        ))}
        <DayCard dayIndex={5} date={satDate} todos={weekendTodos} isDark={isDark}
          onAdd={(title) => handleAddTodo(satDate, title)}
          onToggle={onToggleTodo} onDelete={onDeleteTodo}
        />
      </div>
    </div>
  );
}
