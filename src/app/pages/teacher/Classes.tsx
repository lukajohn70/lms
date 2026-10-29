import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, TrendingUp, ChevronRight, ArrowLeft, ClipboardList, CheckSquare, Star, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";

const DLHS = {
  navy: "#293D7D",
  navyDark: "#16234B",
  crimson: "#DC137B",
  crimsonHover: "#B80F66",
  blue: "#0093DD",
  gold: "#D4AF37",
  periwinkle: "#BFD1FF",
  slate: "#3A4244",
};

const Glass = ({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

const gradeColor = (g: string) => {
  if (g === "A" || g === "A1") return DLHS.navy;
  if (g === "B" || g === "B2" || g === "B3") return DLHS.blue;
  if (g === "C" || g === "C4" || g === "C5" || g === "C6") return DLHS.gold;
  if (g === "D" || g === "D7" || g === "E" || g === "E8") return "#D97706";
  if (g === "F" || g === "F9") return DLHS.crimson;
  return "var(--muted-foreground)";
};

export default function Classes() {
  const navigate = useNavigate();
  const { settings } = useApp();

  const [selectedSession, setSelectedSession] = useState(settings?.academic_session || "2026/2027");

  // ── Course list state ──────────────────────────────────────────────────
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // ── Selected course detail state ───────────────────────────────────────
  const [selected, setSelected] = useState<any | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load course list whenever selectedSession changes
  useEffect(() => {
    setLoadingCourses(true);
    setSelected(null);
    setRoster([]);
    apiClient.get(`/teacher/classes?session=${encodeURIComponent(selectedSession)}`)
      .then((res: any) => setCourses(res.courses || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingCourses(false));
  }, [selectedSession]);

  // Load detail when a course is selected
  const openCourse = (course: any) => {
    setSelected(course);
    setLoadingDetail(true);
    apiClient.get(`/teacher/classes/detail?course_id=${course.id}&class_id=${course.class_id}&session=${encodeURIComponent(selectedSession)}`)
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
      <div style={{ paddingBottom: 32 }}>
        {/* Back + heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            onClick={() => { setSelected(null); setRoster([]); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
              color: DLHS.navy, background: "none", border: "none", cursor: "pointer",
              padding: "6px 12px", borderRadius: 8, transition: "background 0.15s ease"
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(41, 61, 125, 0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <ArrowLeft size={15} /> Back to Classes
          </button>
          <div style={{ width: 1, height: 18, background: "var(--border)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                {selected.name}
              </h1>
              {selected.class_name && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(41, 61, 125, 0.1)", color: DLHS.navy, border: `1px solid ${DLHS.navy}30` }}>
                  {selected.class_name}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>{selected.student_count} registered candidates</p>
          </div>

          {/* Quick action buttons */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/teacher/grades?course_id=${selected.id}&class_id=${selected.class_id}&session=${encodeURIComponent(selectedSession)}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", border: `1px solid ${DLHS.crimson}40`, color: DLHS.crimson, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            >
              <TrendingUp size={13} /> Enter Grades
            </button>
            <button
              onClick={() => navigate(`/teacher/attendance?course_id=${selected.id}&class_id=${selected.class_id}&session=${encodeURIComponent(selectedSession)}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(0, 147, 221, 0.08)", border: `1px solid ${DLHS.blue}40`, color: DLHS.blue, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            >
              <CheckSquare size={13} /> Daily Register
            </button>
            <button
              onClick={() => navigate(`/teacher/assessments?course_id=${selected.id}&class_id=${selected.class_id}&session=${encodeURIComponent(selectedSession)}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(212, 175, 55, 0.12)", border: `1px solid ${DLHS.gold}60`, color: "#92400E", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            >
              <Star size={13} /> Assessments
            </button>
          </div>
        </div>

        {/* Stat summary */}
        <div className="responsive-grid-4" style={{ gap: 14, marginBottom: 20 }}>
          {[
            { l: "Class Average", v: `${avgScore}%`, c: DLHS.navy, sub: "Stream performance mean" },
            { l: "Top Score", v: `${highest}%`, c: DLHS.blue, sub: "Highest recorded mark" },
            { l: "Attendance Average", v: `${avgAtt}%`, c: avgAtt < 80 ? DLHS.crimson : "#059669", sub: "Roster presence rate" },
            { l: "Academic Intervention", v: String(atRisk), c: atRisk > 0 ? DLHS.crimson : DLHS.navy, sub: "Score <50% or att <80%" },
          ].map(s => (
            <Glass key={s.l} style={{ padding: "16px 20px" }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>{s.l}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.sub}</div>
            </Glass>
          ))}
        </div>

        {/* Roster table */}
        <Glass>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={15} style={{ color: DLHS.navy }} />
            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Enrolled Student Cohort</span>
            {atRisk > 0 && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: DLHS.crimson, background: "rgba(220, 19, 123, 0.08)", border: `1px solid ${DLHS.crimson}30`, padding: "3px 10px", borderRadius: 20 }}>
                <AlertTriangle size={12} /> {atRisk} candidate{atRisk > 1 ? "s" : ""} requiring focus
              </span>
            )}
          </div>

          <div className="table-responsive-wrapper">
            <div style={{ minWidth: 540 }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 90px 90px 100px 90px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                {["Candidate Name & Email", "Mark", "WAEC Grade", "Attendance", "Academic Status"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>

              {loadingDetail ? (
                <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading class roster…</div>
              ) : roster.length === 0 ? (
                <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No enrolled students registered in this subject arm.</div>
              ) : (
                roster.map(s => {
                  const isAtRisk = s.attendance < 80 || (s.total !== null && s.total < 50);
                  const color = gradeColor(s.grade);
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 90px 90px 100px 90px",
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        background: isAtRisk ? "rgba(220, 19, 123, 0.02)" : "transparent"
                      }}
                    >
                      {/* Name + avatar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: DLHS.navy, flexShrink: 0 }}>
                          {s.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.email}</div>
                        </div>
                      </div>

                      {/* Score */}
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13.5, fontWeight: 800, color: s.total !== null ? color : "var(--muted-foreground)" }}>
                        {s.total !== null ? `${s.total}%` : "—"}
                      </span>

                      {/* Grade badge */}
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${color}15`, color: color, display: "inline-block", textAlign: "center", width: "fit-content" }}>
                        {s.grade}
                      </span>

                      {/* Attendance bar */}
                      <div style={{ paddingRight: 16 }}>
                        <div style={{ fontSize: 12, color: s.attendance < 80 ? DLHS.crimson : "var(--foreground)", fontWeight: 700 }}>
                          {s.days_total > 0 ? `${s.attendance}%` : "—"}
                        </div>
                        {s.days_total > 0 && (
                          <div style={{ height: 4, borderRadius: 2, background: "var(--muted)", marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${s.attendance}%`, background: s.attendance < 80 ? DLHS.crimson : "#059669", borderRadius: 2 }} />
                          </div>
                        )}
                      </div>

                      {/* Status pill */}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: isAtRisk ? "rgba(220, 19, 123, 0.1)" : "rgba(41, 61, 125, 0.08)", color: isAtRisk ? DLHS.crimson : DLHS.navy, display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content", whiteSpace: "nowrap" }}>
                        {isAtRisk ? <><AlertTriangle size={11} /> At Risk</> : <><CheckCircle2 size={11} /> On Track</>}
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
  const CARD_COLORS = [DLHS.navy, DLHS.blue, DLHS.crimson, DLHS.gold];

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
            My Teaching Classes
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>
            {loadingCourses ? "Loading…" : `${courses.length} class stream${courses.length !== 1 ? "s" : ""} allocated for ${selectedSession}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Academic Session Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px" }}>
            <Calendar size={14} style={{ color: DLHS.navy }} />
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12.5, fontWeight: 700, outline: "none", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}
            >
              {["2026/2027", "2025/2026", "2024/2025", "2023/2024"].map(sess => (
                <option key={sess} value={sess} style={{ background: "var(--card)", color: "var(--foreground)" }}>{sess}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate(`/teacher/grades?session=${encodeURIComponent(selectedSession)}`)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: DLHS.navy, border: "none", color: "#ffffff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, boxShadow: "0 4px 12px rgba(41, 61, 125, 0.25)" }}
          >
            <ClipboardList size={14} /> Enter Term Scores
          </button>
        </div>
      </div>

      {loadingCourses ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Loading class streams…
        </div>
      ) : courses.length === 0 ? (
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <Users size={48} style={{ color: DLHS.navy, marginBottom: 16, opacity: 0.5 }} />
          <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "var(--foreground)" }}>No Teaching Classes Assigned</h3>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>You currently have no course subject arms assigned for this academic session. Contact administration for schedule allocation.</p>
        </Glass>
      ) : (
        <div className="responsive-grid-2" style={{ gap: 16 }}>
          {courses.map((c, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <Glass
                key={c.id}
                onClick={() => openCourse(c)}
                style={{ cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(41, 61, 125, 0.12)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                }}
              >
                {/* Card header */}
                <div style={{ padding: "20px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
                    <Users size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{c.name}</span>
                      {c.class_name && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}15`, color: color, border: `1px solid ${color}35` }}>
                          {c.class_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{c.student_count} registered candidates</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openCourse(c); }}
                    title={`View roster and details for ${c.name}`}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "var(--muted)", border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--foreground)", cursor: "pointer", flexShrink: 0
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Stats strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid var(--border)", background: "var(--muted)" }}>
                  {[
                    ["Class Mean", c.avg > 0 ? `${c.avg}%` : "—", DLHS.navy],
                    ["Top Score", c.highest > 0 ? `${c.highest}%` : "—", DLHS.blue],
                    ["Absent Count", String(c.absent), c.absent > 2 ? DLHS.crimson : "var(--muted-foreground)"],
                  ].map(([label, val, col], idx) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px 16px", textAlign: "center",
                        borderRight: idx < 2 ? "1px solid var(--border)" : "none"
                      }}
                    >
                      <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: col as string }}>{val}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 2, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
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
