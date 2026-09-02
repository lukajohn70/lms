import { useState, useEffect } from "react";
import { TrendingUp, Award, CalendarDays, AlertTriangle, GraduationCap, Star, Printer, Layers, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { apiClient } from "../../lib/apiClient";
import { useNavigate } from "react-router";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const gradeColor = (g: string) => g === "A" ? "#219EBC" : g === "B" ? "#8ECAE6" : g === "C" ? "#FFB703" : "#FB8500";

// Rating dots (1–5)
const RatingTicks = ({ value }: { value: number }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{
        width: 14, height: 14, borderRadius: 3,
        background: i <= value ? "rgba(255,183,3,0.9)" : "var(--muted)",
        border: `1px solid ${i <= value ? "#FFB703" : "var(--glass-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {i <= value && <Star size={7} style={{ color: "#fff", fill: "#fff" }} />}
      </div>
    ))}
  </div>
);

const AFFECTIVE_TRAITS: [string, string][] = [
  ["punctuality", "Punctuality"],
  ["neatness", "Neatness"],
  ["politeness", "Politeness"],
  ["honesty", "Honesty"],
  ["team_spirit", "Cooperation"],
  ["leadership", "Leadership"],
  ["helping_others", "Helpfulness"],
  ["emotional_stability", "Emotional Stability"],
  ["health", "Health"],
  ["attitude_to_work", "Attitude to Work"],
  ["attentiveness", "Attentiveness"],
  ["perseverance", "Perseverance"],
  ["spoken_english", "Spoken English"],
];

const PSYCHOMOTOR_SKILLS: [string, string][] = [
  ["handwriting", "Handwriting"],
  ["verbal_fluency", "Verbal Fluency"],
  ["sports", "Sports & Games"],
  ["handling_tools", "Tools Handling"],
  ["drawing_painting", "Drawing & Painting"],
  ["musical", "Music"],
];

export default function Performance() {
  const navigate = useNavigate();

  const [enrolledChildren, setEnrolledChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("2nd Term");
  const [viewMode, setViewMode] = useState<"term" | "annual">("term");

  // Child dynamic stats states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attWeeks, setAttWeeks] = useState<boolean[][]>([]);
  const [perfTrend, setPerfTrend] = useState<any[]>([]);
  const [termData, setTermData] = useState<any[]>([]);
  const [annualAverage, setAnnualAverage] = useState(0);
  const [promotionDecision, setPromotionDecision] = useState("PROMOTED TO NEXT CLASS");
  const [promotionColor, setPromotionColor] = useState("#219EBC");
  const [presentDays, setPresentDays] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  // Assessment states
  const [assessment, setAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  // 1. Fetch parent's children
  useEffect(() => {
    apiClient.get("/parent/children")
      .then((data: any) => {
        const active = data.active_children || [];
        setEnrolledChildren(active);
        if (active.length > 0) {
          setSelectedChild(active[0]);
        }
      })
      .catch(() => setEnrolledChildren([]))
      .finally(() => setLoadingChildren(false));
  }, []);

  // 2. Fetch selected child's performance details
  useEffect(() => {
    if (!selectedChild) return;

    setLoadingStats(true);
    setLoadingAssessment(true);

    Promise.all([
      apiClient.get(`/parent/grades?student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}`),
      apiClient.get(`/parent/attendance?student_id=${selectedChild.id}`),
      apiClient.get(`/parent/assessment?student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}`)
    ])
      .then(([gradesRes, attendanceRes, assessmentRes]: any[]) => {
        const subList = (gradesRes.grades || []).map((g: any) => ({
          s: g.subject,
          ca: g.ca,
          exam: g.exam,
          total: g.total,
          grade: g.grade,
          pos: g.position,
          term1: g.term1,
          term2: g.term2,
          term3: g.term3,
          annual_avg: g.annual_avg,
          annual_grade: g.annual_grade
        }));
        setSubjects(subList);

        // Attendance grid
        setAttWeeks(attendanceRes.grid || []);
        setPresentDays(attendanceRes.present || 0);
        setTotalDays(attendanceRes.total || 30);

        setAnnualAverage(gradesRes.annual_average || gradesRes.average || 0);
        if (gradesRes.promotion_decision) setPromotionDecision(gradesRes.promotion_decision);
        if (gradesRes.promotion_color) setPromotionColor(gradesRes.promotion_color);

        // Term Overview summary cards
        setTermData([
          { term: selectedTerm, score: gradesRes.average || 0, pos: gradesRes.rank || "—" }
        ]);

        // Trend graph mapping
        const trend = (gradesRes.grades || []).map((g: any) => ({
          m: g.subject.slice(0, 5),
          s: g.total
        }));
        setPerfTrend(trend);

        // Assessment
        setAssessment(assessmentRes.success ? assessmentRes.assessment : null);
      })
      .catch(err => console.error("Error loading performance data", err))
      .finally(() => {
        setLoadingStats(false);
        setLoadingAssessment(false);
      });

  }, [selectedChild, selectedTerm]);

  const handlePrint = () => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    const baseUrl = window.location.origin;
    const apiBase = `${baseUrl}/lms/api`;
    const url = `${apiBase}/index.php?path=/reports/print&student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}&token=${encodeURIComponent(token || "")}`;
    window.open(url, "_blank");
  };

  if (loadingChildren) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--subtext)", fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  // Empty state: no enrolled children
  if (enrolledChildren.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Academic Performance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Track your child's academic results and attendance</p>
        </div>
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <GraduationCap size={52} style={{ color: "#219EBC", marginBottom: 18, opacity: 0.7 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px", color: "var(--heading)" }}>No Enrolled Children Found</h3>
          <p style={{ fontSize: 13.5, color: "var(--subtext)", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Academic performance records will appear here once your child is enrolled. Please apply for admission or accept an admission offer to link your child to this portal.
          </p>
          <button
            onClick={() => navigate("/parent/admissions")}
            style={{
              padding: "11px 24px", borderRadius: 10,
              background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
              color: "white", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, boxShadow: "0 6px 20px rgba(33,158,188,0.22)"
            }}
          >
            Go to Admissions
          </button>
        </Glass>
      </div>
    );
  }

  const childName = `${selectedChild.first_name || ""} ${selectedChild.last_name || ""}`.trim() || "Your Child";
  const childClass = selectedChild.current_class || selectedChild.grade_level || "—";
  const attPercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Academic Performance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{childName} · {childClass}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Term Selector */}
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
            {["1st Term", "2nd Term", "3rd Term"].map(t => (
              <button
                key={t}
                onClick={() => setSelectedTerm(t)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: selectedTerm === t ? "#FFB703" : "transparent",
                  color: selectedTerm === t ? "#000" : "var(--subtext)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {enrolledChildren.length > 1 && (
            <select
              value={selectedChild.id}
              onChange={e => setSelectedChild(enrolledChildren.find(c => c.id === parseInt(e.target.value)))}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }}
            >
              {enrolledChildren.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          )}

          <button
            onClick={() => setViewMode(v => v === "term" ? "annual" : "term")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: `1px solid ${viewMode === "annual" ? "#FB8500" : "var(--glass-border)"}`, background: viewMode === "annual" ? "rgba(251,133,0,0.15)" : "var(--muted)", color: viewMode === "annual" ? "#FB8500" : "var(--subtext)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            <Layers size={13} /> {viewMode === "annual" ? "Show Term View" : "3-Term Cumulative"}
          </button>

          <button
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#FFB703,#FB8500)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(255,183,3,0.3)" }}
          >
            <Printer size={13} />
            Print Report Card
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Updating academic file...</div>
      ) : subjects.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No grades or results recorded yet for this student.</Glass>
      ) : (
        <>
          {/* Term cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 18 }}>
            {termData.map(t => (
              <Glass key={t.term} style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>{t.term} · Overview</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#219EBC" }}>{t.score}%</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)" }}>Term Average</div>
                  </div>
                  <div style={{ height: 40, width: 1, background: "var(--glass-border)" }} />
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#FB8500" }}>{annualAverage}%</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)" }}>Annual Cumulative</div>
                  </div>
                  <div style={{ height: 40, width: 1, background: "var(--glass-border)" }} />
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: attPercent < 80 ? "#FB8500" : "#8ECAE6" }}>{attPercent}%</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)" }}>Attendance</div>
                  </div>
                </div>
              </Glass>
            ))}
          </div>

          {/* Promotion recommendation banner */}
          <Glass style={{ padding: "14px 20px", marginBottom: 18, borderLeft: `4px solid ${promotionColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Academic Board Annual Status</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: promotionColor, marginTop: 2 }}>{promotionDecision}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2a9d8f", fontWeight: 700, background: "rgba(42,157,143,0.1)", padding: "5px 12px", borderRadius: 6 }}>
                <CheckCircle2 size={13} /> Official &amp; Verified Result
              </div>
            </div>
          </Glass>

          {viewMode === "annual" ? (
            /* Annual Cumulative Table */
            <Glass style={{ marginBottom: 18 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>Annual Cumulative Grade Sheet (3-Term Progress)</span>
                <span style={{ fontSize: 11, color: "var(--subtext)" }}>Session: 2026/2027</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 90px 90px 100px 90px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                <span>Subject</span>
                <span style={{ textAlign: "center" }}>1st Term</span>
                <span style={{ textAlign: "center" }}>2nd Term</span>
                <span style={{ textAlign: "center" }}>3rd Term</span>
                <span style={{ textAlign: "center" }}>Annual Avg</span>
                <span style={{ textAlign: "center" }}>Grade</span>
              </div>
              {subjects.map((r) => (
                <div key={r.s} style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 90px 90px 100px 90px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.s}</span>
                  <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.term1 !== null ? `${r.term1}%` : "—"}</span>
                  <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.term2 !== null ? `${r.term2}%` : "—"}</span>
                  <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.term3 !== null ? `${r.term3}%` : "—"}</span>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#FB8500" }}>{r.annual_avg}%</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor(r.annual_grade), padding: "2px 8px", background: `${gradeColor(r.annual_grade)}15`, borderRadius: 6 }}>
                      {r.annual_grade}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(251,133,0,0.04)" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>Cumulative Annual Average:</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#FB8500" }}>{annualAverage}%</span>
              </div>
            </Glass>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 16, marginBottom: 16 }} className="parent-grid-layout">
                {/* Score trend */}
                <Glass>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Subject Score Chart</div>
                  <div style={{ padding: "8px 12px 12px" }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={perfTrend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                        <defs>
                          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFB703" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#FFB703" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                        <XAxis dataKey="m" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0,100]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                        <Area type="monotone" dataKey="s" stroke="#FFB703" strokeWidth={2} fill="url(#pg)" dot={{ fill:"#FFB703", r:3, strokeWidth:0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Glass>

                {/* Attendance */}
                <Glass>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarDays size={14} style={{ color: "#FFB703" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Attendance Rate</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: attPercent < 80 ? "#FFB703" : "#219EBC" }}>{attPercent}%</span>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, marginBottom: 8 }}>
                      {["M","T","W","T","F"].map((d,i) => <div key={i} style={{ textAlign: "center", fontSize: 9, color: "var(--subtext)" }}>{d}</div>)}
                      {attWeeks.flat().map((p, i) => (
                        <div key={i} style={{ height: 16, borderRadius: 3, background: p ? "rgba(33,158,188,0.4)" : "rgba(255,183,3,0.3)", border: p ? "1px solid rgba(33,158,188,0.35)" : "1px solid rgba(255,183,3,0.35)" }} />
                      ))}
                    </div>
                    {attPercent < 90 && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 9px", borderRadius: 8, background: "rgba(255,183,3,0.08)", border: "1px solid rgba(255,183,3,0.2)" }}>
                        <AlertTriangle size={11} style={{ color: "#FFB703", flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 10.5, color: "#FFB703", lineHeight: 1.4 }}>Below 90% target. Please ensure regular attendance.</span>
                      </div>
                    )}
                  </div>
                </Glass>
              </div>

              {/* Subject breakdown */}
              <Glass style={{ marginBottom: 18 }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Award size={14} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Subject Breakdown ({selectedTerm})</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 70px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                  {["Subject", "CA (/40)", "Exam (/60)", "Total", "Grade", "Position"].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {subjects.map(s => (
                  <div key={s.s} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 70px 80px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{s.s}</span>
                    <span style={{ fontSize: 12.5, color: "var(--subtext)" }}>{s.ca}/40</span>
                    <span style={{ fontSize: 12.5, color: "var(--subtext)" }}>{s.exam}/60</span>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: gradeColor(s.grade) }}>{s.total}</span>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--muted)", marginTop: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${s.total}%`, background: gradeColor(s.grade) }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(s.grade), background: `${gradeColor(s.grade)}15`, padding: "2px 8px", borderRadius: 6, display: "inline-block", textAlign: "center" }}>{s.grade}</span>
                    <span style={{ fontSize: 12, color: "var(--subtext)" }}>{s.pos}</span>
                  </div>
                ))}
              </Glass>
            </>
          )}

          {/* Assessment / Behavior Ratings */}
          {!loadingAssessment && assessment && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              {/* Affective Domain */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={14} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Affective Domain ({selectedTerm})</span>
                  <span style={{ fontSize: 10, color: "var(--subtext)", marginLeft: "auto" }}>Rating: 1–5</span>
                </div>
                <div style={{ padding: "8px 18px 16px" }}>
                  {AFFECTIVE_TRAITS.map(([key, label]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: 12, color: "var(--heading)", fontWeight: 500 }}>{label}</span>
                      <RatingTicks value={assessment[key] ?? 0} />
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Psychomotor Domain + Teacher Remarks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Glass>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={14} style={{ color: "#8ECAE6" }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Psychomotor Domain</span>
                    <span style={{ fontSize: 10, color: "var(--subtext)", marginLeft: "auto" }}>Rating: 1–5</span>
                  </div>
                  <div style={{ padding: "8px 18px 16px" }}>
                    {PSYCHOMOTOR_SKILLS.map(([key, label]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 12, color: "var(--heading)", fontWeight: 500 }}>{label}</span>
                        <RatingTicks value={assessment[key] ?? 0} />
                      </div>
                    ))}
                  </div>
                </Glass>

                {/* Remarks */}
                {(assessment.class_teacher_comment || assessment.principal_remark) && (
                  <Glass style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Remarks</div>
                    {assessment.class_teacher_comment && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Form Teacher</div>
                        <div style={{ fontSize: 12.5, color: "var(--heading)", fontStyle: "italic", padding: "8px 12px", borderRadius: 8, background: "rgba(33,158,188,0.06)", borderLeft: "3px solid #219EBC", lineHeight: 1.6 }}>
                          {assessment.class_teacher_comment}
                        </div>
                      </div>
                    )}
                    {assessment.principal_remark && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Principal's Decision</div>
                        <div style={{ fontSize: 12.5, color: "var(--heading)", fontStyle: "italic", padding: "8px 12px", borderRadius: 8, background: "rgba(255,183,3,0.06)", borderLeft: "3px solid #FFB703", lineHeight: 1.6 }}>
                          {assessment.principal_remark}
                        </div>
                      </div>
                    )}
                  </Glass>
                )}
              </div>
            </div>
          )}

          {!loadingAssessment && !assessment && (
            <Glass style={{ padding: "20px 18px", marginBottom: 18, color: "var(--subtext)", fontSize: 13, textAlign: "center" }}>
              No behavioral assessment recorded yet for this term.
            </Glass>
          )}
        </>
      )}
    </div>
  );
}
