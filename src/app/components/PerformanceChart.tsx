import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { BarChart2 } from "lucide-react";

const data = [
  { month: "Jan", score: 72, avg: 68 },
  { month: "Feb", score: 78, avg: 70 },
  { month: "Mar", score: 75, avg: 69 },
  { month: "Apr", score: 81, avg: 72 },
  { month: "May", score: 85, avg: 74 },
  { month: "Jun", score: 84, avg: 73 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div
        className="rounded-lg px-3 py-2"
        style={{
          background: "#16234b",
          border: "1px solid rgba(191,209,255,0.2)",
          fontFamily: "'Lato', sans-serif"
        }}
      >
        <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: "11px", fontWeight: 700, color: "#d4af37", marginBottom: "3px" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ fontSize: "11.5px", color: "#f8fafc" }}>
              {p.name === "score" ? "Your score" : "Class avg"}: <strong>{p.value}%</strong>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function PerformanceChart() {
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
            style={{ background: "rgba(220,19,123,0.1)", color: "#dc137b" }}
          >
            <BarChart2 size={16} />
          </div>
          <div>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>
              Academic Performance Trend
            </span>
            <div style={{ fontSize: "11px", color: "var(--subtext)" }}>
              Term Progress Diagnostics
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#dc137b" }} />
            <span style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 600 }}>Your Score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#293d7d" }} />
            <span style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 600 }}>Class Avg</span>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 pb-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc137b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#dc137b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#293d7d" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#293d7d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(41,61,125,0.08)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontFamily: "'Raleway',sans-serif", fontSize: 10.5, fontWeight: 700, fill: "var(--subtext)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[60, 100]}
              tick={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, fill: "var(--subtext)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="avg" stroke="#293d7d" strokeWidth={1.8} fill="url(#avgGrad)" name="avg" dot={false} />
            <Area type="monotone" dataKey="score" stroke="#dc137b" strokeWidth={2.2} fill="url(#scoreGrad)" name="score"
              dot={{ fill: "#dc137b", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#dc137b", stroke: "rgba(220,19,123,0.3)", strokeWidth: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
