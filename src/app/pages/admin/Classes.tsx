import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, BookOpen, Save, Settings, Search, ChevronDown, Download, Upload, CheckCircle, AlertCircle, Award, UserCheck, Edit2, Filter } from "lucide-react";
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
                      background: isAtMax ? "rgba(220,19,123,0.12)" : count > 0 ? "rgba(212,175,55,0.14)" : "rgba(41,61,125,0.08)",
                      color: isAtMax ? "#dc137b" : count > 0 ? "#d4af37" : "#293d7d"
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
  const [newSubjectDept, setNewSubjectDept] = useState("Science");
  const [newSubjectTopics, setNewSubjectTopics] = useState("");

  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectDesc, setEditSubjectDesc] = useState("");
  const [editSubjectDept, setEditSubjectDept] = useState("Science");
  const [editSubjectTopics, setEditSubjectTopics] = useState("");

  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [subjectDeptFilter, setSubjectDeptFilter] = useState("all");
  const [allocationSearchQuery, setAllocationSearchQuery] = useState("");

  const departmentOptions = ["Science", "Arts & Humanities", "Vocational & Commercial", "General / Core"];

  // CSV Template & Bulk Import for Subjects
  const subjectFileInputRef = useRef<HTMLInputElement>(null);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  const handleDownloadSubjectsTemplate = () => {
    const headers = ["name", "description", "department", "topics"];
    const rows = [
      ["Mathematics", "Core general mathematics and quantitative reasoning", "Science", "Algebra, Geometry, Trigonometry"],
      ["English Language", "Grammar, composition, literature and oral English", "Arts & Humanities", "Grammar, Essay Writing, Comprehension"],
      ["Physics", "Classical and modern physics with laboratory practicals", "Science", "Mechanics, Optics, Electricity"],
      ["Chemistry", "Inorganic, organic and physical chemistry", "Science", "Periodic Table, Chemical Reactions"],
      ["Biology", "Living systems, ecology and human physiology", "Science", "Cell Biology, Genetics, Ecology"],
      ["Economics", "Principles of micro and macro economics", "Vocational & Commercial", "Demand & Supply, Fiscal Policy"]
    ];

    const csvContent = "\uFEFF" + [
      "# Deeper Life High School Subjects (Courses) Template",
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
      await apiClient.post("/admin/courses/create", { 
        name: newSubjectName.trim(), 
        description: newSubjectDesc.trim(),
        department: newSubjectDept,
        topics: newSubjectTopics.trim()
      });
      setNewSubjectName("");
      setNewSubjectDesc("");
      setNewSubjectDept("Science");
      setNewSubjectTopics("");
      setShowAddSubject(false);
      fetchCourses();
    } catch (e: any) {
      alert(e.error || e.message || "Failed to create subject.");
    }
  };

  const handleOpenEditSubject = (course: any) => {
    setEditingSubject(course);
    setEditSubjectName(course.name || "");
    setEditSubjectDesc(course.description || "");
    setEditSubjectDept(course.department || "Science");
    setEditSubjectTopics(course.topics || "");
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim()) return;
    try {
      await apiClient.post("/admin/courses/update", {
        id: editingSubject.id,
        name: editSubjectName.trim(),
        description: editSubjectDesc.trim(),
        department: editSubjectDept,
        topics: editSubjectTopics.trim()
      });
      setEditingSubject(null);
      fetchCourses();
    } catch (e: any) {
      alert(e.message || "Failed to update subject.");
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the subject "${name}"? This action cannot be undone.`)) return;
    try {
      await apiClient.post(`/admin/courses/delete?id=${id}`, { id });
      fetchCourses();
    } catch (e: any) {
      alert(e.message || "Failed to delete subject.");
    }
  };

  // Deduplicate courses list defensively by canonical id & trimmed lowercase name
  const distinctCourses = useMemo(() => {
    const seen = new Set<string>();
    return courses.filter(c => {
      const key = (c.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return distinctCourses.filter(c => {
      const q = subjectSearchQuery.toLowerCase();
      const matchesSearch = !q || (c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q) ||
        (c.topics || "").toLowerCase().includes(q);
      const matchesDept = subjectDeptFilter === 'all' || 
        (c.department || 'Science') === subjectDeptFilter ||
        (subjectDeptFilter === 'Science' && (c.department === 'Sciences' || c.department === 'Mathematics')) ||
        (subjectDeptFilter === 'Arts & Humanities' && (c.department?.includes('Art') || c.department?.includes('Humanities') || c.department?.includes('Social') || c.department === 'Languages')) ||
        (subjectDeptFilter === 'Vocational & Commercial' && (c.department?.includes('Vocational') || c.department?.includes('Commercial'))) ||
        (subjectDeptFilter === 'General / Core' && (c.department?.includes('General') || c.department?.includes('Core')));
      return matchesSearch && matchesDept;
    });
  }, [distinctCourses, subjectSearchQuery, subjectDeptFilter]);

  const filteredAllocationCourses = useMemo(() => {
    const q = allocationSearchQuery.trim().toLowerCase();
    if (!q) return distinctCourses;
    return distinctCourses.filter(c => 
      (c.name || "").toLowerCase().includes(q) || 
      (c.department || "").toLowerCase().includes(q)
    );
  }, [distinctCourses, allocationSearchQuery]);

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
    const exists = subjects.find(s => s.course_id === course.id || (s.name && s.name.trim().toLowerCase() === course.name.trim().toLowerCase()));
    if (exists) {
      setSubjects(subjects.filter(s => s.course_id !== course.id && (s.name ? s.name.trim().toLowerCase() !== course.name.trim().toLowerCase() : true)));
    } else {
      setSubjects([...subjects, { course_id: course.id, name: course.name, type: 'core', elective_group: '', teacher_id: '' }]);
    }
  };

  const updateSubjectField = (courseId: number, courseName: string, field: string, value: any) => {
    setSubjects(subjects.map(s => {
      if (s.course_id === courseId || (s.name && s.name.trim().toLowerCase() === courseName.trim().toLowerCase())) {
        return { ...s, course_id: courseId, [field]: value };
      }
      return s;
    }));
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
          <div style={{ fontSize: 11, color: "#dc137b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4, fontFamily: "'Raleway', sans-serif" }}>Academic Governance</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--heading)", margin: 0, fontFamily: "'Raleway', sans-serif" }}>Classes, Arms &amp; Subjects</h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "var(--muted)", padding: 4, borderRadius: 8, display: "flex", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setActiveTab('classes')}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: activeTab === 'classes' ? "#293d7d" : "transparent", color: activeTab === 'classes' ? "#ffffff" : "var(--subtext)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Raleway', sans-serif", transition: "all 0.15s" }}
            >Classes &amp; Arms</button>
            <button
              onClick={() => setActiveTab('subjects')}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: activeTab === 'subjects' ? "#293d7d" : "transparent", color: activeTab === 'subjects' ? "#ffffff" : "var(--subtext)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Raleway', sans-serif", transition: "all 0.15s" }}
            >Subject Syllabi</button>
          </div>
          {activeTab === 'classes' ? (
            <button
              onClick={() => setShowAddClass(true)}
              style={{ padding: "10px 18px", borderRadius: 6, background: "#dc137b", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontFamily: "'Raleway', sans-serif", boxShadow: "0 2px 8px rgba(220,19,123,0.25)" }}
            >
              <Plus size={16} /> New Class
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDownloadSubjectsTemplate}
                style={{
                  padding: "9px 14px", borderRadius: 6, background: "rgba(41,61,125,0.06)",
                  border: "1px solid rgba(41,61,125,0.2)", color: "#293d7d", fontSize: 12.5, fontWeight: 700,
                  display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontFamily: "'Raleway', sans-serif"
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
                  padding: "9px 14px", borderRadius: 6, background: "#293d7d",
                  border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700,
                  display: "flex", gap: 6, alignItems: "center", cursor: csvImporting ? "not-allowed" : "pointer",
                  fontFamily: "'Raleway', sans-serif", boxShadow: "0 2px 8px rgba(41,61,125,0.25)"
                }}
              >
                <Upload size={14} /> {csvImporting ? "Importing…" : "Import CSV"}
              </button>

              <button
                onClick={() => setShowAddSubject(true)}
                style={{ padding: "9px 16px", borderRadius: 6, background: "#dc137b", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontFamily: "'Raleway', sans-serif", boxShadow: "0 2px 8px rgba(220,19,123,0.25)" }}
              >
                <Plus size={16} /> New Subject
              </button>
            </div>
          )}
        </div>
      </div>

      {csvMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(41,61,125,0.08)", border: "1px solid rgba(42,157,143,0.3)", color: "#293d7d", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <CheckCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvMessage}</span>
        </div>
      )}
      {csvError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(220,19,123,0.08)", border: "1px solid rgba(231,111,81,0.3)", color: "#dc137b", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvError}</span>
        </div>
      )}

      {activeTab === 'classes' && (
        <>
          {/* Quick mobile class switcher so user never has to scroll past classes to reach subjects */}
          <div className="md-hidden" style={{ marginBottom: 14 }}>
            <Glass style={{ padding: "12px 16px" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#293d7d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, fontFamily: "'Raleway', sans-serif" }}>
                Select Class Arm to Manage:
              </label>
              <select
                value={activeClass?.id || ""}
                onChange={(e) => {
                  const found = classes.find(c => c.id === parseInt(e.target.value));
                  if (found) handleSelectClass(found);
                }}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 6,
                  background: "var(--background)", border: "1.5px solid rgba(41,61,125,0.3)",
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
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: "var(--heading)", fontFamily: "'Raleway', sans-serif" }}>Class Arms</h3>
              {loading ? (
                <div style={{ color: "var(--subtext)", fontSize: 13 }}>Loading class arms...</div>
              ) : classes.length === 0 ? (
                <div style={{ color: "var(--subtext)", fontSize: 13 }}>No class arms found. Create one above.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {classes.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClass(c)}
                      style={{
                        padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer",
                        background: activeClass?.id === c.id ? "rgba(41,61,125,0.08)" : "var(--muted)",
                        borderColor: activeClass?.id === c.id ? "#293d7d" : "var(--border)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "all 0.15s"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: activeClass?.id === c.id ? "#293d7d" : "var(--heading)", fontFamily: "'Raleway', sans-serif" }}>{c.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                          {c.department && <span style={{ fontSize: 10.5, color: "var(--subtext)", fontWeight: 600 }}>{c.department}</span>}
                          {c.form_teacher_name ? (
                            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(0,147,221,0.12)", color: "#0093dd", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <Award size={11} /> {c.form_teacher_name}
                            </span>
                          ) : (
                            <span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(220,19,123,0.1)", color: "#dc137b", fontWeight: 700 }}>
                              Unassigned Form Teacher
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} style={{ background: "none", border: "none", color: "#be123c", cursor: "pointer", padding: 4 }}>
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
                    <div style={{ fontSize: 14, fontFamily: "'Raleway', sans-serif", fontWeight: 700 }}>Select a class to allocate subjects and assign a Form Teacher.</div>
                  </div>
                ) : (
                  <div>
                    {/* Form Teacher Assignment Panel */}
                    <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(41,61,125,0.06)", border: "1px solid rgba(41,61,125,0.2)", marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#293d7d", fontFamily: "'Raleway', sans-serif" }}>
                            <Award size={15} /> Form Teacher for {activeClass.name}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(220,19,123,0.1)", color: "#dc137b" }}>
                              Max 2 arms / teacher
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 3 }}>
                            The form teacher manages report comments, behavioral &amp; psychomotor domains, attendance, awards, and student records.
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

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--heading)" }}>
                          Subjects for {activeClass.name} {activeClass.department ? `(${activeClass.department})` : ''}
                        </h3>
                        <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>
                          Select subjects and mark them as core or elective ({subjects.length} allocated).
                        </div>
                      </div>
                      <button
                        onClick={handleSaveSubjects}
                        disabled={savingSubjects}
                        style={{ padding: "8px 16px", borderRadius: 6, background: "#dc137b", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Raleway', sans-serif" }}
                      >
                        <Save size={14} /> {savingSubjects ? "Saving..." : "Save Allocations"}
                      </button>
                    </div>

                    {/* Filter subjects in allocation list */}
                    <div style={{ position: "relative", marginBottom: 14 }}>
                      <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
                      <input
                        type="text"
                        placeholder="Search subjects to allocate..."
                        value={allocationSearchQuery}
                        onChange={e => setAllocationSearchQuery(e.target.value)}
                        style={{
                          width: "100%", padding: "7px 10px 7px 30px", borderRadius: 7,
                          background: "var(--background)", border: "1px solid var(--border)",
                          color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>

              <div className="responsive-grid-2" style={{ maxHeight: 600, overflowY: "auto", gap: 12 }}>
                {filteredAllocationCourses.map(course => {
                  const sub = subjects.find(s => s.course_id === course.id || (s.name && s.name.trim().toLowerCase() === course.name.trim().toLowerCase()));
                  const isSelected = !!sub;

                  return (
                    <div key={course.id} style={{ padding: 16, borderRadius: 8, background: isSelected ? "rgba(41,61,125,0.06)" : "var(--muted)", border: `1px solid ${isSelected ? "#293d7d" : "var(--border)"}` }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSubject(course)}
                          style={{ marginTop: 4, cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>{course.name}</div>
                            {course.department && (
                              <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "rgba(41,61,125,0.08)", color: "#293d7d", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {course.department}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                              <select
                                value={sub.type}
                                onChange={e => updateSubjectField(course.id, course.name, 'type', e.target.value)}
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
                                  onChange={e => updateSubjectField(course.id, course.name, 'elective_group', e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6, background: "var(--background)", border: "1px solid var(--glass-border)", color: "var(--heading)" }}
                                />
                              )}
                              <SearchableTeacherSelect
                                teachers={teachers}
                                value={sub.teacher_id || ""}
                                onChange={v => updateSubjectField(course.id, course.name, 'teacher_id', v)}
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
        <Glass style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--heading)" }}>Subject Catalogue ({filteredCourses.length})</h3>
              <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>
                Manage school subjects, departments, curriculum topics, and syllabi.
              </div>
            </div>

            {/* Department filter pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setSubjectDeptFilter("all")}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  background: subjectDeptFilter === "all" ? "var(--heading)" : "var(--muted)",
                  color: subjectDeptFilter === "all" ? "var(--background)" : "var(--subtext)",
                  border: "1px solid var(--glass-border)"
                }}
              >
                All
              </button>
              {departmentOptions.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSubjectDeptFilter(dept)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    background: subjectDeptFilter === dept ? "#293d7d" : "var(--muted)",
                    color: subjectDeptFilter === dept ? "#fff" : "var(--subtext)",
                    border: "1px solid var(--border)"
                  }}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
            <input
              type="text"
              placeholder="Search subjects by name, description, department, or topics..."
              value={subjectSearchQuery}
              onChange={e => setSubjectSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10,
                background: "var(--muted)", border: "1px solid var(--border)",
                color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filteredCourses.map(course => {
              const dept = course.department || "Science";
              const isScience = dept === "Science";
              const isArts = dept.includes("Arts");
              const isVoc = dept.includes("Vocational") || dept.includes("Commercial");
              const deptColor = isScience ? "#0093dd" : isArts ? "#dc137b" : isVoc ? "#d4af37" : "#293d7d";

              return (
                <div key={course.id} style={{ padding: 18, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--heading)" }}>{course.name}</div>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: `${deptColor}18`, color: deptColor, border: `1px solid ${deptColor}30`,
                        whiteSpace: "nowrap"
                      }}>
                        {dept}
                      </span>
                    </div>
                    {course.description && (
                      <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 8, lineHeight: 1.4 }}>
                        {course.description}
                      </div>
                    )}
                    {course.topics && (
                      <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 8, padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.03)", border: "1px dashed var(--glass-border)" }}>
                        <strong style={{ color: "var(--heading)" }}>Topics:</strong> {course.topics}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--glass-border)" }}>
                    <button
                      onClick={() => handleOpenEditSubject(course)}
                      style={{
                        padding: "6px 10px", borderRadius: 7, background: "rgba(41,61,125,0.08)",
                        border: "1px solid rgba(41,61,125,0.25)", color: "#293d7d", fontSize: 11.5,
                        fontWeight: 700, display: "flex", alignItems: "center", gap: 5, cursor: "pointer"
                      }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(course.id, course.name)}
                      style={{
                        padding: "6px 10px", borderRadius: 7, background: "rgba(231,111,81,0.1)",
                        border: "1px solid rgba(231,111,81,0.3)", color: "#dc137b", fontSize: 11.5,
                        fontWeight: 600, display: "flex", alignItems: "center", gap: 5, cursor: "pointer"
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredCourses.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--subtext)", fontSize: 13 }}>
              No subjects found matching your criteria.
            </div>
          )}
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
                <input required type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. Basic 7 Diamond or SS 1 Science" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Department / Stream (Optional)</label>
                <input type="text" value={newClassDept} onChange={e => setNewClassDept(e.target.value)} placeholder="e.g. Junior Section, Science, or Humanities" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddClass(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 8, background: "#D81B60", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Create Class</button>
              </div>
            </form>
          </Glass>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 440, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Create New Subject</h3>
            <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Subject Name *</label>
                <input required type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Further Mathematics" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Department</label>
                <select
                  value={newSubjectDept}
                  onChange={e => setNewSubjectDept(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }}
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Description (Optional)</label>
                <input type="text" value={newSubjectDesc} onChange={e => setNewSubjectDesc(e.target.value)} placeholder="Brief description" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Topics (Comma-separated, optional)</label>
                <textarea rows={2} value={newSubjectTopics} onChange={e => setNewSubjectTopics(e.target.value)} placeholder="e.g. Algebra, Calculus, Trigonometry" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box", resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddSubject(false)} style={{ flex: 1, padding: 10, borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--heading)", cursor: "pointer", fontFamily: "'Raleway', sans-serif", fontWeight: 700 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 6, background: "#dc137b", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Raleway', sans-serif" }}>Create Subject</button>
              </div>
            </form>
          </Glass>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 440, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Edit Subject</h3>
            <form onSubmit={handleUpdateSubject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Subject Name *</label>
                <input required type="text" value={editSubjectName} onChange={e => setEditSubjectName(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Department</label>
                <select
                  value={editSubjectDept}
                  onChange={e => setEditSubjectDept(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }}
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Description</label>
                <input type="text" value={editSubjectDesc} onChange={e => setEditSubjectDesc(e.target.value)} placeholder="Brief description" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Topics (Comma-separated)</label>
                <textarea rows={2} value={editSubjectTopics} onChange={e => setEditSubjectTopics(e.target.value)} placeholder="e.g. Algebra, Calculus, Trigonometry" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box", resize: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setEditingSubject(null)} style={{ flex: 1, padding: 10, borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--heading)", cursor: "pointer", fontFamily: "'Raleway', sans-serif", fontWeight: 700 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: 10, borderRadius: 6, background: "#dc137b", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'Raleway', sans-serif" }}>Save Changes</button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}
