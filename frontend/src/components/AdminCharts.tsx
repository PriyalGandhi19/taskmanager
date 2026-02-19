import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarController,
  DoughnutController,
  LineController,
} from "chart.js";
import type { Task } from "../api/tasks";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarController,
  DoughnutController,
  LineController
);

type UserRow = { id: string; email: string; role: "A" | "B" | "ADMIN" };

function dayKey(d: Date) {
  // local yyyy-mm-dd (stable for charts)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export default function AdminCharts({
  tasks,
  users,
  mode,
}: {
  tasks: Task[];
  users: UserRow[];
  mode: "status_donut" | "user_bar" | "daily_line";
}) {
  // =========================
  // 1) STATUS DONUT
  // =========================
  const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const t of tasks) {
    if (t.status in counts) {
      // @ts-ignore
      counts[t.status] += 1;
    }
  }

  const statusLabels = ["Pending", "In Progress", "Completed"];
  const statusValues = [counts.PENDING, counts.IN_PROGRESS, counts.COMPLETED];

  const statusData = {
    labels: statusLabels,
    datasets: [
      {
        label: "Tasks",
        data: statusValues,
        backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
        borderColor: ["#fbbf24", "#60a5fa", "#34d399"],
        borderWidth: 1,
      },
    ],
  };

  const donutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#e2e8f0" },
      },
    },
  };

  // =========================
  // 2) TASKS PER USER (BAR)
  // =========================
  // count tasks by owner_id
  const perUserCount: Record<string, number> = {};
  for (const t of tasks) {
    perUserCount[t.owner_id] = (perUserCount[t.owner_id] || 0) + 1;
  }

  // only show A/B users in bar chart
  const abUsers = users.filter((u) => u.role === "A" || u.role === "B");

  // labels = email, values = counts
  const userLabels = abUsers.map((u) => u.email);
  const userValues = abUsers.map((u) => perUserCount[u.id] || 0);

  const userBarData = {
    labels: userLabels,
    datasets: [
      {
        label: "Tasks per User",
        data: userValues,
        backgroundColor: "#60a5fa",
        borderRadius: 10,
      },
    ],
  };

  const userBarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#e2e8f0", maxRotation: 30, minRotation: 0 },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { color: "#e2e8f0" },
        grid: { color: "rgba(255,255,255,0.06)" },
        beginAtZero: true,
        suggestedMax: Math.max(...userValues, 1) + 1,
      },
    },
  };

  // =========================
  // 3) TASKS CREATED LAST 7 DAYS (LINE)
  // =========================
  const today = new Date();
  const days: string[] = [];
  const countsByDay: Record<string, number> = {};

  // build last 7 days keys
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    days.push(key);
    countsByDay[key] = 0;
  }

  // count tasks by created_at
  for (const t of tasks) {
    const created = new Date(t.created_at);
    const k = dayKey(created);
    if (k in countsByDay) countsByDay[k] += 1;
  }

  const dailyValues = days.map((k) => countsByDay[k]);

  const dailyLineData = {
    labels: days.map((d) => d.slice(5)), // show MM-DD
    datasets: [
      {
        label: "Tasks Created",
        data: dailyValues,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.2)",
        tension: 0.35,
        pointRadius: 4,
      },
    ],
  };

  const dailyLineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#e2e8f0" } },
    },
    scales: {
      x: {
        ticks: { color: "#e2e8f0" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { color: "#e2e8f0" },
        grid: { color: "rgba(255,255,255,0.06)" },
        beginAtZero: true,
        suggestedMax: Math.max(...dailyValues, 1) + 1,
      },
    },
  };

  // =========================
  // RENDER BY MODE
  // =========================
  if (mode === "status_donut") {
    return (
      <div className="donutWrap">
        <div style={{ width: 240, height: 190 }}>
          <Doughnut data={statusData} options={donutOptions} />
        </div>
      </div>
    );
  }

  if (mode === "user_bar") {
    return (
      <div style={{ height: 220 }}>
        <Bar data={userBarData} options={userBarOptions} />
      </div>
    );
  }

  // daily_line
  return (
    <div style={{ height: 220 }}>
      <Line data={dailyLineData} options={dailyLineOptions} />
    </div>
  );
}
