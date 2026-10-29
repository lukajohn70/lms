import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";
import {
  Users, BookOpen, CheckSquare, TrendingUp, BarChart2, FileText,
  Clock, ShieldCheck, ChevronRight, Sparkles, Award, ArrowUpRight
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const DLHS_PALETTE = {
  navy: "#293D7D",
  navyDark: "#16234B",
  crimson: "#DC137B",
  crimsonHover: "#B80F66",
  blue: "#0093DD",
  gold: "#D4AF37",
  periwinkle: "#BFD1FF",
  slate: "#3A4244",
};

const Glass = ({ children, style, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div
    className={className}
    style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      ...style
    }}
  >
    {children}
  </div>
);

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, settings } = useApp();
  const [selectedSession, setSelectedSession] = useState(settings?.academic_session || "2026/2027");
  const [data, setData]         = useState<any>(null);
  const [trend, setTrend]       = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get(`/dashboard/teacher?session=${encodeURIComponent(selectedSession)}`),
      apiClient.get(`/teacher/score-trend?session=${encodeURIComponent(selectedSession)}`),
      apiClient.get('/teacher/activity'),
    ])
      .then(([dash, trendRes, actRes]: any[]) => {
        setData(dash);
        setTrend(trendRes.trend || []);
        setActivity(actRes.activity || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedSession]);

  if (loading && !data) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${DLHS_PALETTE.navy}`, borderTopColor: "transparent", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
          Loading Academic Faculty Workspace…
        </div>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 0, activeClasses: 0, cbtsCreated: 0, materialsUploaded: 0 };
  const classes = data?.classes || [];
  const schoolName  = settings?.school_name  || "Deeper Life High School";
  const currentTerm = settings?.current_term || "2nd Term";

  const trendData = trend.length > 0 ? trend : [{ m: "—", avg: 0 }];

  const statCards = [
    {
      title: "Students in Care",
      val: stats.totalStudents,
      color: DLHS_PALETTE.navy,
      bg: "rgba(41, 61, 125, 0.08)",
      border: "rgba(41, 61, 125, 0.2)",
      icon: <Users size={18} strokeWidth={2.2} />,
      label: "Active roster enrolment"
    },
    {
      title: "Teaching Classes",
      val: stats.activeClasses,
      color: DLHS_PALETTE.blue,
      bg: "rgba(0, 147, 221, 0.08)",
      border: "rgba(0, 147, 221, 0.2)",
      icon: <BookOpen size={18} strokeWidth={2.2} />,
      label: "Assigned class arms"
    },
    {
      title: "Assessments Recorded",
      val: stats.gradesSubmitted || stats.cbtsCreated || 0,
      color: DLHS_PALETTE.crimson,
      bg: "rgba(220, 19, 123, 0.08)",
      border: "rgba(220, 19, 123, 0.2)",
      icon: <FileText size={18} strokeWidth={2.2} />,
      label: "Continuous assessments"
    },
    {
      title: "Curriculum Materials",
      val: stats.materialsUploaded,
      color: DLHS_PALETTE.gold,
      bg: "rgba(212, 175, 55, 0.12)",
      border: "rgba(212, 175, 55, 0.25)",
      icon: <CheckSquare size={18} strokeWidth={2.2} />,
      label: "Lesson notes & syllabi"
    },
  ];

  const quickActions = [
    {
      label: "Grade Submissions",
      desc: "Record and submit CA1, CA2 and Exam term scores",
      path: "/teacher/grades",
      color: DLHS_PALETTE.crimson,
      icon: <TrendingUp size={16} />
    },
    {
      label: "Form Class Broadsheet",
      desc: "Manage affective traits, psychomotor and remarks",
      path: "/teacher/form-class",
      color: DLHS_PALETTE.navy,
      icon: <Award size={16} />
    },
    {
      label: "Daily Attendance Register",
      desc: "Mark roll call and track student presence",
      path: "/teacher/attendance",
      color: DLHS_PALETTE.blue,
      icon: <CheckSquare size={16} />
    },
    {
      label: "Lesson Materials",
      desc: "Upload syllabi, lecture notes and reading resources",
      path: "/teacher/materials",
      color: DLHS_PALETTE.gold,
      icon: <BookOpen size={16} />
    },
  ];

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* ── Executive Faculty Banner ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DLHS_PALETTE.navyDark} 0%, ${DLHS_PALETTE.navy} 100%)`,
          borderRadius: 16,
          padding: "24px 28px",
          color: "#ffffff",
          marginBottom: 24,
          boxShadow: "0 10px 25px -5px rgba(22, 35, 75, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 20, background: "rgba(212, 175, 55, 0.2)", border: "1px solid rgba(212, 175, 55, 0.4)", marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: DLHS_PALETTE.gold }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: DLHS_PALETTE.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Faculty Academic Portal · DLHS
              </span>
            </div>
            <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.01em", color: "#ffffff" }}>
              Welcome, {user?.first_name ? `${user.first_name} ${user?.last_name || ""}` : "Instructor"}
            </h1>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: DLHS_PALETTE.periwinkle, margin: "6px 0 0" }}>
              {schoolName} · {currentTerm} {selectedSession}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: 10, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: DLHS_PALETTE.periwinkle, textTransform: "uppercase" }}>Academic Session:</span>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 13, fontWeight: 700, outline: "none", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}
              >
                {["2026/2027", "2025/2026", "2024/2025", "2023/2024"].map(sess => (
                  <option key={sess} value={sess} style={{ background: DLHS_PALETTE.navyDark, color: "#ffffff" }}>{sess}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric KPIs ── */}
      <div className="responsive-grid-4" style={{ gap: 16, marginBottom: 24 }}>
        {statCards.map(s => (
          <Glass key={s.title} style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {s.title}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              {s.val}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4 }}>
              {s.label}
            </div>
          </Glass>
        ))}
      </div>

      {/* ── Main Analytical Grid ── */}
      <div className="responsive-dashboard-3" style={{ gap: 20, marginBottom: 24 }}>
        {/* Class Average Performance Chart */}
        <Glass style={{ gridColumn: "span 2" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(41, 61, 125, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS_PALETTE.navy }}>
                <BarChart2 size={16} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                  Class Average Performance
                </h3>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Mean score per class stream for {selectedSession}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: DLHS_PALETTE.navy, background: "rgba(41, 61, 125, 0.08)", padding: "4px 10px", borderRadius: 20 }}>
              Term Analytics
            </span>
          </div>

          <div style={{ padding: "16px 16px 12px" }}>
            {trendData.length === 0 || (trendData.length === 1 && trendData[0].m === "—") ? (
              <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <FileText size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
                <span>No recorded examination or assessment data for this academic period.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontFamily: "'Lato', sans-serif",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                    }}
                    formatter={(v: any) => [`${v}%`, "Class Mean"]}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {trendData.map((_: any, i: number) => {
                      const barColors = [DLHS_PALETTE.navy, DLHS_PALETTE.blue, DLHS_PALETTE.crimson, DLHS_PALETTE.gold];
                      return <Cell key={i} fill={barColors[i % barColors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Glass>

        {/* Assigned Classes List */}
        <Glass>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                Assigned Classes
              </h3>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Teaching allocations</span>
            </div>
            <button
              onClick={() => navigate("/teacher/classes")}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: DLHS_PALETTE.blue,
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2
              }}
            >
              All Classes <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ padding: "8px 0", maxHeight: 250, overflowY: "auto" }}>
            {classes.length > 0 ? classes.map((c: any, i: number) => {
              const classAccents = [DLHS_PALETTE.navy, DLHS_PALETTE.blue, DLHS_PALETTE.crimson, DLHS_PALETTE.gold];
              const accent = classAccents[i % classAccents.length];
              return (
                <div
                  key={c.name}
                  onClick={() => navigate("/teacher/classes")}
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent }}>
                    <BookOpen size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {c.students} students enrolled
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13, fontWeight: 800, color: accent }}>
                      {c.avg > 0 ? `${c.avg}%` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                      Mean
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", textAlign: "center", padding: "32px 16px" }}>
                No classes assigned to your account for this session.
              </div>
            )}
          </div>
        </Glass>
      </div>

      {/* ── Quick Launchpad ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 15, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
            Academic Quick Launchpad
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
            Direct access to daily teacher duties and statutory assessment tools
          </p>
        </div>

        <div className="responsive-grid-4" style={{ gap: 14 }}>
          {quickActions.map(a => (
            <div
              key={a.label}
              onClick={() => navigate(a.path)}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = a.color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 18px -4px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${a.color}15`, border: `1px solid ${a.color}35`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color }}>
                    {a.icon}
                  </div>
                  <ArrowUpRight size={14} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
                  {a.label}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                  {a.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Institutional Activity ── */}
      <Glass>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={16} style={{ color: DLHS_PALETTE.navy }} />
            <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
              Recent Academic Activity & Audit
            </h3>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Logged events</span>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {activity.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {activity.map((act, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: DLHS_PALETTE.navy, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.45 }}>
                      {act.text}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {act.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", textAlign: "center", padding: "18px 0" }}>
              No recent activity recorded for this session.
            </div>
          )}
        </div>
      </Glass>
    </div>
  );
}
