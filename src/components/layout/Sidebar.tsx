"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Calendar, BookOpen, Settings, LayoutDashboard, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/",           label: "대시보드",  icon: LayoutDashboard },
  { href: "/todo",       label: "할 일",     icon: CheckSquare },
  { href: "/calendar",   label: "캘린더",    icon: Calendar },
  { href: "/notes",      label: "공부 노트", icon: BookOpen },
  { href: "/scrapbook",  label: "스크랩북",  icon: Bookmark },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "224px",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      borderRight: "1px solid var(--border)",
      backgroundColor: "var(--sidebar)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
          My Dashboard
        </h1>
      </div>

      <nav style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 10px",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: active ? 500 : 400,
              color: active ? "var(--foreground)" : "var(--muted)",
              background: active ? "var(--accent)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            }}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
        <Link href="/settings" style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "7px 10px",
          borderRadius: "8px",
          fontSize: "0.875rem",
          color: pathname === "/settings" ? "var(--foreground)" : "var(--muted)",
          background: pathname === "/settings" ? "var(--accent)" : "transparent",
          textDecoration: "none",
        }}>
          <Settings size={16} />
          설정
        </Link>
      </div>
    </aside>
  );
}
