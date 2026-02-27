import type { Dispatch, SetStateAction } from "react";
import StatusChips from "../../components/StatusChips";
import AdminCharts from "../../components/AdminCharts";
import type { Task, TaskStatus } from "../../api/tasks";
import type { AuditLog } from "../../api/audit";
import type { UserRow } from "./useAdminDashboard";

export function AdminKpisSection({
  kpiTotal,
  kpiPending,
  kpiInProgress,
  kpiCompleted,
  completionRate,
}: {
  kpiTotal: number;
  kpiPending: number;
  kpiInProgress: number;
  kpiCompleted: number;
  completionRate: number;
}) {
  return (
    <>
      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiTitle">Total Tasks</div>
          <div className="kpiValue">{kpiTotal}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Pending</div>
          <div className="kpiValue">{kpiPending}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">In Progress</div>
          <div className="kpiValue">{kpiInProgress}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTitle">Completed</div>
          <div className="kpiValue">{kpiCompleted}</div>
        </div>
      </div>

      <div className="kpiCard" style={{ marginTop: 12 }}>
        <div className="kpiTitle">Completion Rate</div>
        <div className="kpiValue">{completionRate.toFixed(2)}%</div>
      </div>
    </>
  );
}

export function AdminChartsSection({
  tasks,
  users,
}: {
  tasks: Task[];
  users: UserRow[];
}) {
  return (
    <div className="chartsGrid3">
      <div className="card chartCard">
        <h3 style={{ marginBottom: 8 }}>Tasks by Status</h3>
        <AdminCharts tasks={tasks} users={users} mode="status_donut" />
      </div>

      <div className="card chartCard">
        <h3 style={{ marginBottom: 8 }}>Tasks per User</h3>
        <AdminCharts tasks={tasks} users={users} mode="user_bar" />
      </div>

      <div className="card chartCard">
        <h3 style={{ marginBottom: 8 }}>Tasks created (last 7 days)</h3>
        <AdminCharts tasks={tasks} users={users} mode="daily_line" />
      </div>
    </div>
  );
}

export function UsersSection({
  usersAB,
  loading,
  shortId,
}: {
  usersAB: UserRow[];
  loading: boolean;
  shortId: (id?: string | null) => string;
}) {
  return (
    <div className="card">
      <h3>Users (A/B)</h3>
      <div className="table">
        <div className="tr head">
          <div>Email</div>
          <div>Role</div>
          <div></div>
        </div>

        {usersAB.map((u) => (
          <div className="tr" key={u.id}>
            <div>{u.email}</div>
            <div>{u.role}</div>
            <div className="muted small">{shortId(u.id)}</div>
          </div>
        ))}

        {!loading && usersAB.length === 0 && (
          <div className="muted">No users yet.</div>
        )}
      </div>
    </div>
  );
}

