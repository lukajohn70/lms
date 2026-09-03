import { useState, useEffect, useRef } from "react";
import { Search, UserCheck, UserX, Trash2, CheckCircle, Link, X, Upload, Download, Users, BookOpen } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

// ─── CSV Templates per role ──────────────────────────────────────────
const STUDENT_HEADERS = ["first_name", "last_name", "role", "phone", "gender", "date_of_birth", "class_level"];
const PARENT_HEADERS  = ["first_name", "last_name", "role", "phone", "gender", "date_of_birth", "relationship"];
const TEACHER_HEADERS = ["first_name", "last_name", "role", "phone", "gender", "date_of_birth", "subject"];

// NOTE: 'email' column is intentionally omitted — backend auto-generates it as:
// firstname.lastname[id]@aroura.edu  (duplicates get a numeric suffix)
const ROLE_TEMPLATES: Record<string, { headers: string[]; rows: string[][] }> = {
  student: {
    headers: STUDENT_HEADERS,
    rows: [
      ["Amara",       "Okafor",    "student", "+234 801 234 5678", "Female", "2010-03-15", "JSS2"],
      ["Chukwuemeka", "Adeyemi",   "student", "+234 802 345 6789", "Male",   "2011-07-22", "PRI 4"],
      ["Babatunde",   "Ibrahim",   "student", "+234 805 678 9012", "Male",   "2009-12-30", "SS1"],
      ["Adaeze",      "Nwosu",     "student", "+234 806 789 0123", "Female", "2012-01-08", "NUR 2"],
      ["Emeka",       "Obiora",    "student", "+234 807 890 1234", "Male",   "2010-09-17", "PRI 6"],
    ],
  },
  parent: {
    headers: PARENT_HEADERS,
    rows: [
      ["Fatima",    "Bello",    "parent", "+234 803 456 7890", "Female", "1982-11-01", "Mother"],
      ["Ngozi",     "Eze",      "parent", "+234 804 567 8901", "Female", "1978-05-18", "Mother"],
      ["Adekunle",  "Adeyemi",  "parent", "+234 808 901 2345", "Male",   "1975-03-22", "Father"],
      ["Chioma",    "Okafor",   "parent", "+234 809 012 3456", "Female", "1980-07-14", "Mother"],
      ["Ibrahim",   "Musa",     "parent", "+234 810 123 4567", "Male",   "1972-12-05", "Father"],
    ],
  },
  teacher: {
    headers: TEACHER_HEADERS,
    rows: [
      ["Oluwaseun",  "Adesanya",  "teacher", "+234 811 234 5678", "Male",   "1985-06-10", "Mathematics"],
      ["Chidinma",   "Okonkwo",   "teacher", "+234 812 345 6789", "Female", "1990-09-25", "English Language"],
      ["Musa",       "Garba",     "teacher", "+234 813 456 7890", "Male",   "1988-02-14", "Physics"],
      ["Blessing",   "Effiong",   "teacher", "+234 814 567 8901", "Female", "1992-11-30", "Biology"],
      ["Taiwo",      "Adeleke",   "teacher", "+234 815 678 9012", "Male",   "1987-04-08", "Economics"],
    ],
  },
};

