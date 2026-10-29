import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { UserCheck, CheckSquare, Heart, ShieldAlert, Award, FileText, CheckCircle2, Calendar } from "lucide-react";
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

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style
    }}
  >
    {children}
  </div>
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
  const [searchParams] = useSearchParams();
  const { settings } = useApp();

  const [selectedSession, setSelectedSession] = useState(searchParams.get("session") || settings?.academic_session || "2026/2027");
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    searchParams.get("course_id") ? parseInt(searchParams.get("course_id")!) : null
  );
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    searchParams.get("class_id") ? parseInt(searchParams.get("class_id")!) : null
  );
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const autoSaveTimer = useRef<any>(null);

  // Load courses & initial students
  useEffect(() => {
    setLoading(true);
    let query = `?session=${encodeURIComponent(selectedSession)}`;
    if (selectedCourseId) query += `&course_id=${selectedCourseId}`;
    if (selectedClassId) query += `&class_id=${selectedClassId}`;

    apiClient.get(`/teacher/assessments${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        setClasses(res.classes || []);
        if (res.selected_course_id) {
          setSelectedCourseId(parseInt(res.selected_course_id));
        }
        if (res.selected_class_id) {
          setSelectedClassId(parseInt(res.selected_class_id));
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
  }, [selectedCourseId, selectedClassId, selectedSession]);

  // Update specific metric in current student
  const updateMetric = (field: string, val: any) => {
    if (!selectedStudent) return;

    const updated = { ...selectedStudent, [field]: val };
    setSelectedStudent(updated);

    // Update students list cache
    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));

    // Auto-save logic
    setSaveStatus("Saving changes…");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      setSaving(true);
      apiClient.post("/teacher/assessments/save", {
        student_id: selectedStudent.id,
        session: selectedSession,
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
    return s.punctuality > 0 || s.handwriting > 0 || (s.class_teacher_comment && s.class_teacher_comment !== "");
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
            Behavior &amp; Domain Assessments
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>
            Evaluate candidate behavioral traits, psychomotor dexterity, and extracurricular profile
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Academic Session */}
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

          {/* Course select */}
          {courses.length > 0 && (
            <select 
              value={selectedCourseId || ""} 
              onChange={e => setSelectedCourseId(parseInt(e.target.value))} 
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", outline: "none" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Class Arm select */}
          {classes.length > 0 && (
            <select 
              value={selectedClassId || ""} 
              onChange={e => setSelectedClassId(parseInt(e.target.value))} 
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 700, color: DLHS.navy, outline: "none" }}
            >
              {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Loading assessment roster…
        </div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          No enrolled students found in this course stream.
        </Glass>
      ) : (
        <div className="cbt-layout" style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 18, alignItems: "start" }}>
          {/* Left panel: student lists */}
          <Glass style={{ padding: "16px 14px", height: "fit-content" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              Candidate Cohort ({students.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                      borderRadius: 8,
                      cursor: "pointer",
                      border: `1px solid ${active ? DLHS.navy : "transparent"}`,
                      background: active ? "rgba(41, 61, 125, 0.08)" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? DLHS.navy : "var(--foreground)" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.student_number}</div>
                    </div>
                    {entered && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: DLHS.navy, background: "rgba(41, 61, 125, 0.1)", padding: "2px 6px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <CheckCircle2 size={10} /> Entry
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Glass>

          {/* Right panel: Assessment sheet */}
          {selectedStudent ? (
            <Glass style={{ padding: "22px 24px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 style={{ fontFamily: "'Raleway', sans-serif", margin: 0, fontSize: 17, fontWeight: 800, color: "var(--foreground)" }}>
                    {selectedStudent.name}
                  </h2>
                  <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>
                    Standard DLHS Rubric: 5 (Exemplary) down to 1 (Unsatisfactory)
                  </div>
                </div>
                <div>
                  {saveStatus && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: DLHS.navy, fontWeight: 700, background: "rgba(41, 61, 125, 0.08)", padding: "4px 10px", borderRadius: 6 }}>
                      <CheckCircle2 size={13} /> {saveStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Student Report Card Bio & Awards */}
              <div style={{ marginBottom: 22, padding: 16, background: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Report Card Profile &amp; House Details
                </div>
                <div className="responsive-grid-3" style={{ gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Gender</label>
                    <select
                      value={selectedStudent.gender || "MALE"}
                      onChange={e => updateMetric("gender", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12.5, outline: "none" }}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>House Placement</label>
                    <input
                      type="text"
                      value={selectedStudent.house || "FAITH"}
                      onChange={e => updateMetric("house", e.target.value)}
                      placeholder="e.g. FAITH, BLUE, WISDOM"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Sport Activities</label>
                    <input
                      type="text"
                      value={selectedStudent.sport_activities || "BASKETBALL"}
                      onChange={e => updateMetric("sport_activities", e.target.value)}
                      placeholder="e.g. BASKETBALL, ATHLETICS"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div className="responsive-grid-2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Award / Prize 1</label>
                    <input
                      type="text"
                      value={selectedStudent.award_1 ?? "NILL"}
                      onChange={e => updateMetric("award_1", e.target.value)}
                      placeholder="e.g. 1st in Mathematics or NILL"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>Award / Prize 2</label>
                    <input
                      type="text"
                      value={selectedStudent.award_2 ?? "NILL"}
                      onChange={e => updateMetric("award_2", e.target.value)}
                      placeholder="e.g. Best in Debate or NILL"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>

              {/* Character Development Matrix */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: DLHS.navy, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                  <Heart size={15} /> Affective Character Traits
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Behavior Trait</th>
                      {[1, 2, 3, 4, 5].map(i => (
                        <th key={i} style={{ width: 50, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", textAlign: "center" }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {characterTraits.map(t => {
                      const score = (selectedStudent as any)[t.id] || 0;
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{t.label}</td>
                          {[1, 2, 3, 4, 5].map(v => (
                            <td key={v} style={{ textAlign: "center", padding: "8px" }}>
                              <input 
                                type="radio" 
                                name={`${selectedStudent.id}-${t.id}`}
                                checked={score === v}
                                onChange={() => updateMetric(t.id, v)}
                                style={{ width: 16, height: 16, cursor: "pointer", accentColor: DLHS.navy }}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: DLHS.blue, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                  <Award size={15} /> Psychomotor Dexterity Matrix
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Performance Capability</th>
                      {[1, 2, 3, 4, 5].map(i => (
                        <th key={i} style={{ width: 50, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", textAlign: "center" }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {psychomotorSkills.map(s => {
                      const score = (selectedStudent as any)[s.id] || 0;
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{s.label}</td>
                          {[1, 2, 3, 4, 5].map(v => (
                            <td key={v} style={{ textAlign: "center", padding: "8px" }}>
                              <input 
                                type="radio" 
                                name={`${selectedStudent.id}-${s.id}`}
                                checked={score === v}
                                onChange={() => updateMetric(s.id, v)}
                                style={{ width: 16, height: 16, cursor: "pointer", accentColor: DLHS.blue }}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: DLHS.crimson, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                  <FileText size={15} /> Institutional Remarks
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Class Teacher Appraisal</label>
                    <textarea 
                      value={selectedStudent.class_teacher_comment || ""} 
                      onChange={e => updateMetric("class_teacher_comment", e.target.value)}
                      placeholder="Comment on candidate conduct, academic participation, and areas of growth..."
                      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "'Lato', sans-serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Principal's Recommendation</label>
                    <textarea 
                      value={selectedStudent.principal_remark || ""} 
                      onChange={e => updateMetric("principal_remark", e.target.value)}
                      placeholder="Principal's administrative comments and term recommendations..."
                      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "'Lato', sans-serif" }}
                    />
                  </div>
                </div>
              </div>
            </Glass>
          ) : (
            <Glass style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
              Please select a student from the cohort roster.
            </Glass>
          )}
        </div>
      )}
    </div>
  );
}
