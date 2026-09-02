import { BookOpen, ChevronRight } from "lucide-react";

const courses = [
  { name: "Intro to Quantum Mechanics", subject: "Physics", progress: 68, teacher: "Dr. Amaka Eze", color: "#219EBC" },
  { name: "SQL Database Design", subject: "Computer Science", progress: 82, teacher: "Mr. Babatunde Ola", color: "#8ECAE6" },
  { name: "Further Calculus", subject: "Mathematics", progress: 55, teacher: "Mrs. Ngozi Ike", color: "#FFB703" },
  { name: "Organic Chemistry II", subject: "Chemistry", progress: 71, teacher: "Mrs. Folake Adeyemi", color: "#FB8500" },
  { name: "English Literature", subject: "English", progress: 90, teacher: "Mr. Tunde Lawal", color: "#219EBC" },
];

export function CourseProgress() {
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
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(142,202,230,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.2)" }}
          >
            <BookOpen size={15} style={{ color: "#219EBC" }} />
          </div>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "14px", fontWeight: 600, color: "#e8f4f8" }}>
            Course Progress
          </span>
        </div>
        <button className="flex items-center gap-1" style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#219EBC" }}>
          All courses <ChevronRight size={12} />
        </button>
      </div>

      <div className="px-5 py-3 flex flex-col gap-3">
        {courses.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12px", fontWeight: 500, color: "#e8f4f8" }}>
                  {c.name}
                </div>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.5)" }}>
                  {c.subject} · {c.teacher}
                </div>
              </div>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12px", fontWeight: 600, color: c.color }}>
                {c.progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(142,202,230,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${c.progress}%`, background: `linear-gradient(90deg, ${c.color}cc, ${c.color})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
