import { useMemo, useState } from "react";
import type { TaskComment } from "../api/tasks";

type Role = "ADMIN" | "A" | "B";

export default function CommentsSection({
  comments,
  onAdd,
  onEdit,
  onDelete,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  adminEmail = "admin@demo.com",
  adminIds = [],
}: {
  comments: TaskComment[];
  onAdd: (text: string) => Promise<void> | void;
  onEdit: (commentId: string, text: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;

  currentUserId?: string;
  currentUserEmail?: string;
  currentUserRole?: Role;

  adminEmail?: string;
  adminIds?: string[];
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...(comments || [])];
    arr.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return arr;
  }, [comments]);

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      await onAdd(trimmed);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleEditSave = async (commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    try {
      setActionLoadingId(commentId);
      await onEdit(commentId, trimmed);
      setEditingId(null);
      setEditText("");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;

    try {
      setActionLoadingId(commentId);
      await onDelete(commentId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const badgeStyle = (kind: "ADMIN" | "USER" | "YOU") => {
    const base = {
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      opacity: 0.95,
      whiteSpace: "nowrap" as const,
    };
    if (kind === "ADMIN") return { ...base, background: "rgba(239,68,68,0.12)" };
    if (kind === "YOU") return { ...base, background: "rgba(34,197,94,0.12)" };
    return { ...base, background: "rgba(59,130,246,0.10)" };
  };

  const canManageComment = (c: TaskComment) => {
    const authorId = String(c.user_id || "").trim();
    const authorEmail = String(c.user_email || "").toLowerCase().trim();

    const meId = String(currentUserId || "").trim();
    const meEmail = String(currentUserEmail || "").toLowerCase().trim();

    const isMe =
      (!!meId && !!authorId && meId === authorId) ||
      (!!meEmail && !!authorEmail && meEmail === authorEmail);

    return currentUserRole === "ADMIN" || isMe;
  };

  return (
    <div style={{ marginTop: 14 }}>
      <style>
        {`
          .commentsList::-webkit-scrollbar { width: 10px; }
          .commentsList::-webkit-scrollbar-track { background: transparent; }
          .commentsList::-webkit-scrollbar-thumb {
            background: rgba(96,165,250,0.6);
            border-radius: 10px;
          }
          .commentsList::-webkit-scrollbar-thumb:hover {
            background: rgba(96,165,250,0.85);
          }
          .commentsList {
            scrollbar-width: thin;
            scrollbar-color: rgba(96,165,250,0.6) transparent;
          }
        `}
      </style>

      <h4 style={{ marginBottom: 10 }}>Comments</h4>

      <div
        className="commentsList"
        style={{
          maxHeight: 260,
          overflow: "auto",
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.12)",
        }}
      >
        {!sorted.length ? (
          <div className="muted small">No comments yet.</div>
        ) : (
          sorted.map((c) => {
            const authorId = String((c as any).user_id || (c as any).author_id || "").trim();
            const authorEmail = String((c as any).user_email || (c as any).author_email || "")
              .toLowerCase()
              .trim();

            const meId = String(currentUserId || "").trim();
            const meEmail = String(currentUserEmail || "").toLowerCase().trim();

            const isMe =
              (!!meId && authorId && authorId === meId) ||
              (!!meEmail && authorEmail && authorEmail === meEmail);

            const isAuthorAdmin =
              (!!adminEmail && authorEmail === adminEmail.toLowerCase()) ||
              (adminIds?.length ? adminIds.includes(authorId) : false);

            const label: "ADMIN" | "YOU" | "USER" =
              isMe
                ? currentUserRole === "ADMIN"
                  ? "ADMIN"
                  : "YOU"
                : isAuthorAdmin
                ? "ADMIN"
                : "USER";

            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  padding: "10px 10px",
                  borderRadius: 12,
                  marginBottom: 10,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={badgeStyle(label)}>{label}</span>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {(c as any).user_email || (c as any).author_email} •{" "}
                      {new Date(c.created_at).toLocaleString()}
                      {c.is_edited ? " • edited" : ""}
                    </div>
                  </div>

                  {canManageComment(c) && !isEditing && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={actionLoadingId === c.id}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={actionLoadingId === c.id}
                      >
                        {actionLoadingId === c.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <div style={{ marginTop: 6, fontSize: 14 }}>{c.content}</div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      style={{ width: "100%" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <button
                        className="btn"
                        type="button"
                        onClick={cancelEdit}
                        disabled={actionLoadingId === c.id}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => handleEditSave(c.id)}
                        disabled={actionLoadingId === c.id || !editText.trim()}
                      >
                        {actionLoadingId === c.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn" onClick={handleAdd} disabled={submitting || !text.trim()}>
            {submitting ? "Adding..." : "Add Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}