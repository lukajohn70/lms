import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, BookOpen, CheckCircle, Lock, Unlock, Clock, Eye, X, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from "recharts";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

function getGradeLabel(score: number | null) {
  if (score === null || score === undefined) return "—";
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"analytics" | "approvals">("analytics");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({
    total_students: 0, teaching_staff: 0, academic_average: 0,
    exams_conducted: 0, fees_collected_rate: 0, fees_collected_amount: 0
  });
  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<any[]>([]);
  const [deptAvg, setDeptAvg] = useState<any[]>([]);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("2nd Term");
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>("");

  // Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
      .then((res: any) => { if (res && res.success) setSubmissions(res.submissions || []); })
      .catch(err => console.error("Error loading submissions", err))
      .finally(() => setApprovalsLoading(false));
  };

  useEffect(() => { if (activeTab === "approvals") loadSubmissions(); }, [activeTab, selectedTerm]);

  const handleUpdateStatus = (courseId: number, newStatus: "draft" | "approved" | "published") => {
    apiClient.post("/admin/grades/update-status", { course_id: courseId, term: selectedTerm, status: newStatus })
      .then((res: any) => { setActionSuccess(res.message || "Status updated."); setTimeout(() => setActionSuccess(""), 3000); loadSubmissions(); })
      .catch((err: any) => alert(err.message || "Failed to update status"));
  };

  const handlePublishAll = () => {
    if (!confirm(`Publish all submitted marks for ${selectedTerm}?`)) return;
    const pending = submissions.filter(s => s.status === 'submitted' || s.status === 'draft');
    if (!pending.length) { alert("No pending marks."); return; }
    Promise.all(pending.map(s => apiClient.post("/admin/grades/update-status", { course_id: s.course_id, term: selectedTerm, status: "published" })))
      .then(() => { setActionSuccess(`${pending.length} course mark sheets published & locked.`); setTimeout(() => setActionSuccess(""), 3000); loadSubmissions(); })
      .catch(err => console.error("Error publishing all", err));
  };

  const handlePreview = (sub: any) => {
    setPreviewOpen(true);
    setPreviewData(null);
    setPreviewLoading(true);
    apiClient.get(`/admin/grades/preview?course_id=${sub.course_id}&term=${encodeURIComponent(selectedTerm)}`)
      .then((res: any) => { if (res && res.success) setPreviewData(res); })
      .catch(err => console.error("Preview error", err))
      .finally(() => setPreviewLoading(false));
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Compiling system analytics...</div>;

  const formatCurrency = (val: number) => "₦" + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Analytics &amp; Result Governance</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>System-wide performance, financial overview &amp; terminal grade approvals</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "analytics" as const, label: "Analytics Overview", color: "#219EBC", icon: <BarChart2 size={14} /> },
            { id: "approvals" as const, label: "Result Approvals & Locking", color: "#FB8500", icon: <ShieldCheck size={14} /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              border: `1.5px solid ${activeTab === tab.id ? tab.color : "var(--glass-border)"}`,
              background: activeTab === tab.id ? `${tab.color}22` : "var(--muted)",
              color: activeTab === tab.id ? tab.color : "var(--subtext)",
              fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all 0.2s"
            }}>{tab.icon} {tab.label}</button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div style={{ marginBottom: 16, background: "rgba(42,157,143,0.12)", border: "1px solid rgba(42,157,143,0.3)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#2a9d8f", fontWeight: 600 }}>
          <CheckCircle size={16} /> <span>{actionSuccess}</span>
        </div>
      )}

      {activeTab === "analytics" ? (
        <>
          <div className="responsive-grid-4">
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

          <div className="responsive-grid-2" style={{ marginBottom: 16 }}>
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
                    <YAxis domain={['auto','auto']} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                    <Area type="monotone" dataKey="v" stroke="#FB8500" strokeWidth={2} fill="url(#eg)" dot={{ fill:"#FB8500", r:3, strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Glass>
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

          <Glass>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Academic Performance by Department</div>
            <div style={{ padding: "8px 12px 12px" }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptAvg} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:11, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} formatter={(v) => [`${v}%`, "Avg Score"]} />
                  <Bar dataKey="v" radius={[5,5,0,0]}>
                    {deptAvg.map((_, i) => <Cell key={i} fill={["#219EBC","#8ECAE6","#FFB703","#FB8500","#219EBC","#8ECAE6"][i%6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </>
      ) : (
        <div>
          <Glass style={{ padding: "16px 20px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Academic Result Submission Status</div>
                <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>Review subject scores submitted by teachers and lock official transcripts for publication</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3, border: "1px solid var(--glass-border)" }}>
                  {["1st Term", "2nd Term", "3rd Term"].map(t => (
                    <button key={t} onClick={() => setSelectedTerm(t)} style={{
                      padding: "5px 12px", borderRadius: 6, border: "none",
                      background: selectedTerm === t ? "#FB8500" : "transparent",
                      color: selectedTerm === t ? "#fff" : "var(--subtext)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}>{t}</button>
                  ))}
                </div>
                <button onClick={handlePublishAll} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
                  background: "linear-gradient(135deg,#2a9d8f,#219EBC)", color: "#fff",
                  border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(42,157,143,0.3)"
                }}><Lock size={13} /> Batch Publish &amp; Lock All</button>
              </div>
            </div>
          </Glass>

          {approvalsLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading course submissions...</div>
          ) : submissions.length === 0 ? (
            <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No subject submissions found for {selectedTerm}.</Glass>
          ) : (
            <Glass>
              {/* DESKTOP TABLE VIEW */}
              <div className="desktop-only table-responsive-wrapper">
                <div style={{ minWidth: 820 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 100px 100px 140px 260px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                    <span>Subject</span><span>Assigned Teacher</span>
                    <span style={{ textAlign:"center" }}>Graded/Total</span>
                    <span style={{ textAlign:"center" }}>Class Avg</span>
                    <span style={{ textAlign:"center" }}>Approval State</span>
                    <span style={{ textAlign:"right" }}>Governance Action</span>
                  </div>
                  {submissions.map(sub => {
                    const isPublished = sub.status === "published";
                    const isSubmitted = sub.status === "submitted";
                    return (
                      <div key={sub.course_id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 100px 100px 140px 260px", padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{sub.course_name}</div>
                          <div style={{ fontSize: 10, color: "var(--subtext)" }}>ID: CRS-{strPad(sub.course_id)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, color: "var(--heading)" }}>{sub.teacher_name || "Unassigned"}</div>
                          <div style={{ fontSize: 10, color: "var(--subtext)" }}>{sub.teacher_email || "—"}</div>
                        </div>
                        <div style={{ textAlign:"center", fontSize:12, fontWeight:600, color:"var(--heading)" }}>{sub.graded_count} / {sub.enrolled_count}</div>
                        <div style={{ textAlign:"center", fontSize:13, fontWeight:700, color:"#219EBC" }}>{sub.class_average ? `${sub.class_average}%` : "—"}</div>
                        <div style={{ textAlign:"center" }}>
                          {isPublished && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:"rgba(42,157,143,0.12)",color:"#2a9d8f",border:"1px solid rgba(42,157,143,0.3)",fontSize:11,fontWeight:700 }}><Lock size={11}/> Published</span>}
                          {isSubmitted && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:"rgba(255,183,3,0.15)",color:"#FFB703",border:"1px solid rgba(255,183,3,0.3)",fontSize:11,fontWeight:700 }}><Clock size={11}/> Pending Review</span>}
                          {sub.status==="draft" && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,background:"rgba(33,158,188,0.1)",color:"var(--subtext)",border:"1px solid var(--glass-border)",fontSize:11,fontWeight:600 }}>Draft</span>}
                        </div>
                        <div style={{ display:"flex",gap:6,justifyContent:"flex-end" }}>
                          <button onClick={() => handlePreview(sub)} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:"rgba(33,158,188,0.1)",border:"1px solid rgba(33,158,188,0.3)",color:"#219EBC",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                            <Eye size={12} /> Preview
                          </button>
                          {isPublished ? (
                            <button onClick={() => handleUpdateStatus(sub.course_id,"draft")} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:"rgba(231,111,81,0.1)",border:"1px solid rgba(231,111,81,0.3)",color:"#e76f51",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                              <Unlock size={12} /> Unlock for Teacher
                            </button>
                          ) : (
                            <button onClick={() => handleUpdateStatus(sub.course_id,"published")} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:6,background:"linear-gradient(135deg,#219EBC,#023047)",border:"none",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(33,158,188,0.3)" }}>
                              <CheckCircle size={12} /> Approve &amp; Publish
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE CARD VIEW (NO HORIZONTAL SCROLLING) */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
                {submissions.map(sub => {
                  const isPublished = sub.status === "published";
                  const isSubmitted = sub.status === "submitted";
                  return (
                    <div key={sub.course_id} style={{ padding: 14, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>{sub.course_name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2 }}>Teacher: {sub.teacher_name || "Unassigned"}</div>
                        </div>
                        <div>
                          {isPublished && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:"rgba(42,157,143,0.12)",color:"#2a9d8f",border:"1px solid rgba(42,157,143,0.3)",fontSize:11,fontWeight:700 }}><Lock size={10}/> Published</span>}
                          {isSubmitted && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:"rgba(255,183,3,0.15)",color:"#FFB703",border:"1px solid rgba(255,183,3,0.3)",fontSize:11,fontWeight:700 }}><Clock size={10}/> Pending</span>}
                          {sub.status==="draft" && <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:"rgba(33,158,188,0.1)",color:"var(--subtext)",border:"1px solid var(--glass-border)",fontSize:11,fontWeight:600 }}>Draft</span>}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--glass-bg)", fontSize: 12 }}>
                        <div>Graded: <strong style={{ color: "var(--heading)" }}>{sub.graded_count} / {sub.enrolled_count}</strong></div>
                        <div>Class Avg: <strong style={{ color: "#219EBC" }}>{sub.class_average ? `${sub.class_average}%` : "—"}</strong></div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        <button onClick={() => handlePreview(sub)} style={{ flex: "1 1 90px", display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"8px 10px",borderRadius:7,background:"rgba(33,158,188,0.12)",border:"1px solid rgba(33,158,188,0.3)",color:"#219EBC",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                          <Eye size={13} /> Preview
                        </button>
                        {isPublished ? (
                          <button onClick={() => handleUpdateStatus(sub.course_id,"draft")} style={{ flex: "1 1 120px", display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"8px 10px",borderRadius:7,background:"rgba(231,111,81,0.12)",border:"1px solid rgba(231,111,81,0.3)",color:"#e76f51",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                            <Unlock size={13} /> Unlock
                          </button>
                        ) : (
                          <button onClick={() => handleUpdateStatus(sub.course_id,"published")} style={{ flex: "1 1 140px", display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"8px 12px",borderRadius:7,background:"linear-gradient(135deg,#219EBC,#023047)",border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                            <CheckCircle size={13} /> Approve &amp; Publish
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Glass>
          )}
        </div>
      )}

      {/* Grade Preview Modal */}
      {previewOpen && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"var(--background)",border:"1px solid var(--glass-border)",borderRadius:16,width:"100%",maxWidth:860,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.45)" }}>
            {/* Modal Header */}
            <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--glass-border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
              <div>
                <div style={{ fontSize:15,fontWeight:800,color:"var(--heading)" }}>
                  Grade Sheet Preview — {previewData ? previewData.course?.name : "Loading..."}
                </div>
                {previewData && (
                  <div style={{ fontSize:11.5,color:"var(--subtext)",marginTop:2 }}>
                    {previewData.term} · {previewData.session} · Teacher: {previewData.course?.teacher_name || "Unassigned"} · {previewData.count} Students
                  </div>
                )}
              </div>
              <button onClick={() => setPreviewOpen(false)} style={{ background:"var(--muted)",border:"1px solid var(--glass-border)",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--subtext)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY:"auto",flex:1 }}>
              {previewLoading ? (
                <div style={{ padding:40,textAlign:"center",color:"var(--subtext)" }}>Loading grade sheet...</div>
              ) : !previewData ? (
                <div style={{ padding:40,textAlign:"center",color:"var(--subtext)" }}>No data available.</div>
              ) : (
                <>
                  <div className="table-responsive-wrapper">
                    <div style={{ minWidth: 720 }}>
                      <div style={{ display:"grid",gridTemplateColumns:"40px 2fr 1.2fr 80px 80px 80px 80px 60px 80px",padding:"10px 20px",borderBottom:"1px solid var(--glass-border)",fontSize:10,fontWeight:700,color:"var(--subtext)",textTransform:"uppercase",background:"var(--muted)",position:"sticky",top:0,zIndex:2 }}>
                        <span>#</span><span>Student Name</span><span>Adm. No.</span>
                        <span style={{textAlign:"center"}}>CA1</span><span style={{textAlign:"center"}}>CA2</span>
                        <span style={{textAlign:"center"}}>Exam</span><span style={{textAlign:"center"}}>Total</span>
                        <span style={{textAlign:"center"}}>Grade</span><span style={{textAlign:"center"}}>Status</span>
                      </div>
                      {previewData.students.map((st: any, i: number) => {
                        const total = st.total !== null && st.total !== undefined ? parseFloat(st.total) : null;
                        const gl = getGradeLabel(total);
                        const gc = total === null ? "var(--subtext)" : total >= 60 ? "#2a9d8f" : total >= 45 ? "#FFB703" : "#e76f51";
                        return (
                          <div key={st.id} style={{ display:"grid",gridTemplateColumns:"40px 2fr 1.2fr 80px 80px 80px 80px 60px 80px",padding:"9px 20px",borderBottom:"1px solid var(--glass-border)",alignItems:"center",background:i%2===0?"transparent":"var(--muted)" }}>
                            <span style={{fontSize:11,color:"var(--subtext)"}}>{i+1}</span>
                            <span style={{fontSize:12.5,fontWeight:600,color:"var(--heading)"}}>{st.student_name}</span>
                            <span style={{fontSize:11,color:"var(--subtext)"}}>{st.admission_number||"—"}</span>
                            <span style={{textAlign:"center",fontSize:12}}>{st.ca1??'—'}</span>
                            <span style={{textAlign:"center",fontSize:12}}>{st.ca2??'—'}</span>
                            <span style={{textAlign:"center",fontSize:12}}>{st.exam??'—'}</span>
                            <span style={{textAlign:"center",fontSize:13,fontWeight:700,color:gc}}>{total!==null?total:'—'}</span>
                            <span style={{textAlign:"center",fontSize:13,fontWeight:800,color:gc}}>{gl}</span>
                            <span style={{textAlign:"center"}}>
                              {st.status ? (
                                <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:st.status==="published"?"rgba(42,157,143,0.12)":"rgba(255,183,3,0.12)",color:st.status==="published"?"#2a9d8f":"#FFB703",fontWeight:600}}>{st.status}</span>
                              ) : (
                                <span style={{fontSize:10,color:"var(--subtext)"}}>not graded</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Footer summary + Close button */}
                  <div style={{ padding:"12px 20px",background:"var(--muted)",borderTop:"1px solid var(--glass-border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,fontSize:12,color:"var(--subtext)",flexShrink:0 }}>
                    <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
                      <span>Enrolled: <strong style={{color:"var(--heading)"}}>{previewData.count}</strong></span>
                      <span>Graded: <strong style={{color:"#2a9d8f"}}>{previewData.students.filter((s:any)=>s.total!==null&&s.total!==undefined).length}</strong></span>
                      <span>Not Graded: <strong style={{color:"#e76f51"}}>{previewData.students.filter((s:any)=>s.total===null||s.total===undefined).length}</strong></span>
                      {(() => {
                        const gs = previewData.students.filter((s:any)=>s.total!==null&&s.total!==undefined).map((s:any)=>parseFloat(s.total));
                        const avg = gs.length ? (gs.reduce((a:number,b:number)=>a+b,0)/gs.length).toFixed(1) : null;
                        return <span>Class Avg: <strong style={{color:"#219EBC"}}>{avg ? `${avg}%` : "—"}</strong></span>;
                      })()}
                    </div>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      style={{ padding:"6px 16px", borderRadius:8, background:"var(--border)", border:"none", color:"var(--heading)", fontWeight:600, fontSize:12, cursor:"pointer" }}
                    >
                      Close Preview
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function strPad(n: number) { return String(n).padStart(3, '0'); }
