import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { Task } from "../api/tasks";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminCharts({
  tasks,
  mode,
}: {
  tasks: Task[];
  mode: "bar" | "pie";
}) {
  const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const t of tasks) counts[t.status]++;

  const data = {
    labels: ["Pending", "In Progress", "Completed"],
    datasets: [
      {
        label: "Tasks",
        data: [counts.PENDING, counts.IN_PROGRESS, counts.COMPLETED],
        backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
        borderWidth: 0,
        borderRadius: mode === "bar" ? 8 : 0,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: mode === "pie",
        position: "bottom",
        labels: { color: "#cbd5e1" },
      },
    },
    scales:
      mode === "bar"
        ? {
            x: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,0.06)" } },
            y: { ticks: { color: "#cbd5e1" }, grid: { color: "rgba(255,255,255,0.06)" } },
          }
        : undefined,
  };

  return mode === "bar" ? (
  <div style={{ height: 190 }}>
    <Bar data={data} options={options} />
  </div>
) : (
  <div className="donutWrap">
    <div style={{ width: 210, height: 190 }}>
      <Pie data={data} options={options} />
    </div>
  </div>
);
}
