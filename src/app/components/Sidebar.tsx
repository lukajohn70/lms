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
  { icon: <LayoutDashboard size={18} />, label: "Dashboard Overview", active: true },
  {
    icon: <GraduationCap size={18} />,
    label: "Academics & CBT Center",
    children: [
      { icon: <BookOpen size={16} />, label: "My Courses" },
      { icon: <FlaskConical size={16} />, label: "Lesson Materials" },
      { icon: <ClipboardList size={16} />, label: "Test Center" },
    ],
  },
  { icon: <FileText size={18} />, label: "Results & Transcripts" },
  { icon: <Receipt size={18} />, label: "Fees & Payments" },
  { icon: <MessageSquare size={18} />, label: "Communication & Parent Portal" },
  { icon: <Library size={18} />, label: "Library & Helpdesk" },
];

export function Sidebar() {
  const [academicsOpen, setAcademicsOpen] = useState(true);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-50"
      style={{
        background: "rgba(1, 16, 28, 0.97)",
        borderRight: "1px solid rgba(142, 202, 230, 0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b" style={{ borderColor: "rgba(142,202,230,0.1)" }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #219EBC 0%, #FB8500 100%)",
            boxShadow: "0 4px 20px rgba(33,158,188,0.4)",
          }}
        >
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "18px", color: "#fff" }}>A</span>
        </div>
        <div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "15px", color: "#e8f4f8", letterSpacing: "0.02em" }}>
            Aroura
          </div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 400, fontSize: "11px", color: "#8ECAE6", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Academy
          </div>
        </div>
      </div>

      {/* Student profile mini */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(142,202,230,0.07)" }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #219EBC, #8ECAE6)", fontSize: "13px", fontWeight: 600, color: "#011d2f" }}
        >
          KA
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "13px", fontWeight: 500, color: "#e8f4f8" }} className="truncate">
            Kolade Adeyemi
          </div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "11px", color: "#8ECAE6" }}>
            SS2 — Computer Sci.
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isAcademics = item.label === "Academics & CBT Center";
          return (
            <div key={item.label} className="mb-1">
              <button
                onClick={() => isAcademics && setAcademicsOpen((p) => !p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
                style={{
                  background: item.active
                    ? "linear-gradient(90deg, rgba(33,158,188,0.25) 0%, rgba(33,158,188,0.05) 100%)"
                    : "transparent",
                  borderLeft: item.active ? "2px solid #219EBC" : "2px solid transparent",
                }}
              >
                <span style={{ color: item.active ? "#219EBC" : "#8ECAE6" }}>{item.icon}</span>
                <span
                  style={{
                    fontFamily: "'Poppins',sans-serif",
                    fontSize: "13px",
                    fontWeight: item.active ? 600 : 400,
                    color: item.active ? "#e8f4f8" : "#8ECAE6",
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {item.label}
                </span>
                {isAcademics &&
                  (academicsOpen ? (
                    <ChevronDown size={14} style={{ color: "#8ECAE6" }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: "#8ECAE6" }} />
                  ))}
              </button>
              {isAcademics && academicsOpen && item.children && (
                <div className="ml-4 mt-1">
                  {item.children.map((child) => (
                    <button
                      key={child.label}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150"
                      style={{ background: "transparent" }}
                    >
                      <span style={{ color: "#8ECAE6", opacity: 0.7 }}>{child.icon}</span>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12px", color: "#8ECAE6", fontWeight: 400 }}>
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
          style={{ background: "rgba(142,202,230,0.05)", border: "1px solid rgba(142,202,230,0.12)" }}
        >
          <HelpCircle size={15} style={{ color: "#8ECAE6" }} />
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12px", color: "#8ECAE6" }}>Help & Support</span>
        </button>
      </div>
    </aside>
  );
}
