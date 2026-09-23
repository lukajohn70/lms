import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../contexts/AppContext";
import { Sun, Moon, Lock, Mail } from "lucide-react";
import { apiClient } from "../lib/apiClient";

// Count-up hook
function useCountUp(target: number, duration = 1600, suffix = "") {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value + suffix;
}

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const display = useCountUp(target, 1600, suffix);
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#219EBC", lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: 11.5, color: "#5a7f92", fontWeight: 500, marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function RoleSelect() {
  const navigate = useNavigate();
  const { login, theme, toggleTheme } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiClient.post("/login", { email, password });
      login(data.token, data.user);
      navigate(`/${data.user.role}`);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Check details.");
    } finally {
      setLoading(false);
    }
  };

  const autofill = (role: string) => {
    const map: Record<string, string> = {
      student: "kolade@student.aroura.com",
      teacher: "amaka.eze@teacher.aroura.com",
      admin: "admin@aroura.com",
      parent: "folake@parent.aroura.com",
    };
    setEmail(map[role] || "");
    setPassword("password123");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        .split-container { display: flex; min-height: 100vh; font-family: 'Poppins', sans-serif; }
        .split-left {
          flex: 1; background-image: url(/login_bg.png);
          background-size: cover; background-position: center;
          display: flex; flex-direction: column; justify-content: flex-end; padding: 60px;
          min-height: 100vh;
        }
        .split-right {
          flex: 1; display: flex; align-items: center; justify-content: center;
          position: relative; padding: 40px; overflow-y: auto;
        }
        .login-input:focus { border-color: #219EBC !important; box-shadow: 0 0 0 3px rgba(33,158,188,0.15) !important; }
        .login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(33,158,188,0.45) !important; }
        .shortcut-btn:hover { background: rgba(33,158,188,0.12) !important; transform: translateY(-1px); }
        @media (max-width: 900px) { .split-left { display: none; } }
      `}</style>

      <div className="split-container">
        {/* ── LEFT PANEL ── */}
        <div className="split-left" style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(2,48,71,0.04) 0%, rgba(2,48,71,0.28) 100%)",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo on left panel */}
            <img src="/logo.png" alt="Aroura Academy" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 28, boxShadow: "0 4px 20px rgba(2,48,71,0.15)" }} />

            <div style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              padding: "36px 40px", borderRadius: "22px",
              border: "1px solid rgba(255,255,255,0.75)",
              maxWidth: "480px",
              boxShadow: "0 12px 48px rgba(2,48,71,0.1)"
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.22)",
                padding: "4px 12px", borderRadius: 100, marginBottom: 20
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#219EBC", boxShadow: "0 0 6px #219EBC" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#023047", letterSpacing: "0.04em" }}>2026/2027 Academic Session</span>
              </div>

              <h2 style={{ color: "#012030", fontSize: 38, fontWeight: 800, margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-0.025em" }}>
                Learning<br />Evolved.
              </h2>
              <p style={{ color: "#3d6475", fontSize: 14.5, margin: "0 0 28px", lineHeight: 1.75 }}>
                Aroura Academy's next-generation platform for students, educators, and parents.
              </p>

              {/* Count-up stats */}
              <div style={{ display: "flex", gap: 28, paddingTop: 20, borderTop: "1px solid rgba(33,158,188,0.15)" }}>
                <StatCounter target={100} suffix="+" label="Students" />
                <StatCounter target={20} suffix="+" label="Teachers" />
                <StatCounter target={30} suffix="+" label="Courses" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="split-right" style={{
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
            cursor: "pointer", transition: "all 0.2s"
          }}>
            {theme === "dark" ? <Sun size={18} style={{ color: "#FFB703" }} /> : <Moon size={18} style={{ color: "#219EBC" }} />}
          </button>

          <div style={{ width: "100%", maxWidth: "420px" }}>
            {/* Logo + heading */}
            <div style={{ marginBottom: 32 }}>
              <img src="/logo.png" alt="Aroura Academy" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 20, boxShadow: "0 6px 24px rgba(33,158,188,0.25)" }} />
              <h1 style={{ fontSize: 26, fontWeight: 800, color: theme === "dark" ? "#e8f4f8" : "#012030", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                Portal Sign In
              </h1>
              <p style={{ fontSize: 13.5, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", margin: 0 }}>
                Sign in with your email and password to access your dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "rgba(251,133,0,0.08)", color: "#e07000", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid rgba(251,133,0,0.25)", lineHeight: 1.5 }}>
                  ⚠ {error}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme === "dark" ? "#e8f4f8" : "#012030", marginBottom: 5 }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", opacity: 0.7, pointerEvents: "none" }} />
                  <input
                    className="login-input"
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
                  <a href="#" style={{ color: "#219EBC", textDecoration: "none", fontWeight: 500, fontSize: 11.5 }}>Forgot password?</a>
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", opacity: 0.7, pointerEvents: "none" }} />
                  <input
                    className="login-input"
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" required
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
                className="login-btn"
                style={{
                  padding: "13px", borderRadius: 11, marginTop: 4,
                  background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
                  color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
                  boxShadow: "0 6px 20px rgba(33,158,188,0.32)", transition: "all 0.2s"
                }}
              >
                {loading ? "Authenticating…" : "Sign In →"}
              </button>
            </form>

            {/* Bottom */}
            <div style={{ marginTop: 32, borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, paddingTop: 22 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                {["Student", "Teacher", "Admin", "Parent"].map(role => (
                  <button key={role} onClick={() => autofill(role.toLowerCase())} className="shortcut-btn"
                    style={{
                      background: theme === "dark" ? "rgba(142,202,230,0.05)" : "rgba(33,158,188,0.05)",
                      border: `1px solid ${theme === "dark" ? "rgba(142,202,230,0.2)" : "rgba(33,158,188,0.25)"}`,
                      color: theme === "dark" ? "#8ECAE6" : "#219EBC",
                      borderRadius: 8, padding: "5px 13px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                  >{role}</button>
                ))}
              </div>
              
              <div style={{ textAlign: "center", fontSize: 12, color: theme === "dark" ? "#8ECAE6" : "#5a7f92", marginBottom: 12 }}>
                Prospective parent applicant?{" "}
                <button
                  onClick={() => navigate("/admissions/login")}
                  style={{ background: "none", border: "none", color: "#219EBC", cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 12 }}
                >
                  Go to Admissions Portal
                </button>
              </div>

              <p style={{ fontSize: 11.5, color: theme === "dark" ? "rgba(142,202,230,0.4)" : "rgba(90,127,146,0.6)", textAlign: "center", margin: 0 }}>
                Powered by{" "}
                <a href="https://jlm.com.ng" target="_blank" rel="noopener noreferrer"
                  style={{ color: theme === "dark" ? "rgba(142,202,230,0.7)" : "#219EBC", textDecoration: "none", fontWeight: 700 }}>
                  JLM
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
