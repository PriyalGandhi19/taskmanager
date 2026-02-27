import type { TaskPriority } from "../api/tasks";

export default function PriorityBadge({ value }: { value: TaskPriority }) {
  const map = {
    HIGH: { label: "🔴 High", color: "#ef4444" },
    MEDIUM: { label: "🟡 Medium", color: "#f59e0b" },
    LOW: { label: "🟢 Low", color: "#22c55e" },
  };

  const cfg = map[value];

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${cfg.color}`,
        fontSize: 12,
      }}
    >
      {cfg.label}
    </span>
  );
}