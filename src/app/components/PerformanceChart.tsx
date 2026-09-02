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
        className="rounded-xl px-3 py-2.5"
        style={{
          background: "rgba(1,22,38,0.95)",
          border: "1px solid rgba(33,158,188,0.25)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#8ECAE6", marginBottom: "4px" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#e8f4f8" }}>
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
            style={{ background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.2)" }}
          >
            <BarChart2 size={15} style={{ color: "#219EBC" }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "14px", fontWeight: 600, color: "#e8f4f8" }}>
              Performance Trend
            </span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>
              2025 / 2026 Academic Session
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#219EBC" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>Your Score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(142,202,230,0.4)" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>Class Avg</span>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#219EBC" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#219EBC" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8ECAE6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8ECAE6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(142,202,230,0.07)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "rgba(142,202,230,0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[60, 100]}
              tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "rgba(142,202,230,0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="avg" stroke="rgba(142,202,230,0.4)" strokeWidth={1.5} fill="url(#avgGrad)" name="avg" dot={false} />
            <Area type="monotone" dataKey="score" stroke="#219EBC" strokeWidth={2} fill="url(#scoreGrad)" name="score"
              dot={{ fill: "#219EBC", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#219EBC", stroke: "rgba(33,158,188,0.3)", strokeWidth: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
