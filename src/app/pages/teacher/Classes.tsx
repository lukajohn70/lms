import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, TrendingUp, ChevronRight, ArrowLeft, ClipboardList, CheckSquare, Star, AlertTriangle } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const gradeColor = (g: string) =>
  g === "A" ? "#219EBC" : g === "B" ? "#8ECAE6" : g === "C" ? "#FFB703" : g === "D" ? "#FB8500" : g === "F" ? "#ef4444" : "var(--subtext)";

export default function Classes() {
  const navigate = useNavigate();

  // ── Course list state ──────────────────────────────────────────────────
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // ── Selected course detail state ───────────────────────────────────────
  const [selected, setSelected] = useState<any | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load course list on mount
  useEffect(() => {
    apiClient.get("/teacher/classes")
      .then((res: any) => setCourses(res.courses || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingCourses(false));
  }, []);

  // Load detail when a course is selected
  const openCourse = (course: any) => {
    setSelected(course);
    setLoadingDetail(true);
    apiClient.get(`/teacher/classes/detail?course_id=${course.id}`)
      .then((res: any) => setRoster(res.roster || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingDetail(false));
  };

  // ── DETAIL VIEW ────────────────────────────────────────────────────────
  if (selected) {
    const avgAtt = roster.length > 0
      ? Math.round(roster.reduce((s, r) => s + (r.attendance || 0), 0) / roster.length)
      : 0;
    const graded = roster.filter(r => r.total !== null);
    const avgScore = graded.length > 0
      ? Math.round(graded.reduce((s, r) => s + r.total, 0) / graded.length)
      : 0;
    const highest = graded.length > 0 ? Math.max(...graded.map(r => r.total)) : 0;
    const atRisk = roster.filter(r => r.attendance < 80 || (r.total !== null && r.total < 50)).length;

    return (
      <div>
        {/* Back + heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => { setSelected(null); setRoster([]); }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8ECAE6", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(142,202,230,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div style={{ width: 1, height: 18, background: "var(--glass-border)" }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--heading)", margin: 0 }}>{selected.name}</h1>
            <p style={{ fontSize: 11.5, color: "var(--subtext)", margin: 0 }}>{selected.student_count} students enrolled</p>
          </div>
          {/* Quick action buttons */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => navigate(`/teacher/grades?course_id=${selected.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.3)", color: "#FB8500", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              <TrendingUp size={13} /> Enter Grades
            </button>
            <button
              onClick={() => navigate(`/teacher/attendance?course_id=${selected.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.3)", color: "#219EBC", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              <CheckSquare size={13} /> Take Attendance
            </button>
            <button
              onClick={() => navigate(`/teacher/assessments?course_id=${selected.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.3)", color: "#FFB703", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              <Star size={13} /> Assessments
            </button>
          </div>
        </div>

        {/* Stat summary */}
        <div className="responsive-grid-4">
          {[
            { l: "Class Average", v: `${avgScore}%`, c: "#8ECAE6" },
            { l: "Top Score", v: `${highest}%`, c: "#219EBC" },
            { l: "Avg Attendance", v: `${avgAtt}%`, c: avgAtt < 80 ? "#FB8500" : "#FFB703" },
            { l: "At-Risk Students", v: String(atRisk), c: atRisk > 0 ? "#FB8500" : "#219EBC" },
          ].map(s => (
            <Glass key={s.l} style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
            </Glass>
          ))}
        </div>

        {/* Roster table */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} style={{ color: "#8ECAE6" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Student Roster</span>
            {atRisk > 0 && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#FB8500", background: "rgba(251,133,0,0.08)", border: "1px solid rgba(251,133,0,0.2)", padding: "3px 10px", borderRadius: 20 }}>
                <AlertTriangle size={11} /> {atRisk} student{atRisk > 1 ? "s" : ""} need attention
              </span>
            )}
          </div>

          <div className="table-responsive-wrapper">
            <div style={{ minWidth: 540 }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 80px 80px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                {["Student", "Score", "Grade", "Attendance", "Status"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

          {loadingDetail ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--subtext)", fontSize: 13 }}>Loading roster...</div>
          ) : roster.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--subtext)", fontSize: 13 }}>No enrolled students found.</div>
          ) : (
            roster.map(s => {
              const isAtRisk = s.attendance < 80 || (s.total !== null && s.total < 50);
              return (
                <div
                  key={s.id}
                  style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 80px 80px 80px", padding: "11px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", background: isAtRisk ? "rgba(251,133,0,0.025)" : "transparent" }}
                >
                  {/* Name + avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#219EBC", flexShrink: 0 }}>
                      {s.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{s.email}</div>
                    </div>
                  </div>

                  {/* Score */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.total !== null ? gradeColor(s.grade) : "var(--subtext)" }}>
                    {s.total !== null ? `${s.total}%` : "—"}
                  </span>

                  {/* Grade badge */}
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${gradeColor(s.grade)}15`, color: gradeColor(s.grade), display: "inline-block", textAlign: "center" }}>
                    {s.grade}
                  </span>

                  {/* Attendance bar */}
                  <div>
                    <div style={{ fontSize: 11.5, color: s.attendance < 80 ? "#FB8500" : "var(--heading)", fontWeight: 600 }}>{s.days_total > 0 ? `${s.attendance}%` : "—"}</div>
                    {s.days_total > 0 && (
                      <div style={{ height: 3, borderRadius: 2, background: "var(--muted)", marginTop: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${s.attendance}%`, background: s.attendance < 80 ? "#FB8500" : "#219EBC", borderRadius: 2 }} />
                      </div>
                    )}
                  </div>

                  {/* Status pill */}
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: isAtRisk ? "rgba(251,133,0,0.1)" : "rgba(33,158,188,0.1)", color: isAtRisk ? "#FB8500" : "#219EBC", display: "inline-block", whiteSpace: "nowrap" }}>
                    {isAtRisk ? "⚠ At Risk" : "✔ On Track"}
                  </span>
                </div>
              );
            })
          )}
            </div>
          </div>
        </Glass>
      </div>
    );
  }

  // ── COURSE CARD LIST ───────────────────────────────────────────────────
  const CARD_COLORS = ["#219EBC", "#8ECAE6", "#FFB703", "#FB8500"];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>My Classes</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
            {loadingCourses ? "Loading..." : `${courses.length} course${courses.length !== 1 ? "s" : ""} assigned`}
          </p>
        </div>
        <button
          onClick={() => navigate("/teacher/grades")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", color: "#219EBC", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          <ClipboardList size={13} /> Enter Grades
        </button>
      </div>

      {loadingCourses ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading classes...</div>
      ) : courses.length === 0 ? (
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <Users size={48} style={{ color: "#8ECAE6", marginBottom: 16, opacity: 0.6 }} />
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 8px", color: "var(--heading)" }}>No Classes Assigned</h3>
          <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>You have no courses assigned yet. Contact admin to be assigned classes.</p>
        </Glass>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {courses.map((c, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <Glass
                key={c.id}
                onClick={() => openCourse(c)}
                style={{ cursor: "pointer", transition: "transform 0.18s, box-shadow 0.18s" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}22`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--glass-shadow)";
                }}
              >
                {/* Card header */}
                <div style={{ padding: "18px 20px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users size={22} style={{ color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--heading)", marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>{c.student_count} students enrolled</div>
                  </div>
                  <ChevronRight size={18} style={{ color: "var(--subtext)" }} />
                </div>

                {/* Stats strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid var(--glass-border)" }}>
                  {[
                    ["Class Avg", c.avg > 0 ? `${c.avg}%` : "—", "#8ECAE6"],
                    ["Top Score", c.highest > 0 ? `${c.highest}%` : "—", "#219EBC"],
                    ["Absent", String(c.absent), c.absent > 2 ? "#FFB703" : "var(--subtext)"],
                  ].map(([label, val, col], idx) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px 16px", textAlign: "center",
                        borderRight: idx < 2 ? "1px solid var(--glass-border)" : "none"
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 800, color: col as string }}>{val}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}
