import React, { useMemo } from "react";

type RuleKey = "len" | "lower" | "upper" | "digit" | "symbol" | "match";

function hasLower(s: string) {
  return /[a-z]/.test(s);
}
function hasUpper(s: string) {
  return /[A-Z]/.test(s);
}
function hasDigit(s: string) {
  return /\d/.test(s);
}
function hasSymbol(s: string) {
  return /[^\w\s]/.test(s);
}

export default function PasswordStrength({
  password,
  confirmPassword,
  showMatchRule = true,
}: {
  password: string;
  confirmPassword?: string;
  showMatchRule?: boolean;
}) {
  const rules = useMemo(() => {
    const p = password || "";
    const c = confirmPassword ?? "";
    const hasConfirm = c.length > 0;

    const list: { key: RuleKey; label: string; ok: boolean }[] = [
      { key: "len", label: "At least 8 characters", ok: p.length >= 8 },
      { key: "digit", label: "Contains a digit", ok: hasDigit(p) },
      { key: "lower", label: "Contains a lowercase letter", ok: hasLower(p) },
      { key: "upper", label: "Contains an uppercase letter", ok: hasUpper(p) },
      { key: "symbol", label: "Contains a symbol", ok: hasSymbol(p) },
    ];

    // ✅ Show match rule ONLY after user starts typing confirm
    if (showMatchRule && hasConfirm) {
      list.unshift({
        key: "match",
        label: "Passwords should match",
        ok: p.length > 0 && p === c,
      });
    }

    return list;
  }, [password, confirmPassword, showMatchRule]);

  const passedCount = rules.filter((r) => r.ok).length;
  const total = rules.length;

  const strengthLabel =
    passedCount === total
      ? "Strong"
      : passedCount >= Math.max(3, total - 1)
      ? "Medium"
      : "Weak";

  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted" style={{ marginBottom: 6 }}>
        Password Strength: <b>{strengthLabel}</b>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {rules.map((r) => (
          <div
            key={r.key}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: r.ok ? "#22c55e" : "#f87171",
              fontSize: 13,
            }}
          >
            <span style={{ width: 18 }}>{r.ok ? "✓" : "✗"}</span>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
