import { useState, useEffect } from "react";
import {
  GraduationCap, Search, Printer, AlertCircle, RefreshCw,
  Copy, ExternalLink, Check, Eye, Award, Layers,
  ChevronRight, Calendar
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    backdropFilter: "blur(20px)",
    borderRadius: 14,
    boxShadow: "var(--glass-shadow)",
    ...style
  }}>
    {children}
  </div>
);

type ScopeType = "all" | "senior" | "junior";

export default function TranscriptManager() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [cohortOptions, setCohortOptions] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scope, setScope] = useState<ScopeType>("all");
  const [official, setOfficial] = useState<boolean>(true);
  const [watermark, setWatermark] = useState<boolean>(true);

  // Selected student for live preview
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const token = localStorage.getItem("token") || "";

  // 1. Fetch Students & Classes
  const fetchStudents = () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (selectedClass && selectedClass !== "all") params.append("class_id", selectedClass);
    if (searchQuery.trim()) params.append("q", searchQuery.trim());

    apiClient.get(`/admin/transcript/students?${params.toString()}`)
      .then((res: any) => {
        if (res && res.success) {
          setStudents(res.students || []);
          if (res.classes && classes.length === 0) setClasses(res.classes);
          if (res.cohort_options && cohortOptions.length === 0) setCohortOptions(res.cohort_options);

          // Auto-select first student if none selected
          if (!selectedStudent && res.students && res.students.length > 0) {
            handleSelectStudent(res.students[0]);
          } else if (res.students && res.students.length === 0) {
            setSelectedStudent(null);
            setPreviewData(null);
          }
        } else {
          setError(res?.error || "Failed to load students list.");
        }
      })
      .catch((err: any) => {
        console.error("Student list error", err);
        setError(err.message || "Failed to load students.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  // Handle Search submit / enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  // 2. Select student and load transcript payload
  const handleSelectStudent = (stu: any) => {
    setSelectedStudent(stu);
    setPreviewLoading(true);
    apiClient.get(`/transcript/data?student_id=${stu.id}&scope=${scope}`)
      .then((res: any) => {
        if (res && res.success) {
          setPreviewData(res.transcript);
        } else {
          setPreviewData(null);
        }
      })
      .catch((err: any) => {
        console.error("Transcript preview error", err);
        setPreviewData(null);
      })
      .finally(() => setPreviewLoading(false));
  };

  // Re-fetch preview data when scope changes
  useEffect(() => {
    if (selectedStudent) {
      setPreviewLoading(true);
      apiClient.get(`/transcript/data?student_id=${selectedStudent.id}&scope=${scope}`)
        .then((res: any) => {
          if (res && res.success) {
            setPreviewData(res.transcript);
          }
        })
        .finally(() => setPreviewLoading(false));
    }
  }, [scope]);

  // 3. Print Single Transcript
  const handlePrintStudent = (studentId?: number) => {
    const sId = studentId || selectedStudent?.id;
    if (!sId) return;
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/transcript&student_id=${sId}&scope=${scope}&official=${official ? "1" : "0"}&watermark=${watermark ? "1" : "0"}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // 4. Batch Print Entire Class/Cohort
  const handleBatchPrint = () => {
    if (!selectedClass || selectedClass === "all") {
      alert("Please select a specific Class or Cohort to perform batch printing.");
      return;
    }
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/reports/transcript&class_id=${encodeURIComponent(selectedClass)}&scope=${scope}&official=${official ? "1" : "0"}&watermark=${watermark ? "1" : "0"}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  // Copy Verification Link
  const handleCopyVerification = (ref: string) => {
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    const url = `${apiBase}/index.php?path=/transcript/verify&ref=${encodeURIComponent(ref)}`;
    navigator.clipboard.writeText(url);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Control Banner */}
      <Glass style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#293d7d",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)"
              }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", margin: 0 }}>
                  Official Academic Transcript Generator
                </h2>
                <p style={{ fontSize: 11.5, color: "var(--subtext)", margin: "2px 0 0" }}>
                  Generate, authenticate, and print multi-year cumulative records of academic achievement
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Scope Filter */}
            <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
              {[
                { id: "all" as ScopeType, label: "All Sessions" },
                { id: "senior" as ScopeType, label: "Senior Sec (SS1-3)" },
                { id: "junior" as ScopeType, label: "Junior Sec (Basic 7-9)" }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 6, border: "none",
                    background: scope === s.id ? "#293d7d" : "transparent",
                    color: scope === s.id ? "#fff" : "var(--subtext)",
                    fontSize: 11.5, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Print Buttons */}
            <button
              onClick={() => handlePrintStudent()}
              disabled={!selectedStudent}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
                background: "#293d7d", color: "#fff",
                border: "none", cursor: selectedStudent ? "pointer" : "not-allowed",
                fontSize: 12.5, fontWeight: 700, opacity: selectedStudent ? 1 : 0.5,
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)"
              }}
            >
              <Printer size={14} /> Print Selected Transcript
            </button>

            {selectedClass !== "all" && (
              <button
                onClick={handleBatchPrint}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
                  background: "linear-gradient(135deg, #293d7d, #047857)", color: "#fff",
                  border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)"
                }}
              >
                <Layers size={14} /> Batch Print Class ({students.length})
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Class Filter */}
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Filter by Class / Cohort
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 8,
                border: "1px solid var(--glass-border)", background: "var(--muted)",
                color: "var(--heading)", fontSize: 12, outline: "none", cursor: "pointer"
              }}
            >
              <option value="all">All Classes &amp; Cohorts</option>
              <optgroup label="Combined Cohorts">
                {cohortOptions.map(co => (
                  <option key={`combined:${co}`} value={`combined:${co}`}>{co} (All Arms Combined)</option>
                ))}
              </optgroup>
              <optgroup label="Specific Arms">
                {classes.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Search Student
            </label>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
                <input
                  type="text"
                  placeholder="Search by name, admission no, or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "7px 10px 7px 32px", borderRadius: 8,
                    border: "1px solid var(--glass-border)", background: "var(--muted)",
                    color: "var(--heading)", fontSize: 12, outline: "none"
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "7px 14px", borderRadius: 8, background: "var(--muted)",
                  border: "1px solid var(--glass-border)", color: "var(--heading)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}
              >
                Search
              </button>
            </form>
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", paddingTop: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={official}
                onChange={e => setOfficial(e.target.checked)}
                style={{ accentColor: "#293d7d" }}
              />
              Official Seal &amp; Signature
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={watermark}
                onChange={e => setWatermark(e.target.checked)}
                style={{ accentColor: "#293d7d" }}
              />
              School Crest Watermark
            </label>
          </div>
        </div>
      </Glass>

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
          color: "#ef4444", fontSize: 12.5, fontWeight: 600
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main Split Layout: Student List (Left) & Live Preview (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18, alignItems: "start" }}>
        
        {/* Left Column: Student Roster */}
        <Glass style={{ padding: "14px 16px", maxHeight: "calc(100vh - 260px)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--heading)" }}>
              Student Roster ({students.length})
            </div>
            <button
              onClick={fetchStudents}
              title="Refresh list"
              style={{ background: "transparent", border: "none", color: "var(--subtext)", cursor: "pointer", display: "flex" }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--subtext)", fontSize: 12 }}>
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--subtext)", fontSize: 12 }}>
                No students found matching current filters.
              </div>
            ) : (
              students.map(stu => {
                const isSelected = selectedStudent?.id === stu.id;
                return (
                  <div
                    key={stu.id}
                    onClick={() => handleSelectStudent(stu)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${isSelected ? "#293d7d" : "var(--glass-border)"}`,
                      background: isSelected ? "rgba(139, 92, 246, 0.15)" : "var(--muted)",
                      transition: "all 0.18s", display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isSelected ? "#293d7d" : "var(--glass-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isSelected ? "#fff" : "var(--heading)", fontSize: 11, fontWeight: 800
                      }}>
                        {stu.first_name ? stu.first_name[0] : "S"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: "var(--heading)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                        }}>
                          {stu.last_name} {stu.first_name}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--subtext)", display: "flex", gap: 6, marginTop: 1 }}>
                          <span>{stu.admission_number || "No ID"}</span>
                          <span>•</span>
                          <span>{stu.class_name || "Unassigned"}</span>
                        </div>
                        {stu.sessions_count > 0 && (
                          <div style={{ fontSize: 9.5, color: "#293d7d", fontWeight: 700, marginTop: 2 }}>
                            {stu.sessions_count} Academic Session(s)
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: isSelected ? "#293d7d" : "var(--subtext)", flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        </Glass>

        {/* Right Column: Live Interactive Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!selectedStudent ? (
            <Glass style={{ padding: 48, textAlign: "center", color: "var(--subtext)" }}>
              <GraduationCap size={48} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#293d7d" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--heading)" }}>
                Select a student to inspect transcript
              </div>
              <p style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>
                Choose a student from the left roster or filter by class to preview cumulative academic performance.
              </p>
            </Glass>
          ) : previewLoading ? (
            <Glass style={{ padding: 48, textAlign: "center", color: "var(--subtext)" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Compiling cumulative transcript records...</div>
            </Glass>
          ) : !previewData || !previewData.sessions || previewData.sessions.length === 0 ? (
            <Glass style={{ padding: 48, textAlign: "center", color: "var(--subtext)" }}>
              <AlertCircle size={36} style={{ margin: "0 auto 12px", color: "#d4af37" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>
                No published grade records found for {selectedStudent.first_name} {selectedStudent.last_name} in this scope.
              </div>
              <p style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>
                Try selecting "All Sessions" or ensure the student's terminal grades have been published.
              </p>
            </Glass>
          ) : (
            <>
              {/* Summary KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <Glass style={{ padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--subtext)", textTransform: "uppercase" }}>
                    Cumulative Average
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#293d7d", marginTop: 2 }}>
                    {previewData.cumulative_summary.overall_average}%
                  </div>
                  <div style={{ fontSize: 10, color: "#293d7d", fontWeight: 700, marginTop: 1 }}>
                    Grade {previewData.cumulative_summary.overall_grade}
                  </div>
                </Glass>

                <Glass style={{ padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--subtext)", textTransform: "uppercase" }}>
                    Standing / Division
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--heading)", marginTop: 4 }}>
                    {previewData.cumulative_summary.overall_classification}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--subtext)", marginTop: 2 }}>
                    CGPA: {previewData.cumulative_summary.cgpa_5_point} / 5.0
                  </div>
                </Glass>

                <Glass style={{ padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--subtext)", textTransform: "uppercase" }}>
                    Sessions Attended
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#0093dd", marginTop: 2 }}>
                    {previewData.cumulative_summary.total_sessions_completed}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--subtext)", marginTop: 1 }}>
                    Academic Years
                  </div>
                </Glass>

                <Glass style={{ padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--subtext)", textTransform: "uppercase" }}>
                    Credits Earned
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#10B981", marginTop: 2 }}>
                    {previewData.cumulative_summary.total_credits_earned}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--subtext)", marginTop: 1 }}>
                    of {previewData.cumulative_summary.total_subjects_evaluated} evaluated
                  </div>
                </Glass>

                <Glass style={{ padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                    Reference Code
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--heading)", marginTop: 2 }}>
                    {previewData.verification.reference_number}
                  </div>
                  <button
                    onClick={() => handleCopyVerification(previewData.verification.reference_number)}
                    style={{
                      background: "transparent", border: "none", color: "#293d7d",
                      fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex",
                      alignItems: "center", gap: 3, marginTop: 4
                    }}
                  >
                    {copiedRef ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Link</>}
                  </button>
                </Glass>
              </div>

              {/* Document Sheet Live Preview */}
              <Glass style={{ padding: 24, overflowX: "auto" }}>
                <div style={{
                  background: "#fff", color: "#0f172a", borderRadius: 8, padding: "20px 24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 640,
                  border: "2px double #293d7d", position: "relative"
                }}>
                  {/* Watermark in preview */}
                  {watermark && (
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                      width: 220, height: 220, backgroundImage: `url(${previewData.school.logo_url || '/favicon.png'})`,
                      backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain",
                      opacity: 0.04, pointerEvents: "none"
                    }} />
                  )}

                  {/* Header */}
                  <div style={{ borderBottom: "2px solid #293d7d", paddingBottom: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img
                        src={previewData.school.logo_url || "/favicon.png"}
                        alt="Logo"
                        style={{ width: 56, height: 56, objectFit: "contain" }}
                      />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", textTransform: "uppercase" }}>
                          {previewData.school.name}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                          {previewData.school.campus}
                        </div>
                        <div style={{ fontSize: 8.5, color: "#475569" }}>
                          {previewData.school.address}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        display: "inline-block", padding: "4px 8px", borderRadius: 4,
                        border: "1px solid #293d7d", background: "#f8fafc", textAlign: "center"
                      }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: "#293d7d", textTransform: "uppercase" }}>
                          {official ? "OFFICIAL TRANSCRIPT" : "STUDENT COPY"}
                        </div>
                        <div style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                          {previewData.verification.reference_number}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Details Box */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6,
                    background: "rgba(41,61,125,0.04)", border: "1px solid rgba(41,61,125,0.15)", borderRadius: 6,
                    padding: "8px 12px", marginBottom: 14, fontSize: 9.5
                  }}>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>STUDENT NAME:</span> <strong>{previewData.student.full_name}</strong></div>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>ADMISSION NO:</span> <strong>{previewData.student.admission_number}</strong></div>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>GENDER:</span> <strong>{previewData.student.gender}</strong></div>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>CLASS:</span> <strong>{previewData.student.current_class}</strong></div>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>HOUSE:</span> <strong>{previewData.student.house}</strong></div>
                    <div><span style={{ color: "#6b21a8", fontWeight: 700 }}>DATE ISSUED:</span> <strong>{previewData.verification.date_issued}</strong></div>
                  </div>

                  {/* Sessions Tables */}
                  {previewData.sessions.map((sess: any) => (
                    <div key={sess.session_name} style={{ marginBottom: 14, border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{
                        background: "rgba(41,61,125,0.08)", padding: "4px 10px", display: "flex",
                        justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1"
                      }}>
                        <span style={{ fontWeight: 800, fontSize: 10, color: "#16234b", textTransform: "uppercase" }}>
                          {sess.session_name} SESSION — {sess.class_name}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#293d7d" }}>
                          Average: {sess.average_score}% • {sess.promotion_status}
                        </span>
                      </div>

                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", color: "#334155", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                            <th style={{ padding: "4px 8px", textAlign: "left" }}>SUBJECT</th>
                            <th style={{ padding: "4px 6px" }}>1ST TERM</th>
                            <th style={{ padding: "4px 6px" }}>2ND TERM</th>
                            <th style={{ padding: "4px 6px" }}>3RD TERM</th>
                            <th style={{ padding: "4px 6px", background: "rgba(41,61,125,0.08)", color: "#312e81" }}>ANNUAL AVG</th>
                            <th style={{ padding: "4px 6px", background: "rgba(41,61,125,0.08)", color: "#312e81" }}>GRADE</th>
                            <th style={{ padding: "4px 6px", background: "rgba(41,61,125,0.08)", color: "#312e81" }}>REMARK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sess.subjects.map((sb: any) => (
                            <tr key={sb.subject} style={{ borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                              <td style={{ padding: "3px 8px", textAlign: "left", fontWeight: 700, color: "#0f172a" }}>
                                {sb.subject}
                              </td>
                              <td style={{ padding: "3px 6px" }}>{sb.terms["1st Term"] ? sb.terms["1st Term"].score : "—"}</td>
                              <td style={{ padding: "3px 6px" }}>{sb.terms["2nd Term"] ? sb.terms["2nd Term"].score : "—"}</td>
                              <td style={{ padding: "3px 6px" }}>{sb.terms["3rd Term"] ? sb.terms["3rd Term"].score : "—"}</td>
                              <td style={{ padding: "3px 6px", fontWeight: 800, background: "rgba(41,61,125,0.04)", color: "#293d7d" }}>
                                {sb.annual_average}
                              </td>
                              <td style={{ padding: "3px 6px", fontWeight: 800, background: "rgba(41,61,125,0.04)" }}>
                                {sb.annual_grade}
                              </td>
                              <td style={{ padding: "3px 6px", fontSize: 7.5, fontWeight: 700, background: "rgba(41,61,125,0.04)" }}>
                                {sb.annual_remark}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                  {/* Signatures & Seal Box */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, paddingTop: 10, borderTop: "1px dashed #cbd5e1" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ borderTop: "1px solid #0f172a", paddingTop: 3, width: 140, fontSize: 8.5, fontWeight: 700 }}>
                        EXAMINATION OFFICER
                      </div>
                      <div style={{ fontSize: 7.5, color: "#64748b" }}>Records &amp; Transcripts</div>
                    </div>

                    {official && (
                      <div style={{
                        width: 64, height: 44, borderRadius: "50%", border: "1px dashed #94a3b8",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 6.5, fontWeight: 800, color: "#94a3b8", textAlign: "center"
                      }}>
                        OFFICIAL<br/>SEAL
                      </div>
                    )}

                    <div style={{ textAlign: "center" }}>
                      <div style={{ borderTop: "1px solid #0f172a", paddingTop: 3, width: 140, fontSize: 8.5, fontWeight: 700 }}>
                        {previewData.verification.principal_name}
                      </div>
                      <div style={{ fontSize: 7.5, color: "#64748b" }}>Principal &amp; CAO</div>
                    </div>
                  </div>
                </div>
              </Glass>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
