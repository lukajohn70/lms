import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  School, BookOpen, Users, Award, Phone, Mail, MapPin, 
  Download, CheckCircle, Printer, Search, 
  ArrowRight, Calendar, AlertCircle, ChevronRight, Menu, X
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const BACKEND_URL = API_BASE_URL.replace('/index.php', '/');

export default function LandingPage() {
  const { theme, toggleTheme, user: globalUser, isLoggedIn } = useApp();
  const navigate = useNavigate();

  // Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active tab in academics section
  const [academicsTab, setAcademicsTab] = useState<"primary" | "junior" | "senior">("primary");

  // Status check state (kept on landing page for quick public tracking)
  const [searchAppNumber, setSearchAppNumber] = useState("");
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusError, setStatusError] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Accept admission portal setup state (used in status check widget)
  const [portalPassword, setPortalPassword] = useState("");
  const [portalSuccess, setPortalSuccess] = useState<any>(null);
  const [portalError, setPortalError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const [showAdmsModal, setShowAdmsModal] = useState(false);

  // Navigate to admissions: redirect to parent portal or login
  const handleOpenAdmissions = () => {
    if (isLoggedIn && globalUser && globalUser.role === "parent") {
      navigate("/parent/admissions");
    } else {
      setShowAdmsModal(true);
    }
  };

  // Handle checking status (public tracker stays on landing page)
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAppNumber.trim()) return;
    setStatusLoading(true);
    setStatusError("");
    setStatusResult(null);
    setPortalSuccess(null);
    setPortalError("");
    try {
      const data = await apiClient.get(`/admissions/status?number=${searchAppNumber.trim()}`);
      setStatusResult(data.application);
    } catch (err: any) {
      setStatusError(err.message || "No application found with that code.");
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle parent creating portal account after admission (via status widget)
  const handleCreatePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalPassword) return;
    setPortalLoading(true);
    setPortalError("");
    try {
      const data = await apiClient.post("/admissions/create-account", {
        application_number: statusResult.application_number,
        password: portalPassword
      });
      setPortalSuccess(data);
      setStatusResult({ ...statusResult, portal_created: true });
    } catch (err: any) {
      setPortalError(err.message || "Failed to create account.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "#219EBC";
      case "exam_scheduled": return "#8ECAE6";
      case "exam_completed": return "#FFB703";
      case "admitted": return "#2a9d8f";
      case "rejected": return "#e76f51";
      default: return "#5a7f92";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "applied": return "Application Received";
      case "exam_scheduled": return "Exam Scheduled";
      case "exam_completed": return "Exam Graded (Reviewing)";
      case "admitted": return "Admission Granted";
      case "rejected": return "Not Accepted";
      default: return status;
    }
  };

  // Print exam card from status tracker widget
  const handlePrintCard = (appDetails: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const formattedDate = appDetails.exam_date
      ? new Date(appDetails.exam_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "To be announced";
    const formattedTime = appDetails.exam_date
      ? new Date(appDetails.exam_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "";
    const passportUrl = appDetails.passport_path 
      ? BACKEND_URL + appDetails.passport_path
      : "";
    const photoBoxContent = passportUrl 
      ? `<img src="${passportUrl}" style="width:120px;height:130px;object-fit:cover;border-radius:8px;" />` 
      : 'PASSPORT<br>PHOTOGRAPH';

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Exam Card – ${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;color:#023047;padding:20px;}
      .card{border:3px double #219EBC;padding:30px;max-width:650px;margin:0 auto;position:relative;border-radius:12px;background:#fafdfc;}
      .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(33,158,188,0.05);font-weight:800;pointer-events:none;z-index:0;white-space:nowrap;}
      .header{display:flex;align-items:center;border-bottom:2px solid #219EBC;padding-bottom:15px;margin-bottom:20px;}
      .logo{width:60px;height:60px;border-radius:12px;margin-right:15px;}
      h1{margin:0;font-size:22px;color:#023047;font-weight:800;text-transform:uppercase;}
      .subtitle{margin:3px 0 0;font-size:12px;color:#fb8500;font-weight:600;text-transform:uppercase;}
      .grid{display:grid;grid-template-columns:140px 1fr;gap:15px;margin-bottom:25px;}
      .photo-box{width:120px;height:130px;border:2px dashed #b5c7d3;display:flex;align-items:center;justify-content:center;background:#f0f4f7;font-size:11px;color:#5a7f92;font-weight:600;text-align:center;border-radius:8px;}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13.5px;}
      .label{font-weight:bold;color:#5a7f92;font-size:11px;text-transform:uppercase;margin-bottom:2px;}
      .value{font-weight:600;color:#023047;}
      .sched{background:rgba(33,158,188,0.08);border:1.5px solid rgba(33,158,188,0.2);border-radius:8px;padding:15px;margin-bottom:20px;}
      .sched-title{font-weight:bold;color:#219EBC;text-transform:uppercase;font-size:12px;margin-bottom:8px;}
      .instructions{font-size:11.5px;line-height:1.5;color:#5a7f92;border-top:1px solid #dde3e8;padding-top:15px;}
      ol{padding-left:20px;margin:5px 0 0;}
      @media print{body{padding:0;}.card{border:2px solid #219EBC;box-shadow:none;max-width:100%;}}
    </style></head><body>
    <div class="card">
      <div class="watermark">AROURA ACADEMY</div>
      <div class="header"><img src="/logo.png" class="logo" alt="Logo"><div><h1>Aroura Academy</h1><p class="subtitle">Entrance Examination Photo Card</p></div></div>
      <div class="grid">
        <div class="photo-box">${photoBoxContent}</div>
        <div class="info-grid">
          <div style="grid-column:span 2"><div class="label">Application Number</div><div class="value" style="font-size:16px;color:#fb8500;font-weight:700;">${appDetails.application_number || ''}</div></div>
          <div><div class="label">Candidate Name</div><div class="value">${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</div></div>
          <div><div class="label">Class Applied For</div><div class="value">${appDetails.grade_level || ''}</div></div>
          <div><div class="label">Date of Birth</div><div class="value">${appDetails.child_dob || ''}</div></div>
          <div><div class="label">Gender</div><div class="value">${appDetails.child_gender || ''}</div></div>
        </div>
      </div>
      <div class="sched">
        <div class="sched-title">Examination Schedule</div>
        <div class="info-grid">
          <div><div class="label">Exam Type</div><div class="value" style="text-transform:uppercase;">${appDetails.exam_type || "Entrance"} Exam</div></div>
          <div><div class="label">Seat Number</div><div class="value" style="color:#fb8500;font-weight:700;">${appDetails.exam_seat_number || "SEAT-100"}</div></div>
          <div><div class="label">Date</div><div class="value">${formattedDate}</div></div>
          <div><div class="label">Time &amp; Venue</div><div class="value">${formattedTime} | ${appDetails.exam_venue || "Main Auditorium"}</div></div>
        </div>
      </div>
      <div class="instructions"><strong>Important Instructions:</strong>
        <ol>
          <li>Print this card and bring it to the exam venue.</li>
          <li><strong>Required items to bring:</strong> original birth certificate, writing materials (pencils, pen, eraser, ruler), and this printed card.</li>
          <li>Report at least 30 minutes before the scheduled time.</li>
          <li>No electronic devices or calculators are allowed.</li>
          <li>This card serves as your identification. Keep it safe.</li>
        </ol>
      </div>
    </div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
      };
    <\/script>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        .web-body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: ${theme === "dark" ? "#01121d" : "#f8fdff"};
          color: ${theme === "dark" ? "#e8f4f8" : "#023047"};
          transition: background-color 0.3s, color 0.3s;
          overflow-x: hidden;
        }

        .web-heading {
          font-family: 'Outfit', sans-serif;
        }

        .glass-nav {
          background: ${theme === "dark" ? "rgba(1, 18, 29, 0.85)" : "rgba(248, 253, 255, 0.85)"};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid ${theme === "dark" ? "rgba(142, 202, 230, 0.1)" : "rgba(2, 48, 71, 0.06)"};
        }

        .hero-banner {
          background-image: linear-gradient(${theme === "dark" ? "rgba(1,18,29,0.88)" : "rgba(248,253,255,0.8)"}, ${theme === "dark" ? "rgba(1,18,29,0.95)" : "rgba(248,253,255,0.92)"}), url(/school_hero.png);
          background-size: cover;
          background-position: center;
          background-attachment: scroll;
        }

        .glow-btn {
          background: linear-gradient(135deg, #fb8500 0%, #ffb703 100%);
          box-shadow: 0 4px 15px rgba(251, 133, 0, 0.3);
          transition: all 0.3s ease;
        }

        .glow-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(251, 133, 0, 0.5);
        }

        .portal-btn {
          background: linear-gradient(135deg, #219EBC 0%, #023047 100%);
          box-shadow: 0 4px 15px rgba(33, 158, 188, 0.3);
          transition: all 0.3s ease;
        }

        .portal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(33, 158, 188, 0.5);
        }

        .glass-card {
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.7)"};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(33, 158, 188, 0.12)"};
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(2, 48, 71, 0.04);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(2, 48, 71, 0.08);
        }

        .input-style {
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "#ffffff"};
          border: 1.5px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "#dde3e8"};
          color: ${theme === "dark" ? "#e8f4f8" : "#023047"};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-style:focus {
          border-color: #219EBC;
          box-shadow: 0 0 0 3px rgba(33, 158, 188, 0.15);
        }

        .modal-overlay {
          background: rgba(1, 18, 29, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 20px;
          overflow-y: auto;
        }

        .tab-btn-active {
          background: #219EBC;
          color: white;
        }

        .tab-btn-inactive {
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(2, 48, 71, 0.04)"};
          color: ${theme === "dark" ? "#8ECAE6" : "#5a7f92"};
        }

        .floating-stat {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div className="web-body min-h-screen">
        
        {/* ===== HEADER / NAVIGATION ===== */}
        <header className="glass-nav sticky top-0 z-50 transition-all">
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="/logo.png" alt="Aroura Academy" style={{ width: 40, height: 40, borderRadius: 10 }} />
              <span className="web-heading" style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>Aroura Academy</span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <a href="#about" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>About</a>
              <a href="#academics" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Programmes</a>
              <a onClick={() => setShowAdmsModal(true)} style={{ cursor: "pointer", textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Admissions</a>
              <a href="#fees" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Fees</a>
              <a href="#contact" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Contact</a>
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Theme toggle */}
              <button 
                onClick={toggleTheme} 
                style={{ 
                  background: "none", border: "none", cursor: "pointer", 
                  color: theme === "dark" ? "#FFB703" : "#219EBC", display: "flex", alignItems: "center" 
                }}
              >
                {theme === "dark" ? <School size={20} /> : <BookOpen size={20} />}
              </button>

              <button 
                className="portal-btn" 
                onClick={() => navigate("/login")}
                style={{ 
                  padding: "10px 20px", borderRadius: 10, border: "none", color: "white", 
                  fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                }}
              >
                Portal Login <ArrowRight size={14} />
              </button>

              <button 
                style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 4 }}
                className="mobile-menu-trigger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* ===== HERO SECTION ===== */}
        <section className="hero-banner" style={{ padding: "100px 24px 80px", display: "flex", alignItems: "center", minHeight: "80vh" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 40, alignItems: "center" }} className="hero-grid">
            <div>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 8, 
                background: "rgba(251, 133, 0, 0.12)", border: "1px solid rgba(251, 133, 0, 0.25)",
                padding: "6px 16px", borderRadius: 100, marginBottom: 24
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Admissions Open for 2026/2027</span>
              </div>
              <h1 className="web-heading" style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-1.5px" }}>
                Shaping Tomorrow's <span style={{ color: "#219EBC" }}>Leaders</span> Today
              </h1>
              <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.7, opacity: 0.85, marginBottom: 36, maxWidth: 600 }}>
                Welcome to Aroura Academy, where academic excellence meets holistic character development. We nurture curious minds, foster innovation, and build compassionate leaders equipped for global impact.
              </p>
              
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <button 
                  className="glow-btn"
                  onClick={handleOpenAdmissions}
                  style={{ 
                    padding: "16px 32px", borderRadius: 12, border: "none", color: "white", 
                    fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 
                  }}
                >
                  Apply Online Now <ChevronRight size={18} />
                </button>
                <a 
                  href="#admissions"
                  style={{ 
                    padding: "16px 28px", borderRadius: 12, border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.15)" : "#dde3e8"}`, 
                    color: "inherit", textDecoration: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)",
                    backdropFilter: "blur(5px)"
                  }}
                >
                  Track Admission
                </a>
              </div>
            </div>

            {/* Floating Stats Block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="desktop-only">
              <div className="glass-card floating-stat" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, animationDelay: "0s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">150+</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Enrolled Students</div>
                </div>
              </div>

              <div className="glass-card floating-stat" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, animationDelay: "1.5s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(251,133,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500" }}>
                  <Award size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">98.6%</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Exam Pass Rate</div>
                </div>
              </div>

              <div className="glass-card floating-stat" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, animationDelay: "0.7s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(42,157,143,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f" }}>
                  <School size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">20+</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Qualified Teachers</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ABOUT SECTION ===== */}
        <section id="about" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48, alignItems: "center" }} className="grid-about">
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(33, 158, 188, 0.15)", position: "relative", height: 420 }}>
              <img 
                src="/school_hero.png" 
                alt="School Campus" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
              <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, background: "rgba(1,18,29,0.85)", backdropFilter: "blur(8px)", borderRadius: 12, padding: 18, color: "white" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }} className="web-heading">Nurturing Excellence</h4>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Founded in 2012, Aroura Academy has been a beacon of quality education for over a decade.</p>
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Our Identity</span>
              <h2 className="web-heading" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 20 }}>Nurturing Intellectual Growth and Moral Values</h2>
              <p style={{ lineHeight: 1.7, opacity: 0.8, marginBottom: 20 }}>
                At Aroura Academy, we believe education goes beyond text books. Our comprehensive curriculum is designed to stimulate critical thinking, solve real-world problems, and nurture creativity in every student.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 28 }}>
                <div>
                  <h4 className="web-heading" style={{ color: "#219EBC", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Our Mission</h4>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>To provide qualitative, accessible, and technology-driven education that molds students into self-reliant, ethical, and global leaders.</p>
                </div>
                <div>
                  <h4 className="web-heading" style={{ color: "#219EBC", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Our Core Values</h4>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>Integrity, academic excellence, innovation, perseverance, and respect for diversity in all areas of learning.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ACADEMICS SECTION ===== */}
        <section id="academics" style={{ padding: "80px 24px", background: theme === "dark" ? "#011c2f" : "#f0f7fa" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Academic Programs</span>
              <h2 className="web-heading" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 12 }}>Curated For Global Competence</h2>
              <p style={{ opacity: 0.75, maxWidth: 600, margin: "0 auto", fontSize: 15 }}>We offer a blend of national and international curricula that builds core cognitive, social, and physical skills.</p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 36 }}>
              {["primary", "junior", "senior"].map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn-${academicsTab === tab ? "active" : "inactive"}`}
                  onClick={() => setAcademicsTab(tab as any)}
                  style={{ padding: "10px 24px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} School
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {academicsTab === "primary" && (
                <>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", marginBottom: 20 }}>
                      <BookOpen size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Early Years & Nursery</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Nurturing foundational skills in writing, basic arithmetic, creative art, and social interaction in a playful atmosphere.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Focus: Literacy · Numeracy · Fine Motor Skills · Phonics
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(251,133,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500", marginBottom: 20 }}>
                      <Award size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Primary (Grades 1-6)</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Comprehensive learning covering core sciences, humanities, mathematics, and introducing ICT skills at an early stage.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Subjects: Mathematics · Basic Science · Coding · Social Studies
                    </div>
                  </div>
                </>
              )}

              {academicsTab === "junior" && (
                <>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", marginBottom: 20 }}>
                      <School size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Junior Secondary (JSS 1-3)</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Transitioning to advanced logic, pre-vocational studies, computer science, and preparing students for regional BECE exams.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Focus: Pre-Algebra · French · Basic Tech · Agricultural Science
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(42,157,143,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f", marginBottom: 20 }}>
                      <Users size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>STEM and Coding Clubs</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Fostering analytical mindsets through practical science experiments, introductory robotics, web development, and coding.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Activities: Scratch · Robotics · Electronics · Science Fair
                    </div>
                  </div>
                </>
              )}

              {academicsTab === "senior" && (
                <>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(251,133,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500", marginBottom: 20 }}>
                      <Award size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Science and Math Track</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Advanced courses in physics, chemistry, biology, further mathematics, and software development preparing for WAEC/JAMB/SAT.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Subjects: Physics · Chemistry · Further Math · Technical Drawing
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: 30 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", marginBottom: 20 }}>
                      <BookOpen size={20} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Arts and Social Sciences</h3>
                    <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: "0 0 18px" }}>Nurturing artistic skills, economics, government, literature, and accounting preparing students for law, humanities, and business.</p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
                      Subjects: Literature in English · Economics · Financial Accounting · Govt
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== ADMISSIONS PORTAL TRACKING SECTION ===== */}
        <section id="admissions" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, alignItems: "start" }} className="grid-admissions">
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Admission Flow</span>
              <h2 className="web-heading" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 24 }}>Standard Entrance & Enrollment Procedure</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#219EBC", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <h4 className="web-heading" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Purchase Application Form</h4>
                    <p style={{ fontSize: 13.5, opacity: 0.75, margin: 0 }}>Pay the application fee of ₦10,000 securely online using the admission form dialog.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#219EBC", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div>
                    <h4 className="web-heading" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Fill & Submit Application</h4>
                    <p style={{ fontSize: 13.5, opacity: 0.75, margin: 0 }}>Complete the online form with your child's data. Upon submission, an application code (e.g. APP-2026-XXXX) will be generated.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#219EBC", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>3</div>
                  <div>
                    <h4 className="web-heading" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Entrance Exam & Photo Card</h4>
                    <p style={{ fontSize: 13.5, opacity: 0.75, margin: 0 }}>Download and print the auto-generated **Exam Card**. Bring it to the exam venue. Supplemental exams can be scheduled if the first date is missed.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#219EBC", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>4</div>
                  <div>
                    <h4 className="web-heading" style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Review, Admission & Portal Setup</h4>
                    <p style={{ fontSize: 13.5, opacity: 0.75, margin: 0 }}>Admin reviews the scores in the LMS, generates an **Admission Number** (e.g. SCH-2026-XXXX) and grants admission. Parents accept, see the fees schedule, set a password, and auto-create portal accounts.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button 
                  className="glow-btn"
                  onClick={handleOpenAdmissions}
                  style={{ 
                    padding: "16px 30px", borderRadius: 12, border: "none", color: "white", 
                    fontSize: 14.5, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 
                  }}
                >
                  Start New Application <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Check status block */}
            <div className="glass-card" style={{ padding: 28 }}>
              <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Check Admission Status</h3>
              <p style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.5, margin: "0 0 20px" }}>Enter your child's Application Number to track progress, download exam cards, or accept admission offers.</p>
              
              <form onSubmit={handleCheckStatus} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: 14, top: 14, opacity: 0.5 }} />
                  <input 
                    type="text" 
                    placeholder="e.g. APP-2026-1024"
                    value={searchAppNumber}
                    onChange={(e) => setSearchAppNumber(e.target.value)}
                    className="input-style"
                    style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: 10, fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={statusLoading}
                  style={{ 
                    width: "100%", padding: "12px", background: "#219EBC", color: "white", 
                    border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer" 
                  }}
                >
                  {statusLoading ? "Searching..." : "Track Status"}
                </button>
              </form>

              {statusError && (
                <div style={{ marginTop: 16, background: "rgba(231,111,81,0.08)", color: "#e76f51", padding: 12, borderRadius: 8, fontSize: 12.5, display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertCircle size={16} /> {statusError}
                </div>
              )}

              {/* Status Details Render */}
              {statusResult && (
                <div style={{ marginTop: 20, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, paddingTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: "uppercase" }}>Application Details</span>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, 
                      background: getStatusColor(statusResult.status) + "22", color: getStatusColor(statusResult.status)
                    }}>
                      {getStatusLabel(statusResult.status)}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, display: "grid", gap: 8, marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ opacity: 0.7 }}>Candidate:</span>
                      <strong style={{ fontWeight: 600 }}>{statusResult.child_first_name} {statusResult.child_last_name}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ opacity: 0.7 }}>Class Applied:</span>
                      <strong style={{ fontWeight: 600 }}>{statusResult.grade_level}</strong>
                    </div>
                    {statusResult.admission_number && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ opacity: 0.7 }}>Admission No:</span>
                        <strong style={{ fontWeight: 700, color: "#2a9d8f" }}>{statusResult.admission_number}</strong>
                      </div>
                    )}
                  </div>

                  {/* Exam Card Button */}
                  {(statusResult.status === "exam_scheduled" || statusResult.status === "exam_completed" || statusResult.status === "admitted") && (
                    <button 
                      onClick={() => handlePrintCard(statusResult)}
                      style={{ 
                        width: "100%", padding: "10px", background: "none", border: "1.5px solid #219EBC", 
                        color: "#219EBC", borderRadius: 8, fontWeight: 700, fontSize: 12.5, 
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        marginBottom: 12
                      }}
                    >
                      <Printer size={14} /> Print Exam Photo Card
                    </button>
                  )}

                  {/* ADMITTED SECTION: Create account & fees schedule */}
                  {statusResult.status === "admitted" && (
                    <div style={{ background: "rgba(42,157,143,0.08)", border: "1px solid rgba(42,157,143,0.25)", borderRadius: 10, padding: 14, marginTop: 12 }}>
                      <h4 className="web-heading" style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#2a9d8f" }}>Congratulations!</h4>
                      <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5, margin: "0 0 12px" }}>
                        Your child has been offered admission. Check out the fee schedule and set a password to set up your portal accounts.
                      </p>

                      {/* Fee Schedule inside status */}
                      <div style={{ border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, borderRadius: 8, background: theme === "dark" ? "rgba(1,18,29,0.3)" : "white", padding: 10, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "#dde3e8"}`, paddingBottom: 6, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                          <span>Item Description</span>
                          <span>Amount</span>
                        </div>
                        <div style={{ display: "grid", gap: 4, fontSize: 11.5, opacity: 0.8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Tuition Fee</span>
                            <span>₦150,000</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Development Levy</span>
                            <span>₦30,000</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Books & Uniforms</span>
                            <span>₦45,000</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>ICT & Lab Levy</span>
                            <span>₦25,000</span>
                          </div>
                        </div>
                        <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "#dde3e8"}`, marginTop: 6, paddingTop: 6, fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between", color: "#fb8500" }}>
                          <span>Total Due</span>
                          <span>₦250,000</span>
                        </div>
                      </div>

                      {/* Create Portal Form */}
                      {!portalSuccess && !statusResult.portal_created ? (
                        <form onSubmit={handleCreatePortal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Set Portal Password</label>
                            <input 
                              type="password" 
                              placeholder="Create parent/student password"
                              value={portalPassword}
                              onChange={(e) => setPortalPassword(e.target.value)}
                              required
                              className="input-style"
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }}
                            />
                          </div>

                          <button 
                            type="submit" 
                            disabled={portalLoading}
                            style={{ 
                              width: "100%", padding: "9px", background: "#2a9d8f", color: "white", 
                              border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" 
                            }}
                          >
                            {portalLoading ? "Setting up..." : "Accept Offer & Create Portal"}
                          </button>

                          {portalError && (
                            <div style={{ fontSize: 11, color: "#e76f51", marginTop: 4 }}>⚠ {portalError}</div>
                          )}
                        </form>
                      ) : (
                        <div style={{ background: "rgba(42,157,143,0.12)", border: "1px dashed #2a9d8f", padding: 12, borderRadius: 8, fontSize: 12 }}>
                          <div style={{ display: "flex", gap: 6, color: "#2a9d8f", fontWeight: 700, marginBottom: 8, alignItems: "center" }}>
                            <CheckCircle size={14} /> Portal Created Successfully!
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: 0.85 }}>
                            <div>Parent login: <strong>{statusResult.parent_email}</strong></div>
                            <div>Student login: <strong>{statusResult.child_first_name.toLowerCase()}.{statusResult.child_last_name.toLowerCase()}{statusResult.id}@aroura.com</strong></div>
                            <div>Password: <em>(The password you set)</em></div>
                          </div>
                          <button 
                            onClick={() => navigate("/login")}
                            style={{ 
                              width: "100%", padding: "8px", background: "#023047", color: "white", 
                              border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11.5, cursor: "pointer", marginTop: 10 
                            }}
                          >
                            Go to Portal Login →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== FEES SCHEDULE SECTION ===== */}
        <section id="fees" style={{ padding: "80px 24px", background: theme === "dark" ? "#011c2f" : "#f0f7fa" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Fees Structure</span>
              <h2 className="web-heading" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 12 }}>Annual Fee Schedule</h2>
              <p style={{ opacity: 0.75, fontSize: 14 }}>A transparent breakdown of school levies and tuition for the 2026/2027 academic session.</p>
            </div>

            <div className="glass-card" style={{ padding: 28, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(2, 48, 71, 0.1)"}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700 }}>Grade Class</th>
                    <th style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700 }}>Tuition (Per Term)</th>
                    <th style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700 }}>Development Levy</th>
                    <th style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700 }}>ICT & Lab</th>
                    <th style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700 }}>Books & Uniform</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { grade: "Early Years & Creche", tuition: "₦90,000", dev: "₦20,000", ict: "₦10,000", books: "₦35,000" },
                    { grade: "Nursery School", tuition: "₦110,000", dev: "₦20,000", ict: "₦15,000", books: "₦35,000" },
                    { grade: "Primary (Grades 1-6)", tuition: "₦130,000", dev: "₦30,000", ict: "₦20,000", books: "₦40,000" },
                    { grade: "Junior Secondary (JSS)", tuition: "₦150,000", dev: "₦30,000", ict: "₦25,000", books: "₦45,000" },
                    { grade: "Senior Secondary (SSS)", tuition: "₦170,000", dev: "₦30,000", ict: "₦30,000", books: "₦45,000" }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(2, 48, 71, 0.05)"}` }}>
                      <td style={{ padding: "14px 8px", fontSize: 13.5, fontWeight: 600 }}>{row.grade}</td>
                      <td style={{ padding: "14px 8px", fontSize: 13.5 }}>{row.tuition}</td>
                      <td style={{ padding: "14px 8px", fontSize: 13.5 }}>{row.dev}</td>
                      <td style={{ padding: "14px 8px", fontSize: 13.5 }}>{row.ict}</td>
                      <td style={{ padding: "14px 8px", fontSize: 13.5 }}>{row.books}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 20, fontSize: 11.5, opacity: 0.6, fontStyle: "italic", textAlign: "center" }}>
                *Note: Tuition fees are paid per term. Other levies are paid once per session (annual).
              </div>
            </div>
          </div>
        </section>

        {/* ===== CONTACT SECTION ===== */}
        <section id="contact" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48 }} className="grid-contact">
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Get In Touch</span>
              <h2 className="web-heading" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, marginBottom: 20 }}>We'd Love to Hear From You</h2>
              <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: 30 }}>Have questions about the admission process, school fees, or scheduling a campus tour? Send us a message or call.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Call/WhatsApp</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>+234 (0) 803 123 4567</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Email Address</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>info@aroura.com</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Campus Address</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>12 Academy Way, Lekki Phase 1, Lagos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick message form */}
            <div className="glass-card" style={{ padding: 32 }}>
              <h3 className="web-heading" style={{ fontSize: 20, fontWeight: 800, margin: "0 0 20px" }}>Send a Quick Message</h3>
              <form style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Full Name</label>
                    <input type="text" placeholder="Your name" className="input-style" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Email Address</label>
                    <input type="email" placeholder="Your email" className="input-style" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Subject</label>
                  <input type="text" placeholder="Subject" className="input-style" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Message Body</label>
                  <textarea rows={4} placeholder="Type your message here..." className="input-style" style={{ width: "100%", padding: "11px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>

                <button type="button" onClick={() => alert("Thank you! Your message has been sent.")} style={{ padding: "12px 24px", background: "#219EBC", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer", alignSelf: "flex-start" }}>
                  Submit Message
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={{ background: theme === "dark" ? "#00080e" : "#022131", color: "#e8f4f8", padding: "60px 24px 20px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr", gap: 36, marginBottom: 40 }} className="footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <img src="/logo.png" alt="Aroura Academy" style={{ width: 34, height: 34, borderRadius: 8 }} />
                <span className="web-heading" style={{ fontSize: 18, fontWeight: 800 }}>Aroura Academy</span>
              </div>
              <p style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.6 }}>Nurturing potential and cultivating leadership in learners. A modern institute for modern times.</p>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#fb8500" }}>Quick Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <a href="#about" style={{ color: "inherit", opacity: 0.7, textDecoration: "none" }}>About Us</a>
                <a href="#academics" style={{ color: "inherit", opacity: 0.7, textDecoration: "none" }}>Programmes</a>
                <span onClick={() => setShowAdmsModal(true)} style={{ cursor: "pointer", color: "inherit", opacity: 0.7, textDecoration: "none" }}>Admissions</span>
                <a href="#fees" style={{ color: "inherit", opacity: 0.7, textDecoration: "none" }}>Fees Policy</a>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#fb8500" }}>Portal Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.7, cursor: "pointer" }}>Student Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.7, cursor: "pointer" }}>Parent Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.7, cursor: "pointer" }}>Teacher Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.7, cursor: "pointer" }}>Admin Portal</span>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#fb8500" }}>School Portal Access</h4>
              <p style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 16 }}>Authorized personnel, teachers, parents and students should click below to enter the portal.</p>
              <button 
                onClick={() => navigate("/login")}
                className="portal-btn"
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Access Portal Login →
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, textAlign: "center", fontSize: 12, opacity: 0.5 }}>
            © {new Date().getFullYear()} Aroura Academy. All Rights Reserved. Powered by <a href="https://jlm.com.ng" style={{ color: "inherit", fontWeight: 700 }}>JLM</a>.
          </div>
        </footer>

        {/* ADMISSIONS PROCEDURE MODAL */}
        {showAdmsModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(1, 29, 47, 0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            boxSizing: "border-box"
          }}>
            <div style={{
              background: theme === "dark" ? "#011d2f" : "#ffffff",
              border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "rgba(33,158,188,0.15)"}`,
              borderRadius: 24,
              padding: "36px 40px",
              maxWidth: 600,
              width: "100%",
              boxShadow: "0 20px 50px rgba(1, 48, 71, 0.25)",
              position: "relative",
              color: theme === "dark" ? "#e8f4f8" : "#023047",
              fontFamily: "'Poppins', sans-serif"
            }}>
              {/* Close button */}
              <button 
                onClick={() => setShowAdmsModal(false)}
                style={{
                  position: "absolute",
                  top: 24,
                  right: 24,
                  background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(2,48,71,0.05)",
                  border: "none",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "inherit",
                  transition: "all 0.2s"
                }}
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <School size={28} style={{ color: "#219EBC" }} />
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Admission Procedure</h3>
              </div>

              <p style={{ fontSize: 13.5, opacity: 0.85, lineHeight: 1.6, margin: "0 0 28px" }}>
                Follow these simple steps to enroll your child at Aroura Academy. You must create or log into a parent profile before starting the application.
              </p>

              {/* Steps Timeline */}
              <div style={{ display: "grid", gap: 20, marginBottom: 36 }}>
                {[
                  { step: "1", title: "Create or Sign In to Parent Account", desc: "A registered parent profile is required for all candidate applications." },
                  { step: "2", title: "Pay Form Purchase Fee (₦10,000)", desc: "Pay securely via Card, Bank Transfer, or USSD code selection." },
                  { step: "3", title: "Fill Child Details Form", desc: "Provide personal details, previous school history, and documents." },
                  { step: "4", title: "Print Exam Card & Sit Entrance Exam", desc: "Download the auto-generated Photo Exam Card and bring it to the venue." }
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", gap: 16 }}>
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>{s.step}</div>
                    <div>
                      <h4 style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>{s.title}</h4>
                      <p style={{ margin: 0, fontSize: 12.5, opacity: 0.7, lineHeight: 1.5 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Links and CTA Action Buttons */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setShowAdmsModal(false);
                    navigate("/admissions/login");
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
                    color: "white",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: "0 4px 15px rgba(33,158,188,0.25)"
                  }}
                >
                  Proceed <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

