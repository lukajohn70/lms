import { useState, useEffect } from "react";
import { TrendingUp, Award, Star, Printer, Layers, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const gradeColor = (g: string) => g === "A" ? "#219EBC" : g === "B" ? "#8ECAE6" : g === "C" ? "#FFB703" : "#FB8500";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

// Render tick marks for a rating value (1-5)
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

export default function Results() {
  const [term, setTerm] = useState("2nd");
  const [viewMode, setViewMode] = useState<"term" | "annual">("term");
  const [resultMode, setResultMode] = useState<"end_of_term" | "mid_term">("end_of_term");
  const [results, setResults] = useState<any[]>([]);
  const [average, setAverage] = useState(0);
  const [annualAverage, setAnnualAverage] = useState(0);
  const [promotionDecision, setPromotionDecision] = useState("PROMOTED TO NEXT CLASS");
  const [promotionColor, setPromotionColor] = useState("#219EBC");
  const [rank, setRank] = useState("—");
  const [highest, setHighest] = useState(0);
  const [highestSubject, setHighestSubject] = useState("—");
  const [loading, setLoading] = useState(true);

  const [assessment, setAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/student/grades?term=${encodeURIComponent(term + " Term")}`)
      .then((res: any) => {
        setResults(res.grades || []);
        setAverage(res.average || 0);
        setAnnualAverage(res.annual_average || res.average || 0);
        if (res.promotion_decision) setPromotionDecision(res.promotion_decision);
        if (res.promotion_color) setPromotionColor(res.promotion_color);
        setRank(res.rank || "—");
        setHighest(res.highest || 0);
        setHighestSubject(res.highest_subject || "—");
        // Detect mid-term mode from returned grade data
        if (res.result_mode) setResultMode(res.result_mode);
      })
      .catch(err => console.error("Error loading results", err))
      .finally(() => setLoading(false));
  }, [term]);

  useEffect(() => {
    setLoadingAssessment(true);
    apiClient.get(`/student/assessment?term=${encodeURIComponent(term + " Term")}`)
      .then((res: any) => {
        setAssessment(res.success ? res.assessment : null);
      })
      .catch(() => setAssessment(null))
      .finally(() => setLoadingAssessment(false));
  }, [term]);

  const handlePrint = () => {
    const token = localStorage.getItem("token");
    // API_BASE_URL points to the Apache server (port 80), not Vite's dev port
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/print&token=${encodeURIComponent(token || "")}&term=${encodeURIComponent(term + " Term")}`;
    window.open(url, "_blank");
  };

  const barData = results.map(r => ({ name: r.subject.slice(0, 5), score: r.total }));

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Results &amp; Transcripts</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
            {resultMode === "mid_term" ? (
              <span style={{ color: "#FFB703", fontWeight: 700 }}>⚡ Mid-Term Assessment Mode — Showing mid-term scores only</span>
            ) : (
              "Academic performance, term evaluations & annual promotion status"
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {["1st","2nd","3rd"].map(t => (
            <button key={t} onClick={() => setTerm(t)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${term === t ? "#219EBC" : "var(--glass-border)"}`, background: term === t ? "rgba(33,158,188,0.15)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: term === t ? 700 : 400, color: term === t ? "#219EBC" : "var(--subtext)" }}>
              {t} Term
            </button>
          ))}
          <button
            onClick={() => setViewMode(v => v === "term" ? "annual" : "term")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: `1px solid ${viewMode === "annual" ? "#FB8500" : "var(--glass-border)"}`, background: viewMode === "annual" ? "rgba(251,133,0,0.15)" : "var(--muted)", color: viewMode === "annual" ? "#FB8500" : "var(--subtext)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            <Layers size={13} /> {viewMode === "annual" ? "Show Term View" : "3-Term Cumulative Sheet"}
          </button>
          <button
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#219EBC,#023047)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(33,158,188,0.3)" }}
          >
            <Printer size={13} />
            Print Report Card
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: "var(--subtext)", textAlign: "center" }}>Loading transcript...</div>
      ) : results.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
          No grade entries found for the selected term.
        </Glass>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { l: "Term Average", v: `${average}%`, c: "#219EBC", icon: <TrendingUp size={15}/> },
              { l: "Class Position", v: rank, c: "#FFB703", icon: <Award size={15}/> },
              { l: "Annual Cumulative", v: `${annualAverage}%`, c: "#FB8500", icon: <TrendingUp size={15}/> },
              { l: "Enrolled Subjects", v: String(results.length), c: "#8ECAE6", icon: <Award size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 18px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          {/* Promotion recommendation banner */}
          <Glass style={{ padding: "14px 20px", marginBottom: 18, borderLeft: `4px solid ${promotionColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Official Academic Board Evaluation (Annual Cumulative)</span>
                <div style={{ fontSize: 15, fontWeight: 800, color: promotionColor, marginTop: 2 }}>{promotionDecision}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2a9d8f", fontWeight: 700, background: "rgba(42,157,143,0.1)", padding: "5px 12px", borderRadius: 6 }}>
                <CheckCircle2 size={13} /> Verified &amp; Endorsed by Principal
              </div>
            </div>
          </Glass>

          {viewMode === "annual" ? (
            /* Multi-Term Cumulative 3-Term Table */
            <Glass style={{ marginBottom: 18 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>Annual Cumulative Grade Sheet (1st, 2nd &amp; 3rd Term Progression)</span>
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
              {results.map((r) => (
                <div key={r.subject} style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 90px 90px 100px 90px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{r.subject}</div>
                    <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                  </div>
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
            /* Current Term Detailed Table & Chart */
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, marginBottom: 18 }}>
              {/* Score table */}
              <Glass>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Subject Scores — {term} Term</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 70px 60px 70px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                  {["Subject", "CA", "Exam", "Total", "Grade", "Position"].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {results.map((r) => (
                  <div key={r.subject} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 70px 60px 70px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--heading)" }}>{r.subject}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{r.teacher}</div>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--heading)" }}>{r.ca}/{r.maxCA}</span>
                    <span style={{ fontSize: 13, color: "var(--heading)" }}>{r.exam}/{r.maxExam}</span>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: gradeColor(r.grade) }}>{r.total}</span>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--muted)", marginTop: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.total}%`, background: gradeColor(r.grade) }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(r.grade), padding: "2px 8px", background: `${gradeColor(r.grade)}15`, borderRadius: 6, display: "inline-block", textAlign: "center" }}>{r.grade}</span>
                    <span style={{ fontSize: 12, color: "var(--subtext)" }}>{r.position}</span>
                  </div>
                ))}
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--heading)" }}>Overall Average</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#219EBC" }}>{average}%</span>
                </div>
              </Glass>

              {/* Bar chart */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Score Distribution</div>
                <div style={{ padding: "12px" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fill: "var(--subtext)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "'Poppins',sans-serif", fontSize: 11 }} />
                      <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                        {barData.map((_, i) => (
                          <Cell key={i} fill={["#219EBC","#8ECAE6","#FFB703","#FB8500","#219EBC","#8ECAE6"][i % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Glass>
            </div>
          )}

          {/* Assessment / Ratings Panel */}
          {!loadingAssessment && assessment && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              {/* Affective Domain */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={14} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Affective Domain ({term} Term)</span>
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

              {/* Psychomotor Domain + Comments */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Glass>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Award size={14} style={{ color: "#8ECAE6" }} />
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

                {/* Teacher & Principal Remarks */}
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
        </>
      )}
    </div>
  );
}
