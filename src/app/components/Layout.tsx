import { useState, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, Navigate } from "react-router";
import {
  LayoutDashboard, BookOpen, FileText, Receipt, MessageSquare, Library,
  GraduationCap, ClipboardList, FlaskConical, ChevronDown, ChevronRight,
  LogOut, HelpCircle, Users, Settings, BarChart2, CheckSquare, CalendarDays,
  Bell, Search, Sun, Moon, UserCheck, Menu, X, ArrowUp, Award,
} from "lucide-react";
import { useApp, Role } from "../contexts/AppContext";
import { NotificationPanel } from "./NotificationPanel";
import { apiClient, API_BASE_URL } from "../lib/apiClient";

interface NavItem {
  icon: ReactNode;
  label: string;
  to?: string;
  children?: { icon: ReactNode; label: string; to: string }[];
}

const NAV: Record<Role, NavItem[]> = {
  student: [
    { icon: <LayoutDashboard size={17} />, label: "Dashboard", to: "/student" },
    {
      icon: <GraduationCap size={17} />, label: "Academics & CBT",
      children: [
        { icon: <BookOpen size={15} />, label: "My Courses", to: "/student/courses" },
        { icon: <FlaskConical size={15} />, label: "Lesson Materials", to: "/student/materials" },
        { icon: <ClipboardList size={15} />, label: "Test Center (CBT)", to: "/student/cbt" },
      ],
    },
    { icon: <FileText size={17} />, label: "Results & Transcripts", to: "/student/results" },
    { icon: <Receipt size={17} />, label: "Fees & Payments", to: "/student/fees" },
    { icon: <MessageSquare size={17} />, label: "Communication", to: "/student/communication" },
    { icon: <Library size={17} />, label: "Library & Helpdesk", to: "/student/library" },
    { icon: <Settings size={17} />, label: "Account Settings", to: "/student/settings" },
  ],
  teacher: [
    { icon: <LayoutDashboard size={17} />, label: "Dashboard", to: "/teacher" },
    { icon: <Users size={17} />, label: "My Classes", to: "/teacher/classes" },
    { icon: <ClipboardList size={17} />, label: "Create CBT", to: "/teacher/cbt" },
    { icon: <FileText size={17} />, label: "Upload Materials", to: "/teacher/materials" },
    { icon: <CalendarDays size={17} />, label: "Attendance", to: "/teacher/attendance" },
    { icon: <CheckSquare size={17} />, label: "Grade Submissions", to: "/teacher/grades" },
    { icon: <UserCheck size={17} />, label: "Assessments", to: "/teacher/assessments" },
    { icon: <Award size={17} />, label: "Form Class", to: "/teacher/form-class" },
    { icon: <Settings size={17} />, label: "Account Settings", to: "/teacher/settings" },
  ],
  admin: [
    { icon: <LayoutDashboard size={17} />, label: "Dashboard", to: "/admin" },
    { icon: <Users size={17} />, label: "User Management", to: "/admin/users" },
    { icon: <BookOpen size={17} />, label: "Academic Setup", to: "/admin/classes" },
    { icon: <Library size={17} />, label: "E-Library Manager", to: "/admin/library" },
    { icon: <GraduationCap size={17} />, label: "Admissions", to: "/admin/admissions" },
    { icon: <ClipboardList size={17} />, label: "CBT Approvals", to: "/admin/cbt" },
    { icon: <Receipt size={17} />, label: "Fee Management", to: "/admin/fees" },
    { icon: <BarChart2 size={17} />, label: "Reports & Analytics", to: "/admin/reports" },
    { icon: <Settings size={17} />, label: "System Settings", to: "/admin/settings" },
  ],
  parent: [
    { icon: <LayoutDashboard size={17} />, label: "Dashboard", to: "/parent" },
    { icon: <GraduationCap size={17} />, label: "Admissions", to: "/parent/admissions" },
    { icon: <BarChart2 size={17} />, label: "Academic Performance", to: "/parent/performance" },
    { icon: <Receipt size={17} />, label: "Fees & Payments", to: "/parent/fees" },
    { icon: <MessageSquare size={17} />, label: "Communication", to: "/parent/communication" },
    { icon: <UserCheck size={17} />, label: "Attendance", to: "/parent/performance" },
    { icon: <Settings size={17} />, label: "My Profile", to: "/parent/settings" },
  ],
};

