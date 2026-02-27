import { useEffect, useState } from "react";
import { getNotifications, markAllRead, type NotificationRow } from "../api/notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = async () => {
    try {
      const res = await getNotifications({ unread_only: true, limit: 20 });
      setItems(res.data?.notifications || []);
    } catch {
      // ignore UI fail
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = items.length;

  const onOpen = async () => {
    setOpen((p) => !p);
    // optional: refresh when opening
    await load();
  };

  const onMarkAll = async () => {
    await markAllRead();
    await load();
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn"
        onClick={onOpen}
        style={{
          position: "relative",
          borderRadius: 999,
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
        }}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: "#ef4444",
              color: "white",
              borderRadius: 999,
              fontSize: 12,
              padding: "2px 6px",
              lineHeight: "16px",
              fontWeight: 700,
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 50,
            width: 320,
            background: "rgba(20,25,35,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <b>Notifications</b>
            {unreadCount > 0 && (
              <button className="btn" onClick={onMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          {unreadCount === 0 ? (
            <div className="muted small">No new notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} style={{ padding: "8px 6px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 700 }}>{n.type}</div>
                <div className="muted small">{n.message}</div>
                <div className="muted small">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}