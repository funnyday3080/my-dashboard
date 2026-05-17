"use client";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { db } from "@/lib/firebase";
import { setDoc, deleteDoc, doc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { loadEvents, saveEvents, genId } from "@/lib/storage";
import type { CalendarEvent } from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 0 }), getDay, locales: { ko },
});

const MESSAGES = {
  today: "오늘", previous: "이전", next: "다음", month: "월", week: "주", day: "일",
  agenda: "목록", date: "날짜", time: "시간", event: "일정",
  noEventsInRange: "이 기간에 일정이 없습니다.", showMore: (n: number) => `+${n}개 더`,
};

interface EventForm { title: string; start: string; end: string; allDay: boolean; color: string; }
const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: "", start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end: format(new Date(), "yyyy-MM-dd'T'HH:mm"), allDay: false, color: COLORS[0],
  });

  const setEvents = useCallback((events: CalendarEvent[] | ((p: CalendarEvent[]) => CalendarEvent[])) => {
    setEventsState(prev => {
      const next = typeof events === "function" ? events(prev) : events;
      saveEvents(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setEventsState(loadEvents());
    if (!db || !user) return;
    const q = query(collection(db, "users", user.uid, "events"), orderBy("start", "asc"));
    return onSnapshot(q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
        setEventsState(data);
        saveEvents(data);
      },
      (err) => console.error("events 구독 오류:", err)
    );
  }, [user]);

  const rbcEvents = events.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end), resource: e }));

  const openNew = useCallback((slotInfo?: { start: Date; end: Date }) => {
    setEditId(null);
    setForm({ title: "", color: COLORS[0], allDay: false, start: format(slotInfo?.start ?? new Date(), "yyyy-MM-dd'T'HH:mm"), end: format(slotInfo?.end ?? new Date(), "yyyy-MM-dd'T'HH:mm") });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((event: { resource: CalendarEvent }) => {
    const e = event.resource;
    setEditId(e.id);
    setForm({ title: e.title, allDay: e.allDay, color: e.color ?? COLORS[0], start: format(new Date(e.start), "yyyy-MM-dd'T'HH:mm"), end: format(new Date(e.end), "yyyy-MM-dd'T'HH:mm") });
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const data: CalendarEvent = {
      id: editId ?? genId(), title: form.title, allDay: form.allDay, color: form.color,
      start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(),
    };
    if (editId) setEvents(prev => prev.map(e => e.id === editId ? data : e));
    else        setEvents(prev => [...prev, data]);
    if (user && db) {
      try { await setDoc(doc(db, "users", user.uid, "events", data.id), data); }
      catch (e) { console.error("Firestore 저장 오류:", e); }
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!editId) return;
    setEvents(prev => prev.filter(e => e.id !== editId));
    if (user && db) {
      try { await deleteDoc(doc(db, "users", user.uid, "events", editId)); }
      catch (e) { console.error("Firestore 삭제 오류:", e); }
    }
    setShowModal(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>캘린더</h2>
        <button onClick={() => openNew()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500, border: "none", cursor: "pointer", background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Plus size={15} /> 일정 추가
        </button>
      </div>

      <div style={{ height: "calc(100vh - 180px)" }}>
        <Calendar localizer={localizer} events={rbcEvents} onSelectSlot={openNew} onSelectEvent={openEdit as never}
          selectable messages={MESSAGES} culture="ko"
          eventPropGetter={(event) => ({ style: { backgroundColor: (event as { color?: string }).color ?? "var(--primary)", border: "none" } })}
        />
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setShowModal(false)}>
          <div style={{ width: "100%", maxWidth: "440px", borderRadius: "20px", padding: "24px", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>{editId ? "일정 수정" : "새 일정"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="제목" autoFocus
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", outline: "none", fontSize: "0.875rem" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[{ label: "시작", key: "start" }, { label: "종료", key: "end" }].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: "4px" }}>{label}</label>
                    <input type="datetime-local" value={form[key as "start" | "end"]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", outline: "none", fontSize: "0.82rem" }}
                    />
                  </div>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", cursor: "pointer", color: "var(--foreground)" }}>
                <input type="checkbox" checked={form.allDay} onChange={e => setForm({ ...form, allDay: e.target.checked })} /> 하루 종일
              </label>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block", marginBottom: "6px" }}>색상</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              {editId && <button onClick={handleDelete} style={{ padding: "9px 18px", borderRadius: "10px", border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>삭제</button>}
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.875rem", marginLeft: "auto" }}>취소</button>
              <button onClick={handleSave} style={{ padding: "9px 22px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "var(--primary-fg)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
