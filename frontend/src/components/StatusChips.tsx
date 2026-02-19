import type { TaskStatus } from "../api/tasks";

export default function StatusChips({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="status-row">
      <label className="status-item">
        <input
          type="checkbox"
          checked={value === "PENDING"}
          onChange={() => onChange("PENDING")}
          disabled={disabled}
        />
        Pending
      </label>

      <label className="status-item">
        <input
          type="checkbox"
          checked={value === "IN_PROGRESS"}
          onChange={() => onChange("IN_PROGRESS")}
          disabled={disabled}
        />
        In Progress
      </label>

      <label className="status-item">
        <input
          type="checkbox"
          checked={value === "COMPLETED"}
          onChange={() => onChange("COMPLETED")}
          disabled={disabled}
        />
        Completed
      </label>
    </div>
  );
}
