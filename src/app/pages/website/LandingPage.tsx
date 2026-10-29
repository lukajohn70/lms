import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  School, BookOpen, Users, Award, Phone, Mail, MapPin, 
  ArrowRight, ChevronRight, Menu, X, ShieldCheck, CheckCircle2,
  GraduationCap, Scale, Compass, Check
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";

export default function LandingPage() {
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  // Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active tab in academics section (DLHS is strictly secondary school: JSS and SSS)
  const [academicsTab, setAcademicsTab] = useState<"junior" | "senior">("junior");

  return (
    <>
      <style>{`
        .web-body {
          font-family: 'Lato', 'Plus Jakarta Sans', sans-serif;
          background-color: ${theme === "dark" ? "#0a1220" : "#f8fafc"};
          color: ${theme === "dark" ? "#f1f5f9" : "#1e293b"};
          transition: background-color 0.25s, color 0.25s;
          overflow-x: hidden;
        }

        .web-heading {
          font-family: 'Raleway', sans-serif;
          letter-spacing: -0.02em;
        }

        .glass-nav {
          background: ${theme === "dark" ? "rgba(10, 18, 32, 0.94)" : "rgba(255, 255, 255, 0.95)"};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.12)" : "rgba(41, 61, 125, 0.1)"};
        }

        .hero-banner {
          background-image: linear-gradient(${theme === "dark" ? "rgba(10,18,32,0.92)" : "rgba(248,250,252,0.88)"}, ${theme === "dark" ? "rgba(10,18,32,0.97)" : "rgba(248,250,252,0.96)"}), url(/school_hero.png);
          background-size: cover;
          background-position: center;
        }

        .dlhs-btn-primary {
          background: #dc137b;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(220, 19, 123, 0.28);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dlhs-btn-primary:hover {
          background: #b80f66;
          box-shadow: 0 6px 20px rgba(220, 19, 123, 0.4);
          transform: translateY(-1px);
        }

        .dlhs-btn-secondary {
          background: ${theme === "dark" ? "rgba(41, 61, 125, 0.25)" : "#293d7d"};
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(41, 61, 125, 0.2);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dlhs-btn-secondary:hover {
          background: ${theme === "dark" ? "rgba(41, 61, 125, 0.4)" : "#1e2e60"};
          transform: translateY(-1px);
        }

        .dlhs-btn-outline {
          border: 1.5px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.25)" : "rgba(41, 61, 125, 0.2)"};
          color: ${theme === "dark" ? "#f1f5f9" : "#293d7d"};
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "#ffffff"};
          transition: all 0.2s ease;
        }

        .dlhs-btn-outline:hover {
          border-color: #293d7d;
          background: ${theme === "dark" ? "rgba(41, 61, 125, 0.2)" : "rgba(41, 61, 125, 0.04)"};
          transform: translateY(-1px);
        }

        .dlhs-card {
          background: ${theme === "dark" ? "#142038" : "#ffffff"};
          border: 1px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.12)" : "rgba(41, 61, 125, 0.1)"};
          border-radius: 12px;
          box-shadow: 0 2px 8px -2px rgba(22, 35, 75, 0.04), 0 8px 24px -4px rgba(22, 35, 75, 0.06);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }

        .dlhs-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px -2px rgba(22, 35, 75, 0.06), 0 12px 30px -4px rgba(22, 35, 75, 0.1);
          border-color: ${theme === "dark" ? "rgba(191, 209, 255, 0.2)" : "rgba(41, 61, 125, 0.2)"};
        }

        .input-style {
          background: ${theme === "dark" ? "#101b30" : "#ffffff"};
          border: 1.5px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.15)" : "#d8e2ee"};
          color: ${theme === "dark" ? "#f1f5f9" : "#1e293b"};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-style:focus {
          border-color: #0093dd;
          box-shadow: 0 0 0 3px rgba(0, 147, 221, 0.15);
        }

        .tab-btn-active {
          background: #293d7d;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(41, 61, 125, 0.25);
        }

        .tab-btn-inactive {
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(41, 61, 125, 0.05)"};
          color: ${theme === "dark" ? "#94a3b8" : "#64748b"};
        }
        .tab-btn-inactive:hover {
          color: ${theme === "dark" ? "#ffffff" : "#293d7d"};
          background: ${theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(41, 61, 125, 0.09)"};
        }

        /* ===== Mobile Navigation & Drawer ===== */
        .landing-desktop-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .mobile-menu-trigger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          color: inherit;
        }

        .mobile-menu-drawer {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .mobile-menu-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(10, 18, 32, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .mobile-menu-content {
          position: relative;
          z-index: 10;
          background: ${theme === "dark" ? "#101c32" : "#ffffff"};
          border-bottom: 2px solid #dc137b;
          padding: 20px 20px 28px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          gap: 18px;
          animation: slideDownMenu 0.25s ease-out;
        }

        @keyframes slideDownMenu {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .mobile-nav-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mobile-nav-item {
          font-size: 15px;
          font-weight: 700;
          font-family: 'Raleway', sans-serif;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          padding: 12px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.2s;
        }

        .mobile-nav-item:hover {
          background: ${theme === "dark" ? "rgba(220,19,123,0.12)" : "rgba(220,19,123,0.06)"};
          color: #dc137b;
        }

        /* Responsive Layout Overrides */
        @media (max-width: 900px) {
          .landing-desktop-nav {
            display: none !important;
          }
          .mobile-menu-trigger {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .header-portal-btn {
            display: none !important;
          }
          .header-inner {
            padding: 12px 16px !important;
          }
          .hero-banner {
            padding: 50px 16px 40px !important;
            min-height: auto !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .hero-title {
            font-size: clamp(28px, 7vw, 44px) !important;
            letter-spacing: -1px !important;
          }
          .hero-btn-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .hero-btn-row button, .hero-btn-row a {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
          .section-padding {
            padding: 48px 16px !important;
          }
          .grid-about {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .about-img-container {
            height: 240px !important;
          }
          .about-mission-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .academics-tabs {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            justify-content: center !important;
          }
          .academics-tabs button {
            padding: 8px 16px !important;
            font-size: 13px !important;
          }
          .grid-contact {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .contact-form-card {
            padding: 20px 16px !important;
          }
          .contact-form-card .grid-2 {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .contact-form-card button {
            width: 100% !important;
          }
          .footer-padding {
            padding: 40px 16px 20px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
          }
        }

        @media (max-width: 550px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>

      <div className="web-body min-h-screen">
        
        {/* ===== HEADER / NAVIGATION ===== */}
        <header className="glass-nav sticky top-0 z-50 transition-all">
          <div className="header-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="/logo.png" alt="Deeper Life High School" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain" }} />
              <div>
                <span className="web-heading" style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 900, color: theme === "dark" ? "#f8fafc" : "#16234b", letterSpacing: "-0.5px", display: "block", lineHeight: 1.15 }}>
                  Deeper Life High School
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc137b", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  Kaduna Campus Portal
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="landing-desktop-nav">
              <a href="#about" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "inherit", fontFamily: "'Raleway', sans-serif" }}>About DLHS</a>
              <a href="#academics" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "inherit", fontFamily: "'Raleway', sans-serif" }}>Academic Programmes</a>
              <a href="#contact" style={{ textDecoration: "none", fontSize: 14, fontWeight: 700, color: "inherit", fontFamily: "'Raleway', sans-serif" }}>Contact</a>
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Theme toggle */}
              <button 
                onClick={toggleTheme} 
                aria-label="Toggle Theme"
                style={{ 
                  background: "none", border: "none", cursor: "pointer", 
                  color: theme === "dark" ? "#d4af37" : "#293d7d", display: "flex", alignItems: "center", padding: 6
                }}
              >
                {theme === "dark" ? <School size={20} /> : <BookOpen size={20} />}
              </button>

              <button 
                className="dlhs-btn-primary header-portal-btn" 
                onClick={() => navigate("/login")}
                style={{ 
                  padding: "10px 22px", borderRadius: 8, border: "none", 
                  fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "'Raleway', sans-serif"
                }}
              >
                Portal Login <ArrowRight size={14} />
              </button>

              {/* Hamburger Button for Mobile */}
              <button 
                className="mobile-menu-trigger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </header>

        {/* ===== MOBILE DRAWER MENU ===== */}
        {mobileMenuOpen && (
          <div className="mobile-menu-drawer">
            <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
            <div className="mobile-menu-content">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/logo.png" alt="Deeper Life High School" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
                  <span className="web-heading" style={{ fontSize: 17, fontWeight: 800 }}>Deeper Life High School</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 6 }}
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="mobile-nav-list">
                <a href="#about" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  About DLHS <ChevronRight size={16} style={{ opacity: 0.5 }} />
                </a>
                <a href="#academics" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  Academic Programmes <ChevronRight size={16} style={{ opacity: 0.5 }} />
                </a>
                <a href="#contact" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  Contact Us <ChevronRight size={16} style={{ opacity: 0.5 }} />
                </a>
              </nav>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(41,61,125,0.1)"}` }}>
                <button 
                  className="dlhs-btn-primary" 
                  onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                  style={{ 
                    width: "100%", padding: "13px", borderRadius: 8, border: "none", 
                    fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontFamily: "'Raleway', sans-serif"
                  }}
                >
                  Access School Portal <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HERO SECTION ===== */}
        <section className="hero-banner" style={{ padding: "90px 24px 75px", display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, alignItems: "center" }} className="hero-grid">
            <div>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 8, 
                background: theme === "dark" ? "rgba(220, 19, 123, 0.12)" : "rgba(220, 19, 123, 0.08)", 
                border: `1px solid ${theme === "dark" ? "rgba(220, 19, 123, 0.28)" : "rgba(220, 19, 123, 0.2)"}`,
                padding: "6px 16px", borderRadius: 100, marginBottom: 20
              }}>
                <ShieldCheck size={14} style={{ color: "#dc137b" }} />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#dc137b", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Raleway', sans-serif" }}>
                  Motto: Leadership with Distinction
                </span>
              </div>
              
              <h1 className="web-heading hero-title" style={{ fontSize: "clamp(34px, 5.2vw, 56px)", fontWeight: 900, lineHeight: 1.12, marginBottom: 18, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                Transforming Minds, Producing <span style={{ color: "#dc137b" }}>Upright Leaders</span>
              </h1>
              
              <p className="hero-subtitle" style={{ fontSize: "clamp(15px, 2vw, 17.5px)", lineHeight: 1.7, opacity: 0.9, marginBottom: 32, maxWidth: 620, color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                Welcome to Deeper Life High School (DLHS) — where uncompromising academic excellence meets deep moral and spiritual integrity. Producing graduates who are academically well-grounded and equipped as ethical future leaders.
              </p>
              
              <div className="hero-btn-row" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button 
                  className="dlhs-btn-primary"
                  onClick={() => navigate("/login")}
                  style={{ 
                    padding: "15px 32px", borderRadius: 8, border: "none", 
                    fontSize: 15, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10,
                    fontFamily: "'Raleway', sans-serif"
                  }}
                >
                  Access School Portal <ArrowRight size={18} />
                </button>
                <a 
                  href="#about"
                  className="dlhs-btn-outline"
                  style={{ 
                    padding: "14px 26px", borderRadius: 8, 
                    textDecoration: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", fontFamily: "'Raleway', sans-serif"
                  }}
                >
                  Learn More About DLHS
                </a>
              </div>

              {/* Mobile Stats Counter */}
              <div className="md-hidden" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="dlhs-card" style={{ padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#293d7d" }} className="web-heading">100%</div>
                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>WAEC &amp; JAMB Success</div>
                </div>
                <div className="dlhs-card" style={{ padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#dc137b" }} className="web-heading">5 Core</div>
                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>Pillars of Value</div>
                </div>
                <div className="dlhs-card" style={{ padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#0093dd" }} className="web-heading">JSS &amp; SSS</div>
                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>Secondary Only</div>
                </div>
              </div>
            </div>

            {/* Desktop Highflyer Stat Blocks (Crisp Architectural Cards) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="desktop-only">
              <div className="dlhs-card" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: 10, background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#293d7d", flexShrink: 0 }}>
                  <Award size={26} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: theme === "dark" ? "#f8fafc" : "#16234b" }} className="web-heading">
                    National Highflyers
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>Consistently Top WAEC &amp; UTME Scores in Nigeria</div>
                </div>
              </div>

              <div className="dlhs-card" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: 10, background: "rgba(220, 19, 123, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc137b", flexShrink: 0 }}>
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: theme === "dark" ? "#f8fafc" : "#16234b" }} className="web-heading">
                    5 Core Values
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>Holiness, Honesty, Hard work, Discipline, Integrity</div>
                </div>
              </div>

              <div className="dlhs-card" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: 10, background: "rgba(0, 147, 221, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0093dd", flexShrink: 0 }}>
                  <School size={26} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: theme === "dark" ? "#f8fafc" : "#16234b" }} className="web-heading">
                    Full Boarding Campus
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600, marginTop: 2 }}>Structured 24/7 Academic, Moral &amp; Spiritual Mentorship</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ABOUT SECTION ===== */}
        <section id="about" className="section-padding" style={{ padding: "85px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48, alignItems: "center" }} className="grid-about">
            <div className="about-img-container" style={{ borderRadius: 14, overflow: "hidden", border: `1.5px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.15)" : "rgba(41, 61, 125, 0.15)"}`, position: "relative", height: 450, boxShadow: "0 12px 36px -8px rgba(22, 35, 75, 0.12)" }}>
              <img 
                src="/school_hero.png" 
                alt="Deeper Life High School Campus" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, background: "rgba(16, 28, 50, 0.94)", backdropFilter: "blur(10px)", borderRadius: 10, padding: 18, color: "white", border: "1px solid rgba(191, 209, 255, 0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }} className="web-heading">Institutional Legacy</div>
                <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800 }} className="web-heading">Leadership with Distinction</h4>
                <p style={{ margin: 0, fontSize: 12.5, opacity: 0.85, lineHeight: 1.5 }}>
                  Deeper Life High School is a 21st-century Christian mission, full boarding secondary school dedicated to academic distinction and godly character.
                </p>
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#dc137b", textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "'Raleway', sans-serif" }}>Our Identity</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, marginTop: 8, marginBottom: 18, color: theme === "dark" ? "#f8fafc" : "#16234b", lineHeight: 1.2 }}>
                Nurturing Academic Excellence and Godly Character
              </h2>
              <p style={{ lineHeight: 1.75, opacity: 0.85, marginBottom: 24, fontSize: 15, color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                At Deeper Life High School, we believe that true leadership begins with character. Our holistic secondary school curriculum is designed to stimulate critical inquiry, scientific discovery, and spiritual uprightness, molding students into self-reliant, ethical nation-builders.
              </p>

              <div className="about-mission-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
                <div className="dlhs-card" style={{ padding: 22, borderLeft: "4px solid #293d7d" }}>
                  <h4 className="web-heading" style={{ color: "#293d7d", fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>
                    Our Vision
                  </h4>
                  <p style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.85, margin: 0 }}>
                    "To transform our nation by producing upright leaders of the future, through high quality and sound education."
                  </p>
                </div>
                
                <div className="dlhs-card" style={{ padding: 22, borderLeft: "4px solid #dc137b" }}>
                  <h4 className="web-heading" style={{ color: "#dc137b", fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>
                    Our Mission
                  </h4>
                  <p style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.85, margin: 0 }}>
                    "To produce students who are academically well-grounded, morally upright and adequately equipped as future leaders."
                  </p>
                </div>
              </div>

              {/* Official DLHS 5 Core Values (No Emojis, Pure Stroke Vector Badges) */}
              <div style={{ marginTop: 28, borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.12)" : "rgba(41,61,125,0.1)"}`, paddingTop: 20 }}>
                <h4 className="web-heading" style={{ color: theme === "dark" ? "#d4af37" : "#16234b", fontSize: 13.5, fontWeight: 800, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  The 5 Core Values
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Holiness", icon: <GraduationCap size={14} style={{ color: "#dc137b" }} /> },
                    { label: "Honesty", icon: <CheckCircle2 size={14} style={{ color: "#0093dd" }} /> },
                    { label: "Hard work", icon: <Award size={14} style={{ color: "#d4af37" }} /> },
                    { label: "Discipline", icon: <Scale size={14} style={{ color: "#293d7d" }} /> },
                    { label: "Integrity", icon: <ShieldCheck size={14} style={{ color: "#0093dd" }} /> }
                  ].map((val) => (
                    <span 
                      key={val.label} 
                      style={{ 
                        padding: "8px 18px", 
                        borderRadius: 8, 
                        background: theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "#ffffff", 
                        border: `1.5px solid ${theme === "dark" ? "rgba(191, 209, 255, 0.15)" : "rgba(41, 61, 125, 0.14)"}`,
                        color: theme === "dark" ? "#f1f5f9" : "#16234b",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "'Raleway', sans-serif",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                      }}
                    >
                      {val.icon}
                      <span>{val.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ACADEMICS SECTION ===== */}
        <section id="academics" className="section-padding" style={{ padding: "85px 24px", background: theme === "dark" ? "#0c1527" : "#f1f5f9" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#dc137b", textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "'Raleway', sans-serif" }}>Academic Programmes</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, marginTop: 8, marginBottom: 12, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                Pure Secondary School Curricula
              </h2>
              <p style={{ opacity: 0.85, maxWidth: 650, margin: "0 auto", fontSize: 15, color: theme === "dark" ? "#cbd5e1" : "#3a4244", lineHeight: 1.7 }}>
                Deeper Life High School strictly operates a pure secondary school model (JSS 1 through SSS 3), integrating the Nigerian National Curriculum with modern global standards in science, languages, and technical mastery.
              </p>
            </div>

            <div className="academics-tabs" style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 36 }}>
              <button
                className={academicsTab === "junior" ? "tab-btn-active" : "tab-btn-inactive"}
                onClick={() => setAcademicsTab("junior")}
                style={{ padding: "12px 28px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Raleway', sans-serif" }}
              >
                Junior Secondary (JSS 1–3)
              </button>
              <button
                className={academicsTab === "senior" ? "tab-btn-active" : "tab-btn-inactive"}
                onClick={() => setAcademicsTab("senior")}
                style={{ padding: "12px 28px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Raleway', sans-serif" }}
              >
                Senior Secondary (SSS 1–3)
              </button>
            </div>

            <div className="academics-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {academicsTab === "junior" && (
                <>
                  <div className="dlhs-card" style={{ padding: "30px 26px" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#293d7d", marginBottom: 18 }}>
                      <School size={24} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                      Basic Science &amp; General Studies (JSS 1–3)
                    </h3>
                    <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.7, margin: "0 0 20px", color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                      Comprehensive grounding in core sciences, foundational mathematics, pre-vocational studies, computer science, and languages, preparing students for exemplary performance in the National Basic Education Certificate Examination (BECE).
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.1)" : "#e2e8f0"}`, paddingTop: 16, fontSize: 12.5, fontWeight: 600, color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                      Curriculum: Mathematics · Basic Science &amp; Technology · English Studies · French · Agricultural Science · Business Studies
                    </div>
                  </div>

                  <div className="dlhs-card" style={{ padding: "30px 26px" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(0, 147, 221, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0093dd", marginBottom: 18 }}>
                      <Users size={24} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                      Digital Literacy &amp; STEM Discovery
                    </h3>
                    <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.7, margin: "0 0 20px", color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                      Cultivating analytical mindsets and practical ingenuity through hands-on science laboratories, introductory coding, digital academic assessments, and robotics workshops designed to stimulate early innovation.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.1)" : "#e2e8f0"}`, paddingTop: 16, fontSize: 12.5, fontWeight: 600, color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                      Modules: Algorithm Design · Science Practical Exhibitions · Digital Assessments · Logical Reasoning
                    </div>
                  </div>
                </>
              )}

              {academicsTab === "senior" && (
                <>
                  <div className="dlhs-card" style={{ padding: "30px 26px" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(220, 19, 123, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc137b", marginBottom: 18 }}>
                      <Award size={24} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                      Science &amp; Technology Faculty (SSS 1–3)
                    </h3>
                    <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.7, margin: "0 0 20px", color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                      Rigorous and intensive instruction in Physics, Chemistry, Biology, Further Mathematics, and Technical Drawing. DLHS candidates consistently record the highest aggregate scores nationwide in WAEC, NECO, and UTME.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.1)" : "#e2e8f0"}`, paddingTop: 16, fontSize: 12.5, fontWeight: 600, color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                      Specializations: Physics · Chemistry · Biology · Further Mathematics · Agricultural Science
                    </div>
                  </div>

                  <div className="dlhs-card" style={{ padding: "30px 26px" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#293d7d", marginBottom: 18 }}>
                      <BookOpen size={24} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px", color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                      Arts, Humanities &amp; Commercial Sciences
                    </h3>
                    <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.7, margin: "0 0 20px", color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                      Instilling critical discourse, economic acumen, and ethical leadership through Financial Accounting, Government, Economics, Literature-in-English, and Christian Religious Studies, preparing scholars for legal, corporate, and public service careers.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.1)" : "#e2e8f0"}`, paddingTop: 16, fontSize: 12.5, fontWeight: 600, color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                      Specializations: Literature in English · Economics · Financial Accounting · Commerce · Government
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== CONTACT SECTION ===== */}
        <section id="contact" className="section-padding" style={{ padding: "85px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48 }} className="grid-contact">
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#dc137b", textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: "'Raleway', sans-serif" }}>Official Channels</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, marginTop: 8, marginBottom: 18, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                Campus Inquiries &amp; Registry
              </h2>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: 28, fontSize: 15, color: theme === "dark" ? "#cbd5e1" : "#3a4244" }}>
                For inquiries regarding student results, transcript verification, broadsheets, or academic scheduling, please contact the campus registry below.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#293d7d", flexShrink: 0 }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Academic Registry</div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>+234 (0) 800 354 7466</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc137b", flexShrink: 0 }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Official Campus Registry</div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>info@deeperlifehighschool.org</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(0, 147, 221, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0093dd", flexShrink: 0 }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Institutional Identity</div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: theme === "dark" ? "#f8fafc" : "#16234b" }}>Deeper Life High School (DLHS)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick message form */}
            <div className="dlhs-card contact-form-card" style={{ padding: 32 }}>
              <h3 className="web-heading" style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px", color: theme === "dark" ? "#f8fafc" : "#16234b" }}>
                Send an Inquiry to Registry
              </h3>
              <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: theme === "dark" ? "#cbd5e1" : "#16234b" }}>Full Name</label>
                    <input type="text" placeholder="e.g. Dr. Samuel Adeyemi" className="input-style" style={{ width: "100%", padding: "11px 14px", borderRadius: 6, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: theme === "dark" ? "#cbd5e1" : "#16234b" }}>Email Address</label>
                    <input type="email" placeholder="name@domain.com" className="input-style" style={{ width: "100%", padding: "11px 14px", borderRadius: 6, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: theme === "dark" ? "#cbd5e1" : "#16234b" }}>Inquiry Category</label>
                  <input type="text" placeholder="e.g. Result Verification / Transcript Query" className="input-style" style={{ width: "100%", padding: "11px 14px", borderRadius: 6, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: theme === "dark" ? "#cbd5e1" : "#16234b" }}>Message Description</label>
                  <textarea rows={4} placeholder="State details of your inquiry clearly..." className="input-style" style={{ width: "100%", padding: "11px 14px", borderRadius: 6, fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>

                <button 
                  type="button" 
                  onClick={() => alert("Thank you. Your message has been received by the DLHS Registry.")} 
                  className="dlhs-btn-primary"
                  style={{ padding: "13px 28px", border: "none", borderRadius: 6, fontWeight: 800, fontSize: 14, cursor: "pointer", alignSelf: "flex-start", fontFamily: "'Raleway', sans-serif" }}
                >
                  Submit Inquiry
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="footer-padding" style={{ background: "#10192e", color: "#f8fafc", padding: "64px 24px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr", gap: 36, marginBottom: 40 }} className="footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <img src="/logo.png" alt="Deeper Life High School" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain" }} />
                <div>
                  <span className="web-heading" style={{ fontSize: 18, fontWeight: 900, display: "block", color: "#ffffff" }}>Deeper Life High School</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px" }}>Leadership with Distinction</span>
                </div>
              </div>
              <p style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.7, maxWidth: 360 }}>
                A 21st-century Christian mission, full boarding secondary school committed to uncompromising academic excellence and godly character.
              </p>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px" }}>Institution</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 13.5 }}>
                <a href="#about" style={{ color: "inherit", opacity: 0.8, textDecoration: "none" }}>About DLHS</a>
                <a href="#academics" style={{ color: "inherit", opacity: 0.8, textDecoration: "none" }}>Academic Programmes</a>
                <a href="#contact" style={{ color: "inherit", opacity: 0.8, textDecoration: "none" }}>Contact Registry</a>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px" }}>Academic Portals</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 13.5 }}>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.8, cursor: "pointer" }}>Student Result Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.8, cursor: "pointer" }}>Teacher Grading Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.8, cursor: "pointer" }}>Administrator Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.8, cursor: "pointer" }}>Parent Portal</span>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px" }}>Secure Access</h4>
              <p style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 16, lineHeight: 1.6 }}>
                Authorized students, parents, teachers, and school administrators can authenticate to access academic records.
              </p>
              <button 
                onClick={() => navigate("/login")}
                className="dlhs-btn-primary"
                style={{ width: "100%", padding: "13px", border: "none", borderRadius: 6, fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: "'Raleway', sans-serif" }}
              >
                Access School Portal →
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(191,209,255,0.12)", paddingTop: 20, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
            © {new Date().getFullYear()} Deeper Life High School (DLHS). All Rights Reserved. Powered by JLM.
          </div>
        </footer>
      </div>
    </>
  );
}
