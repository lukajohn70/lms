import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";
import {
  TrendingUp, Award, BookOpen, CheckSquare, Zap, AlarmClock, BarChart2, CalendarDays, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

function Countdown({ target }: { target: Date }) {
  const [r, setR] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, target.getTime() - Date.now()) / 1000;
      setR({ d: Math.floor(diff/86400), h: Math.floor((diff%86400)/3600), m: Math.floor((diff%3600)/60), s: Math.floor(diff%60) });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);
  const U = ({ v, l }: { v: number; l: string }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#FFB703", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{String(v).padStart(2,"0")}</div>
      <div style={{ fontSize: 9, color: "rgba(255,183,3,0.6)", marginTop: 2 }}>{l}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      <U v={r.d} l="D"/><span style={{ color: "#FFB703", fontSize: 18, opacity: 0.4, lineHeight: "22px" }}>:</span>
      <U v={r.h} l="H"/><span style={{ color: "#FFB703", fontSize: 18, opacity: 0.4, lineHeight: "22px" }}>:</span>
      <U v={r.m} l="M"/><span style={{ color: "#FFB703", fontSize: 18, opacity: 0.4, lineHeight: "22px" }}>:</span>
      <U v={r.s} l="S"/>
    </div>
  );
}

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

const CardHeader = ({ icon, color, title, sub }: { icon: React.ReactNode; color: string; title: string; sub?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--glass-border)" }}>
    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

export default function StudentDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [attendanceGrid, setAttendanceGrid] = useState<boolean[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/dashboard/student'),
      apiClient.get('/student/attendance'),
      apiClient.get('/student/grades')
    ])
      .then(([dashboardRes, attendanceRes, gradesRes]) => {
        setData(dashboardRes);
        setAttendanceGrid((attendanceRes.grid || []).flat());
        
        // Convert student grades to performance chart data
        const scores = (gradesRes.grades || []).map((g: any) => ({
          m: g.subject.slice(0, 8),
          s: g.total,
          a: 72 // class average benchmark placeholder
        }));
        setChartData(scores);
      })
      .catch(err => console.error("Error loading student dashboard data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || !user) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading your dashboard...</div>;
  }

  const { stats, upcomingCbt, recentMaterials, courseProgress, attendance } = data;
  const examTarget = upcomingCbt ? new Date(Date.now() + upcomingCbt.duration_minutes * 60000 + 86400000) : new Date(Date.now() + 86400000);
  const present = attendance.present;
  const total = attendance.total;
  const attPercent = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#219EBC", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500, marginBottom: 4 }}>
            Dashboard Overview
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0, lineHeight: 1.3 }}>
            Good morning, {user.first_name} 👋
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>
            2026/2027 Academic Session · Active Profile
          </p>
        </div>
        <button
          onClick={() => navigate("/student/cbt")}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
            background: "linear-gradient(135deg, #FB8500, #e67600)",
            boxShadow: "0 4px 16px rgba(251,133,0,0.35)", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}
        >
          <Zap size={14} fill="#fff" /> Study Mode
        </button>
      </div>

      {stats.activeCourses === 0 && (
        <div
          onClick={() => navigate("/student/courses")}
          style={{
            marginBottom: 20, padding: "14px 20px", borderRadius: 12,
            background: "rgba(251,133,0,0.12)", border: "1.5px dashed rgba(251,133,0,0.4)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(251,133,0,0.18)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(251,133,0,0.12)"}
        >
          <AlertTriangle size={18} style={{ color: "#FB8500", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 13, color: "var(--heading)", display: "block" }}>Academic Registration Pending</strong>
            <span style={{ fontSize: 11.5, color: "var(--subtext)" }}>You have not enrolled in any subjects for this term yet. Click here to open the registration desk.</span>
          </div>
          <button style={{ padding: "6px 14px", borderRadius: 8, background: "#FB8500", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Register Now</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {[
          { label: "Avg. Score", value: `${stats.avgScore}%`, delta: "GPA Rate", icon: <TrendingUp size={15}/>, color: "#219EBC", to: "/student/results" },
          { label: "Class Position", value: stats.classRank, delta: "Dynamic Rank", icon: <Award size={15}/>, color: "#FFB703", to: "/student/results" },
          { label: "Active Courses", value: stats.activeCourses, delta: "Enrolled", icon: <BookOpen size={15}/>, color: "#8ECAE6", to: "/student/courses" },
          { label: "CBTs Completed", value: `${stats.cbtsCompleted}/${stats.totalCbts}`, delta: "Exams Done", icon: <CheckSquare size={15}/>, color: "#FB8500", to: "/student/cbt" },
        ].map((s) => (
          <Glass key={s.label} style={{ padding: "16px 18px", cursor: "pointer" }} onClick={() => navigate(s.to)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: 10, color: "var(--subtext)", background: "var(--muted)", padding: "2px 7px", borderRadius: 5 }}>{s.delta}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>{s.label}</div>
          </Glass>
        ))}
      </div>

      {/* 3-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 0.85fr", gap: 16 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* CBT Card */}
          <Glass>
            <CardHeader icon={<Zap size={15}/>} color="#FFB703" title="CBT Center" sub={upcomingCbt ? "Next upcoming exam" : "No upcoming exams"} />
            <div style={{ padding: 16 }}>
              {upcomingCbt ? (
                <>
                  <div style={{ background: "rgba(255,183,3,0.07)", border: "1px solid rgba(255,183,3,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 2 }}>{upcomingCbt.title}</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 10 }}>{upcomingCbt.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                      <AlarmClock size={11} style={{ color: "#FFB703" }} />
                      <span style={{ fontSize: 10, color: "#FFB703", textTransform: "uppercase", letterSpacing: "0.05em" }}>Starts In</span>
                    </div>
                    <Countdown target={examTarget} />
                  </div>
                  <button
                    onClick={() => navigate("/student/cbt")}
                    style={{
                      width: "100%", padding: "11px", borderRadius: 10,
                      background: "linear-gradient(135deg, #FB8500, #e67600)",
                      border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 700, color: "#fff",
                      boxShadow: "0 4px 16px rgba(251,133,0,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <Zap size={14} fill="#fff" /> START CBT NOW
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "var(--subtext)", textAlign: "center", padding: "20px 0" }}>You have no scheduled exams.</div>
              )}
            </div>
          </Glass>

          {/* Attendance */}
          <Glass>
            <CardHeader icon={<CalendarDays size={15}/>} color="#FFB703" title="Attendance" sub={`This Term's Register`} />
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--subtext)" }}>{present}/{total} days present</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: attPercent < 80 ? "#FFB703" : "#219EBC" }}>
                  {attPercent}%
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3 }}>
                {["M","T","W","T","F"].map((d,i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 9, color: "var(--subtext)", marginBottom: 3 }}>{d}</div>
                ))}
                {attendanceGrid.map((p, i) => (
                  <div key={i} style={{
                    height: 18, borderRadius: 4,
                    background: p ? "rgba(33,158,188,0.45)" : "rgba(255,183,3,0.3)",
                    border: p ? "1px solid rgba(33,158,188,0.35)" : "1px solid rgba(255,183,3,0.35)",
                  }} />
                ))}
              </div>
              {attPercent < 80 && total > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "7px 10px", borderRadius: 8, background: "rgba(255,183,3,0.08)", border: "1px solid rgba(255,183,3,0.2)" }}>
                  <AlertTriangle size={12} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 10.5, color: "#FFB703" }}>Attendance below 80% threshold</span>
                </div>
              )}
            </div>
          </Glass>
        </div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Performance chart */}
          <Glass>
            <CardHeader icon={<BarChart2 size={15}/>} color="#219EBC" title="Performance Chart" sub="Grades by Subject" />
            <div style={{ padding: "8px 12px 12px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                {[["#219EBC","Your Score"],["rgba(142,202,230,0.5)","Class Avg"]].map(([c,l]) => (
                  <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} />
                    <span style={{ fontSize: 10, color: "var(--subtext)" }}>{l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#219EBC" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#219EBC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false}/>
                  <XAxis dataKey="m" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }}/>
                  <Area type="monotone" dataKey="a" stroke="rgba(142,202,230,0.4)" strokeWidth={1.5} fill="transparent"/>
                  <Area type="monotone" dataKey="s" stroke="#219EBC" strokeWidth={2} fill="url(#sg)" dot={{ fill:"#219EBC", r:3, strokeWidth:0 }} activeDot={{ r:5 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Glass>

          {/* Recent Materials */}
          <Glass>
            <CardHeader icon={<BookOpen size={15}/>} color="#8ECAE6" title="Recent Materials" sub="Tap to view or download" />
            <div style={{ padding: "8px 0" }}>
              {recentMaterials.length > 0 ? recentMaterials.map((m: any, idx: number) => (
                <div
                  key={m.id}
                  onClick={() => navigate("/student/materials")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
                    borderBottom: "1px solid var(--glass-border)", cursor: "pointer",
                    background: idx > 1 ? "transparent" : "rgba(33,158,188,0.03)",
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(142,202,230,0.1)", border: "1px solid rgba(142,202,230,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#8ECAE6" }}>DOC</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: idx > 1 ? 400 : 600, color: idx > 1 ? "var(--subtext)" : "var(--heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: "var(--subtext)", opacity: 0.7 }}>Tr. {m.teacher_name}</div>
                  </div>
                  {idx <= 1 && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#219EBC", flexShrink: 0 }} />}
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "var(--subtext)", textAlign: "center", padding: "20px 0" }}>No recent materials.</div>
              )}
            </div>
          </Glass>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Course Progress */}
          <Glass>
            <CardHeader icon={<BookOpen size={15}/>} color="#219EBC" title="Course Progress" />
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {courseProgress && courseProgress.length > 0 ? (
                courseProgress.map((c: any, i: number) => {
                  const colors = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];
                  const color = colors[i % colors.length];
                  return (
                    <div key={c.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11.5, color: "var(--heading)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{c.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{c.progress}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.progress}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ fontSize: 12, color: "var(--subtext)", textAlign: "center" }}>No active progress records.</div>
              )}
            </div>
          </Glass>

          {/* Upcoming events */}
          <Glass>
            <CardHeader icon={<CalendarDays size={15}/>} color="#219EBC" title="Upcoming Events" sub="Next 30 days" />
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { date: "Jun 13", label: "Physics CBT Exam", c: "#FFB703" },
                { date: "Jun 15", label: "CS CBT — SQL Design", c: "#FFB703" },
                { date: "Jun 20", label: "PTA Meeting", c: "#219EBC" },
                { date: "Jun 25", label: "Mid-Term Break", c: "#8ECAE6" },
              ].map((e) => (
                <div key={e.label} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <div style={{ padding: "2px 7px", borderRadius: 6, background: `${e.c}18`, border: `1px solid ${e.c}30`, flexShrink: 0 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: e.c }}>{e.date}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--heading)", lineHeight: 1.4, marginTop: 1 }}>{e.label}</span>
                </div>
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
