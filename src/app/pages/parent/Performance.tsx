import { useState, useEffect } from "react";
import {
  TrendingUp, Award, CalendarDays, AlertTriangle, GraduationCap, Star,
  Printer, CheckCircle2, BarChart2, ClipboardList, Layers
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { useNavigate } from "react-router";

type ViewType = "terminal" | "mid_term" | "cumulative";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

const gradeColor = (g: string) =>
  g === "A" || g === "A1" ? "#219EBC" : g === "B" || g === "B3" ? "#8ECAE6" : g === "C" || g === "C5" ? "#FFB703" : g === "D" || g === "D7" || g === "E8" ? "#FB8500" : "#ef4444";

const ratingColor = (r: string) =>
  r === "EXCELLENT" ? "#219EBC" : r === "VERY GOOD" ? "#8ECAE6" : r === "GOOD" ? "#FFB703" : r === "FAIR" ? "#FB8500" : "#ef4444";

const RatingTicks = ({ value }: { value: number }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{
        width: 16, height: 16, borderRadius: 4,
        background: i <= value ? "rgba(33,158,188,0.9)" : "var(--muted)",
        border: `1px solid ${i <= value ? "#219EBC" : "var(--glass-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {i <= value && <Star size={8} style={{ color: "#fff", fill: "#fff" }} />}
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
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState("2nd Term");
  const [viewType, setViewType] = useState<ViewType>("terminal");

  // Dynamic stats
  const [grades, setGrades] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [attWeeks, setAttWeeks] = useState<boolean[][]>([]);
  const [perfTrend, setPerfTrend] = useState<any[]>([]);
  const [presentDays, setPresentDays] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  // Assessment
  const [assessment, setAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  const isCumAvailable = selectedTerm !== "1st Term";

  useEffect(() => {
    if (selectedTerm === "1st Term" && viewType === "cumulative") {
      setViewType("terminal");
    }
  }, [selectedTerm]);

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
      apiClient.get(`/parent/grades?student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}&view_type=${viewType}`),
      apiClient.get(`/parent/attendance?student_id=${selectedChild.id}`),
      apiClient.get(`/parent/assessment?student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}`)
    ])
      .then(([gradesRes, attendanceRes, assessmentRes]: any[]) => {
        setGrades(gradesRes.grades || []);
        setMeta(gradesRes);

        // Attendance grid
        setAttWeeks(attendanceRes.grid || []);
        setPresentDays(attendanceRes.present || 0);
        setTotalDays(attendanceRes.total || 30);

        // Trend graph mapping
        const trend = (gradesRes.grades || []).map((g: any) => ({
          m: (g.subject || "").slice(0, 5),
          s: g.total ?? g.cum_avg ?? 0
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
  }, [selectedChild, selectedTerm, viewType]);

  const handlePrint = () => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/print&student_id=${selectedChild.id}&term=${encodeURIComponent(selectedTerm)}&view_type=${viewType}&token=${encodeURIComponent(token || "")}`;
    window.open(url, "_blank");
  };

  if (loadingChildren) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--subtext)", fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  if (enrolledChildren.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Academic Performance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Track your child's academic results and attendance</p>
        </div>
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <GraduationCap size={52} style={{ color: "#219EBC", marginBottom: 18, opacity: 0.7 }} />
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--heading)", margin: "0 0 8px" }}>No Active Enrollments</h2>
          <p style={{ fontSize: 13, color: "var(--subtext)", maxWidth: 440, margin: "0 auto 20px" }}>
            You do not currently have any registered or approved children linked to your account.
          </p>
          <button
            onClick={() => navigate("/parent/admissions")}
            style={{ padding: "9px 22px", borderRadius: 8, background: "#219EBC", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Apply for Admission
          </button>
        </Glass>
      </div>
    );
  }

  const childName = `${selectedChild.first_name || ""} ${selectedChild.last_name || ""}`.trim() || "Your Child";
  const childClass = selectedChild.current_class || selectedChild.grade_level || "—";
  const attPercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const ViewBtn = ({ type, label, icon }: { type: ViewType; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setViewType(type)}
      disabled={type === "cumulative" && !isCumAvailable}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
        cursor: type === "cumulative" && !isCumAvailable ? "not-allowed" : "pointer",
        border: `1.5px solid ${viewType === type ? (type === "mid_term" ? "#FFB703" : type === "cumulative" ? "#FB8500" : "#219EBC") : "var(--glass-border)"}`,
        background: viewType === type ? (type === "mid_term" ? "rgba(255,183,3,0.15)" : type === "cumulative" ? "rgba(251,133,0,0.15)" : "rgba(33,158,188,0.15)") : "var(--muted)",
        color: viewType === type ? (type === "mid_term" ? "#FFB703" : type === "cumulative" ? "#FB8500" : "#219EBC") : type === "cumulative" && !isCumAvailable ? "var(--muted)" : "var(--subtext)",
        opacity: type === "cumulative" && !isCumAvailable ? 0.4 : 1,
        transition: "all 0.2s"
      }}
    >
      {icon}{label}
    </button>
  );

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Academic Performance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
            {childName} · {childClass} — {viewType === "mid_term" ? "⚡ Mid-Term Assessment" : viewType === "cumulative" ? "📊 Cumulative Sheet" : "End-of-Term Sheet"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                  background: selectedTerm === t ? "#219EBC" : "transparent",
                  color: selectedTerm === t ? "#fff" : "var(--subtext)",
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

          {/* 3 Result View Modes */}
          <ViewBtn type="terminal" label="Terminal" icon={<BarChart2 size={12} />} />
          <ViewBtn type="mid_term" label="Mid-Term" icon={<ClipboardList size={12} />} />
          <ViewBtn type="cumulative" label="Cumulative" icon={<Layers size={12} />} />

          <button
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#219EBC,#023047)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(33,158,188,0.3)" }}
          >
            <Printer size={13} />
            Print Report Card
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Updating academic file...</div>
      ) : meta.result_released === false ? (
        <Glass style={{ padding: "36px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", marginBottom: 8 }}>{selectedTerm} Results Not Yet Released</div>
          <div style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.6 }}>
            The school has scheduled result release for this term on
          </div>
          {meta.result_release_date && (
            <div style={{ margin: "10px auto", display: "inline-block", padding: "8px 20px", borderRadius: 10, background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.3)", color: "#FFB703", fontWeight: 800, fontSize: 14 }}>
              📅 {new Date(meta.result_release_date).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 10 }}>
            Please check back after the release date to view your child's results.
          </div>
        </Glass>
      ) : grades.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No grades or results recorded yet for this student.</Glass>
      ) : (
        <>
          {/* Term overview summary cards */}
          <div className="responsive-grid-4">
            {[
              { l: viewType === "cumulative" ? "Cumulative Avg" : "Term Average", v: `${meta.average || 0}%`, c: "#219EBC", icon: <TrendingUp size={15}/> },
              { l: "Class Rank", v: meta.rank || "—", c: "#FFB703", icon: <Award size={15}/> },
              { l: "Best Subject", v: meta.highest_subject || "—", c: "#8ECAE6", icon: <Star size={15}/> },
              { l: "Attendance Rate", v: `${attPercent}%`, c: attPercent < 80 ? "#FB8500" : "#2a9d8f", icon: <CalendarDays size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 18px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: s.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          {/* Promotion recommendation banner - ONLY IN 3RD TERM */}
          {selectedTerm === "3rd Term" && meta.promotion_decision && (
            <Glass style={{ padding: "14px 20px", marginBottom: 18, borderLeft: `4px solid ${meta.promotion_color || "#219EBC"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Academic Board Annual Status (Third Term)</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: meta.promotion_color || "#219EBC", marginTop: 2 }}>{meta.promotion_decision}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2a9d8f", fontWeight: 700, background: "rgba(42,157,143,0.1)", padding: "5px 12px", borderRadius: 6 }}>
                  <CheckCircle2 size={13} /> Official &amp; Verified Result
                </div>
              </div>
            </Glass>
          )}

          {/* UNIFIED RESULT TABLE */}
          <Glass style={{ marginBottom: 18 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>
                {viewType === "terminal" ? `End-of-Term Subject Performance (${selectedTerm})` :
                 viewType === "mid_term" ? `Mid-Term Assessment Sheet (${selectedTerm})` :
                 `Cumulative Grade Sheet (${selectedTerm === "2nd Term" ? "1st & 2nd Term" : "All Terms"})`}
              </span>
              <span style={{ fontSize: 11, color: "var(--subtext)" }}>Session: {meta.session || "2026/2027"}</span>
            </div>

            <div className="table-responsive-wrapper">
              <div style={{ minWidth: 640 }}>
                {/* TERMINAL VIEW */}
            {viewType === "terminal" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 80px 80px 80px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span><span style={{ textAlign: "center" }}>CA1 /20</span><span style={{ textAlign: "center" }}>CA2 /20</span>
                  <span style={{ textAlign: "center" }}>Exam /60</span><span style={{ textAlign: "center" }}>Total /100</span>
                  <span style={{ textAlign: "center" }}>Grade</span><span style={{ textAlign: "center" }}>Position</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 80px 80px 80px 80px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.ca1 ?? "—"}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.ca2 ?? "—"}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.exam ?? "—"}</span>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: gradeColor(r.grade) }}>{r.total}</span>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--muted)", marginTop: 3 }}>
                        <div style={{ height: "100%", width: `${r.total}%`, background: gradeColor(r.grade), borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor(r.grade), background: `${gradeColor(r.grade)}18`, padding: "2px 8px", borderRadius: 6 }}>{r.grade}</span>
                    </div>
                    <span style={{ textAlign: "center", fontSize: 12, color: "var(--subtext)" }}>{r.position}</span>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  <span>Term Average: <span style={{ color: "#219EBC", fontSize: 16 }}>{meta.average}%</span></span>
                  <span>Class Rank: <span style={{ color: "#FFB703" }}>{meta.rank}</span></span>
                </div>
              </>
            )}

            {/* MID-TERM VIEW */}
            {viewType === "mid_term" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 90px 100px 100px 110px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span><span style={{ textAlign: "center" }}>Assign /10</span><span style={{ textAlign: "center" }}>Project /10</span>
                  <span style={{ textAlign: "center" }}>Mid-Test /20</span><span style={{ textAlign: "center" }}>Total /40</span>
                  <span style={{ textAlign: "center" }}>Rating</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 90px 100px 100px 110px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.assignment ?? "—"}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.project ?? "—"}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: "var(--heading)" }}>{r.mid_term_test ?? "—"}</span>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: ratingColor(r.rating) }}>{r.total}</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ratingColor(r.rating), background: `${ratingColor(r.rating)}18`, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{r.rating}</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  Mid-Term Average: <span style={{ color: "#FFB703", fontSize: 16, marginLeft: 8 }}>{meta.average}%</span>
                </div>
              </>
            )}

            {/* CUMULATIVE VIEW */}
            {viewType === "cumulative" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: selectedTerm === "3rd Term" ? "1.5fr 90px 90px 90px 110px 80px" : "1.5fr 100px 100px 120px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span>
                  <span style={{ textAlign: "center" }}>1st Term</span>
                  <span style={{ textAlign: "center" }}>2nd Term</span>
                  {selectedTerm === "3rd Term" && <span style={{ textAlign: "center" }}>3rd Term</span>}
                  <span style={{ textAlign: "center" }}>Cumulative Avg</span>
                  <span style={{ textAlign: "center" }}>Grade</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: selectedTerm === "3rd Term" ? "1.5fr 90px 90px 90px 110px 80px" : "1.5fr 100px 100px 120px 80px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign: "center", fontSize: 13, color: r.term1 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term1 !== null ? `${r.term1}%` : "—"}</span>
                    <span style={{ textAlign: "center", fontSize: 13, color: r.term2 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term2 !== null ? `${r.term2}%` : "—"}</span>
                    {selectedTerm === "3rd Term" && <span style={{ textAlign: "center", fontSize: 13, color: r.term3 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term3 !== null ? `${r.term3}%` : "—"}</span>}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#FB8500" }}>{r.cum_avg}%</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor(r.grade), background: `${gradeColor(r.grade)}18`, padding: "2px 8px", borderRadius: 6 }}>{r.grade}</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  <span>Cumulative Average: <span style={{ color: "#FB8500", fontSize: 16 }}>{meta.average}%</span></span>
                </div>
              </>
            )}
              </div>
            </div>
          </Glass>

          {/* Charts & Attendance */}
          <div className="responsive-grid-2 parent-grid-layout" style={{ marginBottom: 16 }}>
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Subject Score Chart</div>
              <div style={{ padding: "8px 12px 12px" }}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={perfTrend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                    <defs>
                      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#219EBC" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#219EBC" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                    <Area type="monotone" dataKey="s" stroke="#219EBC" strokeWidth={2} fill="url(#pg)" dot={{ fill:"#219EBC", r:3, strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Glass>

            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={14} style={{ color: "#219EBC" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Attendance Rate</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: attPercent < 80 ? "#FB8500" : "#219EBC" }}>{attPercent}%</span>
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

          {/* Assessment / Behavior Ratings */}
          {!loadingAssessment && assessment && (
            <div className="responsive-grid-2" style={{ marginBottom: 18 }}>
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

              {/* Psychomotor Domain + Remarks */}
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

                {(assessment.class_teacher_comment || assessment.principal_remark) && (
                  <Glass style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 10 }}>Teacher &amp; Principal Feedback</div>
                    {assessment.class_teacher_comment && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Class Teacher's Remark</div>
                        <div style={{ fontSize: 12.5, color: "var(--heading)", fontStyle: "italic", padding: "8px 12px", borderRadius: 8, background: "rgba(33,158,188,0.06)", borderLeft: "3px solid #219EBC", lineHeight: 1.6 }}>
                          {assessment.class_teacher_comment}
                        </div>
                      </div>
                    )}
                    {assessment.principal_remark && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Principal's Endorsement</div>
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
        </>
      )}
    </div>
  );
}
