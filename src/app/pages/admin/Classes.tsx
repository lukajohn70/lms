import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, BookOpen, Save, Settings, Search, ChevronDown } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

// Searchable teacher dropdown component
function SearchableTeacherSelect({ teachers, value, onChange }: { teachers: any[]; value: string; onChange: (v: string) => void }) {
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
          padding: "5px 9px", borderRadius: 6, background: "var(--background)",
          border: "1px solid var(--glass-border)", color: selected ? "var(--heading)" : "var(--subtext)",
          cursor: "pointer", fontSize: 11, gap: 6, textAlign: "left"
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
              style={{ padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "var(--subtext)", background: value === "" ? "rgba(33,158,188,0.08)" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = value === "" ? "rgba(33,158,188,0.08)" : "transparent")}
            >
              No Teacher Assigned
            </div>
            {filtered.map(t => (
              <div
                key={t.id}
                onMouseDown={() => { onChange(String(t.id)); setOpen(false); }}
                style={{ padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "var(--heading)", background: String(t.id) === String(value) ? "rgba(33,158,188,0.08)" : "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = String(t.id) === String(value) ? "rgba(33,158,188,0.08)" : "transparent")}
              >
                {t.first_name} {t.last_name}
              </div>
            ))}
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
            <button
              onClick={() => setShowAddSubject(true)}
              style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #219EBC, #023047)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
            >
              <Plus size={16} /> New Subject
            </button>
          )}
        </div>
      </div>

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
                        {c.department && <div style={{ fontSize: 11, color: "var(--subtext)" }}>{c.department}</div>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Glass>

            {/* Subjects Allocation */}
            <div ref={subjectsRef}>
              <Glass style={{ padding: 20 }}>
                {!activeClass ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--subtext)" }}>
                    <Settings size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div style={{ fontSize: 14 }}>Select a class to allocate subjects.</div>
                  </div>
                ) : (
                  <div>
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
