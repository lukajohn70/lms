import { useState, useEffect, useMemo } from "react";
import { Award, BookOpen, Search, CheckCircle, UserCheck, AlertCircle, Shield, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

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

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div
    className={className}
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

export default function HodAllocations() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<string | null>(null);
  const [isHod, setIsHod] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get("/hod/allocations");
      setDepartment(res.department || user?.hod_department || null);
      setIsHod(Boolean(res.is_hod || user?.is_hod));
      setCourses(res.courses || []);
      setClasses(res.classes || []);
      setTeachers(res.teachers || []);
      setAllocations(res.allocations || []);
      if (res.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(res.courses[0].id);
      }
    } catch (e: any) {
      console.error("Failed to load HOD allocations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleAssignTeacher = async (courseId: number, classId: number, teacherId: string) => {
    const key = `${courseId}-${classId}`;
    setSavingKey(key);
    try {
      await apiClient.post("/hod/assign-teacher", {
        course_id: courseId,
        class_id: classId,
        teacher_id: teacherId ? parseInt(teacherId) : null
      });

      // Update local allocation state
      setAllocations(prev => {
        const filtered = prev.filter(a => !(a.course_id === courseId && a.class_id === classId));
        if (teacherId) {
          const t = teachers.find(teach => String(teach.id) === String(teacherId));
          return [...filtered, {
            course_id: courseId,
            class_id: classId,
            teacher_id: parseInt(teacherId),
            first_name: t?.first_name || "",
            last_name: t?.last_name || "",
            email: t?.email || ""
          }];
        }
        return filtered;
      });

      setStatusMessage("Faculty subject allocation committed successfully!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to assign teacher.");
    } finally {
      setSavingKey(null);
    }
  };

  // Filtered courses based on search
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return courses;
    return courses.filter(c => 
      (c.name || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  // Total statistics
  const totalAllocated = useMemo(() => {
    return allocations.filter(a => a.teacher_id).length;
  }, [allocations]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
        Loading HOD departmental allocations…
      </div>
    );
  }

  if (!isHod) {
    return (
      <Glass style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "40px auto" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Shield size={28} style={{ color: DLHS.navy }} />
        </div>
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 10px" }}>
          Head of Department Access Restricted
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Your user profile is designated as faculty, but does not currently hold an active Head of Department (HOD) appointment. 
          Only designated departmental heads can assign subject instructors across class streams.
        </p>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "10px 16px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", display: "inline-block" }}>
          Please liaise with the School Administrator or Academic Director if you require HOD departmental privileges.
        </div>
      </Glass>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 6, background: "rgba(220, 19, 123, 0.12)", color: DLHS.crimson, border: `1px solid ${DLHS.crimson}30` }}>
              HOD Departmental Command
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>
              Department of {department || "General Studies"}
            </span>
          </div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
            Faculty Subject Allocations
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
            Assign subject specialists to respective class streams for all curricula in your academic department
          </p>
        </div>

        <button
          onClick={fetchAllocations}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
            background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)",
            fontSize: 12.5, fontWeight: 700, cursor: "pointer"
          }}
        >
          <RefreshCw size={13} /> Refresh Roster
        </button>
      </div>

      {/* Stats Cards */}
      <div className="responsive-grid-3" style={{ marginBottom: 20, gap: 14 }}>
        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(220, 19, 123, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.crimson }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.crimson }}>{courses.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Departmental Subjects</div>
          </div>
        </Glass>

        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.navy }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.navy }}>{classes.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Academic Class Streams</div>
          </div>
        </Glass>

        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0, 147, 221, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.blue }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.blue }}>{totalAllocated}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Assigned Stream Allocations</div>
          </div>
        </Glass>
      </div>

      {statusMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}40`, marginBottom: 16 }}>
          <CheckCircle size={16} style={{ color: DLHS.navy }} />
          <span style={{ fontSize: 13, color: DLHS.navy, fontWeight: 600 }}>{statusMessage}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 18 }} className="desktop-layout-split">
        {/* Left Column: Department Subjects List */}
        <Glass style={{ padding: 18, height: "fit-content" }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Search subjects…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
                background: "var(--muted)", border: "1px solid var(--border)",
                color: "var(--foreground)", fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "'Lato', sans-serif"
              }}
            />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>
            Department Subjects ({filteredCourses.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 480, overflowY: "auto" }}>
            {filteredCourses.map(c => {
              const isSelected = selectedCourseId === c.id;
              const courseAllocCount = allocations.filter(a => a.course_id === c.id && a.teacher_id).length;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    background: isSelected ? "rgba(41, 61, 125, 0.08)" : "var(--muted)",
                    border: `1.5px solid ${isSelected ? DLHS.navy : "var(--border)"}`,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? DLHS.navy : "var(--foreground)" }}>
                      {c.name}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: courseAllocCount > 0 ? "rgba(41, 61, 125, 0.1)" : "rgba(220, 19, 123, 0.1)",
                      color: courseAllocCount > 0 ? DLHS.navy : DLHS.crimson
                    }}>
                      {courseAllocCount} / {classes.length}
                    </span>
                  </div>
                  {c.description && (
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.description}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCourses.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                No subjects found in this department.
              </div>
            )}
          </div>
        </Glass>

        {/* Right Column: Class Arms Allocations for Active Subject */}
        {activeCourse ? (
          <Glass style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                    {activeCourse.name}
                  </h2>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(220, 19, 123, 0.12)", color: DLHS.crimson }}>
                    {activeCourse.department || department}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                  Designate accredited teachers for {activeCourse.name} across all academic class streams
                </p>
              </div>
            </div>

            {/* Class list with teacher select */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {classes.map(cls => {
                const currentAlloc = allocations.find(a => a.course_id === activeCourse.id && a.class_id === cls.id);
                const assignedTeacherId = currentAlloc?.teacher_id ? String(currentAlloc.teacher_id) : "";
                const isSaving = savingKey === `${activeCourse.id}-${cls.id}`;

                return (
                  <div
                    key={cls.id}
                    style={{
                      padding: "14px 18px", borderRadius: 8, background: "var(--muted)",
                      border: "1px solid var(--border)", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 16, flexWrap: "wrap"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)" }}>
                        {cls.name} {cls.department ? `(${cls.department})` : ''}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {assignedTeacherId ? (
                          <span style={{ color: DLHS.navy, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle2 size={13} /> Instructor: {currentAlloc.first_name} {currentAlloc.last_name}
                          </span>
                        ) : (
                          <span style={{ color: DLHS.crimson, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={13} /> Unallocated Stream
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 260 }}>
                      <select
                        value={assignedTeacherId}
                        disabled={isSaving}
                        onChange={e => handleAssignTeacher(activeCourse.id, cls.id, e.target.value)}
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: 6, fontSize: 12.5,
                          background: "var(--card)", border: "1px solid var(--border)",
                          color: assignedTeacherId ? "var(--foreground)" : "var(--muted-foreground)",
                          outline: "none", cursor: isSaving ? "wait" : "pointer", fontFamily: "'Lato', sans-serif"
                        }}
                      >
                        <option value="">-- Assign Instructor --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.first_name} {t.last_name} ({t.email})
                          </option>
                        ))}
                      </select>

                      {isSaving && (
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                          Saving…
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Glass>
        ) : (
          <Glass style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
            Select a departmental subject to view and configure faculty allocations.
          </Glass>
        )}
      </div>
    </div>
  );
}
