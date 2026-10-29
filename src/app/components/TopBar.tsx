import { useState } from "react";
import { Bell, Search, ChevronDown, Wifi } from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";

export function TopBar() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 z-40 flex items-center justify-between px-6 py-3"
      style={{
        left: "256px",
        background: "rgba(22, 35, 75, 0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(191, 209, 255, 0.12)",
        fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif"
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg"
        style={{ background: "rgba(191,209,255,0.07)", border: "1px solid rgba(191,209,255,0.14)", width: "280px" }}
      >
        <Search size={15} style={{ color: "#bfd1ff" }} />
        <span style={{ fontSize: "13px", color: "rgba(191,209,255,0.6)" }}>
          Search courses, materials…
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Status chips */}
        <div className="flex items-center gap-1.5">
          <Wifi size={13} style={{ color: "#0093dd" }} />
          <span style={{ fontSize: "11px", color: "#0093dd", fontWeight: 700 }}>Online</span>
        </div>

        {/* Session info */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: "rgba(41,61,125,0.25)", border: "1px solid rgba(191,209,255,0.15)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#dc137b" }} />
          <span style={{ fontSize: "11.5px", color: "#f8fafc", fontWeight: 600 }}>2026 / 2027 Session</span>
        </div>

        {/* Term indicator */}
        <div
          className="px-3 py-1.5 rounded-md"
          style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}
        >
          <span style={{ fontSize: "11px", color: "#d4af37", fontWeight: 700, textTransform: "uppercase" }}>2nd Term</span>
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
              background: notifOpen ? "rgba(220,19,123,0.15)" : "rgba(191,209,255,0.08)",
              border: "1px solid rgba(191,209,255,0.14)",
            }}
          >
            <Bell size={16} style={{ color: "#bfd1ff" }} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#dc137b" }}
            />
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#dc137b", fontSize: "12px", fontWeight: 700, color: "#ffffff" }}
          >
            KA
          </div>
          <ChevronDown size={13} style={{ color: "#bfd1ff" }} />
        </div>
      </div>
    </header>
  );
}
