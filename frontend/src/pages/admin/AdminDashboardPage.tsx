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

export default function AdminDashboardPage() {
  const a = useAdminDashboard();
  const navigate = useNavigate();

  return (
    <div>
      <Navbar />

      <div className="container">
        <h2>Admin Dashboard</h2>

        {a.err && <div className="errorBox">{a.err}</div>}
        {a.loading && <div className="muted">Loading...</div>}

        {/* ACTION BAR */}
        <div className="row">
          <button className="btn primary" onClick={() => a.setOpenUser(true)}>
            + Create User
          </button>

          <button className="btn primary" onClick={() => a.setOpenTask(true)}>
            + Create Task
          </button>

          <button className="btn primary" onClick={() => a.setOpenDoc(true)}>
            Send PDF
          </button>

          <button className="btn danger" onClick={() => navigate("/admin/audit")}>
            View Audit Logs
          </button>

          <button
  className="btn danger"
  onClick={() => navigate("/admin/auth-activity")}
>
  View Auth Activity
</button>

          <button className="btn" onClick={a.loadAll}>
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

        <UsersSection usersAB={a.usersAB} loading={a.loading} shortId={a.shortId} />

        <TasksSection
          tasks={a.pagedTasks}
          allCount={a.searchedTasks.length}
          loading={a.loading}
          filter={a.filter}
          setFilter={a.setFilter}
          usersAB={a.usersAB}
          ownerFilterId={a.ownerFilterId}
          setOwnerFilterId={a.setOwnerFilterId}
          taskQuery={a.taskQuery}
          setTaskQuery={a.setTaskQuery}
          page={a.page}
          setPage={a.setPage}
          pageCount={a.pageCount}
          pageSize={a.pageSize}
          setPageSize={a.setPageSize}
          userEmailById={a.userEmailById}
          onQuickStatus={a.quickStatus}
          onEdit={a.openEditModal}
          onDelete={a.removeTask}
          onDownload={a.handleDownload}
        />
      </div>

      {/* MODALS */}
      <CreateUserModal
        open={a.openUser}
        onClose={() => a.setOpenUser(false)}
        newUser={a.newUser}
        setNewUser={a.setNewUser}
        onSubmit={a.submitCreateUser}
      />

      <CreateTaskModal
        open={a.openTask}
        onClose={() => a.setOpenTask(false)}
        taskForm={a.taskForm}
        setTaskForm={a.setTaskForm}
        usersAB={a.usersAB}
        taskPdf={a.taskPdf}
        setTaskPdf={a.setTaskPdf}
        onSubmit={a.submitCreateTask}
      />

      <EditTaskModal
        open={a.openEdit}
        onClose={() => a.setOpenEdit(false)}
        editTask={a.editTask}
        editForm={a.editForm}
        setEditForm={a.setEditForm}
        onSubmit={a.submitEditTask}
      />

      <SendDocModal
        open={a.openDoc}
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