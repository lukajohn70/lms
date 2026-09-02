import { useState, useEffect } from "react";
import {
  TrendingUp, Award, Star, Printer, CheckCircle2,
  BarChart2, ClipboardList, Layers
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

type ViewType = "terminal" | "mid_term" | "cumulative";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const gradeColor = (g: string) =>
  g === "A" ? "#219EBC" : g === "B" ? "#8ECAE6" : g === "C" ? "#FFB703" : g === "D" ? "#FB8500" : "#ef4444";

const ratingColor = (r: string) =>
  r === "EXCELLENT" ? "#219EBC" : r === "VERY GOOD" ? "#8ECAE6" : r === "GOOD" ? "#FFB703" : r === "FAIR" ? "#FB8500" : "#ef4444";

const RatingTicks = ({ value }: { value: number }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: i <= value ? "rgba(33,158,188,0.9)" : "var(--muted)", border: `1px solid ${i <= value ? "#219EBC" : "var(--glass-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {i <= value && <Star size={8} style={{ color: "#fff", fill: "#fff" }} />}
      </div>
    ))}
  </div>
);

const AFFECTIVE: [string, string][] = [
  ["punctuality","Punctuality"],["neatness","Neatness"],["politeness","Politeness"],
  ["honesty","Honesty"],["team_spirit","Cooperation"],["leadership","Leadership"],
  ["helping_others","Helpfulness"],["emotional_stability","Emotional Stability"],
  ["health","Health"],["attitude_to_work","Attitude to Work"],
  ["attentiveness","Attentiveness"],["perseverance","Perseverance"],["spoken_english","Spoken English"],
];
const PSYCHOMOTOR: [string, string][] = [
  ["handwriting","Handwriting"],["verbal_fluency","Verbal Fluency"],["sports","Sports & Games"],
  ["handling_tools","Tools Handling"],["drawing_painting","Drawing & Painting"],["musical","Music"],
];

export default function Results() {
  const [term, setTerm]         = useState("2nd");
  const [viewType, setViewType] = useState<ViewType>("terminal");
  const [grades, setGrades]     = useState<any[]>([]);
  const [meta, setMeta]         = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [loadingAss, setLoadingAss] = useState(true);

  const termStr = `${term} Term`;
  const isCumAvailable = term !== "1st";

  // Reset cumulative if switching to 1st term
  useEffect(() => {
    if (term === "1st" && viewType === "cumulative") setViewType("terminal");
  }, [term]);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/student/grades?term=${encodeURIComponent(termStr)}&view_type=${viewType}`)
      .then((res: any) => { setGrades(res.grades || []); setMeta(res); })
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, [term, viewType]);

  useEffect(() => {
    setLoadingAss(true);
    apiClient.get(`/student/assessment?term=${encodeURIComponent(termStr)}`)
      .then((res: any) => setAssessment(res.success ? res.assessment : null))
      .catch(() => setAssessment(null))
      .finally(() => setLoadingAss(false));
  }, [term]);

  const handlePrint = () => {
    const token = localStorage.getItem("token");
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/print&token=${encodeURIComponent(token || "")}&term=${encodeURIComponent(termStr)}&view_type=${viewType}`;
    window.open(url, "_blank");
  };

  const ViewBtn = ({ type, label, icon }: { type: ViewType; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setViewType(type)}
      disabled={type === "cumulative" && !isCumAvailable}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: type === "cumulative" && !isCumAvailable ? "not-allowed" : "pointer",
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
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Results &amp; Transcripts</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
            {viewType === "mid_term" ? <span style={{ color: "#FFB703", fontWeight: 700 }}>⚡ Mid-Term Assessment Results</span>
              : viewType === "cumulative" ? <span style={{ color: "#FB8500", fontWeight: 700 }}>📊 Cumulative — {term === "2nd" ? "1st & 2nd Term" : "All 3 Terms"} Average</span>
              : "End-of-Term academic results & class position"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Term pills */}
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
            {["1st", "2nd", "3rd"].map(t => (
              <button key={t} onClick={() => setTerm(t)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: term === t ? "#219EBC" : "transparent", color: term === t ? "#fff" : "var(--subtext)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>{t} Term</button>
            ))}
          </div>

          {/* View type */}
          <ViewBtn type="terminal"   label="Terminal"   icon={<BarChart2 size={12} />} />
          <ViewBtn type="mid_term"   label="Mid-Term"   icon={<ClipboardList size={12} />} />
          <ViewBtn type="cumulative" label="Cumulative" icon={<Layers size={12} />} />

          {/* Print */}
          <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#219EBC,#023047)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(33,158,188,0.3)" }}>
            <Printer size={13} /> Print Report Card
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: "var(--subtext)", textAlign: "center" }}>Loading results...</div>
      ) : grades.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No grade entries recorded for this term and view.</Glass>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
            {[
              { l: viewType === "cumulative" ? "Cumulative Avg" : "Term Average", v: `${meta.average || 0}%`, c: "#219EBC", icon: <TrendingUp size={15}/> },
              { l: "Class Rank", v: meta.rank || "—", c: "#FFB703", icon: <Award size={15}/> },
              { l: "Best Subject", v: meta.highest_subject || "—", c: "#8ECAE6", icon: <Star size={15}/> },
              { l: "Subjects", v: String(grades.length), c: "#FB8500", icon: <ClipboardList size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 18px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: s.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          {/* Promotion Banner */}
          <Glass style={{ padding: "14px 20px", marginBottom: 18, borderLeft: `4px solid ${meta.promotion_color || "#219EBC"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Academic Board Annual Decision</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: meta.promotion_color || "#219EBC", marginTop: 2 }}>{meta.promotion_decision || "PROMOTED TO NEXT CLASS"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2a9d8f", fontWeight: 700, background: "rgba(42,157,143,0.1)", padding: "5px 12px", borderRadius: 6 }}>
                <CheckCircle2 size={13} /> Verified &amp; Endorsed by Principal
              </div>
            </div>
          </Glass>

          {/* UNIFIED RESULT TABLE */}
          <Glass style={{ marginBottom: 18 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>
                {viewType === "terminal" ? `End-of-Term Result Sheet — ${termStr}` :
                 viewType === "mid_term" ? `Mid-Term Assessment Sheet — ${termStr}` :
                 `Cumulative Result Sheet — ${term === "2nd" ? "1st & 2nd Term" : "All Terms"}`}
              </span>
              <span style={{ fontSize: 11, color: "var(--subtext)" }}>Session: {meta.session || "2026/2027"}</span>
            </div>

            {/* TERMINAL TABLE */}
            {viewType === "terminal" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 80px 80px 80px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span><span style={{textAlign:"center"}}>CA1 /20</span><span style={{textAlign:"center"}}>CA2 /20</span>
                  <span style={{textAlign:"center"}}>Exam /60</span><span style={{textAlign:"center"}}>Total /100</span>
                  <span style={{textAlign:"center"}}>Grade</span><span style={{textAlign:"center"}}>Position</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: "1.8fr 70px 70px 80px 80px 80px 80px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.ca1 ?? "—"}</span>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.ca2 ?? "—"}</span>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.exam ?? "—"}</span>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: gradeColor(r.grade) }}>{r.total}</span>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--muted)", marginTop: 3 }}>
                        <div style={{ height: "100%", width: `${r.total}%`, background: gradeColor(r.grade), borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor(r.grade), background: `${gradeColor(r.grade)}18`, padding: "2px 8px", borderRadius: 6 }}>{r.grade}</span>
                    </div>
                    <span style={{ textAlign:"center", fontSize: 12, color: "var(--subtext)" }}>{r.position}</span>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  <span>Term Average: <span style={{ color: "#219EBC", fontSize: 16 }}>{meta.average}%</span></span>
                  <span>Rank: <span style={{ color: "#FFB703" }}>{meta.rank}</span></span>
                </div>
              </>
            )}

            {/* MID-TERM TABLE */}
            {viewType === "mid_term" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 90px 100px 100px 110px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span><span style={{textAlign:"center"}}>Assign /10</span><span style={{textAlign:"center"}}>Project /10</span>
                  <span style={{textAlign:"center"}}>Mid-Test /20</span><span style={{textAlign:"center"}}>Total /40</span>
                  <span style={{textAlign:"center"}}>Rating</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 90px 100px 100px 110px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.assignment ?? "—"}</span>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.project ?? "—"}</span>
                    <span style={{ textAlign:"center", fontSize: 13, color: "var(--heading)" }}>{r.mid_term_test ?? "—"}</span>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: ratingColor(r.rating) }}>{r.total}</span>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ratingColor(r.rating), background: `${ratingColor(r.rating)}18`, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{r.rating}</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  Mid-Term Average: <span style={{ color: "#FFB703", fontSize: 16, marginLeft: 8 }}>{meta.average}%</span>
                </div>
              </>
            )}

            {/* CUMULATIVE TABLE */}
            {viewType === "cumulative" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: term === "3rd" ? "1.5fr 90px 90px 90px 110px 80px" : "1.5fr 100px 100px 120px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", gap: 4 }}>
                  <span>Subject</span>
                  <span style={{textAlign:"center"}}>1st Term</span>
                  <span style={{textAlign:"center"}}>2nd Term</span>
                  {term === "3rd" && <span style={{textAlign:"center"}}>3rd Term</span>}
                  <span style={{textAlign:"center"}}>Cumulative Avg</span>
                  <span style={{textAlign:"center"}}>Grade</span>
                </div>
                {grades.map((r: any) => (
                  <div key={r.course_id} style={{ display: "grid", gridTemplateColumns: term === "3rd" ? "1.5fr 90px 90px 90px 110px 80px" : "1.5fr 100px 100px 120px 80px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", gap: 4 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ textAlign:"center", fontSize: 13, color: r.term1 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term1 !== null ? `${r.term1}%` : "—"}</span>
                    <span style={{ textAlign:"center", fontSize: 13, color: r.term2 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term2 !== null ? `${r.term2}%` : "—"}</span>
                    {term === "3rd" && <span style={{ textAlign:"center", fontSize: 13, color: r.term3 !== null ? "var(--heading)" : "var(--subtext)" }}>{r.term3 !== null ? `${r.term3}%` : "—"}</span>}
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#FB8500" }}>{r.cum_avg}%</span>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor(r.grade), background: `${gradeColor(r.grade)}18`, padding: "2px 8px", borderRadius: 6 }}>{r.grade}</span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>
                  <span>Cumulative Average: <span style={{ color: "#FB8500", fontSize: 16 }}>{meta.average}%</span></span>
                </div>
              </>
            )}
          </Glass>

          {/* Behavior Assessments */}
          {!loadingAss && assessment && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <Glass>
                <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={13} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Affective Domain</span>
                  <span style={{ fontSize: 10, color: "var(--subtext)", marginLeft: "auto" }}>1–5 Rating</span>
                </div>
                <div style={{ padding: "8px 18px 14px" }}>
                  {AFFECTIVE.map(([k, label]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: 12, color: "var(--heading)" }}>{label}</span>
                      <RatingTicks value={assessment[k] ?? 0} />
                    </div>
                  ))}
                </div>
              </Glass>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Glass>
                  <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={13} style={{ color: "#8ECAE6" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Psychomotor Domain</span>
                  </div>
                  <div style={{ padding: "8px 18px 14px" }}>
                    {PSYCHOMOTOR.map(([k, label]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 12, color: "var(--heading)" }}>{label}</span>
                        <RatingTicks value={assessment[k] ?? 0} />
                      </div>
                    ))}
                  </div>
                </Glass>
                {(assessment.class_teacher_comment || assessment.principal_remark) && (
                  <Glass style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 10 }}>Remarks</div>
                    {assessment.class_teacher_comment && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Form Teacher</div>
                        <div style={{ fontSize: 12.5, color: "var(--heading)", fontStyle: "italic", padding: "8px 12px", borderRadius: 8, background: "rgba(33,158,188,0.06)", borderLeft: "3px solid #219EBC", lineHeight: 1.6 }}>{assessment.class_teacher_comment}</div>
                      </div>
                    )}
                    {assessment.principal_remark && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Principal</div>
                        <div style={{ fontSize: 12.5, color: "var(--heading)", fontStyle: "italic", padding: "8px 12px", borderRadius: 8, background: "rgba(255,183,3,0.06)", borderLeft: "3px solid #FFB703", lineHeight: 1.6 }}>{assessment.principal_remark}</div>
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
