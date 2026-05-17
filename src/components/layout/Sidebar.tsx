"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Calendar, BookOpen, Settings, LayoutDashboard, Bookmark } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const nav = [
  { href: "/",          label: "대시보드",  icon: LayoutDashboard },
  { href: "/todo",      label: "할 일",     icon: CheckSquare },
  { href: "/calendar",  label: "캘린더",    icon: Calendar },
  { href: "/notes",     label: "공부 노트", icon: BookOpen },
  { href: "/scrapbook", label: "스크랩북",  icon: Bookmark },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <aside style={{
      width: "224px", height: "100vh", position: "fixed", left: 0, top: 0,
      borderRight: "1px solid var(--border)", backgroundColor: "var(--sidebar)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "10px",
            background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <LayoutDashboard size={16} color="#fff" />
          </div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            My Dashboard
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 10px", marginBottom: "8px" }}>
          메뉴
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 12px", borderRadius: "10px",
              fontSize: "0.875rem", fontWeight: active ? 600 : 400,
              color: active ? "var(--primary)" : "var(--muted)",
              background: active ? "var(--primary)" + "12" : "transparent",
              textDecoration: "none", transition: "all 0.15s",
              borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
            }}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Settings */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px" }}>
        <Link href="/settings" style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "9px 12px", borderRadius: "10px", fontSize: "0.875rem",
          color: pathname === "/settings" ? "var(--primary)" : "var(--muted)",
          background: pathname === "/settings" ? "var(--primary)" + "12" : "transparent",
          textDecoration: "none", transition: "all 0.15s",
          borderLeft: pathname === "/settings" ? "3px solid var(--primary)" : "3px solid transparent",
        }}>
          <Settings size={16} />
          설정
        </Link>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginTop: "4px", borderRadius: "10px", background: "var(--accent)" }}>
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
              : <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>{user.displayName?.[0]}</div>
            }
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
