import { useState } from "react";
import { Bell, Search, ChevronDown, Wifi, Battery } from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";

export function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-6 py-3"
      style={{
        left: "256px",
        background: "rgba(1, 16, 28, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(142,202,230,0.1)",
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl"
        style={{ background: "rgba(142,202,230,0.07)", border: "1px solid rgba(142,202,230,0.12)", width: "280px" }}
      >
        <Search size={15} style={{ color: "#8ECAE6" }} />
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "13px", color: "rgba(142,202,230,0.5)" }}>
          Search courses, materials…
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Status chips */}
        <div className="flex items-center gap-1.5">
          <Wifi size={13} style={{ color: "#219EBC" }} />
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#219EBC" }}>Online</span>
        </div>

        {/* Session info */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.2)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#219EBC", boxShadow: "0 0 6px #219EBC" }} />
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#8ECAE6" }}>2026 / 2027 Session</span>
        </div>

        {/* Term indicator */}
        <div
          className="px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.25)" }}
        >
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#FFB703" }}>2nd Term</span>
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: notifOpen ? "rgba(33,158,188,0.2)" : "rgba(142,202,230,0.07)",
              border: "1px solid rgba(142,202,230,0.15)",
            }}
          >
            <Bell size={16} style={{ color: "#8ECAE6" }} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#FFB703", boxShadow: "0 0 6px #FFB703" }}
            />
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #219EBC, #8ECAE6)", fontSize: "12px", fontWeight: 600, color: "#011d2f" }}
          >
            KA
          </div>
          <ChevronDown size={13} style={{ color: "#8ECAE6" }} />
        </div>
      </div>
    </header>
  );
}
