import { useState, useEffect } from "react";
import { Lock, Shield, Eye, EyeOff, Check, AlertCircle, GraduationCap, UserCheck, KeyRound } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

export default function StudentSettings() {
  const { user } = useApp();

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Student details from API
  const [studentDetails, setStudentDetails] = useState<any>(null);

  useEffect(() => {
    // Fetch verified student info
    apiClient.get("/users/me")
      .then((res: any) => {
        if (res.user) {
          setStudentDetails(res.user);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res: any = await apiClient.post("/student/update-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.success) {
        setPasswordSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 4000);
      }
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const admNo = studentDetails?.admission_number || (user as any)?.admission_number || "DLHS-STD";
  const className = studentDetails?.class_name || (user as any)?.class_name || "Assigned Class";
  const initials = (user?.first_name?.[0] || "S") + (user?.last_name?.[0] || "");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>
          Account Security & Password
        </h1>
        <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>
          Manage your login credentials and view your institutional profile
        </p>
      </div>

      <div className="responsive-grid-2" style={{ gap: 20 }}>
        {/* Left Card: Verified Student Profile (Read-Only) */}
        <Glass style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)", marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(33,158,188,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
              <UserCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--heading)" }}>Institutional Profile</div>
              <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Official academic student identity</div>
            </div>
          </div>

          {/* Student Header Card */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 16, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #219EBC, #023047)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0, border: "2px solid rgba(33,158,188,0.4)" }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 2 }}>Role: Student</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  Adm: {admNo}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#FB8500", background: "rgba(251,133,0,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  Class: {className}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Information Details (Read-Only) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtext)" }}>Full Name:</span>
              <strong style={{ color: "var(--heading)" }}>{user?.first_name} {user?.last_name}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtext)" }}>Admission Number:</span>
              <strong style={{ color: "#219EBC" }}>{admNo}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtext)" }}>Academic Class:</span>
              <strong style={{ color: "#FB8500" }}>{className}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtext)" }}>Email:</span>
              <strong style={{ color: "var(--heading)" }}>{user?.email}</strong>
            </div>

            {user?.phone && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontSize: 12.5 }}>
                <span style={{ color: "var(--subtext)" }}>Phone:</span>
                <strong style={{ color: "var(--heading)" }}>{user?.phone}</strong>
              </div>
            )}
          </div>

          {/* Read-Only Notice */}
          <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 9, background: "rgba(33,158,188,0.06)", border: "1px dashed rgba(33,158,188,0.25)", fontSize: 12, color: "var(--subtext)", lineHeight: 1.5 }}>
            ℹ <strong>Note:</strong> Official student details (name, class, admission number) can only be modified by the school administrator or registrar to ensure record accuracy.
          </div>
        </Glass>

        {/* Right Card: Change Password (Active Form) */}
        <Glass style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)", marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(251,133,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
              <KeyRound size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--heading)" }}>Change Password</div>
              <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Update your portal login password</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--subtext)", background: "rgba(251,133,0,0.06)", border: "1px solid rgba(251,133,0,0.18)", borderRadius: 10, padding: 12, marginBottom: 18, lineHeight: 1.5 }}>
            🔒 To change your password, enter your current password followed by a new password of at least <strong>6 characters</strong>.
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 6 }}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 6 }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} confirmPassword={confirmPassword} minCharCount={8} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 6 }}>Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {passwordError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(231,111,81,0.12)", color: "#e76f51", fontSize: 12 }}>
                <AlertCircle size={15} /> {passwordError}
              </div>
            )}

            {passwordSaved && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(42,157,143,0.12)", color: "#2a9d8f", fontSize: 12, fontWeight: 600 }}>
                <Check size={15} /> Password changed successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)}
              style={{
                marginTop: 6, padding: "12px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #FB8500, #e67600)",
                border: "none", color: "#fff", fontSize: 13.5, fontWeight: 700,
                cursor: (passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)) ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(251,133,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <Shield size={16} /> {passwordLoading ? "Updating Password…" : "Update Password"}
            </button>
          </form>
        </Glass>
      </div>
    </div>
  );
}
