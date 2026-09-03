import { useState, useEffect, useRef } from "react";
import { UserCheck, Sparkles, CheckSquare, Heart, ShieldAlert, Award, FileText, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const characterTraits = [
  { id: "punctuality", label: "Punctuality" },
  { id: "neatness", label: "Neatness" },
  { id: "politeness", label: "Politeness" },
  { id: "honesty", label: "Honesty" },
  { id: "team_spirit", label: "Cooperation" },
  { id: "leadership", label: "Leadership" },
  { id: "helping_others", label: "Helpfulness" },
  { id: "emotional_stability", label: "Emotional Stability" },
  { id: "health", label: "Health" },
  { id: "attitude_to_work", label: "Attitude to Work" },
  { id: "attentiveness", label: "Attentiveness" },
  { id: "perseverance", label: "Perseverance" },
  { id: "spoken_english", label: "Spoken English" },
];

const psychomotorSkills = [
  { id: "handwriting", label: "Handwriting" },
  { id: "verbal_fluency", label: "Verbal Fluency" },
  { id: "sports", label: "Sports & Games" },
  { id: "handling_tools", label: "Tools Handling" },
  { id: "drawing_painting", label: "Drawing & Painting" },
  { id: "musical", label: "Music & Performing" },
];

export default function TeacherAssessments() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const autoSaveTimer = useRef<any>(null);

  // Load courses & initial students
  useEffect(() => {
    setLoading(true);
    const query = selectedCourseId ? `?course_id=${selectedCourseId}` : "";
    apiClient.get(`/teacher/assessments${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        if (res.selected_course_id) {
          setSelectedCourseId(res.selected_course_id);
        } else if (res.courses && res.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(res.courses[0].id);
        }
        setStudents(res.students || []);
        if (res.students && res.students.length > 0) {
          setSelectedStudent(res.students[0]);
        } else {
          setSelectedStudent(null);
        }
      })
      .catch(err => console.error("Error loading assessments", err))
      .finally(() => setLoading(false));
  }, [selectedCourseId]);

  // Update specific metric in current student
  const updateMetric = (field: string, val: any) => {
    if (!selectedStudent) return;

    const updated = { ...selectedStudent, [field]: val };
    setSelectedStudent(updated);

    // Update students list cache
    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));

    // Auto-save logic
    setSaveStatus("Saving changes...");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      setSaving(true);
      apiClient.post("/teacher/assessments/save", {
        student_id: selectedStudent.id,
        ...updated
      })
        .then(() => {
          setSaveStatus("All changes saved");
          setTimeout(() => setSaveStatus(""), 2000);
        })
        .catch(err => {
          console.error("Save failed", err);
          setSaveStatus("Error saving changes");
        })
        .finally(() => setSaving(false));
    }, 800);
  };

  const isEntered = (s: any) => {
    // True if any ratings are recorded
    return s.punctuality > 0 || s.handwriting > 0 || s.class_teacher_comment !== "";
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Behavior &amp; Skills Assessment</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Evaluate student behavioral traits and psychomotor capabilities</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {courses.length > 0 && (
            <select 
              value={selectedCourseId || ""} 
              onChange={e => setSelectedCourseId(parseInt(e.target.value))} 
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading assessment roster...</div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
          No enrolled students found.
        </Glass>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
          {/* Left panel: student lists */}
          <Glass style={{ padding: "16px 14px", height: "fit-content" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, borderBottom: "1px solid var(--glass-border)", paddingBottom: 6 }}>Class List</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {students.map(s => {
                const active = selectedStudent && selectedStudent.id === s.id;
                const entered = isEntered(s);
                return (
                  <div 
                    key={s.id}
                    onClick={() => {
                      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
                      setSelectedStudent(s);
                      setSaveStatus("");
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1px solid ${active ? "#219EBC" : "transparent"}`,
                      background: active ? "rgba(33,158,188,0.12)" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#e8f4f8" : "var(--heading)" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 2 }}>{s.student_number}</div>
                    </div>
                    {entered && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "2px 6px", borderRadius: 10 }}>✓ Entry</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Glass>

          {/* Right panel: Assessment sheet */}
          {selectedStudent ? (
            <Glass style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--glass-border)", paddingBottom: 15, marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>{selectedStudent.name}</h2>
                  <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Evaluate learning domains · scale: 5 (Ex) to 1 (Poor)</div>
                </div>
                <div>
                  {saveStatus && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#219EBC", fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> {saveStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Student Report Card Bio & Awards */}
              <div style={{ marginBottom: 24, padding: 14, background: "var(--muted)", borderRadius: 10, border: "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", marginBottom: 12, textTransform: "uppercase" }}>
                  Report Card Profile &amp; Awards
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 4 }}>Sex / Gender</label>
                    <select
                      value={selectedStudent.gender || "MALE"}
                      onChange={e => updateMetric("gender", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--popover)", color: "var(--heading)", fontSize: 12.5, outline: "none" }}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 4 }}>House</label>
                    <input
                      type="text"
                      value={selectedStudent.house || "FAITH"}
                      onChange={e => updateMetric("house", e.target.value)}
                      placeholder="e.g. FAITH, BLUE, WISDOM"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--popover)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 4 }}>Sport Activities</label>
                    <input
                      type="text"
                      value={selectedStudent.sport_activities || "BASKETBALL"}
                      onChange={e => updateMetric("sport_activities", e.target.value)}
                      placeholder="e.g. BASKETBALL, ATHLETICS"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--popover)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 4 }}>Award / Prize 1</label>
                    <input
                      type="text"
                      value={selectedStudent.award_1 ?? "NILL"}
                      onChange={e => updateMetric("award_1", e.target.value)}
                      placeholder="e.g. 1st in Mathematics or NILL"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--popover)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 4 }}>Award / Prize 2</label>
                    <input
                      type="text"
                      value={selectedStudent.award_2 ?? "NILL"}
                      onChange={e => updateMetric("award_2", e.target.value)}
                      placeholder="e.g. Best in Basketball or NILL"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--popover)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>

              {/* Character Development Matrix */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "#219EBC", textTransform: "uppercase", marginBottom: 12 }}>
                  <Heart size={14} /> Affective Traits Assessment
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, color: "var(--subtext)", borderBottom: "2px solid var(--glass-border)" }}>Behavior Trait</th>
                      {[1, 2, 3, 4, 5].map(i => (
                        <th key={i} style={{ width: 60, padding: "8px 10px", fontSize: 10, color: "var(--subtext)", borderBottom: "2px solid var(--glass-border)" }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {characterTraits.map(t => {
                      const score = (selectedStudent as any)[t.id] || 0;
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "10px", fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{t.label}</td>
                          {[1, 2, 3, 4, 5].map(v => (
                            <td key={v} style={{ textAlign: "center", padding: "10px" }}>
                              <input 
                                type="radio" 
                                name={`${selectedStudent.id}-${t.id}`}
                                checked={score === v}
                                onChange={() => updateMetric(t.id, v)}
                                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#219EBC" }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Psychomotor Domain Matrix */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "#FFB703", textTransform: "uppercase", marginBottom: 12 }}>
                  <Award size={14} style={{ color: "#FFB703" }} /> Psychomotor Skills Matrix
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, color: "var(--subtext)", borderBottom: "2px solid var(--glass-border)" }}>Performance Skill</th>
                      {[1, 2, 3, 4, 5].map(i => (
                        <th key={i} style={{ width: 60, padding: "8px 10px", fontSize: 10, color: "var(--subtext)", borderBottom: "2px solid var(--glass-border)" }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {psychomotorSkills.map(s => {
                      const score = (selectedStudent as any)[s.id] || 0;
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "10px", fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{s.label}</td>
                          {[1, 2, 3, 4, 5].map(v => (
                            <td key={v} style={{ textAlign: "center", padding: "10px" }}>
                              <input 
                                type="radio" 
                                name={`${selectedStudent.id}-${s.id}`}
                                checked={score === v}
                                onChange={() => updateMetric(s.id, v)}
                                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#FFB703" }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Descriptive Comments */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "#FB8500", textTransform: "uppercase", marginBottom: 12 }}>
                  <FileText size={14} style={{ color: "#FB8500" }} /> Qualitative Comments
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6 }}>Class Teacher Comment</label>
                    <textarea 
                      value={selectedStudent.class_teacher_comment || ""} 
                      onChange={e => updateMetric("class_teacher_comment", e.target.value)}
                      placeholder="Comment on student conduct, class participation, and areas of improvement..."
                      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6 }}>Principal Remarks</label>
                    <textarea 
                      value={selectedStudent.principal_remark || ""} 
                      onChange={e => updateMetric("principal_remark", e.target.value)}
                      placeholder="Principal's administrative comments and term recommendations..."
                      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" }}
                    />
                  </div>
                </div>
              </div>
            </Glass>
          ) : (
            <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
              Please select a student from the sidebar roster.
            </Glass>
          )}
        </div>
      )}
    </div>
  );
}
