import { useState, useEffect } from "react";
import { User, Lock, Shield, Eye, EyeOff, Check, AlertCircle, Camera, GraduationCap, Mail, Phone, BookOpen } from "lucide-react";
import { useApp } from "../../contexts/AppContext";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

export default function StudentSettings() {
  const { user, setUser, theme } = useApp();

  // Profile Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Avatar states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      if ((user as any).avatar_path) {
        const baseUrl = API_BASE_URL.replace("/index.php", "");
        setAvatarPreview(`${baseUrl}/${(user as any).avatar_path}`);
      }
    }

    // Fetch student info
    apiClient.get("/users/me")
      .then((res: any) => {
        if (res.user) {
          setStudentDetails(res.user);
        }
      })
      .catch(() => {});
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    setProfileSaved(false);

    try {
      const res: any = await apiClient.post("/student/update-profile", {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      });

      if (res.success) {
        setProfileSaved(true);
        if (setUser && user) {
          setUser({ ...user, first_name: firstName, last_name: lastName, email: email, phone: phone });
        }
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/users/update-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.avatar_path) {
        if (setUser && user) {
          setUser({ ...user, avatar_path: data.avatar_path } as any);
        }
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
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
  const className = studentDetails?.class_name || (user as any)?.class_name || "Assigned Grade";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>
          Account Settings & Security
        </h1>
        <p style={{ fontSize: 13, color: "var(--subtext)", margin: 0 }}>
          Manage your student profile, contact info, and security credentials
        </p>
      </div>

      <div className="responsive-grid-2" style={{ gap: 20 }}>
        {/* Left Card: Student Profile */}
        <Glass style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)", marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(33,158,188,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
              <User size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--heading)" }}>Student Profile</div>
              <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Your institutional identity details</div>
            </div>
          </div>

          {/* Avatar and School Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 14, borderRadius: 12, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #219EBC, #023047)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", overflow: "hidden", border: "2px solid rgba(33,158,188,0.4)" }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (user?.first_name?.[0] || "S") + (user?.last_name?.[0] || "")
                )}
              </div>
              <label style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "#219EBC", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                <Camera size={13} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--heading)" }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  Adm: {admNo}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FB8500", background: "rgba(251,133,0,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  Class: {className}
                </span>
              </div>
              {avatarUploading && <div style={{ fontSize: 11, color: "#219EBC", marginTop: 4 }}>Uploading new photo…</div>}
            </div>
          </div>

          {/* Profile Details Form */}
          <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <Mail size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>Phone Number</label>
              <div style={{ position: "relative" }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <Phone size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--subtext)" }} />
              </div>
            </div>

            {profileError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(231,111,81,0.12)", color: "#e76f51", fontSize: 12 }}>
                <AlertCircle size={15} /> {profileError}
              </div>
            )}

            {profileSaved && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(42,157,143,0.12)", color: "#2a9d8f", fontSize: 12, fontWeight: 600 }}>
                <Check size={15} /> Profile details saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              style={{
                marginTop: 6, padding: "10px 18px", borderRadius: 9,
                background: "linear-gradient(135deg, #219EBC, #1a8aaa)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: profileLoading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(33,158,188,0.25)"
              }}
            >
              {profileLoading ? "Saving Changes…" : "Save Profile Details"}
            </button>
          </form>
        </Glass>

        {/* Right Card: Change Password */}
        <Glass style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)", marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(251,133,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--heading)" }}>Change Password</div>
              <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Protect your account with a secure password</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--subtext)", background: "rgba(251,133,0,0.06)", border: "1px solid rgba(251,133,0,0.18)", borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 1.5 }}>
            🔒 For security reasons, please provide your current password before choosing a new one. Your new password must be at least <strong>6 characters</strong>.
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ width: "100%", padding: "9px 40px 9px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  style={{ width: "100%", padding: "9px 40px 9px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 5 }}>Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {passwordError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(231,111,81,0.12)", color: "#e76f51", fontSize: 12 }}>
                <AlertCircle size={15} /> {passwordError}
              </div>
            )}

            {passwordSaved && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(42,157,143,0.12)", color: "#2a9d8f", fontSize: 12, fontWeight: 600 }}>
                <Check size={15} /> Password changed successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)}
              style={{
                marginTop: 6, padding: "10px 18px", borderRadius: 9,
                background: "linear-gradient(135deg, #FB8500, #e67600)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: (passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)) ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(251,133,0,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <Shield size={15} /> {passwordLoading ? "Updating Password…" : "Update Password"}
            </button>
          </form>
        </Glass>
      </div>
    </div>
  );
}
