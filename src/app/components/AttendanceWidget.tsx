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
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(16, 28, 50, 0.04)",
        fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(41,61,125,0.08)", color: "#293d7d" }}
          >
            <CalendarDays size={16} />
          </div>
          <div>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>
              Attendance Register
            </span>
            <div style={{ fontSize: "11px", color: "var(--subtext)" }}>
              This term — 6 weeks record
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
          style={{
            background: pct < 80 ? "rgba(220,19,123,0.08)" : "rgba(0,147,221,0.08)",
            border: `1px solid ${pct < 80 ? "rgba(220,19,123,0.2)" : "rgba(0,147,221,0.2)"}`
          }}
        >
          {pct < 80 && <AlertTriangle size={12} style={{ color: "#dc137b" }} />}
          <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "13px", fontWeight: 800, color: pct < 80 ? "#dc137b" : "#0093dd" }}>
            {pct}%
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Day labels */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {days.map((d, i) => (
            <div key={i} className="text-center" style={{ fontFamily: "'Raleway',sans-serif", fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)" }}>
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
                  className="h-5 rounded-sm"
                  style={{
                    background: present
                      ? "rgba(0,147,221,0.35)"
                      : "rgba(220,19,123,0.25)",
                    border: present
                      ? "1px solid rgba(0,147,221,0.4)"
                      : "1px solid rgba(220,19,123,0.4)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(0,147,221,0.6)", border: "1px solid rgba(0,147,221,0.5)" }} />
            <span style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 500 }}>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(220,19,123,0.6)", border: "1px solid rgba(220,19,123,0.5)" }} />
            <span style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 500 }}>Absent</span>
          </div>
          <div className="ml-auto" style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 600 }}>
            {present}/{total} school days
          </div>
        </div>
      </div>
    </div>
  );
}
