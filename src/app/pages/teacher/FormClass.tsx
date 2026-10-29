import { useState, useEffect, useRef } from "react";
import { 
  Award, Heart, CalendarDays, FileText, Download, Upload, CheckCircle2, 
  AlertCircle, Edit2, Search, CheckSquare, X, RefreshCw, Star,
  ChevronLeft, ChevronRight, ArrowLeft, Printer, GraduationCap, ShieldCheck
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

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

  // Term & Session
  const [currentTerm, setCurrentTerm] = useState("2nd Term");
  const [currentSession, setCurrentSession] = useState("2026/2027");

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
        if (res.term) setCurrentTerm(res.term);
        if (res.session) setCurrentSession(res.session);
        if (studList.length > 0) {
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

    let updated = { ...selectedStudent, [field]: val };

    // Auto-calculate days_present if total_days or days_absent is updated
    if (field === "total_days") {
      const tot = val === "" || val === null ? null : parseInt(val);
      const abs = updated.days_absent !== null && updated.days_absent !== undefined ? parseInt(updated.days_absent) : 0;
      updated.days_absent = abs;
      updated.days_present = tot !== null ? Math.max(0, tot - abs) : null;
    } else if (field === "days_absent") {
      const abs = val === "" || val === null ? 0 : parseInt(val);
      const tot = updated.total_days !== null && updated.total_days !== undefined ? parseInt(updated.total_days) : null;
      updated.days_absent = abs;
      updated.days_present = tot !== null ? Math.max(0, tot - abs) : null;
    }

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

  const handleSetBulkTermDays = async () => {
    if (!selectedClassId) return;
    const input = prompt("Enter total number of days school opened for this class arm this term:", "110");
    if (!input || isNaN(parseInt(input))) return;
    const totalDays = parseInt(input);
    try {
      setSaveStatus("Updating all students' term days...");
      await apiClient.post("/teacher/form-class/set-term-days", {
        class_id: selectedClassId,
        total_days: totalDays
      });
      // Refresh students
      const res: any = await apiClient.get(`/teacher/form-class/students?class_id=${selectedClassId}`);
      setStudents(res.students || []);
      if (selectedStudent) {
        const updated = (res.students || []).find((s: any) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
      setSaveStatus(`Set ${totalDays} days school opened for all students!`);
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to set term days for class.");
    }
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

  // Print Report Card for Selected Student
  const handlePrintReportCard = () => {
    if (!selectedStudent) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/print&student_id=${selectedStudent.id}&term=${encodeURIComponent(currentTerm)}&session=${encodeURIComponent(currentSession)}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Print Mid-Term Result for Selected Student
  const handlePrintMidterm = () => {
    if (!selectedStudent) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/midterm&student_id=${selectedStudent.id}&term=${encodeURIComponent(currentTerm)}&session=${encodeURIComponent(currentSession)}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Batch print all report cards for this class arm
  const handlePrintBatchReportCards = () => {
    if (!selectedClassId) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/print&class_id=${selectedClassId}&term=${encodeURIComponent(currentTerm)}&session=${encodeURIComponent(currentSession)}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Batch print all mid-terms for this class arm
  const handlePrintBatchMidterm = () => {
    if (!selectedClassId) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/midterm&class_id=${selectedClassId}&term=${encodeURIComponent(currentTerm)}&session=${encodeURIComponent(currentSession)}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Print Cumulative Transcript for Selected Student
  const handlePrintTranscript = () => {
    if (!selectedStudent) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/transcript&student_id=${selectedStudent.id}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Batch print transcripts for all students in this class arm
  const handlePrintBatchTranscripts = () => {
    if (!selectedClassId) return;
    const token = localStorage.getItem("token") || "";
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/transcript&class_id=${selectedClassId}&token=${encodeURIComponent(token)}`;
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 350, color: "var(--muted-foreground)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
        Loading Form Teacher Portal…
      </div>
    );
  }

  if (formClasses.length === 0) {
    return (
      <Glass style={{ padding: "50px 30px", textAlign: "center", maxWidth: 620, margin: "40px auto" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(41, 61, 125, 0.1)", color: DLHS.navy, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Award size={32} />
        </div>
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 10px" }}>
          Form Teacher Portal
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0 0 20px" }}>
          You are currently not assigned as a <strong>Form Teacher</strong> for any class arm. 
          Form teacher responsibilities (up to 2 arms per faculty member) are designated by the Academic Administrator in <strong>Academic Setup &gt; Classes &amp; Arms</strong>.
        </p>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "10px 16px", borderRadius: 8, background: "var(--muted)", display: "inline-block" }}>
          Form Teachers oversee term report remarks, character affective ratings, psychomotor capability assessments, term attendance records, and student awards.
        </div>
      </Glass>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
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
            display: block !important;
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
            <span style={{ fontSize: 11, fontWeight: 800, color: DLHS.navy, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Form Teacher Broadsheet
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(41, 61, 125, 0.1)", color: DLHS.navy }}>
              {formClasses.length} {formClasses.length === 1 ? "Class Stream Assigned" : "Class Streams Assigned"}
            </span>
          </div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
            {currentClass ? currentClass.name : "Form Class"}
            {currentClass?.department && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 8 }}>({currentClass.department})</span>}
          </h1>
        </div>

        {/* Action Buttons: Batch Outputs & CSV Roster */}
        <div className="form-class-header-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handlePrintBatchMidterm}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: "rgba(0, 147, 221, 0.1)", border: `1px solid ${DLHS.blue}50`, color: DLHS.blue,
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
            }}
            title="Batch print mid-term results for this class arm"
          >
            <Printer size={14} /> Batch Mid-Terms
          </button>

          <button
            onClick={handlePrintBatchReportCards}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: DLHS.crimson, border: "none", color: "#ffffff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(220, 19, 123, 0.25)"
            }}
            title="Batch print official report cards for this class arm"
          >
            <Printer size={14} /> Batch Report Cards
          </button>

          <button
            onClick={handlePrintBatchTranscripts}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: DLHS.navy, border: "none", color: "#ffffff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(41, 61, 125, 0.25)"
            }}
            title="Batch print official cumulative transcripts for this class arm"
          >
            <GraduationCap size={14} /> Batch Transcripts
          </button>

          <button
            onClick={handleDownloadCsv}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
            }}
            title="Download CSV roster template pre-filled with this arm's students"
          >
            <Download size={14} /> Roster Template (.csv)
          </button>

          <button
            onClick={() => { setShowCsvModal(true); setCsvFeedback(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              background: "rgba(212, 175, 55, 0.15)", border: `1px solid ${DLHS.gold}80`, color: "#92400E",
              fontSize: 12, fontWeight: 700, cursor: "pointer"
            }}
          >
            <Upload size={14} /> Upload Completed (.csv)
          </button>
        </div>
      </div>

      {/* Class Arm Switcher Pills */}
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
                  border: "none", background: active ? DLHS.navy : "transparent",
                  color: active ? "#ffffff" : "var(--muted-foreground)", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <Award size={14} /> {c.name} ({c.student_count || 0} Candidates)
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Stats Overview */}
      <div className="responsive-grid-4 form-stats-grid" style={{ marginBottom: 20, gap: 14 }}>
        <Glass className="form-stats-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Class Enrolment</div>
          <div className="form-stats-val" style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.navy, marginTop: 4 }}>{totalCount}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Registered candidates</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Teacher Comments</div>
          <div className="form-stats-val" style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.blue, marginTop: 4 }}>
            {commentsCompleted} <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{Math.round((commentsCompleted / (totalCount || 1)) * 100)}% finalized</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Attendance Entered</div>
          <div className="form-stats-val" style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: "#059669", marginTop: 4 }}>
            {attendanceEntered} <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Term presence recorded</div>
        </Glass>

        <Glass className="form-stats-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Domains Evaluated</div>
          <div className="form-stats-val" style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: DLHS.gold, marginTop: 4 }}>
            {affectiveCompleted} <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>/ {totalCount}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Affective &amp; Psychomotor</div>
        </Glass>
      </div>

      {loadingRoster ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Loading class arm roster…
        </div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
          No students currently enrolled in this class arm.
        </Glass>
      ) : (
        /* Split View: Roster (Left) & Assessment Workspace (Right) */
        <div className="form-class-split">
          
          {/* Left Panel: Student Roster with Search and Name-Edit Action */}
          <Glass className="form-class-roster-panel" style={{ padding: "14px 12px", height: "fit-content" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
                <Search size={14} style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search students…"
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: "var(--foreground)", width: "100%", fontFamily: "'Lato', sans-serif" }}
                />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 6px 8px", borderBottom: "1px solid var(--border)" }}>
              {filteredStudents.length} Students {filteredStudents.length !== students.length && `(filtered from ${students.length})`}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 360px)", overflowY: "auto", marginTop: 6 }}>
              {filteredStudents.map(s => {
                const isSelected = selectedStudent && selectedStudent.id === s.id;
                const hasComment = (s.class_teacher_comment || "").trim().length > 0;
                const hasAtt = s.days_present !== null;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${isSelected ? DLHS.navy : "transparent"}`,
                      background: isSelected ? "rgba(41, 61, 125, 0.08)" : "transparent",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? DLHS.navy : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </span>
                        {/* Form Teacher Name Edit Trigger */}
                        <button
                          type="button"
                          onClick={(e) => openNameEdit(e, s)}
                          title="Form Teacher: Correct student name"
                          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, display: "flex", gap: 6 }}>
                        <span>{s.admission_number}</span>
                        {hasAtt && <span style={{ color: "#059669" }}>• Att</span>}
                        {hasComment && <span style={{ color: DLHS.blue }}>• Remark</span>}
                      </div>
                    </div>

                    {s.punctuality > 0 && (
                      <span style={{ fontSize: 10, color: DLHS.navy, fontWeight: 700, background: "rgba(41, 61, 125, 0.1)", padding: "2px 6px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <CheckCircle2 size={10} /> Rated
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
                    width: "100%", padding: "10px 14px", borderRadius: 8,
                    background: DLHS.navy, border: "none",
                    color: "#ffffff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  Edit: {selectedStudent.name.split(" ")[0]} →
                </button>
              </div>
            )}
          </Glass>

          {/* Right Panel: Student Assessment Workspace */}
          {selectedStudent ? (
            <Glass className="form-class-workspace-panel" style={{ padding: "20px 22px" }}>
              {/* Mobile Header with Back Button and Prev/Next Navigation */}
              <div className="form-mobile-nav" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMobileTab("roster")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
                      borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)",
                      color: "var(--foreground)", fontSize: 12, fontWeight: 700, cursor: "pointer"
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
                        borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)",
                        color: "var(--foreground)", opacity: prevStudent ? 1 : 0.35, cursor: prevStudent ? "pointer" : "not-allowed"
                      }}
                      title="Previous Student"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", minWidth: 44, textAlign: "center" }}>
                      {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredStudents.length}` : ""}
                    </span>
                    <button
                      type="button"
                      disabled={!nextStudent}
                      onClick={handleNextStudent}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
                        borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)",
                        color: "var(--foreground)", opacity: nextStudent ? 1 : 0.35, cursor: nextStudent ? "pointer" : "not-allowed"
                      }}
                      title="Next Student"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontFamily: "'Raleway', sans-serif", margin: 0, fontSize: 17, fontWeight: 800, color: "var(--foreground)" }}>
                      {selectedStudent.name}
                    </h2>
                    <button
                      onClick={(e) => openNameEdit(e, selectedStudent)}
                      style={{ background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}40`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: DLHS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Edit2 size={11} /> Correct Name
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, display: "flex", gap: 8 }}>
                    <span>Admission No: <strong>{selectedStudent.admission_number}</strong></span>
                    <span>•</span>
                    <span>Gender: <strong>{selectedStudent.gender || "MALE"}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {saveStatus && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: DLHS.navy, background: "rgba(41, 61, 125, 0.08)", padding: "5px 10px", borderRadius: 6 }}>
                      <CheckCircle2 size={13} /> {saveStatus}
                    </div>
                  )}
                  <button
                    onClick={handlePrintMidterm}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 12px", borderRadius: 8,
                      border: `1px solid ${DLHS.blue}50`, background: "rgba(0, 147, 221, 0.08)",
                      color: DLHS.blue, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                    title="Print Mid-Term Result for this candidate"
                  >
                    <Printer size={13} /> Mid-Term
                  </button>
                  <button
                    onClick={handlePrintReportCard}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 12px", borderRadius: 8,
                      border: "none", background: DLHS.crimson,
                      color: "#ffffff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                    title="Print Official Term Report Card for this candidate"
                  >
                    <Printer size={13} /> Report Card
                  </button>
                  <button
                    onClick={handlePrintTranscript}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "7px 12px", borderRadius: 8,
                      border: "none", background: DLHS.navy,
                      color: "#ffffff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                    title="Print Cumulative Academic Transcript for this candidate"
                  >
                    <GraduationCap size={13} /> Transcript
                  </button>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="form-workspace-tabs-scroller" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 18 }}>
                {[
                  { id: "affective", label: "Affective Character Traits", icon: <Heart size={14} />, color: DLHS.navy },
                  { id: "psychomotor", label: "Psychomotor Capabilities", icon: <Award size={14} />, color: DLHS.blue },
                  { id: "attendance", label: "Attendance & Statutory Awards", icon: <CalendarDays size={14} />, color: DLHS.gold },
                  { id: "comments", label: "Form Teacher Appraisal", icon: <FileText size={14} />, color: DLHS.crimson },
                ].map(t => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                        border: `1.5px solid ${active ? t.color : "transparent"}`,
                        background: active ? `${t.color}15` : "transparent",
                        color: active ? t.color : "var(--muted-foreground)",
                        fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 0.15s ease",
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
                  <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    Standard DLHS behavioral rubric: <strong>1 (Unsatisfactory)</strong> to <strong>5 (Exemplary)</strong>:
                  </div>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--muted)" }}>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Behavioral Metric</th>
                          {[1, 2, 3, 4, 5].map(i => (
                            <th key={i} style={{ width: 44, padding: "8px 4px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center" }}>
                              {i}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {characterTraits.map(t => {
                          const currentScore = (selectedStudent as any)[t.id] || 0;
                          return (
                            <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--foreground)", minWidth: 150 }}>{t.label}</td>
                              {[1, 2, 3, 4, 5].map(v => (
                                <td key={v} style={{ textAlign: "center", padding: "6px 2px" }}>
                                  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, cursor: "pointer", borderRadius: "50%", background: currentScore === v ? "rgba(41, 61, 125, 0.12)" : "transparent" }}>
                                    <input
                                      type="radio"
                                      name={`aff-${selectedStudent.id}-${t.id}`}
                                      checked={currentScore === v}
                                      onChange={() => updateMetric(t.id, v)}
                                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: DLHS.navy }}
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
                  <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    Evaluate physical coordination, artistic creativity and motor skills from <strong>1 (Rudimentary)</strong> to <strong>5 (Proficient)</strong>:
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--muted)" }}>
                          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Skill &amp; Capability</th>
                          {[1, 2, 3, 4, 5].map(i => (
                            <th key={i} style={{ width: 48, padding: "8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center" }}>
                              {i}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {psychomotorSkills.map(s => {
                          const currentScore = (selectedStudent as any)[s.id] || 0;
                          return (
                            <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{s.label}</td>
                              {[1, 2, 3, 4, 5].map(v => (
                                <td key={v} style={{ textAlign: "center", padding: "6px" }}>
                                  <input
                                    type="radio"
                                    name={`psy-${selectedStudent.id}-${s.id}`}
                                    checked={currentScore === v}
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
                </div>
              )}

              {/* TAB 3: Attendance & Awards */}
              {activeTab === "attendance" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ padding: 16, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <CalendarDays size={16} style={{ color: DLHS.navy }} /> Official Term Attendance Register
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        Enter official attendance. Set <strong>Days School Opened</strong> first, enter <strong>Days Absent</strong>, and the system automatically calculates <strong>Days Present</strong>.
                      </div>
                      <button
                        type="button"
                        onClick={handleSetBulkTermDays}
                        style={{
                          padding: "6px 14px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)",
                          border: `1px solid ${DLHS.navy}40`, color: DLHS.navy, fontSize: 12,
                          fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        <CalendarDays size={13} /> Set Term Days for All Students
                      </button>
                    </div>

                    <div className="responsive-grid-3" style={{ gap: 14 }}>
                      {/* 1. Total Days Opened */}
                      <div style={{ padding: 14, borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", marginBottom: 6 }}>
                          1. Days School Opened *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStudent.total_days ?? ""}
                          onChange={e => updateMetric("total_days", e.target.value === "" ? null : parseInt(e.target.value))}
                          placeholder="e.g. 110"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1.5px solid ${DLHS.blue}`, background: "var(--muted)", color: "var(--foreground)", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                        <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 4, display: "block" }}>Total academic school sessions held</span>
                      </div>

                      {/* 2. Days Absent */}
                      <div style={{ padding: 14, borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", marginBottom: 6 }}>
                          2. Days Absent (Default: 0)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStudent.days_absent ?? 0}
                          onChange={e => updateMetric("days_absent", e.target.value === "" ? 0 : parseInt(e.target.value))}
                          placeholder="0"
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1.5px solid ${DLHS.crimson}`, background: "var(--muted)", color: "var(--foreground)", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                        />
                        <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 4, display: "block" }}>Recorded missed sessions</span>
                      </div>

                      {/* 3. Days Present AUTO-CALCULATED */}
                      <div style={{ padding: 14, borderRadius: 8, background: "rgba(41, 61, 125, 0.06)", border: `1px solid ${DLHS.navy}30` }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: DLHS.navy, textTransform: "uppercase", marginBottom: 6 }}>
                          3. Days Present (Calculated)
                        </label>
                        <div style={{
                          padding: "8px 12px", borderRadius: 6, background: "var(--card)",
                          fontSize: 16, fontWeight: 800, color: DLHS.navy, display: "flex", alignItems: "center", justifyContent: "space-between"
                        }}>
                          <span>{selectedStudent.days_present ?? (selectedStudent.total_days ? Math.max(0, selectedStudent.total_days - (selectedStudent.days_absent || 0)) : "—")}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(41, 61, 125, 0.12)", color: DLHS.navy }}>
                            Auto
                          </span>
                        </div>
                        <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 4, display: "block" }}>
                          = Days Opened ({selectedStudent.total_days || 0}) - Absent ({selectedStudent.days_absent ?? 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 16, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <Award size={16} style={{ color: DLHS.gold }} /> Special Commendations &amp; Honours
                    </div>

                    <div className="responsive-grid-2" style={{ gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>
                          Award / Prize 1
                        </label>
                        <input
                          type="text"
                          value={selectedStudent.award_1 ?? "NILL"}
                          onChange={e => updateMetric("award_1", e.target.value)}
                          placeholder="e.g. 1st in Mathematics or NILL"
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>
                          Award / Prize 2
                        </label>
                        <input
                          type="text"
                          value={selectedStudent.award_2 ?? "NILL"}
                          onChange={e => updateMetric("award_2", e.target.value)}
                          placeholder="e.g. Best in Debate or NILL"
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Form Teacher Comments */}
              {activeTab === "comments" && (
                <div>
                  <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 10 }}>
                    Official Form Teacher appraisal inscribed on the student's statutory report card:
                  </div>

                  {/* Comment Presets */}
                  <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", marginRight: 4 }}>
                      <FileText size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Institutional Remarks:
                    </span>
                    {COMMENT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateMetric("class_teacher_comment", preset)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)",
                          background: "var(--muted)", color: "var(--foreground)", fontSize: 11.5, cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = DLHS.navy)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        {preset.slice(0, 34)}…
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={selectedStudent.class_teacher_comment || ""}
                    onChange={e => updateMetric("class_teacher_comment", e.target.value)}
                    placeholder="Write detailed remarks on candidate conduct, moral leadership, academic dedication, and general disposition..."
                    style={{
                      width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "var(--muted)",
                      color: "var(--foreground)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "'Lato', sans-serif"
                    }}
                  />
                </div>
              )}
            </Glass>
          ) : (
            <Glass style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
              Select a student candidate from the left roster to begin assessment.
            </Glass>
          )}
        </div>
      )}

      {/* MODAL 1: Form Teacher Edit Student Name ONLY */}
      {nameModalStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16, 25, 46, 0.65)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.25)", padding: 26, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Edit2 size={16} style={{ color: DLHS.navy }} />
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Correct Student Name</span>
              </div>
              <button onClick={() => setNameModalStudent(null)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(41, 61, 125, 0.06)", border: `1px solid ${DLHS.navy}30`, marginBottom: 14, fontSize: 12, color: "var(--foreground)", lineHeight: 1.5 }}>
              <strong style={{ color: DLHS.navy }}>Form Teacher Authority:</strong> You may correct typographical discrepancies in the candidate's <strong>First Name</strong> and <strong>Last Name</strong>. Admission numbers and institutional records remain secured.
            </div>

            {nameError && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(220,19,123,0.08)", color: DLHS.crimson, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {nameError}
              </div>
            )}

            <form onSubmit={handleSaveStudentName}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 4 }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setNameModalStudent(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingName}
                  style={{ flex: 2, padding: "10px", borderRadius: 6, background: DLHS.navy, border: "none", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: savingName ? "not-allowed" : "pointer" }}
                >
                  {savingName ? "Updating…" : "Commit Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk CSV Upload for Form Class Assessments */}
      {showCsvModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16, 25, 46, 0.65)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.25)", padding: 26, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={16} style={{ color: DLHS.navy }} />
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>
                  Import Assessment CSV — {currentClass?.name}
                </span>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 16 }}>
              Upload your completed template. The system will update behavioral traits, psychomotor skills, attendance days, awards, and teacher remarks for matching students in this class arm.
            </p>

            {csvFeedback && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12.5, fontWeight: 600,
                background: csvFeedback.success ? "rgba(41, 61, 125, 0.08)" : "rgba(220, 19, 123, 0.08)",
                border: `1px solid ${csvFeedback.success ? DLHS.navy : DLHS.crimson}`,
                color: csvFeedback.success ? DLHS.navy : DLHS.crimson,
                display: "flex", alignItems: "center", gap: 8
              }}>
                {csvFeedback.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{csvFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleImportCsv}>
              <div style={{
                border: "2px dashed var(--border)", borderRadius: 12, padding: "26px 16px",
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
                <Upload size={24} style={{ color: DLHS.navy, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                  {csvFile ? csvFile.name : "Select CSV file"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                  {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Supports standard UTF-8 .csv downloaded from this portal"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || importingCsv}
                  style={{
                    flex: 2, padding: "10px", borderRadius: 6,
                    background: (!csvFile || importingCsv) ? "var(--muted)" : DLHS.navy,
                    border: "none", color: (!csvFile || importingCsv) ? "var(--muted-foreground)" : "#ffffff",
                    fontSize: 13, fontWeight: 700, cursor: (!csvFile || importingCsv) ? "not-allowed" : "pointer"
                  }}
                >
                  {importingCsv ? "Processing CSV…" : "Execute Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
