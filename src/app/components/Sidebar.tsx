import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  Receipt,
  MessageSquare,
  Library,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  FlaskConical,
  HelpCircle,
} from "lucide-react";

type NavItem = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  children?: { icon: React.ReactNode; label: string }[];
};

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={17} />, label: "Dashboard Overview", active: true },
  {
    icon: <GraduationCap size={17} />,
    label: "Academics",
    children: [
      { icon: <BookOpen size={15} />, label: "My Courses" },
      { icon: <FlaskConical size={15} />, label: "Lesson Materials" },
    ],
  },
  { icon: <FileText size={17} />, label: "Results & Transcripts" },
  { icon: <Receipt size={17} />, label: "Fees & Payments" },
  { icon: <MessageSquare size={17} />, label: "Communication & Parent Portal" },
  { icon: <Library size={17} />, label: "Library & Helpdesk" },
];

export function Sidebar() {
  const [academicsOpen, setAcademicsOpen] = useState(true);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-50"
      style={{
        background: "#16234b",
        borderRight: "1px solid rgba(191, 209, 255, 0.12)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "rgba(191,209,255,0.12)" }}>
        <img src="/logo.png" alt="DLHS" className="w-10 h-10 rounded-lg object-contain" />
        <div>
          <div style={{ fontFamily: "'Raleway',sans-serif", fontWeight: 800, fontSize: "14.5px", color: "#ffffff", letterSpacing: "0.01em" }}>
            DLHS Kaduna
          </div>
          <div style={{ fontFamily: "'Raleway',sans-serif", fontWeight: 700, fontSize: "10.5px", color: "#d4af37", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Result Portal
          </div>
        </div>
      </div>

      {/* Student profile mini */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(191,209,255,0.08)" }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#dc137b", fontSize: "12.5px", fontWeight: 800, color: "#ffffff" }}
        >
          KA
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: "13px", fontWeight: 700, color: "#f8fafc" }} className="truncate">
            Kolade Adeyemi
          </div>
          <div style={{ fontSize: "11px", color: "#bfd1ff" }}>
            SS2 — Sciences
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isAcademics = item.label === "Academics";
          return (
            <div key={item.label} className="mb-1">
              <button
                onClick={() => isAcademics && setAcademicsOpen((p) => !p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
                style={{
                  background: item.active
                    ? "rgba(220,19,123,0.18)"
                    : "transparent",
                  borderLeft: item.active ? "3px solid #dc137b" : "3px solid transparent",
                }}
              >
                <span style={{ color: item.active ? "#dc137b" : "#bfd1ff" }}>{item.icon}</span>
                <span
                  style={{
                    fontFamily: "'Raleway',sans-serif",
                    fontSize: "12.5px",
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? "#ffffff" : "#bfd1ff",
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {item.label}
                </span>
                {isAcademics &&
                  (academicsOpen ? (
                    <ChevronDown size={14} style={{ color: "#bfd1ff" }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: "#bfd1ff" }} />
                  ))}
              </button>
              {isAcademics && academicsOpen && item.children && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5">
                  {item.children.map((child) => (
                    <button
                      key={child.label}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150"
                      style={{ background: "transparent" }}
                    >
                      <span style={{ color: "#bfd1ff", opacity: 0.75 }}>{child.icon}</span>
                      <span style={{ fontSize: "12px", color: "rgba(248,250,252,0.85)", fontWeight: 500 }}>
                        {child.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Help */}
      <div className="px-4 pb-6">
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "rgba(191,209,255,0.06)", border: "1px solid rgba(191,209,255,0.12)", cursor: "pointer" }}
        >
          <HelpCircle size={15} style={{ color: "#bfd1ff" }} />
          <span style={{ fontSize: "12px", color: "#bfd1ff", fontWeight: 600 }}>Help &amp; Support</span>
        </button>
      </div>
    </aside>
  );
}
