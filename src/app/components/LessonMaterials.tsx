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
    pdf: <FileText size={15} />,
    video: <Film size={15} />,
    image: <Image size={15} />,
    doc: <FileText size={15} />,
  };
  return icons[type];
};

const typeColor = (type: Material["type"]) => {
  const map = {
    pdf: { bg: "rgba(220,19,123,0.08)", border: "rgba(220,19,123,0.2)", color: "#dc137b" },
    video: { bg: "rgba(41,61,125,0.08)", border: "rgba(41,61,125,0.2)", color: "#293d7d" },
    image: { bg: "rgba(0,147,221,0.08)", border: "rgba(0,147,221,0.2)", color: "#0093dd" },
    doc: { bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.2)", color: "#d4af37" },
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
            style={{ background: "rgba(0,147,221,0.08)", color: "#0093dd" }}
          >
            <Folder size={16} />
          </div>
          <div>
            <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>
              Lesson Materials &amp; Syllabi
            </span>
            <div style={{ fontSize: "11px", color: "var(--subtext)" }}>
              {materials.filter((m) => !viewed[m.id]).length} unviewed resources
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1" style={{ fontFamily: "'Raleway',sans-serif", fontSize: "11.5px", fontWeight: 700, color: "#dc137b" }}>
          All files <ChevronRight size={12} />
        </button>
      </div>

      {/* File list */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {materials.map((m) => {
          const tc = typeColor(m.type);
          const isViewed = viewed[m.id];
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-5 py-3 transition-all duration-150"
              style={{ background: isViewed ? "transparent" : "rgba(41,61,125,0.02)" }}
            >
              {/* File type icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}
              >
                {typeIcon(m.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "'Raleway',sans-serif",
                      fontSize: "12.5px",
                      fontWeight: isViewed ? 600 : 700,
                      color: "var(--heading)",
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
                      style={{ background: "rgba(220,19,123,0.1)", fontSize: "9px", color: "#dc137b", fontFamily: "'Raleway',sans-serif", fontWeight: 800, whiteSpace: "nowrap" }}
                    >
                      NEW
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "1px" }}>
                  {m.teacher} · {m.date} · {m.size}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Viewed toggle */}
                <button
                  onClick={() => toggleViewed(m.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isViewed ? "var(--muted)" : "rgba(220,19,123,0.08)",
                    border: isViewed ? "1px solid var(--border)" : "1px solid rgba(220,19,123,0.2)",
                  }}
                  title={isViewed ? "Mark as unviewed" : "Mark as viewed"}
                >
                  {isViewed ? (
                    <EyeOff size={12} style={{ color: "var(--subtext)" }} />
                  ) : (
                    <Eye size={12} style={{ color: "#dc137b" }} />
                  )}
                </button>
                <button
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                  title="Download"
                >
                  <Download size={12} style={{ color: "var(--subtext)" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: "var(--border)", background: "var(--muted)" }}
      >
        <span style={{ fontSize: "11px", color: "var(--subtext)" }}>
          {materials.filter((m) => viewed[m.id]).length}/{materials.length} resources completed
        </span>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(Object.values(viewed).filter(Boolean).length / materials.length) * 100}%`,
                background: "#0093dd",
              }}
            />
          </div>
          <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: "11px", fontWeight: 700, color: "#0093dd" }}>
            {Math.round((Object.values(viewed).filter(Boolean).length / materials.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
