import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../contexts/AppContext";
import { Sun, Moon, Lock, Mail, ShieldCheck, Award, ArrowRight } from "lucide-react";
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
      <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", lineHeight: 1, fontFamily: "'Raleway', sans-serif" }}>{display}</div>
      <div style={{ fontSize: 11.5, color: "#bfd1ff", fontWeight: 600, marginTop: 4, letterSpacing: "0.2px" }}>{label}</div>
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
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const autofill = (role: string) => {
    const map: Record<string, { email: string; pass: string }> = {
      student: { email: "kolade@student.dlhs.edu.ng", pass: "password123" },
      teacher: { email: "lukajohn_kaduna@deeperlifehighschool.org", pass: "4321" },
      admin: { email: "admin@aroura.com", pass: "rr" },
    };
    setEmail(map[role]?.email || "");
    setPassword(map[role]?.pass || "password123");
  };

  return (
    <>
      <style>{`
        .split-container { display: flex; min-height: 100vh; font-family: 'Lato', 'Plus Jakarta Sans', sans-serif; }
        .split-left {
          flex: 1.1; background-image: url(/login_bg.png);
          background-size: cover; background-position: center;
          display: flex; flex-direction: column; justify-content: flex-end; padding: 60px;
          min-height: 100vh;
        }
        .split-right {
          flex: 0.9; display: flex; align-items: center; justify-content: center;
          position: relative; padding: 40px; overflow-y: auto;
        }
        .login-input:focus { border-color: #0093dd !important; box-shadow: 0 0 0 3px rgba(0, 147, 221, 0.15) !important; }
        .login-btn:hover:not(:disabled) { background: #b80f66 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220, 19, 123, 0.35) !important; }
        .shortcut-btn:hover { background: rgba(41, 61, 125, 0.1) !important; border-color: #293d7d !important; color: #293d7d !important; }
        @media (max-width: 900px) { .split-left { display: none; } }
      `}</style>

      <div className="split-container">
        {/* ── LEFT PANEL ── */}
        <div className="split-left" style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(22, 35, 75, 0.45) 0%, rgba(10, 18, 32, 0.88) 100%)",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo on left panel */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <img src="/logo.png" alt="Deeper Life High School" style={{ width: 56, height: 56, borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.3)", objectFit: "contain" }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", fontFamily: "'Raleway', sans-serif" }}>Deeper Life High School</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#d4af37", textTransform: "uppercase", letterSpacing: "1px" }}>Leadership with Distinction</div>
              </div>
            </div>

            <div style={{
              background: "rgba(16, 28, 50, 0.88)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              padding: "36px 40px", borderRadius: "16px",
              border: "1px solid rgba(191, 209, 255, 0.18)",
              maxWidth: "500px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.35)"
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(220, 19, 123, 0.14)", border: "1px solid rgba(220, 19, 123, 0.3)",
                padding: "5px 14px", borderRadius: 100, marginBottom: 18
              }}>
                <ShieldCheck size={13} style={{ color: "#dc137b" }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em", fontFamily: "'Raleway', sans-serif" }}>Official Academic &amp; CBT Portal</span>
              </div>

              <h2 style={{ color: "#ffffff", fontSize: 34, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.15, fontFamily: "'Raleway', sans-serif" }}>
                Academic Distinction &amp; Character.
              </h2>
              <p style={{ color: "#cbd5e1", fontSize: 14.5, margin: "0 0 24px", lineHeight: 1.7 }}>
                Authorized academic management and assessment gateway for Deeper Life High School scholars, parents, educators, and administrators.
              </p>

              {/* Count-up stats */}
              <div style={{ display: "flex", gap: 32, paddingTop: 20, borderTop: "1px solid rgba(191, 209, 255, 0.15)" }}>
                <StatCounter target={100} suffix="%" label="Academic Distinction" />
                <StatCounter target={21} suffix=" Campuses" label="Nationwide Network" />
                <StatCounter target={100} suffix="%" label="JAMB & WAEC Pass" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="split-right" style={{
          background: theme === "dark" ? "#0c1527" : "#f8fafc"
        }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            position: "absolute", top: 28, right: 28,
            width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: theme === "dark" ? "rgba(191,209,255,0.08)" : "rgba(41,61,125,0.06)",
            border: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.15)" : "rgba(41,61,125,0.12)"}`,
            cursor: "pointer", transition: "all 0.2s"
          }}>
            {theme === "dark" ? <Sun size={18} style={{ color: "#d4af37" }} /> : <Moon size={18} style={{ color: "#293d7d" }} />}
          </button>

          <div style={{ width: "100%", maxWidth: "420px" }}>
            {/* Logo + heading */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <img src="/logo.png" alt="Deeper Life High School" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "contain" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: theme === "dark" ? "#f8fafc" : "#16234b", fontFamily: "'Raleway', sans-serif" }}>Deeper Life High School</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc137b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Kaduna Campus</div>
                </div>
              </div>
              <h1 style={{ fontSize: 25, fontWeight: 900, color: theme === "dark" ? "#f8fafc" : "#16234b", margin: "0 0 6px", fontFamily: "'Raleway', sans-serif" }}>
                Portal Sign In
              </h1>
              <p style={{ fontSize: 13.5, color: theme === "dark" ? "#94a3b8" : "#64748b", margin: 0, lineHeight: 1.5 }}>
                Enter your institutional credentials to access your academic records.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {error && (
                <div style={{ background: "rgba(190, 18, 60, 0.08)", color: "#be123c", padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid rgba(190, 18, 60, 0.25)", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: theme === "dark" ? "#f8fafc" : "#16234b", marginBottom: 6, fontFamily: "'Raleway', sans-serif" }}>
                  Institutional Email / Admission ID
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#94a3b8" : "#64748b", opacity: 0.8, pointerEvents: "none" }} />
                  <input
                    className="login-input"
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. kolade@student.dlhs.edu.ng" required
                    style={{
                      width: "100%", padding: "11px 14px 11px 38px", borderRadius: 8,
                      background: theme === "dark" ? "#142038" : "#ffffff",
                      border: `1.5px solid ${theme === "dark" ? "rgba(191,209,255,0.15)" : "#d8e2ee"}`,
                      color: theme === "dark" ? "#f8fafc" : "#16234b",
                      fontSize: 13.5, outline: "none", boxSizing: "border-box", transition: "all 0.2s"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: theme === "dark" ? "#f8fafc" : "#16234b", marginBottom: 6, fontFamily: "'Raleway', sans-serif" }}>
                  <span>Password</span>
                  <a href="#" style={{ color: "#0093dd", textDecoration: "none", fontWeight: 600, fontSize: 12 }}>Forgot password?</a>
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 14, top: 13, color: theme === "dark" ? "#94a3b8" : "#64748b", opacity: 0.8, pointerEvents: "none" }} />
                  <input
                    className="login-input"
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter security password" required
                    style={{
                      width: "100%", padding: "11px 14px 11px 38px", borderRadius: 8,
                      background: theme === "dark" ? "#142038" : "#ffffff",
                      border: `1.5px solid ${theme === "dark" ? "rgba(191,209,255,0.15)" : "#d8e2ee"}`,
                      color: theme === "dark" ? "#f8fafc" : "#16234b",
                      fontSize: 13.5, outline: "none", boxSizing: "border-box", transition: "all 0.2s"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="login-btn"
                style={{
                  padding: "13px", borderRadius: 8, marginTop: 4,
                  background: "#dc137b",
                  color: "#fff", border: "none", fontSize: 14, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
                  boxShadow: "0 4px 16px rgba(220,19,123,0.28)", transition: "all 0.2s",
                  fontFamily: "'Raleway', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                {loading ? "Authenticating Credentials…" : "Authenticate & Access Portal →"}
              </button>
            </form>

            {/* Bottom Demo Selector & Attribution */}
            <div style={{ marginTop: 32, borderTop: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.1)" : "rgba(41,61,125,0.1)"}`, paddingTop: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme === "dark" ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, textAlign: "center", fontFamily: "'Raleway', sans-serif" }}>
                Quick Role Autofill (Evaluation Demo)
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                {["Student", "Teacher", "Admin"].map(role => (
                  <button key={role} onClick={() => autofill(role.toLowerCase())} className="shortcut-btn"
                    style={{
                      background: theme === "dark" ? "rgba(191,209,255,0.05)" : "rgba(41,61,125,0.05)",
                      border: `1px solid ${theme === "dark" ? "rgba(191,209,255,0.18)" : "rgba(41,61,125,0.18)"}`,
                      color: theme === "dark" ? "#bfd1ff" : "#293d7d",
                      borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", transition: "all 0.2s", fontFamily: "'Raleway', sans-serif"
                    }}
                  >{role} Portal</button>
                ))}
              </div>

              <p style={{ fontSize: 12, color: theme === "dark" ? "rgba(191,209,255,0.5)" : "rgba(41,61,125,0.6)", textAlign: "center", margin: 0 }}>
                Deeper Life High School Academic Management System · Powered by JLM
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
