import { useState, useEffect } from "react";
import {
  User, KeyRound, Eye, EyeOff, Check, AlertCircle,
  Camera, Shield, BookOpen, Mail, CheckCircle, CheckCircle2, Clock
} from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

const DLHS = {
  navy: "#293D7D",
  navyDark: "#16234B",
  crimson: "#DC137B",
  crimsonHover: "#B80F66",
  blue: "#0093DD",
  gold: "#D4AF37",
  periwinkle: "#BFD1FF",
  slate: "#3A4244",
};

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style
    }}
  >
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
      const data = await apiClient.postForm('/users/update-avatar', formData);
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
    <div style={{ paddingBottom: 32 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
          Faculty Profile &amp; Portal Security
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
          Manage your faculty credentials, profile portrait, and academic portal authentication
        </p>
      </div>

      <div className="responsive-grid-2" style={{ gap: 22 }}>
        {/* ──────────── LEFT: Profile Card ──────────── */}
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          {/* Card header strip */}
          <div style={{
            background: `linear-gradient(135deg, ${DLHS.navyDark} 0%, ${DLHS.navy} 100%)`,
            padding: "24px 24px 56px",
            borderBottom: "1px solid var(--border)",
            position: "relative"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 800, color: "#ffffff" }}>Educator Profile</div>
                <div style={{ fontSize: 11.5, color: DLHS.periwinkle }}>Faculty identity &amp; assigned streams</div>
              </div>
            </div>
          </div>

          {/* Avatar floating above strip */}
          <div style={{ paddingInline: 22, marginTop: -40, marginBottom: 16, display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: DLHS.navy,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 800, color: "#ffffff",
                overflow: "hidden",
                border: "3px solid var(--card)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
              }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials
                }
              </div>
              <label style={{
                position: "absolute", bottom: 1, right: 1,
                width: 26, height: 26, borderRadius: "50%",
                background: DLHS.navy, color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                border: "2px solid var(--card)",
                transition: "background 0.2s"
              }}>
                <Camera size={13} />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>
            </div>

            <div style={{ paddingBottom: 4, minWidth: 0 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 17, fontWeight: 800, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {avatarUploading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DLHS.blue }}>
                    <Clock size={12} /> Uploading portrait…
                  </span>
                ) : avatarSuccess ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: DLHS.navy, fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> Portrait updated!
                  </span>
                ) : (
                  "Select camera icon to update portrait"
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Email */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
              <Mail size={15} style={{ color: DLHS.navy, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>Institutional Email</div>
                <div style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
              </div>
            </div>

            {/* Role */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
              <Shield size={15} style={{ color: DLHS.gold, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 1 }}>Designation</div>
                <div style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>Academic Faculty / Subject Specialist</div>
              </div>
            </div>

            {/* Assigned Courses */}
            <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <BookOpen size={15} style={{ color: DLHS.blue, flexShrink: 0 }} />
                <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Allocated Subject Streams</div>
              </div>
              {assignedCourses.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>No courses assigned yet</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {assignedCourses.map(c => (
                    <span key={c.id} style={{
                      fontSize: 11.5, fontWeight: 700, color: DLHS.navy,
                      background: "rgba(41, 61, 125, 0.08)",
                      padding: "4px 10px", borderRadius: 6,
                      border: `1px solid ${DLHS.navy}30`
                    }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(41, 61, 125, 0.04)", border: "1px solid var(--border)", marginTop: 4 }}>
              <AlertCircle size={14} style={{ color: DLHS.navy, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                Statutory faculty details (name, subject appointments) are managed centrally by the Academic Administrator.
              </span>
            </div>
          </div>
        </Glass>

        {/* ──────────── RIGHT: Change Password ──────────── */}
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          {/* Card header strip */}
          <div style={{
            background: "var(--muted)",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(41, 61, 125, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.navy }}>
                <KeyRound size={17} />
              </div>
              <div>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Authentication Security</div>
                <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>Update portal access password</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            {/* Info banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", borderRadius: 8,
              background: "rgba(41, 61, 125, 0.05)",
              border: `1px solid ${DLHS.navy}25`,
              marginBottom: 20
            }}>
              <Shield size={16} style={{ color: DLHS.navy, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.55 }}>
                Ensure institutional passwords contain at least <strong style={{ color: "var(--foreground)" }}>8 characters</strong>, combining uppercase, lowercase, numbers, and symbols.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Current Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: "100%", padding: "10px 42px 10px 14px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{ width: "100%", padding: "10px 42px 10px 14px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPw} confirmPassword={confirmPw} minCharCount={8} />
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8,
                    background: "var(--muted)",
                    border: `1px solid ${pwMatch ? DLHS.crimson : confirmPw && confirmPw === newPw ? DLHS.navy : "var(--border)"}`,
                    color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Error */}
              {pwError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", color: DLHS.crimson, fontSize: 12.5, border: `1px solid ${DLHS.crimson}30` }}>
                  <AlertCircle size={15} /> {pwError}
                </div>
              )}

              {/* Success */}
              {pwSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", color: DLHS.navy, fontSize: 12.5, fontWeight: 600, border: `1px solid ${DLHS.navy}30` }}>
                  <CheckCircle size={15} /> Authentication password updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading || pwMatch || !currentPw || !newPw || !confirmPw}
                style={{
                  padding: "12px 20px", borderRadius: 8, marginTop: 4,
                  background: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw)
                    ? "var(--muted)"
                    : DLHS.navy,
                  border: "none",
                  color: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "var(--muted-foreground)" : "#ffffff",
                  fontSize: 13.5, fontWeight: 700,
                  cursor: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "not-allowed" : "pointer",
                  boxShadow: (pwLoading || pwMatch || !currentPw || !newPw || !confirmPw) ? "none" : "0 4px 12px rgba(41, 61, 125, 0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s ease"
                }}
              >
                {pwLoading ? (
                  <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Updating Credentials…</>
                ) : (
                  <><Check size={16} /> Update Password</>
                )}
              </button>
            </form>
          </div>
        </Glass>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
