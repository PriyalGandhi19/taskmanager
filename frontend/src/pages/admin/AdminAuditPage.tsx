import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { getAuditLogs, type AuditLog } from "../../api/audit";
import { useNavigate } from "react-router-dom";

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 8 ? id.slice(0, 8) + "..." : id;
}

function fmtStatus(s?: string) {
  if (!s) return "-";
  return s.replaceAll("_", " ");
}

function safeParsePayload(payload: any): any {
  if (!payload) return null;
  if (typeof payload === "object") return payload;

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return { raw: payload };
    }
  }

  return { raw: String(payload) };
}

export default function AdminAuditPage() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [limit, setLimit] = useState(100);
  const [entity, setEntity] = useState<string>("");
  const [action, setAction] = useState<string>("");

  // ✅ search
  const [q, setQ] = useState("");

  // ✅ expand row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await getAuditLogs({
        limit,
        entity: entity || undefined,
        action: action || undefined,
      });
      setLogs(res?.data?.logs ?? []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, entity, action]);

  const rows = useMemo(() => {
    const list = logs ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;

    return list.filter((l) => {
      const actor = (l.actor_email || "").toLowerCase();
      const ent = (l.entity || "").toLowerCase();
      const entId = (l.entity_id || "").toLowerCase();
      const act = (l.action || "").toLowerCase();

      return (
        actor.includes(query) ||
        ent.includes(query) ||
        entId.includes(query) ||
        act.includes(query)
      );
    });
  }, [logs, q]);

  return (
    <div>
      <Navbar />

      <div className="container">
        {/* Top bar */}
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="row" style={{ margin: 0 }}>
            <button className="btn" onClick={() => navigate("/admin")}>
              ← Back
            </button>

            <div>
              <h2 style={{ margin: 0 }}>Audit Logs</h2>
              <div className="muted small">Click a row to expand details</div>
            </div>
          </div>

          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="auditTopBar">
            <div className="auditFiltersRow">
              <select value={entity} onChange={(e) => setEntity(e.target.value)}>
                <option value="">All Entities</option>
                <option value="tasks">tasks</option>
                <option value="users">users</option>
              </select>

              <select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>

              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={50}>Last 50</option>
                <option value={100}>Last 100</option>
                <option value={200}>Last 200</option>
                <option value={500}>Last 500</option>
              </select>

              <input
                placeholder="Search actor / entity / entity id / action"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="muted small">
              Showing: <b>{rows.length}</b>
            </div>
          </div>

          {err && <div className="errorBox">{err}</div>}
          {loading && <div className="muted">Loading...</div>}
        </div>

        {/* List */}
        <div className="card">
          <div className="table">
            <div className="tr head tr-audit-head">
              <div>When</div>
              <div>Actor</div>
              <div>Action</div>
              <div>Entity</div>
            </div>

            {rows.map((l) => {
              const open = expandedId === l.id;
              const data = safeParsePayload(l.payload);

              return (
                <div key={l.id} style={{ display: "grid", gap: 8 }}>
                  <div
                    className={`tr tr-audit-row ${open ? "open" : ""}`}
                    onClick={() => setExpandedId(open ? null : l.id)}
                  >
                    <div className="small muted">{new Date(l.created_at).toLocaleString()}</div>

                    <div className="wrap">
                      <b>{l.actor_email || "System"}</b>
                      <div className="small muted">{l.actor_id ? shortId(l.actor_id) : ""}</div>
                    </div>

                    <div>
                      <b>{l.action}</b>
                    </div>

                    <div className="wrap">
                      <span className="badge">{l.entity}</span>{" "}
                      <span className="muted small">id: {shortId(l.entity_id)}</span>
                    </div>
                  </div>

                  {open && (
                    <div className="card auditDetailsCard">
                      <div className="auditKVs">
                        <div>
                          <span>Title</span>
                          <b>{data?.title ?? "-"}</b>
                        </div>
                        <div>
                          <span>Status</span>
                          <b>{fmtStatus(data?.status)}</b>
                        </div>
                        <div>
                          <span>Owner</span>
                          <b>{shortId(data?.owner_id)}</b>
                        </div>

                        <div className="full">
                          <span>Description</span>
                          <b className="wrap">{data?.description ?? "-"}</b>
                        </div>

                        <div className="full">
                          <span>Created</span>
                          <b>{data?.created_at ? new Date(data.created_at).toLocaleString() : "-"}</b>
                        </div>

                        {data?.raw && (
                          <div className="full">
                            <span>Raw</span>
                            <b className="wrap">{String(data.raw)}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && rows.length === 0 && <div className="muted">No logs found.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}