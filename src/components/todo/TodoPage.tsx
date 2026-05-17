"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, isWithinInterval, parseISO, isToday, isTomorrow, addDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, Check, LayoutGrid, List, CalendarDays, ChevronLeft, ChevronRight, Flag, Circle, Send } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuthStore } from "@/store/authStore";
import { db } from "@/lib/firebase";
import { setDoc, deleteDoc, doc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { loadTodos, saveTodos, genId } from "@/lib/storage";
import { isKakaoLoggedIn, sendKakaoMessage } from "@/lib/kakao";
import type { Todo, TodoStatus, TodoPriority } from "@/types";
import { cn } from "@/lib/utils";
import WeeklyPlanner from "./WeeklyPlanner";

type TimeView = "daily" | "weekly" | "monthly" | "yearly";
type DisplayMode = "list" | "kanban" | "weekly";

const TIME_VIEWS: { key: TimeView; label: string }[] = [
  { key: "daily", label: "일간" },
  { key: "weekly", label: "주간" },
  { key: "monthly", label: "월간" },
  { key: "yearly", label: "연간" },
];

const KANBAN_COLS: { key: TodoStatus; label: string; color: string }[] = [
  { key: "todo",       label: "시작 전", color: "#6b7280" },
  { key: "inprogress", label: "진행 중", color: "#2563eb" },
  { key: "done",       label: "완료",    color: "#16a34a" },
];

const PRIORITY_META: Record<TodoPriority, { label: string; color: string }> = {
  high:   { label: "높음", color: "#dc2626" },
  medium: { label: "중간", color: "#d97706" },
  low:    { label: "낮음", color: "#6b7280" },
};

function getRange(view: TimeView, date: Date) {
  if (view === "daily")   return { start: date, end: date };
  if (view === "weekly")  return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
  if (view === "monthly") return { start: startOfMonth(date), end: endOfMonth(date) };
  return { start: startOfYear(date), end: endOfYear(date) };
}

function getRangeLabel(view: TimeView, date: Date) {
  if (view === "daily")   return format(date, "yyyy년 M월 d일 (EEEE)", { locale: ko });
  if (view === "weekly") {
    const { start, end } = getRange(view, date);
    return `${format(start, "M월 d일")} – ${format(end, "M월 d일")}`;
  }
  if (view === "monthly") return format(date, "yyyy년 M월", { locale: ko });
  return format(date, "yyyy년", { locale: ko });
}

function TodoCard({ todo, onToggle, onDelete, dragging }: {
  todo: Todo; onToggle: () => void; onDelete: () => void; dragging?: boolean;
}) {
  const isDone = todo.status === "done";
  const p = PRIORITY_META[todo.priority ?? "medium"];
  return (
    <div className="group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{ background: "var(--card)", borderColor: dragging ? "var(--primary)" : "var(--border)", boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.12)" : undefined }}>
      <button onClick={onToggle}
        className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{ borderColor: isDone ? "var(--success)" : "var(--border)", background: isDone ? "var(--success)" : "transparent" }}>
        {isDone && <Check size={10} strokeWidth={3} color="white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", isDone && "line-through")} style={{ color: isDone ? "var(--muted)" : "var(--foreground)" }}>{todo.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: p.color + "18", color: p.color }}>
            <Flag size={9} className="inline mr-0.5" />{p.label}
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>{format(parseISO(todo.date), "M/d")}</span>
        </div>
      </div>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity" style={{ color: "var(--danger)" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function TodoPage() {
  const { user } = useAuthStore();
  const [, setTodosState] = useState<Todo[]>([]);
  const todosRef = useRef<Todo[]>([]);
  const [timeView, setTimeView] = useState<TimeView>("daily");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium");
  const [kakaoStatus, setKakaoStatus] = useState<"" | "sending" | "ok" | "err">("");

  // localStorage → state를 항상 통해 저장
  const setTodos = useCallback((todos: Todo[] | ((prev: Todo[]) => Todo[])) => {
    setTodosState(prev => {
      const next = typeof todos === "function" ? todos(prev) : todos;
      todosRef.current = next;
      saveTodos(next);
      return next;
    });
  }, []);

  // 초기 로드: localStorage 즉시 → 로그인 시 Firestore 구독
  useEffect(() => {
    const local = loadTodos();
    setTodosState(local);
    todosRef.current = local;

    if (!db || !user) return;

    const q = query(collection(db, "users", user.uid, "todos"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q,
      (snap) => {
        const firestoreTodos = snap.docs.map(d => ({ id: d.id, status: "todo", priority: "medium", ...d.data() } as Todo));
        setTodosState(firestoreTodos);
        todosRef.current = firestoreTodos;
        saveTodos(firestoreTodos);
      },
      (err) => console.error("todos 구독 오류:", err)
    );
    return unsub;
  }, [user]);

  // Firestore 백그라운드 동기화
  const syncToFirestore = useCallback(async (updated: Todo[]) => {
    if (!db || !user) return;
    for (const t of updated) {
      try {
        await setDoc(doc(db, "users", user.uid, "todos", t.id), t);
      } catch (e) { console.error("Firestore 동기화 오류:", e); }
    }
  }, [user]);

  // 카카오 알림
  useEffect(() => {
    const check = () => {
      try {
        const saved = localStorage.getItem("kakaoReminder");
        if (!saved) return;
        const { enabled, time } = JSON.parse(saved);
        if (!enabled || !time || !isKakaoLoggedIn()) return;
        const lastSent = localStorage.getItem("kakaoLastSent");
        const today = format(new Date(), "yyyy-MM-dd");
        if (lastSent === today) return;
        const [h, m] = (time as string).split(":").map(Number);
        const now = new Date();
        if (now.getHours() === h && now.getMinutes() === m) {
          const todayTodos = todosRef.current.filter(t => { try { return isToday(parseISO(t.date)); } catch { return false; } });
          sendKakaoMessage(buildKakaoText(todayTodos)).catch(() => {});
          localStorage.setItem("kakaoLastSent", today);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  const buildKakaoText = (list: Todo[]) => {
    const dateStr = format(new Date(), "M월 d일 (EEEE)", { locale: ko });
    if (list.length === 0) return `📋 ${dateStr} 할 일\n\n오늘 할 일이 없습니다 🎉`;
    const done = list.filter(t => t.status === "done").length;
    const lines = list.map(t => {
      const icon = t.status === "done" ? "✅" : t.status === "inprogress" ? "🔵" : "⬜";
      return `${icon} ${t.title}`;
    }).join("\n");
    return `📋 ${dateStr} 할 일 (${done}/${list.length} 완료)\n\n${lines}`;
  };

  const handleKakaoSend = async () => {
    if (!isKakaoLoggedIn()) { alert("설정에서 카카오 로그인 후 사용할 수 있습니다."); return; }
    setKakaoStatus("sending");
    try {
      const todayTodos = todosRef.current.filter(t => { try { return isToday(parseISO(t.date)); } catch { return false; } });
      await sendKakaoMessage(buildKakaoText(todayTodos));
      setKakaoStatus("ok");
      setTimeout(() => setKakaoStatus(""), 2000);
    } catch {
      setKakaoStatus("err");
      setTimeout(() => setKakaoStatus(""), 2000);
    }
  };

  const todos = todosRef.current;
  const filtered = todos.filter(t => {
    const { start, end } = getRange(timeView, currentDate);
    try { return isWithinInterval(parseISO(t.date), { start, end }); } catch { return false; }
  });

  const todayCount = todos.filter(t => { try { return isToday(parseISO(t.date)) && t.status !== "done"; } catch { return false; } }).length;
  const tomorrowCount = todos.filter(t => { try { return isTomorrow(parseISO(t.date)) && t.status !== "done"; } catch { return false; } }).length;
  const next7Count = todos.filter(t => {
    try { const d = parseISO(t.date); return isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 7) }) && t.status !== "done"; } catch { return false; }
  }).length;

  const done = filtered.filter(t => t.status === "done").length;
  const pct = filtered.length > 0 ? Math.round((done / filtered.length) * 100) : 0;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const id = genId();
    const newTodo: Todo = {
      id, title: newTitle.trim(), completed: false, status: "todo",
      priority: newPriority, date: format(currentDate, "yyyy-MM-dd"),
      viewType: timeView, createdAt: Date.now(),
    };
    setTodos(prev => [...prev, newTodo]);
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "todos", id), newTodo); }
      catch (e) { console.error("할 일 Firestore 저장 오류:", e); }
    }
    setNewTitle("");
  };

  const handleToggle = async (t: Todo) => {
    const next: TodoStatus = t.status === "done" ? "todo" : "done";
    const updated = { ...t, status: next, completed: next === "done" };
    setTodos(prev => prev.map(x => x.id === t.id ? updated : x));
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "todos", t.id), updated); }
      catch (e) { console.error("Firestore 업데이트 오류:", e); }
    }
  };

  const handleDelete = async (id: string) => {
    setTodos(prev => prev.filter(x => x.id !== id));
    if (user && db) {
      try { await deleteDoc(doc(db, "users", user.uid, "todos", id)); }
      catch (e) { console.error("Firestore 삭제 오류:", e); }
    }
  };

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (timeView === "daily")        d.setDate(d.getDate() + dir);
    else if (timeView === "weekly")  d.setDate(d.getDate() + dir * 7);
    else if (timeView === "monthly") d.setMonth(d.getMonth() + dir);
    else                             d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TodoStatus;
    const todo = todos.find(t => t.id === result.draggableId);
    if (!todo) return;
    const updated = { ...todo, status: newStatus, completed: newStatus === "done" };
    setTodos(prev => prev.map(x => x.id === result.draggableId ? updated : x));
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "todos", result.draggableId), updated); }
      catch (e) { console.error("Firestore 업데이트 오류:", e); }
    }
  };

  return (
    <div style={{ maxWidth: displayMode === "list" ? "720px" : "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>할 일</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={handleKakaoSend} title="오늘 할 일을 카카오톡으로 전송"
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, background: "#FEE500", color: "#191919", opacity: kakaoStatus === "sending" ? 0.7 : 1 }}>
            <Send size={13} />
            {kakaoStatus === "sending" ? "전송 중..." : kakaoStatus === "ok" ? "✅ 전송됨" : kakaoStatus === "err" ? "❌ 실패" : "카카오 전송"}
          </button>
          <div style={{ display: "flex", gap: "4px", padding: "4px", borderRadius: "10px", background: "var(--accent)" }}>
            {([
              { mode: "list" as DisplayMode,   icon: <List size={15} />,         title: "목록" },
              { mode: "kanban" as DisplayMode, icon: <LayoutGrid size={15} />,   title: "칸반" },
              { mode: "weekly" as DisplayMode, icon: <CalendarDays size={15} />, title: "주간" },
            ]).map(({ mode, icon, title }) => (
              <button key={mode} onClick={() => setDisplayMode(mode)}
                style={{ padding: "5px 10px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", background: displayMode === mode ? "var(--card)" : "transparent", color: displayMode === mode ? "var(--foreground)" : "var(--muted)", boxShadow: displayMode === mode ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                {icon}<span style={{ fontSize: "0.75rem" }}>{title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {displayMode === "weekly" && (
        <WeeklyPlanner todos={todos} currentWeekStart={weekStart} onWeekChange={dir => setWeekStart(prev => addDays(prev, dir * 7))} onAddTodo={(todo) => setTodos(prev => [...prev, todo])} onToggleTodo={handleToggle} onDeleteTodo={handleDelete} />
      )}

      {displayMode !== "weekly" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[{ label: "오늘", count: todayCount, color: "#dc2626" }, { label: "내일", count: tomorrowCount, color: "#d97706" }, { label: "7일 내", count: next7Count, color: "#2563eb" }].map(c => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 500, border: `1px solid ${c.color}40`, background: c.color + "12", color: c.color }}>
                {c.label} <strong>{c.count}</strong>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "4px", padding: "4px", borderRadius: "12px", background: "var(--accent)", marginBottom: "12px" }}>
            {TIME_VIEWS.map(v => (
              <button key={v.key} onClick={() => setTimeView(v.key)}
                style={{ flex: 1, padding: "6px 0", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: timeView === v.key ? 500 : 400, background: timeView === v.key ? "var(--card)" : "transparent", color: timeView === v.key ? "var(--foreground)" : "var(--muted)", boxShadow: timeView === v.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px 8px" }}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>{getRangeLabel(timeView, currentDate)}</span>
            <button onClick={() => navigate(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px 8px" }}><ChevronRight size={18} /></button>
          </div>

          {filtered.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px", color: "var(--muted)" }}>
                <span>{done} / {filtered.length} 완료</span><span>{pct}%</span>
              </div>
              <div style={{ height: "5px", borderRadius: "3px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "3px", width: `${pct}%`, background: "var(--primary)", transition: "width 0.4s" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="새 할 일 추가... (Enter)"
              style={{ flex: 1, padding: "9px 14px", borderRadius: "12px", fontSize: "0.875rem", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", outline: "none" }}
            />
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as TodoPriority)}
              style={{ padding: "9px 10px", borderRadius: "12px", fontSize: "0.8rem", border: "1px solid var(--border)", background: "var(--card)", color: PRIORITY_META[newPriority].color, outline: "none" }}>
              <option value="high">🔴 높음</option><option value="medium">🟡 중간</option><option value="low">⚪ 낮음</option>
            </select>
            <button onClick={handleAdd} style={{ padding: "9px 18px", borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", background: "var(--primary)", color: "var(--primary-fg)" }}>
              <Plus size={15} /> 추가
            </button>
          </div>
        </>
      )}

      {displayMode === "list" && (
        <div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: "0.875rem" }}>
              <Circle size={32} style={{ margin: "0 auto 12px", opacity: 0.2 }} />이 기간에 할 일이 없습니다
            </div>
          )}
          {(["todo", "inprogress", "done"] as TodoStatus[]).map(status => {
            const group = filtered.filter(t => t.status === status);
            if (group.length === 0) return null;
            const col = KANBAN_COLS.find(c => c.key === status)!;
            return (
              <div key={status} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{group.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {group.map(t => <TodoCard key={t.id} todo={t} onToggle={() => handleToggle(t)} onDelete={() => handleDelete(t.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {displayMode === "kanban" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {KANBAN_COLS.map(col => {
              const colTodos = filtered.filter(t => (t.status ?? "todo") === col.key);
              return (
                <div key={col.key} style={{ borderRadius: "16px", padding: "14px", background: "var(--accent)", minHeight: "480px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.color }} />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{col.label}</span>
                    <span style={{ fontSize: "0.75rem", padding: "1px 8px", borderRadius: "12px", background: col.color + "20", color: col.color }}>{colTodos.length}</span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        style={{ minHeight: "400px", borderRadius: "10px", padding: "4px", background: snapshot.isDraggingOver ? col.color + "10" : "transparent", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {colTodos.map((todo, index) => (
                          <Draggable key={todo.id} draggableId={todo.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <TodoCard todo={todo} onToggle={() => handleToggle(todo)} onDelete={() => handleDelete(todo.id)} dragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colTodos.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ textAlign: "center", padding: "32px 0", fontSize: "0.8rem", color: "var(--muted)" }}>여기로 드래그</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
