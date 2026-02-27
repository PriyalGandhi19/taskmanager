// src/pages/admin/AdminAuthActivityPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { useNavigate } from "react-router-dom";
import {
  exportAuthActivity,
  getAuthActivity,
  type AuthActivity,
} from "../../api/authActivity";
import { triggerDownload } from "../../utils/download";

// strict unions (matches api/authActivity.ts)
type EventType = "" | "LOGIN" | "LOGOUT" | "FAILED_LOGIN";
type SuccessFilter = "" | "true" | "false";

function shortText(s?: string | null, n = 36) {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n) + "..." : s;
}

// small helper: debounce any value
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export default function AdminAuthActivityPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<AuthActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // server-side params
  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [emailInput, setEmailInput] = useState<string>("");
  const debouncedEmail = useDebouncedValue(emailInput, 400);

  const [eventType, setEventType] = useState<EventType>("");
  const [success, setSuccess] = useState<SuccessFilter>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // client-side quick search (within loaded rows only)
  const [q, setQ] = useState<string>("");

  const pageCount = useMemo(() => {
    const l = Math.max(1, limit || 1);
    return Math.max(1, Math.ceil((total || 0) / l));
  }, [total, limit]);

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    try {
      const res = await getAuthActivity({
        limit,
        page, // ✅ pagination param
        email: debouncedEmail.trim() || undefined,
        event: eventType || undefined,
        success: success || undefined,
        from: from || undefined,
        to: to || undefined,
      });

      setItems(res?.data?.items ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load auth activity"
      );
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit, page, debouncedEmail, eventType, success, from, to]);

  // ✅ single effect: whenever params change, fetch
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return (items || []).filter((a) => {
      const em = (a.email || "").toLowerCase();
      const ev = (a.event || "").toLowerCase();
      const ip = (a.ip || "").toLowerCase();
      const ua = (a.user_agent || "").toLowerCase();
      return (
        em.includes(query) ||
        ev.includes(query) ||
        ip.includes(query) ||
        ua.includes(query)
      );
    });
  }, [items, q]);

  const downloadCsv = useCallback(async () => {
    setErr("");
    try {
      const blob = await exportAuthActivity({
        email: debouncedEmail.trim() || undefined,
        event: eventType || undefined,
        success: success || undefined,
        from: from || undefined,
        to: to || undefined,
      });

      triggerDownload(
        blob,
        `auth_activity_${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Download failed");
    }
  }, [debouncedEmail, eventType, success, from, to]);

  // ✅ reset helpers (IMPORTANT: reset page only in handlers; no looping effects)
  const onChangeLimit = (v: number) => {
    setPage(1);
    setLimit(v);
  };
  const onChangeEvent = (v: EventType) => {
    setPage(1);
    setEventType(v);
  };
  const onChangeSuccess = (v: SuccessFilter) => {
    setPage(1);
    setSuccess(v);
  };
  const onChangeFrom = (v: string) => {
    setPage(1);
    setFrom(v);
  };
  const onChangeTo = (v: string) => {
    setPage(1);
    setTo(v);
  };
  const onChangeEmail = (v: string) => {
    setPage(1); // email changes => always go to page 1
    setEmailInput(v);
  };

  const resetFilters = () => {
    setLimit(100);
    setPage(1);
    setTotal(0);

    setEmailInput("");
    setEventType("");
    setSuccess("");
    setFrom("");
    setTo("");
    setQ("");
  };

  return (
    <div>
      <Navbar />

      <div className="container">
        {/* Top bar */}
        <div
          className="row"
          style={{ justifyContent: "space-between", marginBottom: 12 }}
        >
          <div className="row" style={{ margin: 0 }}>
            <button className="btn" onClick={() => navigate("/admin")}>
              ← Back
            </button>

            <div>
              <h2 style={{ margin: 0 }}>Auth Activity</h2>
              <div className="muted small">
                Login / Logout / Failed Login events
              </div>
            </div>
          </div>

          <div className="row" style={{ margin: 0, gap: 10 }}>
            <button className="btn" onClick={load} disabled={loading}>
              Refresh
            </button>

            <button className="btn" onClick={resetFilters} disabled={loading}>
              Reset
            </button>

            <button
              className="btn primary"
              onClick={downloadCsv}
              disabled={loading}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div
            className="row"
            style={{ justifyContent: "space-between", gap: 12 }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                value={limit}
                onChange={(e) => onChangeLimit(Number(e.target.value))}
              >
                <option value={50}>Last 50</option>
                <option value={100}>Last 100</option>
                <option value={200}>Last 200</option>
                <option value={500}>Last 500</option>
              </select>

              <input
                placeholder="Filter email (server)"
                value={emailInput}
                onChange={(e) => onChangeEmail(e.target.value)}
                style={{ maxWidth: 260 }}
              />

              <select
                value={eventType}
                onChange={(e) => onChangeEvent(e.target.value as EventType)}
              >
                <option value="">All Events</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="FAILED_LOGIN">FAILED_LOGIN</option>
              </select>

              <select
                value={success}
                onChange={(e) =>
                  onChangeSuccess(e.target.value as SuccessFilter)
                }
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>

              <input
                type="date"
                value={from}
                onChange={(e) => onChangeFrom(e.target.value)}
              />

              <input
                type="date"
                value={to}
                onChange={(e) => onChangeTo(e.target.value)}
              />

              <input
                placeholder="Quick search (within loaded rows)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ minWidth: 280 }}
              />
            </div>

            <div className="muted small">
              Showing: <b>{rows.length}</b> of <b>{items.length}</b> (loaded) •
              Total: <b>{total}</b>
            </div>
          </div>

          {err && (
            <div className="errorBox" style={{ marginTop: 10 }}>
              {err}
            </div>
          )}

          {loading && (
            <div className="muted" style={{ marginTop: 10 }}>
              Loading...
            </div>
          )}

          <div className="muted small" style={{ marginTop: 8 }}>
            Note: “Quick search” searches only within currently loaded results
            (page data). Server filters are Email/Event/Success/Date/Limit.
          </div>
        </div>

        {/* Pagination controls */}
        <div
          className="row"
          style={{ justifyContent: "space-between", marginTop: 10 }}
        >
          <div className="muted small">
            Page <b>{page}</b> / <b>{pageCount}</b>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn"
              disabled={loading || !canPrev}
              onClick={() => setPage(1)}
            >
              {"<<"}
            </button>
            <button
              className="btn"
              disabled={loading || !canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </button>
            <button
              className="btn"
              disabled={loading || !canNext}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              {">"}
            </button>
            <button
              className="btn"
              disabled={loading || !canNext}
              onClick={() => setPage(pageCount)}
            >
              {">>"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table">
            <div
              className="tr head"
              style={{
                gridTemplateColumns: "210px 240px 150px 110px 1fr",
                gap: 14,
              }}
            >
              <div>When</div>
              <div>Email</div>
              <div>Event</div>
              <div>Success</div>
              <div>IP / UA</div>
            </div>

            {rows.map((a) => (
              <div
                className="tr"
                key={a.id}
                style={{
                  gridTemplateColumns: "210px 240px 150px 110px 1fr",
                  gap: 14,
                }}
              >
                <div className="small muted">
                  {new Date(a.created_at).toLocaleString()}
                </div>

                <div className="wrap">
                  <b>{a.email}</b>
                </div>

                <div>
                  <b>{a.event}</b>
                </div>

                <div>
                  <span className={a.success ? "pillOk" : "pillBad"}>
                    {a.success ? "YES" : "NO"}
                  </span>
                </div>

                <div className="small muted">
                  <div>IP: {a.ip || "-"}</div>
                  <div title={a.user_agent || ""}>
                    UA: {shortText(a.user_agent, 60)}
                  </div>
                </div>
              </div>
            ))}

            {!loading && rows.length === 0 && (
              <div className="muted">No activity found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}