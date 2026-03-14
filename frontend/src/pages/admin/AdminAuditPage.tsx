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

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function fmtBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function safeParsePayload(payload: any): any {
  if (!payload) return null;

  let data = payload;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { raw: payload };
    }
  }

  if (typeof data !== "object" || data === null) {
    return { raw: String(data) };
  }

  if (data?.new && typeof data.new === "object") {
    return {
      ...data.new,
      __old: data.old ?? null,
      __new: data.new,
    };
  }

  return data;
}

function getChangedFields(oldObj: any, newObj: any) {
  if (!oldObj || !newObj) return [];

  const hiddenKeys = new Set([
    "owner_id",
    "created_by",
    "updated_by",
    "uploaded_by",
    "user_id",
  ]);

  const keys = Array.from(
    new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  );

  return keys
    .filter((key) => !hiddenKeys.has(key))
    .filter((key) => JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key]))
    .map((key) => ({
      key,
      oldValue: oldObj?.[key],
      newValue: newObj?.[key],
    }));
}

function formatAuditValue(key: string, value: any) {
  if (value === null || value === undefined || value === "") return "-";

  if (
    key === "owner_email" ||
    key === "created_by_email" ||
    key === "updated_by_email" ||
    key === "uploaded_by_email" ||
    key === "user_email"
  ) {
    return String(value);
  }

  if (
    key.toLowerCase().includes("created_at") ||
    key.toLowerCase().includes("updated_at") ||
    key.toLowerCase().includes("completed_at") ||
    key.toLowerCase().includes("due_date")
  ) {
    return fmtDate(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (key === "status") {
    return fmtStatus(String(value));
  }

  if (key === "size_bytes") {
    return fmtBytes(Number(value));
  }

  if (key.endsWith("_id") || key === "id" || key === "task_id") {
    return shortId(String(value));
  }

  return String(value);
}

function prettyFieldName(key: string) {
  return key
    .replace(/_email$/i, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function KV({
  label,
  value,
  full = false,
  wrap = false,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className={full ? "full" : ""}>
      <span>{label}</span>
      <b className={wrap ? "wrap" : ""}>{value}</b>
    </div>
  );
}

function renderEntityDetails(entity: string, data: any) {
  if (!data) {
    return <KV label="Payload" value="-" full />;
  }

  switch (entity) {
    case "tasks":
      return (
        <>
          <KV label="Title" value={data?.title ?? "-"} />
          <KV label="Status" value={fmtStatus(data?.status)} />
          <KV label="Owner" value={data?.owner_email || shortId(data?.owner_id)} />
          <KV label="Created By" value={data?.created_by_email || shortId(data?.created_by)} />
          {/* <KV label="Updated By" value={data?.updated_by_email || shortId(data?.updated_by)} /> */}
          {/* <KV label="Priority" value={data?.priority ?? "-"} />
          <KV label="Due Date" value={fmtDate(data?.due_date)} />
          <KV label="Completed At" value={fmtDate(data?.completed_at)} /> */}
          <KV label="Description" value={data?.description ?? "-"} full wrap />
          {/* <KV label="Created" value={fmtDate(data?.created_at)} full />
          <KV label="Updated" value={fmtDate(data?.updated_at)} full /> */}
        </>
      );

    case "task_attachments":
      return (
        <>
          <KV label="Task ID" value={shortId(data?.task_id)} />
          <KV label="Uploaded By" value={data?.uploaded_by_email || shortId(data?.uploaded_by)} />
          <KV label="Original Name" value={data?.original_name ?? "-"} full wrap />
          <KV label="Storage Name" value={data?.storage_name ?? "-"} full wrap />
          <KV label="Content Type" value={data?.content_type ?? "-"} />
          <KV label="Size" value={fmtBytes(data?.size_bytes)} />
          <KV label="Created" value={fmtDate(data?.created_at)} full />
        </>
      );

    case "task_comments":
      return (
        <>
          <KV label="Task ID" value={shortId(data?.task_id)} />
          <KV label="User" value={data?.user_email || shortId(data?.user_id)} />
          <KV label="Edited" value={data?.is_edited ? "Yes" : "No"} />
          <KV label="Comment" value={data?.content ?? "-"} full wrap />
          <KV label="Created" value={fmtDate(data?.created_at)} />
          <KV label="Updated" value={fmtDate(data?.updated_at)} />
        </>
      );

    case "users":
      return (
        <>
          <KV label="Email" value={data?.email ?? "-"} full wrap />
          <KV label="Role" value={data?.role ?? "-"} />
          <KV
            label="Active"
            value={typeof data?.is_active === "boolean" ? (data.is_active ? "Yes" : "No") : "-"}
          />
          <KV
            label="Email Verified"
            value={
              typeof data?.email_verified === "boolean"
                ? data.email_verified
                  ? "Yes"
                  : "No"
                : "-"
            }
          />
          <KV
            label="Must Set Password"
            value={
              typeof data?.must_set_password === "boolean"
                ? data.must_set_password
                  ? "Yes"
                  : "No"
                : "-"
            }
          />
          <KV label="Created" value={fmtDate(data?.created_at)} />
          <KV label="Updated" value={fmtDate(data?.updated_at)} />
        </>
      );

    default:
      return (
        <div className="full">
          <span>Payload</span>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}

export default function AdminAuditPage() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [limit, setLimit] = useState(100);
  const [entity, setEntity] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [q, setQ] = useState("");
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
      const payloadText =
        typeof l.payload === "string"
          ? l.payload.toLowerCase()
          : JSON.stringify(l.payload || {}).toLowerCase();

      return (
        actor.includes(query) ||
        ent.includes(query) ||
        entId.includes(query) ||
        act.includes(query) ||
        payloadText.includes(query)
      );
    });
  }, [logs, q]);

  return (
    <div>
      <Navbar />

      <div className="container">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="row" style={{ margin: 0 }}>
            <button className="btn" onClick={() => navigate("/admin")}>
              ← Back
            </button>

            <div>
              <h2 style={{ margin: 0 }}>Audit Logs</h2>
            </div>
          </div>

          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="card">
          <div className="auditTopBar">
            <div className="auditFiltersRow">
              <select value={entity} onChange={(e) => setEntity(e.target.value)}>
                <option value="">All Entities</option>
                <option value="tasks">tasks</option>
                <option value="task_attachments">task_attachments</option>
                <option value="task_comments">task_comments</option>
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
                placeholder="Search actor / entity / entity id / action / payload"
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
              const changes =
                data?.__old && data?.__new
                  ? getChangedFields(data.__old, data.__new)
                  : [];

              return (
                <div key={l.id} style={{ display: "grid", gap: 8 }}>
                  <div
                    className={`tr tr-audit-row ${open ? "open" : ""}`}
                    onClick={() => setExpandedId(open ? null : l.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="small muted">{fmtDate(l.created_at)}</div>

                    <div className="wrap">
                      <b>{l.actor_email || "System"}</b>
                      <div className="small muted">
                        {l.actor_id ? shortId(l.actor_id) : ""}
                      </div>
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
                        {renderEntityDetails(l.entity, data)}

                        {data?.raw && <KV label="Raw" value={String(data.raw)} full wrap />}

                        {changes.length > 0 && (
                          <div className="full">
                            <span>Changed Fields</span>
                            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                              {changes.map((c) => (
                                <div
                                  key={c.key}
                                  className="row"
                                  style={{ justifyContent: "space-between", margin: 0 }}
                                >
                                  <b>{prettyFieldName(c.key)}</b>
                                  <div className="small wrap" style={{ textAlign: "right" }}>
                                    <span className="muted">
                                      {formatAuditValue(c.key, c.oldValue)}
                                    </span>
                                    {"  →  "}
                                    <span>{formatAuditValue(c.key, c.newValue)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && rows.length === 0 && (
              <div className="muted">No logs found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}