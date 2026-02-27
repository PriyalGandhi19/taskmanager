import { useMemo } from "react";
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
  const { statusData, donutOptions } = useMemo(() => {
    const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    for (const t of tasks) {
      if (t.status in counts) {
        // @ts-ignore
        counts[t.status] += 1;
      }
    }

    const data = {
      labels: ["Pending", "In Progress", "Completed"],
      datasets: [
        {
          label: "Tasks",
          data: [counts.PENDING, counts.IN_PROGRESS, counts.COMPLETED],
          backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
          borderColor: ["#fbbf24", "#60a5fa", "#34d399"],
          borderWidth: 1,
        },
      ],
    };

    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: "#e2e8f0" } },
      },
    };

    return { statusData: data, donutOptions: options };
  }, [tasks]);

  const { userBarData, userBarOptions } = useMemo(() => {
    const perUserCount: Record<string, number> = {};
    for (const t of tasks) {
      perUserCount[t.owner_id] = (perUserCount[t.owner_id] || 0) + 1;
    }

    const abUsers = users.filter((u) => u.role === "A" || u.role === "B");
    const labels = abUsers.map((u) => u.email);
    const values = abUsers.map((u) => perUserCount[u.id] || 0);

    const data = {
      labels,
      datasets: [
        {
          label: "Tasks per User",
          data: values,
          backgroundColor: "#60a5fa",
          borderRadius: 10,
        },
      ],
    };

    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#e2e8f0", maxRotation: 30, minRotation: 0 },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          ticks: { color: "#e2e8f0" },
          grid: { color: "rgba(255,255,255,0.06)" },
          beginAtZero: true,
          suggestedMax: Math.max(...values, 1) + 1,
        },
      },
    };

    return { userBarData: data, userBarOptions: options };
  }, [tasks, users]);

  const { dailyLineData, dailyLineOptions } = useMemo(() => {
    const today = new Date();
    const days: string[] = [];
    const countsByDay: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dayKey(d);
      days.push(key);
      countsByDay[key] = 0;
    }

    for (const t of tasks) {
      const created = new Date(t.created_at);
      const k = dayKey(created);
      if (k in countsByDay) countsByDay[k] += 1;
    }

    const values = days.map((k) => countsByDay[k]);

    const data = {
      labels: days.map((d) => d.slice(5)),
      datasets: [
        {
          label: "Tasks Created",
          data: values,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.2)",
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    };

    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#e2e8f0" } } },
      scales: {
        x: {
          ticks: { color: "#e2e8f0" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          ticks: { color: "#e2e8f0" },
          grid: { color: "rgba(255,255,255,0.06)" },
          beginAtZero: true,
          suggestedMax: Math.max(...values, 1) + 1,
        },
      },
    };

    return { dailyLineData: data, dailyLineOptions: options };
  }, [tasks]);

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

  return (
    <div style={{ height: 220 }}>
      <Line data={dailyLineData} options={dailyLineOptions} />
    </div>
  );
}