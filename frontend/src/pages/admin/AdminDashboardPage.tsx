import Navbar from "../../components/Navbar";
import { useAdminDashboard } from "./useAdminDashboard";
import {
  AdminChartsSection,
  AdminKpisSection,
  TasksSection,
  UsersSection,
} from "./AdminSections";
import {
  CreateTaskModal,
  CreateUserModal,
  EditTaskModal,
  SendDocModal,
} from "./AdminModals";
import { useNavigate } from "react-router-dom";
import { useSessionExpired } from "../../hooks/useSessionExpired";

export default function AdminDashboardPage() {
  const a = useAdminDashboard();
  const navigate = useNavigate();
  const expired = useSessionExpired();

  const lockedNavigate = (path: string) => {
    if (expired) return;
    navigate(path);
  };

  return (
    <div>
      <Navbar />

      <div className="session-page-wrap">
        <div className={`container ${expired ? "session-locked-content" : ""}`}>
          <h2>Admin Dashboard</h2>

          {a.err && <div className="errorBox">{a.err}</div>}
          {a.loading && <div className="muted">Loading...</div>}

          <div className="row">
            <button
              className="btn primary"
              disabled={expired}
              onClick={() => !expired && a.setOpenUser(true)}
            >
              + Create User
            </button>

            <button
              className="btn primary"
              disabled={expired}
              onClick={() => !expired && a.setOpenTask(true)}
            >
              + Create Task
            </button>

            <button
              className="btn primary"
              disabled={expired}
              onClick={() => !expired && a.setOpenDoc(true)}
            >
              Send Document
            </button>

            <button
              className="btn danger"
              disabled={expired}
              onClick={() => lockedNavigate("/admin/audit")}
            >
              View Audit Logs
            </button>

            <button
              className="btn danger"
              disabled={expired}
              onClick={() => lockedNavigate("/admin/auth-activity")}
            >
              View Auth Activity
            </button>

            <button
              className="btn"
              disabled={expired}
              onClick={() => !expired && a.loadAll()}
            >
              Refresh
            </button>
          </div>

          <AdminKpisSection
            kpiTotal={a.kpiTotal}
            kpiPending={a.kpiPending}
            kpiInProgress={a.kpiInProgress}
            kpiCompleted={a.kpiCompleted}
            completionRate={a.completionRate}
          />

          <AdminChartsSection tasks={a.tasks} users={a.users} />

          <UsersSection
            usersAB={a.usersAB}
            loading={a.loading}
            shortId={a.shortId}
            onToggleStatus={a.changeUserActiveStatus}
          />

          <TasksSection
            tasks={a.pagedTasks}
            allCount={a.searchedTasks.length}
            loading={a.loading}
            filter={a.filter}
            setFilter={expired ? () => {} : a.setFilter}
            usersAB={a.usersAB}
            ownerFilterId={a.ownerFilterId}
            setOwnerFilterId={expired ? () => {} : a.setOwnerFilterId}
            taskQuery={a.taskQuery}
            setTaskQuery={expired ? () => {} : a.setTaskQuery}
            page={a.page}
            setPage={expired ? () => {} : a.setPage}
            pageCount={a.pageCount}
            pageSize={a.pageSize}
            setPageSize={expired ? () => {} : a.setPageSize}
            userEmailById={a.userEmailById}
           onQuickStatus={expired ? async (_task, _status) => {} : a.quickStatus}

            onView={expired ? () => {} : a.openViewModal}
            onComment={expired ? () => {} : a.openCommentModal}
            onEdit={expired ? () => {} : a.openEditModal}
            onDelete={expired ? async (_task) => {} : a.removeTask}
            onDownload={expired ? async (_attId, _filename) => {} : a.handleDownload}
          />
        </div>

        {expired && <div className="session-content-overlay" />}
      </div>

      <CreateUserModal
        open={!expired && a.openUser}
        onClose={() => a.setOpenUser(false)}
        newUser={a.newUser}
        setNewUser={a.setNewUser}
        onSubmit={a.submitCreateUser}
      />

      <CreateTaskModal
        open={!expired && a.openTask}
        onClose={() => a.setOpenTask(false)}
        taskForm={a.taskForm}
        setTaskForm={a.setTaskForm}
        usersAB={a.usersAB}
        taskFiles={a.taskFiles}
        setTaskFiles={a.setTaskFiles}
        onSubmit={a.submitCreateTask}
      />

      <EditTaskModal
        open={!expired && a.openEdit}
        mode={a.modalMode}
        onClose={() => {
          a.setOpenEdit(false);
          a.setEditTask(null);
          a.setErr("");
        }}
        editTask={a.editTask}
        editForm={a.editForm}
        setEditForm={a.setEditForm}
        onSubmit={a.submitEditTask}
        comments={a.comments}
        commentsLoading={a.commentsLoading}
        onAddComment={a.addCommentToCurrentTask}
        onEditComment={a.editCommentForCurrentTask}
        onDeleteComment={a.deleteCommentForCurrentTask}
      />

      <SendDocModal
        open={!expired && a.openDoc}
        onClose={() => a.setOpenDoc(false)}
        docForm={a.docForm}
        setDocForm={a.setDocForm}
        docFile={a.docFile}
        setDocFile={a.setDocFile}
        onSubmit={a.submitSendDoc}
      />
    </div>
  );
}