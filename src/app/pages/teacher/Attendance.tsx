import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Save, Users, Calendar } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Attendance() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const query = selectedCourseId ? `?course_id=${selectedCourseId}&date=${selectedDate}` : `?date=${selectedDate}`;
    apiClient.get(`/teacher/attendance${query}`)
      .then((res: any) => {
        setCourses(res.courses || []);
        if (res.selected_course_id) {
          setSelectedCourseId(res.selected_course_id);
        } else if (res.courses && res.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(res.courses[0].id);
        }
        setDates(res.dates || []);
        setStudents(res.students || []);
      })
      .catch(err => console.error("Error loading attendance register", err))
      .finally(() => setLoading(false));
  }, [selectedCourseId, selectedDate]);

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
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Attendance Register</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Mark and track student attendance</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Course select */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId || ""}
              onChange={e => setSelectedCourseId(parseInt(e.target.value))}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Date select */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "3px 8px" }}>
            <Calendar size={13} style={{ color: "var(--subtext)" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--heading)", outline: "none", cursor: "pointer" }}
            />
          </div>

          <button onClick={handleSave} disabled={loading || students.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 9, background: saved ? "rgba(33,158,188,0.15)" : "linear-gradient(135deg,#219EBC,#1a8aaa)", border: saved ? "1px solid rgba(33,158,188,0.3)" : "none", cursor: (loading || students.length === 0) ? "not-allowed" : "pointer", fontSize: 12.5, fontWeight: 600, color: saved ? "#219EBC" : "#fff", opacity: (loading || students.length === 0) ? 0.6 : 1 }}>
            {saved ? <><CheckCircle size={13}/> Saved!</> : <><Save size={13}/> Save</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textContent: "center", color: "var(--subtext)", textAlign: "center" }}>Loading register...</div>
      ) : students.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
          No students enrolled in this course.
        </Glass>
      ) : (
        <Glass>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} style={{ color: "#8ECAE6" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>
              {courses.find(c => c.id === selectedCourseId)?.name || "Class"} — Attendance Register
            </span>
            <span style={{ fontSize: 11.5, color: "var(--subtext)", marginLeft: "auto" }}>
              Week of {formatDateLabel(dates[0])} — {formatDateLabel(dates[dates.length - 1])}
            </span>
          </div>

          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: `1fr repeat(${dates.length},85px) 80px`, padding: "8px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>Student</span>
            {dates.map(d => (
              <span key={d} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textAlign: "center", textTransform: "uppercase" }}>
                {formatDateLabel(d)}
              </span>
            ))}
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textAlign: "center", textTransform: "uppercase" }}>Rate</span>
          </div>

          {students.map((s) => {
            const rate = getRate(s);
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: `1fr repeat(${dates.length},85px) 80px`, padding: "9px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--heading)", fontWeight: 500, overflow: "hidden", textTargetContent: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                {dates.map(d => (
                  <div key={d} style={{ display: "flex", justifyContent: "center" }}>
                    <button onClick={() => toggle(s.id, d)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: (s.attendance[d]) ? "rgba(33,158,188,0.15)" : "rgba(251,133,0,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {(s.attendance[d]) ? <CheckCircle size={16} style={{ color: "#219EBC" }} /> : <XCircle size={16} style={{ color: "#FB8500" }} />}
                    </button>
                  </div>
                ))}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: rate < 80 ? "#FFB703" : "#219EBC" }}>{rate}%</span>
                </div>
              </div>
            );
          })}
        </Glass>
      )}
    </div>
  );
}
