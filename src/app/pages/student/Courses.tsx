import { useState, useEffect } from "react";
import { BookOpen, Users, Clock, Star, Check, X, ShieldAlert, Settings, Plus, Trash2 } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Enrollment Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<any | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [selectedElectives, setSelectedElectives] = useState<number[]>([]);
  const [savingRegistration, setSavingRegistration] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchAvailableCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/student/courses");
      setCourses(data || []);
    } catch (err) {
      console.error("Error loading courses", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const data = await apiClient.get("/student/available-courses");
      setAvailableCourses(data);
      if (data.error) {
        setWizardError(data.error);
      } else {
        // Initialize checked electives based on current enrollment status
        const initialElectives: number[] = [];
        if (data.electives) {
          Object.values(data.electives).forEach((group: any) => {
            group.forEach((c: any) => {
              if (c.enrolled) {
                initialElectives.push(c.course_id);
              }
            });
          });
        }
        setSelectedElectives(initialElectives);
        setWizardError(null);
      }
    } catch (err: any) {
      setWizardError(err.message || "Failed to load class courses mapping.");
    }
  };

  const checkIsElective = (courseId: number) => {
    if (!availableCourses || !availableCourses.electives) return false;
    return Object.values(availableCourses.electives).some((group: any) =>
      group.some((c: any) => c.course_id === courseId)
    );
  };

  const handleToggleElective = (courseId: number) => {
    if (selectedElectives.includes(courseId)) {
      setSelectedElectives(selectedElectives.filter(id => id !== courseId));
    } else {
      setSelectedElectives([...selectedElectives, courseId]);
    }
  };

  const handleSaveRegistration = async () => {
    setSavingRegistration(true);
    try {
      // 1. Core courses are enrolled automatically if not already
      const coreIds = availableCourses.core.map((c: any) => c.course_id);
      
      // Calculate what needs to be enrolled
      const initialEnrolledIds: number[] = [];
      availableCourses.core.forEach((c: any) => { if (c.enrolled) initialEnrolledIds.push(c.course_id); });
      if (availableCourses.electives) {
        Object.values(availableCourses.electives).forEach((group: any) => {
          group.forEach((c: any) => { if (c.enrolled) initialEnrolledIds.push(c.course_id); });
        });
      }

      // Check current selections
      const currentSelectedIds = [...coreIds, ...selectedElectives];

      // To Enroll: items in currentSelectedIds that were not initially enrolled
      const toEnroll = currentSelectedIds.filter(id => !initialEnrolledIds.includes(id));
      
      // To Drop: items in initialEnrolledIds that are electives and not in selectedElectives
      const toDrop = initialEnrolledIds.filter(id => checkIsElective(id) && !selectedElectives.includes(id));

      // Execute Enrolls
      if (toEnroll.length > 0) {
        await apiClient.post("/student/enroll", { course_ids: toEnroll });
      }

      // Execute Drops
      for (const dropId of toDrop) {
        await apiClient.post("/student/deregister", { course_id: dropId });
      }

      alert("Course registration updated successfully!");
      setShowWizard(false);
      setSelected(null);
      await fetchCourses();
      await fetchAvailableCourses();
    } catch (e: any) {
      alert("Registration failed: " + (e.message || "Unknown error"));
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleDropSingleCourse = async (courseId: number) => {
    if (!confirm("Are you sure you want to deregister/drop this elective course? Your grades for this term will be dropped, though historical term cards remain safe.")) return;
    try {
      await apiClient.post("/student/deregister", { course_id: courseId });
      alert("Course dropped successfully.");
      setSelected(null);
      await fetchCourses();
      await fetchAvailableCourses();
    } catch (e: any) {
      alert(e.message || "Failed to drop course.");
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading enrolled courses...</div>;
  }

  const isSelectedElective = selected && checkIsElective(selected.id);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#219EBC", marginBottom: 16, background: "none", border: "none", cursor: "pointer" }}>
          ← Back to Courses
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
          <Glass>
            <div style={{ height: 6, background: `linear-gradient(90deg, ${selected.color}, rgba(142,202,230,0.5))`, borderRadius: "14px 14px 0 0" }} />
            <div style={{ padding: "24px" }}>
              <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>{selected.subject}</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 6px" }}>{selected.name}</h2>
              <div style={{ fontSize: 12.5, color: "var(--subtext)", marginBottom: 20 }}>Instructor: {selected.teacher}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                {[["Progress", `${selected.progress}%`, selected.color], ["Current Score", `${selected.score}%`, "#219EBC"], ["Enrolled Classmates", String(selected.students), "#8ECAE6"]].map(([l,v,c]) => (
                  <div key={l} style={{ padding: 14, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
                    <div style={{ fontSize: 10.5, color: "var(--subtext)", marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)" }}>Course Topics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.topics && selected.topics.map((t: string, i: number) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${selected.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: selected.color }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: "var(--heading)" }}>{t}</span>
                    {i < Math.floor(selected.progress / 25) && <span style={{ marginLeft: "auto", fontSize: 10, color: "#219EBC", background: "rgba(33,158,188,0.1)", padding: "2px 7px", borderRadius: 5 }}>Completed</span>}
                  </div>
                ))}
              </div>
            </div>
          </Glass>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Glass style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--heading)", marginBottom: 10 }}>Overall Progress</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--subtext)" }}>Completion</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: selected.color }}>{selected.progress}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${selected.progress}%`, background: `linear-gradient(90deg, ${selected.color}88, ${selected.color})`, borderRadius: 4 }} />
                </div>
              </div>
            </Glass>

            {isSelectedElective && (
              <Glass style={{ padding: 18, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--heading)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={14} style={{ color: "#ef4444" }} /> Drop Course Options
                </div>
                <p style={{ fontSize: 11.5, color: "var(--subtext)", margin: "0 0 14px", lineHeight: 1.45 }}>
                  This is an elective course. You can drop it from your registrations for this term. Core subjects cannot be dropped.
                </p>
                <button
                  onClick={() => handleDropSingleCourse(selected.id)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Trash2 size={13} /> Drop Elective Subject
                </button>
              </Glass>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>My Courses</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{courses.length} courses enrolled · Active Session</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Settings size={14} /> Course Registration
        </button>
      </div>

      {courses.length === 0 ? (
        <Glass style={{ padding: "60px 40px", textAlign: "center" }}>
          <BookOpen size={44} style={{ color: "var(--subtext)", opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--heading)", margin: "0 0 8px" }}>No Registered Courses</h3>
          <p style={{ fontSize: 13, color: "var(--subtext)", maxWidth: 380, margin: "0 auto 20px", lineHeight: 1.55 }}>
            You are not currently registered for any courses for this term. Please open the registration wizard to enroll.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}
          >
            Start Course Enrollment
          </button>
        </Glass>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {courses.map((c) => (
            <Glass key={c.id} style={{ cursor: "pointer", overflow: "hidden" }} onClick={() => setSelected(c)}>
              <div style={{ height: 5, background: `linear-gradient(90deg, ${c.color}, rgba(142,202,230,0.4))` }} />
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 10.5, color: "var(--subtext)", marginBottom: 3 }}>{c.subject}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)", marginBottom: 10, lineHeight: 1.4 }}>{c.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${c.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: c.color }}>
                    {c.teacher.split(" ").map((w: string) => w[0]).slice(0,2).join("")}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--subtext)" }}>{c.teacher}</span>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10.5, color: "var(--subtext)" }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.progress}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.progress}%`, background: `linear-gradient(90deg, ${c.color}99, ${c.color})`, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={11} style={{ color: "var(--subtext)" }} /><span style={{ fontSize: 10, color: "var(--subtext)" }}>{c.students}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} style={{ color: "var(--subtext)" }} /><span style={{ fontSize: 10, color: "var(--subtext)" }}>{c.duration}</span></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Star size={11} style={{ color: "#FFB703", fill: "#FFB703" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#FFB703" }}>{c.score}%</span>
                  </div>
                </div>
              </div>
            </Glass>
          ))}
        </div>
      )}

      {/* Course Registration Wizard Modal */}
      {showWizard && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 680, maxWidth: "95vw", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Course Registration Desk</h3>
                <span style={{ fontSize: 11.5, color: "var(--subtext)" }}>Select core and elective subjects for the current term.</span>
              </div>
              <button onClick={() => setShowWizard(false)} style={{ background: "none", border: "none", color: "var(--subtext)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {wizardError ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <ShieldAlert size={48} style={{ color: "#FB8500", opacity: 0.8, marginBottom: 16, display: "inline" }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--heading)", margin: "0 0 8px" }}>Registration Locked</h4>
                  <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>{wizardError}</p>
                </div>
              ) : !availableCourses ? (
                <div style={{ fontSize: 13, color: "var(--subtext)", textAlign: "center", padding: 20 }}>Loading class setup information...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  
                  {/* Core Subjects Section */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Core Subjects (Mandatory)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {availableCourses.core && availableCourses.core.map((c: any) => (
                        <div key={c.course_id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(33,158,188,0.05)", border: "1px solid rgba(33,158,188,0.2)", display: "flex", alignItems: "center", justify: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{c.name}</span>
                          <span style={{ fontSize: 10.5, color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "2px 7px", borderRadius: 5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <Check size={11} /> Required
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Elective Subjects Section */}
                  {availableCourses.electives && Object.keys(availableCourses.electives).length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Elective Subjects</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {Object.entries(availableCourses.electives).map(([groupName, list]: [string, any]) => (
                          <div key={groupName} style={{ padding: 14, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#FB8500", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>{groupName}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              {list.map((c: any) => {
                                const isChecked = selectedElectives.includes(c.course_id);
                                return (
                                  <div
                                    key={c.course_id}
                                    onClick={() => handleToggleElective(c.course_id)}
                                    style={{
                                      padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--glass-border)", transition: "all 0.15s",
                                      background: isChecked ? "rgba(251,133,0,0.05)" : "var(--background)",
                                      borderColor: isChecked ? "rgba(251,133,0,0.4)" : "var(--glass-border)"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // toggled by parent div
                                        style={{ cursor: "pointer" }}
                                      />
                                      <span style={{ fontSize: 12.5, fontWeight: isChecked ? 700 : 400, color: "var(--heading)" }}>{c.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {!wizardError && availableCourses && (
              <div style={{ padding: 16, borderTop: "1px solid var(--glass-border)", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowWizard(false)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer", fontSize: 12.5 }}>Cancel</button>
                <button type="button" onClick={handleSaveRegistration} disabled={savingRegistration} style={{ padding: "8px 24px", borderRadius: 8, background: "#219EBC", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12.5 }}>
                  {savingRegistration ? "Saving..." : "Save Registrations"}
                </button>
              </div>
            )}
          </Glass>
        </div>
      )}
    </div>
  );
}
