import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, ClipboardList } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

type CBT = { id: number; title: string; subject: string; teacher: string; class: string; questions: number; duration_minutes: number; created_at: string; status: "pending_approval" | "approved" | "rejected" | "draft" };

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
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

  const sc: Record<string, any> = { pending_approval: { c: "#FFB703", bg: "rgba(255,183,3,0.1)", label: 'Pending' }, approved: { c: "#219EBC", bg: "rgba(33,158,188,0.1)", label: 'Approved' }, rejected: { c: "#FB8500", bg: "rgba(251,133,0,0.1)", label: 'Rejected' }, draft: { c: "#9ca3af", bg: "rgba(156,163,175,0.1)", label: 'Draft' } };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>CBT Approvals</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{pending} CBTs awaiting review</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        {[["pending_approval","Pending Review","#FFB703"],["approved","Approved","#219EBC"],["rejected","Rejected","#FB8500"]].map(([s,l,c]) => (
          <Glass key={s} style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{cbts.filter(cb => cb.status === s).length}</div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{l}</div>
          </Glass>
        ))}
      </div>

      <Glass>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 8 }}>
          {(["all","pending_approval","approved","rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${filter === f ? "#219EBC" : "var(--glass-border)"}`, background: filter === f ? "rgba(33,158,188,0.12)" : "var(--muted)", cursor: "pointer", fontSize: 12, color: filter === f ? "#219EBC" : "var(--subtext)", fontWeight: filter === f ? 700 : 400, textTransform: "capitalize" }}>
              {f.replace('_', ' ')} {f === "pending_approval" && pending > 0 && <span style={{ marginLeft: 4, background: "#FFB703", color: "#011d2f", borderRadius: 10, padding: "0 5px", fontSize: 9, fontWeight: 800 }}>{pending}</span>}
            </button>
          ))}
        </div>

        {filtered.map(c => (
          <div key={c.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--glass-border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ClipboardList size={17} style={{ color: "#219EBC" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)", marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--subtext)", marginBottom: 6 }}>{c.teacher} · {c.subject} · Class: {c.class || 'Unassigned'}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[`${c.questions} questions`, `${c.duration_minutes} min`, `Submitted: ${new Date(c.created_at).toLocaleDateString()}`].map((t, i) => (
                      <span key={i} style={{ fontSize: 10.5, color: "var(--subtext)", background: "var(--muted)", padding: "2px 8px", borderRadius: 5, border: "1px solid var(--glass-border)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: sc[c.status].c, background: sc[c.status].bg, padding: "3px 10px", borderRadius: 6, textTransform: "capitalize" }}>{sc[c.status].label}</span>
                <button onClick={() => setPreview(c)} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer" }}><Eye size={14} style={{ color: "var(--subtext)" }} /></button>
                {c.status === "pending_approval" && (
                  <>
                    <button onClick={() => updateStatus(c.id, "approved")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(33,158,188,0.12)", border: "1px solid rgba(33,158,188,0.25)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#219EBC" }}>
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button onClick={() => updateStatus(c.id, "rejected")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.25)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FB8500" }}>
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </Glass>

      {/* Preview modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setPreview(null)}>
          <Glass style={{ width: 480, padding: 24, margin: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--heading)", marginBottom: 4 }}>{preview.title}</div>
            <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 16 }}>{preview.teacher} · {preview.subject}</div>
            {[["Subject", preview.subject], ["Class", preview.class || 'Unassigned'], ["Questions", String(preview.questions)], ["Duration", `${preview.duration_minutes} min`], ["Submitted", new Date(preview.created_at).toLocaleDateString()]].map(([l,v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--subtext)" }}>{l}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {preview.status === "pending_approval" && (
                <>
                  <button onClick={() => { updateStatus(preview.id, "approved"); setPreview(null); }} style={{ flex: 1, padding: "9px", borderRadius: 9, background: "rgba(33,158,188,0.15)", border: "1px solid rgba(33,158,188,0.3)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#219EBC" }}>✓ Approve</button>
                  <button onClick={() => { updateStatus(preview.id, "rejected"); setPreview(null); }} style={{ flex: 1, padding: "9px", borderRadius: 9, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.3)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#FB8500" }}>✕ Reject</button>
                </>
              )}
              <button onClick={() => setPreview(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 13, color: "var(--subtext)" }}>Close</button>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
