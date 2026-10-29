import { TrendingUp, Award, BookOpen, CheckSquare } from "lucide-react";

const stats = [
  {
    label: "Avg. Score",
    value: "84.2%",
    delta: "+3.1%",
    positive: true,
    icon: <TrendingUp size={16} />,
    color: "#dc137b",
    bg: "rgba(220,19,123,0.1)",
    border: "rgba(220,19,123,0.2)",
  },
  {
    label: "Current Position",
    value: "4th / 38",
    delta: "↑ 2 Places",
    positive: true,
    icon: <Award size={16} />,
    color: "#d4af37",
    bg: "rgba(212,175,55,0.1)",
    border: "rgba(212,175,55,0.22)",
  },
  {
    label: "Active Courses",
    value: "7",
    delta: "2nd Term",
    positive: true,
    icon: <BookOpen size={16} />,
    color: "#0093dd",
    bg: "rgba(0,147,221,0.1)",
    border: "rgba(0,147,221,0.2)",
  },
  {
    label: "CBTs Completed",
    value: "12 / 18",
    delta: "67% done",
    positive: true,
    icon: <CheckSquare size={16} />,
    color: "#293d7d",
    bg: "rgba(41,61,125,0.1)",
    border: "rgba(41,61,125,0.2)",
  },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl px-5 py-4 flex flex-col gap-3"
          style={{
            background: "var(--card)",
            border: `1px solid var(--border)`,
            boxShadow: "0 2px 8px rgba(16, 28, 50, 0.04)",
            fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif"
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <span
              className="px-2 py-0.5 rounded-md"
              style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: "10.5px",
                fontWeight: 700,
                color: s.color,
                background: s.bg,
              }}
            >
              {s.delta}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: "22px", fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--subtext)", marginTop: "5px" }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
