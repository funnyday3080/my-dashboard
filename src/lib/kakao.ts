declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        login: (opts: { success: (a: { access_token: string }) => void; fail: (e: unknown) => void; scope?: string }) => void;
        logout: (cb?: () => void) => void;
        getAccessToken: () => string | null;
      };
      API: {
        request: (opts: {
          url: string;
          data: object;
          success?: (r: unknown) => void;
          fail?: (e: unknown) => void;
        }) => Promise<unknown>;
      };
    };
  }
}

export function initKakao() {
  if (typeof window === "undefined" || !window.Kakao) return;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return;
  if (!window.Kakao.isInitialized()) window.Kakao.init(key);
}

export function kakaoLogin(): Promise<string> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (key && window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return new Promise((resolve, reject) => {
    window.Kakao.Auth.login({
      scope: "talk_message",
      success: (a) => resolve(a.access_token),
      fail: reject,
    });
  });
}

export function kakaoLogout(): Promise<void> {
  return new Promise((resolve) => window.Kakao.Auth.logout(resolve));
}

export function isKakaoLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.Kakao?.Auth?.getAccessToken?.();
}

export async function sendKakaoMessage(text: string): Promise<void> {
  await window.Kakao.API.request({
    url: "/v2/api/talk/memo/default/send",
    data: {
      template_object: {
        object_type: "text",
        text,
        link: {
          web_url: typeof window !== "undefined" ? window.location.origin : "",
          mobile_web_url: typeof window !== "undefined" ? window.location.origin : "",
        },
        button_title: "대시보드 열기",
      },
    },
  });
}
