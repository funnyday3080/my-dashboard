"use client";
import { useState, useEffect } from "react";
import { signInWithRedirect, signInWithPopup, GoogleAuthProvider, signOut, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, FONT_OPTIONS } from "@/store/settingsStore";
import { kakaoLogin, kakaoLogout, isKakaoLoggedIn } from "@/lib/kakao";
import type { ThemeMode } from "@/types";
import { Sun, Moon, Code2, LogOut, LogIn, Bell, BellOff, Send } from "lucide-react";

const THEMES: { key: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "light",     label: "라이트",  icon: <Sun size={18} />,   desc: "밝은 테마" },
  { key: "dark",      label: "다크",    icon: <Moon size={18} />,  desc: "어두운 테마" },
  { key: "developer", label: "개발자",  icon: <Code2 size={18} />, desc: "GitHub 스타일" },
];

const SECTION: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: "16px", padding: "20px",
};

const LABEL: React.CSSProperties = {
  fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px", display: "block",
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize } = useSettingsStore();
  const [kakaoConnected, setKakaoConnected] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [sendStatus, setSendStatus] = useState<"" | "sending" | "ok" | "err">("");

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    setKakaoConnected(isKakaoLoggedIn());
    const saved = localStorage.getItem("kakaoReminder");
    if (saved) {
      const { enabled, time } = JSON.parse(saved);
      setReminderEnabled(enabled);
      setReminderTime(time ?? "09:00");
    }
  }, []);

  const saveReminder = (enabled: boolean, time: string) => {
    localStorage.setItem("kakaoReminder", JSON.stringify({ enabled, time }));
  };

  const handleKakaoLogin = async () => {
    try {
      await kakaoLogin();
      setKakaoConnected(true);
    } catch (e) {
      alert("카카오 로그인에 실패했습니다. Kakao Developers에서 도메인(http://localhost:3000)이 등록되어 있는지 확인해주세요.");
    }
  };

  const handleKakaoLogout = async () => {
    await kakaoLogout();
    setKakaoConnected(false);
  };

  const handleTestSend = async () => {
    if (!isKakaoLoggedIn()) { alert("카카오 로그인이 필요합니다."); return; }
    setSendStatus("sending");
    try {
      const { sendKakaoMessage } = await import("@/lib/kakao");
      await sendKakaoMessage("✅ 카카오 알림 테스트\n\nMy Dashboard와 카카오톡이 연동되었습니다!");
      setSendStatus("ok");
      setTimeout(() => setSendStatus(""), 2000);
    } catch {
      setSendStatus("err");
      setTimeout(() => setSendStatus(""), 2000);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      await signInWithRedirect(auth, new GoogleAuthProvider());
    }
  };

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>설정</h2>

      {/* 계정 */}
      <section>
        <span style={LABEL}>계정</span>
        <div style={SECTION}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />}
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>{user.displayName}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{user.email}</p>
                </div>
              </div>
              <button onClick={() => signOut(auth)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--danger)" }}>
                <LogOut size={14} /> 로그아웃
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>로그인하면 기기 간 동기화가 됩니다</p>
              <button onClick={handleGoogleLogin}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, background: "var(--primary)", color: "var(--primary-fg)" }}>
                <LogIn size={14} /> Google 로그인
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 카카오 알림 */}
      <section>
        <span style={LABEL}>카카오톡 알림</span>
        <div style={SECTION}>
          {!process.env.NEXT_PUBLIC_KAKAO_JS_KEY ? (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.8 }}>
              <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>카카오 앱 키 설정이 필요합니다</p>
              <ol style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li><a href="https://developers.kakao.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>developers.kakao.com</a> 접속 → 내 앱 만들기</li>
                <li>앱 키 → <strong>JavaScript 키</strong> 복사</li>
                <li>플랫폼 → Web → <code>http://localhost:3000</code> 등록</li>
                <li>카카오 로그인 → 활성화 ON</li>
                <li>동의항목 → <strong>카카오톡 메시지 전송</strong> 필수 동의</li>
                <li><code>.env.local</code>에 <code>NEXT_PUBLIC_KAKAO_JS_KEY=복사한_키</code> 입력 후 서버 재시작</li>
              </ol>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Login status */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: kakaoConnected ? "#16a34a" : "var(--muted)" }} />
                  <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>
                    {kakaoConnected ? "카카오 연동됨" : "카카오 연동 안 됨"}
                  </span>
                </div>
                {kakaoConnected ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={handleTestSend}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", cursor: "pointer", fontSize: "0.8rem" }}>
                      <Send size={13} />
                      {sendStatus === "sending" ? "전송 중..." : sendStatus === "ok" ? "✅ 전송됨" : sendStatus === "err" ? "❌ 실패" : "테스트 전송"}
                    </button>
                    <button onClick={handleKakaoLogout}
                      style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem" }}>
                      연동 해제
                    </button>
                  </div>
                ) : (
                  <button onClick={handleKakaoLogin}
                    style={{ padding: "7px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, background: "#FEE500", color: "#191919" }}>
                    카카오 로그인
                  </button>
                )}
              </div>

              {/* Reminder time */}
              {kakaoConnected && (
                <div style={{ padding: "14px", borderRadius: "12px", background: "var(--accent)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {reminderEnabled ? <Bell size={15} color="var(--primary)" /> : <BellOff size={15} color="var(--muted)" />}
                      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>매일 알림</span>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={reminderEnabled}
                        onChange={e => { setReminderEnabled(e.target.checked); saveReminder(e.target.checked, reminderTime); }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{reminderEnabled ? "켜짐" : "꺼짐"}</span>
                    </label>
                  </div>
                  {reminderEnabled && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>알림 시간</span>
                      <input type="time" value={reminderTime}
                        onChange={e => { setReminderTime(e.target.value); saveReminder(reminderEnabled, e.target.value); }}
                        style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "0.875rem", outline: "none" }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>※ 페이지가 열려있을 때만 작동</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 테마 */}
      <section>
        <span style={LABEL}>테마</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {THEMES.map(t => (
            <button key={t.key} onClick={() => setTheme(t.key)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                padding: "16px", borderRadius: "14px", cursor: "pointer",
                border: `${theme === t.key ? 2 : 1}px solid ${theme === t.key ? "var(--primary)" : "var(--border)"}`,
                background: "var(--card)",
                color: theme === t.key ? "var(--primary)" : "var(--muted)",
                opacity: theme === t.key ? 1 : 0.65,
              }}>
              {t.icon}
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{t.label}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 글씨체 */}
      <section>
        <span style={LABEL}>글씨체</span>
        <div style={SECTION}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            {FONT_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setFontFamily(f.value)}
                style={{
                  padding: "9px 12px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                  border: `${fontFamily === f.value ? 2 : 1}px solid ${fontFamily === f.value ? "var(--primary)" : "var(--border)"}`,
                  background: fontFamily === f.value ? "var(--accent)" : "transparent",
                  color: "var(--foreground)", fontFamily: f.value, fontSize: "0.875rem",
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <p style={{ fontFamily, fontSize: "0.875rem", color: "var(--foreground)", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
            미리보기: 안녕하세요! Hello World 123
          </p>
        </div>
      </section>

      {/* 글씨 크기 */}
      <section>
        <span style={LABEL}>글씨 크기</span>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: "20px", textAlign: "right" }}>12</span>
            <input type="range" min={12} max={20} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--primary)" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: "20px" }}>20</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", width: "36px" }}>{fontSize}px</span>
          </div>
          <p style={{ fontSize, color: "var(--foreground)" }}>미리보기 텍스트입니다. Preview text here.</p>
        </div>
      </section>
    </div>
  );
}
