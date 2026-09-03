import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, BookOpen, Save, Settings, Search, ChevronDown, Download, Upload, CheckCircle, AlertCircle, Award, UserCheck } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

// Searchable teacher dropdown component with optional arm count indicator
function SearchableTeacherSelect({ 
  teachers, 
  value, 
  onChange,
  armCounts,
  currentTeacherId
}: { 
  teachers: any[]; 
  value: string; 
  onChange: (v: string) => void;
  armCounts?: Record<number, number>;
  currentTeacherId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = teachers.filter(t =>
    (`${t.first_name} ${t.last_name}`).toLowerCase().includes(query.toLowerCase())
  );

  const selected = teachers.find(t => String(t.id) === String(value));
  const label = selected ? `${selected.first_name} ${selected.last_name}` : "No Teacher Assigned";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", fontSize: 11 }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(""); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px", borderRadius: 7, background: "var(--background)",
          border: "1px solid var(--glass-border)", color: selected ? "var(--heading)" : "var(--subtext)",
          cursor: "pointer", fontSize: 11.5, gap: 6, textAlign: "left"
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
          background: "var(--background)", border: "1px solid var(--glass-border)",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden"
        }}>
          {/* Search input */}
          <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={12} style={{ color: "var(--subtext)", flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search teacher..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 11, color: "var(--heading)", fontFamily: "inherit" }}
            />
          </div>
          {/* Options list */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <div
              onMouseDown={() => { onChange(""); setOpen(false); }}
              style={{ padding: "7px 10px", cursor: "pointer", fontSize: 11, color: "var(--subtext)", background: value === "" ? "rgba(33,158,188,0.08)" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = value === "" ? "rgba(33,158,188,0.08)" : "transparent")}
            >
              No Teacher Assigned
            </div>
            {filtered.map(t => {
              const count = armCounts ? (armCounts[t.id] || 0) : 0;
              const isCurrent = currentTeacherId === t.id;
              const isAtMax = armCounts && count >= 2 && !isCurrent;

              return (
                <div
                  key={t.id}
                  onMouseDown={() => {
                    if (isAtMax) {
                      alert(`${t.first_name} ${t.last_name} is already Form Teacher to 2 class arms (maximum reached).`);
                      return;
                    }
                    onChange(String(t.id));
                    setOpen(false);
                  }}
                  style={{
                    padding: "7px 10px",
                    cursor: isAtMax ? "not-allowed" : "pointer",
                    fontSize: 11,
                    color: isAtMax ? "var(--subtext)" : "var(--heading)",
                    opacity: isAtMax ? 0.6 : 1,
                    background: String(t.id) === String(value) ? "rgba(33,158,188,0.08)" : "transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={e => { if (!isAtMax) e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={e => { if (!isAtMax) e.currentTarget.style.background = String(t.id) === String(value) ? "rgba(33,158,188,0.08)" : "transparent"; }}
                >
                  <span>{t.first_name} {t.last_name}</span>
                  {armCounts && (
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: isAtMax ? "rgba(231,111,81,0.15)" : count > 0 ? "rgba(251,133,0,0.15)" : "rgba(33,158,188,0.15)",
                      color: isAtMax ? "#e76f51" : count > 0 ? "#FB8500" : "#219EBC"
                    }}>
                      {isAtMax ? "2/2 (Max)" : `${count}/2 arms`}
                    </span>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--subtext)", textAlign: "center" }}>No teachers found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminClasses() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<any>(null);
  const subjectsRef = useRef<HTMLDivElement>(null);

  const handleSelectClass = (c: any) => {
    setActiveClass(c);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setTimeout(() => {
        subjectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };
  
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDept, setNewClassDept] = useState("");

  const [activeTab, setActiveTab] = useState<'classes'|'subjects'>('classes');
  
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]); // current allocations for active class
  const [savingSubjects, setSavingSubjects] = useState(false);
  
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");

  // CSV Template & Bulk Import for Subjects
  const subjectFileInputRef = useRef<HTMLInputElement>(null);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  const handleDownloadSubjectsTemplate = () => {
    const headers = ["name", "description", "topics"];
    const rows = [
      ["Mathematics", "Core general mathematics and quantitative reasoning", "Algebra, Geometry, Trigonometry"],
      ["English Language", "Grammar, composition, literature and oral English", "Grammar, Essay Writing, Comprehension"],
      ["Physics", "Classical and modern physics with laboratory practicals", "Mechanics, Optics, Electricity"],
      ["Chemistry", "Inorganic, organic and physical chemistry", "Periodic Table, Chemical Reactions"],
      ["Biology", "Living systems, ecology and human physiology", "Cell Biology, Genetics, Ecology"],
      ["Economics", "Principles of micro and macro economics", "Demand & Supply, Fiscal Policy"]
    ];

    const csvContent = "\uFEFF" + [
      "# Aroura Academy Subjects (Courses) Template",
      "# Required column: name",
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `subjects_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSubjectsCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    setCsvMessage("");
    setCsvError("");

    const formData = new FormData();
    formData.append("csv_file", file);

    try {
      const res: any = await apiClient.postForm("/admin/courses/bulk-import", formData);
      if (res && res.success) {
        setCsvMessage(res.message || `Successfully imported ${res.created} subject(s)!`);
        fetchCourses();
        setTimeout(() => setCsvMessage(""), 6000);
      } else {
        setCsvError(res.error || "Failed to import subjects.");
        setTimeout(() => setCsvError(""), 6000);
      }
    } catch (err: any) {
      setCsvError(err.message || "Bulk import failed. Please check CSV format.");
      setTimeout(() => setCsvError(""), 6000);
    } finally {
      setCsvImporting(false);
      if (subjectFileInputRef.current) subjectFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (activeClass) fetchClassSubjects(activeClass.id);
  }, [activeClass]);

  const fetchClasses = async () => {
    try {
      const { classes } = await apiClient.get("/classes");
      setClasses(classes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await apiClient.get("/courses");
      setCourses(data.courses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await apiClient.get("/users");
      setTeachers(data.users.filter((u: any) => u.role === 'teacher'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClassSubjects = async (id: number) => {
    try {
      const { subjects } = await apiClient.get(`/class-subjects?class_id=${id}`);
      setSubjects(subjects);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      await apiClient.post("/admin/classes/create", { name: newClassName, department: newClassDept });
      setNewClassName("");
      setNewClassDept("");
      setShowAddClass(false);
      fetchClasses();
    } catch (e) {
      alert("Failed to create class.");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      await apiClient.post("/admin/courses/create", { name: newSubjectName, description: newSubjectDesc });
      setNewSubjectName("");
      setNewSubjectDesc("");
      setShowAddSubject(false);
      fetchCourses();
    } catch (e) {
      alert("Failed to create subject.");
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class? This will also delete subject allocations.")) return;
    try {
      await apiClient.post(`/admin/classes/delete?id=${id}`, {});
      if (activeClass?.id === id) setActiveClass(null);
      fetchClasses();
    } catch (e: any) {
      alert(e.message || "Cannot delete class.");
    }
  };

  const toggleSubject = (course: any) => {
    const exists = subjects.find(s => s.course_id === course.id);
    if (exists) {
      setSubjects(subjects.filter(s => s.course_id !== course.id));
    } else {
      setSubjects([...subjects, { course_id: course.id, name: course.name, type: 'core', elective_group: '', teacher_id: '' }]);
    }
  };

  const updateSubjectField = (courseId: number, field: string, value: any) => {
    setSubjects(subjects.map(s => s.course_id === courseId ? { ...s, [field]: value } : s));
  };

  const handleSaveSubjects = async () => {
    if (!activeClass) return;
    setSavingSubjects(true);
    try {
      await apiClient.post("/admin/class-subjects/save", {
        class_id: activeClass.id,
        subjects: subjects
      });
      alert("Subject allocations saved!");
    } catch (e) {
      alert("Failed to save subjects.");
    } finally {
      setSavingSubjects(false);
    }
  };

  const teacherArmCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    classes.forEach(c => {
      if (c.form_teacher_id) {
        counts[c.form_teacher_id] = (counts[c.form_teacher_id] || 0) + 1;
      }
    });
    return counts;
  }, [classes]);

  const handleAssignFormTeacher = async (classId: number, teacherId: string) => {
    try {
      const res: any = await apiClient.post("/admin/classes/assign-form-teacher", {
        class_id: classId,
        teacher_id: teacherId ? parseInt(teacherId) : null
      });
      if (res && res.success) {
        fetchClasses();
        if (activeClass && activeClass.id === classId) {
          const tObj = teachers.find(t => String(t.id) === String(teacherId));
          setActiveClass({
            ...activeClass,
            form_teacher_id: teacherId ? parseInt(teacherId) : null,
            form_teacher_name: tObj ? `${tObj.first_name} ${tObj.last_name}` : null
          });
        }
      } else {
        alert(res.error || "Failed to assign form teacher");
      }
    } catch (e: any) {
      alert(e.message || "Failed to assign form teacher");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Academic Setup</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Classes & Subjects</h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "var(--muted)", padding: 4, borderRadius: 10, display: "flex" }}>
            <button
              onClick={() => setActiveTab('classes')}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: activeTab === 'classes' ? "var(--background)" : "transparent", color: activeTab === 'classes' ? "var(--heading)" : "var(--subtext)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: activeTab === 'classes' ? "0 2px 5px rgba(0,0,0,0.05)" : "none" }}
            >Classes</button>
            <button
              onClick={() => setActiveTab('subjects')}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: activeTab === 'subjects' ? "var(--background)" : "transparent", color: activeTab === 'subjects' ? "var(--heading)" : "var(--subtext)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: activeTab === 'subjects' ? "0 2px 5px rgba(0,0,0,0.05)" : "none" }}
            >Subjects</button>
          </div>
          {activeTab === 'classes' ? (
            <button
              onClick={() => setShowAddClass(true)}
              style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #FB8500, #E85D04)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
            >
              <Plus size={16} /> New Class
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDownloadSubjectsTemplate}
                style={{
                  padding: "9px 14px", borderRadius: 10, background: "rgba(33,158,188,0.1)",
                  border: "1px solid rgba(33,158,188,0.3)", color: "#219EBC", fontSize: 12.5, fontWeight: 600,
                  display: "flex", gap: 6, alignItems: "center", cursor: "pointer"
                }}
              >
                <Download size={14} /> Template (.csv)
              </button>

              <input
                type="file"
                ref={subjectFileInputRef}
                onChange={handleImportSubjectsCsv}
                accept=".csv"
                style={{ display: "none" }}
              />

              <button
                type="button"
                disabled={csvImporting}
                onClick={() => subjectFileInputRef.current?.click()}
                style={{
                  padding: "9px 14px", borderRadius: 10, background: "linear-gradient(135deg, #FB8500, #E76F51)",
                  border: "none", color: "#fff", fontSize: 12.5, fontWeight: 600,
                  display: "flex", gap: 6, alignItems: "center", cursor: csvImporting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(251,133,0,0.25)"
                }}
              >
                <Upload size={14} /> {csvImporting ? "Importing…" : "Import CSV"}
              </button>

              <button
                onClick={() => setShowAddSubject(true)}
                style={{ padding: "9px 16px", borderRadius: 10, background: "linear-gradient(135deg, #219EBC, #023047)", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
              >
                <Plus size={16} /> New Subject
              </button>
            </div>
          )}
        </div>
      </div>

      {csvMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(42,157,143,0.12)", border: "1px solid rgba(42,157,143,0.3)", color: "#2a9d8f", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <CheckCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvMessage}</span>
        </div>
      )}
      {csvError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(231,111,81,0.12)", border: "1px solid rgba(231,111,81,0.3)", color: "#e76f51", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvError}</span>
        </div>
      )}

      {activeTab === 'classes' && (
        <>
          {/* Quick mobile class switcher so user never has to scroll past classes to reach subjects */}
          <div className="md-hidden" style={{ marginBottom: 14 }}>
            <Glass style={{ padding: "12px 16px" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Select Class to Manage:
              </label>
              <select
                value={activeClass?.id || ""}
                onChange={(e) => {
                  const found = classes.find(c => c.id === parseInt(e.target.value));
                  if (found) handleSelectClass(found);
                }}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  background: "var(--background)", border: "1.5px solid rgba(251,133,0,0.4)",
                  color: "var(--heading)", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box"
                }}
              >
                <option value="">-- Choose Class ({classes.length} Available) --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.department ? `(${c.department})` : ''}
                  </option>
                ))}
              </select>
            </Glass>
          </div>

          <div className="responsive-grid-2" style={{ alignItems: "start", gap: 20 }}>
            {/* Classes List */}
            <Glass style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "var(--heading)" }}>Grade Levels</h3>
              {loading ? (
                <div style={{ color: "var(--subtext)", fontSize: 13 }}>Loading...</div>
              ) : classes.length === 0 ? (
                <div style={{ color: "var(--subtext)", fontSize: 13 }}>No classes found. Create one.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {classes.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClass(c)}
                      style={{
                        padding: "12px 16px", borderRadius: 10, border: "1px solid var(--glass-border)", cursor: "pointer",
                        background: activeClass?.id === c.id ? "rgba(251,133,0,0.1)" : "var(--muted)",
                        borderColor: activeClass?.id === c.id ? "rgba(251,133,0,0.5)" : "var(--glass-border)",
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: activeClass?.id === c.id ? "#FB8500" : "var(--heading)" }}>{c.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 3 }}>
                          {c.department && <span style={{ fontSize: 10.5, color: "var(--subtext)" }}>{c.department}</span>}
                          {c.form_teacher_name ? (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(33,158,188,0.15)", color: "#219EBC", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                              🎓 {c.form_teacher_name}
                            </span>
                          ) : (
                            <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "rgba(231,111,81,0.1)", color: "#e76f51", fontWeight: 600 }}>
                              No Form Teacher
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Glass>

            {/* Subjects Allocation & Form Teacher Allocation */}
            <div ref={subjectsRef}>
              <Glass style={{ padding: 20 }}>
                {!activeClass ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--subtext)" }}>
                    <Settings size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div style={{ fontSize: 14 }}>Select a class to allocate subjects and assign a Form Teacher.</div>
                  </div>
                ) : (
                  <div>
                    {/* Form Teacher Assignment Panel */}
                    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(251,133,0,0.07)", border: "1px solid rgba(251,133,0,0.25)", marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#FB8500" }}>
                            <Award size={15} /> Form Teacher for {activeClass.name}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(251,133,0,0.18)", color: "#FB8500" }}>
                              Max 2 arms / teacher
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 3 }}>
                            The form teacher manages report comments, behavioral &amp; psychomotor domains, attendance, awards, and student names.
                          </div>
                        </div>
                      </div>
                      <div style={{ maxWidth: 360 }}>
                        <SearchableTeacherSelect
                          teachers={teachers}
                          armCounts={teacherArmCounts}
                          currentTeacherId={activeClass.form_teacher_id}
                          value={activeClass.form_teacher_id ? String(activeClass.form_teacher_id) : ""}
                          onChange={(tid) => handleAssignFormTeacher(activeClass.id, tid)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--heading)" }}>
                          Subjects for {activeClass.name} {activeClass.department ? `(${activeClass.department})` : ''}
                        </h3>
                        <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>
                          Select subjects and mark them as core or elective.
                        </div>
                      </div>
                      <button
                        onClick={handleSaveSubjects}
                        disabled={savingSubjects}
                        style={{ padding: "8px 16px", borderRadius: 8, background: "#219EBC", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Save size={14} /> {savingSubjects ? "Saving..." : "Save Allocations"}
                      </button>
                    </div>

              <div className="responsive-grid-2" style={{ maxHeight: 600, overflowY: "auto", gap: 12 }}>
                {courses.map(course => {
                  const sub = subjects.find(s => s.course_id === course.id);
                  const isSelected = !!sub;

                  return (
                    <div key={course.id} style={{ padding: 16, borderRadius: 10, background: isSelected ? "rgba(33,158,188,0.05)" : "var(--muted)", border: `1px solid ${isSelected ? "#219EBC" : "var(--glass-border)"}` }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSubject(course)}
                          style={{ marginTop: 4, cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", marginBottom: 2 }}>{course.name}</div>
                          {isSelected && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                              <select
                                value={sub.type}
                                onChange={e => updateSubjectField(course.id, 'type', e.target.value)}
                                style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, background: "var(--background)", border: "1px solid var(--glass-border)", color: "var(--heading)" }}
                              >
                                <option value="core">Core Subject (Mandatory)</option>
                                <option value="elective">Elective Option</option>
                              </select>
                              {sub.type === 'elective' && (
                                <input
                                  type="text"
                                  placeholder="Elective Group (e.g. Science Options)"
                                  value={sub.elective_group || ""}
                                  onChange={e => updateSubjectField(course.id, 'elective_group', e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, background: "var(--background)", border: "1px solid var(--glass-border)", color: "var(--heading)" }}
                                />
                              )}
                              <SearchableTeacherSelect
                                teachers={teachers}
                                value={sub.teacher_id || ""}
                                onChange={v => updateSubjectField(course.id, 'teacher_id', v)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Glass>
      </div>
    </div>
  </>
)}

      {activeTab === 'subjects' && (
        <Glass style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--heading)" }}>All Subjects</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {courses.map(course => (
              <div key={course.id} style={{ padding: 16, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>{course.name}</div>
                {course.description && <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>{course.description}</div>}
              </div>
            ))}
          </div>
        </Glass>
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Create New Class</h3>
            <form onSubmit={handleCreateClass} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Class Name</label>
                <input required type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. SSS 2" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Department / Stream (Optional)</label>
                <input type="text" value={newClassDept} onChange={e => setNewClassDept(e.target.value)} placeholder="e.g. Science" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddClass(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, background: "#FB8500", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Create Class</button>
              </div>
            </form>
          </Glass>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Create New Subject</h3>
            <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Subject Name</label>
                <input required type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Further Mathematics" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Description (Optional)</label>
                <input type="text" value={newSubjectDesc} onChange={e => setNewSubjectDesc(e.target.value)} placeholder="Brief description" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddSubject(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, background: "#219EBC", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Create Subject</button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}
