import { NextRequest, NextResponse } from "next/server";

// Naver 주식 실시간 데이터 프록시
// GET /api/stock?codes=005930,000660
export async function GET(request: NextRequest) {
  const codes = request.nextUrl.searchParams.get("codes");
  if (!codes) return NextResponse.json({ error: "codes required" }, { status: 400 });

  const codeList = codes.split(",").map(c => c.trim()).filter(Boolean);
  const query = codeList.map(c => `SERVICE_ITEM:${c}`).join("|");

  try {
    const res = await fetch(
      `https://polling.finance.naver.com/api/realtime?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://finance.naver.com/",
          "Accept": "application/json",
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) throw new Error(`Naver API error: ${res.status}`);
    const data = await res.json();

    // Response: data.result.areas[0].datas[] with fields:
    // cd=code, nm=name, nv=current/close price, sv=prev close,
    // cv=change, cr=changeRate, ov=open, hv=high, lv=low,
    // aq=volume, ms=marketStatus(OPEN/CLOSE), tyn=tradeStop
    const result: Record<string, {
      code: string; name: string; price: number;
      change: number; changeRate: number;
      prevClose: number; high: number; low: number; open: number; volume: number;
      marketStatus: string;
    }> = {};

    const areas: { name: string; datas: Record<string, unknown>[] }[] =
      data?.result?.areas ?? [];

    for (const area of areas) {
      for (const item of area.datas ?? []) {
        const code = String(item.cd ?? "");
        if (!code || !codeList.includes(code)) continue;

        const ms = String(item.ms ?? "");
        const marketStatus =
          String(item.tyn) === "Y" ? "HALT"
          : ms === "CLOSE" ? "CLOSE"
          : "OPEN";

        result[code] = {
          code,
          name: String(item.nm ?? ""),
          price: Number(item.nv ?? 0),       // 현재가 (장 마감 후 = 종가)
          change: Number(item.cv ?? 0),
          changeRate: Number(item.cr ?? 0),
          prevClose: Number(item.sv ?? 0),   // 전일 종가
          high: Number(item.hv ?? 0),
          low: Number(item.lv ?? 0),
          open: Number(item.ov ?? 0),
          volume: Number(item.aq ?? 0),
          marketStatus,
        };
      }
    }

    return NextResponse.json({ ok: true, data: result, ts: Date.now() });
  } catch (err) {
    console.error("Stock API error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
