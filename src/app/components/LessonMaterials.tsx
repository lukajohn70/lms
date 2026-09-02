import { useState } from "react";
import { FileText, Film, Image, Eye, EyeOff, Download, ChevronRight, Folder } from "lucide-react";

type Material = {
  id: number;
  title: string;
  subject: string;
  type: "pdf" | "video" | "image" | "doc";
  teacher: string;
  date: string;
  size: string;
  viewed: boolean;
};

const materials: Material[] = [
  { id: 1, title: "SQL Database Schema 2.1", subject: "Computer Science", type: "pdf", teacher: "Mr. Babatunde Ola", date: "Jun 9, 2026", size: "2.4 MB", viewed: true },
  { id: 2, title: "Quantum Wave Functions — Lecture 4", subject: "Physics", type: "pdf", teacher: "Dr. Amaka Eze", date: "Jun 8, 2026", size: "5.1 MB", viewed: false },
  { id: 3, title: "Integration by Parts — Worked Examples", subject: "Mathematics", type: "pdf", teacher: "Mrs. Ngozi Ike", date: "Jun 7, 2026", size: "1.8 MB", viewed: true },
  { id: 4, title: "OSI Model Explained", subject: "Computer Science", type: "video", teacher: "Mr. Babatunde Ola", date: "Jun 6, 2026", size: "48.2 MB", viewed: false },
  { id: 5, title: "Periodic Table (Interactive)", subject: "Chemistry", type: "image", teacher: "Mrs. Folake Adeyemi", date: "Jun 5, 2026", size: "0.9 MB", viewed: true },
];

const typeIcon = (type: Material["type"]) => {
  const icons = {
    pdf: <FileText size={16} />,
    video: <Film size={16} />,
    image: <Image size={16} />,
    doc: <FileText size={16} />,
  };
  return icons[type];
};

const typeColor = (type: Material["type"]) => {
  const map = {
    pdf: { bg: "rgba(142,202,230,0.12)", border: "rgba(142,202,230,0.3)", color: "#8ECAE6" },
    video: { bg: "rgba(33,158,188,0.1)", border: "rgba(33,158,188,0.25)", color: "#219EBC" },
    image: { bg: "rgba(255,183,3,0.08)", border: "rgba(255,183,3,0.2)", color: "#FFB703" },
    doc: { bg: "rgba(251,133,0,0.08)", border: "rgba(251,133,0,0.2)", color: "#FB8500" },
  };
  return map[type];
};

export function LessonMaterials() {
  const [viewed, setViewed] = useState<Record<number, boolean>>(
    Object.fromEntries(materials.map((m) => [m.id, m.viewed]))
  );

  const toggleViewed = (id: number) => setViewed((p) => ({ ...p, [id]: !p[id] }));

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
            style={{ background: "rgba(142,202,230,0.1)", border: "1px solid rgba(142,202,230,0.2)" }}
          >
            <Folder size={15} style={{ color: "#8ECAE6" }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "14px", fontWeight: 600, color: "#e8f4f8" }}>
              Lesson Materials
            </span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#8ECAE6" }}>
              {materials.filter((m) => !viewed[m.id]).length} unviewed items
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1" style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#219EBC" }}>
          All files <ChevronRight size={12} />
        </button>
      </div>

      {/* File list */}
      <div className="divide-y" style={{ borderColor: "rgba(142,202,230,0.06)" }}>
        {materials.map((m) => {
          const tc = typeColor(m.type);
          const isViewed = viewed[m.id];
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-5 py-3 transition-all duration-150"
              style={{ background: isViewed ? "transparent" : "rgba(33,158,188,0.03)" }}
            >
              {/* File type icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}
              >
                {typeIcon(m.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "'Poppins',sans-serif",
                      fontSize: "12px",
                      fontWeight: isViewed ? 400 : 600,
                      color: isViewed ? "#8ECAE6" : "#e8f4f8",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.title}
                  </span>
                  {!isViewed && (
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(33,158,188,0.15)", fontSize: "9px", color: "#219EBC", fontFamily: "'Poppins',sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      NEW
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "rgba(142,202,230,0.5)", marginTop: "1px" }}>
                  {m.teacher} · {m.date} · {m.size}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Viewed toggle */}
                <button
                  onClick={() => toggleViewed(m.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isViewed ? "rgba(142,202,230,0.08)" : "rgba(33,158,188,0.12)",
                    border: isViewed ? "1px solid rgba(142,202,230,0.15)" : "1px solid rgba(33,158,188,0.25)",
                  }}
                  title={isViewed ? "Mark as unviewed" : "Mark as viewed"}
                >
                  {isViewed ? (
                    <EyeOff size={11} style={{ color: "rgba(142,202,230,0.5)" }} />
                  ) : (
                    <Eye size={11} style={{ color: "#219EBC" }} />
                  )}
                </button>
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(142,202,230,0.06)", border: "1px solid rgba(142,202,230,0.12)" }}
                  title="Download"
                >
                  <Download size={11} style={{ color: "#8ECAE6" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: "1px solid rgba(142,202,230,0.08)", background: "rgba(1,16,28,0.3)" }}
      >
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "rgba(142,202,230,0.5)" }}>
          {materials.filter((m) => viewed[m.id]).length}/{materials.length} materials viewed
        </span>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(142,202,230,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Object.values(viewed).filter(Boolean).length / materials.length) * 100}%`,
                background: "linear-gradient(90deg, #219EBC, #8ECAE6)",
              }}
            />
          </div>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "10px", color: "#219EBC" }}>
            {Math.round((Object.values(viewed).filter(Boolean).length / materials.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
