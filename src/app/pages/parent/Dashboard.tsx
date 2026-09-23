import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  TrendingUp, MessageSquare, 
  AlertTriangle, CheckCircle, ChevronDown, UserCheck, HelpCircle
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
  const { user } = useApp();
  
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  
  // Child specific live data
  const [avgScore, setAvgScore] = useState(0);
  const [classPos, setClassPos] = useState("—");
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);

  // 1. Fetch children on load
  useEffect(() => {
    apiClient.get("/parent/children")
      .then((childrenData: any) => {
        const active = childrenData.active_children || [];
        setChildrenList(active);
        if (active.length > 0) {
          setSelectedChild(active[0]);
        }
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
      apiClient.get(`/parent/attendance?student_id=${selectedChild.id}`)
    ])
      .then(([gradesRes, attendanceRes]) => {
        setAvgScore(gradesRes.average || 0);
        setClassPos(gradesRes.rank || "—");
        
        const present = attendanceRes.present || 0;
        const total = attendanceRes.total || 30;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        setAttendanceRate(rate);
        
        // Subject radar data mapping
        const radar = (gradesRes.grades || []).map((g: any) => ({
          sub: g.subject.slice(0, 10),
          score: g.total
        }));
        setRadarData(radar);

        // Derive notices dynamically
        const list = [
          { icon: <AlertTriangle size={13}/>, msg: `Attendance ${rate}% — target is 90%. Please monitor punctuality.`, c: "#FFB703", trigger: rate < 90 },
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
            No student accounts are linked to your parent profile yet. Please contact the school admin to link your child's account.
          </p>
        </Glass>
      )}

    </div>
  );
}
