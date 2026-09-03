import { useState, useEffect } from "react";
import {
  User, KeyRound, Eye, EyeOff, Check, AlertCircle,
  Camera, Shield, BookOpen, Mail, CheckCircle
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

const avatarBase = API_BASE_URL.replace("/index.php", "");

export default function TeacherSettings() {
  const { user, updateUser } = useApp();

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Assigned courses
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwSuccess, setPwSuccess]     = useState(false);
  const [pwError, setPwError]         = useState("");

  useEffect(() => {
    // Load avatar from user context
    if ((user as any)?.avatar_path) {
      setAvatarPreview(`${avatarBase}/${(user as any).avatar_path}`);
    }
    // Load assigned courses
    apiClient.get("/teacher/classes")
      .then((res: any) => setAssignedCourses(res.courses || []))
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic local preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    setAvatarSuccess(false);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE_URL}?path=/users/update-avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.avatar_path) {
        updateUser({ avatar_path: data.avatar_path } as any);
        setAvatarSuccess(true);
        setTimeout(() => setAvatarSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setPwLoading(true);
    try {
      const res: any = await apiClient.post("/teacher/update-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      if (res.success) {
        setPwSuccess(true);
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        setTimeout(() => setPwSuccess(false), 4000);
      }
    } catch (err: any) {
      setPwError(err.message || "Incorrect current password or server error.");
    } finally {
      setPwLoading(false);
    }
  };

  const initials = `${user?.first_name?.[0] ?? "T"}${user?.last_name?.[0] ?? ""}`;
  const pwMatch  = confirmPw.length > 0 && confirmPw !== newPw;

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>
          Account Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>
          Update your profile photo and portal security password
        </p>
      </div>

      <div className="responsive-grid-2" style={{ gap: 22 }}>
        {/* ──────────── LEFT: Profile Card ──────────── */}
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          {/* Card header strip */}
          <div style={{
            background: "linear-gradient(135deg, rgba(33,158,188,0.15), rgba(2,48,71,0.25))",
            padding: "24px 24px 56px",
            borderBottom: "1px solid var(--glass-border)",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(33,158,188,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                <User size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Educator Profile</div>
                <div style={{ fontSize: 11, color: "var(--subtext)" }}>Faculty identity & assigned classes</div>
              </div>
            </div>
          </div>

          {/* Avatar floating above strip */}
          <div style={{ paddingInline: 18, marginTop: -40, marginBottom: 16, display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, #219EBC, #023047)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 800, color: "#fff",
                overflow: "hidden",
                border: "3px solid var(--glass-bg)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
              }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials
                }
              </div>
              <label style={{
                position: "absolute", bottom: 1, right: 1,
                width: 26, height: 26, borderRadius: "50%",
                background: "#219EBC", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                transition: "background 0.2s"
              }}>
                <Camera size={13} />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>
            </div>

            <div style={{ paddingBottom: 4, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>
                {avatarUploading
                  ? "⏳ Uploading photo…"
                  : avatarSuccess
                    ? <span style={{ color: "#2a9d8f" }}>✓ Photo updated!</span>
                    : "Click the camera icon to change photo"
                }
              </div>
            </div>
          </div>

          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
              <Mail size={14} style={{ color: "#219EBC", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--subtext)", fontWeight: 600, textTransform: "uppercase", marginBottom: 1 }}>Email</div>
                <div style={{ fontSize: 13, color: "var(--heading)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
              </div>
            </div>

            {/* Role */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
              <Shield size={14} style={{ color: "#FFB703", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--subtext)", fontWeight: 600, textTransform: "uppercase", marginBottom: 1 }}>Role</div>
                <div style={{ fontSize: 13, color: "var(--heading)", fontWeight: 500 }}>Faculty / Teacher</div>
              </div>
            </div>

            {/* Assigned Courses */}
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <BookOpen size={14} style={{ color: "#8ECAE6", flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: "var(--subtext)", fontWeight: 600, textTransform: "uppercase" }}>Assigned Courses</div>
              </div>
              {assignedCourses.length === 0
                ? <div style={{ fontSize: 12, color: "var(--subtext)", fontStyle: "italic" }}>No courses assigned yet</div>
                : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {assignedCourses.map(c => (
                      <span key={c.id} style={{
                        fontSize: 11.5, fontWeight: 700, color: "#219EBC",
                        background: "rgba(33,158,188,0.12)",
                        padding: "4px 10px", borderRadius: 8,
                        border: "1px solid rgba(33,158,188,0.25)"
                      }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
              }
            </div>

            <p style={{ fontSize: 11, color: "var(--subtext)", margin: "4px 0 0", lineHeight: 1.5 }}>
              ⚠️ Profile details (name, email, role) are managed by the administrator. Contact admin for changes.
            </p>
          </div>
        </Glass>

        {/* ──────────── RIGHT: Change Password ──────────── */}
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          {/* Card header strip */}
          <div style={{
            background: "linear-gradient(135deg, rgba(251,133,0,0.12), rgba(230,118,0,0.18))",
            padding: "24px",
            borderBottom: "1px solid var(--glass-border)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(251,133,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
                <KeyRound size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Change Password</div>
                <div style={{ fontSize: 11, color: "var(--subtext)" }}>Keep your account secure</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            {/* Info banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", borderRadius: 10,
              background: "rgba(33,158,188,0.06)",
              border: "1px solid rgba(33,158,188,0.2)",
              marginBottom: 20
            }}>
              <Shield size={15} style={{ color: "#219EBC", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "var(--subtext)", margin: 0, lineHeight: 1.55 }}>
                Choose a strong password with at least <strong style={{ color: "var(--heading)" }}>8 characters</strong>, including uppercase, lowercase, numbers, and symbols.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: "100%", padding: "10px 42px 10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: 0 }}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{ width: "100%", padding: "10px 42px 10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: 0 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password Strength Meter & Realtime Criteria Compliance */}
                <PasswordStrengthMeter password={newPw} confirmPassword={confirmPw} minCharCount={8} />
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 9,
                    background: "var(--muted)",
                    border: `1px solid ${pwMatch ? "rgba(231,111,81,0.5)" : confirmPw && confirmPw === newPw ? "rgba(42,157,143,0.5)" : "var(--glass-border)"}`,
                    color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Error */}
              {pwError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: "rgba(231,111,81,0.1)", color: "#e76f51", fontSize: 12.5, border: "1px solid rgba(231,111,81,0.25)" }}>
                  <AlertCircle size={14} /> {pwError}
                </div>
              )}

              {/* Success */}
              {pwSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: "rgba(42,157,143,0.1)", color: "#2a9d8f", fontSize: 12.5, fontWeight: 600, border: "1px solid rgba(42,157,143,0.25)" }}>
                  <CheckCircle size={14} /> Password changed successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading || pwMatch || !currentPw || !newPw || !confirmPw}
                style={{
                  padding: "12px 20px", borderRadius: 10, marginTop: 4,
                  background: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw)
                    ? "var(--muted)"
                    : "linear-gradient(135deg, #FB8500, #e67600)",
                  border: "none",
                  color: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "var(--subtext)" : "#fff",
                  fontSize: 14, fontWeight: 700,
                  cursor: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "not-allowed" : "pointer",
                  boxShadow: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "none" : "0 4px 16px rgba(251,133,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s"
                }}
              >
                {pwLoading
                  ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Updating…</>
                  : <><Check size={16} /> Update Password</>
                }
              </button>
            </form>
          </div>
        </Glass>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
