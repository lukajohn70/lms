import { useState, useEffect } from "react";
import { Save, CheckCircle, TrendingUp, Sparkles, BookOpen, Send, Lock, AlertCircle } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const getMidRemark = (total: number) => {
  if (total >= 18) return { text: "EXCELLENT", color: "#219EBC", bg: "rgba(33,158,188,0.12)" };
  if (total >= 14) return { text: "VERY GOOD", color: "#8ECAE6", bg: "rgba(142,202,230,0.18)" };
  if (total >= 12) return { text: "GOOD", color: "#FFB703", bg: "rgba(255,183,3,0.12)" };
  if (total >= 10) return { text: "FAIR", color: "#FB8500", bg: "rgba(251,133,0,0.12)" };
  return { text: "POOR", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
};

const getLetterGrade = (total: number) => {
  if (total >= 80) return { grade: "A1", text: "DISTINCTION", color: "#219EBC" };
  if (total >= 70) return { grade: "B3", text: "VERY GOOD", color: "#8ECAE6" };
  if (total >= 60) return { grade: "C5", text: "CREDIT", color: "#FFB703" };
  if (total >= 50) return { grade: "D7", text: "PASS", color: "#FB8500" };
  if (total >= 45) return { grade: "E8", text: "PASS", color: "#FB8500" };
  return { grade: "F9", text: "FAIL", color: "#ef4444" };
};

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Grades() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("2nd Term");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"mid_term" | "end_of_term">("end_of_term");
  const [courseStatus, setCourseStatus] = useState<"draft" | "submitted" | "approved" | "published">("draft");

  const loadGrades = () => {
    setLoading(true);
    const query = `?term=${encodeURIComponent(selectedTerm)}${selectedCourseId ? `&course_id=${selectedCourseId}` : ""}`;
    apiClient.get(`/teacher/grades${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        if (res.selected_course_id) {
          setSelectedCourseId(res.selected_course_id);
        } else if (res.courses && res.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(res.courses[0].id);
        }
        if (res.result_mode) {
          setActiveTab(res.result_mode);
        }
        if (res.course_status) {
          setCourseStatus(res.course_status);
        }
        setStudents(res.students || []);
      })
      .catch(err => console.error("Error loading grades", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGrades();
  }, [selectedCourseId, selectedTerm]);

  const updateField = (studentId: number, field: string, val: string) => {
    if (courseStatus === "published") return;
    const cleanVal = val.replace(/[^0-9.]/g, "");
    
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      
      const updated = { ...s, [field]: cleanVal };
      
      const asgn = parseFloat(updated.assignment_score) || 0;
      const proj = parseFloat(updated.project_score) || 0;
      const test = parseFloat(updated.mid_term_test) || 0;
      const midTotal = asgn + proj + test;
      
      updated.ca1 = String(midTotal);
      
      const ca2 = parseFloat(updated.ca2) || 0;
      const exam = parseFloat(updated.exam) || 0;
      
      if (activeTab === "mid_term") {
        updated.score = midTotal;
      } else {
        updated.score = midTotal + ca2 + exam;
      }
      
      return updated;
    }));
  };

  const validateScores = () => {
    let hasError = false;
    students.forEach(s => {
      const asgn = parseFloat(s.assignment_score) || 0;
      const proj = parseFloat(s.project_score) || 0;
      const test = parseFloat(s.mid_term_test) || 0;
      const ca2 = parseFloat(s.ca2) || 0;
      const exam = parseFloat(s.exam) || 0;

      if (asgn > 5 || proj > 5 || test > 10 || ca2 > 20 || exam > 60) {
        hasError = true;
      }
    });
    return !hasError;
  };

  const handleSave = (targetStatus: "draft" | "submitted" = "draft") => {
    if (!selectedCourseId) return;

    if (!validateScores()) {
      alert("Invalid Score Limits: Please verify that scores are within maximum bounds!");
      return;
    }

    apiClient.post("/teacher/grades/save", {
      course_id: selectedCourseId,
      term: selectedTerm,
      status: targetStatus,
      grades: students.map(s => ({
        student_id: s.id,
        assignment_score: s.assignment_score,
        project_score: s.project_score,
        mid_term_test: s.mid_term_test,
        ca2: s.ca2,
        exam: s.exam,
        remarks: s.remarks || ""
      }))
    })
      .then(() => {
        setCourseStatus(targetStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((err: any) => alert(err.message || "Error saving grades"));
  };

  const handleSubmitForApproval = () => {
    if (!selectedCourseId) return;

    if (!validateScores()) {
      alert("Please check score bounds before submitting.");
      return;
    }

    if (!confirm("Are you ready to submit these grades to Administration for approval?")) return;

    // First save then submit
    apiClient.post("/teacher/grades/save", {
      course_id: selectedCourseId,
      term: selectedTerm,
      status: "submitted",
      grades: students.map(s => ({
        student_id: s.id,
        assignment_score: s.assignment_score,
        project_score: s.project_score,
        mid_term_test: s.mid_term_test,
        ca2: s.ca2,
        exam: s.exam,
        remarks: s.remarks || ""
      }))
    })
      .then(() => {
        return apiClient.post("/teacher/grades/submit", {
          course_id: selectedCourseId,
          term: selectedTerm
        });
      })
      .then(() => {
        setCourseStatus("submitted");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      })
      .catch((err: any) => alert(err.message || "Failed to submit grades"));
  };

  const avg = students.length > 0 
    ? Math.round(students.reduce((acc, s) => acc + s.score, 0) / students.length)
    : 0;

  const isLocked = courseStatus === "published";

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Grade Submissions</h1>
            {/* Status Badge */}
            {courseStatus === "published" && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "rgba(42,157,143,0.15)", border: "1px solid rgba(42,157,143,0.3)", color: "#2a9d8f", fontSize: 11, fontWeight: 700 }}>
                <Lock size={12}/> Published &amp; Locked
              </span>
            )}
            {courseStatus === "submitted" && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "rgba(255,183,3,0.15)", border: "1px solid rgba(255,183,3,0.3)", color: "#FFB703", fontSize: 11, fontWeight: 700 }}>
                ⏳ Pending Admin Approval
              </span>
            )}
            {courseStatus === "draft" && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "rgba(33,158,188,0.1)", border: "1px solid var(--glass-border)", color: "var(--subtext)", fontSize: 11, fontWeight: 700 }}>
                📝 Draft Mode
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Record and evaluate student term sheets with multi-tier approval workflow</p>
        </div>
        
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Term Selector */}
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
            {["1st Term", "2nd Term", "3rd Term"].map(t => (
              <button
                key={t}
                onClick={() => setSelectedTerm(t)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: selectedTerm === t ? "#219EBC" : "transparent",
                  color: selectedTerm === t ? "#fff" : "var(--subtext)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {courses.length > 0 && (
            <select 
              value={selectedCourseId || ""} 
              onChange={e => setSelectedCourseId(parseInt(e.target.value))} 
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {!isLocked && (
            <>
              <button onClick={() => handleSave("draft")} disabled={loading || students.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: saved ? "rgba(33,158,188,0.15)" : "var(--muted)", border: "1px solid var(--glass-border)", cursor: (loading || students.length === 0) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, color: saved ? "#219EBC" : "var(--heading)" }}>
                {saved ? <><CheckCircle size={13}/> Saved</> : <><Save size={13}/> Save Draft</>}
              </button>

              <button onClick={handleSubmitForApproval} disabled={loading || students.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, background: submitted ? "rgba(42,157,143,0.15)" : "linear-gradient(135deg,#219EBC,#023047)", border: submitted ? "1px solid #2a9d8f" : "none", cursor: (loading || students.length === 0) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, color: submitted ? "#2a9d8f" : "#fff", boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}>
                {submitted ? <><CheckCircle size={13}/> Submitted!</> : <><Send size={13}/> Submit for Approval</>}
              </button>
            </>
          )}

          {isLocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--subtext)", background: "var(--muted)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--glass-border)" }}>
              <Lock size={13} style={{ color: "#2a9d8f" }} />
              <span>Results Locked by Admin</span>
            </div>
          )}
        </div>
      </div>

      {isLocked && (
        <div style={{ marginBottom: 16, background: "rgba(42,157,143,0.08)", border: "1px solid rgba(42,157,143,0.25)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--heading)" }}>
          <AlertCircle size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
          <span>This mark sheet has been <strong>approved and published</strong> to students and parents. Direct editing is disabled. If corrections are required, please request the Academic Administrator to re-open this subject register.</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading grades register...</div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
          No enrolled students found for this subject and term.
        </Glass>
      ) : (
        <>
          {/* Tab Toggles */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => {
                setActiveTab("mid_term");
                setStudents(prev => prev.map(s => ({
                  ...s,
                  score: (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0)
                })));
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${activeTab === "mid_term" ? "#219EBC" : "var(--glass-border)"}`, background: activeTab === "mid_term" ? "rgba(33,158,188,0.15)" : "var(--muted)", color: activeTab === "mid_term" ? "#219EBC" : "var(--subtext)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s" }}
            >
              <BookOpen size={13} /> Mid-Term Scores (/20)
            </button>
            <button
              onClick={() => {
                setActiveTab("end_of_term");
                setStudents(prev => prev.map(s => ({
                  ...s,
                  score: (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0) + (parseFloat(s.ca2) || 0) + (parseFloat(s.exam) || 0)
                })));
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${activeTab === "end_of_term" ? "#219EBC" : "var(--glass-border)"}`, background: activeTab === "end_of_term" ? "rgba(33,158,188,0.15)" : "var(--muted)", color: activeTab === "end_of_term" ? "#219EBC" : "var(--subtext)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s" }}
            >
              <Sparkles size={13} /> Full Term Scores (/100)
            </button>
          </div>

          {/* Stats */}
          <div className="responsive-grid-4">
            {[
              { l: "Class Average", v: `${avg}${activeTab === "mid_term" ? "/20" : "%"}`, c: "#219EBC" },
              { l: activeTab === "mid_term" ? "Excellent (18+)" : "A Grades", v: String(students.filter(s => activeTab === "mid_term" ? s.score >= 18 : s.score >= 70).length), c: "#8ECAE6" },
              { l: "Needs Attention", v: String(students.filter(s => activeTab === "mid_term" ? s.score < 10 : s.score < 50).length), c: "#FFB703" },
              { l: "Students Enrolled", v: String(students.length), c: "#FB8500" },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "14px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          <Glass>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={14} style={{ color: "#219EBC" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>
                  {courses.find(c => c.id === selectedCourseId)?.name || "Course"} · Mark Sheet ({selectedTerm} · {activeTab === "mid_term" ? "Mid-Term" : "Full Term"})
                </span>
              </div>
              <span style={{ fontSize: 11, color: "var(--subtext)" }}>Session: 2026/2027</span>
            </div>

            <div className="table-responsive-wrapper">
              <div style={{ minWidth: 760 }}>
                {/* Headers based on Active Tab */}
                {activeTab === "mid_term" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 100px 100px 100px 80px 1fr 110px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                {["Student", "Asgn (/5)", "Proj (/5)", "Test (/10)", "Total", "Performance", "Remark"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 100px 100px 100px 80px 1fr 110px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                {["Student", "CA 1 (/20)", "CA 2 (/20)", "Exam (/60)", "Total", "Performance", "Grade"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
            )}

            {/* Students rows */}
            {students.map((s) => {
              const midTotal = (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0);

              if (activeTab === "mid_term") {
                const rmk = getMidRemark(s.score);
                const asgnErr = (parseFloat(s.assignment_score) || 0) > 5;
                const projErr = (parseFloat(s.project_score) || 0) > 5;
                const testErr = (parseFloat(s.mid_term_test) || 0) > 10;

                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 100px 100px 100px 80px 1fr 110px", padding: "10px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{s.student_number}</div>
                    </div>
                    {/* Assignment */}
                    <input type="text" value={s.assignment_score} onChange={e => updateField(s.id, "assignment_score", e.target.value)} disabled={isLocked}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 7, border: `1px solid ${asgnErr ? "#ef4444" : "var(--glass-border)"}`, background: isLocked ? "transparent" : (asgnErr ? "rgba(239,68,68,0.05)" : "var(--muted)"), fontSize: 13, color: "var(--heading)", outline: "none", textAlign: "center", cursor: isLocked ? "not-allowed" : "text" }} />
                    {/* Project */}
                    <input type="text" value={s.project_score} onChange={e => updateField(s.id, "project_score", e.target.value)} disabled={isLocked}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 7, border: `1px solid ${projErr ? "#ef4444" : "var(--glass-border)"}`, background: isLocked ? "transparent" : (projErr ? "rgba(239,68,68,0.05)" : "var(--muted)"), fontSize: 13, color: "var(--heading)", outline: "none", textAlign: "center", cursor: isLocked ? "not-allowed" : "text" }} />
                    {/* Test */}
                    <input type="text" value={s.mid_term_test} onChange={e => updateField(s.id, "mid_term_test", e.target.value)} disabled={isLocked}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 7, border: `1px solid ${testErr ? "#ef4444" : "var(--glass-border)"}`, background: isLocked ? "transparent" : (testErr ? "rgba(239,68,68,0.05)" : "var(--muted)"), fontSize: 13, color: "var(--heading)", outline: "none", textAlign: "center", cursor: isLocked ? "not-allowed" : "text" }} />
                    
                    <span style={{ fontSize: 14, fontWeight: 800, color: rmk.color }}>{s.score.toFixed(1)}</span>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((s.score / 20) * 100, 100)}%`, background: rmk.color, borderRadius: 3 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: rmk.bg, color: rmk.color, display: "inline-block", textAlign: "center" }}>{rmk.text}</span>
                    </div>
                  </div>
                );
              } else {
                // End of Term View
                const gl = getLetterGrade(s.score);
                const ca2Err = (parseFloat(s.ca2) || 0) > 20;
                const examErr = (parseFloat(s.exam) || 0) > 60;

                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 100px 100px 100px 80px 1fr 110px", padding: "10px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{s.student_number}</div>
                    </div>
                    {/* CA1 (Mid-Term total, Read-Only) */}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--subtext)", width: 60, textAlign: "center", display: "inline-block" }}>{midTotal.toFixed(1)}</span>
                    
                    {/* CA2 */}
                    <input type="text" value={s.ca2} onChange={e => updateField(s.id, "ca2", e.target.value)} disabled={isLocked}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 7, border: `1px solid ${ca2Err ? "#ef4444" : "var(--glass-border)"}`, background: isLocked ? "transparent" : (ca2Err ? "rgba(239,68,68,0.05)" : "var(--muted)"), fontSize: 13, color: "var(--heading)", outline: "none", textAlign: "center", cursor: isLocked ? "not-allowed" : "text" }} />
                    
                    {/* Exam */}
                    <input type="text" value={s.exam} onChange={e => updateField(s.id, "exam", e.target.value)} disabled={isLocked}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 7, border: `1px solid ${examErr ? "#ef4444" : "var(--glass-border)"}`, background: isLocked ? "transparent" : (examErr ? "rgba(239,68,68,0.05)" : "var(--muted)"), fontSize: 13, color: "var(--heading)", outline: "none", textAlign: "center", cursor: isLocked ? "not-allowed" : "text" }} />
                    
                    <span style={{ fontSize: 14, fontWeight: 800, color: gl.color }}>{s.score.toFixed(1)}</span>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(s.score, 100)}%`, background: gl.color, borderRadius: 3 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${gl.color}15`, color: gl.color, display: "inline-block", textAlign: "center" }}>
                        {gl.grade} · {gl.text}
                      </span>
                    </div>
                  </div>
                );
              }
            })}
                </div>
              </div>
            </Glass>
        </>
      )}
    </div>
  );
}