const ROLE_COLOR: Record<Role, string> = {
  student: "#219EBC",
  teacher: "#8ECAE6",
  admin: "#FB8500",
  parent: "#FFB703",
};

function SidebarNavItem({ item, basePath, onNavClick }: { item: NavItem; basePath: string; onNavClick?: () => void }) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setOpen((p) => !p)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{ background: "transparent", border: "2px solid transparent" }}
        >
          <span style={{ color: "var(--sky)" }}>{item.icon}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12.5px", color: "var(--sky)", flex: 1, textAlign: "left" }}>
            {item.label}
          </span>
          {open ? <ChevronDown size={12} style={{ color: "var(--sky)", opacity: 0.6 }} /> : <ChevronRight size={12} style={{ color: "var(--sky)", opacity: 0.6 }} />}
        </button>
        {open && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
            {item.children!.map((c) => (
              <NavLink
                key={c.to}
                to={c.to}
                end
                onClick={onNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${isActive ? "nav-active" : ""}`
                }
                style={({ isActive }) => ({
                  background: isActive ? "rgba(33,158,188,0.18)" : "transparent",
                  borderLeft: isActive ? "2px solid #219EBC" : "2px solid transparent",
                })}
              >
                <span style={{ color: "rgba(142,202,230,0.7)" }}>{c.icon}</span>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12px", color: "rgba(232,244,248,0.75)" }}>
                  {c.label}
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to!}
      end={item.to === `/${basePath}`}
      onClick={onNavClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-150 ${isActive ? "nav-active" : ""}`
      }
      style={({ isActive }) => ({
        background: isActive ? "rgba(33,158,188,0.2)" : "transparent",
        borderLeft: isActive ? "2px solid #219EBC" : "2px solid transparent",
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? "#219EBC" : "var(--sky)" }}>{item.icon}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: "12.5px", fontWeight: isActive ? 600 : 400, color: isActive ? "#e8f4f8" : "var(--sky)" }}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, theme, toggleTheme, settings } = useApp();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Support ticket form states
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false);

  // Back to Top button state & scroll listener
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const handleScroll = (e?: any) => {
      const winY = window.pageYOffset || window.scrollY || 0;
      const docY = document.documentElement?.scrollTop || 0;
      const bodyY = document.body?.scrollTop || 0;
      const rootY = document.getElementById("root")?.scrollTop || 0;
      const targetY = (e?.target && e.target !== document) ? (e.target.scrollTop || 0) : 0;
      const scrollY = Math.max(winY, docY, bodyY, rootY, targetY);
      setShowBackToTop(scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.body.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true } as any);
      document.removeEventListener("scroll", handleScroll, { capture: true } as any);
      document.body.removeEventListener("scroll", handleScroll, { capture: true } as any);
      if (rootEl) {
        rootEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const schoolName = settings?.school_name || "Aroura Academy";
  const schoolParts = schoolName.split(" ");
  const schoolFirst = schoolParts[0] || "Aroura";
  const schoolRest = schoolParts.slice(1).join(" ") || "Academy";

  const roleColor = ROLE_COLOR[user.role];
  const initials = (user.first_name?.[0] || "") + (user.last_name?.[0] || "");
  const name = `${user.first_name} ${user.last_name}`;
  const subtitle = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSendingTicket(true);
    try {
      await apiClient.post("/users/send-support", { subject, message });
      setTicketSent(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit support ticket. Please try again.");
    } finally {
      setSendingTicket(false);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--sidebar-border)", display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="/logo.png"
          alt="School Logo"
          style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#e8f4f8", letterSpacing: "0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{schoolFirst}</div>
          <div style={{ fontSize: 10, color: "#8ECAE6", letterSpacing: "0.08em", textTransform: "uppercase" }}>{schoolRest}</div>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={closeSidebar}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(142,202,230,0.6)", display: "flex", alignItems: "center", padding: 4 }}
          className="md-hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* User chip */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--sidebar-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${roleColor}, rgba(142,202,230,0.6))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#011d2f",
            overflow: "hidden"
          }}
        >
          {(user as any)?.avatar_path ? (
            <img
              src={API_BASE_URL.replace('/index.php', '') + '/' + (user as any).avatar_path}
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e8f4f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(142,202,230,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        </div>
        <div
          style={{
            padding: "2px 7px", borderRadius: 6, flexShrink: 0,
            background: `rgba(${roleColor === "#219EBC" ? "33,158,188" : roleColor === "#FFB703" ? "255,183,3" : roleColor === "#FB8500" ? "251,133,0" : "142,202,230"},0.15)`,
            fontSize: 9, fontWeight: 700, color: roleColor, textTransform: "uppercase", letterSpacing: "0.05em",
          }}
        >
          {user.role}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {(NAV[user.role] ?? []).map((item) => (
          <SidebarNavItem key={item.label} item={item} basePath={user.role} onNavClick={closeSidebar} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={() => { setHelpOpen(true); closeSidebar(); }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full transition-all duration-150"
          style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <HelpCircle size={15} style={{ color: "rgba(142,202,230,0.5)" }} />
          <span style={{ fontSize: 12, color: "rgba(142,202,230,0.5)" }}>Help & Support</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(185,28,28,0.25) 100%)",
            border: "1px solid rgba(220,38,38,0.3)",
            cursor: "pointer",
            marginTop: 2,
          }}
        >
          <LogOut size={16} style={{ color: "#f87171" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#f87171", letterSpacing: "0.02em" }}>Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile responsive CSS */}
      <style>{`
        :root { --sidebar-w: 240px; --topbar-h: 60px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar-left { left: 0 !important; }
          .main-content { margin-left: 0 !important; padding: 16px !important; }
          .topbar-search { display: none !important; }
          .topbar-session { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-overlay { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
        .mobile-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
          display: flex; flex-direction: column;
          background: var(--sidebar);
          border-right: 1px solid var(--sidebar-border);
          backdrop-filter: blur(20px);
          z-index: 200;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .mobile-drawer.open { transform: translateX(0); }
        .mobile-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          backdrop-filter: blur(2px); z-index: 199;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        .mobile-overlay.open { opacity: 1; pointer-events: all; }
        .md-hidden { display: none; }
        @media (max-width: 768px) { .md-hidden { display: flex !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Poppins',sans-serif", width: "100%", maxWidth: "100vw", overflowX: "hidden", boxSizing: "border-box" }}>

        {/* ===== DESKTOP SIDEBAR ===== */}
        <aside
          className="desktop-sidebar"
          style={{
            position: "fixed", left: 0, top: 0, bottom: 0,
            width: "var(--sidebar-w)",
            display: "flex", flexDirection: "column",
            background: "var(--sidebar)",
            borderRight: "1px solid var(--sidebar-border)",
            backdropFilter: "blur(20px)",
            zIndex: 50,
          }}
        >
          {sidebarContent}
        </aside>

        {/* ===== MOBILE OVERLAY ===== */}
        <div
          className={`mobile-overlay${sidebarOpen ? " open" : ""}`}
          onClick={closeSidebar}
        />

        {/* ===== MOBILE DRAWER ===== */}
        <div className={`mobile-drawer${sidebarOpen ? " open" : ""}`}>
          {sidebarContent}
        </div>

        {/* ===== TOPBAR ===== */}
        <header
          style={{
            position: "fixed", top: 0, right: 0, left: 0,
            marginLeft: 0,
            height: "var(--topbar-h)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px",
            background: theme === "dark" ? "rgba(1,16,28,0.9)" : "rgba(238,246,250,0.92)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            zIndex: 40,
          }}
        >
          {/* Left: hamburger (mobile) + desktop spacer + search */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger — mobile only */}
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--muted)", border: "1px solid var(--border)",
                cursor: "pointer", color: "var(--heading)", flexShrink: 0
              }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            {/* Desktop sidebar offset */}
            <div className="topbar-search" style={{ marginLeft: "calc(var(--sidebar-w) - 16px)" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 14px", borderRadius: 10, width: 240,
                  background: "var(--muted)", border: "1px solid var(--border)",
                }}
              >
                <Search size={14} style={{ color: "var(--subtext)", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "var(--subtext)" }}>Search {schoolFirst}…</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Session badge — hidden on mobile to save space */}
            <div className="topbar-session" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#219EBC", boxShadow: "0 0 5px #219EBC" }} />
              <span style={{ fontSize: 11, color: "#219EBC" }}>
                {settings?.academic_session || "2026/2027"} · {settings?.current_term || "2nd Term"}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--muted)", border: "1px solid var(--border)",
                cursor: "pointer", transition: "all 0.2s",
              }}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark"
                ? <Sun size={16} style={{ color: "#FFB703" }} />
                : <Moon size={16} style={{ color: "#219EBC" }} />}
            </button>

            {/* Notification bell */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setNotifOpen((p) => !p)}
                style={{
                  width: 36, height: 36, borderRadius: 10, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: notifOpen ? "rgba(33,158,188,0.2)" : "var(--muted)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <Bell size={16} style={{ color: "var(--subtext)" }} />
                <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#FFB703", boxShadow: "0 0 5px #FFB703" }} />
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Avatar */}
            <div
              onClick={() => {
                if (user.role === 'student') navigate('/student/settings');
                else if (user.role === 'admin') navigate('/admin/settings');
                else if (user.role === 'parent') navigate('/parent/settings');
                else if (user.role === 'teacher') navigate('/teacher/settings');
              }}
              title="Account Settings"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${roleColor}, rgba(142,202,230,0.6))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#011d2f",
                  overflow: "hidden"
                }}
              >
                {(user as any)?.avatar_path ? (
                  <img
                    src={API_BASE_URL.replace('/index.php', '') + '/' + (user as any).avatar_path}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <main
          className="main-content"
          style={{
            marginLeft: "var(--sidebar-w)",
            marginTop: "var(--topbar-h)",
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box",
            minHeight: "calc(100vh - var(--topbar-h))",
            background: "var(--background)",
            transition: "background 0.3s",
            padding: "24px",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>

        {/* ===== BACK TO TOP BUTTON (Portaled directly to document.body) ===== */}
        {typeof document !== "undefined" && createPortal(
          <button
            type="button"
            onClick={scrollToTop}
            style={{
              position: "fixed",
              bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
              right: 22,
              zIndex: 999999,
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #219EBC, #023047)",
              border: "1.5px solid rgba(255,255,255,0.4)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(2,48,71,0.65), 0 2px 8px rgba(0,0,0,0.4)",
              transition: "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: showBackToTop ? 1 : 0,
              pointerEvents: showBackToTop ? "auto" : "none",
              transform: showBackToTop ? "scale(1)" : "scale(0.75)",
            }}
            onMouseEnter={e => { if (showBackToTop) (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.08)"; }}
            onMouseLeave={e => { if (showBackToTop) (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)"; }}
            title="Back to top"
            aria-label="Back to top"
          >
            <ArrowUp size={22} strokeWidth={2.5} />
          </button>,
          document.body
        )}

        {/* ===== HELP & SUPPORT MODAL ===== */}
        {helpOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(1, 18, 29, 0.6)", backdropFilter: "blur(8px)", padding: "16px" }}>
            <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, width: "100%", maxWidth: "800px", maxHeight: "90vh", boxShadow: "var(--glass-shadow)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><HelpCircle size={18} style={{ color: "#FB8500" }} /> Help & Support Desk</h3>
                  <span style={{ fontSize: 11.5, color: "var(--subtext)" }}>Knowledge base and contact line for {user.role}s</span>
                </div>
                <button onClick={() => { setHelpOpen(false); setSubject(""); setMessage(""); setTicketSent(false); }} style={{ background: "none", border: "none", color: "var(--subtext)", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>✕</button>
              </div>
              
              {/* Body — responsive single column on mobile */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 24, padding: 24 }}
                  className="help-grid">
                  <style>{`@media(max-width:640px){.help-grid{grid-template-columns:1fr!important;}}`}</style>
                  {/* FAQs column */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Frequently Asked Questions</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
                      {getFaqsForRole(user.role).map((faq, idx) => (
                        <div key={idx} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
                          <strong style={{ fontSize: 12, color: "var(--heading)", display: "block", marginBottom: 4 }}>Q: {faq.q}</strong>
                          <span style={{ fontSize: 11.5, color: "var(--subtext)", lineHeight: 1.45 }}>{faq.a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Support Ticket column */}
                  <div style={{ borderLeft: "1px solid var(--glass-border)", paddingLeft: 24 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Contact Support</h4>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "var(--subtext)", marginBottom: 18, background: "rgba(33,158,188,0.06)", border: "1px solid rgba(33,158,188,0.15)", borderRadius: 10, padding: 12 }}>
                      <div>📞 Phone: <strong>{settings?.school_phone || "+234 801 234 5678"}</strong></div>
                      <div>✉ Email: <strong>{settings?.school_email || "support@aroura.edu.ng"}</strong></div>
                      <div>📍 Address: <strong>{settings?.school_address || "Aroura Academy Campus"}</strong></div>
                    </div>

                    {ticketSent ? (
                      <div style={{ padding: "24px 16px", textAlign: "center", background: "rgba(42,157,143,0.08)", border: "1px solid rgba(42,157,143,0.2)", borderRadius: 10 }}>
                        <div style={{ fontSize: 24, marginBottom: 8, color: "#2a9d8f" }}>✓</div>
                        <strong style={{ fontSize: 13, color: "#2a9d8f", display: "block", marginBottom: 4 }}>Ticket Sent!</strong>
                        <span style={{ fontSize: 11.5, color: "var(--subtext)", lineHeight: 1.4 }}>Your message has been sent directly to the administrator. We will get back to you shortly.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSendSupport} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Subject</label>
                          <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. CBT login error" style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 4, textTransform: "uppercase" }}>Message Description</label>
                          <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="Provide detailed explanation..." rows={4} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                        </div>
                        <button type="submit" disabled={sendingTicket} style={{ width: "100%", padding: "9px", borderRadius: 8, background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}>
                          {sendingTicket ? "Sending..." : "Submit Ticket"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const getFaqsForRole = (role: string) => {
  const r = role.toLowerCase();
  if (r === "student") {
    return [
      { q: "How do I take a Computer Based Test (CBT)?", a: "Navigate to 'Academics & CBT' > 'Test Center (CBT)'. If there is an active exam scheduled, click 'Start Exam' to begin. Your timer will count down automatically." },
      { q: "Where can I view my term results?", a: "Go to the 'Results & Transcripts' page. Select the session and term to view your compiled grade sheet and download your PDF transcript." },
      { q: "How do I access lecture notes?", a: "Click on 'Lesson Materials' under 'Academics & CBT' to download PDFs, docx, or slide guides uploaded by your class teachers." },
      { q: "What should I do if a score is incorrect?", a: "Send a direct message to your subject teacher using the Communication portal, or submit a support ticket here so the admin can review it." }
    ];
  }
  if (r === "parent") {
    return [
      { q: "How is the Admissions Acceptance Fee paid?", a: "Once your child is admitted, go to the parent dashboard admissions list and click 'Accept Offer'. Complete the payment using Card, Bank Transfer, or USSD tabs." },
      { q: "Where do I retrieve printable receipts?", a: "Go to the 'Fees & Payments' page. Scroll down to 'Payment Ledger History'. Under the actions column, click the receipt print icon next to any past payment." },
      { q: "How do I add or register another child?", a: "On the parent dashboard, click the '+ Apply for Admission' or 'Start Application' button to begin registration and form payment." },
      { q: "How do I contact teachers directly?", a: "Open the 'Communication' page. Select the child's teacher from the left sidebar and type your message in the chat box." }
    ];
  }
  if (r === "teacher") {
    return [
      { q: "How do I create a new CBT Exam?", a: "Go to 'Create CBT' in the sidebar. Select your course, set exam title, duration, and add questions. Click 'Submit for Approval' to send it to the administrator." },
      { q: "Where do I enter continuous assessments?", a: "Go to 'Grade Submissions'. Select the class and course. You can record CA1 (20%), CA2 (20%), and final Exam (60%) scores directly in the grade spreadsheet." },
      { q: "How is daily attendance recorded?", a: "Click 'Attendance' in the sidebar. Choose the class and date. Toggle student circles to mark Present/Absent and click Save." },
      { q: "Can I upload materials for my classes?", a: "Yes. Navigate to 'Upload Materials'. Drag & drop slides, PDF lecture notes, or syllabus files, then assign them to the relevant class." }
    ];
  }
  return [
    { q: "How do I set the global school fees rates?", a: "Go to 'Fee Management' and select the 'Fee Rates Configuration' tab. You can configure Acceptance, Tuition, and Books & Materials rates globally." },
    { q: "How do I register multiple users at once?", a: "Go to 'User Management'. Click 'Download CSV Template', prepare your user sheet, and click 'Bulk Import CSV' to register them in one go." },
    { q: "How do I verify bank transfer fee payments?", a: "Go to 'Fee Management' and scroll through pending receipts. Click 'Record Payment' next to the balance, enter the paid amount, and confirm." },
    { q: "Where do I update school address and director name?", a: "Go to 'System Settings' under 'General Parameters'. Modify the fields and click 'Save Changes' to update admission letters globally." }
  ];
};
