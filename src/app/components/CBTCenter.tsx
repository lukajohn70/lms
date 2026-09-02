import { useState, useEffect } from "react";
import { Clock, Zap, BookOpen, AlarmClock, ChevronRight, Lock } from "lucide-react";

type Exam = {
  id: number;
  subject: string;
  course: string;
  date: string;
  duration: string;
  questions: number;
  targetDate: Date;
  status: "upcoming" | "open" | "locked";
};

const exams: Exam[] = [
  {
    id: 1,
    subject: "Physics",
    course: "Intro to Quantum Mechanics",
    date: "Mon, Jun 13 2026 — 09:00",
    duration: "60 min",
    questions: 50,
    targetDate: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    status: "upcoming",
  },
  {
    id: 2,
    subject: "Computer Sci.",
    course: "SQL Databases & Query Design",
    date: "Wed, Jun 15 2026 — 10:30",
    duration: "45 min",
    questions: 40,
    targetDate: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000),
    status: "upcoming",
  },
  {
    id: 3,
    subject: "Mathematics",
    course: "Further Calculus — Integration",
    date: "Fri, Jun 17 2026 — 08:00",
    duration: "90 min",
    questions: 60,
    targetDate: new Date(new Date().getTime() + 6 * 24 * 60 * 60 * 1000),
    status: "locked",
  },
];

function Countdown({ targetDate }: { targetDate: Date }) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      const s = Math.floor(diff / 1000);
      setRemaining({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const unit = (v: number, l: string) => (
    <div className="flex flex-col items-center">
      <span
        style={{
          fontFamily: "'Poppins',sans-serif",
          fontSize: "18px",
          fontWeight: 700,
          color: "#FFB703",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(v).padStart(2, "0")}
      </span>
      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "9px", color: "rgba(255,183,3,0.6)", letterSpacing: "0.06em", marginTop: "2px" }}>
        {l}
      </span>
    </div>
  );

  return (
    <div className="flex items-end gap-1.5">
      {unit(remaining.d, "DAYS")}
      <span style={{ color: "#FFB703", fontSize: "16px", lineHeight: "20px", opacity: 0.5 }}>:</span>
      {unit(remaining.h, "HRS")}
      <span style={{ color: "#FFB703", fontSize: "16px", lineHeight: "20px", opacity: 0.5 }}>:</span>
      {unit(remaining.m, "MIN")}
      <span style={{ color: "#FFB703", fontSize: "16px", lineHeight: "20px", opacity: 0.5 }}>:</span>
      {unit(remaining.s, "SEC")}
    </div>
  );
}

export function CBTCenter() {
  const [active, setActive] = useState(0);
  const exam = exams[active];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(2,48,71,0.5)",
        border: "1px solid rgba(142,202,230,0.15)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(142,202,230,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,183,3,0.12)", border: "1px solid rgba(255,183,3,0.2)" }}
          >
            <Zap size={15} style={{ color: "#FFB703" }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "14px", fontWeight: 600, color: "#e8f4f8" }}>
              CBT Center
            </span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>
              Upcoming Examinations
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-1"
          style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#219EBC" }}
        >
          View all <ChevronRight size={12} />
        </button>
      </div>

      {/* Exam tabs */}
      <div className="flex gap-0" style={{ borderBottom: "1px solid rgba(142,202,230,0.08)" }}>
        {exams.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setActive(i)}
            className="flex-1 py-2.5 px-3 text-left transition-all duration-200"
            style={{
              background: active === i ? "rgba(33,158,188,0.1)" : "transparent",
              borderBottom: active === i ? "2px solid #219EBC" : "2px solid transparent",
            }}
          >
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6", opacity: 0.7 }}>
              {e.subject}
            </div>
            <div
              style={{
                fontFamily: "'Poppins',sans-serif",
                fontSize: "11px",
                fontWeight: active === i ? 600 : 400,
                color: active === i ? "#e8f4f8" : "#8ECAE6",
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
          className="rounded-xl p-4 mb-4 flex items-center justify-between"
          style={{
            background: "rgba(255,183,3,0.06)",
            border: "1px solid rgba(255,183,3,0.15)",
          }}
        >
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlarmClock size={12} style={{ color: "#FFB703" }} />
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#FFB703", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Starts In
              </span>
            </div>
            <Countdown targetDate={exam.targetDate} />
          </div>
          <div className="text-right">
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6", marginBottom: "4px" }}>Scheduled</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#e8f4f8", fontWeight: 500 }}>{exam.date}</div>
          </div>
        </div>

        {/* Exam meta */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.15)" }}
          >
            <Clock size={11} style={{ color: "#219EBC" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#8ECAE6" }}>{exam.duration}</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.15)" }}
          >
            <BookOpen size={11} style={{ color: "#219EBC" }} />
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#8ECAE6" }}>{exam.questions} Questions</span>
          </div>
          {exam.status === "locked" && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(251,133,0,0.08)", border: "1px solid rgba(251,133,0,0.2)" }}
            >
              <Lock size={11} style={{ color: "#FB8500" }} />
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#FB8500" }}>Locked</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-98"
          style={{
            background: exam.status === "locked" ? "rgba(251,133,0,0.15)" : "linear-gradient(135deg, #FB8500 0%, #e67600 100%)",
            border: exam.status === "locked" ? "1px solid rgba(251,133,0,0.3)" : "none",
            boxShadow: exam.status === "locked" ? "none" : "0 4px 20px rgba(251,133,0,0.35)",
            cursor: exam.status === "locked" ? "not-allowed" : "pointer",
          }}
        >
          {exam.status === "locked" ? (
            <Lock size={14} style={{ color: "#FB8500" }} />
          ) : (
            <Zap size={14} style={{ color: "#fff" }} fill="#fff" />
          )}
          <span
            style={{
              fontFamily: "'Poppins',sans-serif",
              fontSize: "13px",
              fontWeight: 700,
              color: exam.status === "locked" ? "#FB8500" : "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {exam.status === "locked" ? "EXAM LOCKED — NOT YET OPEN" : "START CBT NOW"}
          </span>
        </button>
      </div>
    </div>
  );
}