function downloadCsvTemplate(role: "student" | "parent" | "teacher" = "student") {
  const template = ROLE_TEMPLATES[role];
  const rows = [template.headers, ...template.rows];
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  // Add a comment header
  const note = `# Aroura Academy LMS - ${role.charAt(0).toUpperCase() + role.slice(1)} Import Template\n` +
    `# Email is AUTO-GENERATED from firstname.lastname — do NOT add an email column.\n` +
    `# Password is AUTO-GENERATED as firstname + 4 digits. Share it with the user to change on first login.\n`;
  const blob = new Blob([note + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `aroura_${role}_import_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


export default function UsersPage() {
  const { theme } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [savedMessage, setSavedMessage] = useState("");

  // Assign Class state
  const [classes, setClasses] = useState<any[]>([]);
  const [assigningClassUser, setAssigningClassUser] = useState<any | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignClassLoading, setAssignClassLoading] = useState(false);

  // Assign Parent-Child state
  const [linkingUser, setLinkingUser] = useState<any | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.get("/users");
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load users from server.");
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await apiClient.get("/classes");
      setClasses(data.classes || []);
    } catch (e) {
      console.error("Failed to load classes", e);
    }
  };

  useEffect(() => {
    loadUsers();
    loadClasses();
  }, []);

  const handleAssignClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningClassUser) return;
    setAssignClassLoading(true);
    try {
      await apiClient.post("/admin/users/assign-class", {
        student_id: assigningClassUser.id,
        class_id: selectedClassId ? parseInt(selectedClassId) : null
      });
      setSavedMessage("Student class assigned successfully!");
      setAssigningClassUser(null);
      setSelectedClassId("");
      loadUsers();
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err: any) {
      alert(err.message || "Failed to assign class.");
    } finally {
      setAssignClassLoading(false);
    }
  };

  const toggleStatus = async (id: number) => {
    setUsers(p => p.map(u => u.id === id ? { ...u, status: u.status === "inactive" ? "active" : "inactive" } : u));
    setSavedMessage("User status updated!");
    setTimeout(() => setSavedMessage(""), 2000);
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setUsers(p => p.filter(u => u.id !== id));
    setSavedMessage("User deleted!");
    setTimeout(() => setSavedMessage(""), 2000);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingUser || !selectedTargetId) return;
    setLinkLoading(true);
    const parentId = linkingUser.role === "parent" ? linkingUser.id : selectedTargetId;
    const studentId = linkingUser.role === "student" ? linkingUser.id : selectedTargetId;
    try {
      await apiClient.post("/admin/assign-parent", {
        parent_id: parseInt(parentId),
        student_id: parseInt(studentId)
      });
      setSavedMessage("Accounts linked successfully!");
      setLinkingUser(null);
      setSelectedTargetId("");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err: any) {
      alert(err.message || "Failed to link accounts. They might already be linked.");
    } finally {
      setLinkLoading(false);
    }
  };

  // ─── CSV Import handler ─────────────────────────────────────────
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("csv_file", importFile);

    try {
      const result: any = await apiClient.postForm("/admin/users/bulk-import", formData);
      setImportResult({ created: result.created || 0, errors: result.errors || [] });
      if ((result.created || 0) > 0) {
        loadUsers(); // Refresh users list
      }
    } catch (err: any) {
      setImportResult({ created: 0, errors: [err.message || "Import failed. Please check your file format."] });
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = users.filter(u =>
    (roleFilter === "All" || u.role.toLowerCase() === roleFilter.toLowerCase()) &&
    (search === "" ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const roleColor = (r: string) => {
    const role = r.toLowerCase();
    if (role === "teacher") return "#8ECAE6";
    if (role === "student") return "#219EBC";
    if (role === "parent") return "#FFB703";
    return "#FB8500";
  };

  const getLinkTargets = () => {
    if (!linkingUser) return [];
    if (linkingUser.role === "parent") return users.filter(u => u.role.toLowerCase() === "student");
    if (linkingUser.role === "student") return users.filter(u => u.role.toLowerCase() === "parent");
    return [];
  };

  const roleCounts = {
    students: users.filter(u => u.role === "student").length,
    parents: users.filter(u => u.role === "parent").length,
    teachers: users.filter(u => u.role === "teacher").length,
    admins: users.filter(u => u.role === "admin").length,
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Admin</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>User Management</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{users.length} total users registered in system</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Dropdown for templates */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                const el = document.getElementById("template-dropdown");
                if (el) el.style.display = el.style.display === "none" ? "block" : "none";
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10,
                background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)",
                cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#219EBC"
              }}
              title="Download CSV Template with sample data"
            >
              <Download size={14} /> CSV Templates
            </button>
            <div id="template-dropdown" style={{
              display: "none", position: "absolute", top: "100%", right: 0, marginTop: 8,
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              borderRadius: 10, padding: 6, width: 160, zIndex: 100,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)", backdropFilter: "blur(20px)"
            }}>
              {(["student", "parent", "teacher"] as const).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    downloadCsvTemplate(role);
                    const el = document.getElementById("template-dropdown");
                    if (el) el.style.display = "none";
                  }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                    background: "none", border: "none", borderRadius: 6, cursor: "pointer",
                    fontSize: 12, color: "var(--heading)", textTransform: "capitalize"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(33,158,188,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  {role} Template
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10,
              background: "linear-gradient(135deg, #FB8500, #E76F51)", border: "none",
              cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff",
              boxShadow: "0 4px 12px rgba(251,133,0,0.25)"
            }}
          >
            <Upload size={14} /> Import CSV/XLSX
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="responsive-grid-4">
        {[
          { label: "Students", count: roleCounts.students, color: "#219EBC" },
          { label: "Parents", count: roleCounts.parents, color: "#FFB703" },
          { label: "Teachers", count: roleCounts.teachers, color: "#8ECAE6" },
          { label: "Admins", count: roleCounts.admins, color: "#FB8500" },
        ].map(s => (
          <Glass key={s.label} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={16} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: "var(--subtext)" }}>{s.label}</div>
            </div>
          </Glass>
        ))}
      </div>

      {savedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(42,157,143,0.1)", border: "1px solid rgba(42,157,143,0.25)", marginBottom: 16 }}>
          <CheckCircle size={14} style={{ color: "#2a9d8f" }} /><span style={{ fontSize: 12.5, color: "#2a9d8f", fontWeight: 600 }}>{savedMessage}</span>
        </div>
      )}

      <Glass>
        {/* Search & Filters */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 200, padding: "7px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
            <Search size={14} style={{ color: "var(--subtext)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email…"
              style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--heading)", outline: "none", flex: 1, minWidth: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", "Student", "Teacher", "Parent"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${roleFilter === r ? roleColor(r) : "var(--glass-border)"}`,
                background: roleFilter === r ? `${roleColor(r)}15` : "var(--muted)", cursor: "pointer", fontSize: 11.5,
                color: roleFilter === r ? roleColor(r) : "var(--subtext)", fontWeight: roleFilter === r ? 700 : 400
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-only table-responsive-wrapper">
          <div style={{ minWidth: 760 }}>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 180px 180px 90px 130px", padding: "10px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Name</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Role</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Email</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Details / Adm No</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", textAlign: "center" }}>Status</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", textAlign: "right" }}>Actions</span>
            </div>

            {/* Table Body */}
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading users...</div>
            ) : error ? (
              <div style={{ padding: 40, textAlign: "center", color: "#fb8500" }}>⚠ {error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No users found matching search criteria.</div>
            ) : (
              filtered.map(u => {
                const userName = `${u.first_name} ${u.last_name}`;
                const userInitials = (u.first_name?.[0] || "") + (u.last_name?.[0] || "");
                const userJoined = new Date(u.created_at).toLocaleDateString();
                const isActive = u.status !== "inactive";
                return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 180px 180px 90px 130px", padding: "11px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${roleColor(u.role)}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: roleColor(u.role), flexShrink: 0 }}>
                        {userInitials}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{userName}</div>
                        <div style={{ fontSize: 10, color: "var(--subtext)" }}>Registered: {userJoined}</div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}12`, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>{u.role}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                    <span style={{ fontSize: 11.5, color: "var(--subtext)" }}>
                      {u.role.toLowerCase() === "student" ? (
                        <div>
                          {u.admission_number ? <div>Adm No: {u.admission_number}</div> : <div>No Admission No</div>}
                          {(() => {
                            const sClass = classes.find(c => c.id === u.class_id);
                            return (
                              <div style={{ fontSize: 10, color: u.class_id ? "#219EBC" : "#e76f51", fontWeight: 700, marginTop: 2 }}>
                                {sClass ? `${sClass.name} ${sClass.department ? `(${sClass.department})` : ''}` : "Unassigned Class"}
                              </div>
                            );
                          })()}
                        </div>
                      ) : "—"}
                    </span>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button onClick={() => toggleStatus(u.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", background: isActive ? "rgba(42,157,143,0.12)" : "rgba(231,111,81,0.1)", cursor: "pointer" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: isActive ? "#2a9d8f" : "#e76f51" }}>{isActive ? "active" : "inactive"}</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      {(u.role.toLowerCase() === "parent" || u.role.toLowerCase() === "student") && (
                        <button onClick={() => { setLinkingUser(u); setSelectedTargetId(""); }}
                          style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.2)", cursor: "pointer" }}
                          title={u.role.toLowerCase() === "parent" ? "Link Student" : "Link Parent"}>
                          <Link size={12} style={{ color: "#219EBC" }} />
                        </button>
                      )}
                      {u.role.toLowerCase() === "student" && (
                        <button onClick={() => { setAssigningClassUser(u); setSelectedClassId(String(u.class_id || "")); }}
                          style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(251,133,0,0.08)", border: "1px solid rgba(251,133,0,0.2)", cursor: "pointer" }}
                          title="Assign Class">
                          <BookOpen size={12} style={{ color: "#FB8500" }} />
                        </button>
                      )}
                      <button onClick={() => deleteUser(u.id)} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(231,111,81,0.08)", border: "1px solid rgba(231,111,81,0.2)", cursor: "pointer" }}>
                        <Trash2 size={12} style={{ color: "#e76f51" }} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile Only Card View (Zero Sideways Scroll) */}
        <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--subtext)" }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--subtext)" }}>No users found.</div>
          ) : (
            filtered.map(u => {
              const userName = `${u.first_name} ${u.last_name}`;
              const userInitials = (u.first_name?.[0] || "") + (u.last_name?.[0] || "");
              const isActive = u.status !== "inactive";
              const sClass = classes.find(c => c.id === u.class_id);
              return (
                <div key={u.id} style={{ padding: 14, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${roleColor(u.role)}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: roleColor(u.role) }}>
                        {userInitials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>{userName}</div>
                        <div style={{ fontSize: 11, color: "var(--subtext)" }}>{u.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: roleColor(u.role), background: `${roleColor(u.role)}15`, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>{u.role}</span>
                  </div>

                  {u.role.toLowerCase() === "student" && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, background: "var(--glass-bg)", padding: "6px 10px", borderRadius: 6 }}>
                      <span>{u.admission_number ? <strong>Adm: {u.admission_number}</strong> : <span style={{ color: "var(--subtext)" }}>No Adm No</span>}</span>
                      <span style={{ color: u.class_id ? "#219EBC" : "#e76f51", fontWeight: 600 }}>{sClass ? sClass.name : "No Class"}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--glass-border)" }}>
                    <button onClick={() => toggleStatus(u.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: isActive ? "rgba(42,157,143,0.12)" : "rgba(231,111,81,0.1)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: isActive ? "#2a9d8f" : "#e76f51" }}>
                      {isActive ? "✔ Active" : "✖ Inactive"}
                    </button>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(u.role.toLowerCase() === "parent" || u.role.toLowerCase() === "student") && (
                        <button onClick={() => { setLinkingUser(u); setSelectedTargetId(""); }} style={{ padding: "5px 9px", borderRadius: 6, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.3)", color: "#219EBC", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          <Link size={11} /> Link
                        </button>
                      )}
                      {u.role.toLowerCase() === "student" && (
                        <button onClick={() => { setAssigningClassUser(u); setSelectedClassId(String(u.class_id || "")); }} style={{ padding: "5px 9px", borderRadius: 6, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.3)", color: "#FB8500", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          <BookOpen size={11} /> Class
                        </button>
                      )}
                      <button onClick={() => deleteUser(u.id)} style={{ padding: "5px 8px", borderRadius: 6, background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.3)", color: "#e76f51", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Glass>

      {/* ─── LINK PARENT & CHILD MODAL ──────────────────────────────── */}
      {linkingUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(1, 18, 29, 0.55)", backdropFilter: "blur(6px)" }}>
          <div style={{ background: theme === "dark" ? "#021625" : "white", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: "420px", position: "relative" }}>
            <button onClick={() => setLinkingUser(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>Link Parent and Child Profiles</h3>
            <p style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5, margin: "0 0 20px" }}>
              Assign a student profile to a parent profile so they can monitor performance and fees from their portal.
            </p>
            <form onSubmit={handleLinkSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>Selected User</label>
                <div style={{ fontSize: 13.5, fontWeight: 600, padding: "10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                  {linkingUser.first_name} {linkingUser.last_name} ({linkingUser.role.toUpperCase()})
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>
                  {linkingUser.role === "parent" ? "Select Student to Link" : "Select Parent to Link"}
                </label>
                <select required value={selectedTargetId} onChange={e => setSelectedTargetId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, color: "inherit", outline: "none" }}>
                  <option value="">-- Choose Profile --</option>
                  {getLinkTargets().map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.email})</option>)}
                </select>
              </div>
              <button type="submit" disabled={linkLoading || !selectedTargetId}
                style={{ width: "100%", padding: "11px", background: "#219EBC", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
                {linkLoading ? "Linking Accounts..." : "Link Profiles"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── ASSIGN STUDENT CLASS MODAL ────────────────────────────── */}
      {assigningClassUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(1, 18, 29, 0.55)", backdropFilter: "blur(6px)" }}>
          <div style={{ background: theme === "dark" ? "#021625" : "white", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: "420px", position: "relative" }}>
            <button onClick={() => setAssigningClassUser(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>Assign Student to Class</h3>
            <p style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5, margin: "0 0 20px" }}>
              Assign this student to a grade level class to determine their coursework and available electives.
            </p>
            <form onSubmit={handleAssignClassSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>Student</label>
                <div style={{ fontSize: 13.5, fontWeight: 600, padding: "10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                  {assigningClassUser.first_name} {assigningClassUser.last_name} ({assigningClassUser.email})
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 4 }}>Select Class / Stream</label>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, color: "inherit", outline: "none" }}>
                  <option value="">No Class (Unassigned)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.department ? `(${c.department})` : ''}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={assignClassLoading}
                style={{ width: "100%", padding: "11px", background: "#FB8500", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
                {assignClassLoading ? "Assigning Class..." : "Save Class Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── CSV BULK IMPORT MODAL ──────────────────────────────────── */}
      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(1,18,29,0.6)", backdropFilter: "blur(6px)" }}>
          <Glass style={{ width: "100%", maxWidth: 500, padding: 28, position: "relative" }}>
            <button onClick={closeImportModal} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--subtext)" }}>
              <X size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,133,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={18} style={{ color: "#FB8500" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Bulk Import Users</h3>
                <p style={{ fontSize: 12, color: "var(--subtext)", margin: 0 }}>Upload a CSV or XLSX file to create multiple users at once</p>
              </div>
            </div>

            {/* Template download hint */}
            <div style={{ padding: "12px 14px", borderRadius: 9, background: "rgba(33,158,188,0.07)", border: "1px solid rgba(33,158,188,0.2)", marginBottom: 16, fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.55 }}>
              📥 <strong>Template structure matters!</strong> We have specific templates for each role because fields differ (e.g., parents have 'relationship', teachers have 'subject'). 
              <br/><br/>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {(["student", "parent", "teacher"] as const).map(role => (
                  <button key={role} onClick={() => downloadCsvTemplate(role)} style={{ background: "rgba(33,158,188,0.15)", border: "1px solid rgba(33,158,188,0.3)", borderRadius: 6, color: "#219EBC", fontWeight: 700, cursor: "pointer", fontSize: 11, padding: "4px 10px", textTransform: "capitalize" }}>
                    {role} CSV
                  </button>
                ))}
              </div>
            </div>

            {/* Required columns */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 6 }}>Common Required Columns</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["first_name", "last_name", "role", "phone", "gender", "date_of_birth"].map(h => (
                  <span key={h} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 5, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontFamily: "monospace" }}>{h}</span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--subtext)" }}>
                Role must be one of: <strong>student</strong>, <strong>teacher</strong>, <strong>parent</strong>. 
                <br/><br/>
                <span style={{ color: "#2a9d8f", fontWeight: 600 }}>Emails & Passwords are AUTO-GENERATED.</span> Do not include them in the CSV. The backend creates emails as <em>firstname.lastname@aroura.edu</em> and passwords as <em>firstname + 4 digits</em>.
              </div>
            </div>

            <form onSubmit={handleImportSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* File drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${importFile ? "rgba(42,157,143,0.5)" : "var(--glass-border)"}`,
                  borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer",
                  background: importFile ? "rgba(42,157,143,0.05)" : "var(--muted)", transition: "all 0.2s"
                }}
              >
                <Upload size={24} style={{ color: importFile ? "#2a9d8f" : "var(--subtext)", marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: importFile ? "#2a9d8f" : "var(--heading)" }}>
                  {importFile ? importFile.name : "Click to select file or drag and drop"}
                </div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>CSV or XLSX files supported. Max 5MB.</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Import results */}
              {importResult && (
                <div style={{
                  borderRadius: 10, padding: "12px 14px",
                  background: importResult.created > 0 ? "rgba(42,157,143,0.08)" : "rgba(231,111,81,0.08)",
                  border: `1px solid ${importResult.created > 0 ? "rgba(42,157,143,0.25)" : "rgba(231,111,81,0.25)"}`,
                }}>
                  {importResult.created > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: importResult.errors.length > 0 ? 8 : 0 }}>
                      <CheckCircle size={14} style={{ color: "#2a9d8f" }} />
                      <span style={{ fontSize: 12.5, color: "#2a9d8f", fontWeight: 600 }}>{importResult.created} user(s) imported successfully!</span>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e76f51", marginBottom: 4 }}>⚠ Errors ({importResult.errors.length}):</div>
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: "#e76f51", lineHeight: 1.4 }}>• {e}</div>
                      ))}
                      {importResult.errors.length > 5 && <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>...and {importResult.errors.length - 5} more</div>}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={closeImportModal} style={{ flex: 1, padding: "10px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--subtext)" }}>
                  {importResult?.created ? "Close" : "Cancel"}
                </button>
                {!importResult?.created && (
                  <button type="submit" disabled={!importFile || importLoading} style={{
                    flex: 2, padding: "10px", borderRadius: 9, background: importFile ? "linear-gradient(135deg, #FB8500, #E76F51)" : "var(--muted)",
                    border: "none", cursor: importFile ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700,
                    color: importFile ? "#fff" : "var(--subtext)", transition: "all 0.2s",
                    boxShadow: importFile ? "0 4px 12px rgba(251,133,0,0.25)" : "none"
                  }}>
                    {importLoading ? "Importing..." : "Import Users"}
                  </button>
                )}
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}
