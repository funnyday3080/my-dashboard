"use client";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { subscribeEvents, addEvent, updateEvent, deleteEvent } from "@/lib/firestore";
import type { CalendarEvent } from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 0 }),
  getDay,
  locales: { ko },
});

const MESSAGES = {
  today: "오늘",
  previous: "이전",
  next: "다음",
  month: "월",
  week: "주",
  day: "일",
  agenda: "목록",
  date: "날짜",
  time: "시간",
  event: "일정",
  noEventsInRange: "이 기간에 일정이 없습니다.",
  showMore: (n: number) => `+${n}개 더`,
};

interface EventForm {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
}

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: "",
    start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    allDay: false,
    color: COLORS[0],
  });

  useEffect(() => {
    if (!user) return;
    return subscribeEvents(user.uid, setEvents);
  }, [user]);

  const rbcEvents = events.map((e) => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
    resource: e,
  }));

  const openNew = useCallback((slotInfo?: { start: Date; end: Date }) => {
    setEditId(null);
    setForm({
      title: "",
      start: format(slotInfo?.start ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
      end: format(slotInfo?.end ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
      allDay: false,
      color: COLORS[0],
    });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((event: { resource: CalendarEvent }) => {
    const e = event.resource;
    setEditId(e.id);
    setForm({
      title: e.title,
      start: format(new Date(e.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(e.end), "yyyy-MM-dd'T'HH:mm"),
      allDay: e.allDay,
      color: e.color ?? COLORS[0],
    });
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    const data = {
      title: form.title,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      allDay: form.allDay,
      color: form.color,
    };
    if (editId) {
      await updateEvent(user.uid, editId, data);
    } else {
      await addEvent(user.uid, data);
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!user || !editId) return;
    await deleteEvent(user.uid, editId);
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>캘린더</h2>
        <button
          onClick={() => openNew()}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <Plus size={15} /> 일정 추가
        </button>
      </div>

      <div style={{ height: "calc(100vh - 180px)" }}>
        <Calendar
          localizer={localizer}
          events={rbcEvents}
          onSelectSlot={openNew}
          onSelectEvent={openEdit as never}
          selectable
          messages={MESSAGES}
          culture="ko"
          eventPropGetter={(event) => ({
            style: { backgroundColor: (event as { color?: string }).color ?? "var(--primary)", border: "none" },
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
                {editId ? "일정 수정" : "새 일정"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--muted)" }}><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="제목"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>시작</label>
                  <input
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>종료</label>
                  <input
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--foreground)" }}>
                <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
                하루 종일
              </label>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>색상</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        outline: form.color === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {editId && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
                  style={{ background: "var(--danger)", color: "#fff" }}
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium ml-auto hover:opacity-70 transition"
                style={{ color: "var(--muted)" }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
