import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle, XCircle, Save, Users, Calendar, BookOpen, CheckCircle2 } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
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

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const { settings } = useApp();

  const [selectedSession, setSelectedSession] = useState(searchParams.get("session") || settings?.academic_session || "2026/2027");
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    searchParams.get("course_id") ? parseInt(searchParams.get("course_id")!) : null
  );
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    searchParams.get("class_id") ? parseInt(searchParams.get("class_id")!) : null
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    let query = `?session=${encodeURIComponent(selectedSession)}&date=${selectedDate}`;
    if (selectedCourseId) query += `&course_id=${selectedCourseId}`;
    if (selectedClassId) query += `&class_id=${selectedClassId}`;

    apiClient.get(`/teacher/attendance${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        setClasses(res.classes || []);
        if (res.selected_course_id) {
          setSelectedCourseId(parseInt(res.selected_course_id));
        }
        if (res.selected_class_id) {
          setSelectedClassId(parseInt(res.selected_class_id));
        }
        setDates(res.dates || []);
        setStudents(res.students || []);
      })
      .catch(err => console.error("Error loading attendance register", err))
      .finally(() => setLoading(false));
  }, [selectedCourseId, selectedClassId, selectedSession, selectedDate]);

  const toggle = (studentId: number, dateStr: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      return {
        ...s,
        attendance: {
          ...s.attendance,
          [dateStr]: !s.attendance[dateStr]
        }
      };
    }));
  };

  const markAllPresent = (targetDate?: string) => {
    setStudents(prev => prev.map(s => {
      const updated = { ...s.attendance };
      if (targetDate) {
        updated[targetDate] = true;
      } else {
        dates.forEach(d => { updated[d] = true; });
      }
      return { ...s, attendance: updated };
    }));
  };

  const markAllAbsent = (targetDate?: string) => {
    setStudents(prev => prev.map(s => {
      const updated = { ...s.attendance };
      if (targetDate) {
        updated[targetDate] = false;
      } else {
        dates.forEach(d => { updated[d] = false; });
      }
      return { ...s, attendance: updated };
    }));
  };

  const handleSave = () => {
    if (!selectedCourseId) return;
    
    // Flatten attendance states into record array
    const records: any[] = [];
    students.forEach(s => {
      Object.keys(s.attendance).forEach(d => {
        records.push({
          student_id: s.id,
          date: d,
          is_present: s.attendance[d]
        });
      });
    });

    apiClient.post('/teacher/attendance/save', {
      course_id: selectedCourseId,
      class_id: selectedClassId,
      session: selectedSession,
      attendance: records
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(err => console.error("Error saving attendance", err));
  };

  const getRate = (s: any) => {
    const vals = Object.values(s.attendance || {});
    return vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
  };

  const formatDateLabel = (dStr: string) => {
    const d = new Date(dStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
            Daily Attendance Register
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>
            Take statutory roll call and audit student candidate class presence
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Academic Session */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px" }}>
            <Calendar size={14} style={{ color: DLHS.navy }} />
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--foreground)", fontSize: 12.5, fontWeight: 700, outline: "none", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}
            >
              {["2026/2027", "2025/2026", "2024/2025", "2023/2024"].map(sess => (
                <option key={sess} value={sess} style={{ background: "var(--card)", color: "var(--foreground)" }}>{sess}</option>
              ))}
            </select>
          </div>

          {/* Course select */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId || ""}
              onChange={e => setSelectedCourseId(parseInt(e.target.value))}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", outline: "none" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Class Arm select */}
          {classes.length > 0 && (
            <select
              value={selectedClassId || ""}
              onChange={e => setSelectedClassId(parseInt(e.target.value))}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12.5, fontWeight: 700, color: DLHS.navy, outline: "none" }}
            >
              {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          )}

          {/* Date select */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px" }}>
            <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 12.5, color: "var(--foreground)", outline: "none", cursor: "pointer", fontFamily: "'Lato', sans-serif" }}
            />
          </div>

          {/* Mark All Present Button */}
          <button
            type="button"
            onClick={() => markAllPresent(selectedDate)}
            disabled={loading || students.length === 0}
            title={`Mark all students present on ${formatDateLabel(selectedDate)}`}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: "rgba(0, 147, 221, 0.1)", border: `1px solid ${DLHS.blue}40`,
              color: DLHS.blue, fontSize: 12.5, fontWeight: 700,
              cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <CheckCircle size={14} /> Mark All Present ({formatDateLabel(selectedDate)})
          </button>

          <button
            onClick={handleSave}
            disabled={loading || students.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8,
              background: saved ? "rgba(41, 61, 125, 0.12)" : DLHS.navy,
              border: saved ? `1px solid ${DLHS.navy}` : "none",
              cursor: (loading || students.length === 0) ? "not-allowed" : "pointer",
              fontSize: 12.5, fontWeight: 700,
              color: saved ? DLHS.navy : "#ffffff",
              boxShadow: saved ? "none" : "0 4px 12px rgba(41, 61, 125, 0.25)"
            }}
          >
            {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Register</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
          Loading attendance register…
        </div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
          No students enrolled in this course or class arm.
        </Glass>
      ) : (
        <Glass>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={16} style={{ color: DLHS.navy }} />
            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
              {courses.find(c => c.id === selectedCourseId)?.name || "Class"} — Roll Call Register
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginLeft: "auto" }}>
              Period: {formatDateLabel(dates[0])} — {formatDateLabel(dates[dates.length - 1])}
            </span>
          </div>

          <div className="table-responsive-wrapper">
            <div style={{ minWidth: 640 }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: `1.4fr repeat(${dates.length},90px) 90px`, padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Candidate Name</span>
                {dates.map(d => (
                  <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>
                      {formatDateLabel(d)}
                    </span>
                    <button
                      type="button"
                      onClick={() => markAllPresent(d)}
                      title={`Mark all students present on ${formatDateLabel(d)}`}
                      style={{
                        background: "rgba(0, 147, 221, 0.1)", border: `1px solid ${DLHS.blue}30`,
                        color: DLHS.blue, fontSize: 10, fontWeight: 700,
                        cursor: "pointer", padding: "1px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3
                      }}
                    >
                      <CheckCircle size={10} /> all
                    </button>
                  </div>
                ))}
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>Rate</span>
              </div>

              {students.map((s) => {
                const rate = getRate(s);
                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: `1.4fr repeat(${dates.length},90px) 90px`, padding: "10px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    {dates.map(d => {
                      const isPres = !!s.attendance[d];
                      return (
                        <div key={d} style={{ display: "flex", justifyContent: "center" }}>
                          <button
                            onClick={() => toggle(s.id, d)}
                            style={{
                              width: 30, height: 30, borderRadius: 6, border: "none",
                              background: isPres ? "rgba(5, 150, 105, 0.12)" : "rgba(220, 19, 123, 0.1)",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s ease"
                            }}
                          >
                            {isPres ? <CheckCircle size={17} style={{ color: "#059669" }} /> : <XCircle size={17} style={{ color: DLHS.crimson }} />}
                          </button>
                        </div>
                      );
                    })}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13, fontWeight: 800, color: rate < 80 ? DLHS.crimson : DLHS.navy }}>
                        {rate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Glass>
      )}
    </div>
  );
}
