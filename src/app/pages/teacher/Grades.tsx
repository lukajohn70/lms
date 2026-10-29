import { useState, useEffect, useRef } from "react";
import {
  Save, CheckCircle, TrendingUp, Award, BookOpen, Send, Lock,
  AlertCircle, RotateCcw, X, Download, Upload, FileSpreadsheet,
  Clock, FileText, CheckCircle2
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";

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

const getMidRemark = (total: number) => {
  if (total >= 18) return { text: "EXCELLENT", color: DLHS.navy, bg: "rgba(41, 61, 125, 0.12)" };
  if (total >= 14) return { text: "VERY GOOD", color: DLHS.blue, bg: "rgba(0, 147, 221, 0.12)" };
  if (total >= 12) return { text: "GOOD", color: DLHS.gold, bg: "rgba(212, 175, 55, 0.14)" };
  if (total >= 10) return { text: "FAIR", color: "#D97706", bg: "rgba(217, 119, 6, 0.12)" };
  return { text: "POOR", color: DLHS.crimson, bg: "rgba(220, 19, 123, 0.12)" };
};

const getLetterGrade = (total: number) => {
  if (total >= 80) return { grade: "A1", text: "DISTINCTION", color: DLHS.navy };
  if (total >= 70) return { grade: "B3", text: "VERY GOOD", color: DLHS.blue };
  if (total >= 60) return { grade: "C5", text: "CREDIT", color: DLHS.gold };
  if (total >= 50) return { grade: "D7", text: "PASS", color: "#D97706" };
  if (total >= 45) return { grade: "E8", text: "PASS", color: "#D97706" };
  return { grade: "F9", text: "FAIL", color: DLHS.crimson };
};

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
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

export default function Grades() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("3rd Term");
  const [sessions] = useState<string[]>(["2026/2027", "2025/2026", "2024/2025", "2023/2024"]);
  const [selectedSession, setSelectedSession] = useState<string>("2026/2027");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"mid_term" | "end_of_term">("end_of_term");
  const [courseStatus, setCourseStatus] = useState<string>("draft");

  // Reopen request modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [reopenSent, setReopenSent] = useState(false);

  const loadGrades = () => {
    setLoading(true);
    const query = `?term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}${selectedCourseId ? `&course_id=${selectedCourseId}` : ""}${selectedClassId ? `&class_id=${selectedClassId}` : ""}`;
    apiClient.get(`/teacher/grades${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        setClasses(res.classes || []);
        if (res.selected_course_id) {
          setSelectedCourseId(res.selected_course_id);
        } else if (res.courses && res.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(res.courses[0].id);
        }
        if (res.result_mode) {
          setActiveTab(res.result_mode);
        }
        if (res.course_status) {
          setCourseStatus(res.course_status);
        }
        setStudents(res.students || []);
      })
      .catch(err => console.error("Error loading grades", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGrades();
  }, [selectedCourseId, selectedTerm, selectedSession, selectedClassId]);

  const SCORE_LIMITS: Record<string, { max: number; label: string }> = {
    assignment_score: { max: 5, label: "Assignment (/5)" },
    project_score: { max: 5, label: "Project (/5)" },
    mid_term_test: { max: 10, label: "Mid-Term Test (/10)" },
    ca1: { max: 20, label: "CA 1 (/20)" },
    ca2: { max: 20, label: "CA 2 (/20)" },
    exam: { max: 60, label: "Exam (/60)" }
  };

  const updateField = (studentId: number, field: string, val: string) => {
    if (courseStatus === "published") return;
    const cleanVal = val.replace(/[^0-9.]/g, "");

    // Avoid multiple dots
    const parts = cleanVal.split(".");
    if (parts.length > 2) return;
    // Limit decimal precision to 2 decimal places while typing
    if (parts[1] && parts[1].length > 2) return;

    const num = parseFloat(cleanVal);
    const limit = SCORE_LIMITS[field];
    if (limit && cleanVal !== "" && !isNaN(num)) {
      if (num < 0) {
        alert("Invalid score: Score cannot be negative.");
        return;
      }
      if (num > limit.max) {
        alert(`Invalid score: Maximum allowed for ${limit.label} is ${limit.max}. You entered ${num}. Entry has been prevented.`);
        return;
      }
    }
    
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      
      const updated = { ...s, [field]: cleanVal };
      
      const asgn = parseFloat(updated.assignment_score) || 0;
      const proj = parseFloat(updated.project_score) || 0;
      const test = parseFloat(updated.mid_term_test) || 0;
      const midTotal = Number((asgn + proj + test).toFixed(2));
      
      updated.ca1 = String(midTotal.toFixed(2));
      
      const ca2 = parseFloat(updated.ca2) || 0;
      const exam = parseFloat(updated.exam) || 0;
      
      if (activeTab === "mid_term") {
        updated.score = Number(midTotal.toFixed(2));
      } else {
        updated.score = Number((midTotal + ca2 + exam).toFixed(2));
      }
      
      return updated;
    }));
  };

  const validateScores = () => {
    let hasError = false;
    students.forEach(s => {
      const asgn = parseFloat(s.assignment_score) || 0;
      const proj = parseFloat(s.project_score) || 0;
      const test = parseFloat(s.mid_term_test) || 0;
      const ca2 = parseFloat(s.ca2) || 0;
      const exam = parseFloat(s.exam) || 0;

      if (asgn > 5 || proj > 5 || test > 10 || ca2 > 20 || exam > 60 || asgn < 0 || proj < 0 || test < 0 || ca2 < 0 || exam < 0) {
        hasError = true;
      }
    });
    return !hasError;
  };

  const handleSave = (targetStatus: "draft" | "submitted" = "draft") => {
    if (!selectedCourseId) return;

    if (!validateScores()) {
      alert("Invalid Score Limits: Please verify that all scores are within maximum bounds!");
      return;
    }

    apiClient.post("/teacher/grades/save", {
      course_id: selectedCourseId,
      class_id: selectedClassId,
      term: selectedTerm,
      session: selectedSession,
      status: targetStatus,
      grades: students.map(s => ({
        student_id: s.id,
        class_id: s.class_id,
        assignment_score: s.assignment_score !== "" && s.assignment_score !== null ? Number(parseFloat(s.assignment_score).toFixed(2)) : "",
        project_score: s.project_score !== "" && s.project_score !== null ? Number(parseFloat(s.project_score).toFixed(2)) : "",
        mid_term_test: s.mid_term_test !== "" && s.mid_term_test !== null ? Number(parseFloat(s.mid_term_test).toFixed(2)) : "",
        ca2: s.ca2 !== "" && s.ca2 !== null ? Number(parseFloat(s.ca2).toFixed(2)) : "",
        exam: s.exam !== "" && s.exam !== null ? Number(parseFloat(s.exam).toFixed(2)) : "",
        remarks: s.remarks || ""
      }))
    })
      .then(() => {
        setCourseStatus(targetStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((err: any) => alert(err.message || "Error saving grades"));
  };

  const handleSubmitForApproval = () => {
    if (!selectedCourseId) return;

    if (!validateScores()) {
      alert("Please check score bounds before submitting.");
      return;
    }

    if (!confirm("Are you ready to submit these grades to Administration for approval?")) return;

    // First save then submit
    apiClient.post("/teacher/grades/save", {
      course_id: selectedCourseId,
      class_id: selectedClassId,
      term: selectedTerm,
      session: selectedSession,
      status: "submitted",
      grades: students.map(s => ({
        student_id: s.id,
        class_id: s.class_id,
        assignment_score: s.assignment_score,
        project_score: s.project_score,
        mid_term_test: s.mid_term_test,
        ca2: s.ca2,
        exam: s.exam,
        remarks: s.remarks || ""
      }))
    })
      .then(() => {
        return apiClient.post("/teacher/grades/submit", {
          course_id: selectedCourseId,
          class_id: selectedClassId,
          term: selectedTerm,
          session: selectedSession
        });
      })
      .then(() => {
        setCourseStatus("submitted");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      })
      .catch((err: any) => alert(err.message || "Failed to submit grades"));
  };

  const handleRequestReopen = async () => {
    if (!selectedCourseId) return;
    setReopenLoading(true);
    try {
      const res: any = await apiClient.post("/teacher/grades/request-reopen", {
        course_id: selectedCourseId,
        class_id: selectedClassId,
        term: selectedTerm,
        session: selectedSession,
        reason: reopenReason.trim() || "Teacher requested grade sheet reopening for adjustments."
      });
      if (res.success) {
        setCourseStatus("reopen_requested");
        setReopenSent(true);
        setShowReopenModal(false);
        setReopenReason("");
        setTimeout(() => setReopenSent(false), 5000);
      }
    } catch (err: any) {
      alert(err.message || "Failed to send reopen request.");
    } finally {
      setReopenLoading(false);
    }
  };

  // CSV Template & Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState("");
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const handleDownloadTemplate = (type: "midterm" | "ca2only" | "endofterm") => {
    if (!students || students.length === 0) {
      alert("No students enrolled in this course to generate a template for.");
      return;
    }
    setShowTemplateMenu(false);
    const currentCourse = courses.find(c => c.id === selectedCourseId);
    const subjectName = currentCourse?.name || "Subject";
    const subjectSlug = subjectName.replace(/[^a-zA-Z0-9]/g, "_");
    const termSlug = selectedTerm.replace(/\s+/g, "_");

    let headers: string[];
    let rows: (string | number)[][];
    let fileSuffix: string;

    if (type === "midterm") {
      headers = ["Student ID", "Student Number", "Student Name", "Subject", "Assignment (/5)", "Project (/5)", "Mid-Term Test (/10)"];
      rows = students.map(s => [
        s.id,
        `"${(s.student_number || "").replace(/"/g, '""')}"`,
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${subjectName.replace(/"/g, '""')}"`,
        s.assignment_score || "",
        s.project_score || "",
        s.mid_term_test || ""
      ]);
      fileSuffix = "MidTerm";
    } else if (type === "ca2only") {
      headers = ["Student ID", "Student Number", "Student Name", "Subject", "CA 2 (/20)"];
      rows = students.map(s => [
        s.id,
        `"${(s.student_number || "").replace(/"/g, '""')}"`,
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${subjectName.replace(/"/g, '""')}"`,
        s.ca2 || ""
      ]);
      fileSuffix = "CA2";
    } else {
      headers = ["Student ID", "Student Number", "Student Name", "Subject", "CA 2 (/20)", "Exam (/60)"];
      rows = students.map(s => [
        s.id,
        `"${(s.student_number || "").replace(/"/g, '""')}"`,
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${subjectName.replace(/"/g, '""')}"`,
        s.ca2 || "",
        s.exam || ""
      ]);
      fileSuffix = "EndOfTerm";
    }

    const filename = `${subjectSlug}_${termSlug}_${fileSuffix}_Template.csv`;
    const csvContent = "\uFEFF" + [
      `# Deeper Life High School Grade Mark Sheet`,
      `# Subject: ${subjectName} | Term: ${selectedTerm} | Session: ${selectedSession}`,
      `# Scores precision: 2 decimal places. Limits: Asgn (5), Proj (5), Test (10), CA2 (20), Exam (60)`,
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (!text) throw new Error("Empty CSV file");

        const rawLines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
        const lines = rawLines.filter(l => !l.startsWith("#"));
        if (lines.length < 2) throw new Error("CSV file contains no data rows");

        const parseLine = (line: string) => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(s => s.replace(/^["']|["']$/g, "").trim());
        };

        const headerLine = lines[0];
        const headers = parseLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        
        const findCol = (keys: string[]) => {
          for (const k of keys) {
            const idx = headers.findIndex(h => h.includes(k));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const idIdx = findCol(["studentid", "id"]);
        const numIdx = findCol(["studentnumber", "admissionnumber", "regnumber", "number"]);
        const nameIdx = findCol(["studentname", "name", "fullname"]);
        const asgnIdx = findCol(["assignment", "asgn"]);
        const projIdx = findCol(["project", "proj"]);
        const testIdx = findCol(["midtermtest", "test"]);
        const ca2Idx = findCol(["ca2", "continuousassessment2"]);
        const examIdx = findCol(["exam", "examinationscore"]);

        let matchCount = 0;

        setStudents(prev => {
          return prev.map(s => {
            for (let i = 1; i < lines.length; i++) {
              const row = parseLine(lines[i]);
              let isMatch = false;

              if (idIdx !== -1 && row[idIdx] && String(row[idIdx]) === String(s.id)) {
                isMatch = true;
              } else if (numIdx !== -1 && row[numIdx] && s.student_number && row[numIdx].toLowerCase() === s.student_number.toLowerCase()) {
                isMatch = true;
              } else if (nameIdx !== -1 && row[nameIdx] && s.name && row[nameIdx].toLowerCase() === s.name.toLowerCase()) {
                isMatch = true;
              }

              if (isMatch) {
                matchCount++;
                const rawAsgn = asgnIdx !== -1 && row[asgnIdx] !== undefined ? row[asgnIdx].replace(/[^0-9.]/g, "") : s.assignment_score;
                const rawProj = projIdx !== -1 && row[projIdx] !== undefined ? row[projIdx].replace(/[^0-9.]/g, "") : s.project_score;
                const rawTest = testIdx !== -1 && row[testIdx] !== undefined ? row[testIdx].replace(/[^0-9.]/g, "") : s.mid_term_test;
                const rawCa2  = ca2Idx !== -1 && row[ca2Idx] !== undefined ? row[ca2Idx].replace(/[^0-9.]/g, "") : s.ca2;
                const rawExam = examIdx !== -1 && row[examIdx] !== undefined ? row[examIdx].replace(/[^0-9.]/g, "") : s.exam;

                const a = Math.min(5, Math.max(0, parseFloat(rawAsgn) || 0));
                const p = Math.min(5, Math.max(0, parseFloat(rawProj) || 0));
                const t = Math.min(10, Math.max(0, parseFloat(rawTest) || 0));
                const c2 = Math.min(20, Math.max(0, parseFloat(rawCa2) || 0));
                const ex = Math.min(60, Math.max(0, parseFloat(rawExam) || 0));

                const midTotal = Number((a + p + t).toFixed(2));
                const score = activeTab === "mid_term" ? midTotal : Number((midTotal + c2 + ex).toFixed(2));

                return {
                  ...s,
                  assignment_score: a.toFixed(2),
                  project_score: p.toFixed(2),
                  mid_term_test: t.toFixed(2),
                  ca1: String(midTotal.toFixed(2)),
                  ca2: c2.toFixed(2),
                  exam: ex.toFixed(2),
                  score
                };
              }
            }
            return s;
          });
        });

        if (matchCount > 0) {
          setCsvMessage(`Successfully imported and updated scores for ${matchCount} student(s) from CSV! Remember to click "Save Draft" or "Submit for Approval".`);
          setCsvError("");
          setTimeout(() => setCsvMessage(""), 7000);
        } else {
          setCsvError("No matching students found in CSV. Please ensure Student IDs, Admission Numbers, or Names match the enrolled list.");
          setCsvMessage("");
          setTimeout(() => setCsvError(""), 7000);
        }
      } catch (err: any) {
        setCsvError(err.message || "Failed to parse CSV file. Please use the downloaded template.");
        setCsvMessage("");
        setTimeout(() => setCsvError(""), 7000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const avg = students.length > 0 
    ? (students.reduce((acc, s) => acc + s.score, 0) / students.length).toFixed(2)
    : "0.00";

  const isLocked = courseStatus === "published" || courseStatus === "locked";

  return (
    <div onClick={() => setShowTemplateMenu(false)} style={{ paddingBottom: 32 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Title + Status Badge Row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
            Academic Grade Submissions
          </h1>
          {courseStatus === "published" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(41, 61, 125, 0.12)", border: `1px solid ${DLHS.navy}`, color: DLHS.navy, fontSize: 11, fontWeight: 700 }}>
              <Lock size={12} /> Published &amp; Locked
            </span>
          )}
          {courseStatus === "locked" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(30, 41, 59, 0.12)", border: `1px solid ${DLHS.slate}`, color: "var(--foreground)", fontSize: 11, fontWeight: 700 }}>
              <Lock size={12} /> Locked by Administration
            </span>
          )}
          {courseStatus === "submitted" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(0, 147, 221, 0.12)", border: `1px solid ${DLHS.blue}`, color: DLHS.blue, fontSize: 11, fontWeight: 700 }}>
              <Clock size={12} /> Pending Admin Approval
            </span>
          )}
          {courseStatus === "approved" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(41, 61, 125, 0.12)", border: `1px solid ${DLHS.navy}`, color: DLHS.navy, fontSize: 11, fontWeight: 700 }}>
              <CheckCircle size={12} /> Approved by Administration
            </span>
          )}
          {courseStatus === "reopen_requested" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(212, 175, 55, 0.15)", border: `1px solid ${DLHS.gold}`, color: "#B45309", fontSize: 11, fontWeight: 700 }}>
              <RotateCcw size={12} /> Reopen Requested
            </span>
          )}
          {courseStatus === "draft" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 11, fontWeight: 700 }}>
              <FileText size={12} /> Draft Mode
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 16px" }}>
          Record, calculate, and submit continuous assessments and final term examination grades for verification
        </p>

        {/* Filter Controls Row */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Session Selector */}
          <select
            value={selectedSession}
            onChange={e => {
              setSelectedSession(e.target.value);
              setSelectedClassId(null);
            }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", outline: "none", minWidth: 125 }}
            title="Academic Session"
          >
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Term Selector */}
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
            {["1st Term", "2nd Term", "3rd Term"].map(t => (
              <button
                key={t}
                onClick={(e) => { e.stopPropagation(); setSelectedTerm(t); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: selectedTerm === t ? DLHS.navy : "transparent",
                  color: selectedTerm === t ? "#ffffff" : "var(--muted-foreground)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Subject select */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId || ""}
              onChange={e => {
                setSelectedCourseId(parseInt(e.target.value));
                setSelectedClassId(null);
              }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", outline: "none", flex: 1, minWidth: 160, maxWidth: 260 }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Class filter */}
          {classes.length > 0 && (
            <select
              value={selectedClassId || ""}
              onChange={e => setSelectedClassId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", outline: "none", minWidth: 150, maxWidth: 240 }}
              title="Class Filter"
            >
              <option value="">All Assigned Streams ({students.length})</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Template dropdown */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowTemplateMenu(v => !v)}
              disabled={loading || students.length === 0}
              title="Download a term-specific CSV template"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}40`,
                cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
                fontSize: 12.5, fontWeight: 700, color: DLHS.navy, whiteSpace: "nowrap"
              }}
            >
              <Download size={14} /> Download Template ▾
            </button>
            {showTemplateMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                minWidth: 240, overflow: "hidden"
              }}>
                {[
                  { type: "midterm" as const, label: "Mid-Term Template", sub: "Assignment (5) · Project (5) · Test (10)", color: DLHS.blue },
                  { type: "ca2only" as const, label: "CA 2 Only Template", sub: "CA 2 continuous assessment (20)", color: DLHS.gold },
                  { type: "endofterm" as const, label: "End of Term Template", sub: "CA 2 (20) + Exam scores (60)", color: DLHS.crimson },
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleDownloadTemplate(opt.type)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "11px 16px", background: "transparent",
                      border: "none", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", color: "var(--foreground)"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: opt.color }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Import CSV */}
          {!isLocked && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleImportCsv} accept=".csv" style={{ display: "none" }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || students.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 8, background: "rgba(212, 175, 55, 0.12)", border: `1px solid ${DLHS.gold}60`,
                  cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
                  fontSize: 12.5, fontWeight: 700, color: "#92400E", whiteSpace: "nowrap"
                }}
              >
                <Upload size={14} /> Import CSV
              </button>
            </>
          )}

          {/* Save & Submit */}
          {!isLocked && (
            <>
              <button
                onClick={() => handleSave("draft")}
                disabled={loading || students.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 8, background: saved ? "rgba(41, 61, 125, 0.12)" : "var(--muted)",
                  border: `1px solid ${saved ? DLHS.navy : "var(--border)"}`,
                  cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
                  fontSize: 12.5, fontWeight: 700, color: saved ? DLHS.navy : "var(--foreground)",
                  whiteSpace: "nowrap"
                }}
              >
                {saved ? <><CheckCircle size={14} /> Draft Saved</> : <><Save size={14} /> Save Draft</>}
              </button>

              <button
                onClick={handleSubmitForApproval}
                disabled={loading || students.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
                  borderRadius: 8,
                  background: submitted ? DLHS.navy : `linear-gradient(135deg, ${DLHS.crimson} 0%, ${DLHS.crimsonHover} 100%)`,
                  border: "none",
                  cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
                  fontSize: 12.5, fontWeight: 700, color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(220, 19, 123, 0.25)",
                  whiteSpace: "nowrap"
                }}
              >
                {submitted ? <><CheckCircle size={14} /> Submitted</> : <><Send size={14} /> Submit for Approval</>}
              </button>
            </>
          )}

          {/* Request Reopen */}
          {(isLocked || courseStatus === "submitted") && courseStatus !== "reopen_requested" && (
            <button
              onClick={() => setShowReopenModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", border: `1px solid ${DLHS.crimson}40`,
                cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: DLHS.crimson, whiteSpace: "nowrap"
              }}
            >
              <RotateCcw size={14} /> Request Reopen
            </button>
          )}
          {courseStatus === "reopen_requested" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#B45309", background: "rgba(212, 175, 55, 0.12)", padding: "7px 14px", borderRadius: 8, border: `1px solid ${DLHS.gold}` }}>
              <Clock size={13} /> Awaiting Admin Reopening
            </div>
          )}
        </div>
      </div>

      {/* CSV Status Messages */}
      {csvMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}40`, color: DLHS.navy, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>{csvMessage}</span>
        </div>
      )}
      {csvError && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", border: `1px solid ${DLHS.crimson}40`, color: DLHS.crimson, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{csvError}</span>
        </div>
      )}

      {/* Reopen Request Modal */}
      {showReopenModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16, 25, 46, 0.65)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,0.25)", padding: 28, width: "100%", maxWidth: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>
                Request Grade Sheet Reopen
              </div>
              <button onClick={() => setShowReopenModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
              Submit a formal request to Administration to unlock this mark sheet for amendments. Please state the justification clearly.
            </p>
            <textarea
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="State reasons for score adjustments (e.g. clerical entry correction)…"
              rows={4}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "'Lato', sans-serif", boxSizing: "border-box", marginBottom: 18 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowReopenModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestReopen}
                disabled={reopenLoading}
                style={{
                  flex: 2, padding: "10px", borderRadius: 8,
                  background: DLHS.crimson, border: "none",
                  cursor: reopenLoading ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 700, color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                <RotateCcw size={14} /> {reopenLoading ? "Transmitting…" : "Transmit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reopenSent && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 8, background: "rgba(212, 175, 55, 0.12)", border: `1px solid ${DLHS.gold}60`, marginBottom: 16 }}>
          <CheckCircle size={15} style={{ color: DLHS.gold }} />
          <span style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>Reopen request transmitted to Administration successfully!</span>
        </div>
      )}

      {isLocked && (
        <div style={{ marginBottom: 16, background: "rgba(41, 61, 125, 0.06)", border: `1px solid ${DLHS.navy}30`, borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--foreground)" }}>
          <AlertCircle size={18} style={{ color: DLHS.navy, flexShrink: 0 }} />
          <span>This subject mark sheet has been <strong>approved and locked</strong>. Direct editing is secured. Request administrative reopening if modifications are mandatory.</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Loading student grade register…
        </div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          <BookOpen size={28} style={{ opacity: 0.4, margin: "0 auto 12px", display: "block" }} />
          No enrolled students found for the selected subject and academic period.
        </Glass>
      ) : (
        <>
          {/* Assessment Mode Toggles */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => {
                setActiveTab("mid_term");
                setStudents(prev => prev.map(s => ({
                  ...s,
                  score: (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0)
                })));
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
                borderRadius: 8,
                border: `1.5px solid ${activeTab === "mid_term" ? DLHS.blue : "var(--border)"}`,
                background: activeTab === "mid_term" ? "rgba(0, 147, 221, 0.1)" : "var(--card)",
                color: activeTab === "mid_term" ? DLHS.blue : "var(--muted-foreground)",
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s ease"
              }}
            >
              <BookOpen size={15} /> Mid-Term Continuous Assessment (/20)
            </button>
            <button
              onClick={() => {
                setActiveTab("end_of_term");
                setStudents(prev => prev.map(s => ({
                  ...s,
                  score: (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0) + (parseFloat(s.ca2) || 0) + (parseFloat(s.exam) || 0)
                })));
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
                borderRadius: 8,
                border: `1.5px solid ${activeTab === "end_of_term" ? DLHS.crimson : "var(--border)"}`,
                background: activeTab === "end_of_term" ? "rgba(220, 19, 123, 0.1)" : "var(--card)",
                color: activeTab === "end_of_term" ? DLHS.crimson : "var(--muted-foreground)",
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s ease"
              }}
            >
              <Award size={15} /> Cumulative Full Term Register (/100)
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="responsive-grid-4" style={{ gap: 14, marginBottom: 20 }}>
            {[
              { l: "Stream Mean Average", v: `${avg}${activeTab === "mid_term" ? "/20" : "%"}`, c: DLHS.navy, sub: "Aggregated cohort score" },
              { l: activeTab === "mid_term" ? "Distinction (18+)" : "A Grade Benchmark", v: String(students.filter(s => activeTab === "mid_term" ? s.score >= 18 : s.score >= 70).length), c: DLHS.blue, sub: "High scholastic achievement" },
              { l: "Academic Intervention", v: String(students.filter(s => activeTab === "mid_term" ? s.score < 10 : s.score < 50).length), c: DLHS.crimson, sub: "Requires supplementary focus" },
              { l: "Enrolled Roster", v: String(students.length), c: DLHS.gold, sub: "Registered candidate count" },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>{s.l}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.sub}</div>
              </Glass>
            ))}
          </div>

          <Glass>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(41, 61, 125, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.navy }}>
                  <TrendingUp size={15} />
                </div>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                  {courses.find(c => c.id === selectedCourseId)?.name || "Subject"} · Mark Register ({selectedTerm} · {activeTab === "mid_term" ? "Mid-Term" : "Full Term"})
                </span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)" }}>Session: {selectedSession}</span>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="desktop-only table-responsive-wrapper">
              <div style={{ minWidth: 780 }}>
                {/* Headers */}
                {activeTab === "mid_term" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 100px 100px 100px 80px 1fr 120px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                    {["Student Name & Adm. No.", "Asgn (/5)", "Proj (/5)", "Test (/10)", "Total", "Performance Indicator", "Classification"].map(h => (
                      <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 100px 100px 100px 80px 1fr 120px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                    {["Student Name & Adm. No.", "CA 1 (/20)", "CA 2 (/20)", "Exam (/60)", "Total", "Performance Indicator", "WAEC Grade"].map(h => (
                      <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                    ))}
                  </div>
                )}

                {/* Students rows */}
                {students.map((s) => {
                  const midTotal = (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0);

                  if (activeTab === "mid_term") {
                    const rmk = getMidRemark(s.score);
                    const asgnErr = (parseFloat(s.assignment_score) || 0) > 5;
                    const projErr = (parseFloat(s.project_score) || 0) > 5;
                    const testErr = (parseFloat(s.mid_term_test) || 0) > 10;

                    return (
                      <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 100px 100px 100px 80px 1fr 120px", padding: "12px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.student_number}</span>
                            {s.class_name && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(41, 61, 125, 0.08)", color: DLHS.navy }}>
                                {s.class_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assignment */}
                        <input
                          type="text"
                          value={s.assignment_score}
                          onChange={e => updateField(s.id, "assignment_score", e.target.value)}
                          disabled={isLocked}
                          style={{
                            width: 60, padding: "6px 8px", borderRadius: 6,
                            border: `1px solid ${asgnErr ? DLHS.crimson : "var(--border)"}`,
                            background: isLocked ? "transparent" : (asgnErr ? "rgba(220,19,123,0.06)" : "var(--muted)"),
                            fontSize: 13, fontWeight: 600, color: "var(--foreground)", outline: "none", textAlign: "center",
                            cursor: isLocked ? "not-allowed" : "text"
                          }}
                        />

                        {/* Project */}
                        <input
                          type="text"
                          value={s.project_score}
                          onChange={e => updateField(s.id, "project_score", e.target.value)}
                          disabled={isLocked}
                          style={{
                            width: 60, padding: "6px 8px", borderRadius: 6,
                            border: `1px solid ${projErr ? DLHS.crimson : "var(--border)"}`,
                            background: isLocked ? "transparent" : (projErr ? "rgba(220,19,123,0.06)" : "var(--muted)"),
                            fontSize: 13, fontWeight: 600, color: "var(--foreground)", outline: "none", textAlign: "center",
                            cursor: isLocked ? "not-allowed" : "text"
                          }}
                        />

                        {/* Test */}
                        <input
                          type="text"
                          value={s.mid_term_test}
                          onChange={e => updateField(s.id, "mid_term_test", e.target.value)}
                          disabled={isLocked}
                          style={{
                            width: 60, padding: "6px 8px", borderRadius: 6,
                            border: `1px solid ${testErr ? DLHS.crimson : "var(--border)"}`,
                            background: isLocked ? "transparent" : (testErr ? "rgba(220,19,123,0.06)" : "var(--muted)"),
                            fontSize: 13, fontWeight: 600, color: "var(--foreground)", outline: "none", textAlign: "center",
                            cursor: isLocked ? "not-allowed" : "text"
                          }}
                        />
                        
                        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 800, color: rmk.color }}>
                          {s.score.toFixed(2)}
                        </span>

                        <div style={{ height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden", marginRight: 16 }}>
                          <div style={{ height: "100%", width: `${Math.min((s.score / 20) * 100, 100)}%`, background: rmk.color, borderRadius: 3 }} />
                        </div>

                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: rmk.bg, color: rmk.color, display: "inline-block", textAlign: "center" }}>
                            {rmk.text}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    // End of Term View
                    const gl = getLetterGrade(s.score);
                    const ca2Err = (parseFloat(s.ca2) || 0) > 20;
                    const examErr = (parseFloat(s.exam) || 0) > 60;

                    return (
                      <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 100px 100px 100px 80px 1fr 120px", padding: "12px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.student_number}</span>
                            {s.class_name && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(41, 61, 125, 0.08)", color: DLHS.navy }}>
                                {s.class_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CA1 (Mid-Term total, Read-Only) */}
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", width: 60, textAlign: "center", display: "inline-block" }}>
                          {midTotal.toFixed(2)}
                        </span>
                        
                        {/* CA2 */}
                        <input
                          type="text"
                          value={s.ca2}
                          onChange={e => updateField(s.id, "ca2", e.target.value)}
                          disabled={isLocked}
                          style={{
                            width: 60, padding: "6px 8px", borderRadius: 6,
                            border: `1px solid ${ca2Err ? DLHS.crimson : "var(--border)"}`,
                            background: isLocked ? "transparent" : (ca2Err ? "rgba(220,19,123,0.06)" : "var(--muted)"),
                            fontSize: 13, fontWeight: 600, color: "var(--foreground)", outline: "none", textAlign: "center",
                            cursor: isLocked ? "not-allowed" : "text"
                          }}
                        />
                        
                        {/* Exam */}
                        <input
                          type="text"
                          value={s.exam}
                          onChange={e => updateField(s.id, "exam", e.target.value)}
                          disabled={isLocked}
                          style={{
                            width: 60, padding: "6px 8px", borderRadius: 6,
                            border: `1px solid ${examErr ? DLHS.crimson : "var(--border)"}`,
                            background: isLocked ? "transparent" : (examErr ? "rgba(220,19,123,0.06)" : "var(--muted)"),
                            fontSize: 13, fontWeight: 600, color: "var(--foreground)", outline: "none", textAlign: "center",
                            cursor: isLocked ? "not-allowed" : "text"
                          }}
                        />
                        
                        <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 800, color: gl.color }}>
                          {s.score.toFixed(2)}
                        </span>

                        <div style={{ height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden", marginRight: 16 }}>
                          <div style={{ height: "100%", width: `${Math.min(s.score, 100)}%`, background: gl.color, borderRadius: 3 }} />
                        </div>

                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: `${gl.color}15`, color: gl.color, display: "inline-block", textAlign: "center" }}>
                            {gl.grade} · {gl.text}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 12px" }}>
              {students.map((s) => {
                const midTotal = (parseFloat(s.assignment_score) || 0) + (parseFloat(s.project_score) || 0) + (parseFloat(s.mid_term_test) || 0);

                if (activeTab === "mid_term") {
                  const rmk = getMidRemark(s.score);
                  const asgnErr = (parseFloat(s.assignment_score) || 0) > 5;
                  const projErr = (parseFloat(s.project_score) || 0) > 5;
                  const testErr = (parseFloat(s.mid_term_test) || 0) > 10;

                  return (
                    <div key={s.id} style={{ padding: 14, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.student_number}</span>
                            {s.class_name && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(41, 61, 125, 0.08)", color: DLHS.navy }}>
                                {s.class_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: rmk.color }}>
                            {s.score.toFixed(2)} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>/20</span>
                          </span>
                          <div style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: rmk.bg, color: rmk.color }}>
                              {rmk.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min((s.score / 20) * 100, 100)}%`, background: rmk.color, borderRadius: 3 }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Asgn (/5)</label>
                          <input
                            type="text"
                            value={s.assignment_score}
                            onChange={e => updateField(s.id, "assignment_score", e.target.value)}
                            disabled={isLocked}
                            style={{
                              width: "100%", padding: "8px 6px", borderRadius: 8,
                              border: `1px solid ${asgnErr ? DLHS.crimson : "var(--border)"}`,
                              background: isLocked ? "transparent" : (asgnErr ? "rgba(220,19,123,0.06)" : "var(--card)"),
                              fontSize: 13, fontWeight: 600, color: "var(--foreground)", textAlign: "center", outline: "none", boxSizing: "border-box"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Proj (/5)</label>
                          <input
                            type="text"
                            value={s.project_score}
                            onChange={e => updateField(s.id, "project_score", e.target.value)}
                            disabled={isLocked}
                            style={{
                              width: "100%", padding: "8px 6px", borderRadius: 8,
                              border: `1px solid ${projErr ? DLHS.crimson : "var(--border)"}`,
                              background: isLocked ? "transparent" : (projErr ? "rgba(220,19,123,0.06)" : "var(--card)"),
                              fontSize: 13, fontWeight: 600, color: "var(--foreground)", textAlign: "center", outline: "none", boxSizing: "border-box"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Test (/10)</label>
                          <input
                            type="text"
                            value={s.mid_term_test}
                            onChange={e => updateField(s.id, "mid_term_test", e.target.value)}
                            disabled={isLocked}
                            style={{
                              width: "100%", padding: "8px 6px", borderRadius: 8,
                              border: `1px solid ${testErr ? DLHS.crimson : "var(--border)"}`,
                              background: isLocked ? "transparent" : (testErr ? "rgba(220,19,123,0.06)" : "var(--card)"),
                              fontSize: 13, fontWeight: 600, color: "var(--foreground)", textAlign: "center", outline: "none", boxSizing: "border-box"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const gl = getLetterGrade(s.score);
                  const ca2Err = (parseFloat(s.ca2) || 0) > 20;
                  const examErr = (parseFloat(s.exam) || 0) > 60;

                  return (
                    <div key={s.id} style={{ padding: 14, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.student_number}</span>
                            {s.class_name && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(41, 61, 125, 0.08)", color: DLHS.navy }}>
                                {s.class_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 800, color: gl.color }}>
                            {s.score.toFixed(2)} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>/100</span>
                          </span>
                          <div style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${gl.color}18`, color: gl.color }}>
                              {gl.grade} · {gl.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(s.score, 100)}%`, background: gl.color, borderRadius: 3 }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>CA 1 (/20)</label>
                          <div style={{
                            width: "100%", padding: "8px 6px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)",
                            border: `1px solid ${DLHS.navy}30`, fontSize: 13, fontWeight: 700, color: DLHS.navy, textAlign: "center", boxSizing: "border-box"
                          }}>
                            {midTotal.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>CA 2 (/20)</label>
                          <input
                            type="text"
                            value={s.ca2}
                            onChange={e => updateField(s.id, "ca2", e.target.value)}
                            disabled={isLocked}
                            style={{
                              width: "100%", padding: "8px 6px", borderRadius: 8,
                              border: `1px solid ${ca2Err ? DLHS.crimson : "var(--border)"}`,
                              background: isLocked ? "transparent" : (ca2Err ? "rgba(220,19,123,0.06)" : "var(--card)"),
                              fontSize: 13, fontWeight: 600, color: "var(--foreground)", textAlign: "center", outline: "none", boxSizing: "border-box"
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Exam (/60)</label>
                          <input
                            type="text"
                            value={s.exam}
                            onChange={e => updateField(s.id, "exam", e.target.value)}
                            disabled={isLocked}
                            style={{
                              width: "100%", padding: "8px 6px", borderRadius: 8,
                              border: `1px solid ${examErr ? DLHS.crimson : "var(--border)"}`,
                              background: isLocked ? "transparent" : (examErr ? "rgba(220,19,123,0.06)" : "var(--card)"),
                              fontSize: 13, fontWeight: 600, color: "var(--foreground)", textAlign: "center", outline: "none", boxSizing: "border-box"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </Glass>
        </>
      )}
    </div>
  );
}
