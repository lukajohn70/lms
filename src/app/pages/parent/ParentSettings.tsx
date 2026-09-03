import { useState } from "react";
import { User, Phone, Shield, Save, Check, Eye, EyeOff, UserCheck } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

const inputStyle = (theme: string): React.CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
  border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
  color: "var(--heading)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "'Poppins', sans-serif",
});

export default function ParentSettings() {
  const { user, theme, updateUser } = useApp();

  // Profile fields
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [relationship, setRelationship] = useState((user as any)?.relationship || "Father");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    try {
      await apiClient.post("/parent/update-profile", {
        first_name: firstName,
        last_name: lastName,
        phone,
        relationship,
      });
      updateUser({ first_name: firstName, last_name: lastName });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    
    const isLengthValid = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isPasswordValid = isLengthValid && hasUppercase && hasNumber && hasSpecial;

    if (!isPasswordValid) {
      setPasswordError("New password does not meet all criteria.");
      return;
    }
    
    setPasswordLoading(true);
    setPasswordError("");
    try {
      await apiClient.post("/parent/update-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "#FFB703", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Parent</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>My Profile</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>
          Update your personal details and account security settings
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>

        {/* ── Profile Details Card ── */}
        <Glass>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFB70318", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFB703" }}>
              <User size={15} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Personal Information</span>
          </div>
          <form onSubmit={handleProfileSave} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Avatar preview */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: "linear-gradient(135deg, #FFB703, rgba(251,133,0,0.6))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#011d2f",
                boxShadow: "0 4px 16px rgba(255,183,3,0.3)",
              }}>
                {(firstName[0] || "").toUpperCase()}{(lastName[0] || "").toUpperCase()}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>First Name</label>
                <input
                  type="text" required value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle(theme)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Last Name</label>
                <input
                  type="text" required value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle(theme)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email" readOnly value={user?.email || ""}
                  style={{ ...inputStyle(theme), opacity: 0.55, cursor: "not-allowed", paddingRight: 80 }}
                />
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 10, fontWeight: 700, color: "#219EBC", background: "rgba(33,158,188,0.12)",
                  padding: "2px 8px", borderRadius: 6, letterSpacing: "0.04em"
                }}>READ-ONLY</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4, opacity: 0.7 }}>
                Contact the admin to change your email address.
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <Phone size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Phone Number
              </label>
              <input
                type="tel" value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                style={inputStyle(theme)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <UserCheck size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />Relationship to Children
              </label>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                style={{ ...inputStyle(theme), background: theme === "dark" ? "#021625" : "#fff" }}
              >
                <option>Father</option>
                <option>Mother</option>
                <option>Guardian</option>
              </select>
            </div>

            {profileError && (
              <div style={{ background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#e76f51" }}>
                ⚠ {profileError}
              </div>
            )}

            <button
              type="submit" disabled={profileLoading}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 20px", borderRadius: 10, cursor: "pointer",
                background: profileSaved ? "rgba(33,158,188,0.15)" : "linear-gradient(135deg, #FFB703, #FB8500)",
                border: profileSaved ? "1px solid #FFB703" : "none",
                color: profileSaved ? "#FFB703" : "#fff",
                fontSize: 13, fontWeight: 700,
                boxShadow: profileSaved ? "none" : "0 4px 16px rgba(255,183,3,0.3)",
                transition: "all 0.3s",
              }}
            >
              {profileSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {profileLoading ? "Saving..." : "Save Profile"}</>}
            </button>
          </form>
        </Glass>

        {/* ── Change Password Card ── */}
        <Glass>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FB850018", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
              <Shield size={15} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Change Password</span>
          </div>
          <form onSubmit={handlePasswordSave} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ background: "rgba(33,158,188,0.06)", border: "1px solid rgba(33,158,188,0.15)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "var(--subtext)", lineHeight: 1.55 }}>
              🔒 For your security, please enter your current password before setting a new one. Ensure it meets the complexity criteria below.
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrent ? "text" : "password"} required value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ ...inputStyle(theme), paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowCurrent(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: 0 }}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>New Password</label>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input
                  type={showNew ? "text" : "password"} required value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ ...inputStyle(theme), paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowNew(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: 0 }}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              
              {/* Password Strength Meter & Realtime Criteria Compliance */}
              <PasswordStrengthMeter password={newPassword} confirmPassword={confirmPassword} minCharCount={8} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Confirm New Password</label>
              <input
                type="password" required value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={{
                  ...inputStyle(theme),
                  borderColor: confirmPassword && confirmPassword !== newPassword
                    ? "rgba(231,111,81,0.6)"
                    : undefined
                }}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <div style={{ fontSize: 11, color: "#e76f51", marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>

            {passwordError && (
              <div style={{ background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#e76f51" }}>
                ⚠ {passwordError}
              </div>
            )}

            <button
              type="submit" disabled={passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 20px", borderRadius: 10, cursor: "pointer",
                background: passwordSaved ? "rgba(33,158,188,0.15)" : "linear-gradient(135deg, #219EBC, #023047)",
                border: passwordSaved ? "1px solid #219EBC" : "none",
                color: passwordSaved ? "#219EBC" : "#fff",
                fontSize: 13, fontWeight: 700,
                boxShadow: passwordSaved ? "none" : "0 4px 16px rgba(33,158,188,0.3)",
                transition: "all 0.3s",
                opacity: (!!confirmPassword && confirmPassword !== newPassword) ? 0.5 : 1,
              }}
            >
              {passwordSaved ? <><Check size={14} /> Password Updated!</> : <><Shield size={14} /> {passwordLoading ? "Updating..." : "Update Password"}</>}
            </button>
          </form>
        </Glass>
      </div>
    </div>
  );
}
