import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { apiClient } from "../../lib/apiClient";
import { Users, BookOpen, ClipboardList, Receipt, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const deptData = [
  { dept: "Physics", avg: 76 }, { dept: "CS", avg: 82 }, { dept: "Maths", avg: 71 },
  { dept: "Chem", avg: 74 }, { dept: "English", avg: 80 },
];

const alerts = [
  { type: "warning", msg: "12 students with attendance < 75%", color: "#FFB703" },
  { type: "info", msg: "3 CBTs pending HOD approval", color: "#219EBC" },
  { type: "danger", msg: "Fee payments overdue for 18 students", color: "#FB8500" },
  { type: "info", msg: "New material uploaded by Dr. Eze (Physics)", color: "#8ECAE6" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/dashboard/admin')
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || !user) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading your dashboard...</div>;
  }

  const { stats } = data;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Admin Control Panel</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>System Overview 🛡️</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>Aroura Academy · 2026/2027 Session · 2nd Term</p>
      </div>

      <div className="responsive-grid-4">
        {[
          { l: "Total Students", v: stats.totalStudents, c: "#219EBC", icon: <Users size={15}/>, to: "/admin/users" },
          { l: "Teaching Staff", v: stats.teachingStaff, c: "#8ECAE6", icon: <BookOpen size={15}/>, to: "/admin/users" },
          { l: "Pending CBTs", v: stats.pendingCbts, c: "#FFB703", icon: <ClipboardList size={15}/>, to: "/admin/cbt" },
          { l: "Fee Collections", v: `₦${Number(stats.feesCollected).toLocaleString()}`, c: "#FB8500", icon: <Receipt size={15}/>, to: "/admin/fees" },
        ].map(s => (
          <Glass key={s.l} style={{ padding: "16px 18px", cursor: "pointer" }} onClick={() => navigate(s.to)}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
          </Glass>
        ))}
      </div>

      <div className="responsive-dashboard-3">
        {/* Dept performance */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={15} style={{ color: "#FB8500" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Department Averages</span>
          </div>
          <div style={{ padding: "8px 12px 12px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="dept" tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[60,90]} tick={{ fontFamily:"'Poppins',sans-serif", fontSize:10, fill:"var(--subtext)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:"var(--popover)", border:"1px solid var(--border)", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:11 }} />
                <Bar dataKey="avg" radius={[5,5,0,0]}>
                  {deptData.map((_, i) => <Cell key={i} fill={["#219EBC","#8ECAE6","#FFB703","#FB8500","#219EBC"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Glass>

        {/* Quick actions */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Quick Actions</div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              { l: "Review CBT Approvals", to: "/admin/cbt", c: "#FFB703", badge: `${stats.pendingCbts} pending` },
              { l: "Manage Users", to: "/admin/users", c: "#219EBC", badge: null },
              { l: "Fee Management", to: "/admin/fees", c: "#FB8500", badge: "18 overdue" },
              { l: "Analytics & Result Governance", to: "/admin/reports", c: "#8ECAE6", badge: stats.reopenRequests > 0 ? `${stats.reopenRequests} unlock req` : null },
            ].map(a => (
              <button key={a.l} onClick={() => navigate(a.to)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, background: `${a.c}0e`, border: `1px solid ${a.c}28`, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{a.l}</span>
                {a.badge && <span style={{ fontSize: 10, fontWeight: 700, color: a.c, background: `${a.c}18`, padding: "2px 7px", borderRadius: 5 }}>{a.badge}</span>}
              </button>
            ))}
          </div>
        </Glass>

        {/* System alerts */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>System Alerts</div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: "9px 11px", borderRadius: 9, background: `${a.color}08`, border: `1px solid ${a.color}25` }}>
                {a.type === "warning" ? <AlertTriangle size={13} style={{ color: a.color, flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={13} style={{ color: a.color, flexShrink: 0, marginTop: 1 }} />}
                <span style={{ fontSize: 11.5, color: "var(--heading)", lineHeight: 1.4 }}>{a.msg}</span>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  );
}
