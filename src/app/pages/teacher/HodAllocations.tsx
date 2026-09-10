import { useState, useEffect, useMemo } from "react";
import { Award, BookOpen, Search, CheckCircle, UserCheck, AlertCircle, Shield, Users, RefreshCw } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
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
      const res: any = await apiClient.post("/hod/assign-teacher", {
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

      setStatusMessage("Teacher allocation updated successfully!");
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
      <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
        Loading HOD Portal data...
      </div>
    );
  }

  if (!isHod) {
    return (
      <Glass style={{ padding: 36, textAlign: "center", maxWidth: 600, margin: "40px auto" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(251,133,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Shield size={28} style={{ color: "#FB8500" }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 10px" }}>
          HOD Portal Access Restricted
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--subtext)", lineHeight: 1.6, margin: "0 0 20px" }}>
          You are currently logged in as a teacher, but you have not been appointed as a Head of Department (HOD). 
          Only appointed HODs can assign subject teachers to class arms for their department.
        </p>
        <div style={{ fontSize: 12, color: "var(--subtext)", padding: "10px 16px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", display: "inline-block" }}>
          Please contact the School Administrator if you need Head of Department privileges.
        </div>
      </Glass>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 6, background: "rgba(131,56,236,0.15)", color: "#8338EC", border: "1px solid rgba(131,56,236,0.3)" }}>
              HOD Portal
            </span>
            <span style={{ fontSize: 12, color: "var(--subtext)" }}>
              Department of {department || "General"}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>
            Subject Teacher Allocations
          </h1>
          <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>
            Assign specialist subject teachers to class arms for all subjects in your department.
          </p>
        </div>

        <button
          onClick={fetchAllocations}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
            background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)",
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="responsive-grid-3" style={{ marginBottom: 20 }}>
        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(131,56,236,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={20} style={{ color: "#8338EC" }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#8338EC" }}>{courses.length}</div>
            <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Department Subjects</div>
          </div>
        </Glass>

        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(33,158,188,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={20} style={{ color: "#219EBC" }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#219EBC" }}>{classes.length}</div>
            <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Total Class Arms</div>
          </div>
        </Glass>

        <Glass style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(42,157,143,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCheck size={20} style={{ color: "#2a9d8f" }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2a9d8f" }}>{totalAllocated}</div>
            <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Active Teacher Allocations</div>
          </div>
        </Glass>
      </div>

      {statusMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(42,157,143,0.1)", border: "1px solid rgba(42,157,143,0.25)", marginBottom: 16 }}>
          <CheckCircle size={15} style={{ color: "#2a9d8f" }} />
          <span style={{ fontSize: 13, color: "#2a9d8f", fontWeight: 600 }}>{statusMessage}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }} className="desktop-layout-split">
        {/* Left Column: Department Subjects List */}
        <Glass style={{ padding: 18, height: "fit-content" }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8,
                background: "var(--muted)", border: "1px solid var(--glass-border)",
                color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.06em" }}>
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
                    padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                    background: isSelected ? "rgba(131,56,236,0.12)" : "var(--muted)",
                    border: `1.5px solid ${isSelected ? "#8338EC" : "var(--glass-border)"}`,
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#8338EC" : "var(--heading)" }}>
                      {c.name}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5,
                      background: courseAllocCount > 0 ? "rgba(42,157,143,0.15)" : "rgba(251,133,0,0.15)",
                      color: courseAllocCount > 0 ? "#2a9d8f" : "#FB8500"
                    }}>
                      {courseAllocCount} / {classes.length}
                    </span>
                  </div>
                  {c.description && (
                    <div style={{ fontSize: 11, color: "var(--subtext)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.description}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCourses.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--subtext)", fontSize: 12 }}>
                No subjects found in this department.
              </div>
            )}
          </div>
        </Glass>

        {/* Right Column: Class Arms Allocations for Active Subject */}
        {activeCourse ? (
          <Glass style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid var(--glass-border)", paddingBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--heading)", margin: 0 }}>
                    {activeCourse.name}
                  </h2>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(131,56,236,0.15)", color: "#8338EC" }}>
                    {activeCourse.department || department}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--subtext)", margin: 0 }}>
                  Assign teachers for {activeCourse.name} across all academic classes and arms.
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
                      padding: "14px 18px", borderRadius: 10, background: "var(--muted)",
                      border: "1px solid var(--glass-border)", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 16, flexWrap: "wrap"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>
                        {cls.name} {cls.department ? `(${cls.department})` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>
                        {assignedTeacherId ? (
                          <span style={{ color: "#2a9d8f", fontWeight: 600 }}>
                            ✔ Teacher: {currentAlloc.first_name} {currentAlloc.last_name}
                          </span>
                        ) : (
                          <span style={{ color: "#FB8500", fontWeight: 600 }}>
                            ⚠ No Teacher Assigned
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
                          flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12.5,
                          background: "var(--background)", border: "1px solid var(--glass-border)",
                          color: assignedTeacherId ? "var(--heading)" : "var(--subtext)",
                          outline: "none", cursor: isSaving ? "wait" : "pointer"
                        }}
                      >
                        <option value="">-- Assign Teacher --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.first_name} {t.last_name} ({t.email})
                          </option>
                        ))}
                      </select>

                      {isSaving && (
                        <span style={{ fontSize: 11, color: "var(--subtext)", fontStyle: "italic" }}>
                          Saving...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Glass>
        ) : (
          <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
            Select a departmental subject to view and manage teacher allocations.
          </Glass>
        )}
      </div>
    </div>
  );
}
