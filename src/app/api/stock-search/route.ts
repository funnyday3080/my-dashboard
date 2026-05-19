import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface Stock { name: string; code: string; market: string; }

let cache: Stock[] | null = null;

function getStocks(): Stock[] {
  if (!cache) {
    const path = join(process.cwd(), "public", "stocks.json");
    cache = JSON.parse(readFileSync(path, "utf-8")) as Stock[];
  }
  return cache;
}

// GET /api/stock-search?q=아세아제지
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ items: [] });

  const stocks = getStocks();
  const lower = q.toLowerCase();

  // Priority: starts-with name > starts-with code > includes name
  const startName = stocks.filter(s => s.name.startsWith(q));
  const startCode = stocks.filter(s => s.code.startsWith(q) && !startName.includes(s));
  const containsName = stocks.filter(
    s => s.name.includes(q) && !startName.includes(s) && !startCode.includes(s)
  );
  const containsEngLower = stocks.filter(
    s => !startName.includes(s) && !startCode.includes(s) && !containsName.includes(s)
      && s.name.toLowerCase().includes(lower)
  );

  const results = [...startName, ...startCode, ...containsName, ...containsEngLower].slice(0, 15);
  return NextResponse.json({ items: results });
}
