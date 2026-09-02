import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { Sun, Moon, Lock, Mail, Phone, User, ChevronRight, UserPlus, ArrowRight } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

export default function AdmissionsLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, theme, toggleTheme } = useApp();

  const initialMode = searchParams.get("mode") === "signin" ? "signin" : "signup";
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const data = await apiClient.post("/login", { email, password });
        login(data.token, data.user);
        navigate("/parent/admissions");
      } else {
        // Register Parent Account
        await apiClient.post("/register-parent", {
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          phone,
          relationship,
        });

        // Auto-login
        const data = await apiClient.post("/login", { email, password });
        login(data.token, data.user);
        navigate("/parent/admissions");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .adms-container { display: flex; min-height: 100vh; font-family: 'Poppins', sans-serif; }
        .adms-left {
          flex: 1.1; background-image: url(/login_bg.png);
          background-size: cover; background-position: center;
          display: flex; flex-direction: column; justify-content: space-between; padding: 60px;
          min-height: 100vh; position: relative;
        }
        .adms-right {
          flex: 0.9; display: flex; align-items: center; justify-content: center;
          position: relative; padding: 40px; overflow-y: auto;
        }
        .adms-input:focus { border-color: #219EBC !important; box-shadow: 0 0 0 3px rgba(33,158,188,0.15) !important; }
        .adms-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(33,158,188,0.45) !important; }
        @media (max-width: 950px) { .adms-left { display: none; } }
      `}</style>

      <div className="adms-container">
        {/* ── LEFT PANEL (Branding & Info) ── */}
        <div className="adms-left">
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(2,48,71,0.06) 0%, rgba(2,48,71,0.35) 100%)",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <img src="/logo.png" alt="Aroura Academy" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 20, boxShadow: "0 4px 20px rgba(2,48,71,0.15)" }} />
            <h2 style={{ color: "#012030", fontSize: 36, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
              Admissions Portal
            </h2>
            <p style={{ color: "#3d6475", fontSize: 14, margin: "0 0 32px", lineHeight: 1.6, maxWidth: 440 }}>
              Welcome to the Aroura Academy child enrollment portal. Please register a Parent profile or log in below to start or continue your application.
            </p>
          </div>

          <div style={{
            position: "relative", zIndex: 1,
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            padding: "28px 32px", borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.8)",
            maxWidth: "460px",
            boxShadow: "0 12px 48px rgba(2,48,71,0.08)"
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#023047", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>Enrollment Process</h3>
            
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { step: "1", title: "Create Parent Profile", desc: "Register your basic contact details securely." },
                { step: "2", title: "Pay Application Fee", desc: "₦10,000 non-refundable fee processed online." },
                { step: "3", title: "Fill Admissions Form", desc: "Provide child details, previous school, and grade." },
                { step: "4", title: "Get Entrance Exam Card", desc: "Print the generated photo card for the exam venue." }
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "#219EBC", color: "white",
                    display: "flex", alignItems: "center", justify: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    lineHeight: "22px", textAlign: "center"
                  }}>{s.step}</div>
                  <div>
                    <h4 style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 700, color: "#023047" }}>{s.title}</h4>
                    <p style={{ margin: 0, fontSize: 11.5, color: "#5a7f92", lineHeight: 1.4 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (Auth Form Card) ── */}
        <div className="adms-right" style={{
          background: theme === "dark"
            ? "radial-gradient(ellipse at top right, rgba(33,158,188,0.09) 0%, transparent 60%), #011d2f"
            : "radial-gradient(ellipse at top right, rgba(33,158,188,0.07) 0%, transparent 60%), #f0f7fa"
        }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            position: "absolute", top: 28, right: 28,
            width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: theme === "dark" ? "rgba(142,202,230,0.08)" : "rgba(2,48,71,0.06)",
            border: `1px solid ${theme === "dark" ? "rgba(142,202,230,0.15)" : "rgba(2,48,71,0.12)"}`,
            cursor: "pointer", transition: "all 0.2s", zIndex: 10
          }}>
            {theme === "dark" ? <Sun size={18} style={{ color: "#FFB703" }} /> : <Moon size={18} style={{ color: "#219EBC" }} />}
          </button>

          <div style={{ width: "100%", maxWidth: "420px" }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: theme === "dark" ? "#e8f4f8" : "#012030", margin: "0 0 6px", letterSpacing: "-0.027em" }}>
                {mode === "signup" ? "New Parent Applicant" : "Continuing Application"}
              </h1>
              <p style={{ fontSize: 13.5, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", margin: 0 }}>
                {mode === "signup" ? "Register your profile to begin admissions process" : "Sign in to your parent account to track child status"}
              </p>
            </div>

            {/* Switcher Tabs */}
            <div style={{
              display: "flex",
              background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(2,48,71,0.04)",
              padding: 4,
              borderRadius: 12,
              marginBottom: 28,
              border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.12)" : "rgba(2,48,71,0.06)"}`
            }}>
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: mode === "signup" 
                    ? "linear-gradient(135deg, #219EBC 0%, #023047 100%)" 
                    : "transparent",
                  color: mode === "signup" ? "#ffffff" : (theme === "dark" ? "#8ECAE6" : "#5a7f92"),
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: mode === "signup" ? "0 4px 12px rgba(33,158,188,0.25)" : "none"
                }}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: mode === "signin" 
                    ? "linear-gradient(135deg, #219EBC 0%, #023047 100%)" 
                    : "transparent",
                  color: mode === "signin" ? "#ffffff" : (theme === "dark" ? "#8ECAE6" : "#5a7f92"),
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: mode === "signin" ? "0 4px 12px rgba(33,158,188,0.25)" : "none"
                }}
              >
                Sign In
              </button>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "rgba(251,133,0,0.08)", color: "#e07000", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid rgba(251,133,0,0.25)", lineHeight: 1.5 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Signup Specific Fields */}
              {mode === "signup" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>First Name</label>
                      <input
                        type="text" required placeholder="John"
                        value={firstName} onChange={e => setFirstName(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                          color: theme === "dark" ? "#e8f4f8" : "#012030",
                          fontSize: 13, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>Last Name</label>
                      <input
                        type="text" required placeholder="Doe"
                        value={lastName} onChange={e => setLastName(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                          color: theme === "dark" ? "#e8f4f8" : "#012030",
                          fontSize: 13, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>Phone Number</label>
                      <input
                        type="tel" required placeholder="+234..."
                        value={phone} onChange={e => setPhone(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                          color: theme === "dark" ? "#e8f4f8" : "#012030",
                          fontSize: 13, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>Relationship</label>
                      <select
                        required
                        value={relationship} onChange={e => setRelationship(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 10,
                          background: theme === "dark" ? "#011d2f" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                          color: theme === "dark" ? "#e8f4f8" : "#012030",
                          fontSize: 13, outline: "none", boxSizing: "border-box",
                          height: "41.5px"
                        }}
                      >
                        <option value="" disabled>Select relation</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Common Fields */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", opacity: 0.7, pointerEvents: "none" }} />
                  <input
                    className="adms-input"
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com" required
                    style={{
                      width: "100%", padding: "10px 14px 10px 38px", borderRadius: 11,
                      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                      color: theme === "dark" ? "#e8f4f8" : "#012030",
                      fontSize: 13.5, outline: "none", boxSizing: "border-box", transition: "all 0.2s"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>
                  <span>Password</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", opacity: 0.7, pointerEvents: "none" }} />
                  <input
                    className="adms-input"
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password" required
                    style={{
                      width: "100%", padding: "10px 14px 10px 38px", borderRadius: 11,
                      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1.5px solid ${theme === "dark" ? "rgba(142,202,230,0.18)" : "#dde3e8"}`,
                      color: theme === "dark" ? "#e8f4f8" : "#012030",
                      fontSize: 13.5, outline: "none", boxSizing: "border-box", transition: "all 0.2s"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="adms-btn"
                style={{
                  padding: "13px", borderRadius: 11, marginTop: 4,
                  background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
                  color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
                  boxShadow: "0 6px 20px rgba(33,158,188,0.32)", transition: "all 0.2s"
                }}
              >
                {loading 
                  ? "Authenticating…" 
                  : mode === "signup" 
                    ? "Register & Start Application →" 
                    : "Sign In & Continue Application →"}
              </button>
            </form>

            <div style={{ marginTop: 28, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, paddingTop: 18, textAlign: "center" }}>
              <span style={{ fontSize: 12, color: theme === "dark" ? "#8ECAE6" : "#5a7f92" }}>
                Not applying for admissions?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={{ background: "none", border: "none", color: "#219EBC", cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 12 }}
                >
                  Go to Main Portal Login
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
