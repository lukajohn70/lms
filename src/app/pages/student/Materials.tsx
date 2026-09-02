import { useState, useEffect } from "react";
import { FileText, Film, Image, Eye, EyeOff, Download, Search, Filter, Lock } from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { Link } from "react-router";

const ICON = { pdf: FileText, video: Film, image: Image, doc: FileText };
const TYPE_COLOR = {
  pdf: { bg: "rgba(142,202,230,0.1)", border: "rgba(142,202,230,0.3)", c: "#8ECAE6" },
  video: { bg: "rgba(33,158,188,0.1)", border: "rgba(33,158,188,0.25)", c: "#219EBC" },
  image: { bg: "rgba(255,183,3,0.08)", border: "rgba(255,183,3,0.2)", c: "#FFB703" },
  doc: { bg: "rgba(251,133,0,0.08)", border: "rgba(251,133,0,0.2)", c: "#FB8500" },
};

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch enrolled courses to check enrollment status
      const courses = await apiClient.get("/student/courses");
      if (!courses || courses.length === 0) {
        setIsEnrolled(false);
        setLoading(false);
        return;
      }
      setIsEnrolled(true);

      // Fetch materials
      const res = await apiClient.get("/student/materials");
      const list = res.materials || [];
      setMaterials(list);

      // Load viewed status from localStorage
      const savedViewed = localStorage.getItem("viewed_materials");
      if (savedViewed) {
        setViewed(JSON.parse(savedViewed));
      } else {
        const initial: Record<number, boolean> = {};
        list.forEach((m: any) => {
          initial[m.id] = false;
        });
        setViewed(initial);
      }
    } catch (e) {
      console.error("Failed to load materials", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleViewed = (id: number) => {
    const next = { ...viewed, [id]: !viewed[id] };
    setViewed(next);
    localStorage.setItem("viewed_materials", JSON.stringify(next));
  };

  if (loading) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading lesson materials...</div>;
  }

  if (!isEnrolled) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Glass style={{ padding: "40px 30px", maxWidth: 460, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(251,133,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={30} style={{ color: "#FB8500" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 10px" }}>Materials Locked</h2>
          <p style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.6, margin: "0 0 24px" }}>
            You are not currently registered or enrolled in any courses. Please complete your academic term course enrollment to access your lesson files and resources.
          </p>
          <Link
            to="/student/courses"
            style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}
          >
            Go to Course Registration
          </Link>
        </Glass>
      </div>
    );
  }

  const subjects = ["all", ...Array.from(new Set(materials.map(m => m.course_name)))];
  const filtered = materials.filter(m =>
    (filter === "all" || m.course_name === filter) &&
    (search === "" || m.title.toLowerCase().includes(search.toLowerCase()))
  );
  const viewedCount = materials.filter(m => viewed[m.id]).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Lesson Materials</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{viewedCount}/{materials.length} materials viewed</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Files", v: materials.length, c: "#219EBC" },
          { label: "Viewed", v: viewedCount, c: "#8ECAE6" },
          { label: "Unviewed", v: materials.length - viewedCount, c: "#FFB703" },
          { label: "Subjects", v: Math.max(0, subjects.length - 1), c: "#FB8500" },
        ].map(s => (
          <Glass key={s.label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.label}</div>
          </Glass>
        ))}
      </div>

      <Glass>
        {/* Search & Filter */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "8px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
            <Search size={14} style={{ color: "var(--subtext)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials…" style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--heading)", outline: "none", flex: 1 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} style={{ color: "var(--subtext)" }} />
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background: "var(--muted)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--heading)", outline: "none" }}>
              {subjects.map(s => <option key={s} value={s}>{s === "all" ? "All Subjects" : s}</option>)}
            </select>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
          {["File Name", "Subject", "Teacher / Date", "Actions"].map(h => (
            <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--subtext)", fontSize: 13 }}>
            No materials found matching your criteria.
          </div>
        ) : (
          filtered.map((m) => {
            const tc = TYPE_COLOR[m.file_type as keyof typeof TYPE_COLOR] || TYPE_COLOR.pdf;
            const Icon = ICON[m.file_type as keyof typeof ICON] || FileText;
            const isV = !!viewed[m.id];
            
            const baseUrl = API_BASE_URL.replace("/index.php", "");
            const fileUrl = `${baseUrl}/${m.file_path}`;

            return (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 80px", padding: "11px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center", background: isV ? "transparent" : "rgba(33,158,188,0.025)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.bg, border: `1px solid ${tc.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: tc.c }}>
                    <Icon size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: isV ? 400 : 600, color: isV ? "var(--subtext)" : "var(--heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                    {!isV && <span style={{ fontSize: 9.5, background: "rgba(33,158,188,0.12)", color: "#219EBC", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>NEW</span>}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--subtext)" }}>{m.course_name}</span>
                <div>
                  <div style={{ fontSize: 11, color: "var(--heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{m.teacher_name}</div>
                  <div style={{ fontSize: 10, color: "var(--subtext)" }}>{m.date}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => toggleViewed(m.id)} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: isV ? "var(--muted)" : "rgba(33,158,188,0.1)", border: `1px solid ${isV ? "var(--glass-border)" : "rgba(33,158,188,0.25)"}`, cursor: "pointer" }} title={isV ? "Mark unviewed" : "Mark viewed"}>
                    {isV ? <EyeOff size={12} style={{ color: "var(--subtext)" }} /> : <Eye size={12} style={{ color: "#219EBC" }} />}
                  </button>
                  <a href={fileUrl} target="_blank" rel="noreferrer" style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer" }} title="Download">
                    <Download size={12} style={{ color: "var(--subtext)" }} />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </Glass>
    </div>
  );
}
