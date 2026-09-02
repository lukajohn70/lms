import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, BookOpen, CheckCircle, Lock, Unlock, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from "recharts";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"analytics" | "approvals">("analytics");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({
    total_students: 0,
    teaching_staff: 0,
    academic_average: 0,
    exams_conducted: 0,
    fees_collected_rate: 0,
    fees_collected_amount: 0
  });
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<any[]>([]);
  const [deptAvg, setDeptAvg] = useState<any[]>([]);

  // Approvals State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("2nd Term");
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>("");

  useEffect(() => {
    apiClient.get("/admin/reports")
      .then((res: any) => {
        if (res && res.success) {
          setOverview(res.overview);
          setEnrollmentTrend(res.enrollment_trend || []);
          setFeeBreakdown(res.fee_breakdown || []);
          setDeptAvg(res.department_averages || []);
        }
      })
      .catch(err => console.error("Error loading reports statistics", err))
      .finally(() => setLoading(false));
  }, []);

  const loadSubmissions = () => {
    setApprovalsLoading(true);
    apiClient.get(`/admin/grades/submissions?term=${encodeURIComponent(selectedTerm)}`)
      .then((res: any) => {
        if (res && res.success) {
          setSubmissions(res.submissions || []);
        }
      })
      .catch(err => console.error("Error loading submissions", err))
      .finally(() => setApprovalsLoading(false));
  };

  useEffect(() => {
    if (activeTab === "approvals") {
      loadSubmissions();
    }
  }, [activeTab, selectedTerm]);

  const handleUpdateStatus = (courseId: number, newStatus: "draft" | "approved" | "published") => {
    apiClient.post("/admin/grades/update-status", {
      course_id: courseId,
      term: selectedTerm,
      status: newStatus
    })
      .then((res: any) => {
        setActionSuccess(res.message || "Status updated successfully.");
        setTimeout(() => setActionSuccess(""), 3000);
        loadSubmissions();
      })
      .catch((err: any) => alert(err.message || "Failed to update status"));
  };

  const handlePublishAll = () => {
    if (!confirm(`Are you sure you want to approve and publish all submitted marks for ${selectedTerm}?`)) return;
    
    const submittedCourses = submissions.filter(s => s.status === 'submitted' || s.status === 'draft');
    if (submittedCourses.length === 0) {
      alert("No pending marks to publish.");
      return;
    }

    Promise.all(submittedCourses.map(s => 
      apiClient.post("/admin/grades/update-status", {
        course_id: s.course_id,
        term: selectedTerm,
        status: "published"
      })
    ))
      .then(() => {
        setActionSuccess(`All ${submittedCourses.length} course mark sheets have been published and locked.`);
        setTimeout(() => setActionSuccess(""), 3000);
        loadSubmissions();
      })
      .catch(err => console.error("Error publishing all", err));
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Compiling system analytics...</div>;
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return "₦" + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Analytics &amp; Result Governance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>System-wide performance, financial overview &amp; terminal grade approvals</p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: `1.5px solid ${activeTab === "analytics" ? "#219EBC" : "var(--glass-border)"}`,
              background: activeTab === "analytics" ? "rgba(33,158,188,0.15)" : "var(--muted)",
              color: activeTab === "analytics" ? "#219EBC" : "var(--subtext)",
              fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            <BarChart2 size={14} /> Analytics Overview
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: `1.5px solid ${activeTab === "approvals" ? "#FB8500" : "var(--glass-border)"}`,
              background: activeTab === "approvals" ? "rgba(251,133,0,0.15)" : "var(--muted)",
              color: activeTab === "approvals" ? "#FB8500" : "var(--subtext)",
              fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            <ShieldCheck size={14} /> Result Approvals &amp; Locking
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ marginBottom: 16, background: "rgba(42,157,143,0.12)", border: "1px solid rgba(42,157,143,0.3)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#2a9d8f", fontWeight: 600 }}>
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {activeTab === "analytics" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
            {[
              { l: "Total Students", v: String(overview.total_students), delta: "+7 this term", c: "#219EBC", icon: <Users size={15}/> },
              { l: "Academic Avg", v: `${overview.academic_average}%`, delta: "+1.8%", c: "#8ECAE6", icon: <TrendingUp size={15}/> },
              { l: "CBTs Conducted", v: String(overview.exams_conducted), delta: "Dynamic", c: "#FFB703", icon: <BookOpen size={15}/> },
              { l: "Fee Collection", v: `${overview.fees_collected_rate}%`, delta: formatCurrency(overview.fees_collected_amount), c: "#FB8500", icon: <BarChart2 size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c }}>{s.icon}</div>
                  <span style={{ fontSize: 10, color: "var(--subtext)", background: "var(--muted)", padding: "2px 7px", borderRadius: 5 }}>{s.delta}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, marginBottom: 16 }}>
            {/* Enrollment trend */}
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Student Enrollment Trend</div>
              <div style={{ padding: "8px 12px 12px" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={enrollmentTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FB8500" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FB8500" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                    <Area type="monotone" dataKey="v" stroke="#FB8500" strokeWidth={2} fill="url(#eg)" dot={{ fill:"#FB8500", r:3, strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Glass>

            {/* Fee breakdown pie */}
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Fee Collection Status</div>
              <div style={{ padding: "8px 12px 12px", display: "flex", justifyContent: "center" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={feeBreakdown} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                      {feeBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Glass>
          </div>

          {/* Dept performance */}
          <Glass>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Academic Performance by Department</div>
            <div style={{ padding: "8px 12px 12px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptAvg} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:11, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} formatter={(v) => [`${v}%`, "Avg Score"]} />
                  <Bar dataKey="v" radius={[5,5,0,0]}>
                    {deptAvg.map((_, i) => <Cell key={i} fill={["#219EBC","#8ECAE6","#FFB703","#FB8500","#219EBC","#8ECAE6"][i % 6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </>
      ) : (
        /* Result Approvals & Lock Governance View */
        <div>
          <Glass style={{ padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Academic Result Submission Status</div>
                <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>Review subject scores submitted by teachers and lock official transcripts for publication</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
                  {["1st Term", "2nd Term", "3rd Term"].map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: selectedTerm === t ? "#FB8500" : "transparent",
                        color: selectedTerm === t ? "#fff" : "var(--subtext)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handlePublishAll}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
                    background: "linear-gradient(135deg, #2a9d8f, #219EBC)", color: "#fff",
                    border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(42,157,143,0.3)"
                  }}
                >
                  <Lock size={13} /> Batch Publish &amp; Lock All
                </button>
              </div>
            </div>
          </Glass>

          {approvalsLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading course submissions...</div>
          ) : submissions.length === 0 ? (
            <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
              No subject submissions found for {selectedTerm}.
            </Glass>
          ) : (
            <Glass>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 100px 100px 140px 220px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                <span>Subject</span>
                <span>Assigned Teacher</span>
                <span style={{ textAlign: "center" }}>Graded / Total</span>
                <span style={{ textAlign: "center" }}>Class Avg</span>
                <span style={{ textAlign: "center" }}>Approval State</span>
                <span style={{ textAlign: "right" }}>Governance Action</span>
              </div>

              {submissions.map(sub => {
                const isPublished = sub.status === "published";
                const isSubmitted = sub.status === "submitted";

                return (
                  <div key={sub.course_id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 100px 100px 140px 220px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{sub.course_name}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>ID: CRS-{strPad(sub.course_id)}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12.5, color: "var(--heading)" }}>{sub.teacher_name || "Unassigned"}</div>
                      <div style={{ fontSize: 10, color: "var(--subtext)" }}>{sub.teacher_email || "—"}</div>
                    </div>

                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--heading)" }}>
                      {sub.graded_count} / {sub.enrolled_count}
                    </div>

                    <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#219EBC" }}>
                      {sub.class_average ? `${sub.class_average}%` : "—"}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      {isPublished && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "rgba(42,157,143,0.12)", color: "#2a9d8f", border: "1px solid rgba(42,157,143,0.3)", fontSize: 11, fontWeight: 700 }}>
                          <Lock size={11}/> Published
                        </span>
                      )}
                      {isSubmitted && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "rgba(255,183,3,0.15)", color: "#FFB703", border: "1px solid rgba(255,183,3,0.3)", fontSize: 11, fontWeight: 700 }}>
                          <Clock size={11}/> Pending Review
                        </span>
                      )}
                      {sub.status === "draft" && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "rgba(33,158,188,0.1)", color: "var(--subtext)", border: "1px solid var(--glass-border)", fontSize: 11, fontWeight: 600 }}>
                          Draft
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {isPublished ? (
                        <button
                          onClick={() => handleUpdateStatus(sub.course_id, "draft")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.3)", color: "#e76f51", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          <Unlock size={12} /> Unlock for Teacher
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(sub.course_id, "published")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "linear-gradient(135deg,#219EBC,#023047)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(33,158,188,0.3)" }}
                        >
                          <CheckCircle size={12} /> Approve &amp; Publish
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Glass>
          )}
        </div>
      )}
    </div>
  );
}

function strPad(n: number) {
  return String(n).padStart(3, '0');
}
