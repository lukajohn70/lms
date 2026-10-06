import { useState, useEffect } from "react";
import { 
  Printer, Download, RefreshCw, Search, Award, TrendingUp, 
  Users, BookOpen, AlertCircle, FileText, ChevronDown 
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

export default function BroadsheetViewer() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // Filters
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [cohortOptions, setCohortOptions] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("3rd Term");
  const [selectedSession, setSelectedSession] = useState<string>("2023/2024");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load classes initially
  useEffect(() => {
    apiClient.get("/admin/broadsheet?class_id=first")
      .then((res: any) => {
        if (res && res.success) {
          const classes = res.available_classes || [];
          const cohorts = res.cohort_options || [];
          setAvailableClasses(classes);
          setCohortOptions(cohorts);

          // If cohorts exist, default to first cohort or first class
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
        console.error("Error fetching initial broadsheet setup", err);
        setError("Failed to load initial class list.");
      });
  }, []);

  // Fetch broadsheet when filters change
  const fetchBroadsheet = () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");

    apiClient.get(`/admin/broadsheet?class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}`)
      .then((res: any) => {
        if (res && res.success) {
          setData(res);
        } else {
          setError(res?.error || "Unable to fetch broadsheet data.");
        }
      })
      .catch((err: any) => {
        console.error("Broadsheet fetch error", err);
        setError(err.message || "Failed to load broadsheet.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedClass) {
      fetchBroadsheet();
    }
  }, [selectedClass, selectedTerm, selectedSession]);

  const token = localStorage.getItem("token") || "";

  const handlePrint = () => {
    const printUrl = `${API_BASE_URL}/admin/broadsheet/print?class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&token=${encodeURIComponent(token)}`;
    window.open(printUrl, "_blank");
  };

  const handleExportCsv = () => {
    const csvUrl = `${API_BASE_URL}/admin/broadsheet/export?class_id=${encodeURIComponent(selectedClass)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&token=${encodeURIComponent(token)}`;
    window.open(csvUrl, "_blank");
  };

  // Filter students by name or admission number search
  const filteredStudents = (data?.students || []).filter((stu: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return stu.name.toLowerCase().includes(q) || stu.admission_number.toLowerCase().includes(q);
  });

  const subjects = data?.subjects || [];
  const summary = data?.summary || {};
  const school = data?.school || {};

  // Score color helper
  const getScoreColor = (sc: number | null) => {
    if (sc === null || sc === undefined) return { color: "#94a3b8", bg: "transparent" };
    if (sc >= 70) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.08)" }; // A
    if (sc >= 60) return { color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.08)" }; // B
    if (sc >= 50) return { color: "#14b8a6", bg: "rgba(20, 184, 166, 0.08)" }; // C
    if (sc >= 45) return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" }; // D
    return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)" }; // F
  };

  // Top statistics
  const totalStudents = data?.students?.length || 0;
  const classAvg = totalStudents > 0
    ? (data.students.reduce((acc: number, s: any) => acc + (s.average || 0), 0) / totalStudents).toFixed(2)
    : "0.00";
  const topStudent = data?.students?.[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Filter & Action Bar */}
      <Glass style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          {/* Filter Dropdowns */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Class / Cohort Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                Class / Cohort
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--card-bg)",
                  color: "var(--heading)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  minWidth: 210
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
                  <optgroup label="Individual Class Arms">
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={String(cls.id)}>
                        {cls.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Term Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                Academic Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                style={{
                  padding: "8px 12px",
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
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                style={{
                  padding: "8px 12px",
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
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>
                Filter Student
              </label>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 10px 8px 30px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    background: "var(--card-bg)",
                    color: "var(--heading)",
                    fontSize: 13,
                    width: 170
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button
              onClick={fetchBroadsheet}
              disabled={loading}
              title="Refresh broadsheet"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--glass-border)",
                background: "var(--muted)",
                color: "var(--heading)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>

            <button
              onClick={handleExportCsv}
              disabled={loading || !data?.students?.length}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(14,165,233,0.3)",
                background: "rgba(14,165,233,0.12)",
                color: "#0ea5e9",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <Download size={14} /> Export CSV
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !data?.students?.length}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(16,185,129,0.3)"
              }}
              title="Print official landscape broadsheet table"
            >
              <Printer size={15} /> Print Broadsheet
            </button>
          </div>
        </div>
      </Glass>

      {/* Overview Stat Badges */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Glass style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--subtext)", fontWeight: 700 }}>STUDENTS ENROLLED</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "var(--heading)" }}>{totalStudents}</div>
            </div>
          </Glass>

          <Glass style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(14,165,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9" }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--subtext)", fontWeight: 700 }}>COHORT AVERAGE</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "var(--heading)" }}>{classAvg}%</div>
            </div>
          </Glass>

          <Glass style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(251,133,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500" }}>
              <Award size={20} />
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "var(--subtext)", fontWeight: 700 }}>TOP PERFORMER</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {topStudent ? `${topStudent.name} (${topStudent.average}%)` : "—"}
              </div>
            </div>
          </Glass>

          <Glass style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--subtext)", fontWeight: 700 }}>SUBJECTS RECORDED</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "var(--heading)" }}>{subjects.length}</div>
            </div>
          </Glass>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#ef4444", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <Glass style={{ padding: 60, textAlign: "center", color: "var(--subtext)" }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px", display: "block", color: "var(--sky)" }} />
          <div>Compiling broadsheet records and ranking student scores...</div>
        </Glass>
      ) : data && (
        /* Main Broadsheet Paper View */
        <Glass style={{ padding: 20, overflow: "hidden" }}>
          {/* School Header Box */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 4 }}>
              {school.logo_url ? (
                <img src={school.logo_url} alt="School Logo" style={{ width: 44, height: 44, objectFit: "contain" }} />
              ) : null}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--heading)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {school.name || "DEEPER LIFE HIGH SCHOOL"}
                </h2>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--subtext)" }}>
                  {school.level_title || "END OF TERM RESULT"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", background: "var(--muted)", borderRadius: 8, fontSize: 11.5, fontWeight: 700, color: "var(--heading)" }}>
              <span>CLASS: <strong>{school.class_title}</strong></span>
              <span>TERM: <strong>{school.term}</strong></span>
              <span>SESSION: <strong>{school.session}</strong></span>
              <span>CAMPUS: <strong>{school.campus}</strong></span>
            </div>
          </div>

          {/* High-density scrollable table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "center" }}>
              <thead>
                {/* Number row (1, 2, 3...) */}
                <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--glass-border)", height: 22 }}>
                  <th style={{ width: 42, minWidth: 42, position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 10 }}></th>
                  <th style={{ width: 220, minWidth: 220, position: "sticky", left: 42, background: "var(--card-bg)", zIndex: 10 }}></th>
                  {subjects.map((sub: any) => (
                    <th key={`idx-${sub.id}`} style={{ width: 34, minWidth: 34, fontSize: 9.5, fontWeight: 700, color: "var(--subtext)" }}>
                      {sub.index}
                    </th>
                  ))}
                  <th style={{ width: 56, minWidth: 56 }}></th>
                  <th colSpan={5} style={{ width: 110, minWidth: 110, fontSize: 9.5, fontWeight: 700, color: "var(--subtext)" }}>
                    GRADES
                  </th>
                </tr>

                {/* Vertical subject header row */}
                <tr style={{ borderBottom: "2px solid var(--glass-border)", height: 130 }}>
                  <th style={{
                    position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 10,
                    verticalAlign: "bottom", padding: "8px 4px", fontSize: 11, fontWeight: 800, color: "var(--heading)",
                    borderRight: "1px solid var(--glass-border)"
                  }}>
                    S/NO
                  </th>
                  <th style={{
                    position: "sticky", left: 42, background: "var(--card-bg)", zIndex: 10,
                    verticalAlign: "bottom", textAlign: "left", padding: "8px 10px", fontSize: 11.5, fontWeight: 800, color: "var(--heading)",
                    borderRight: "2px solid var(--glass-border)"
                  }}>
                    NAME OF STUDENT
                  </th>
                  {subjects.map((sub: any) => (
                    <th key={`hdr-${sub.id}`} style={{
                      height: 130, position: "relative", verticalAlign: "bottom", padding: "0 0 8px 0",
                      borderRight: "1px solid var(--glass-border)"
                    }}>
                      <div style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        whiteSpace: "nowrap",
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "var(--heading)",
                        letterSpacing: 0.3,
                        maxHeight: 120,
                        margin: "0 auto"
                      }}>
                        {sub.name}
                      </div>
                    </th>
                  ))}
                  <th style={{
                    verticalAlign: "bottom", padding: "0 0 8px 0", borderRight: "2px solid var(--glass-border)",
                    height: 130
                  }}>
                    <div style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      fontSize: 10.5,
                      fontWeight: 900,
                      color: "#10b981",
                      letterSpacing: 0.3,
                      margin: "0 auto"
                    }}>
                      AVERAGE
                    </div>
                  </th>
                  <th style={{ width: 22, verticalAlign: "bottom", paddingBottom: 8, fontSize: 10, fontWeight: 800, color: "#10b981" }}>A</th>
                  <th style={{ width: 22, verticalAlign: "bottom", paddingBottom: 8, fontSize: 10, fontWeight: 800, color: "#0ea5e9" }}>B</th>
                  <th style={{ width: 22, verticalAlign: "bottom", paddingBottom: 8, fontSize: 10, fontWeight: 800, color: "#14b8a6" }}>C</th>
                  <th style={{ width: 22, verticalAlign: "bottom", paddingBottom: 8, fontSize: 10, fontWeight: 800, color: "#f59e0b" }}>D</th>
                  <th style={{ width: 22, verticalAlign: "bottom", paddingBottom: 8, fontSize: 10, fontWeight: 800, color: "#ef4444" }}>F</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={2 + subjects.length + 6} style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
                      {searchQuery ? "No students matching your search criteria." : "No student results compiled for this class and term."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu: any) => (
                    <tr
                      key={stu.id}
                      style={{
                        borderBottom: "1px solid var(--glass-border)",
                        height: 25,
                        transition: "background 0.15s"
                      }}
                      className="hover:bg-muted/40"
                    >
                      {/* S/NO (Rank) */}
                      <td style={{
                        position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5,
                        fontWeight: 800, fontSize: 10.5, color: "var(--heading)",
                        borderRight: "1px solid var(--glass-border)"
                      }}>
                        {stu.s_no}
                      </td>

                      {/* Student Name */}
                      <td style={{
                        position: "sticky", left: 42, background: "var(--card-bg)", zIndex: 5,
                        textAlign: "left", padding: "0 8px", fontSize: 10.5, fontWeight: 700, color: "var(--heading)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        borderRight: "2px solid var(--glass-border)"
                      }} title={stu.name}>
                        {stu.name}
                      </td>

                      {/* Subject Scores */}
                      {subjects.map((sub: any) => {
                        const sc = stu.scores[sub.id];
                        const style = getScoreColor(sc);
                        return (
                          <td
                            key={`s-${stu.id}-${sub.id}`}
                            style={{
                              borderRight: "1px solid var(--glass-border)",
                              fontSize: 10,
                              fontWeight: 600,
                              color: style.color,
                              background: style.bg
                            }}
                          >
                            {sc !== null && sc !== undefined ? (
                              Number.isInteger(sc) ? sc : Number(sc).toFixed(1)
                            ) : "—"}
                          </td>
                        );
                      })}

                      {/* Student Average */}
                      <td style={{
                        borderRight: "2px solid var(--glass-border)",
                        fontWeight: 900,
                        fontSize: 11,
                        color: stu.average >= 70 ? "#10b981" : stu.average >= 50 ? "var(--heading)" : "#ef4444",
                        background: "rgba(0,0,0,0.02)"
                      }}>
                        {Number(stu.average).toFixed(2)}
                      </td>

                      {/* Letter Grade Tallies */}
                      <td style={{ fontSize: 9.5, fontWeight: 700, color: "#10b981" }}>{stu.grades?.A || 0}</td>
                      <td style={{ fontSize: 9.5, fontWeight: 700, color: "#0ea5e9" }}>{stu.grades?.B || 0}</td>
                      <td style={{ fontSize: 9.5, fontWeight: 700, color: "#14b8a6" }}>{stu.grades?.C || 0}</td>
                      <td style={{ fontSize: 9.5, fontWeight: 700, color: "#f59e0b" }}>{stu.grades?.D || 0}</td>
                      <td style={{ fontSize: 9.5, fontWeight: 700, color: "#ef4444" }}>{stu.grades?.F || 0}</td>
                    </tr>
                  ))
                )}

                {/* Bottom Subject Summary Statistics */}
                {subjects.length > 0 && (
                  <>
                    <tr style={{ background: "var(--muted)", borderTop: "2px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--muted)", zIndex: 5, textAlign: "left", padding: "6px 10px", fontWeight: 800, fontSize: 10.5, borderRight: "2px solid var(--glass-border)" }}>
                        No of Students
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-cnt-${sub.id}`} style={{ fontWeight: 800, fontSize: 10, borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.student_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6} style={{ background: "var(--muted)" }}></td>
                    </tr>

                    <tr style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5, textAlign: "left", padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--subtext)", borderRight: "2px solid var(--glass-border)" }}>
                        No of A's
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-a-${sub.id}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#10b981", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.a_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6}></td>
                    </tr>

                    <tr style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5, textAlign: "left", padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--subtext)", borderRight: "2px solid var(--glass-border)" }}>
                        No of B's
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-b-${sub.id}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#0ea5e9", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.b_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6}></td>
                    </tr>

                    <tr style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5, textAlign: "left", padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--subtext)", borderRight: "2px solid var(--glass-border)" }}>
                        No of C's
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-c-${sub.id}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#14b8a6", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.c_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6}></td>
                    </tr>

                    <tr style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5, textAlign: "left", padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--subtext)", borderRight: "2px solid var(--glass-border)" }}>
                        No of D's
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-d-${sub.id}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#f59e0b", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.d_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6}></td>
                    </tr>

                    <tr style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--card-bg)", zIndex: 5, textAlign: "left", padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--subtext)", borderRight: "2px solid var(--glass-border)" }}>
                        No of F's
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-f-${sub.id}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#ef4444", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.f_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6}></td>
                    </tr>

                    <tr style={{ background: "var(--muted)", borderTop: "1px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "var(--muted)", zIndex: 5, textAlign: "left", padding: "5px 10px", fontWeight: 800, fontSize: 10, borderRight: "2px solid var(--glass-border)" }}>
                        No of Pass
                      </td>
                      {subjects.map((sub: any) => (
                        <td key={`sum-pass-${sub.id}`} style={{ fontWeight: 800, fontSize: 10, color: "#10b981", borderRight: "1px solid var(--glass-border)" }}>
                          {summary[sub.id]?.pass_count ?? 0}
                        </td>
                      ))}
                      <td colSpan={6} style={{ background: "var(--muted)" }}></td>
                    </tr>

                    <tr style={{ background: "rgba(16,185,129,0.08)", borderTop: "2px solid var(--glass-border)" }}>
                      <td colSpan={2} style={{ position: "sticky", left: 0, background: "rgba(16,185,129,0.14)", zIndex: 5, textAlign: "left", padding: "6px 10px", fontWeight: 900, fontSize: 10.5, color: "#10b981", borderRight: "2px solid var(--glass-border)" }}>
                        % pass
                      </td>
                      {subjects.map((sub: any) => {
                        const pct = summary[sub.id]?.pass_percentage ?? 0;
                        return (
                          <td
                            key={`sum-pct-${sub.id}`}
                            style={{
                              fontWeight: 900,
                              fontSize: 10,
                              color: pct >= 80 ? "#10b981" : pct >= 60 ? "#0ea5e9" : pct >= 50 ? "#f59e0b" : "#ef4444",
                              borderRight: "1px solid var(--glass-border)"
                            }}
                          >
                            {pct}%
                          </td>
                        );
                      })}
                      <td colSpan={6} style={{ background: "rgba(16,185,129,0.08)" }}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Glass>
      )}
    </div>
  );
}
