import { useState, useEffect, useRef } from "react";
import { Globe, Bell, Shield, Database, Save, ToggleLeft, ToggleRight, Check, CreditCard, User, Phone, Eye, EyeOff, BookOpen, Upload, Camera, Calendar } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

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

export default function AdminSettings() {
  const { updateSettings, user, theme, updateUser } = useApp();
  const [activeTab, setActiveTab] = useState<"system" | "profile">("system");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Individual setting states mapped to snake_case matching Database seeder
  const [schoolName, setSchoolName] = useState("Aroura Academy");
  const [academicSession, setAcademicSession] = useState("2026/2027");
  const [currentTerm, setCurrentTerm] = useState("2nd Term");
  const [schoolEmail, setSchoolEmail] = useState("admin@aroura.com");
  const [schoolPhone, setSchoolPhone] = useState("+234 801 234 5678");
  const [schoolAddress, setSchoolAddress] = useState("12 Aroura Close, Victoria Island, Lagos");
  const [schoolDirectorName, setSchoolDirectorName] = useState("Mrs M I. Okafor");
  const [schoolAcronym, setSchoolAcronym] = useState("AROURA");
  const [acceptanceFeeAmount, setAcceptanceFeeAmount] = useState("20000");
  const [resultMode, setResultMode] = useState("end_of_term");

  // School Logo & Term Dates
  const [schoolLogoPath, setSchoolLogoPath] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoResult, setLogoResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [vacationDateTerm1, setVacationDateTerm1] = useState("2026-12-19");
  const [resumptionDateTerm1, setResumptionDateTerm1] = useState("2027-01-10");
  const [vacationDateTerm2, setVacationDateTerm2] = useState("2027-04-04");
  const [resumptionDateTerm2, setResumptionDateTerm2] = useState("2027-04-22");
  const [vacationDateTerm3, setVacationDateTerm3] = useState("2027-07-25");
  const [resumptionDateTerm3, setResumptionDateTerm3] = useState("2027-09-15");

  // Toggle states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [cbtReminders, setCbtReminders] = useState(true);
  const [feeDueAlerts, setFeeDueAlerts] = useState(false);
  const [systemAnnouncements, setSystemAnnouncements] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [loginAttemptLimit, setLoginAttemptLimit] = useState(true);
  const [autoBackups, setAutoBackups] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);

  // Payment method toggles
  const [payMethodCard, setPayMethodCard] = useState(true);
  const [payMethodBank, setPayMethodBank] = useState(true);
  const [payMethodUssd, setPayMethodUssd] = useState(true);

  // Profile fields state
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState((user as any)?.phone || "");

  // Password fields state
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

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Study Guide upload state
  const [guideCategory, setGuideCategory] = useState<"nursery" | "primary" | "secondary">("nursery");
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [guideUploading, setGuideUploading] = useState(false);
  const [guideResult, setGuideResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const guideInputRef = useRef<HTMLInputElement>(null);

  // Sync profile details when user state changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone((user as any)?.phone || "");
      if ((user as any)?.avatar_path) {
        setAvatarPreview(`http://localhost/lms/api/${(user as any).avatar_path}`);
      }
    }
  }, [user]);

  useEffect(() => {
    apiClient.get("/admin/settings")
      .then((res: any) => {
        if (res && res.success && res.settings) {
          const s = res.settings;
          setSchoolName(s.school_name || "Aroura Academy");
          setAcademicSession(s.academic_session || "2026/2027");
          setCurrentTerm(s.current_term || "2nd Term");
          setSchoolEmail(s.school_email || "admin@aroura.com");
          setSchoolPhone(s.school_phone || "+234 801 234 5678");
          setSchoolAddress(s.school_address || "12 Aroura Close, Victoria Island, Lagos");
          setSchoolDirectorName(s.school_director_name || "Mrs M I. Okafor");
          setSchoolAcronym(s.school_acronym || "AROURA");
          setAcceptanceFeeAmount(s.acceptance_fee_amount || "20000");
          setResultMode(s.result_mode || "end_of_term");

          setSchoolLogoPath(s.school_logo_path || "");
          setVacationDateTerm1(s.vacation_date_term1 || "2026-12-19");
          setResumptionDateTerm1(s.resumption_date_term1 || "2027-01-10");
          setVacationDateTerm2(s.vacation_date_term2 || "2027-04-04");
          setResumptionDateTerm2(s.resumption_date_term2 || "2027-04-22");
          setVacationDateTerm3(s.vacation_date_term3 || "2027-07-25");
          setResumptionDateTerm3(s.resumption_date_term3 || "2027-09-15");

          setEmailNotifications(s.email_notifications === "1");
          setCbtReminders(s.cbt_reminders === "1");
          setFeeDueAlerts(s.fee_due_alerts === "1");
          setSystemAnnouncements(s.system_announcements === "1");
          setTwoFactorAuth(s.two_factor_auth === "1");
          setSessionTimeout(s.session_timeout === "1");
          setLoginAttemptLimit(s.login_attempt_limit === "1");
          setAutoBackups(s.auto_backups === "1");
          setAuditLogging(s.audit_logging === "1");

          setPayMethodCard(s.pay_method_card === undefined ? true : s.pay_method_card === "1");
          setPayMethodBank(s.pay_method_bank === undefined ? true : s.pay_method_bank === "1");
          setPayMethodUssd(s.pay_method_ussd === undefined ? true : s.pay_method_ussd === "1");
        }
      })
      .catch(err => console.error("Error loading settings", err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoResult(null);
    const formData = new FormData();
    formData.append("logo_file", file);
    try {
      const res: any = await apiClient.postForm("/admin/upload-logo", formData);
      if (res && res.success) {
        setSchoolLogoPath(res.logo_path);
        setLogoResult({ ok: true, msg: "School logo updated successfully!" });
      } else {
        setLogoResult({ ok: false, msg: res?.error || "Failed to upload logo." });
      }
    } catch (err: any) {
      setLogoResult({ ok: false, msg: err?.message || "Upload error. Please try again." });
    } finally {
      setLogoUploading(false);
      setTimeout(() => setLogoResult(null), 4000);
    }
  };

  const handleSave = () => {
    const payload = {
      school_name: schoolName,
      academic_session: academicSession,
      current_term: currentTerm,
      school_email: schoolEmail,
      school_phone: schoolPhone,
      school_address: schoolAddress,
      school_director_name: schoolDirectorName,
      school_acronym: schoolAcronym,
      acceptance_fee_amount: acceptanceFeeAmount,
      result_mode: resultMode,
      school_logo_path: schoolLogoPath,
      vacation_date_term1: vacationDateTerm1,
      resumption_date_term1: resumptionDateTerm1,
      vacation_date_term2: vacationDateTerm2,
      resumption_date_term2: resumptionDateTerm2,
      vacation_date_term3: vacationDateTerm3,
      resumption_date_term3: resumptionDateTerm3,
      email_notifications: emailNotifications,
      cbt_reminders: cbtReminders,
      fee_due_alerts: feeDueAlerts,
      system_announcements: systemAnnouncements,
      two_factor_auth: twoFactorAuth,
      session_timeout: sessionTimeout,
      login_attempt_limit: loginAttemptLimit,
      autoBackups: autoBackups,
      audit_logging: auditLogging,
      pay_method_card: payMethodCard,
      pay_method_bank: payMethodBank,
      pay_method_ussd: payMethodUssd,
    };

    apiClient.post("/admin/settings/save", payload)
      .then((res: any) => {
        if (res && res.success) {
          setSaved(true);
          // Sync changes to globally accessible AppContext
          updateSettings(payload as any);
          setTimeout(() => setSaved(false), 2000);
        }
      })
      .catch(err => console.error("Error saving settings", err));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    try {
      await apiClient.post("/admin/update-profile", {
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      updateUser({ first_name: firstName, last_name: lastName, phone } as any);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res: any = await apiClient.postForm("/users/update-avatar", formData);
      if (res.avatar_path) {
        updateUser({ avatar_path: res.avatar_path } as any);
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleGuideUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideFile) return;
    setGuideUploading(true);
    setGuideResult(null);
    const formData = new FormData();
    formData.append("category", guideCategory);
    formData.append("guide_file", guideFile);
    try {
      const res: any = await apiClient.postForm("/admin/upload-study-guide", formData);
      setGuideResult({ ok: true, msg: res.message || "Study guide uploaded successfully!" });
      setGuideFile(null);
      if (guideInputRef.current) guideInputRef.current.value = "";
    } catch (err: any) {
      setGuideResult({ ok: false, msg: err.message || "Upload failed. Please try again." });
    } finally {
      setGuideUploading(false);
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
      await apiClient.post("/admin/update-password", {
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

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading system parameters...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Admin</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>
            {activeTab === "system" ? "System Settings" : "My Profile"}
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>
            {activeTab === "system"
              ? "Configure platform-wide preferences and security options"
              : "Update your personal details and account security settings"}
          </p>
        </div>
        {activeTab === "system" && (
          <button
            onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
              background: saved ? "rgba(33,158,188,0.15)" : "linear-gradient(135deg, #219EBC, #023047)",
              border: saved ? "1px solid #219EBC" : "none",
              color: saved ? "#219EBC" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: saved ? "none" : "0 4px 16px rgba(33,158,188,0.3)", transition: "all 0.3s"
            }}
          >
            {saved ? <Check size={14} /> : <Save size={14} />} {saved ? "Saved!" : "Save Changes"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, borderBottom: "1px solid var(--glass-border)", paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab("system")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            background: activeTab === "system" ? "rgba(251, 133, 0, 0.15)" : "transparent",
            border: activeTab === "system" ? "1px solid #FB8500" : "1px solid transparent",
            color: activeTab === "system" ? "#FB8500" : "var(--subtext)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <Globe size={14} /> System Settings
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            background: activeTab === "profile" ? "rgba(251, 133, 0, 0.15)" : "transparent",
            border: activeTab === "profile" ? "1px solid #FB8500" : "1px solid transparent",
            color: activeTab === "profile" ? "#FB8500" : "var(--subtext)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <User size={14} /> My Profile
        </button>
      </div>

      {activeTab === "system" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Section 1: General Info */}
            <Glass>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#219EBC18", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                  <Globe size={15} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>General Parameters</span>
              </div>
              <div style={{ padding: "4px 20px 12px" }}>
                {/* Official School Logo */}
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Official School Logo</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: "var(--muted)", border: "1.5px dashed var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {schoolLogoPath ? (
                        <img src={`http://localhost/lms/api/${schoolLogoPath}`} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#219EBC" }}>{schoolAcronym.slice(0, 2)}</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        style={{ padding: "6px 14px", borderRadius: 8, background: "#219EBC", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        {logoUploading ? "Uploading..." : "Upload Logo"}
                      </button>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                      <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>PNG, JPG, WEBP, or SVG. Displayed on official report cards and transcripts.</div>
                      {logoResult && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: logoResult.ok ? "#2a9d8f" : "#ef4444", marginTop: 4 }}>
                          {logoResult.msg}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>School Name</label>
                  <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Academic Session</label>
                  <input type="text" value={academicSession} onChange={e => setAcademicSession(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Term</label>
                  <select value={currentTerm} onChange={e => setCurrentTerm(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none" }}>
                    <option>1st Term</option>
                    <option>2nd Term</option>
                    <option>3rd Term</option>
                  </select>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Result Processing Mode</label>
                  <select value={resultMode} onChange={e => setResultMode(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none" }}>
                    <option value="mid_term">Mid-Term (Evaluations out of 20)</option>
                    <option value="end_of_term">Full Term (Final grades out of 100)</option>
                  </select>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>School Contact Email</label>
                  <input type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>School Phone Number</label>
                  <input type="text" value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>School Physical Address</label>
                  <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>School Acronym (For Refs)</label>
                  <input type="text" value={schoolAcronym} onChange={e => setSchoolAcronym(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Director / Registrar Name</label>
                  <input type="text" value={schoolDirectorName} onChange={e => setSchoolDirectorName(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ padding: "12px 0" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Admissions Acceptance Fee (₦)</label>
                  <input type="number" value={acceptanceFeeAmount} onChange={e => setAcceptanceFeeAmount(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </Glass>

            {/* Section: Term Vacation & Resumption Calendar */}
            <Glass>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#219EBC18", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
                  <Calendar size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Term Calendar &amp; Holiday Dates</span>
                  <div style={{ fontSize: 11, color: "var(--subtext)" }}>School vacation and next term resumption dates printed on report cards</div>
                </div>
              </div>
              <div style={{ padding: "8px 20px 16px" }}>
                {/* 1st Term */}
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#219EBC", marginBottom: 8, textTransform: "uppercase" }}>1st Term Calendar</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Vacation Date</label>
                      <input type="date" value={vacationDateTerm1} onChange={e => setVacationDateTerm1(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Resumption Date</label>
                      <input type="date" value={resumptionDateTerm1} onChange={e => setResumptionDateTerm1(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>

                {/* 2nd Term */}
                <div style={{ padding: "12px 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB703", marginBottom: 8, textTransform: "uppercase" }}>2nd Term Calendar</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Vacation Date</label>
                      <input type="date" value={vacationDateTerm2} onChange={e => setVacationDateTerm2(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Resumption Date</label>
                      <input type="date" value={resumptionDateTerm2} onChange={e => setResumptionDateTerm2(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>

                {/* 3rd Term */}
                <div style={{ padding: "12px 0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#FB8500", marginBottom: 8, textTransform: "uppercase" }}>3rd Term Calendar</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Vacation Date</label>
                      <input type="date" value={vacationDateTerm3} onChange={e => setVacationDateTerm3(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>Resumption Date</label>
                      <input type="date" value={resumptionDateTerm3} onChange={e => setResumptionDateTerm3(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              </div>
            </Glass>

            {/* Section 2: Notifications */}
            <Glass>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FFB70318", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFB703" }}>
                  <Bell size={15} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Notifications & Alerts</span>
              </div>
              <div style={{ padding: "4px 20px 12px" }}>
                {[
                  { l: "Email Notifications", d: "Send email alerts for new results, attendance, and fees", state: emailNotifications, set: setEmailNotifications },
                  { l: "CBT Reminders", d: "Remind students 24h before upcoming exams", state: cbtReminders, set: setCbtReminders },
                  { l: "Fee Due Alerts", d: "Alert parents when fee deadlines are approaching", state: feeDueAlerts, set: setFeeDueAlerts },
                  { l: "System Announcements", d: "Broadcast notices to all users", state: systemAnnouncements, set: setSystemAnnouncements },
                ].map(t => (
                  <div key={t.l} style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 0", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{t.l}</div>
                      <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>{t.d}</div>
                    </div>
                    <button onClick={() => t.set(!t.state)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {t.state ? <ToggleRight size={30} style={{ color: "#219EBC" }} /> : <ToggleLeft size={30} style={{ color: "rgba(142,202,230,0.3)" }} />}
                    </button>
                  </div>
                ))}
              </div>
            </Glass>

            {/* Section 3: Security */}
            <Glass>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FB850018", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
                  <Shield size={15} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Security Protocols</span>
              </div>
              <div style={{ padding: "4px 20px 12px" }}>
                {[
                  { l: "Two-Factor Authentication", d: "Require 2FA for admin logins", state: twoFactorAuth, set: setTwoFactorAuth },
                  { l: "Session Timeout", d: "Auto-logout after 30 minutes of inactivity", state: sessionTimeout, set: setSessionTimeout },
                  { l: "Login Attempt Limit", d: "Lock accounts after 5 failed login attempts", state: loginAttemptLimit, set: setLoginAttemptLimit },
                ].map(t => (
                  <div key={t.l} style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 0", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{t.l}</div>
                      <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>{t.d}</div>
                    </div>
                    <button onClick={() => t.set(!t.state)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {t.state ? <ToggleRight size={30} style={{ color: "#219EBC" }} /> : <ToggleLeft size={30} style={{ color: "rgba(142,202,230,0.3)" }} />}
                    </button>
                  </div>
                ))}
              </div>
            </Glass>

            {/* Section 4: Database & Backups */}
            <Glass>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#8ECAE618", display: "flex", alignItems: "center", justifyContent: "center", color: "#8ECAE6" }}>
                  <Database size={15} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Data & Backups</span>
              </div>
              <div style={{ padding: "4px 20px 12px" }}>
                {[
                  { l: "Automatic Backups", d: "Back up database every 24 hours", state: autoBackups, set: setAutoBackups },
                  { l: "Audit Logging", d: "Log all admin actions for compliance", state: auditLogging, set: setAuditLogging },
                ].map(t => (
                  <div key={t.l} style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 0", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{t.l}</div>
                      <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>{t.d}</div>
                    </div>
                    <button onClick={() => t.set(!t.state)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {t.state ? <ToggleRight size={30} style={{ color: "#219EBC" }} /> : <ToggleLeft size={30} style={{ color: "rgba(142,202,230,0.3)" }} />}
                    </button>
                  </div>
                ))}
              </div>
            </Glass>
          </div>

          {/* Section 5: Payment Methods */}
          <Glass style={{ marginTop: 18 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#2a9d8f18", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f" }}>
                <CreditCard size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Payment Methods</span>
                <span style={{ fontSize: 11.5, color: "var(--subtext)", marginLeft: 10 }}>Control which payment options parents can use during admissions</span>
              </div>
            </div>
            <div style={{ padding: "4px 20px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              {[
                { l: "Credit / Debit Card", d: "Allow parents to pay with Visa, Mastercard, etc.", state: payMethodCard, set: setPayMethodCard },
                { l: "Bank Transfer", d: "Allow parents to pay via direct bank transfer", state: payMethodBank, set: setPayMethodBank },
                { l: "USSD Code", d: "Allow parents to pay using mobile USSD shortcodes", state: payMethodUssd, set: setPayMethodUssd },
              ].map((t, i, arr) => (
                <div key={t.l} style={{ display: "flex", alignItems: "center", justifycontent: "space-between", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--glass-border)", borderRight: i < arr.length - 1 ? "1px solid var(--glass-border)" : "none", paddingRight: i < arr.length - 1 ? 20 : 0, paddingLeft: i > 0 ? 20 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{t.l}</div>
                    <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>{t.d}</div>
                  </div>
                  <button onClick={() => t.set(!t.state)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 12, flexShrink: 0 }}>
                    {t.state ? <ToggleRight size={30} style={{ color: "#2a9d8f" }} /> : <ToggleLeft size={30} style={{ color: "rgba(142,202,230,0.3)" }} />}
                  </button>
                </div>
              ))}
            </div>
          </Glass>
        </>
      ) : (
        /* My Profile Tab Content */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          {/* Card 1: Personal Info */}
          <Glass>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FB850018", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB8500" }}>
                <User size={15} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Personal Information</span>
            </div>
            <form onSubmit={handleProfileSave} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Avatar with photo upload */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(251,133,0,0.4)", boxShadow: "0 4px 16px rgba(251,133,0,0.2)" }}
                    />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: "linear-gradient(135deg, #FB8500, rgba(251,133,0,0.6))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 26, fontWeight: 800, color: "#011d2f",
                      boxShadow: "0 4px 16px rgba(251,133,0,0.3)",
                    }}>
                      {(firstName[0] || "").toUpperCase()}{(lastName[0] || "").toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "#FB8500", border: "2px solid var(--glass-bg)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", boxShadow: "0 2px 8px rgba(251,133,0,0.4)"
                    }}
                    title="Upload passport photograph"
                  >
                    <Camera size={12} style={{ color: "#fff" }} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              {avatarUploading && (
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--subtext)", marginTop: -8, marginBottom: 4 }}>Uploading photo...</div>
              )}

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
                  background: profileSaved ? "rgba(33,158,188,0.15)" : "linear-gradient(135deg, #FB8500, #E76F51)",
                  border: profileSaved ? "1px solid #FB8500" : "none",
                  color: profileSaved ? "#FB8500" : "#fff",
                  fontSize: 13, fontWeight: 700,
                  boxShadow: profileSaved ? "none" : "0 4px 16px rgba(251,133,0,0.3)",
                  transition: "all 0.3s",
                }}
              >
                {profileSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {profileLoading ? "Saving..." : "Save Profile"}</>}
              </button>
            </form>
          </Glass>

          {/* Card 2: Change Password */}
          <Glass>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#219EBC18", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
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

                {/* Password Strength Criteria */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "8px 12px", background: "rgba(0,0,0,0.02)", borderRadius: 8, border: "1px solid var(--glass-border)" }}>
                  {[
                    { label: "At least 8 characters", valid: newPassword.length >= 8 },
                    { label: "One uppercase letter", valid: /[A-Z]/.test(newPassword) },
                    { label: "One number", valid: /[0-9]/.test(newPassword) },
                    { label: "One special character", valid: /[^A-Za-z0-9]/.test(newPassword) }
                  ].map((criteria, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: criteria.valid ? "#2a9d8f" : "var(--subtext)" }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: criteria.valid ? "rgba(42,157,143,0.15)" : "rgba(142,202,230,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {criteria.valid ? <Check size={8} style={{ color: "#2a9d8f", fontWeight: 900 }} /> : <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--subtext)" }} />}
                      </div>
                      <span style={{ fontWeight: criteria.valid ? 600 : 400, opacity: criteria.valid ? 1 : 0.7 }}>{criteria.label}</span>
                    </div>
                  ))}
                </div>
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
      )}

      {/* ─── STUDY GUIDE UPLOAD SECTION (shown in System tab) ──── */}
      {activeTab === "system" && (
        <Glass style={{ marginTop: 18 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#9b5de518", display: "flex", alignItems: "center", justifyContent: "center", color: "#9b5de5" }}>
              <BookOpen size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Study Guide Management</span>
              <span style={{ fontSize: 11.5, color: "var(--subtext)", marginLeft: 10 }}>Upload or replace PDF study guides shown to students in each category</span>
            </div>
          </div>
          <form onSubmit={handleGuideUpload} style={{ padding: "18px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              {(["nursery", "primary", "secondary"] as const).map(cat => {
                const info = {
                  nursery: { label: "Nursery Guide", emoji: "🐣", desc: "NUR 1–3 curriculum guide (PDF)" },
                  primary: { label: "Primary Guide", emoji: "📖", desc: "PRI 1–6 curriculum guide (PDF)" },
                  secondary: { label: "Secondary Guide", emoji: "🎓", desc: "JSS/SS curriculum guide (PDF)" },
                }[cat];
                const isActive = guideCategory === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => setGuideCategory(cat)}
                    style={{
                      padding: "14px", borderRadius: 10, cursor: "pointer",
                      border: `1.5px solid ${isActive ? "#9b5de5" : "var(--glass-border)"}`,
                      background: isActive ? "rgba(155,93,229,0.08)" : "var(--muted)",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{info.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#9b5de5" : "var(--heading)" }}>{info.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>{info.desc}</div>
                    {isActive && <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: "#9b5de5", textTransform: "uppercase" }}>✓ Selected</div>}
                  </div>
                );
              })}
            </div>

            {/* File drop zone */}
            <div
              onClick={() => guideInputRef.current?.click()}
              style={{
                border: `2px dashed ${guideFile ? "rgba(155,93,229,0.5)" : "var(--glass-border)"}`,
                borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer",
                background: guideFile ? "rgba(155,93,229,0.05)" : "var(--muted)",
                marginBottom: 14, transition: "all 0.2s"
              }}
            >
              <Upload size={22} style={{ color: guideFile ? "#9b5de5" : "var(--subtext)", marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: guideFile ? "#9b5de5" : "var(--heading)" }}>
                {guideFile ? guideFile.name : "Click to select PDF file"}
              </div>
              <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Only PDF files accepted · Max 10MB</div>
              <input
                ref={guideInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={e => setGuideFile(e.target.files?.[0] || null)}
              />
            </div>

            {guideResult && (
              <div style={{
                padding: "10px 14px", borderRadius: 9, marginBottom: 14, fontSize: 12.5,
                background: guideResult.ok ? "rgba(42,157,143,0.08)" : "rgba(231,111,81,0.08)",
                border: `1px solid ${guideResult.ok ? "rgba(42,157,143,0.25)" : "rgba(231,111,81,0.25)"}`,
                color: guideResult.ok ? "#2a9d8f" : "#e76f51", fontWeight: 600
              }}>
                {guideResult.ok ? "✓" : "⚠"} {guideResult.msg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={!guideFile || guideUploading}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10,
                  background: guideFile ? "linear-gradient(135deg, #9b5de5, #7b3dbf)" : "var(--muted)",
                  border: guideFile ? "none" : "1px solid var(--glass-border)",
                  color: guideFile ? "#fff" : "var(--subtext)",
                  fontSize: 13, fontWeight: 700, cursor: guideFile ? "pointer" : "not-allowed",
                  boxShadow: guideFile ? "0 4px 12px rgba(155,93,229,0.3)" : "none", transition: "all 0.2s"
                }}
              >
                <Upload size={14} /> {guideUploading ? "Uploading..." : `Upload ${guideCategory.charAt(0).toUpperCase() + guideCategory.slice(1)} Guide`}
              </button>
            </div>
          </form>
        </Glass>
      )}
    </div>
  );
}
