import { TrendingUp, Award, BookOpen, CheckSquare } from "lucide-react";

const stats = [
  {
    label: "Avg. Score",
    value: "84.2%",
    delta: "+3.1%",
    positive: true,
    icon: <TrendingUp size={16} />,
    color: "#219EBC",
    bg: "rgba(33,158,188,0.1)",
    border: "rgba(33,158,188,0.2)",
  },
  {
    label: "Current Position",
    value: "4th / 38",
    delta: "↑2",
    positive: true,
    icon: <Award size={16} />,
    color: "#FFB703",
    bg: "rgba(255,183,3,0.08)",
    border: "rgba(255,183,3,0.2)",
  },
  {
    label: "Active Courses",
    value: "7",
    delta: "2nd Term",
    positive: true,
    icon: <BookOpen size={16} />,
    color: "#8ECAE6",
    bg: "rgba(142,202,230,0.08)",
    border: "rgba(142,202,230,0.18)",
  },
  {
    label: "CBTs Completed",
    value: "12 / 18",
    delta: "67% done",
    positive: true,
    icon: <CheckSquare size={16} />,
    color: "#FB8500",
    bg: "rgba(251,133,0,0.08)",
    border: "rgba(251,133,0,0.2)",
  },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl px-5 py-4 flex flex-col gap-3"
          style={{
            background: "rgba(2,48,71,0.55)",
            border: `1px solid ${s.border}`,
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <span
              className="px-2 py-0.5 rounded-lg"
              style={{
                fontFamily: "'Poppins',sans-serif",
                fontSize: "10px",
                color: s.positive ? "#8ECAE6" : "#FB8500",
                background: s.positive ? "rgba(142,202,230,0.08)" : "rgba(251,133,0,0.08)",
              }}
            >
              {s.delta}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "22px", fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "rgba(142,202,230,0.6)", marginTop: "4px" }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
