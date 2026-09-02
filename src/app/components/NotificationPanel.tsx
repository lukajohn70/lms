import { useEffect, useRef } from "react";
import { X, AlertTriangle, CheckCircle, Info, Bell } from "lucide-react";

const notifications = [
  { id: 1, icon: <AlertTriangle size={13} />, title: "Attendance Alert", message: "Student absent on 11/04/2026. Contact admin if this is an error.", time: "2h ago", read: false, color: "#FFB703" },
  { id: 2, icon: <CheckCircle size={13} />, title: "System Alert", message: "HOD approved new Computer Science material. 15 CBT questions extracted.", time: "5h ago", read: false, color: "#219EBC" },
  { id: 3, icon: <Bell size={13} />, title: "CBT Reminder", message: "Quantum Mechanics exam starts in 2 days. Review your materials!", time: "1d ago", read: false, color: "#FFB703" },
  { id: 4, icon: <Info size={13} />, title: "Parent Portal", message: "Your parent/guardian viewed your latest result. Feedback pending.", time: "2d ago", read: true, color: "#219EBC" },
  { id: 5, icon: <CheckCircle size={13} />, title: "Fee Payment", message: "2nd term school fees payment due by 30/06/2026. ₦40,000 outstanding.", time: "3d ago", read: true, color: "#FB8500" },
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
        backdropFilter: "blur(24px)", borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(33,158,188,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Bell size={14} style={{ color: "#219EBC" }} />
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--card-foreground)" }}>Notifications</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "#FFB703", background: "rgba(255,183,3,0.12)", padding: "1px 6px", borderRadius: 10 }}>3 new</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {notifications.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: n.read ? "transparent" : `${n.color}05` }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `${n.color}15`, color: n.color, marginTop: 1 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: n.read ? 400 : 600, color: "var(--card-foreground)" }}>{n.title}</span>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9.5, color: "var(--subtext)", whiteSpace: "nowrap" }}>{n.time}</span>
              </div>
              <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: "var(--subtext)", margin: 0, lineHeight: 1.5 }}>{n.message}</p>
            </div>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.color, boxShadow: `0 0 5px ${n.color}`, flexShrink: 0, marginTop: 8 }} />}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
        <button style={{ width: "100%", padding: "7px", borderRadius: 9, background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.15)", cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12, color: "#219EBC", fontWeight: 500 }}>
          View all notifications
        </button>
      </div>
    </div>
  );
}
