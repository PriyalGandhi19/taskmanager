import { useState } from "react";
import type { TaskComment } from "../api/tasks";

export default function CommentsSection({
  comments,
  onAdd,
}: {
  comments: TaskComment[];
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div style={{ marginTop: 14 }}>
      <h4>Comments</h4>

      {comments?.map((c) => (
        <div key={c.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {c.author_email} • {new Date(c.created_at).toLocaleString()}
          </div>
          <div>{c.content}</div>
        </div>
      ))}

      <textarea
        placeholder="Write a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        className="btn"
        onClick={() => {
          if (!text.trim()) return;
          onAdd(text);
          setText("");
        }}
      >
        Add Comment
      </button>
    </div>
  );
}