import { useEffect, useRef } from "react";
import { X, CheckCircle, Info, Bell, Award } from "lucide-react";

const notifications = [
  { id: 1, icon: <CheckCircle size={13} />, title: "Result Published", message: "Official broadsheets for 3rd Term have been approved and published.", time: "1h ago", read: false, color: "#dc137b" },
  { id: 2, icon: <Award size={13} />, title: "Report Card Ready", message: "Term report card computation complete with CA and Exam grades.", time: "4h ago", read: false, color: "#293d7d" },
  { id: 3, icon: <Info size={13} />, title: "Attendance Register", message: "Daily class attendance register has been updated for this week.", time: "1d ago", read: false, color: "#0093dd" },
  { id: 4, icon: <CheckCircle size={13} />, title: "Curriculum Setup", message: "Grading scales for Junior and Senior secondary schools are active.", time: "2d ago", read: true, color: "#d4af37" },
];

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute", right: 0, top: 44, width: 360, zIndex: 100,
        background: "var(--popover)", border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 16px 40px rgba(16, 28, 50, 0.16)",
        overflow: "hidden",
        fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Bell size={14} style={{ color: "#dc137b" }} />
          <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--card-foreground)" }}>Notifications</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: "#dc137b", background: "rgba(220,19,123,0.1)", padding: "1px 7px", borderRadius: 4, fontFamily: "'Raleway',sans-serif" }}>3 new</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {notifications.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: n.read ? "transparent" : `${n.color}06` }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `${n.color}14`, color: n.color, marginTop: 1 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: 12.5, fontWeight: n.read ? 600 : 700, color: "var(--card-foreground)" }}>{n.title}</span>
                <span style={{ fontSize: 10, color: "var(--subtext)", whiteSpace: "nowrap" }}>{n.time}</span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--subtext)", margin: 0, lineHeight: 1.5 }}>{n.message}</p>
            </div>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.color, flexShrink: 0, marginTop: 8 }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
        <button style={{ width: "100%", padding: "7px", borderRadius: 6, background: "rgba(41,61,125,0.06)", border: "1px solid rgba(41,61,125,0.12)", cursor: "pointer", fontFamily: "'Raleway',sans-serif", fontSize: 12, color: "#293d7d", fontWeight: 700 }}>
          View all notifications
        </button>
      </div>
    </div>
  );
}
