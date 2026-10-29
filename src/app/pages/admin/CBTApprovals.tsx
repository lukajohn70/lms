import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, ClipboardList } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

type CBT = { id: number; title: string; subject: string; teacher: string; class: string; questions: number; duration_minutes: number; created_at: string; status: "pending_approval" | "approved" | "rejected" | "draft" };

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 2px 8px rgba(16, 28, 50, 0.04)", ...style }}>{children}</div>
);

export default function CBTApprovals() {
  const [cbts, setCbts] = useState<CBT[]>([]);
  const [filter, setFilter] = useState<"all" | "pending_approval" | "approved" | "rejected">("all");
  const [preview, setPreview] = useState<CBT | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const data = await apiClient.get("/admin/exams");
      setCbts(data.exams || []);
    } catch (e) {
      console.error("Failed to load exams", e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      await apiClient.post("/admin/exams/update-status", { id, status });
      setCbts(p => p.map(c => c.id === id ? { ...c, status } : c));
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const filtered = cbts.filter(c => filter === "all" || c.status === filter);
  const pending = cbts.filter(c => c.status === "pending_approval").length;

  const sc: Record<string, any> = { 
    pending_approval: { c: "#d4af37", bg: "rgba(212,175,55,0.12)", label: 'Pending Review' }, 
    approved: { c: "#293d7d", bg: "rgba(41,61,125,0.08)", label: 'Authorized' }, 
    rejected: { c: "#dc137b", bg: "rgba(220,19,123,0.1)", label: 'Declined' }, 
    draft: { c: "#64748b", bg: "rgba(100,116,139,0.1)", label: 'Draft' } 
  };

  return (
    <div style={{ fontFamily: "'Lato', 'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#dc137b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4, fontFamily: "'Raleway', sans-serif" }}>
          Examination Governance
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--heading)", margin: "0 0 4px", fontFamily: "'Raleway', sans-serif" }}>
          CBT Examination Authorizations
        </h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
          {pending} examination papers awaiting administrator certification
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        {[
          ["pending_approval", "Pending Review", "#d4af37"],
          ["approved", "Authorized Exams", "#293d7d"],
          ["rejected", "Declined Papers", "#dc137b"]
        ].map(([s, l, c]) => (
          <Glass key={s} style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: c, fontFamily: "'Raleway', sans-serif" }}>
              {cbts.filter(cb => cb.status === s).length}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--subtext)", marginTop: 3 }}>{l}</div>
          </Glass>
        ))}
      </div>

      <Glass>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "pending_approval", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${filter === f ? "#293d7d" : "var(--border)"}`,
                background: filter === f ? "rgba(41,61,125,0.08)" : "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
                color: filter === f ? "#293d7d" : "var(--subtext)",
                fontWeight: filter === f ? 800 : 500,
                textTransform: "capitalize",
                fontFamily: "'Raleway', sans-serif"
              }}
            >
              {f.replace('_', ' ')} {f === "pending_approval" && pending > 0 && (
                <span style={{ marginLeft: 6, background: "#dc137b", color: "#ffffff", borderRadius: 4, padding: "1px 6px", fontSize: 9.5, fontWeight: 800 }}>
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)", fontSize: 13 }}>
            No examination papers found matching filter.
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(41,61,125,0.08)", border: "1px solid rgba(41,61,125,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#293d7d" }}>
                    <ClipboardList size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--heading)", marginBottom: 3, fontFamily: "'Raleway', sans-serif" }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--subtext)", marginBottom: 6 }}>{c.teacher} · {c.subject} · Class: {c.class || 'Unassigned'}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[`${c.questions} questions`, `${c.duration_minutes} min`, `Submitted: ${new Date(c.created_at).toLocaleDateString()}`].map((t, i) => (
                        <span key={i} style={{ fontSize: 10.5, color: "var(--subtext)", background: "var(--muted)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc[c.status].c, background: sc[c.status].bg, padding: "3px 10px", borderRadius: 4, textTransform: "capitalize", fontFamily: "'Raleway', sans-serif" }}>{sc[c.status].label}</span>
                  <button onClick={() => setPreview(c)} style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer" }}><Eye size={14} style={{ color: "var(--subtext)" }} /></button>
                  {c.status === "pending_approval" && (
                    <>
                      <button onClick={() => updateStatus(c.id, "approved")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, background: "#293d7d", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ffffff", fontFamily: "'Raleway', sans-serif" }}>
                        <CheckCircle size={13} /> Authorize
                      </button>
                      <button onClick={() => updateStatus(c.id, "rejected")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, background: "rgba(220,19,123,0.1)", border: "1px solid rgba(220,19,123,0.25)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#dc137b", fontFamily: "'Raleway', sans-serif" }}>
                        <XCircle size={13} /> Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </Glass>

      {/* Preview modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,28,50,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setPreview(null)}>
          <Glass style={{ width: 480, padding: 24, margin: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", marginBottom: 4, fontFamily: "'Raleway', sans-serif" }}>{preview.title}</div>
            <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 16 }}>{preview.teacher} · {preview.subject}</div>
            {[["Subject", preview.subject], ["Class", preview.class || 'Unassigned'], ["Questions", String(preview.questions)], ["Duration", `${preview.duration_minutes} min`], ["Submitted", new Date(preview.created_at).toLocaleDateString()]].map(([l,v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--subtext)" }}>{l}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {preview.status === "pending_approval" && (
                <>
                  <button onClick={() => { updateStatus(preview.id, "approved"); setPreview(null); }} style={{ flex: 1, padding: "10px", borderRadius: 6, background: "#293d7d", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#ffffff", fontFamily: "'Raleway', sans-serif" }}>Authorize Exam</button>
                  <button onClick={() => { updateStatus(preview.id, "rejected"); setPreview(null); }} style={{ flex: 1, padding: "10px", borderRadius: 6, background: "rgba(220,19,123,0.1)", border: "1px solid rgba(220,19,123,0.25)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#dc137b", fontFamily: "'Raleway', sans-serif" }}>Decline</button>
                </>
              )}
              <button onClick={() => setPreview(null)} style={{ flex: 1, padding: "10px", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 13, color: "var(--subtext)", fontFamily: "'Raleway', sans-serif", fontWeight: 700 }}>Close</button>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
