import { useState, useEffect } from "react";
import { TrendingUp, Award, Download, Star, Printer } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { apiClient } from "../../lib/apiClient";

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
  const [results, setResults] = useState<any[]>([]);
  const [average, setAverage] = useState(0);
  const [rank, setRank] = useState("—");
  const [highest, setHighest] = useState(0);
  const [highestSubject, setHighestSubject] = useState("—");
  const [loading, setLoading] = useState(true);

  const [assessment, setAssessment] = useState<any>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/student/grades?term=${term}`)
      .then((res: any) => {
        setResults(res.grades || []);
        setAverage(res.average || 0);
        setRank(res.rank || "—");
        setHighest(res.highest || 0);
        setHighestSubject(res.highest_subject || "—");
      })
      .catch(err => console.error("Error loading results", err))
      .finally(() => setLoading(false));
  }, [term]);

  useEffect(() => {
    setLoadingAssessment(true);
    apiClient.get("/student/assessment")
      .then((res: any) => {
        setAssessment(res.success ? res.assessment : null);
      })
      .catch(() => setAssessment(null))
      .finally(() => setLoadingAssessment(false));
  }, []);

  const handlePrint = () => {
    const token = localStorage.getItem("token");
    const baseUrl = window.location.origin;
    // Determine API base — strip /lms prefix if present
    const apiBase = `${baseUrl}/lms/api`;
    const url = `${apiBase}/index.php?path=/reports/print&token=${encodeURIComponent(token || "")}`;
    window.open(url, "_blank");
  };

  const barData = results.map(r => ({ name: r.subject.slice(0, 5), score: r.total }));

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Results &amp; Transcripts</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Academic performance across all subjects</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {["1st","2nd","3rd"].map(t => (
            <button key={t} onClick={() => setTerm(t)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${term === t ? "#219EBC" : "var(--glass-border)"}`, background: term === t ? "rgba(33,158,188,0.15)" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: term === t ? 700 : 400, color: term === t ? "#219EBC" : "var(--subtext)" }}>
              {t} Term
            </button>
          ))}
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
              { l: "Average Score", v: `${average}%`, c: "#219EBC", icon: <TrendingUp size={15}/> },
              { l: "Class Position", v: rank, c: "#FFB703", icon: <Award size={15}/> },
              { l: "Highest Score", v: `${highest}% (${highestSubject.slice(0,6)})`, c: "#8ECAE6", icon: <TrendingUp size={15}/> },
              { l: "Enrolled Subjects", v: String(results.length), c: "#FB8500", icon: <Award size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 18px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

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

          {/* Assessment / Ratings Panel */}
          {!loadingAssessment && assessment && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              {/* Affective Domain */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={14} style={{ color: "#FFB703" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Affective Domain</span>
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
                    <Download size={14} style={{ color: "#8ECAE6" }} />
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

          {loadingAssessment && (
            <Glass style={{ padding: "20px 18px", marginBottom: 18, color: "var(--subtext)", fontSize: 13 }}>
              Loading assessment records...
            </Glass>
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
