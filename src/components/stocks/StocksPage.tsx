"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Search, X, TrendingUp, TrendingDown, RefreshCw, Pencil } from "lucide-react";

interface Holding {
  id: string;
  code: string;
  name: string;
  quantity: number;
  avgPrice: number;
}

interface StockData {
  code: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  prevClose: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  marketStatus: string; // "OPEN" | "CLOSE" | "HALT"
}

interface SearchItem { name: string; code: string; market: string; }

const STORAGE_KEY = "dash_stock_holdings";
const WATCHLIST_KEY = "dash_stock_watchlist";

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function loadHoldings(): Holding[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveHoldings(d: Holding[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function loadWatchlist(): string[] { try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); } catch { return []; } }
function saveWatchlist(d: string[]) { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(d)); }

function fmt(n: number) { return n.toLocaleString("ko-KR"); }
function fmtMoney(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "조";
  if (abs >= 100_000_000) return (n / 100_000_000).toFixed(1) + "억";
  if (abs >= 10_000) return (n / 10_000).toFixed(0) + "만";
  return fmt(n);
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ width: 80, height: 32 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 32, pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function StocksPage() {
  const [holdings, setHoldingsState] = useState<Holding[]>([]);
  const [watchlist, setWatchlistState] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, StockData>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", quantity: "", avgPrice: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [watchInput, setWatchInput] = useState("");
  const [watchSearch, setWatchSearch] = useState<SearchItem[]>([]);
  const [watchSearching, setWatchSearching] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setHoldings = useCallback((data: Holding[] | ((p: Holding[]) => Holding[])) => {
    setHoldingsState(prev => {
      const next = typeof data === "function" ? data(prev) : data;
      saveHoldings(next);
      return next;
    });
  }, []);

  const setWatchlist = useCallback((data: string[] | ((p: string[]) => string[])) => {
    setWatchlistState(prev => {
      const next = typeof data === "function" ? data(prev) : data;
      saveWatchlist(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setHoldingsState(loadHoldings());
    setWatchlistState(loadWatchlist());
  }, []);

  const allCodes = useCallback(() => {
    const codes = new Set<string>();
    holdings.forEach(h => codes.add(h.code));
    watchlist.forEach(c => codes.add(c));
    return Array.from(codes);
  }, [holdings, watchlist]);

  const fetchPrices = useCallback(async () => {
    const codes = allCodes();
    if (codes.length === 0) return;
    try {
      const res = await fetch(`/api/stock?codes=${codes.join(",")}`);
      const json = await res.json();
      if (!json.ok) return;
      setPrices(prev => ({ ...prev, ...json.data }));
      setHistory(prev => {
        const next = { ...prev };
        for (const code of Object.keys(json.data)) {
          const price = json.data[code].price;
          if (!price) continue;
          const arr = next[code] ? [...next[code], price] : [price];
          next[code] = arr.slice(-60);
        }
        return next;
      });
      setLastUpdate(new Date());
    } catch {}
  }, [allCodes]);

  useEffect(() => {
    fetchPrices();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchPrices, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchPrices]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setSearchResults(json.items?.slice(0, 8) ?? []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  const doWatchSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setWatchSearch([]); return; }
    setWatchSearching(true);
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setWatchSearch(json.items?.slice(0, 5) ?? []);
    } catch { setWatchSearch([]); }
    setWatchSearching(false);
  }, []);

  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(v), 250);
  };

  const onWatchInputChange = (v: string) => {
    setWatchInput(v);
    if (watchTimer.current) clearTimeout(watchTimer.current);
    watchTimer.current = setTimeout(() => doWatchSearch(v), 250);
  };

  const selectSearchItem = (item: SearchItem) => {
    setForm(f => ({ ...f, code: item.code, name: item.name }));
    setSearchQuery(`${item.name} (${item.code})`);
    setSearchResults([]);
  };

  const addToWatchlist = (item: SearchItem) => {
    if (!watchlist.includes(item.code)) setWatchlist(prev => [...prev, item.code]);
    setWatchInput("");
    setWatchSearch([]);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ code: "", name: "", quantity: "", avgPrice: "" });
    setSearchQuery("");
    setSearchResults([]);
    setShowModal(true);
  };

  const openEdit = (h: Holding) => {
    setEditId(h.id);
    setForm({ code: h.code, name: h.name, quantity: String(h.quantity), avgPrice: String(h.avgPrice) });
    setSearchQuery(`${h.name} (${h.code})`);
    setSearchResults([]);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.code || !form.quantity || !form.avgPrice) return;
    const qty = Number(form.quantity);
    const avg = Number(form.avgPrice);
    if (!qty || !avg) return;
    if (editId) {
      setHoldings(prev => prev.map(h => h.id === editId ? { ...h, code: form.code, name: form.name, quantity: qty, avgPrice: avg } : h));
    } else {
      setHoldings(prev => [...prev, { id: genId(), code: form.code, name: form.name, quantity: qty, avgPrice: avg }]);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!editId) return;
    setHoldings(prev => prev.filter(h => h.id !== editId));
    setShowModal(false);
  };

  const removeFromWatchlist = (code: string) => {
    setWatchlist(prev => prev.filter(c => c !== code));
  };

  // 시장 상태 (보유 종목 중 하나라도 OPEN이면 OPEN)
  const marketStatus = Object.values(prices).some(p => p.marketStatus === "OPEN") ? "OPEN" : "CLOSE";

  // Portfolio calculations — 장 마감 후에도 nv(종가)로 계산
  const totalInvested = holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0);
  const totalCurrent = holdings.reduce((s, h) => {
    const p = prices[h.code]?.price ?? h.avgPrice;
    return s + p * h.quantity;
  }, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlRate = totalInvested ? (totalPnl / totalInvested) * 100 : 0;
  const isUp = totalPnl >= 0;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>주식 포트폴리오</h2>
          <p style={{ fontSize: "0.8rem", marginTop: "2px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={11} />
            {lastUpdate ? `${lastUpdate.toLocaleTimeString("ko-KR")} 기준` : "데이터 로딩 중..."}
            {lastUpdate && (
              <span style={{ padding: "1px 7px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600,
                background: marketStatus === "OPEN" ? "#16a34a22" : "#6b728022",
                color: marketStatus === "OPEN" ? "#16a34a" : "var(--muted)" }}>
                {marketStatus === "OPEN" ? "장중" : "종가"}
              </span>
            )}
          </p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500, border: "none", cursor: "pointer", background: "var(--primary)", color: "var(--primary-fg)" }}>
          <Plus size={15} /> 종목 추가
        </button>
      </div>

      {/* Summary cards */}
      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "평가금액", value: `₩${fmt(Math.round(totalCurrent))}`, sub: null, color: "var(--foreground)" },
            { label: "투자원금", value: `₩${fmt(Math.round(totalInvested))}`, sub: null, color: "var(--foreground)" },
            { label: "평가손익", value: `${totalPnl >= 0 ? "+" : ""}₩${fmt(Math.round(totalPnl))}`, sub: `${totalPnlRate >= 0 ? "+" : ""}${totalPnlRate.toFixed(2)}%`, color: isUp ? "#16a34a" : "#dc2626" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ borderRadius: "16px", padding: "20px", background: "var(--card)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "6px", fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</p>
              {sub && <p style={{ fontSize: "0.85rem", color, marginTop: "2px", fontWeight: 500 }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Holdings table */}
      <div style={{ borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", background: "var(--card)", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 90px 90px 100px 80px 36px", padding: "10px 16px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", background: "var(--accent)", borderBottom: "1px solid var(--border)" }}>
          <span>종목</span><span style={{ textAlign: "right" }}>현재가</span><span style={{ textAlign: "right" }}>등락</span><span style={{ textAlign: "right" }}>수량</span><span style={{ textAlign: "right" }}>평균매수단가</span><span style={{ textAlign: "right" }}>평가손익</span><span style={{ textAlign: "center" }}>차트</span><span></span>
        </div>
        {holdings.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", fontSize: "0.875rem", color: "var(--muted)" }}>
            <p>보유 종목이 없습니다</p>
            <p style={{ fontSize: "0.8rem", marginTop: "6px" }}>종목 추가 버튼을 눌러 시작하세요</p>
          </div>
        ) : holdings.map((h, i) => {
          const s = prices[h.code];
          const curPrice = s?.price ?? h.avgPrice;
          const pnl = (curPrice - h.avgPrice) * h.quantity;
          const pnlRate = ((curPrice - h.avgPrice) / h.avgPrice) * 100;
          const up = pnl >= 0;
          const changeColor = s ? (s.change >= 0 ? "#dc2626" : "#2563eb") : "var(--muted)";
          const hist = history[h.code] ?? [];
          return (
            <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px 90px 90px 100px 80px 36px", padding: "12px 16px", alignItems: "center", borderBottom: i < holdings.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              onClick={() => openEdit(h)}
            >
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{h.name || h.code}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "1px" }}>{h.code}</p>
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", textAlign: "right" }}>{fmt(curPrice)}</p>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 500, color: changeColor }}>{s ? `${s.change >= 0 ? "+" : ""}${fmt(s.change)}` : "—"}</p>
                <p style={{ fontSize: "0.72rem", color: changeColor }}>{s ? `${s.changeRate >= 0 ? "+" : ""}${s.changeRate.toFixed(2)}%` : ""}</p>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--foreground)", textAlign: "right" }}>{fmt(h.quantity)}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", textAlign: "right" }}>{fmt(h.avgPrice)}</p>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: up ? "#16a34a" : "#dc2626" }}>{up ? "+" : ""}{fmtMoney(Math.round(pnl))}</p>
                <p style={{ fontSize: "0.72rem", color: up ? "#16a34a" : "#dc2626" }}>{pnlRate >= 0 ? "+" : ""}{pnlRate.toFixed(2)}%</p>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Sparkline data={hist} color={up ? "#16a34a" : "#dc2626"} />
              </div>
              <button onClick={e => { e.stopPropagation(); openEdit(h); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", opacity: 0.5 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
                <Pencil size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Watchlist */}
      <div style={{ borderRadius: "16px", border: "1px solid var(--border)", background: "var(--card)", padding: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "16px" }}>관심 종목</h3>
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input value={watchInput} onChange={e => onWatchInputChange(e.target.value)} placeholder="종목명 또는 코드 검색..."
            style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", outline: "none", fontSize: "0.875rem" }}
          />
          {watchInput && <button onClick={() => { setWatchInput(""); setWatchSearch([]); }} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={13} /></button>}
          {watchSearch.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)", zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
              {watchSearch.map(item => (
                <button key={item.code} onClick={() => addToWatchlist(item)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>{item.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{item.code} · {item.market}</span>
                </button>
              ))}
            </div>
          )}
          {watchSearching && <p style={{ position: "absolute", top: "100%", left: 0, marginTop: "4px", fontSize: "0.8rem", color: "var(--muted)" }}>검색 중...</p>}
        </div>

        {watchlist.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>관심 종목이 없습니다</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
            {watchlist.map(code => {
              const s = prices[code];
              const hist = history[code] ?? [];
              const up = s ? s.change >= 0 : true;
              const changeColor = s ? (s.change >= 0 ? "#dc2626" : "#2563eb") : "var(--muted)";
              return (
                <div key={code} style={{ borderRadius: "12px", padding: "14px", border: "1px solid var(--border)", background: "var(--accent)", position: "relative" }}>
                  <button onClick={() => removeFromWatchlist(code)} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", opacity: 0.5, padding: "2px" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
                    <X size={12} />
                  </button>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{s?.name || code}</p>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "8px" }}>{code}</p>
                  <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{s ? fmt(s.price) : "—"}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    {s ? (up ? <TrendingUp size={13} color={changeColor} /> : <TrendingDown size={13} color={changeColor} />) : null}
                    <span style={{ fontSize: "0.78rem", color: changeColor, fontWeight: 500 }}>
                      {s ? `${s.change >= 0 ? "+" : ""}${fmt(s.change)} (${s.changeRate >= 0 ? "+" : ""}${s.changeRate.toFixed(2)}%)` : "데이터 없음"}
                    </span>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <Sparkline data={hist} color={up ? "#16a34a" : "#dc2626"} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setShowModal(false)}>
          <div style={{ width: "100%", maxWidth: "440px", borderRadius: "20px", padding: "24px", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>{editId ? "종목 수정" : "종목 추가"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Stock search */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>종목 검색 *</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="종목명 또는 코드" autoFocus
                    style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", outline: "none", fontSize: "0.875rem" }}
                  />
                  {searchQuery && <button onClick={() => { setSearchQuery(""); setForm(f => ({ ...f, code: "", name: "" })); setSearchResults([]); }} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={13} /></button>}
                  {searchResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card)", zIndex: 60, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden" }}>
                      {searchResults.map(item => (
                        <button key={item.code} onClick={() => selectSearchItem(item)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>{item.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{item.code} · {item.market}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && <p style={{ position: "absolute", top: "100%", left: 0, marginTop: "4px", fontSize: "0.8rem", color: "var(--muted)" }}>검색 중...</p>}
                </div>
                {form.code && <p style={{ fontSize: "0.78rem", color: "var(--primary)", marginTop: "4px" }}>선택됨: {form.name} ({form.code})</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { label: "보유 수량 *", key: "quantity", placeholder: "0", type: "number" },
                  { label: "평균매수단가 (원) *", key: "avgPrice", placeholder: "0", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "4px" }}>{label}</label>
                    <input type={type} value={form[key as "quantity" | "avgPrice"]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", outline: "none", fontSize: "0.875rem" }}
                    />
                  </div>
                ))}
              </div>

              {form.code && form.quantity && form.avgPrice && (
                <div style={{ padding: "12px", borderRadius: "10px", background: "var(--accent)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "2px" }}>매수금액 (수량 × 평균매수단가)</p>
                  <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>
                    ₩{fmt(Math.round(Number(form.quantity) * Number(form.avgPrice)))}
                  </p>
                  {prices[form.code] && (
                    <>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "6px", marginBottom: "2px" }}>현재가 기준 평가금액</p>
                      <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>
                        ₩{fmt(Math.round(Number(form.quantity) * prices[form.code].price))}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              {editId && <button onClick={handleDelete} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}><Trash2 size={14} /> 삭제</button>}
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.875rem", marginLeft: "auto" }}>취소</button>
              <button onClick={handleSave} disabled={!form.code || !form.quantity || !form.avgPrice}
                style={{ padding: "9px 22px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "var(--primary-fg)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, opacity: (!form.code || !form.quantity || !form.avgPrice) ? 0.5 : 1 }}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
