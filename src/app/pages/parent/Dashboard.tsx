import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  TrendingUp, CalendarDays, Receipt, MessageSquare, 
  AlertTriangle, CheckCircle, ChevronDown, UserCheck, HelpCircle,
  GraduationCap, Printer
} from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { useApp } from "../../contexts/AppContext";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const BACKEND_URL = API_BASE_URL.replace('/index.php', '/');

const Glass = ({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    style={{ 
      background: "var(--glass-bg)", 
      border: "1px solid var(--glass-border)", 
      backdropFilter: "blur(20px)", 
      borderRadius: 14, 
      boxShadow: "var(--glass-shadow)", 
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.2s, box-shadow 0.2s",
      ...style 
    }}
  >
    {children}
  </div>
);

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user, settings } = useApp();
  
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  
  // Child specific live data
  const [avgScore, setAvgScore] = useState(0);
  const [classPos, setClassPos] = useState("—");
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [feeBalance, setFeeBalance] = useState(0);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);

  // 1. Fetch children and admissions on load
  useEffect(() => {
    Promise.all([
      apiClient.get("/parent/children"),
      apiClient.get("/parent/admissions")
    ])
      .then(([childrenData, admissionsData]) => {
        const active = childrenData.active_children || [];
        setChildrenList(active);
        setPendingList(childrenData.pending_registrations || []);
        if (active.length > 0) {
          setSelectedChild(active[0]);
        }
        setAdmissions(admissionsData.applications || []);
      })
      .catch(err => {
        console.error("Failed to load parent data", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Fetch selected child's live metrics from endpoints
  useEffect(() => {
    if (!selectedChild) return;
    
    setChildLoading(true);
    Promise.all([
      apiClient.get(`/parent/grades?student_id=${selectedChild.id}`),
      apiClient.get(`/parent/attendance?student_id=${selectedChild.id}`),
      apiClient.get(`/parent/fees?student_id=${selectedChild.id}`)
    ])
      .then(([gradesRes, attendanceRes, feesRes]) => {
        setAvgScore(gradesRes.average || 0);
        setClassPos(gradesRes.rank || "—");
        
        const present = attendanceRes.present || 0;
        const total = attendanceRes.total || 30;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        setAttendanceRate(rate);
        
        const outstanding = (feesRes.fee_items || []).reduce((acc: number, f: any) => acc + (f.amount - f.paid), 0);
        setFeeBalance(outstanding);
        
        // Subject radar data mapping
        const radar = (gradesRes.grades || []).map((g: any) => ({
          sub: g.subject.slice(0, 10),
          score: g.total
        }));
        setRadarData(radar);

        // Derive notices dynamically
        const list = [
          { icon: <AlertTriangle size={13}/>, msg: `Attendance ${rate}% — target is 90%. Please monitor punctuality.`, c: "#FFB703", trigger: rate < 90 },
          { icon: <Receipt size={13}/>, msg: `Outstanding fee balance of ₦${outstanding.toLocaleString()} is due.`, c: "#FB8500", trigger: outstanding > 0 },
          { icon: <CheckCircle size={13}/>, msg: `${selectedChild.first_name} scored highest in ${gradesRes.highest_subject || 'course'}.`, c: "#219EBC", trigger: gradesRes.highest > 80 },
          { icon: <MessageSquare size={13}/>, msg: "PTA general meeting scheduled for next Saturday at 10am.", c: "#8ECAE6", trigger: true },
        ].filter(n => n.trigger);
        setNotices(list);
      })
      .catch(err => console.error("Error loading child statistics", err))
      .finally(() => setChildLoading(false));

  }, [selectedChild]);

  const parentName = user ? `${user.first_name} ${user.last_name}` : "Parent";

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading children profiles...</div>;
  }

  return (
    <div>
      {/* HEADER WITH SWITCHER */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#FFB703", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, fontWeight: 700 }}>Parent Portal</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Hello, {parentName} 👋</h1>
          
          {selectedChild ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "var(--subtext)" }}>Monitoring student profile:</span>
              
              {childrenList.length > 1 ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={selectedChild.id}
                    onChange={(e) => {
                      const child = childrenList.find(c => c.id === parseInt(e.target.value));
                      if (child) setSelectedChild(child);
                    }}
                    style={{
                      background: "rgba(255,183,3,0.12)",
                      border: "1.5px solid rgba(255,183,3,0.35)",
                      borderRadius: 8,
                      padding: "4px 28px 4px 12px",
                      color: "#FFB703",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none"
                    }}
                  >
                    {childrenList.map(c => (
                      <option key={c.id} value={c.id} style={{ background: "var(--glass-bg)", color: "var(--heading)" }}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 8, top: 7, color: "#FFB703", pointerEvents: "none" }} />
                </div>
              ) : (
                <strong style={{ fontSize: 13, color: "var(--heading)" }}>{selectedChild.first_name} {selectedChild.last_name}</strong>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--subtext)", margin: "4px 0 0" }}>No active student profiles linked to your account.</p>
          )}
        </div>
        
        {pendingList.length > 0 && (
          <div style={{ background: "rgba(33,158,188,0.08)", border: "1px dashed rgba(33,158,188,0.3)", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
            <span style={{ color: "#219EBC", fontWeight: 700 }}>Pending admissions: </span>
            {pendingList.map((p, i) => (
              <span key={p.id} style={{ fontWeight: 600 }}>
                {p.first_name} ({p.status}){i < pendingList.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedChild ? (
        childLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Updating student dashboard stats...</div>
        ) : (
          <>
            {/* STATS TILES */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
              {[
                { l: "Overall Average", v: `${avgScore.toFixed(1)}%`, c: "#219EBC", icon: <TrendingUp size={15}/>, to: "/parent/performance" },
                { l: "Attendance Rate", v: `${attendanceRate}%`, c: "#2a9d8f", icon: <UserCheck size={15}/>, to: "/parent/performance" },
                { l: "Outstanding Fees", v: feeBalance > 0 ? `₦${feeBalance.toLocaleString()}` : "Fully Paid", c: "#FB8500", icon: <Receipt size={15}/>, to: "/parent/fees" },
                { l: "Class Position", v: classPos, c: "#FFB703", icon: <TrendingUp size={15}/>, to: "/parent/performance" },
              ].map(s => (
                <Glass key={s.l} style={{ padding: "16px 18px" }} onClick={() => navigate(s.to)}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
                </Glass>
              ))}
            </div>

            {/* PLOTS AND DETAILS */}
            <div className="responsive-dashboard-3 parent-grid-layout">
              
              {/* Radar chart */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Subject Performance Radar</div>
                <div style={{ padding: "8px", display: "flex", justifyContent: "center" }}>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--glass-border)" />
                        <PolarAngleAxis dataKey="sub" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:9.5, fill:"var(--subtext)" }} />
                        <Radar name={selectedChild.first_name} dataKey="score" stroke="#FFB703" fill="#FFB703" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: 40, color: "var(--subtext)", fontSize: 12 }}>No scores to display.</div>
                  )}
                </div>
              </Glass>

              {/* Recent results */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Current Course Scores</span>
                  <button onClick={() => navigate("/parent/performance")} style={{ fontSize: 11, color: "#FFB703", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Details →</button>
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {radarData.length > 0 ? (
                    radarData.map(r => (
                      <div key={r.sub} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 12.5, color: "var(--heading)", flex: 1, fontWeight: 500 }}>{r.sub}</span>
                        <div style={{ width: 80, height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${r.score}%`, background: `linear-gradient(90deg, ${r.score >= 80 ? "#219EBC" : r.score >= 70 ? "#FFB703" : "#FB8500"}88, ${r.score >= 80 ? "#219EBC" : r.score >= 70 ? "#FFB703" : "#FB8500"})` }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: r.score >= 80 ? "#219EBC" : r.score >= 70 ? "#FFB703" : "#FB8500", width: 35, textAlign: "right" }}>{r.score}%</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 20, textAlign: "center", color: "var(--subtext)", fontSize: 12.5 }}>No recorded grades.</div>
                  )}
                </div>
              </Glass>

              {/* Notices & Alerts */}
              <Glass>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>School Notices</div>
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 9, minHeight: 180 }}>
                  {notices.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, padding: "9px 11px", borderRadius: 9, background: `${a.c}08`, border: `1px solid ${a.c}22` }}>
                      <div style={{ color: a.c, flexShrink: 0, marginTop: 1 }}>{a.icon}</div>
                      <span style={{ fontSize: 11.5, color: "var(--heading)", lineHeight: 1.45 }}>{a.msg}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--glass-border)" }}>
                  <button onClick={() => navigate("/parent/communication")} style={{ width: "100%", padding: "9px", borderRadius: 9, background: "rgba(255,183,3,0.1)", border: "1px solid rgba(255,183,3,0.25)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#FFB703", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MessageSquare size={14} /> Message Teacher
                  </button>
                </div>
              </Glass>

            </div>
          </>
        )
      ) : (
        <Glass style={{ padding: 40, textAlign: "center" }}>
          <HelpCircle size={48} style={{ color: "#fb8500", marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>No Enrolled Children Found</h3>
          <p style={{ fontSize: 14, color: "var(--subtext)", margin: "0 0 20px", maxWidth: 460, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            You do not have any child accounts registered or linked yet. Parents can apply for admission using the public website portal. Once the application is approved by the admin, click "Accept Offer" to activate portal details.
          </p>
        </Glass>
      )}

      {/* ── CHILD ADMISSIONS & APPLICATIONS SECTION ── */}
      <div style={{ marginTop: 28, borderTop: "1px solid var(--glass-border)", paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Child Admissions & Entrance Examinations</h2>
            <p style={{ margin: "4px 0 0", color: "var(--subtext)", fontSize: 12.5 }}>Apply for new admissions, track ongoing applications, and print exam photo cards.</p>
          </div>
          {admissions.length > 0 && (
            <button 
              onClick={() => navigate("/parent/admissions?apply=true")}
              style={{
                padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #FFB703 0%, #fb8500 100%)",
                color: "#011d2f", fontSize: 12.5, fontWeight: 800, cursor: "pointer", border: "none",
                boxShadow: "0 4px 14px rgba(251,133,0,0.25)", transition: "transform 0.2s"
              }}
            >
              + Apply for Admission
            </button>
          )}
        </div>

        {admissions.length === 0 ? (
          <Glass style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC", flexShrink: 0 }}>
              <GraduationCap size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>Register a New Child</h4>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5 }}>
                Start a child registration application for Aroura Academy. Process form payment, fill candidate details, upload passport photographs, and download entrance exam cards.
              </p>
            </div>
            <button 
              onClick={() => navigate("/parent/admissions?apply=true")}
              style={{
                padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #FFB703 0%, #fb8500 100%)",
                color: "#011d2f", fontSize: 12.5, fontWeight: 800, cursor: "pointer", border: "none",
                boxShadow: "0 4px 14px rgba(251,133,0,0.25)", transition: "transform 0.2s"
              }}
            >
              Start Application
            </button>
          </Glass>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
            {admissions.map(app => {
              const isAdmitted = app.status === "admitted";
              const hasExam = app.exam_date;
              const gradeGroup = getGradeGroup(app.grade_level);
              
              return (
                <Glass key={app.id} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {app.passport_path ? (
                        <img 
                          src={BACKEND_URL + app.passport_path} 
                          alt="Candidate" 
                          style={{ width: 40, height: 46, objectFit: "cover", borderRadius: 6, border: "1.5px solid rgba(255,183,3,0.3)" }} 
                        />
                      ) : (
                        <div style={{ width: 40, height: 46, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px dashed var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, opacity: 0.5 }}>
                          No Photo
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: "0 0 2px", fontSize: 14.5, fontWeight: 700, color: "var(--heading)" }}>{app.child_first_name} {app.child_last_name}</h4>
                        <div style={{ fontSize: 11.5, color: "var(--subtext)" }}>Class: <strong>{app.grade_level}</strong></div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#fb8500" }}>{app.application_number}</div>
                      <div style={{ marginTop: 4 }}>
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </div>

                  {hasExam && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "var(--heading)", marginBottom: 6, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.03em" }}>Exam Schedule</div>
                      <div style={{ color: "var(--text)", display: "grid", gap: 3, opacity: 0.9 }}>
                        <div>Date: <strong>{new Date(app.exam_date).toLocaleDateString()}</strong></div>
                        <div>Venue: <strong>{app.exam_venue || "Main Auditorium"}</strong></div>
                        <div>Seat No: <strong style={{ color: "#fb8500" }}>{app.exam_seat_number || "SEAT-100"}</strong></div>
                      </div>
                      <button 
                        onClick={() => handlePrintCard(app)}
                        style={{
                          marginTop: 10, width: "100%", padding: "7px", background: "none", border: "1px solid #219EBC",
                          color: "#219EBC", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5
                        }}
                      >
                        <Printer size={12} /> Print Exam Card
                      </button>
                    </div>
                  )}

                  {/* Study Guide Download Link */}
                  {(app.status === "applied" || app.status === "exam_scheduled") && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,183,3,0.06)", border: "1px solid rgba(255,183,3,0.18)", padding: "10px 12px", borderRadius: 10 }}>
                      <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4 }}>
                        <strong style={{ color: "var(--heading)" }}>Syllabus & Study Guide</strong> is available for preparation.
                      </div>
                      <a 
                        href={`/study_guides/${gradeGroup}_guide.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 12px", background: "#FFB703", color: "#011d2f",
                          borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap"
                        }}
                      >
                        View Study Guide
                      </a>
                    </div>
                  )}

                  {isAdmitted && (
                    <div style={{ background: "rgba(42,157,143,0.06)", border: "1px solid rgba(42,157,143,0.25)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#2a9d8f", marginBottom: 6 }}>Offer of Admission Extended!</div>
                      <button 
                        onClick={() => navigate("/parent/admissions")}
                        style={{
                          width: "100%", padding: "9px", background: "#2a9d8f", color: "white",
                          border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(42,157,143,0.25)"
                        }}
                      >
                        Accept Offer & Setup Portal
                      </button>
                    </div>
                  )}
                </Glass>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SCHOOL FEES BREAKDOWN & PAYMENT GUIDE ── */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--heading)", margin: 0 }}>School Fees Breakdown & Payment Guide</h2>
        <p style={{ margin: "4px 0 16px", color: "var(--subtext)", fontSize: 12.5 }}>Follow these steps to complete your ward's fee payments.</p>
        
        <Glass style={{ padding: 24 }}>
          <div style={{ background: "rgba(251,133,0,0.06)", border: "1px solid rgba(251,133,0,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: "#FB8500", marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13.5, color: "#FB8500", display: "block", marginBottom: 4 }}>1. Acceptance Fee (First Step)</strong>
                <span style={{ fontSize: 12.5, color: "var(--heading)", lineHeight: 1.5 }}>
                  Upon receiving an admission offer, parents are required to pay a <strong>non-refundable acceptance fee of ₦{Number(settings?.acceptance_fee_amount || 20000).toLocaleString()}</strong>. This secures the admission slot and forms part of the overall school fees.
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(33,158,188,0.1)", color: "#219EBC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>2</div>
              <div>
                <strong style={{ fontSize: 13.5, color: "var(--heading)", display: "block", marginBottom: 4 }}>Tuition & Development Levies</strong>
                <span style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5 }}>Once the acceptance fee is cleared and the portal account is generated, log in to view the full tuition invoice. Tuition must be paid in full (or per approved installment plan) before resumption.</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(33,158,188,0.1)", color: "#219EBC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>3</div>
              <div>
                <strong style={{ fontSize: 13.5, color: "var(--heading)", display: "block", marginBottom: 4 }}>Uniforms, Books & Materials</strong>
                <span style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.5 }}>After tuition payment, parents can present their <strong>generated receipt</strong> at the school store to collect uniforms and textbooks.</span>
              </div>
            </div>
          </div>
        </Glass>
      </div>

    </div>
  );
}

// ── ADMISSIONS HELPERS FOR DASHBOARD ──
const getGradeGroup = (grade: string): string => {
  const g = grade.toLowerCase();
  if (g.includes("creche") || g.includes("nursery")) return "nursery";
  if (g.includes("primary")) return "primary";
  return "secondary";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "applied":
      return <span style={{ color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Applied</span>;
    case "exam_scheduled":
      return <span style={{ color: "#8ECAE6", background: "rgba(142,202,230,0.15)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Scheduled</span>;
    case "exam_completed":
      return <span style={{ color: "#FFB703", background: "rgba(255,183,3,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Exam Graded</span>;
    case "admitted":
      return <span style={{ color: "#2a9d8f", background: "rgba(42,157,143,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Admitted</span>;
    case "rejected":
      return <span style={{ color: "#e76f51", background: "rgba(231,111,81,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Rejected</span>;
    default:
      return <span style={{ color: "#5a7f92", background: "rgba(90,127,146,0.1)", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{status}</span>;
  }
};

const handlePrintCard = (appDetails: any) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const formattedDate = new Date(appDetails.exam_date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const formattedTime = new Date(appDetails.exam_date).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit"
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>Entrance Exam Card - ${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #023047; padding: 20px; }
          .card { border: 3px double #219EBC; padding: 30px; max-width: 650px; margin: 0 auto; position: relative; border-radius: 12px; background: #fafdfc; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(33, 158, 188, 0.05); font-weight: 800; pointer-events: none; z-index: 0; white-space: nowrap; }
          .header { display: flex; align-items: center; border-bottom: 2px solid #219EBC; padding-bottom: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
          .logo { width: 60px; height: 60px; border-radius: 12px; margin-right: 15px; }
          .title { flex-grow: 1; }
          .title h1 { margin: 0; font-size: 22px; color: #023047; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title p { margin: 3px 0 0; font-size: 12px; color: #fb8500; font-weight: 600; text-transform: uppercase; }
          .details { display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 25px; z-index: 1; position: relative; }
          .photo-box { width: 120px; height: 130px; border: 2px dashed #b5c7d3; display: flex; align-items: center; justify-content: center; background: #f0f4f7; font-size: 11px; color: #5a7f92; font-weight: 600; text-align: center; border-radius: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
          .info-item { margin-bottom: 6px; }
          .info-label { font-weight: bold; color: #5a7f92; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
          .info-value { font-weight: 600; color: #023047; }
          .schedule-box { background: rgba(33, 158, 188, 0.08); border: 1.5px solid rgba(33, 158, 188, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
          .schedule-title { font-weight: bold; color: #219EBC; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; letter-spacing: 0.5px; }
          .schedule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
          .instructions { font-size: 11.5px; line-height: 1.5; color: #5a7f92; border-top: 1px solid #dde3e8; padding-top: 15px; z-index: 1; position: relative; }
          .instructions ol { padding-left: 20px; margin: 5px 0 0; }
          @media print {
            body { padding: 0; background: #fff; }
            .card { border: 2px solid #219EBC; box-shadow: none; max-width: 100%; margin: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="watermark">AROURA ACADEMY</div>
          <div class="header">
            <img src="/logo.png" class="logo" alt="Logo" />
            <div class="title">
              <h1>Aroura Academy</h1>
              <p>Entrance Examination Photo Card</p>
            </div>
          </div>
          <div class="details">
            <div class="photo-box">
              ${appDetails.passport_path 
                ? `<img src="${BACKEND_URL}${appDetails.passport_path}" style="width:120px;height:130px;object-fit:cover;border-radius:8px;" />`
                : 'PASSPORT<br>PHOTOGRAPH'
              }
            </div>
            <div class="info-grid">
              <div class="info-item" style="grid-column: span 2;">
                <div class="info-label">Application Number</div>
                <div class="info-value" style="font-size: 16px; color: #fb8500; font-weight: 700;">${appDetails.application_number || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Candidate Name</div>
                <div class="info-value">${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Class Applied For</div>
                <div class="info-value">${appDetails.grade_level || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${appDetails.child_dob || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Gender</div>
                <div class="info-value">${appDetails.child_gender || ''}</div>
              </div>
            </div>
          </div>
          
          <div class="schedule-box">
            <div class="schedule-title">Examination Schedule</div>
            <div class="schedule-grid">
              <div class="info-item">
                <div class="info-label">Exam Type</div>
                <div class="info-value" style="text-transform: uppercase;">${appDetails.exam_type || 'entrance'} Exam</div>
              </div>
              <div class="info-item">
                <div class="info-label">Seat Number</div>
                <div class="info-value" style="color: #fb8500; font-weight: 700;">${appDetails.exam_seat_number || 'SEAT-100'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${formattedDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Time & Venue</div>
                <div class="info-value">${formattedTime} | ${appDetails.exam_venue || 'Main Auditorium'}</div>
              </div>
            </div>
          </div>
          <div class="instructions"><strong>Important Instructions:</strong>
            <ol>
              <li>Print this card and bring it to the exam venue.</li>
              <li><strong>Required items to bring:</strong> original birth certificate, writing materials (pencils, pen, eraser, ruler), and this printed card.</li>
              <li>Report at least 30 minutes before the scheduled time.</li>
              <li>No electronic devices or calculators are allowed.</li>
              <li>This card serves as your identification. Keep it safe.</li>
            </ol>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
};
