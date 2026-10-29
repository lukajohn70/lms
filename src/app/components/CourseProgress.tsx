import { BookOpen, ChevronRight } from "lucide-react";

const courses = [
  { name: "Intro to Quantum Mechanics", subject: "Physics", progress: 68, teacher: "Dr. Amaka Eze", color: "#293d7d" },
  { name: "SQL Database Design", subject: "Computer Science", progress: 82, teacher: "Mr. Babatunde Ola", color: "#0093dd" },
  { name: "Further Calculus", subject: "Mathematics", progress: 55, teacher: "Mrs. Ngozi Ike", color: "#dc137b" },
  { name: "Organic Chemistry II", subject: "Chemistry", progress: 71, teacher: "Mrs. Folake Adeyemi", color: "#d4af37" },
  { name: "English Literature", subject: "English", progress: 90, teacher: "Mr. Tunde Lawal", color: "#f24080" },
];

export function CourseProgress() {
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
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(41,61,125,0.08)", color: "#293d7d" }}
          >
            <BookOpen size={15} />
          </div>
          <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>
            Course Progress
          </span>
        </div>
        <button className="flex items-center gap-1" style={{ fontFamily: "'Raleway',sans-serif", fontSize: "11.5px", fontWeight: 700, color: "#dc137b" }}>
          All courses <ChevronRight size={12} />
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3.5">
        {courses.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--heading)" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: "11px", color: "var(--subtext)" }}>
                  {c.subject} · {c.teacher}
                </div>
              </div>
              <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "12.5px", fontWeight: 700, color: c.color }}>
                {c.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${c.progress}%`, background: c.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
