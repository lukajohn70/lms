import { useState, useEffect } from "react";
import { Clock, BookOpen, Lock, ChevronRight, AlarmClock, ClipboardList, CheckCircle } from "lucide-react";

interface Exam {
  id: string;
  course: string;
  subject: string;
  targetDate: string;
  date: string;
  duration: string;
  questions: number;
  status: "locked" | "open";
}

const exams: Exam[] = [
  {
    id: "1",
    course: "Physics SS2 — Quantum Mechanics",
    subject: "Physics",
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 38).toISOString(),
    date: "Tomorrow, 9:00 AM",
    duration: "45 mins",
    questions: 40,
    status: "locked",
  },
  {
    id: "2",
    course: "Computer Science — Database & SQL",
    subject: "Comp Sci",
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 86).toISOString(),
    date: "In 3 days, 11:30 AM",
    duration: "30 mins",
    questions: 30,
    status: "locked",
  },
  {
    id: "3",
    course: "Mathematics — Calculus Mock CBT",
    subject: "Mathematics",
    targetDate: new Date(Date.now() + 1000 * 60 * 60 * 130).toISOString(),
    date: "In 5 days, 8:00 AM",
    duration: "60 mins",
    questions: 50,
    status: "locked",
  },
];

function Countdown({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const s = Math.floor(diff / 1000);
      setRemaining({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const unit = (val: number, label: string) => (
    <div className="flex flex-col items-center">
      <div
        className="w-12 h-11 rounded-lg flex items-center justify-center"
        style={{
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "17px", fontWeight: 800, color: "var(--heading)" }}>
          {String(val).padStart(2, "0")}
        </span>
      </div>
      <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "9px", fontWeight: 700, color: "var(--subtext)", marginTop: "3px", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      {unit(remaining.d, "DAYS")}
      <span style={{ color: "var(--subtext)", fontWeight: 700 }}>:</span>
      {unit(remaining.h, "HRS")}
      <span style={{ color: "var(--subtext)", fontWeight: 700 }}>:</span>
      {unit(remaining.m, "MIN")}
      <span style={{ color: "var(--subtext)", fontWeight: 700 }}>:</span>
      {unit(remaining.s, "SEC")}
    </div>
  );
}

export function CBTCenter() {
  const [active, setActive] = useState(0);
  const exam = exams[active];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(16, 28, 50, 0.04)",
        fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif"
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(220,19,123,0.1)", color: "#dc137b" }}
          >
            <ClipboardList size={16} />
          </div>
          <div>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "14px", fontWeight: 800, color: "var(--heading)" }}>
              CBT Examination Center
            </span>
            <div style={{ fontSize: "11px", color: "var(--subtext)" }}>
              Upcoming Computer-Based Tests
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-1"
          style={{ fontFamily: "'Raleway',sans-serif", fontSize: "11.5px", fontWeight: 700, color: "#dc137b" }}
        >
          View all <ChevronRight size={12} />
        </button>
      </div>

      {/* Exam tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--border)" }}>
        {exams.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setActive(i)}
            className="flex-1 py-2.5 px-3 text-left transition-all duration-150"
            style={{
              background: active === i ? "rgba(41,61,125,0.06)" : "transparent",
              borderBottom: active === i ? "2px solid #293d7d" : "2px solid transparent",
            }}
          >
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
              {e.subject}
            </div>
            <div
              style={{
                fontFamily: "'Raleway',sans-serif",
                fontSize: "11.5px",
                fontWeight: active === i ? 700 : 500,
                color: active === i ? "var(--heading)" : "var(--subtext)",
                marginTop: "1px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.course}
            </div>
          </button>
        ))}
      </div>

      {/* Active exam detail */}
      <div className="px-5 py-4">
        {/* Countdown */}
        <div
          className="rounded-lg p-4 mb-4 flex items-center justify-between"
          style={{
            background: "rgba(41,61,125,0.04)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlarmClock size={13} style={{ color: "#dc137b" }} />
              <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "10.5px", fontWeight: 800, color: "#dc137b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Session Opens In
              </span>
            </div>
            <Countdown targetDate={exam.targetDate} />
          </div>
          <div className="text-right">
            <div style={{ fontSize: "10.5px", color: "var(--subtext)", marginBottom: "3px" }}>Scheduled Date</div>
            <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: "12px", color: "var(--heading)", fontWeight: 700 }}>{exam.date}</div>
          </div>
        </div>

        {/* Exam meta */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <Clock size={12} style={{ color: "#0093dd" }} />
            <span style={{ fontSize: "11.5px", color: "var(--subtext)", fontWeight: 600 }}>{exam.duration}</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <BookOpen size={12} style={{ color: "#0093dd" }} />
            <span style={{ fontSize: "11.5px", color: "var(--subtext)", fontWeight: 600 }}>{exam.questions} Questions</span>
          </div>
          {exam.status === "locked" && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              style={{ background: "rgba(190,18,60,0.06)", border: "1px solid rgba(190,18,60,0.18)" }}
            >
              <Lock size={12} style={{ color: "#be123c" }} />
              <span style={{ fontSize: "11.5px", color: "#be123c", fontWeight: 700 }}>Locked</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-150"
          style={{
            background: exam.status === "locked" ? "rgba(41,61,125,0.08)" : "#dc137b",
            border: exam.status === "locked" ? "1px solid var(--border)" : "none",
            boxShadow: exam.status === "locked" ? "none" : "0 4px 14px rgba(220,19,123,0.28)",
            cursor: exam.status === "locked" ? "not-allowed" : "pointer",
          }}
        >
          {exam.status === "locked" ? (
            <Lock size={14} style={{ color: "var(--subtext)" }} />
          ) : (
            <CheckCircle size={14} style={{ color: "#fff" }} />
          )}
          <span
            style={{
              fontFamily: "'Raleway',sans-serif",
              fontSize: "12.5px",
              fontWeight: 800,
              color: exam.status === "locked" ? "var(--subtext)" : "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {exam.status === "locked" ? "EXAM LOCKED — SESSION NOT ACTIVE" : "COMMENCE CBT EXAM"}
          </span>
        </button>
      </div>
    </div>
  );
}
