import { useState, useEffect, useRef } from "react";
import { 
  Award, Heart, CalendarDays, FileText, Download, Upload, CheckCircle2, 
  AlertCircle, Edit2, Search, Sparkles, CheckSquare, X, RefreshCw, Star,
  ChevronLeft, ChevronRight, ArrowLeft
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
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

const COMMENT_PRESETS = [
  "Consistent and diligent in studies. Keep it up!",
  "A quiet and obedient student with good academic conduct.",
  "Good performance, but needs to participate more actively in classroom discussions.",
  "Exemplary conduct and leadership skills. A pleasure to teach.",
  "Promising student with great potential. Encourage to read more.",
  "Capable of much better performance with increased focus and punctuality."
];

export default function FormClass() {
  const [formClasses, setFormClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Mobile active tab view: "roster" or "workspace"
  const [mobileTab, setMobileTab] = useState<"roster" | "workspace">("roster");

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const autoSaveTimer = useRef<any>(null);

  // Filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Name Modal
  const [nameModalStudent, setNameModalStudent] = useState<any | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // CSV Import Modal & Feedback
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Active workspace tab for selected student
  const [activeTab, setActiveTab] = useState<"affective" | "psychomotor" | "attendance" | "comments">("affective");

  // Load Form Classes for the current teacher
  useEffect(() => {
    setLoadingClasses(true);
    apiClient.get("/teacher/form-classes")
      .then((res: any) => {
        const classes = res.form_classes || [];
        setFormClasses(classes);
        if (classes.length > 0) {
          setSelectedClassId(classes[0].id);
        }
      })
      .catch(err => console.error("Error loading form classes", err))
      .finally(() => setLoadingClasses(false));
  }, []);

  // Load students for the selected class arm
  useEffect(() => {
    if (!selectedClassId) return;

    setLoadingRoster(true);
    apiClient.get(`/teacher/form-class/students?class_id=${selectedClassId}`)
      .then((res: any) => {
        const studList = res.students || [];
        setStudents(studList);
        if (studList.length > 0) {
          // Keep current student if still in roster, otherwise select first
          setSelectedStudent((prev: any) => {
            if (prev) {
              const found = studList.find((s: any) => s.id === prev.id);
              if (found) return found;
            }
            return studList[0];
          });
        } else {
          setSelectedStudent(null);
        }
      })
      .catch(err => console.error("Error loading students", err))
      .finally(() => setLoadingRoster(false));
  }, [selectedClassId]);

  // Update specific metric in current student and auto-save
  const updateMetric = (field: string, val: any) => {
    if (!selectedStudent || !selectedClassId) return;

    const updated = { ...selectedStudent, [field]: val };
    setSelectedStudent(updated);

    // Update students roster cache
    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));

    // Debounced auto-save
    setSaveStatus("Saving changes…");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      apiClient.post("/teacher/form-class/save", {
        class_id: selectedClassId,
        student_id: selectedStudent.id,
        ...updated
      })
        .then(() => {
          setSaveStatus("Saved successfully");
          setTimeout(() => setSaveStatus(""), 2200);
        })
        .catch(err => {
          console.error("Save error", err);
          setSaveStatus("Error saving");
        });
    }, 700);
  };

  // Open Name Edit Modal
  const openNameEdit = (e: React.MouseEvent, student: any) => {
    e.stopPropagation();
    setNameModalStudent(student);
    setEditFirstName(student.first_name || "");
    setEditLastName(student.last_name || "");
    setNameError("");
  };

  // Save edited student name
  const handleSaveStudentName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameModalStudent) return;

    if (editFirstName.trim().length < 2 || editLastName.trim().length < 2) {
      setNameError("Both first name and last name must be at least 2 characters.");
      return;
    }

    setSavingName(true);
    setNameError("");

    try {
      const res: any = await apiClient.post("/teacher/form-class/update-student-name", {
        student_id: nameModalStudent.id,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim()
      });

      if (res && res.success) {
        const updatedStudent = {
          ...nameModalStudent,
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          name: `${editFirstName.trim()} ${editLastName.trim()}`
        };

        setStudents(prev => prev.map(s => s.id === nameModalStudent.id ? updatedStudent : s));
        if (selectedStudent && selectedStudent.id === nameModalStudent.id) {
          setSelectedStudent(updatedStudent);
        }
        setNameModalStudent(null);
      } else {
        setNameError(res.error || "Failed to update name.");
      }
    } catch (err: any) {
      setNameError(err.message || "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  // Download CSV Template
  const handleDownloadCsv = () => {
    if (!selectedClassId) return;
    const token = localStorage.getItem("token") || "";
    const url = `${API_BASE_URL.replace(/\/index\.php$/, "")}/index.php?path=/teacher/form-class/csv-template&class_id=${selectedClassId}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Import CSV Template
  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !csvFile) return;

    setImportingCsv(true);
    setCsvFeedback(null);

    const formData = new FormData();
    formData.append("class_id", String(selectedClassId));
    formData.append("csv_file", csvFile);

    try {
      const res: any = await apiClient.postForm("/teacher/form-class/import-csv", formData);
      if (res && res.success) {
        setCsvFeedback({ success: true, message: res.message });
        setCsvFile(null);
        // Reload roster to reflect imported values
        const refreshed: any = await apiClient.get(`/teacher/form-class/students?class_id=${selectedClassId}`);
        if (refreshed.students) {
          setStudents(refreshed.students);
          if (selectedStudent) {
            const reSelected = refreshed.students.find((s: any) => s.id === selectedStudent.id);
            if (reSelected) setSelectedStudent(reSelected);
          }
        }
      } else {
        setCsvFeedback({ success: false, message: res.error || "Import failed." });
      }
    } catch (err: any) {
      setCsvFeedback({ success: false, message: err.message || "Failed to parse CSV file." });
    } finally {
      setImportingCsv(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admission_number && s.admission_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentClass = formClasses.find(c => c.id === selectedClassId);

  // Count completion stats for selected arm
  const totalCount = students.length;
  const commentsCompleted = students.filter(s => (s.class_teacher_comment || "").trim().length > 0).length;
  const attendanceEntered = students.filter(s => s.days_present !== null).length;
  const affectiveCompleted = students.filter(s => s.punctuality > 0 && s.neatness > 0).length;

  // Student pagination indices for mobile & desktop navigation
  const currentIndex = filteredStudents.findIndex(s => s.id === selectedStudent?.id);
  const prevStudent = currentIndex > 0 ? filteredStudents[currentIndex - 1] : null;
  const nextStudent = currentIndex >= 0 && currentIndex < filteredStudents.length - 1 ? filteredStudents[currentIndex + 1] : null;

  const handleSelectStudent = (student: any) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSelectedStudent(student);
    setSaveStatus("");
    setMobileTab("workspace");
  };

  const handlePrevStudent = () => {
    if (prevStudent) {
      handleSelectStudent(prevStudent);
    }
  };

  const handleNextStudent = () => {
    if (nextStudent) {
      handleSelectStudent(nextStudent);
    }
  };

  if (loadingClasses) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 350, color: "var(--subtext)" }}>
        Loading Form Teacher portal...
      </div>
    );
  }

  if (formClasses.length === 0) {
    return (
      <Glass style={{ padding: "50px 30px", textAlign: "center", maxWidth: 620, margin: "40px auto" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(251,133,0,0.1)", color: "#FB8500", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Award size={32} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 10px" }}>
          Form Teacher Portal
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--subtext)", lineHeight: 1.6, margin: "0 0 20px" }}>
          You are currently not assigned as a <strong>Form Teacher</strong> for any class arm. 
          Form teacher roles (up to 2 arms per teacher) are assigned by the school administrator in <strong>Academic Setup &gt; Classes &amp; Subjects</strong>.
        </p>
        <div style={{ fontSize: 12, color: "var(--subtext)", padding: "10px 16px", borderRadius: 8, background: "var(--muted)", display: "inline-block" }}>
          Form Teachers manage student report remarks, character &amp; psychomotor domains, official attendance, awards, and student name edits.
        </div>
      </Glass>
    );
  }

  return (
    <div>
      <style>{`
        .form-class-split {
          display: grid;
          grid-template-columns: 310px 1fr;
          gap: 18px;
          align-items: start;
        }
        .form-workspace-tabs-scroller {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 8px;
          margin-bottom: 18px;
        }
        .form-workspace-tabs-scroller::-webkit-scrollbar {
          display: none;
        }
        .form-mobile-nav {
          display: none;
        }
        .form-mobile-switch-btn {
          display: none;
        }
        @media (max-width: 850px) {
          .form-class-split {
            display: block !important;
          }
          .form-class-roster-panel {
            display: ${mobileTab === "roster" ? "block" : "none"} !important;
            margin-bottom: 16px;
          }
          .form-class-workspace-panel {
            display: ${mobileTab === "workspace" ? "block" : "none"} !important;
          }
          .form-mobile-nav {
            display: block !important;
          }
          .form-mobile-switch-btn {
            display: flex !important;
          }
          .form-class-header-wrap {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .form-class-header-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .form-class-header-actions button {
            width: 100% !important;
            justify-content: center !important;
            padding: 9px 8px !important;
            font-size: 11.5px !important;
          }
          .responsive-grid-4.form-stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .form-stats-card {
            padding: 10px 12px !important;
          }
          .form-stats-val {
            font-size: 18px !important;
          }
          .arm-switcher-pills {
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            white-space: nowrap !important;
            padding: 4px !important;
            box-sizing: border-box !important;
          }
        }
        @media (max-width: 550px) {
          .responsive-grid-3.attendance-grid {
            grid-template-columns: 1fr !important;
          }
          .responsive-grid-2.awards-grid {
            grid-template-columns: 1fr !important;
          }
          .form-class-header-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header & Arm Switcher */}
      <div className="form-class-header-wrap" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Form Teacher Portal
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(251,133,0,0.15)", color: "#FB8500" }}>
              {formClasses.length} {formClasses.length === 1 ? "Class Arm Assigned" : "Class Arms Assigned"}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>
            {currentClass ? currentClass.name : "Form Class"}
            {currentClass?.department && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--subtext)", marginLeft: 8 }}>({currentClass.department})</span>}
          </h1>
        </div>

        {/* Action Buttons: Template Download & Upload */}
        <div className="form-class-header-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleDownloadCsv}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
              background: "rgba(33,158,188,0.12)", border: "1px solid rgba(33,158,188,0.3)", color: "#219EBC",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
            }}
            title="Download CSV template pre-filled with this arm's student roster"
          >
            <Download size={14} /> Download Template (.csv)
          </button>

          <button
            onClick={() => { setShowCsvModal(true); setCsvFeedback(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9,
              background: "linear-gradient(135deg, #FB8500, #E76F51)", border: "none", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(251,133,0,0.25)"
            }}
          >
            <Upload size={14} /> Upload Completed (.csv)
          </button>
        </div>
      </div>

      {/* Class Arm Switcher Pills (If assigned to multiple arms) */}
      {formClasses.length > 1 && (
        <div className="arm-switcher-pills" style={{ display: "flex", gap: 8, marginBottom: 18, background: "var(--muted)", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {formClasses.map(c => {
            const active = c.id === selectedClassId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8,
                  border: "none", background: active ? "#FB8500" : "transparent",
                  color: active ? "#fff" : "var(--subtext)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <Award size={14} /> {c.name} ({c.student_count || 0} Students)
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Stats Overview */}
      <div className="responsive-grid-4 form-stats-grid" style={{ marginBottom: 20, gap: 12 }}>
        <Glass className="form-stats-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--subtext)", textTransform: "uppercase", fontWeight: 700 }}>Class Enrolment</div>
          <div className="form-stats-val" style={{ fontSize: 22, fontWeight: 800, color: "#219EBC", marginTop: 4 }}>{totalCount}</div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Students in arm</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--subtext)", textTransform: "uppercase", fontWeight: 700 }}>Teacher Comments</div>
          <div className="form-stats-val" style={{ fontSize: 22, fontWeight: 800, color: "#FFB703", marginTop: 4 }}>
            {commentsCompleted} <span style={{ fontSize: 13, color: "var(--subtext)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>{Math.round((commentsCompleted / (totalCount || 1)) * 100)}% done</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--subtext)", textTransform: "uppercase", fontWeight: 700 }}>Attendance Entered</div>
          <div className="form-stats-val" style={{ fontSize: 22, fontWeight: 800, color: "#2a9d8f", marginTop: 4 }}>
            {attendanceEntered} <span style={{ fontSize: 13, color: "var(--subtext)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Term totals</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--subtext)", textTransform: "uppercase", fontWeight: 700 }}>Domains Evaluated</div>
          <div className="form-stats-val" style={{ fontSize: 22, fontWeight: 800, color: "#FB8500", marginTop: 4 }}>
            {affectiveCompleted} <span style={{ fontSize: 13, color: "var(--subtext)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Traits &amp; Skills</div>
        </Glass>
      </div>

      {loadingRoster ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--subtext)" }}>Loading class roster...</div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
          No students currently enrolled in this class arm.
        </Glass>
      ) : (
        /* Split View: Roster (Left) & Assessment Workspace (Right) */
        <div className="form-class-split">
          
          {/* Left Panel: Student Roster with Search and Name-Edit Action */}
          <Glass className="form-class-roster-panel" style={{ padding: "14px 12px", height: "fit-content" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                <Search size={13} style={{ color: "var(--subtext)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "var(--heading)", width: "100%" }}
                />
              </div>
            </div>

            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 6px 8px", borderBottom: "1px solid var(--glass-border)" }}>
              {filteredStudents.length} Students {filteredStudents.length !== students.length && `(filtered from ${students.length})`}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "calc(100vh - 360px)", overflowY: "auto", marginTop: 6 }}>
              {filteredStudents.map(s => {
                const isSelected = selectedStudent && selectedStudent.id === s.id;
                const hasComment = (s.class_teacher_comment || "").trim().length > 0;
                const hasAtt = s.days_present !== null;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    style={{
                      padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                      border: `1px solid ${isSelected ? "#FB8500" : "transparent"}`,
                      background: isSelected ? "rgba(251,133,0,0.12)" : "transparent",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? "#FB8500" : "var(--heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </span>
                        {/* Form Teacher Name Edit Trigger */}
                        <button
                          type="button"
                          onClick={(e) => openNameEdit(e, s)}
                          title="Form Teacher: Edit student name only"
                          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--subtext)", display: "flex", alignItems: "center" }}
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 2, display: "flex", gap: 6 }}>
                        <span>{s.admission_number}</span>
                        {hasAtt && <span style={{ color: "#2a9d8f" }}>• Att</span>}
                        {hasComment && <span style={{ color: "#FFB703" }}>• Note</span>}
                      </div>
                    </div>

                    {s.punctuality > 0 && (
                      <span style={{ fontSize: 9.5, color: "#219EBC", fontWeight: 700, background: "rgba(33,158,188,0.12)", padding: "2px 5px", borderRadius: 6 }}>
                        ✓ Rated
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile quick button to go back to active evaluation */}
            {selectedStudent && (
              <div className="form-mobile-switch-btn" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setMobileTab("workspace")}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "linear-gradient(135deg, #FB8500, #E76F51)", border: "none",
                    color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: "0 4px 12px rgba(251,133,0,0.25)"
                  }}
                >
                  Edit: {selectedStudent.name.split(" ")[0]} →
                </button>
              </div>
            )}
          </Glass>

          {/* Right Panel: Student Assessment Workspace */}
          {selectedStudent ? (
            <Glass className="form-class-workspace-panel" style={{ padding: "18px 16px" }}>
              {/* Mobile Header with Back Button and Prev/Next Navigation */}
              <div className="form-mobile-nav" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMobileTab("roster")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px",
                      borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)",
                      color: "var(--heading)", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    <ArrowLeft size={13} /> Roster ({filteredStudents.length})
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <button
                      type="button"
                      disabled={!prevStudent}
                      onClick={handlePrevStudent}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
                        borderRadius: 7, background: "var(--muted)", border: "1px solid var(--glass-border)",
                        color: "var(--heading)", opacity: prevStudent ? 1 : 0.35, cursor: prevStudent ? "pointer" : "not-allowed"
                      }}
                      title="Previous Student"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", minWidth: 42, textAlign: "center" }}>
                      {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredStudents.length}` : ""}
                    </span>
                    <button
                      type="button"
                      disabled={!nextStudent}
                      onClick={handleNextStudent}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
                        borderRadius: 7, background: "var(--muted)", border: "1px solid var(--glass-border)",
                        color: "var(--heading)", opacity: nextStudent ? 1 : 0.35, cursor: nextStudent ? "pointer" : "not-allowed"
                      }}
                      title="Next Student"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: 12, marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "var(--heading)" }}>
                      {selectedStudent.name}
                    </h2>
                    <button
                      onClick={(e) => openNameEdit(e, selectedStudent)}
                      style={{ background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.3)", borderRadius: 6, padding: "3px 7px", fontSize: 11, fontWeight: 600, color: "#FB8500", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Edit2 size={11} /> Edit Name
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 3, display: "flex", gap: 8 }}>
                    <span>Admission No: <strong>{selectedStudent.admission_number}</strong></span>
                    <span>•</span>
                    <span>Sex: <strong>{selectedStudent.gender || "MALE"}</strong></span>
                  </div>
                </div>

                {saveStatus && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#2a9d8f", background: "rgba(42,157,143,0.1)", padding: "4px 9px", borderRadius: 8 }}>
                    <CheckCircle2 size={13} /> {saveStatus}
                  </div>
                )}
              </div>

              {/* Workspace Navigation Tabs (Horizontal swipe on mobile) */}
              <div className="form-workspace-tabs-scroller" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--glass-border)", paddingBottom: 8, marginBottom: 16 }}>
                {[
                  { id: "affective", label: "Affective Traits", icon: <Heart size={13} />, color: "#219EBC" },
                  { id: "psychomotor", label: "Psychomotor Skills", icon: <Award size={13} />, color: "#FFB703" },
                  { id: "attendance", label: "Attendance & Awards", icon: <CalendarDays size={13} />, color: "#2a9d8f" },
                  { id: "comments", label: "Form Teacher Comments", icon: <FileText size={13} />, color: "#FB8500" },
                ].map(t => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
                        border: `1.5px solid ${active ? t.color : "transparent"}`,
                        background: active ? `${t.color}15` : "transparent",
                        color: active ? t.color : "var(--subtext)",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        whiteSpace: "nowrap", flexShrink: 0
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Affective / Behavioral Traits */}
              {activeTab === "affective" && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 10 }}>
                    Rate character development: <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>:
                  </div>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 8px", fontSize: 11, color: "var(--subtext)" }}>Behavioral Trait</th>
                          {[1, 2, 3, 4, 5].map(i => (
                            <th key={i} style={{ width: 44, padding: "6px 2px", fontSize: 11, color: "var(--subtext)", textAlign: "center" }}>
                              {i}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {characterTraits.map(t => {
                          const currentScore = (selectedStudent as any)[t.id] || 0;
                          return (
                            <tr key={t.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                              <td style={{ padding: "8px 8px", fontSize: 12.5, fontWeight: 600, color: "var(--heading)", minWidth: 140 }}>{t.label}</td>
                              {[1, 2, 3, 4, 5].map(v => (
                                <td key={v} style={{ textAlign: "center", padding: "6px 2px" }}>
                                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, cursor: "pointer", borderRadius: "50%", background: currentScore === v ? "rgba(33,158,188,0.15)" : "transparent" }}>
                                    <input
                                      type="radio"
                                      name={`aff-${selectedStudent.id}-${t.id}`}
                                      checked={currentScore === v}
                                      onChange={() => updateMetric(t.id, v)}
                                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#219EBC" }}
                                    />
                                  </label>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Psychomotor Domain */}
              {activeTab === "psychomotor" && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 12 }}>
                    Rate student physical coordination and dexterity on a scale of <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>:
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "var(--subtext)" }}>Skill &amp; Capability</th>
                          {[1, 2, 3, 4, 5].map(i => (
                            <th key={i} style={{ width: 50, padding: "8px", fontSize: 11, color: "var(--subtext)", textAlign: "center" }}>
                              {i}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {psychomotorSkills.map(s => {
                          const currentScore = (selectedStudent as any)[s.id] || 0;
                          return (
                            <tr key={s.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                              <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{s.label}</td>
                              {[1, 2, 3, 4, 5].map(v => (
                                <td key={v} style={{ textAlign: "center", padding: "6px" }}>
                                  <input
                                    type="radio"
                                    name={`psy-${selectedStudent.id}-${s.id}`}
                                    checked={currentScore === v}
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
                </div>
              )}

              {/* TAB 3: Attendance & Awards */}
              {activeTab === "attendance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ padding: 14, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <CalendarDays size={14} style={{ color: "#2a9d8f" }} /> Term Attendance for Report Card
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--subtext)", marginBottom: 14 }}>
                      Enter official cumulative attendance days that appear on the student's term report card.
                    </div>

                    <div className="responsive-grid-3" style={{ gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                          Days Present
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStudent.days_present ?? ""}
                          onChange={e => updateMetric("days_present", e.target.value === "" ? null : parseInt(e.target.value))}
                          placeholder="e.g. 78"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--background)", color: "var(--heading)", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                          Days Absent
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStudent.days_absent ?? ""}
                          onChange={e => updateMetric("days_absent", e.target.value === "" ? null : parseInt(e.target.value))}
                          placeholder="e.g. 2"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--background)", color: "var(--heading)", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                          Total Days (School Opened)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStudent.total_days ?? ""}
                          onChange={e => updateMetric("total_days", e.target.value === "" ? null : parseInt(e.target.value))}
                          placeholder="e.g. 80"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--background)", color: "var(--heading)", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Award size={14} style={{ color: "#FB8500" }} /> Special Awards &amp; Commendations
                    </div>

                    <div className="responsive-grid-2" style={{ gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                          Award / Prize 1
                        </label>
                        <input
                          type="text"
                          value={selectedStudent.award_1 ?? "NILL"}
                          onChange={e => updateMetric("award_1", e.target.value)}
                          placeholder="e.g. 1st in Mathematics or NILL"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--background)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                          Award / Prize 2
                        </label>
                        <input
                          type="text"
                          value={selectedStudent.award_2 ?? "NILL"}
                          onChange={e => updateMetric("award_2", e.target.value)}
                          placeholder="e.g. Best in Basketball or NILL"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--background)", color: "var(--heading)", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Form Teacher Comments */}
              {activeTab === "comments" && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 8 }}>
                    Official Form Teacher appraisal for the term report card:
                  </div>

                  {/* Comment Presets */}
                  <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", alignSelf: "center", marginRight: 4 }}>
                      <Sparkles size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} /> Quick Suggestions:
                    </span>
                    {COMMENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateMetric("class_teacher_comment", preset)}
                        style={{
                          padding: "4px 9px", borderRadius: 6, border: "1px solid var(--glass-border)",
                          background: "var(--muted)", color: "var(--heading)", fontSize: 11, cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#FB8500")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--glass-border)")}
                      >
                        {preset.slice(0, 32)}…
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={selectedStudent.class_teacher_comment || ""}
                    onChange={e => updateMetric("class_teacher_comment", e.target.value)}
                    placeholder="Write personalized comment on student conduct, class participation, and academic progress..."
                    style={{
                      width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 10,
                      border: "1px solid var(--glass-border)", background: "var(--muted)",
                      color: "var(--heading)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box"
                    }}
                  />
                </div>
              )}
            </Glass>
          ) : (
            <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
              Select a student from the roster to begin assessment.
            </Glass>
          )}
        </div>
      )}

      {/* MODAL 1: Form Teacher Edit Student Name ONLY */}
      {nameModalStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--background)", border: "1px solid var(--glass-border)", borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.35)", padding: 24, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Edit2 size={16} style={{ color: "#FB8500" }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>Edit Student Name</span>
              </div>
              <button onClick={() => setNameModalStudent(null)} style={{ background: "none", border: "none", color: "var(--subtext)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(251,133,0,0.08)", border: "1px solid rgba(251,133,0,0.25)", marginBottom: 14, fontSize: 11.5, color: "var(--subtext)", lineHeight: 1.5 }}>
              <strong style={{ color: "#FB8500" }}>Form Teacher Privilege:</strong> You may edit the student's <strong>First Name</strong> and <strong>Last Name</strong> only. Admission numbers, class placements, and system credentials remain protected.
            </div>

            {nameError && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(231,111,81,0.15)", color: "#e76f51", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {nameError}
              </div>
            )}

            <form onSubmit={handleSaveStudentName}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setNameModalStudent(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--subtext)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingName}
                  style={{ flex: 2, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #FB8500, #E76F51)", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: savingName ? "not-allowed" : "pointer" }}
                >
                  {savingName ? "Saving Name…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk CSV Upload for Form Class Assessments */}
      {showCsvModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--background)", border: "1px solid var(--glass-border)", borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.35)", padding: 24, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={16} style={{ color: "#FB8500" }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>
                  Import Assessment CSV — {currentClass?.name}
                </span>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: "none", border: "none", color: "var(--subtext)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5, marginBottom: 16 }}>
              Upload your completed template. The system will update behavioral traits, psychomotor skills, attendance days, awards, and teacher remarks for matching students in this class arm.
            </p>

            {csvFeedback && (
              <div style={{
                padding: "10px 14px", borderRadius: 9, marginBottom: 16, fontSize: 12, fontWeight: 600,
                background: csvFeedback.success ? "rgba(42,157,143,0.12)" : "rgba(231,111,81,0.12)",
                border: `1px solid ${csvFeedback.success ? "rgba(42,157,143,0.3)" : "rgba(231,111,81,0.3)"}`,
                color: csvFeedback.success ? "#2a9d8f" : "#e76f51",
                display: "flex", alignItems: "center", gap: 8
              }}>
                {csvFeedback.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{csvFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleImportCsv}>
              <div style={{
                border: "2px dashed var(--glass-border)", borderRadius: 12, padding: "24px 16px",
                textAlign: "center", marginBottom: 16, background: "var(--muted)", cursor: "pointer"
              }}
              onClick={() => document.getElementById("csv-file-input")?.click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
                <Upload size={24} style={{ color: "#FB8500", margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>
                  {csvFile ? csvFile.name : "Click to select CSV file"}
                </div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>
                  {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Supports UTF-8 .csv downloaded from this portal"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--subtext)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || importingCsv}
                  style={{
                    flex: 2, padding: "10px", borderRadius: 8,
                    background: (!csvFile || importingCsv) ? "var(--muted)" : "linear-gradient(135deg, #FB8500, #E76F51)",
                    border: "none", color: (!csvFile || importingCsv) ? "var(--subtext)" : "#fff",
                    fontSize: 12.5, fontWeight: 700, cursor: (!csvFile || importingCsv) ? "not-allowed" : "pointer"
                  }}
                >
                  {importingCsv ? "Importing Roster Data…" : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
