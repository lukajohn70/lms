import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Users, BookOpen } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from "recharts";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Reports() {
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

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Compiling system analytics...</div>;
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return "₦" + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Analytics & Reports</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>System-wide performance and financial overview</p>
      </div>

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
    </div>
  );
}
