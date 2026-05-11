import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/layout/AuthProvider";
import ThemeProvider from "@/components/layout/ThemeProvider";
import Sidebar from "@/components/layout/Sidebar";
import KakaoScript from "@/components/layout/KakaoScript";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Personal productivity dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body style={{ height: "100vh", overflow: "hidden" }}>
        <KakaoScript />
        <AuthProvider>
          <ThemeProvider>
            <div style={{ display: "flex", height: "100vh" }}>
              <Sidebar />
              <main style={{
                marginLeft: "224px", flex: 1, height: "100vh",
                overflowY: "auto", padding: "32px",
                backgroundColor: "var(--bg)",
              }}>
                {children}
              </main>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
