import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";
import { Users, BookOpen, ClipboardList, CheckSquare, TrendingUp, BarChart2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const ACTIVITY_COLORS = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, settings } = useApp();
  const [data, setData]         = useState<any>(null);
  const [trend, setTrend]       = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard/teacher'),
      apiClient.get('/teacher/score-trend'),
      apiClient.get('/teacher/activity'),
    ])
      .then(([dash, trendRes, actRes]: any[]) => {
        setData(dash);
        setTrend(trendRes.trend || []);
        setActivity(actRes.activity || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || !user) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading dashboard...</div>;
  }

  const { stats, classes } = data;
  const schoolName  = settings?.school_name  || "Aroura Academy";
  const currentTerm = settings?.current_term || "2nd Term";
  const session     = settings?.academic_session || "2026/2027";

  const trendData = trend.length > 0 ? trend : [{ m: "—", avg: 0 }];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#8ECAE6", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Teacher Dashboard</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Welcome, {user.first_name} {user.last_name} 🎓</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>{schoolName} · {currentTerm} {session}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {[
          { l: "Total Students", v: stats.totalStudents, c: "#219EBC", icon: <Users size={15}/> },
          { l: "Active Classes", v: stats.activeClasses, c: "#8ECAE6", icon: <BookOpen size={15}/> },
          { l: "CBTs Created", v: stats.cbtsCreated, c: "#FFB703", icon: <ClipboardList size={15}/> },
          { l: "Materials Uploaded", v: stats.materialsUploaded, c: "#FB8500", icon: <CheckSquare size={15}/> },
        ].map(s => (
          <Glass key={s.l} style={{ padding: "16px 18px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
          </Glass>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 16 }}>
        {/* Per-class avg bar chart (real data) */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={15} style={{ color: "#8ECAE6" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Class Avg Performance</span>
          </div>
          <div style={{ padding: "8px 12px 12px" }}>
            {trendData.length === 0 || (trendData.length === 1 && trendData[0].m === "—") ? (
              <div style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--subtext)", fontSize: 12.5 }}>
                No grades recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "'Poppins',sans-serif", fontSize: 11 }} formatter={(v: any) => [`${v}%`, "Avg"]} />
                  <Bar dataKey="avg" radius={[5, 5, 0, 0]}>
                    {trendData.map((_: any, i: number) => (
                      <Cell key={i} fill={["#219EBC","#8ECAE6","#FFB703","#FB8500"][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Glass>

        {/* My Classes list */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>My Classes</span>
            <button onClick={() => navigate("/teacher/classes")} style={{ fontSize: 11, color: "#8ECAE6", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
          </div>
          <div style={{ padding: "8px 0" }}>
            {classes.length > 0 ? classes.map((c: any, i: number) => {
              const colors = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];
              const color = colors[i % colors.length];
              return (
                <div
                  key={c.name}
                  onClick={() => navigate("/teacher/classes")}
                  style={{ padding: "10px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(142,202,230,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users size={15} style={{ color: color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--subtext)" }}>{c.students} students</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: color }}>{c.avg > 0 ? `${c.avg}%` : "—"}</div>
                    <div style={{ fontSize: 10, color: "var(--subtext)" }}>Class avg</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 13, color: "var(--subtext)", textAlign: "center", padding: "20px 0" }}>You have no assigned classes.</div>
            )}
          </div>
        </Glass>

        {/* Recent Activity (live) */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Recent Activity</div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {activity.length > 0 ? activity.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--heading)", lineHeight: 1.45 }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            )) : (
              <div style={{ fontSize: 12, color: "var(--subtext)", textAlign: "center", padding: "16px 0" }}>
                No recent activity yet.
              </div>
            )}
          </div>
        </Glass>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { l: "Create CBT", to: "/teacher/cbt", c: "#FFB703", icon: <ClipboardList size={16}/> },
          { l: "Upload Material", to: "/teacher/materials", c: "#219EBC", icon: <BookOpen size={16}/> },
          { l: "Mark Attendance", to: "/teacher/attendance", c: "#8ECAE6", icon: <CheckSquare size={16}/> },
          { l: "Grade Students", to: "/teacher/grades", c: "#FB8500", icon: <TrendingUp size={16}/> },
        ].map(a => (
          <button key={a.l} onClick={() => navigate(a.to)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: `${a.c}10`, border: `1px solid ${a.c}30`, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${a.c}15`, display: "flex", alignItems: "center", justifyContent: "center", color: a.c }}>{a.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{a.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
