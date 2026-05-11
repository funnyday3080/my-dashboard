"use client";
import Script from "next/script";
import { initKakao } from "@/lib/kakao";

export default function KakaoScript() {
  if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) return null;
  return (
    <Script
      src="https://developers.kakao.com/sdk/js/kakao.js"
      strategy="afterInteractive"
      onLoad={initKakao}
    />
  );
}
