import { useState, useEffect } from "react";
import { 
  Printer, Search, RefreshCw, AlertCircle, FileText, CheckCircle2, 
  Users, Award, Sparkles, Layers 
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

interface ResultPrintManagerProps {
  mode: "end_of_term" | "midterm";
}

export default function ResultPrintManager({ mode }: ResultPrintManagerProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>({});
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [cohortOptions, setCohortOptions] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("3rd Term");
  const [selectedSession, setSelectedSession] = useState<string>("2023/2024");
  const [cumulative, setCumulative] = useState<"1" | "0">("1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string>("");

  const token = localStorage.getItem("token") || "";

  // Initial load: get classes and cohorts
  useEffect(() => {
    apiClient.get("/admin/broadsheet?class_id=first")
      .then((res: any) => {
        if (res && res.success) {
          const classes = res.available_classes || [];
          const cohorts = res.cohort_options || [];
          setAvailableClasses(classes);
          setCohortOptions(cohorts);

          if (cohorts.length > 0) {
            setSelectedClass(`combined:${cohorts[0]}`);
          } else if (classes.length > 0) {
            setSelectedClass(String(classes[0].id));
          }
          if (res.school?.term) setSelectedTerm(res.school.term);
          if (res.school?.session) setSelectedSession(res.school.session);
        }
      })
      .catch((err) => {
        console.error("Error loading class list", err);
        setError("Failed to load initial class list.");
      });
  }, []);

  // Fetch student roster for the selected class/cohort
  const fetchRoster = () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");

    apiClient.get(`/admin/broadsheet?class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}`)
      .then((res: any) => {
        if (res && res.success) {
          setStudents(res.students || []);
          setSchoolInfo(res.school || {});
        } else {
          setError(res?.error || "Unable to fetch student roster.");
        }
      })
      .catch((err: any) => {
        console.error("Student fetch error", err);
        setError(err.message || "Failed to load students.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedClass) {
      fetchRoster();
    }
  }, [selectedClass, selectedTerm, selectedSession]);

  // Batch Print
  const handleBatchPrint = () => {
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    if (mode === "end_of_term") {
      const url = `${apiBase}/index.php?path=/reports/print&class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&cumulative=${cumulative}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    } else {
      const url = `${apiBase}/index.php?path=/reports/midterm&class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    }
  };

  // Individual Student Print
  const handleStudentPrint = (studentId: number) => {
    const apiBase = API_BASE_URL.replace(/\/index\.php$/, "");
    if (mode === "end_of_term") {
      const url = `${apiBase}/index.php?path=/reports/print&student_id=${studentId}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&cumulative=${cumulative}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    } else {
      const url = `${apiBase}/index.php?path=/reports/midterm&student_id=${studentId}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank");
    }
  };

  // Filter students by query
  const filteredStudents = students.filter((stu: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (stu.name && stu.name.toLowerCase().includes(q)) ||
      (stu.admission_number && stu.admission_number.toLowerCase().includes(q))
    );
  });

  const isEndOfTerm = mode === "end_of_term";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top Banner / Description */}
      <Glass style={{ padding: "18px 24px", background: isEndOfTerm ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(79,70,229,0.03) 100%)" : "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.03) 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: isEndOfTerm ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              boxShadow: isEndOfTerm ? "0 4px 14px rgba(99,102,241,0.35)" : "0 4px 14px rgba(217,119,6,0.35)"
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--heading)", margin: "0 0 3px" }}>
                {isEndOfTerm ? "End-of-Term Report Cards Printing" : "Mid-Term Results Printing"}
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
                {isEndOfTerm
                  ? "Generate official terminal report cards with psychomotor ratings, remarks, and cumulative options"
                  : "Generate continuous assessment & mid-term performance breakdown sheets"}
              </p>
            </div>
          </div>

          {/* Batch Print Button */}
          <button
            onClick={handleBatchPrint}
            disabled={loading || students.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: isEndOfTerm ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading || students.length === 0 ? "not-allowed" : "pointer",
              opacity: loading || students.length === 0 ? 0.6 : 1,
              boxShadow: isEndOfTerm ? "0 4px 16px rgba(99,102,241,0.35)" : "0 4px 16px rgba(217,119,6,0.35)",
              transition: "transform 0.15s, box-shadow 0.15s"
            }}
          >
            <Printer size={16} />
            {isEndOfTerm
              ? `Print Entire Class (${students.length} Report Cards)`
              : `Print Entire Class (${students.length} Mid-Terms)`}
          </button>
        </div>
      </Glass>

      {/* Filter and Option Controls */}
      <Glass style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          {/* Main Dropdowns */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* Class / Cohort Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>
                Class / Cohort Arm
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-bg)",
                  color: "var(--heading)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  minWidth: 220
                }}
              >
                {cohortOptions.length > 0 && (
                  <optgroup label="Combined Cohorts">
                    {cohortOptions.map((c) => (
                      <option key={`combined:${c}`} value={`combined:${c}`}>
                        {c} (Combined)
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableClasses.length > 0 && (
                  <optgroup label="Individual Classes">
                    {availableClasses.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Term Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>
                Academic Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-bg)",
                  color: "var(--heading)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <option value="1st Term">1st Term</option>
                <option value="2nd Term">2nd Term</option>
                <option value="3rd Term">3rd Term</option>
              </select>
            </div>

            {/* Session Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-bg)",
                  color: "var(--heading)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <option value="2023/2024">2023/2024</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            {/* Live Search */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>
                Filter Students
              </label>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
                <input
                  type="text"
                  placeholder="Search name or adm no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "9px 10px 9px 30px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    background: "var(--card-bg)",
                    color: "var(--heading)",
                    fontSize: 13,
                    width: 200
                  }}
                />
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchRoster}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--glass-border)",
              background: "var(--muted)",
              color: "var(--heading)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh List
          </button>
        </div>

        {/* End-of-Term Cumulative Mode Selector */}
        {isEndOfTerm && (
          <div style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Layers size={16} style={{ color: "#6366f1" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>
                  Cumulative Breakdown Setting
                </div>
                <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>
                  Choose whether printed report cards include previous term totals &amp; cumulative averages
                </div>
              </div>
            </div>

            {/* Styled Toggle Pill / Segmented Control */}
            <div style={{
              display: "inline-flex",
              background: "var(--muted)",
              padding: 3,
              borderRadius: 9,
              border: "1px solid var(--glass-border)"
            }}>
              <button
                type="button"
                onClick={() => setCumulative("1")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: cumulative === "1" ? "#6366f1" : "transparent",
                  color: cumulative === "1" ? "#fff" : "var(--subtext)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: cumulative === "1" ? "0 2px 6px rgba(99,102,241,0.3)" : "none"
                }}
              >
                {cumulative === "1" && <CheckCircle2 size={13} />}
                With Cumulative (Standard)
              </button>

              <button
                type="button"
                onClick={() => setCumulative("0")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: cumulative === "0" ? "#0ea5e9" : "transparent",
                  color: cumulative === "0" ? "#fff" : "var(--subtext)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: cumulative === "0" ? "0 2px 6px rgba(14,165,233,0.3)" : "none"
                }}
              >
                {cumulative === "0" && <CheckCircle2 size={13} />}
                Without Cumulative (Current Term Only)
              </button>
            </div>
          </div>
        )}
      </Glass>

      {/* Error state */}
      {error && (
        <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Student Roster Table */}
      <Glass style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} style={{ color: isEndOfTerm ? "#6366f1" : "#d97706" }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>
              Student Roster — {schoolInfo.class_title || "Selected Arm"}
            </span>
            <span style={{ fontSize: 11.5, background: "var(--muted)", padding: "2px 8px", borderRadius: 6, color: "var(--subtext)", fontWeight: 600 }}>
              {filteredStudents.length} Students
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>
            Session: <strong>{selectedSession}</strong> • Term: <strong>{selectedTerm}</strong>
            {isEndOfTerm && (
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, background: cumulative === "1" ? "rgba(99,102,241,0.12)" : "rgba(14,165,233,0.12)", color: cumulative === "1" ? "#6366f1" : "#0ea5e9", fontWeight: 700 }}>
                {cumulative === "1" ? "With Cumulative" : "Without Cumulative"}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--subtext)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
            <div>Loading student roster...</div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--subtext)" }}>
            <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--heading)" }}>No Students Found</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>
              {searchQuery ? "No students matching your search criteria." : "No student records found in this class arm."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--glass-border)", height: 38 }}>
                  <th style={{ width: 60, padding: "0 12px", textAlign: "center", fontWeight: 700, color: "var(--subtext)", fontSize: 11 }}>#</th>
                  <th style={{ padding: "0 14px", textAlign: "left", fontWeight: 700, color: "var(--heading)", fontSize: 11.5 }}>STUDENT NAME</th>
                  <th style={{ width: 160, padding: "0 14px", textAlign: "left", fontWeight: 700, color: "var(--subtext)", fontSize: 11 }}>ADMISSION NO</th>
                  <th style={{ width: 140, padding: "0 14px", textAlign: "center", fontWeight: 700, color: "var(--subtext)", fontSize: 11 }}>ACADEMIC AVG</th>
                  <th style={{ width: 170, padding: "0 16px", textAlign: "right", fontWeight: 700, color: "var(--subtext)", fontSize: 11 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((stu: any, idx: number) => {
                  const avg = stu.average !== null && stu.average !== undefined ? Number(stu.average).toFixed(2) : "—";
                  const numAvg = parseFloat(avg);
                  const avgColor = isNaN(numAvg) ? "var(--subtext)" : numAvg >= 70 ? "#10b981" : numAvg >= 60 ? "#0ea5e9" : numAvg >= 50 ? "#14b8a6" : numAvg >= 45 ? "#f59e0b" : "#ef4444";

                  return (
                    <tr
                      key={stu.id}
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        height: 44,
                        transition: "background 0.15s"
                      }}
                      className="hover:bg-muted/40"
                    >
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--subtext)", fontSize: 11 }}>
                        {stu.s_no || idx + 1}
                      </td>
                      <td style={{ padding: "0 14px", fontWeight: 600, color: "var(--heading)" }}>
                        {stu.name}
                      </td>
                      <td style={{ padding: "0 14px", color: "var(--subtext)", fontSize: 12, fontFamily: "monospace" }}>
                        {stu.admission_number || "—"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: avgColor }}>
                        {avg !== "—" ? `${avg}%` : "—"}
                      </td>
                      <td style={{ padding: "0 16px", textAlign: "right" }}>
                        <button
                          onClick={() => handleStudentPrint(stu.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: isEndOfTerm ? "none" : "1px solid #d97706",
                            background: isEndOfTerm
                              ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                              : "rgba(217, 119, 6, 0.12)",
                            color: isEndOfTerm ? "#fff" : "#d97706",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: isEndOfTerm ? "0 2px 8px rgba(99,102,241,0.25)" : "none"
                          }}
                          title={`Print ${isEndOfTerm ? "Report Card" : "Mid-Term"} for ${stu.name}`}
                        >
                          <Printer size={13} />
                          {isEndOfTerm ? "Print Report Card" : "Print Mid-Term"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  );
}
