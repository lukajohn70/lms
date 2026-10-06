import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  School, BookOpen, Users, Award, Phone, Mail, MapPin, 
  ArrowRight, ChevronRight, Menu, X, ShieldCheck, Sparkles, CheckCircle2
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
          background-image: linear-gradient(${theme === "dark" ? "rgba(1,18,29,0.88)" : "rgba(248,253,255,0.82)"}, ${theme === "dark" ? "rgba(1,18,29,0.95)" : "rgba(248,253,255,0.92)"}), url(/school_hero.png);
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

        /* ===== Mobile Navigation & Drawer ===== */
        .landing-desktop-nav {
          display: flex;
          align-items: center;
          gap: 28px;
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
          background: rgba(1, 18, 29, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .mobile-menu-content {
          position: relative;
          z-index: 10;
          background: ${theme === "dark" ? "#011827" : "#ffffff"};
          border-bottom: 2px solid #219EBC;
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
          font-size: 15.5px;
          font-weight: 700;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          padding: 12px 14px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.2s;
        }

        .mobile-nav-item:hover {
          background: ${theme === "dark" ? "rgba(33,158,188,0.12)" : "rgba(33,158,188,0.08)"};
          color: #219EBC;
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="/logo.png" alt="Deeper Life High School" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "contain" }} />
              <div>
                <span className="web-heading" style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 800, letterSpacing: "-0.5px", display: "block", lineHeight: 1.2 }}>
                  Deeper Life High School
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#219EBC", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  DLHS Portal
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="landing-desktop-nav">
              <a href="#about" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>About DLHS</a>
              <a href="#academics" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Academic Programmes</a>
              <a href="#contact" style={{ textDecoration: "none", fontSize: 14, fontWeight: 600, color: "inherit" }}>Contact</a>
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Theme toggle */}
              <button 
                onClick={toggleTheme} 
                aria-label="Toggle Theme"
                style={{ 
                  background: "none", border: "none", cursor: "pointer", 
                  color: theme === "dark" ? "#FFB703" : "#219EBC", display: "flex", alignItems: "center", padding: 6
                }}
              >
                {theme === "dark" ? <School size={20} /> : <BookOpen size={20} />}
              </button>

              <button 
                className="portal-btn header-portal-btn" 
                onClick={() => navigate("/login")}
                style={{ 
                  padding: "10px 20px", borderRadius: 10, border: "none", color: "white", 
                  fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
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

              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(2,48,71,0.08)"}` }}>
                <button 
                  className="portal-btn" 
                  onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                  style={{ 
                    width: "100%", padding: "13px", borderRadius: 10, border: "none", color: "white", 
                    fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 
                  }}
                >
                  Access Portal Login <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== HERO SECTION ===== */}
        <section className="hero-banner" style={{ padding: "90px 24px 70px", display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 40, alignItems: "center" }} className="hero-grid">
            <div>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 8, 
                background: "rgba(33, 158, 188, 0.12)", border: "1px solid rgba(33, 158, 188, 0.3)",
                padding: "6px 16px", borderRadius: 100, marginBottom: 20
              }}>
                <Sparkles size={14} style={{ color: "#219EBC" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#219EBC", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Motto: Leadership with Distinction
                </span>
              </div>
              
              <h1 className="web-heading hero-title" style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 18, letterSpacing: "-1.2px" }}>
                Transforming Minds, Producing <span style={{ color: "#219EBC" }}>Upright Leaders</span>
              </h1>
              
              <p className="hero-subtitle" style={{ fontSize: "clamp(14.5px, 2vw, 17px)", lineHeight: 1.7, opacity: 0.85, marginBottom: 30, maxWidth: 620 }}>
                Welcome to Deeper Life High School (DLHS) — where uncompromising academic excellence meets deep moral and spiritual integrity. We are committed to producing students who are academically well-grounded and equipped as future leaders.
              </p>
              
              <div className="hero-btn-row" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button 
                  className="portal-btn"
                  onClick={() => navigate("/login")}
                  style={{ 
                    padding: "15px 32px", borderRadius: 12, border: "none", color: "white", 
                    fontSize: 15, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 
                  }}
                >
                  Access School Portal <ArrowRight size={18} />
                </button>
                <a 
                  href="#about"
                  style={{ 
                    padding: "15px 26px", borderRadius: 12, border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.15)" : "#dde3e8"}`, 
                    color: "inherit", textDecoration: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(5px)"
                  }}
                >
                  Learn More About DLHS
                </a>
              </div>

              {/* Mobile Stats Counter */}
              <div className="md-hidden" style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="glass-card" style={{ padding: "12px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#219EBC" }} className="web-heading">100%</div>
                  <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>WAEC &amp; JAMB Success</div>
                </div>
                <div className="glass-card" style={{ padding: "12px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#fb8500" }} className="web-heading">5 Core</div>
                  <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>Values</div>
                </div>
                <div className="glass-card" style={{ padding: "12px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#2a9d8f" }} className="web-heading">JSS &amp; SSS</div>
                  <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>Secondary Only</div>
                </div>
              </div>
            </div>

            {/* Desktop Floating Stats Block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="desktop-only">
              <div className="glass-card floating-stat" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16, animationDelay: "0s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                  <Award size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">Distinction</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Academic &amp; Moral Excellence</div>
                </div>
              </div>

              <div className="glass-card floating-stat" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16, animationDelay: "1.5s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(251,133,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500" }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">5 Core Values</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Holiness, Honesty, Hard work</div>
                </div>
              </div>

              <div className="glass-card floating-stat" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16, animationDelay: "0.7s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(42,157,143,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f" }}>
                  <School size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="web-heading">JSS 1 – SSS 3</div>
                  <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>Full Secondary Curriculum</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ABOUT SECTION ===== */}
        <section id="about" className="section-padding" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48, alignItems: "center" }} className="grid-about">
            <div className="about-img-container" style={{ borderRadius: 20, overflow: "hidden", border: "1.5px solid rgba(33, 158, 188, 0.15)", position: "relative", height: 440 }}>
              <img 
                src="/school_hero.png" 
                alt="Deeper Life High School Campus" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, background: "rgba(1,18,29,0.88)", backdropFilter: "blur(8px)", borderRadius: 12, padding: 16, color: "white" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700 }} className="web-heading">Leadership with Distinction</h4>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
                  Deeper Life High School is a 21st-century Christian mission, full boarding secondary school dedicated to academic distinction and godly character.
                </p>
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Our Identity</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginTop: 8, marginBottom: 18 }}>
                Nurturing Academic Excellence and Godly Character
              </h2>
              <p style={{ lineHeight: 1.7, opacity: 0.8, marginBottom: 22, fontSize: 14.5 }}>
                At Deeper Life High School, we believe that true leadership begins with character. Our holistic secondary school curriculum is designed to stimulate critical inquiry, scientific discovery, and spiritual uprightness, molding students into self-reliant, ethical nation-builders.
              </p>

              <div className="about-mission-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
                <div className="glass-card" style={{ padding: 18 }}>
                  <h4 className="web-heading" style={{ color: "#219EBC", fontSize: 15.5, fontWeight: 700, margin: "0 0 8px" }}>
                    Our Vision
                  </h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
                    "To transform our nation by producing upright leaders of the future, through high quality and sound education."
                  </p>
                </div>
                
                <div className="glass-card" style={{ padding: 18 }}>
                  <h4 className="web-heading" style={{ color: "#219EBC", fontSize: 15.5, fontWeight: 700, margin: "0 0 8px" }}>
                    Our Mission
                  </h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
                    "To produce students who are academically well-grounded, morally upright and adequately equipped as future leaders."
                  </p>
                </div>
              </div>

              {/* Official DLHS Core Values */}
              <div style={{ marginTop: 24, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(33,158,188,0.15)"}`, paddingTop: 18 }}>
                <h4 className="web-heading" style={{ color: "#fb8500", fontSize: 14.5, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Core Values
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Honesty", icon: "✨" },
                    { label: "Hard work", icon: "💪" },
                    { label: "Holiness", icon: "🕊️" },
                    { label: "Discipline", icon: "⚖️" },
                    { label: "Integrity", icon: "🛡️" }
                  ].map((val) => (
                    <span 
                      key={val.label} 
                      style={{ 
                        padding: "7px 16px", 
                        borderRadius: 100, 
                        background: theme === "dark" ? "rgba(33, 158, 188, 0.12)" : "rgba(33, 158, 188, 0.08)", 
                        border: "1px solid rgba(33, 158, 188, 0.25)",
                        color: theme === "dark" ? "#8ECAE6" : "#023047",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>{val.icon}</span>
                      <span>{val.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ACADEMICS SECTION (DLHS Secondary Only: Junior & Senior) ===== */}
        <section id="academics" className="section-padding" style={{ padding: "80px 24px", background: theme === "dark" ? "#011c2f" : "#f0f7fa" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Academic Programmes</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginTop: 8, marginBottom: 10 }}>
                Secondary School Curricula
              </h2>
              <p style={{ opacity: 0.75, maxWidth: 650, margin: "0 auto", fontSize: 14.5 }}>
                Deeper Life High School operates a pure secondary school structure (JSS 1 through SSS 3), combining the national curriculum with advanced modern competencies in science, arts, and technology.
              </p>
            </div>

            <div className="academics-tabs" style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32 }}>
              <button
                className={`tab-btn-${academicsTab === "junior" ? "active" : "inactive"}`}
                onClick={() => setAcademicsTab("junior")}
                style={{ padding: "11px 26px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
              >
                Junior Secondary (JSS 1–3)
              </button>
              <button
                className={`tab-btn-${academicsTab === "senior" ? "active" : "inactive"}`}
                onClick={() => setAcademicsTab("senior")}
                style={{ padding: "11px 26px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
              >
                Senior Secondary (SSS 1–3)
              </button>
            </div>

            <div className="academics-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {academicsTab === "junior" && (
                <>
                  <div className="glass-card" style={{ padding: "28px 24px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", marginBottom: 18 }}>
                      <School size={22} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>
                      Junior Secondary Education (JSS 1–3)
                    </h3>
                    <p style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.65, margin: "0 0 18px" }}>
                      Comprehensive grounding in basic sciences, mathematics, pre-vocational studies, computer science, and languages, preparing students for stellar performance in the National Basic Education Certificate Examination (BECE).
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                      Focus: Mathematics · Basic Science &amp; Tech · English Studies · French · Agricultural Science · Business Studies
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "28px 24px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(42,157,143,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f", marginBottom: 18 }}>
                      <Users size={22} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>
                      STEM, Robotics &amp; Computer Clubs
                    </h3>
                    <p style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.65, margin: "0 0 18px" }}>
                      Fostering analytical mindsets and practical ingenuity through hands-on science laboratories, introductory programming, robotics competitions, and digital literacy.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                      Activities: Coding · Robotics · Science Exhibitions · CBT Preparation · Logic Puzzles
                    </div>
                  </div>
                </>
              )}

              {academicsTab === "senior" && (
                <>
                  <div className="glass-card" style={{ padding: "28px 24px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(251,133,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb8500", marginBottom: 18 }}>
                      <Award size={22} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>
                      Science &amp; Technology Department
                    </h3>
                    <p style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.65, margin: "0 0 18px" }}>
                      Advanced and rigorous instruction in Physics, Chemistry, Biology, Further Mathematics, and Technical Drawing. DLHS students consistently lead the nation in WAEC, NECO, and UTME (JAMB) scores.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                      Subjects: Physics · Chemistry · Biology · Further Mathematics · Agricultural Science
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "28px 24px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", marginBottom: 18 }}>
                      <BookOpen size={22} />
                    </div>
                    <h3 className="web-heading" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>
                      Arts, Humanities &amp; Commercial
                    </h3>
                    <p style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.65, margin: "0 0 18px" }}>
                      Cultivating eloquence, economic literacy, and social consciousness in Government, Financial Accounting, Economics, Literature, and CRS, preparing students for legal, financial, and administrative excellence.
                    </p>
                    <div style={{ borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingTop: 14, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                      Subjects: Literature in English · Economics · Financial Accounting · Commerce · Government
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== CONTACT SECTION ===== */}
        <section id="contact" className="section-padding" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 40 }} className="grid-contact">
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "1px" }}>Get In Touch</span>
              <h2 className="web-heading" style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginTop: 8, marginBottom: 18 }}>We'd Love to Hear From You</h2>
              <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: 26, fontSize: 14 }}>
                For inquiries regarding student records, result verification, academic curricula, or administrative support, reach out to us below.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Phone Inquiries</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>+234 (0) 800 354 7466</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Email Address</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>info@deeperlifehighschool.org</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", flexShrink: 0 }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Institution</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Deeper Life High School (DLHS)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick message form */}
            <div className="glass-card contact-form-card" style={{ padding: 28 }}>
              <h3 className="web-heading" style={{ fontSize: 19, fontWeight: 800, margin: "0 0 16px" }}>Send a Quick Message</h3>
              <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid-2">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Full Name</label>
                    <input type="text" placeholder="Your name" className="input-style" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Email Address</label>
                    <input type="email" placeholder="Your email" className="input-style" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Subject</label>
                  <input type="text" placeholder="Subject" className="input-style" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Message Body</label>
                  <textarea rows={4} placeholder="Type your message here..." className="input-style" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>

                <button type="button" onClick={() => alert("Thank you! Your message has been sent.")} style={{ padding: "12px 24px", background: "#219EBC", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer", alignSelf: "flex-start" }}>
                  Submit Message
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="footer-padding" style={{ background: theme === "dark" ? "#00080e" : "#022131", color: "#e8f4f8", padding: "60px 24px 20px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr", gap: 32, marginBottom: 36 }} className="footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src="/logo.png" alt="Deeper Life High School" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
                <span className="web-heading" style={{ fontSize: 17, fontWeight: 800 }}>Deeper Life High School</span>
              </div>
              <p style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.6 }}>
                A 21st-century Christian mission, full boarding secondary school committed to academic excellence and moral uprightness. Leadership with Distinction.
              </p>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#fb8500" }}>Quick Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <a href="#about" style={{ color: "inherit", opacity: 0.75, textDecoration: "none" }}>About DLHS</a>
                <a href="#academics" style={{ color: "inherit", opacity: 0.75, textDecoration: "none" }}>Academic Programmes</a>
                <a href="#contact" style={{ color: "inherit", opacity: 0.75, textDecoration: "none" }}>Contact Us</a>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#fb8500" }}>Portal Access</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.75, cursor: "pointer" }}>Student Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.75, cursor: "pointer" }}>Teacher Portal</span>
                <span onClick={() => navigate("/login")} style={{ opacity: 0.75, cursor: "pointer" }}>Admin Portal</span>
              </div>
            </div>

            <div>
              <h4 className="web-heading" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#fb8500" }}>School Portal Access</h4>
              <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 14 }}>
                Authorized students, teachers, and administrators can sign in directly to access academic results and portal features.
              </p>
              <button 
                onClick={() => navigate("/login")}
                className="portal-btn"
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Access Portal Login →
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, textAlign: "center", fontSize: 11.5, opacity: 0.55 }}>
            © {new Date().getFullYear()} Deeper Life High School (DLHS). All Rights Reserved. Powered by <a href="https://jlm.com.ng" style={{ color: "inherit", fontWeight: 700 }}>JLM</a>.
          </div>
        </footer>
      </div>
    </>
  );
}