export function TasksSection({
  tasks, // ✅ pagedTasks
  allCount,
  loading,

  filter,
  setFilter,

  usersAB,
  ownerFilterId,
  setOwnerFilterId,

  taskQuery,
  setTaskQuery,

  page,
  setPage,
  pageCount,
  pageSize,
  setPageSize,

  userEmailById,
  onQuickStatus,
  onEdit,
  onDelete,
  onDownload,
}: {
  tasks: Task[];
  allCount: number;
  loading: boolean;

  filter: Record<TaskStatus, boolean>;
  setFilter: Dispatch<SetStateAction<Record<TaskStatus, boolean>>>;

  usersAB: UserRow[];
  ownerFilterId: string;
  setOwnerFilterId: (v: string) => void;

  taskQuery: string;
  setTaskQuery: (v: string) => void;

  page: number;
  setPage: (n: number) => void;
  pageCount: number;
  pageSize: number;
  setPageSize: (n: number) => void;

  userEmailById: Record<string, string>;
  onQuickStatus: (task: Task, status: TaskStatus) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => Promise<void>;
  onDownload: (attId: string, filename: string) => Promise<void>;
}) {
  return (
    <div className="card">
      <div className="tasksHeader">
        <h3 style={{ margin: 0 }}>All Tasks</h3>

        <div className="taskFiltersInline">
          {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((s) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={filter[s]}
                onChange={() => setFilter((p) => ({ ...p, [s]: !p[s] }))}
              />
              {s.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>

      {/* ✅ Search + Owner filter + Page size */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            flex: 1,
          }}
        >
          <input
            placeholder="Search by title / description / owner email / status..."
            value={taskQuery}
            onChange={(e) => setTaskQuery(e.target.value)}
            style={{ maxWidth: 420 }}
          />

          <select
            value={ownerFilterId}
            onChange={(e) => setOwnerFilterId(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            <option value="">All Owners</option>
            {usersAB.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role})
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{ maxWidth: 160 }}
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>

          <div className="muted small">
            Showing <b>{tasks.length}</b> of <b>{allCount}</b>
          </div>
        </div>

        {/* ✅ Pagination controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(1)}>
            {"<<"}
          </button>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {"<"}
          </button>

          <div className="muted small">
            Page <b>{page}</b> / <b>{pageCount}</b>
          </div>

          <button className="btn" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            {">"}
          </button>
          <button className="btn" disabled={page >= pageCount} onClick={() => setPage(pageCount)}>
            {">>"}
          </button>
        </div>
      </div>

      <div className="table">
        <div className="tr head">
          <div>Title</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {tasks.map((t) => (
          <div className="tr" key={t.id}>
            <div>
              <b>{t.title}</b>
              <div className="muted small">{t.description}</div>

              <div className="muted small">
                Assigned to: <b>{userEmailById[t.owner_id] || t.owner_id}</b>
              </div>

              {/* ✅ NEW: Priority + Due date + Overdue */}
              <div className="muted small">
                Priority: <b>{t.priority ?? "MEDIUM"}</b>
              </div>

              {t.due_date && (
                <div className="muted small">
                  📅 Due: {new Date(t.due_date).toLocaleDateString()}
                  {new Date(t.due_date) < new Date() && t.status !== "COMPLETED" && (
                    <span style={{ color: "#ef4444", marginLeft: 8 }}>🔴 Overdue</span>
                  )}
                </div>
              )}

              {t.attachments?.length ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>Attachments</div>
                  {t.attachments.map((a) => (
                    <div
                      key={a.id}
                      style={{ display: "flex", gap: 10, marginTop: 4 }}
                    >
                      <span className="muted small">{a.original_name}</span>
                      <button
                        className="btn"
                        onClick={() => onDownload(a.id, a.original_name)}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <StatusChips
                value={t.status}
                onChange={(s) => onQuickStatus(t, s)}
                disabled={!t.can_edit_status}
              />
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => onEdit(t)} disabled={!t.can_edit_status}>
                Edit
              </button>

              <button className="btn danger" onClick={() => onDelete(t)} disabled={!t.can_delete}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {!loading && tasks.length === 0 && (
          <div className="muted">No tasks match your filters.</div>
        )}
      </div>
    </div>
  );
}

export function AuditSection({
  logs,
  loading,
  showLogs,
  setShowLogs,
  logEntity,
  setLogEntity,
  logAction,
  setLogAction,
  logLimit,
  setLogLimit,
  safeParsePayload,
  shortId,
  fmtStatus,
}: {
  logs: AuditLog[];
  loading: boolean;
  showLogs: boolean;
  setShowLogs: Dispatch<SetStateAction<boolean>>;
  logEntity: string;
  setLogEntity: (v: string) => void;
  logAction: string;
  setLogAction: (v: string) => void;
  logLimit: number;
  setLogLimit: (v: number) => void;
  safeParsePayload: (p: any) => any;
  shortId: (id?: string | null) => string;
  fmtStatus: (s?: string) => string;
}) {
  return (
    <div className="card">
      <div className="auditHeader">
        <div className="auditTitleRow">
          <h3 style={{ margin: 0 }}>Audit Logs</h3>
          <button className="btn" onClick={() => setShowLogs((p) => !p)}>
            {showLogs ? "Hide" : "Show"}
          </button>
        </div>

        <div className="auditFilters">
          <select value={logEntity} onChange={(e) => setLogEntity(e.target.value)}>
            <option value="">All Entities</option>
            <option value="tasks">tasks</option>
            <option value="users">users</option>
          </select>

          <select value={logAction} onChange={(e) => setLogAction(e.target.value)}>
            <option value="">All Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select value={logLimit} onChange={(e) => setLogLimit(Number(e.target.value))}>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>
        </div>
      </div>

      {showLogs && (
        <div className="auditWrap">
          <div className="table auditTable" style={{ marginTop: 10 }}>
            <div className="tr head">
              <div>When</div>
              <div>Actor</div>
              <div>Action</div>
              <div>Details</div>
            </div>

            {logs.map((l) => {
              const data = safeParsePayload(l.payload);
              return (
                <div className="tr" key={l.id}>
                  <div className="small muted">{new Date(l.created_at).toLocaleString()}</div>

                  <div>
                    <div>
                      <b>{l.actor_email || "System"}</b>
                    </div>
                    <div className="small muted">{l.actor_id ? shortId(l.actor_id) : ""}</div>
                  </div>

                  <div>
                    <b>{l.action}</b>
                    <div className="small muted">{l.entity}</div>
                  </div>

                  <div className="auditDetails">
                    <div className="auditMeta">entity_id: {shortId(l.entity_id)}</div>

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
                        <b>{data?.description ?? "-"}</b>
                      </div>

                      <div className="full">
                        <span>Created</span>
                        <b>{data?.created_at ? new Date(data.created_at).toLocaleString() : "-"}</b>
                      </div>

                      {data?.raw && (
                        <div className="full">
                          <span>Raw</span>
                          <b>{String(data.raw)}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && logs.length === 0 && <div className="muted">No logs found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}