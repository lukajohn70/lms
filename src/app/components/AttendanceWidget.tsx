import { CalendarDays, AlertTriangle } from "lucide-react";

const weeks = [
  [true, true, true, true, true],
  [true, false, true, true, true],
  [true, true, true, false, true],
  [true, true, true, true, true],
  [true, true, false, true, true],
  [true, true, true, true, true],
];

const days = ["M", "T", "W", "T", "F"];

export function AttendanceWidget() {
  const total = weeks.flat().length;
  const present = weeks.flat().filter(Boolean).length;
  const pct = Math.round((present / total) * 100);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(2,48,71,0.5)",
        border: "1px solid rgba(142,202,230,0.15)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(142,202,230,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.2)" }}
          >
            <CalendarDays size={15} style={{ color: "#FFB703" }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "14px", fontWeight: 600, color: "#e8f4f8" }}>
              Attendance
            </span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>
              This term — 6 weeks
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: pct < 80 ? "rgba(255,183,3,0.1)" : "rgba(33,158,188,0.1)", border: `1px solid ${pct < 80 ? "rgba(255,183,3,0.25)" : "rgba(33,158,188,0.2)"}` }}
        >
          {pct < 80 && <AlertTriangle size={11} style={{ color: "#FFB703" }} />}
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "13px", fontWeight: 700, color: pct < 80 ? "#FFB703" : "#219EBC" }}>
            {pct}%
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Day labels */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {days.map((d, i) => (
            <div key={i} className="text-center" style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.4)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5 gap-1">
              {week.map((present, di) => (
                <div
                  key={di}
                  className="h-5 rounded"
                  style={{
                    background: present
                      ? "rgba(33,158,188,0.5)"
                      : "rgba(255,183,3,0.3)",
                    border: present
                      ? "1px solid rgba(33,158,188,0.4)"
                      : "1px solid rgba(255,183,3,0.4)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(33,158,188,0.5)", border: "1px solid rgba(33,158,188,0.4)" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.5)" }}>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,183,3,0.3)", border: "1px solid rgba(255,183,3,0.4)" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.5)" }}>Absent</span>
          </div>
          <div className="ml-auto" style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.5)" }}>
            {present}/{total} days
          </div>
        </div>
      </div>
    </div>
  );
}
